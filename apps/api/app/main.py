import re
import time
import uuid
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from app.api.routes import router
from app.core.config import get_settings
from app.core.errors import install_error_handlers
from app.core.logging import configure_logging
from app.db import engine

settings = get_settings()
configure_logging(settings.log_level)
logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    logger.info("api_started", environment=settings.environment)
    yield
    await engine.dispose()
    logger.info("api_stopped")


app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    docs_url="/docs" if settings.environment != "production" else None,
    redoc_url=None,
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Request-ID"]
    + ([] if settings.environment in {"staging", "production"} else ["X-Dev-Auth-Sub"]),
    expose_headers=["X-Request-ID", "Retry-After"],
)
# Composite profile JSON compresses ~5-8x; skip bodies already tiny.
# Level 6: ~95% of the size win at a fraction of the level-9 CPU cost.
app.add_middleware(GZipMiddleware, minimum_size=600, compresslevel=6)


@app.middleware("http")
async def security_and_logging(request: Request, call_next):  # type: ignore[no-untyped-def]
    # Reject oversized payloads before they are buffered into memory;
    # pydantic limits apply only after the body has been fully read.
    if request.method in {"POST", "PUT", "PATCH"}:
        # Mutations must declare JSON: blocks text/plain "simple requests"
        # from ever reaching handlers if auth ever moves off bearer tokens.
        content_type = request.headers.get("content-type", "")
        if content_type and "application/json" not in content_type:
            from fastapi.responses import JSONResponse

            return JSONResponse(
                status_code=415,
                content={
                    "type": "about:blank", "title": "Unsupported Media Type",
                    "status": 415, "detail": "Expected application/json",
                    "instance": str(request.url.path),
                },
                media_type="application/problem+json",
            )
        content_length = request.headers.get("content-length")
        # A declared length is required so the cap cannot be sidestepped
        # with chunked transfer encoding.
        if not content_length or not content_length.isdigit():
            from fastapi.responses import JSONResponse

            return JSONResponse(
                status_code=411,
                content={
                    "type": "about:blank", "title": "Length Required", "status": 411,
                    "detail": "Content-Length is required", "instance": str(request.url.path),
                },
                media_type="application/problem+json",
            )
        body_bytes = int(content_length)
        if body_bytes > settings.max_body_bytes:
            from fastapi.responses import JSONResponse

            logger.warning("request_too_large", path=request.url.path, size=body_bytes)
            return JSONResponse(
                status_code=413,
                content={
                    "type": "about:blank", "title": "Payload Too Large", "status": 413,
                    "detail": "Request body is too large", "instance": str(request.url.path),
                },
                media_type="application/problem+json",
            )
    request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))[:100]
    # Keep control characters and spoofed formats out of structured logs.
    request_id = re.sub(r"[^\w-]", "", request_id) or str(uuid.uuid4())
    started = time.perf_counter()
    structlog.contextvars.bind_contextvars(request_id=request_id)
    try:
        response = await call_next(request)
    finally:
        elapsed_ms = round((time.perf_counter() - started) * 1000, 2)
        logger.info(
            "http_request", method=request.method, path=request.url.path, duration_ms=elapsed_ms
        )
        structlog.contextvars.clear_contextvars()
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Cross-Origin-Opener-Policy"] = "same-origin"
    # Authenticated payloads must never linger in shared or local caches;
    # public profiles set their own explicit caching policy.
    if request.url.path.startswith("/api/v1/me") or request.url.path.startswith("/api/v1/igdb"):
        response.headers["Cache-Control"] = "private, no-store"
    response.headers["Referrer-Policy"] = "no-referrer"
    response.headers["Permissions-Policy"] = (
        "camera=(), microphone=(), geolocation=(), payment=(), usb=(), bluetooth=()"
    )
    if settings.environment in {"staging", "production"}:
        response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains"
    return response


install_error_handlers(app)
app.include_router(router)
