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
from app.handlers import booking, commands, errors, info, menu, my_bookings, review, start
from app.i18n import t
from app.middlewares import ClientMiddleware, DbSessionMiddleware
from app.scheduler import ReminderScheduler

logger = logging.getLogger(__name__)


def create_dispatcher(
    session_factory: async_sessionmaker[AsyncSession], reminders: ReminderScheduler
) -> Dispatcher:
    dp = Dispatcher(storage=MemoryStorage(), session_factory=session_factory, reminders=reminders)
    dp.update.outer_middleware(DbSessionMiddleware(session_factory))
    dp.update.outer_middleware(ClientMiddleware())
    dp.include_routers(
        errors.router,
        start.router,
        commands.router,  # before the booking flow: see handlers/commands.py
        booking.router,
        my_bookings.router,
        menu.router,
        info.router,
        review.router,  # after menu routers: menu buttons are not taken as a comment
        menu.fallback_router,  # must stay last
    )
    return dp


COMMANDS = ("menu", "book", "my", "services", "masters", "contacts", "language")


async def set_commands(bot: Bot) -> None:
    """The command list in Telegram's menu: Russian by default, English for English clients."""
    for lang, language_code in (("ru", None), ("en", "en")):
        await bot.set_my_commands(
            [
                BotCommand(command=name, description=t(f"commands.{name}", lang))
                for name in COMMANDS
            ],
            scope=BotCommandScopeDefault(),
            language_code=language_code,
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
    reminders = ReminderScheduler(bot, session_factory)
    dp = create_dispatcher(session_factory, reminders)

    try:
        await set_commands(bot)
        reminders.start()
        await dp.start_polling(bot)
    finally:
        reminders.shutdown()
        await bot.session.close()
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
