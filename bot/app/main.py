import asyncio
import logging

from aiogram import Bot, Dispatcher
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode
from aiogram.fsm.storage.memory import MemoryStorage
from aiogram.types import BotCommand, BotCommandScopeDefault
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.config import get_settings
from app.db.engine import create_engine, create_session_factory
from app.handlers import booking, errors, info, menu, start
from app.middlewares import ClientMiddleware, DbSessionMiddleware

logger = logging.getLogger(__name__)


def create_dispatcher(session_factory: async_sessionmaker[AsyncSession]) -> Dispatcher:
    dp = Dispatcher(storage=MemoryStorage(), session_factory=session_factory)
    dp.update.outer_middleware(DbSessionMiddleware(session_factory))
    dp.update.outer_middleware(ClientMiddleware())
    dp.include_routers(
        errors.router,
        start.router,
        booking.router,
        menu.router,
        info.router,
        menu.fallback_router,  # must stay last
    )
    return dp


async def set_commands(bot: Bot) -> None:
    for lang, description in (("ru", "Главное меню"), ("en", "Main menu")):
        await bot.set_my_commands(
            [BotCommand(command="start", description=description)],
            scope=BotCommandScopeDefault(),
            language_code=None if lang == "ru" else lang,
        )


async def main() -> None:
    settings = get_settings()
    logging.basicConfig(
        level=settings.log_level.upper(),
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )

    engine = create_engine(settings.database_url)
    async with engine.connect() as conn:
        await conn.execute(text("select 1"))
    logger.info("Database connection is ready")

    session_factory = create_session_factory(engine)
    bot = Bot(token=settings.bot_token, default=DefaultBotProperties(parse_mode=ParseMode.HTML))
    dp = create_dispatcher(session_factory)

    try:
        await set_commands(bot)
        await dp.start_polling(bot)
    finally:
        await bot.session.close()
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
