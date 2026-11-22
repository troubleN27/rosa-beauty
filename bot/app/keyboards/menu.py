from aiogram.types import InlineKeyboardMarkup, KeyboardButton, ReplyKeyboardMarkup
from aiogram.utils.keyboard import InlineKeyboardBuilder

from app.i18n import LANGUAGES, t
from app.keyboards.callbacks import LanguageCb
from app.keyboards.common import close_button


def main_menu(lang: str) -> ReplyKeyboardMarkup:
    def button(key: str) -> KeyboardButton:
        return KeyboardButton(text=t(key, lang))

    return ReplyKeyboardMarkup(
        keyboard=[
            [button("menu.book"), button("menu.my_bookings")],
            [button("menu.services"), button("menu.masters")],
            [button("menu.contacts"), button("menu.language")],
        ],
        resize_keyboard=True,
        # Not persistent: the client can fold it away with the keyboard icon; /menu brings it back
        is_persistent=False,
    )


def language_keyboard(close_lang: str | None = None) -> InlineKeyboardMarkup:
    """RU / EN choice; `close_lang` adds «Закрыть» (not on the very first start)."""
    builder = InlineKeyboardBuilder()
    for code in LANGUAGES:
        builder.button(text=t(f"language.{code}", code), callback_data=LanguageCb(code=code))
    builder.adjust(2)
    if close_lang:
        builder.row(close_button(close_lang))
    return builder.as_markup()
