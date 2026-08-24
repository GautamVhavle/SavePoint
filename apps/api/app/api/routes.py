import uuid
from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import enforce_guide_limit, enforce_scope_limit, owner_profile
from app.core.auth import Principal, current_principal
from app.core.config import Settings, get_settings
from app.db import get_session
from app.integrations.gemini import GeminiGuide, get_gemini
from app.integrations.igdb import IGDBClient, get_igdb
from app.integrations.storage import SupabaseStorageClient
from app.models import Award, Game, Peripheral, Profile, ProfileGame, Rig
from app.schemas import (
    AwardInput,
    AwardRead,
    GuideRequest,
    GuideResponse,
    IGDBGame,
    PeripheralInput,
    PeripheralRead,
    ProfileCreate,
    ProfileGameInput,
    ProfileGameRead,
    ProfileGameUpdate,
    ProfileRead,
    ProfileUpdate,
    PublicProfile,
    RigInput,
    RigRead,
    SignedUpload,
    UploadRequest,
    validate_game_state,
)

router = APIRouter(prefix="/api/v1")
Session = Annotated[AsyncSession, Depends(get_session)]
Owner = Annotated[Profile, Depends(owner_profile)]
SettingsDep = Annotated[Settings, Depends(get_settings)]


def apply(model: object, data: dict[str, object]) -> None:
    for key, value in data.items():
        setattr(model, key, value)


async def load_public(session: AsyncSession, handle: str) -> Profile | None:
    result: Profile | None = await session.scalar(
        select(Profile)
        .where(Profile.handle == handle.strip().lower(), Profile.is_public.is_(True))
        .options(
            selectinload(Profile.rig),
            selectinload(Profile.peripherals),
            selectinload(Profile.awards),
            selectinload(Profile.games).selectinload(ProfileGame.game),
        )
    )
    return result


@router.get("/health", tags=["health"])
async def health() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/ready", tags=["health"])
async def ready(session: Session) -> dict[str, str]:
    await session.execute(text("SELECT 1"))
    return {"status": "ready"}


@router.get("/profiles/{handle}", response_model=PublicProfile, tags=["public"])
async def public_profile(handle: str, session: Session, response: Response) -> PublicProfile:
    profile = await load_public(session, handle)
    if profile is None:
        raise HTTPException(status_code=404, detail="Profile not found")
    response.headers["Cache-Control"] = "public, max-age=60, stale-while-revalidate=300"
    return serialize_composite(profile)


@router.post(
    "/me/profile", response_model=ProfileRead, status_code=status.HTTP_201_CREATED, tags=["profile"]
)
async def create_profile(
    payload: ProfileCreate,
    principal: Annotated[Principal, Depends(current_principal)],
    session: Session,
) -> Profile:
    existing = await session.scalar(select(Profile).where(Profile.auth0_sub == principal.subject))
    if existing:
        raise HTTPException(status_code=409, detail="Profile already exists")
    values = payload.model_dump(mode="json")
    profile = Profile(auth0_sub=principal.subject, **values)
    session.add(profile)
    await session.commit()
    await session.refresh(profile)
    return profile


@router.get("/me/profile", response_model=ProfileRead, tags=["profile"])
async def get_profile(profile: Owner) -> Profile:
    return profile


def serialize_composite(profile: Profile) -> PublicProfile:
    games = sorted(
        profile.games,
        key=lambda item: (
            not item.featured,
            item.featured_order if item.featured_order is not None else 10000,
            item.game.name,
        ),
    )
    return PublicProfile(
        profile=ProfileRead.model_validate(profile),
        rig=RigRead.model_validate(profile.rig) if profile.rig else None,
        peripherals=[
            PeripheralRead.model_validate(item)
            for item in sorted(profile.peripherals, key=lambda x: x.sort_order)
        ],
        games=[ProfileGameRead.model_validate(item) for item in games],
        awards=[
            AwardRead.model_validate(item)
            for item in sorted(profile.awards, key=lambda x: x.sort_order)
        ],
    )


@router.get("/me/composite", response_model=PublicProfile, tags=["profile"])
async def get_composite(profile: Owner, session: Session) -> PublicProfile:
    """Owner view of the full profile document, including private state."""
    eager = await session.scalar(
        select(Profile)
        .where(Profile.id == profile.id)
        .options(
            selectinload(Profile.rig),
            selectinload(Profile.peripherals),
            selectinload(Profile.awards),
            selectinload(Profile.games).selectinload(ProfileGame.game),
        )
    )
    if eager is None:
        raise HTTPException(status_code=404, detail="Profile not found")
    return serialize_composite(eager)


