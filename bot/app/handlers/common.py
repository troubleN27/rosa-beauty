from aiogram.exceptions import TelegramBadRequest
from aiogram.types import CallbackQuery, InlineKeyboardMarkup, Message

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


async def show(message: Message, text: str, keyboard: InlineKeyboardMarkup | None) -> None:
    """Replace a step message in place; photo messages (master card) are replaced by a new one."""
    if message.photo or message.text is None:
        await message.delete()
        await message.answer(text, reply_markup=keyboard)
        return
    try:
        await message.edit_text(text, reply_markup=keyboard)
    except TelegramBadRequest as error:
        if "message is not modified" not in str(error):
            raise
