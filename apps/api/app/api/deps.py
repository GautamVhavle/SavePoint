import hashlib
import hmac
import uuid
from datetime import UTC, datetime, timedelta

from fastapi import Depends, HTTPException, Request
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import Principal, current_principal
from app.core.config import Settings, get_settings
from app.db import get_session
from app.models import Profile, RateLimitEvent


async def owner_profile(
    principal: Principal = Depends(current_principal), session: AsyncSession = Depends(get_session)
) -> Profile:
    profile = await session.scalar(select(Profile).where(Profile.auth0_sub == principal.subject))
    if profile is None:
        raise HTTPException(status_code=404, detail="Create a profile first")
    return profile


def client_ip(request: Request) -> str:
    # The ASGI server/proxy must sanitize forwarding headers.
    # Never parse arbitrary X-Forwarded-For values here.
    return request.client.host if request.client else "unknown"


async def enforce_scope_limit(
    request: Request,
    scope: str,
    profile_id: uuid.UUID,
    session: AsyncSession,
    settings: Settings,
    limit: int | None = None,
) -> None:
    """Database-backed per-(profile, hashed-IP) window counter for a named scope."""
    digest = hmac.new(
        settings.ip_hash_secret.encode(), client_ip(request).encode(), hashlib.sha256
    ).hexdigest()
    window = settings.guide_rate_window_seconds
    cutoff = datetime.now(UTC) - timedelta(seconds=window)
    await session.execute(delete(RateLimitEvent).where(RateLimitEvent.created_at < cutoff))
    count = await session.scalar(
        select(func.count(RateLimitEvent.id)).where(
            RateLimitEvent.scope == scope,
            RateLimitEvent.profile_id == profile_id,
            RateLimitEvent.ip_hash == digest,
            RateLimitEvent.created_at >= cutoff,
        )
    )
    if (count or 0) >= (limit if limit is not None else settings.guide_rate_limit):
        raise HTTPException(
            status_code=429,
            detail=f"{scope} rate limit exceeded",
            headers={"Retry-After": str(window)},
        )
    session.add(RateLimitEvent(scope=scope, profile_id=profile_id, ip_hash=digest))
    await session.flush()


async def enforce_guide_limit(
    request: Request,
    profile_id: uuid.UUID,
    session: AsyncSession,
    settings: Settings | None = None,
) -> None:
    config = settings or get_settings()
    await enforce_scope_limit(request, "guide", profile_id, session, config)
