import os
from collections.abc import AsyncIterator

os.environ.update(
    {
        "ENVIRONMENT": "test",
        "DATABASE_URL": "sqlite+aiosqlite:///./test-savepoint.db",
        "DEV_AUTH_BYPASS": "true",
        "IP_HASH_SECRET": "test-secret-at-least-thirty-two-characters",
        "GUIDE_RATE_LIMIT": "2",
    }
)

import httpx
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import Base, SessionLocal, engine
from app.main import app


@pytest_asyncio.fixture(autouse=True)
async def database() -> AsyncIterator[None]:
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.drop_all)
        await connection.run_sync(Base.metadata.create_all)
    yield


@pytest_asyncio.fixture
async def session() -> AsyncIterator[AsyncSession]:
    async with SessionLocal() as value:
        yield value


@pytest_asyncio.fixture
async def client() -> AsyncIterator[httpx.AsyncClient]:
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as value:
        yield value
