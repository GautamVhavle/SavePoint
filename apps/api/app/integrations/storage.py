import re
import uuid
from pathlib import PurePath

import httpx
from fastapi import HTTPException

from app.core.config import Settings
from app.schemas import SignedUpload, UploadRequest

ALLOWED_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
}


class SupabaseStorageClient:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    def validate(self, request: UploadRequest) -> str:
        if request.content_type not in ALLOWED_TYPES:
            raise HTTPException(status_code=422, detail="Unsupported media type")
        if request.size > self.settings.max_upload_bytes:
            raise HTTPException(status_code=413, detail="Upload is too large")
        safe_stem = re.sub(r"[^a-zA-Z0-9_-]", "-", PurePath(request.filename).stem)[:40] or "media"
        return f"{safe_stem}-{uuid.uuid4().hex}{ALLOWED_TYPES[request.content_type]}"

    async def create_signed_upload(
        self, profile_id: uuid.UUID, request: UploadRequest
    ) -> SignedUpload:
        if not self.settings.supabase_url or not self.settings.supabase_service_role_key:
            raise HTTPException(status_code=503, detail="Storage integration is not configured")
        filename = self.validate(request)
        path = f"users/{profile_id}/{request.purpose}/{filename}"
        endpoint = (
            f"{self.settings.supabase_url.rstrip('/')}/storage/v1/object/upload/sign/"
            f"{self.settings.supabase_storage_bucket}/{path}"
        )
        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                response = await client.post(
                    endpoint,
                    headers={"Authorization": f"Bearer {self.settings.supabase_service_role_key}"},
                )
                response.raise_for_status()
            payload = response.json()
        except httpx.HTTPError as exc:
            raise HTTPException(status_code=502, detail="Could not sign upload") from exc
        token = str(payload.get("token", ""))
        signed = str(payload.get("url") or payload.get("signedURL") or "")
        upload_url = (
            signed
            if signed.startswith("http")
            else f"{self.settings.supabase_url.rstrip('/')}{signed}"
        )
        return SignedUpload(path=path, token=token, upload_url=upload_url)
