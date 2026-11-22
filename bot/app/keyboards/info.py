from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup
from aiogram.utils.keyboard import InlineKeyboardBuilder

from app.db.models import Category, Master
from app.i18n import t
from app.keyboards.callbacks import (
    BookFromMasterCb,
    InfoCategoryCb,
    InfoMasterCb,
    NavCb,
    NavTarget,
)
from app.keyboards.common import close_button
from app.utils.text import localized


def categories_keyboard(categories: list[Category], lang: str) -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    for category in categories:
        builder.button(
            text=localized(category, "name", lang), callback_data=InfoCategoryCb(id=category.id)
        )
    builder.adjust(2)
    builder.row(close_button(lang))
    return builder.as_markup()


def masters_keyboard(masters: list[Master], lang: str) -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    for master in masters:
        builder.button(
            text=localized(master, "name", lang), callback_data=InfoMasterCb(id=master.id)
        )
    builder.adjust(1)
    builder.row(close_button(lang))
    return builder.as_markup()


def master_card_keyboard(master: Master, lang: str) -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    builder.button(
        text=t("masters.book_button", lang), callback_data=BookFromMasterCb(id=master.id)
    )
    builder.adjust(1)
    builder.row(
        InlineKeyboardButton(
            text=t("nav.back", lang), callback_data=NavCb(to=NavTarget.MASTERS).pack()
        ),
        close_button(lang),
    )
    return builder.as_markup()


def back_keyboard(target: NavTarget, lang: str) -> InlineKeyboardMarkup:
    """«Назад» to `target` and «Закрыть» in one row."""
    back = InlineKeyboardButton(text=t("nav.back", lang), callback_data=NavCb(to=target).pack())
    return InlineKeyboardMarkup(inline_keyboard=[[back, close_button(lang)]])
