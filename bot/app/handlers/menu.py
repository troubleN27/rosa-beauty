from aiogram import F, Router
from aiogram.types import CallbackQuery, Message

from app.db.models import Client
from app.i18n import all_translations, t
from app.keyboards.menu import language_keyboard, main_menu

router = Router(name="menu")


@router.message(F.text.in_(all_translations("menu.language")))
async def handle_language_menu(message: Message, lang: str) -> None:
    await message.answer(t("language.choose", lang), reply_markup=language_keyboard())


fallback_router = Router(name="fallback")


@fallback_router.callback_query()
async def handle_unknown_callback(callback: CallbackQuery, lang: str) -> None:
    """Buttons from old messages or with unknown data: stop the spinner and explain."""
    await callback.answer(t("errors.outdated", lang), show_alert=True)


@fallback_router.message()
async def handle_unknown(message: Message, client: Client | None, lang: str) -> None:
    """Any other message: ask for a language (new users) or show the menu."""
    if client is None:
        await message.answer(t("start.welcome_new", "ru"), reply_markup=language_keyboard())
        return
    await message.answer(t("menu.hint", lang), reply_markup=main_menu(lang))
