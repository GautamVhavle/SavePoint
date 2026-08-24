import uuid
from datetime import date
from unittest.mock import AsyncMock

import httpx
import pytest

from app.db import SessionLocal
from app.integrations.gemini import GeminiGuide
from app.models import Game, GameStatus, ProfileGame


async def create_library_entry(profile_id: uuid.UUID, *, featured: bool = False) -> uuid.UUID:
    """Insert a snapshotted game + entry directly (tests run without IGDB credentials)."""
    async with SessionLocal() as db:
        game = Game(
            igdb_id=119133,
            name="Elden Ring",
            slug="elden-ring",
            cover_url="https://images.igdb.com/igdb/image/upload/t_cover_big/co4jni.jpg",
            genres=["RPG"],
            platforms=["PC"],
        )
        db.add(game)
        await db.flush()
        entry = ProfileGame(
            profile_id=profile_id,
            game_id=game.id,
            status=GameStatus.completed,
            rating=4.5,
            review="A vast, surprising journey.",
            hours_played=142.5,
            started_on=date(2024, 1, 12),
            completed_on=date(2024, 3, 30),
            platform="PC",
            featured=featured,
            featured_order=0 if featured else None,
        )
        db.add(entry)
        await db.commit()
        await db.refresh(entry)
        return entry.id


@pytest.mark.asyncio
async def test_health_and_readiness(client: httpx.AsyncClient) -> None:
    assert (await client.get("/api/v1/health")).json() == {"status": "ok"}
    assert (await client.get("/api/v1/ready")).status_code == 200


@pytest.mark.asyncio
async def test_profile_lifecycle_and_public_composite(client: httpx.AsyncClient) -> None:
    created = await client.post(
        "/api/v1/me/profile",
        json={
            "handle": "  Player_One ",
            "display_name": "Player One",
            "bio": "RPG fan",
            "social_links": {"site": "https://example.com"},
            "is_public": True,
        },
    )
    assert created.status_code == 201, created.text
    assert created.json()["handle"] == "player_one"

    rig = await client.put(
        "/api/v1/me/rig", json={"name": "Main", "cpu": "7800X3D", "gpu": "RTX 4080"}
    )
    assert rig.status_code == 200
    peripheral = await client.post(
        "/api/v1/me/peripherals",
        json={
            "type": "mouse",
            "display_name": "Superlight",
            "brand_model": "Logitech",
            "sort_order": 1,
        },
    )
    assert peripheral.status_code == 201

    me = await client.get("/api/v1/me/composite")
    assert me.status_code == 200
    profile_id = uuid.UUID(me.json()["profile"]["id"])
    entry_id = await create_library_entry(profile_id)

    award = await client.post(
        "/api/v1/me/awards",
        json={
            "profile_game_id": str(entry_id),
            "title": "100% Club",
            "description": "Every trophy.",
        },
    )
    assert award.status_code == 201, award.text

    public = await client.get("/api/v1/profiles/PLAYER_ONE")
    assert public.status_code == 200
    body = public.json()
    assert "auth0_sub" not in body["profile"]
    assert body["rig"]["cpu"] == "7800X3D"
    assert body["peripherals"][0]["display_name"] == "Superlight"
    assert body["games"][0]["game"]["name"] == "Elden Ring"
    assert body["games"][0]["rating"] == 4.5
    assert body["awards"][0]["title"] == "100% Club"
    assert body["awards"][0]["profile_game_id"] == str(entry_id)
    assert "public" in public.headers["cache-control"]


@pytest.mark.asyncio
async def test_award_rejects_foreign_or_missing_entry(client: httpx.AsyncClient) -> None:
    await client.post("/api/v1/me/profile", json={"handle": "awards", "display_name": "Awards"})
    missing = await client.post(
        "/api/v1/me/awards", json={"profile_game_id": str(uuid.uuid4()), "title": "Nope"}
    )
    assert missing.status_code == 422


@pytest.mark.asyncio
async def test_private_profile_hidden_and_handle_unique(client: httpx.AsyncClient) -> None:
    payload = {"handle": "private", "display_name": "Private", "is_public": False}
    assert (
        await client.post("/api/v1/me/profile", json=payload, headers={"X-Dev-Auth-Sub": "user-a"})
    ).status_code == 201
    assert (await client.get("/api/v1/profiles/private")).status_code == 404
    composite = await client.get("/api/v1/me/composite", headers={"X-Dev-Auth-Sub": "user-a"})
    assert composite.status_code == 200
    duplicate = await client.post(
        "/api/v1/me/profile",
        json={**payload, "is_public": True},
        headers={"X-Dev-Auth-Sub": "user-b"},
    )
    assert duplicate.status_code == 409


