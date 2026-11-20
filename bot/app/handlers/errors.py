import logging

from aiogram import Bot, Dispatcher, Router
from aiogram.exceptions import TelegramForbiddenError
from aiogram.types import ErrorEvent
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.db import repo
from app.handlers.common import StaleFlowError
from app.i18n import language_from_telegram, t
from app.keyboards.menu import main_menu

logger = logging.getLogger(__name__)

router = Router(name="errors")


@router.error()
async def handle_error(
    event: ErrorEvent,
    bot: Bot,
    dispatcher: Dispatcher,
    session_factory: async_sessionmaker[AsyncSession],
) -> None:
    update = event.update
    exception = event.exception
    if isinstance(exception, TelegramForbiddenError):
        logger.warning("User blocked the bot, update %s: %s", update.update_id, exception)
        return

    stale = isinstance(exception, StaleFlowError)
    if stale:
        logger.info("Stale dialog data in update %s: %s", update.update_id, exception)
    else:
        logger.error("Error while handling update %s", update.update_id, exc_info=exception)

    source = update.message or update.callback_query
    user = source.from_user if source else None
    if user is None:
        return
    chat_id = update.message.chat.id if update.message is not None else user.id

    try:
        # Any unfinished dialog (e.g. booking) starts over after an error
        await dispatcher.fsm.get_context(bot=bot, chat_id=chat_id, user_id=user.id).clear()

        # The update's own session was rolled back, so a fresh one is used here
        async with session_factory() as session:
            client = await repo.get_client_by_telegram_id(session, user.id)
        lang = client.language if client else language_from_telegram(user.language_code)

        if stale and update.callback_query is not None:
            await update.callback_query.answer(t("errors.outdated", lang), show_alert=True)
            return
        if update.callback_query is not None:
            await update.callback_query.answer()
        await bot.send_message(
            chat_id,
            t("errors.generic", lang),
            reply_markup=main_menu(lang) if client else None,
        )
    except Exception:
        logger.exception("Failed to notify user %s about an error", user.id)
