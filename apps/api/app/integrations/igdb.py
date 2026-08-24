import asyncio
import time
from datetime import UTC, datetime
from typing import Any

import httpx
from fastapi import HTTPException

from app.core.config import Settings
from app.schemas import IGDBGame


class IGDBClient:
    fields = (
        "id,name,slug,summary,first_release_date,cover.image_id,"
        "artworks.image_id,screenshots.image_id,genres.name,platforms.name"
    )

    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self._token: str | None = None
        self._expires_at = 0.0
        self._lock = asyncio.Lock()

    async def _access_token(self) -> str:
        """Static user token first (public secretless apps), then client credentials."""
        if self.settings.twitch_user_token:
            return f"Bearer {self.settings.twitch_user_token}"
        if self._token and time.monotonic() < self._expires_at - 60:
            return self._token
        async with self._lock:
            if self._token and time.monotonic() < self._expires_at - 60:
                return self._token
            if not self.settings.twitch_client_id or not self.settings.twitch_client_secret:
                raise HTTPException(
                    status_code=503,
                    detail=(
                        "IGDB integration is not configured. Add TWITCH_CLIENT_SECRET, "
                        "or run scripts/twitch_device_auth.py and set TWITCH_USER_TOKEN."
                    ),
                )
            async with httpx.AsyncClient(timeout=8.0) as client:
                response = await client.post(
                    "https://id.twitch.tv/oauth2/token",
                    params={
                        "client_id": self.settings.twitch_client_id,
                        "client_secret": self.settings.twitch_client_secret,
                        "grant_type": "client_credentials",
                    },
                )
                response.raise_for_status()
            payload = response.json()
            self._token = str(payload["access_token"])
            self._expires_at = time.monotonic() + int(payload["expires_in"])
            return self._token

    async def _request(self, body: str) -> list[dict[str, Any]]:
        token = await self._access_token()
        try:
            async with httpx.AsyncClient(timeout=httpx.Timeout(10.0, connect=3.0)) as client:
                response = await client.post(
                    "https://api.igdb.com/v4/games",
                    headers={
                        "Client-ID": self.settings.twitch_client_id,
                        "Authorization": token,
                    },
                    content=body,
                )
                response.raise_for_status()
                result: list[dict[str, Any]] = response.json()
                return result
        except httpx.HTTPError as exc:
            raise HTTPException(status_code=502, detail="IGDB request failed") from exc

    @staticmethod
    def _banner(item: dict[str, Any]) -> str | None:
        # Wide key art for card backdrops: artwork first, then screenshots.
        for group in ("artworks", "screenshots"):
            entries = item.get(group) or []
            if entries:
                return f"https://images.igdb.com/igdb/image/upload/t_1080p/{entries[0]['image_id']}.jpg"
        return None

    @staticmethod
    def _map(item: dict[str, Any]) -> IGDBGame:
        cover = item.get("cover", {}).get("image_id")
        release = item.get("first_release_date")
        return IGDBGame(
            banner_url=IGDBClient._banner(item),
            igdb_id=item["id"],
            name=item["name"],
            slug=item.get("slug", str(item["id"])),
            summary=item.get("summary"),
            cover_url=f"https://images.igdb.com/igdb/image/upload/t_cover_big/{cover}.jpg"
            if cover
            else None,
            release_date=datetime.fromtimestamp(release, tz=UTC) if release else None,
            genres=[genre["name"] for genre in item.get("genres", [])],
            platforms=[platform["name"] for platform in item.get("platforms", [])],
            snapshot=item,
        )

    async def search(self, query: str, limit: int = 10) -> list[IGDBGame]:
        escaped = query.replace("\\", "\\\\").replace('"', '\\"')
        rows = await self._request(f'search "{escaped}"; fields {self.fields}; limit {limit};')
        return [self._map(row) for row in rows]

    async def details(self, igdb_id: int) -> IGDBGame:
        rows = await self._request(f"fields {self.fields}; where id = {int(igdb_id)}; limit 1;")
        if not rows:
            raise HTTPException(status_code=404, detail="Game not found in IGDB")
        return self._map(rows[0])
