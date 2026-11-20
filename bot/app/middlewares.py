from collections.abc import Awaitable, Callable
from typing import Any

from aiogram import BaseMiddleware
from aiogram.types import TelegramObject, User
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.db import repo
from app.i18n import language_from_telegram

Handler = Callable[[TelegramObject, dict[str, Any]], Awaitable[Any]]


class DbSessionMiddleware(BaseMiddleware):
    """One DB session per update, committed when the handler succeeds."""

    def __init__(self, session_factory: async_sessionmaker[AsyncSession]) -> None:
        self.session_factory = session_factory

    async def __call__(self, handler: Handler, event: TelegramObject, data: dict[str, Any]) -> Any:
        async with self.session_factory() as session:
            data["session"] = session
            result = await handler(event, data)
            await session.commit()
            return result


class ClientMiddleware(BaseMiddleware):
    """Loads the client by Telegram id and resolves the conversation language.

    Puts `client` (or None for new users) and `lang` into handler data.
    """

    async def __call__(self, handler: Handler, event: TelegramObject, data: dict[str, Any]) -> Any:
        user: User | None = data.get("event_from_user")
        session: AsyncSession = data["session"]
        client = None
        if user is not None and not user.is_bot:
            client = await repo.get_client_by_telegram_id(session, user.id)
        data["client"] = client
        if client is not None:
            data["lang"] = client.language
        else:
            data["lang"] = language_from_telegram(user.language_code if user else None)
        return await handler(event, data)
