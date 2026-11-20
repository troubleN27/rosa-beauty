"""Async SQLAlchemy engine for Neon.

The bot uses the direct (non-pooled) Neon connection string. SSL is always on.
If a pooled (PgBouncer) string is used, asyncpg's prepared statement cache must be
disabled, so it is turned off whenever the host contains "-pooler".
"""

import ssl
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from sqlalchemy.ext.asyncio import AsyncEngine, async_sessionmaker, create_async_engine

# libpq-style query params that asyncpg does not understand
_LIBPQ_ONLY_PARAMS = {"sslmode", "channel_binding", "ssl"}


def _prepare_url(raw_url: str) -> tuple[str, bool]:
    parts = urlsplit(raw_url)
    query = [(k, v) for k, v in parse_qsl(parts.query) if k not in _LIBPQ_ONLY_PARAMS]
    is_pooled = "-pooler" in (parts.hostname or "")
    return urlunsplit(parts._replace(query=urlencode(query))), is_pooled


def create_engine(database_url: str) -> AsyncEngine:
    url, is_pooled = _prepare_url(database_url)
    connect_args: dict[str, object] = {"ssl": ssl.create_default_context()}
    if is_pooled:
        connect_args["statement_cache_size"] = 0
    return create_async_engine(
        url,
        connect_args=connect_args,
        pool_pre_ping=True,
        pool_recycle=240,
    )


def create_session_factory(engine: AsyncEngine) -> async_sessionmaker:
    return async_sessionmaker(engine, expire_on_commit=False)