@router.patch("/me/profile", response_model=ProfileRead, tags=["profile"])
async def update_profile(payload: ProfileUpdate, profile: Owner, session: Session) -> Profile:
    apply(profile, payload.model_dump(exclude_unset=True, mode="json"))
    await session.commit()
    await session.refresh(profile)
    return profile


@router.put("/me/rig", response_model=RigRead, tags=["rig"])
async def put_rig(payload: RigInput, profile: Owner, session: Session) -> Rig:
    rig = await session.scalar(select(Rig).where(Rig.profile_id == profile.id))
    if rig is None:
        rig = Rig(profile_id=profile.id, **payload.model_dump(mode="json"))
        session.add(rig)
    else:
        apply(rig, payload.model_dump(mode="json"))
    await session.commit()
    await session.refresh(rig)
    return rig


@router.post("/me/peripherals", response_model=PeripheralRead, status_code=201, tags=["rig"])
async def create_peripheral(
    payload: PeripheralInput, profile: Owner, session: Session
) -> Peripheral:
    item = Peripheral(profile_id=profile.id, **payload.model_dump(mode="json"))
    session.add(item)
    await session.commit()
    await session.refresh(item)
    return item


@router.put("/me/peripherals/{item_id}", response_model=PeripheralRead, tags=["rig"])
async def update_peripheral(
    item_id: uuid.UUID, payload: PeripheralInput, profile: Owner, session: Session
) -> Peripheral:
    item = await session.scalar(
        select(Peripheral).where(Peripheral.id == item_id, Peripheral.profile_id == profile.id)
    )
    if item is None:
        raise HTTPException(status_code=404, detail="Peripheral not found")
    apply(item, payload.model_dump(mode="json"))
    await session.commit()
    await session.refresh(item)
    return item


@router.delete("/me/peripherals/{item_id}", status_code=204, tags=["rig"])
async def delete_peripheral(item_id: uuid.UUID, profile: Owner, session: Session) -> Response:
    item = await session.scalar(
        select(Peripheral).where(Peripheral.id == item_id, Peripheral.profile_id == profile.id)
    )
    if item is None:
        raise HTTPException(status_code=404, detail="Peripheral not found")
    await session.delete(item)
    await session.commit()
    return Response(status_code=204)


@router.get("/igdb/search", response_model=list[IGDBGame], tags=["games"])
async def search_igdb(
    request: Request,
    igdb: Annotated[IGDBClient, Depends(get_igdb)],
    profile: Owner,
    session: Session,
    settings: SettingsDep,
    q: str = Query(min_length=2, max_length=100),
    limit: int = Query(10, ge=1, le=20),
) -> list[IGDBGame]:
    await enforce_scope_limit(
        request, "igdb", profile.id, session, settings, limit=settings.igdb_rate_limit
    )
    return await igdb.search(q, limit)


@router.post("/me/games", response_model=ProfileGameRead, status_code=201, tags=["games"])
async def add_game(
    payload: ProfileGameInput, profile: Owner, session: Session,
    igdb: Annotated[IGDBClient, Depends(get_igdb)],
) -> ProfileGame:
    # Reject duplicates before spending an upstream IGDB call.
    duplicate = await session.scalar(
        select(ProfileGame)
        .join(Game, ProfileGame.game_id == Game.id)
        .where(ProfileGame.profile_id == profile.id, Game.igdb_id == payload.igdb_id)
    )
    if duplicate:
        raise HTTPException(status_code=409, detail="Game already exists on this profile")
    metadata = await igdb.details(payload.igdb_id)
    game = await session.scalar(select(Game).where(Game.igdb_id == payload.igdb_id))
    values = metadata.model_dump(exclude={"igdb_id"})
    if game is None:
        game = Game(igdb_id=payload.igdb_id, **values, snapshot_at=datetime.now(UTC))
        session.add(game)
        await session.flush()
    else:
        apply(game, values)
        game.snapshot_at = datetime.now(UTC)
    relation = ProfileGame(
        profile_id=profile.id, game_id=game.id, **payload.model_dump(exclude={"igdb_id"})
    )
    relation.game = game
    session.add(relation)
    await session.commit()
    result = await session.scalar(
        select(ProfileGame)
        .where(ProfileGame.id == relation.id)
        .options(selectinload(ProfileGame.game))
    )
    assert result is not None
    return result


@router.get("/me/games", response_model=list[ProfileGameRead], tags=["games"])
async def list_games(profile: Owner, session: Session) -> list[ProfileGame]:
    rows = await session.scalars(
        select(ProfileGame)
        .where(ProfileGame.profile_id == profile.id)
        .options(selectinload(ProfileGame.game))
    )
    return list(rows)


