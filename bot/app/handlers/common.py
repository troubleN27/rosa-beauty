from aiogram.types import CallbackQuery, Message

from app.i18n import t


class StaleFlowError(Exception):
    """Dialog data points to something that no longer exists or is inactive
    (e.g. a service hidden in the admin panel while the client was choosing)."""


async def callback_message(callback: CallbackQuery, lang: str) -> Message | None:
    """The message a button belongs to, or None if Telegram no longer gives access to it."""
    if isinstance(callback.message, Message):
        return callback.message
    await callback.answer(t("errors.outdated", lang), show_alert=True)
    return None
