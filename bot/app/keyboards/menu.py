from aiogram.types import InlineKeyboardMarkup, KeyboardButton, ReplyKeyboardMarkup
from aiogram.utils.keyboard import InlineKeyboardBuilder

from app.i18n import LANGUAGES, t
from app.keyboards.callbacks import LanguageCb


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
        is_persistent=True,
    )


def language_keyboard() -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    for code in LANGUAGES:
        builder.button(text=t(f"language.{code}", code), callback_data=LanguageCb(code=code))
    builder.adjust(2)
    return builder.as_markup()
