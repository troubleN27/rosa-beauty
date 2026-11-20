from aiogram.types import InlineKeyboardMarkup
from aiogram.utils.keyboard import InlineKeyboardBuilder

from app.db.models import Category, Master
from app.i18n import t
from app.keyboards.callbacks import CategoryCb, MasterCb, NavCb, NavTarget
from app.utils.text import localized


def categories_keyboard(categories: list[Category], lang: str) -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    for category in categories:
        builder.button(
            text=localized(category, "name", lang), callback_data=CategoryCb(id=category.id)
        )
    builder.adjust(2)
    return builder.as_markup()


def masters_keyboard(masters: list[Master], lang: str) -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    for master in masters:
        builder.button(text=localized(master, "name", lang), callback_data=MasterCb(id=master.id))
    builder.adjust(1)
    return builder.as_markup()


def back_keyboard(target: NavTarget, lang: str) -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    builder.button(text=t("nav.back", lang), callback_data=NavCb(to=target))
    return builder.as_markup()