@pytest.mark.asyncio
async def test_owner_cannot_modify_other_profile_resource(client: httpx.AsyncClient) -> None:
    headers_a = {"X-Dev-Auth-Sub": "owner-a"}
    headers_b = {"X-Dev-Auth-Sub": "owner-b"}
    await client.post(
        "/api/v1/me/profile", json={"handle": "owner-a", "display_name": "A"}, headers=headers_a
    )
    item = await client.post(
        "/api/v1/me/peripherals",
        json={"type": "mouse", "display_name": "A mouse"},
        headers=headers_a,
    )
    await client.post(
        "/api/v1/me/profile", json={"handle": "owner-b", "display_name": "B"}, headers=headers_b
    )
    response = await client.delete(f"/api/v1/me/peripherals/{item.json()['id']}", headers=headers_b)
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_featured_order_conflicts_are_rejected(client: httpx.AsyncClient) -> None:
    await client.post("/api/v1/me/profile", json={"handle": "featured", "display_name": "F"})
    me = await client.get("/api/v1/me/composite")
    profile_id = uuid.UUID(me.json()["profile"]["id"])
    entry_id = await create_library_entry(profile_id, featured=True)

    async with SessionLocal() as db:
        second_game = Game(igdb_id=2, name="Second", slug="second", genres=[], platforms=["PC"])
        db.add(second_game)
        await db.flush()
        second = ProfileGame(
            profile_id=profile_id, game_id=second_game.id, status=GameStatus.playing
        )
        db.add(second)
        await db.commit()
        second_id = second.id

    clash = await client.patch(
        f"/api/v1/me/games/{second_id}", json={"featured": True, "featured_order": 0}
    )
    assert clash.status_code in {409, 422}

    release = await client.patch(f"/api/v1/me/games/{entry_id}", json={"featured": False})
    assert release.status_code == 200


@pytest.mark.asyncio
async def test_guide_rate_limit_is_profile_and_ip_backed(
    client: httpx.AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    await client.post("/api/v1/me/profile", json={"handle": "guide", "display_name": "Guide"})
    answer = AsyncMock(return_value="Profile-supported answer")
    monkeypatch.setattr(GeminiGuide, "answer", answer)
    for _ in range(2):
        response = await client.post(
            "/api/v1/profiles/guide/guide", json={"question": "What games are listed?"}
        )
        assert response.status_code == 200
    limited = await client.post(
        "/api/v1/profiles/guide/guide", json={"question": "What games are listed?"}
    )
    assert limited.status_code == 429
    context = answer.await_args.args[1]
    assert "auth0_sub" not in context["profile"]


@pytest.mark.asyncio
async def test_validation_errors_do_not_echo_submitted_values(client: httpx.AsyncClient) -> None:
    response = await client.post("/api/v1/me/profile", json={"handle": "x!", "display_name": ""})
    assert response.status_code == 422
    body = response.json()
    serialized = str(body)
    assert 'x!' not in serialized
    for error in body["errors"]:
        assert set(error) == {"loc", "msg", "type"}


@pytest.mark.asyncio
async def test_patch_profile_to_taken_handle_conflicts(client: httpx.AsyncClient) -> None:
    await client.post(
        "/api/v1/me/profile",
        json={"handle": "taken", "display_name": "T"},
        headers={"X-Dev-Auth-Sub": "user-taken"},
    )
    await client.post(
        "/api/v1/me/profile",
        json={"handle": "claimer", "display_name": "C"},
        headers={"X-Dev-Auth-Sub": "user-claimer"},
    )
    response = await client.patch(
        "/api/v1/me/profile", json={"handle": "taken"}, headers={"X-Dev-Auth-Sub": "user-claimer"}
    )
    assert response.status_code == 409


@pytest.mark.asyncio
async def test_unfeaturing_clears_order_and_note(client: httpx.AsyncClient) -> None:
    await client.post("/api/v1/me/profile", json={"handle": "unfeat", "display_name": "U"})
    me = await client.get("/api/v1/me/composite")
    profile_id = uuid.UUID(me.json()["profile"]["id"])
    entry_id = await create_library_entry(profile_id, featured=True)
    await client.patch(
        f"/api/v1/me/games/{entry_id}",
        json={"featured": False},
    )
    released = await client.get("/api/v1/me/composite")
    entry = next(g for g in released.json()["games"] if g["id"] == str(entry_id))
    assert entry["featured"] is False
    assert entry["featured_order"] is None
