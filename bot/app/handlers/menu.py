from contextlib import suppress

from aiogram import F, Router
from aiogram.exceptions import TelegramBadRequest
from aiogram.types import CallbackQuery, Message

from app.db.models import Client
from app.handlers.common import callback_message
from app.i18n import menu_button_texts, t
from app.keyboards.callbacks import CloseCb
from app.keyboards.menu import language_keyboard, main_menu

router = Router(name="menu")


@router.message(F.text.in_(menu_button_texts("menu.language")))
async def handle_language_menu(message: Message, lang: str) -> None:
    await message.answer(t("language.choose", lang), reply_markup=language_keyboard(lang))


async def show_main_menu(message: Message, client: Client | None, lang: str) -> None:
    """/menu: brings the reply keyboard back (new users first choose a language)."""
    if client is None:
        await message.answer(t("start.welcome_new", "ru"), reply_markup=language_keyboard())
        return
    await message.answer(t("menu.hint", lang), reply_markup=main_menu(lang))


@router.callback_query(CloseCb.filter())
async def handle_close(callback: CallbackQuery, callback_data: CloseCb, lang: str) -> None:
    """«Закрыть»: removes the section message (and its companion, e.g. the contacts text)."""
    message = await callback_message(callback, lang)
    if message is None:
        return
    await callback.answer()
    try:
        await message.delete()
    except TelegramBadRequest:
        # Telegram lets bots delete only fairly recent messages; then just drop the buttons
        await message.edit_reply_markup(reply_markup=None)
    if callback_data.also:
        # the companion may be already gone or too old to delete
        with suppress(TelegramBadRequest):
            await message.bot.delete_message(message.chat.id, callback_data.also)


fallback_router = Router(name="fallback")


@fallback_router.callback_query()
async def handle_unknown_callback(callback: CallbackQuery, lang: str) -> None:
    """Buttons from old messages or with unknown data: stop the spinner and explain."""
    await callback.answer(t("errors.outdated", lang), show_alert=True)


@fallback_router.message()
async def handle_unknown(message: Message, client: Client | None, lang: str) -> None:
    """Any other message: ask for a language (new users) or show the menu."""
    await show_main_menu(message, client, lang)
