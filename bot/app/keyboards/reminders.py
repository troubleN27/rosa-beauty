import uuid

from aiogram.types import InlineKeyboardMarkup
from aiogram.utils.keyboard import InlineKeyboardBuilder

from app.i18n import t
from app.keyboards.callbacks import MyAction, MyCb, ReviewCb


def reminder_keyboard(booking_id: uuid.UUID, lang: str) -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    builder.button(
        text=t("reminder.coming_button", lang),
        callback_data=MyCb(action=MyAction.COMING, id=str(booking_id)),
    )
    builder.button(
        text=t("bookings.cancel_button", lang),
        callback_data=MyCb(action=MyAction.CANCEL, id=str(booking_id)),
    )
    builder.adjust(2)
    return builder.as_markup()


def review_keyboard(booking_id: uuid.UUID) -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    for rating in range(1, 6):
        builder.button(text=f"{rating} ⭐", callback_data=ReviewCb(id=booking_id, rating=rating))
    builder.adjust(5)
    return builder.as_markup()


def skip_comment_keyboard(booking_id: uuid.UUID, lang: str) -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    builder.button(
        text=t("review.skip_button", lang), callback_data=ReviewCb(id=booking_id, rating=0)
    )
    return builder.as_markup()
