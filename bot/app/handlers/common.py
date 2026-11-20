from aiogram.types import CallbackQuery, Message

from app.i18n import t


async def callback_message(callback: CallbackQuery, lang: str) -> Message | None:
    """The message a button belongs to, or None if Telegram no longer gives access to it."""
    if isinstance(callback.message, Message):
        return callback.message
    await callback.answer(t("errors.outdated", lang), show_alert=True)
    return None