@router.patch("/me/games/{item_id}", response_model=ProfileGameRead, tags=["games"])
async def update_game(
    item_id: uuid.UUID, payload: ProfileGameUpdate, profile: Owner, session: Session
) -> ProfileGame:
    item = await session.scalar(
        select(ProfileGame)
        .where(ProfileGame.id == item_id, ProfileGame.profile_id == profile.id)
        .options(selectinload(ProfileGame.game))
    )
    if item is None:
        raise HTTPException(status_code=404, detail="Game entry not found")
    apply(item, payload.model_dump(exclude_unset=True))
    if item.featured is False:
        item.featured_order = None
        item.featured_note = None
    try:
        validate_game_state(
            item.status,
            item.started_on,
            item.completed_on,
            item.featured,
            item.featured_order,
            item.featured_note,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    await session.commit()
    return item


@router.delete("/me/games/{item_id}", status_code=204, tags=["games"])
async def delete_game(item_id: uuid.UUID, profile: Owner, session: Session) -> Response:
    item = await session.scalar(
        select(ProfileGame).where(ProfileGame.id == item_id, ProfileGame.profile_id == profile.id)
    )
    if item is None:
        raise HTTPException(status_code=404, detail="Game entry not found")
    await session.delete(item)
    await session.commit()
    return Response(status_code=204)


async def require_owned_game_entry(
    profile_game_id: uuid.UUID, profile_id: uuid.UUID, session: AsyncSession
) -> ProfileGame:
    entry = await session.scalar(
        select(ProfileGame).where(
            ProfileGame.id == profile_game_id,
            ProfileGame.profile_id == profile_id,
        )
    )
    if entry is None:
        raise HTTPException(
            status_code=422,
            detail="Award must reference a game entry from this profile",
        )
    return entry


@router.post("/me/awards", response_model=AwardRead, status_code=201, tags=["awards"])
async def create_award(payload: AwardInput, profile: Owner, session: Session) -> Award:
    await require_owned_game_entry(payload.profile_game_id, profile.id, session)
    values = payload.model_dump(mode="json")
    values["profile_game_id"] = payload.profile_game_id
    item = Award(profile_id=profile.id, **values)
    session.add(item)
    await session.commit()
    await session.refresh(item)
    return item


@router.put("/me/awards/{item_id}", response_model=AwardRead, tags=["awards"])
async def update_award(
    item_id: uuid.UUID, payload: AwardInput, profile: Owner, session: Session
) -> Award:
    item = await session.scalar(
        select(Award).where(Award.id == item_id, Award.profile_id == profile.id)
    )
    if item is None:
        raise HTTPException(status_code=404, detail="Award not found")
    await require_owned_game_entry(payload.profile_game_id, profile.id, session)
    apply(item, payload.model_dump(mode="json"))
    await session.commit()
    await session.refresh(item)
    return item


@router.delete("/me/awards/{item_id}", status_code=204, tags=["awards"])
async def delete_award(item_id: uuid.UUID, profile: Owner, session: Session) -> Response:
    item = await session.scalar(
        select(Award).where(Award.id == item_id, Award.profile_id == profile.id)
    )
    if item is None:
        raise HTTPException(status_code=404, detail="Award not found")
    await session.delete(item)
    await session.commit()
    return Response(status_code=204)


@router.post("/me/uploads/sign", response_model=SignedUpload, tags=["media"])
async def sign_upload(
    payload: UploadRequest, profile: Owner, settings: SettingsDep
) -> SignedUpload:
    return await SupabaseStorageClient(settings).create_signed_upload(profile.id, payload)


@router.post("/profiles/{handle}/guide", response_model=GuideResponse, tags=["guide"])
async def guide(
    handle: str, payload: GuideRequest, request: Request, session: Session,
    settings: SettingsDep, gemini: Annotated[GeminiGuide, Depends(get_gemini)],
) -> GuideResponse:
    profile = await load_public(session, handle)
    if profile is None:
        raise HTTPException(status_code=404, detail="Profile not found")
    await enforce_guide_limit(request, profile.id, session, settings)
    # Reuse the canonical serializer so the Guide sees the same sorted,
    # curated ordering visitors do.
    public = serialize_composite(profile)
    context = public.model_dump(
        mode="json", exclude={"profile": {"auth0_sub", "created_at", "updated_at"}}
    )
    answer = await gemini.answer(payload.question, context)
    await session.commit()
    return GuideResponse(answer=answer)
