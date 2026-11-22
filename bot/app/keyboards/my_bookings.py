from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup
from aiogram.utils.keyboard import InlineKeyboardBuilder

from app.db.models import Booking
from app.i18n import t
from app.keyboards.callbacks import MyAction, MyCb
from app.keyboards.common import close_button


def bookings_list_keyboard(items: list[tuple[Booking, str]], lang: str) -> InlineKeyboardMarkup:
    """One button per booking; `items` holds (booking, button text)."""
    builder = InlineKeyboardBuilder()
    for booking, label in items:
        builder.button(text=label, callback_data=MyCb(action=MyAction.CARD, id=str(booking.id)))
    builder.adjust(1)
    builder.row(close_button(lang))
    return builder.as_markup()


def booking_card_keyboard(booking: Booking, can_change: bool, lang: str) -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    if can_change:
        builder.button(
            text=t("bookings.reschedule_button", lang),
            callback_data=MyCb(action=MyAction.RESCHEDULE, id=str(booking.id)),
        )
        builder.button(
            text=t("bookings.cancel_button", lang),
            callback_data=MyCb(action=MyAction.CANCEL, id=str(booking.id)),
        )
    builder.adjust(1)
    builder.row(
        InlineKeyboardButton(
            text=t("nav.back", lang), callback_data=MyCb(action=MyAction.LIST).pack()
        ),
        close_button(lang),
    )
    return builder.as_markup()


def cancel_confirm_keyboard(booking: Booking, lang: str) -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    builder.button(
        text=t("bookings.cancel_yes", lang),
        callback_data=MyCb(action=MyAction.CANCEL_YES, id=str(booking.id)),
    )
    builder.button(
        text=t("bookings.cancel_no", lang),
        callback_data=MyCb(action=MyAction.CARD, id=str(booking.id)),
    )
    builder.adjust(1)
    return builder.as_markup()
