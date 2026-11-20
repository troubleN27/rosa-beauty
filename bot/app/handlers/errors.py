import logging

from aiogram import Bot, Router
from aiogram.exceptions import TelegramForbiddenError
from aiogram.types import ErrorEvent
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.db import repo
from app.i18n import language_from_telegram, t
from app.keyboards.menu import main_menu

logger = logging.getLogger(__name__)

router = Router(name="errors")


@router.error()
async def handle_error(
    event: ErrorEvent, bot: Bot, session_factory: async_sessionmaker[AsyncSession]
) -> None:
    update = event.update
    if isinstance(event.exception, TelegramForbiddenError):
        logger.warning("User blocked the bot, update %s: %s", update.update_id, event.exception)
        return
    logger.error("Error while handling update %s", update.update_id, exc_info=event.exception)

    source = update.message or update.callback_query
    user = source.from_user if source else None
    if user is None:
        return
    chat_id = user.id
    if update.message is not None:
        chat_id = update.message.chat.id

    try:
        # The update's own session was rolled back, so a fresh one is used here
        async with session_factory() as session:
            client = await repo.get_client_by_telegram_id(session, user.id)
        lang = client.language if client else language_from_telegram(user.language_code)
        if update.callback_query is not None:
            await update.callback_query.answer()
        await bot.send_message(
            chat_id,
            t("errors.generic", lang),
            reply_markup=main_menu(lang) if client else None,
        )
    except Exception:
        logger.exception("Failed to notify user %s about an error", user.id)
