import asyncio
import time
from dataclasses import dataclass
from typing import Any

import httpx
import jwt
from fastapi import Depends, Header, HTTPException, status
from jwt.algorithms import RSAAlgorithm

from app.core.config import Settings, get_settings

# The subject becomes an indexed String(255); refuse oversized values here so
# malformed identities surface as auth failures, never database errors.
_SUBJECT_MAX = 255


def _validated_subject(subject: str) -> str:
    if not subject or len(subject) > _SUBJECT_MAX:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid subject claim"
        )
    return subject


@dataclass(frozen=True)
class Principal:
    subject: str
    claims: dict[str, Any]


class JWKSVerifier:
    def __init__(self, settings: Settings, ttl: int = 3600) -> None:
        self.settings = settings
        self.ttl = ttl
        self._keys: dict[str, Any] = {}
        self._expires = 0.0
        self._lock = asyncio.Lock()

    async def _refresh(self) -> None:
        async with self._lock:
            if self._keys and time.monotonic() < self._expires:
                return
            url = f"{self.settings.auth0_issuer}.well-known/jwks.json"
            timeout = httpx.Timeout(5.0, connect=3.0)
            async with httpx.AsyncClient(timeout=timeout) as client:
                response = await client.get(url)
                response.raise_for_status()
            data = response.json()
            self._keys = {
                item["kid"]: RSAAlgorithm.from_jwk(item)
                for item in data.get("keys", [])
                if item.get("kid") and item.get("kty") == "RSA"
            }
            self._expires = time.monotonic() + self.ttl

    async def verify(self, token: str) -> dict[str, Any]:
        try:
            header = jwt.get_unverified_header(token)
        except jwt.PyJWTError as exc:
            raise HTTPException(status_code=401, detail="Invalid access token") from exc
        if header.get("alg") not in self.settings.auth0_algorithms or not header.get("kid"):
            raise HTTPException(status_code=401, detail="Invalid access token")
        if header["kid"] not in self._keys or time.monotonic() >= self._expires:
            try:
                await self._refresh()
            except (httpx.HTTPError, KeyError, ValueError) as exc:
                raise HTTPException(
                    status_code=503, detail="Identity provider unavailable"
                ) from exc
        key = self._keys.get(header["kid"])
        if key is None:
            self._expires = 0
            await self._refresh()
            key = self._keys.get(header["kid"])
        if key is None:
            raise HTTPException(status_code=401, detail="Invalid access token")
        try:
            claims: dict[str, Any] = jwt.decode(
                token,
                key=key,
                algorithms=self.settings.auth0_algorithms,
                audience=self.settings.auth0_audience,
                issuer=self.settings.auth0_issuer,
                options={"require": ["exp", "iat", "iss", "aud", "sub"]},
            )
        except jwt.PyJWTError as exc:
            raise HTTPException(status_code=401, detail="Invalid access token") from exc
        return claims


_verifier: JWKSVerifier | None = None


def get_verifier(settings: Settings = Depends(get_settings)) -> JWKSVerifier:
    global _verifier
    if _verifier is None or _verifier.settings is not settings:
        _verifier = JWKSVerifier(settings)
    return _verifier


async def current_principal(
    authorization: str | None = Header(default=None),
    x_dev_auth_sub: str | None = Header(default=None),
    settings: Settings = Depends(get_settings),
    verifier: JWKSVerifier = Depends(get_verifier),
) -> Principal:
    if settings.dev_auth_bypass:
        if settings.environment not in {"development", "test"}:
            raise HTTPException(status_code=500, detail="Unsafe authentication configuration")
        subject = x_dev_auth_sub or settings.dev_auth_sub
        return Principal(
            subject=_validated_subject(subject), claims={"sub": subject, "dev_bypass": True}
        )
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Bearer token required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    claims = await verifier.verify(authorization.removeprefix("Bearer ").strip())
    return Principal(subject=_validated_subject(str(claims["sub"])), claims=claims)
