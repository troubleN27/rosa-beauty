from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup

from app.i18n import t
from app.keyboards.callbacks import CloseCb


def close_button(lang: str, also: int = 0) -> InlineKeyboardButton:
    return InlineKeyboardButton(text=t("nav.close", lang), callback_data=CloseCb(also=also).pack())


def close_keyboard(lang: str, also: int = 0) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[[close_button(lang, also)]])
