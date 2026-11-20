import uuid
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

from aiogram.types import (
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    KeyboardButton,
    ReplyKeyboardMarkup,
)
from aiogram.utils.keyboard import InlineKeyboardBuilder

from app.db.models import Category, Master, Service
from app.i18n import t
from app.keyboards.callbacks import (
    ANY_MASTER,
    BookAction,
    BookCb,
    CategoryCb,
    DayCb,
    MasterCb,
    ServiceCb,
    SlotCb,
)
from app.utils.dates import format_time, weekday_short
from app.utils.format import format_duration, format_price
from app.utils.text import localized


def _action(text: str, action: BookAction) -> InlineKeyboardButton:
    return InlineKeyboardButton(text=text, callback_data=BookCb(action=action).pack())


def _nav_buttons(lang: str, back: bool = True) -> list[InlineKeyboardButton]:
    buttons = [_action(t("nav.back", lang), BookAction.BACK)] if back else []
    buttons.append(_action(t("booking.cancel_button", lang), BookAction.CANCEL))
    return buttons


def nav_keyboard(lang: str, back: bool = True) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[_nav_buttons(lang, back)])


def categories_keyboard(categories: list[Category], lang: str) -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    for category in categories:
        builder.button(
            text=localized(category, "name", lang), callback_data=CategoryCb(id=category.id)
        )
    builder.adjust(2)
    # First step: "Back" would do the same as "Cancel"
    builder.row(*_nav_buttons(lang, back=False))
    return builder.as_markup()


def services_keyboard(services: list[Service], currency: str, lang: str) -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    for service in services:
        text = t(
            "booking.service_button",
            lang,
            name=localized(service, "name", lang),
            duration=format_duration(service.duration_min, lang),
            price=format_price(service.price, currency),
        )
        builder.button(text=text, callback_data=ServiceCb(id=service.id))
    builder.adjust(1)
    builder.row(*_nav_buttons(lang))
    return builder.as_markup()


def masters_keyboard(masters: list[Master], lang: str) -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    if len(masters) > 1:
        builder.button(text=t("booking.any_master", lang), callback_data=MasterCb(id=ANY_MASTER))
    for master in masters:
        builder.button(
            text=localized(master, "name", lang), callback_data=MasterCb(id=str(master.id))
        )
    builder.adjust(1)
    builder.row(*_nav_buttons(lang))
    return builder.as_markup()


def calendar_keyboard(days: list[date], available: set[date], lang: str) -> InlineKeyboardMarkup:
    """7-column grid of weeks covering `days`; days without free time are marked and inactive."""
    builder = InlineKeyboardBuilder()
    ignore = BookCb(action=BookAction.IGNORE)
    week_start = days[0] - timedelta(days=days[0].weekday())
    builder.row(
        *[
            InlineKeyboardButton(
                text=weekday_short(week_start + timedelta(days=i), lang),
                callback_data=ignore.pack(),
            )
            for i in range(7)
        ]
    )
    in_range = set(days)
    current = week_start
    while current <= days[-1]:
        row = []
        for _ in range(7):
            if current in available:
                button = InlineKeyboardButton(
                    text=str(current.day), callback_data=DayCb(day=current.isoformat()).pack()
                )
            elif current in in_range:
                button = _action("✕", BookAction.NOOP)
            else:
                button = InlineKeyboardButton(text=" ", callback_data=ignore.pack())
            row.append(button)
            current += timedelta(days=1)
        builder.row(*row)
    builder.row(*_nav_buttons(lang))
    return builder.as_markup()


def times_keyboard(
    slots: dict[datetime, uuid.UUID], tz: ZoneInfo, lang: str
) -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    for start, master_id in slots.items():
        builder.button(
            text=format_time(start.astimezone(tz)),
            callback_data=SlotCb(ts=int(start.timestamp()), master=master_id),
        )
    builder.adjust(4)
    builder.row(*_nav_buttons(lang))
    return builder.as_markup()


def confirm_keyboard(lang: str) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [_action(t("booking.confirm_button", lang), BookAction.CONFIRM)],
            [_action(t("booking.edit_button", lang), BookAction.EDIT)],
            _nav_buttons(lang),
        ]
    )


def edit_keyboard(lang: str) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [_action(t("booking.edit_service", lang), BookAction.EDIT_SERVICE)],
            [_action(t("booking.edit_master", lang), BookAction.EDIT_MASTER)],
            [_action(t("booking.edit_time", lang), BookAction.EDIT_TIME)],
            [_action(t("booking.edit_contacts", lang), BookAction.EDIT_CONTACTS)],
            [_action(t("nav.back", lang), BookAction.BACK)],
        ]
    )


def _reply_nav_row(lang: str) -> list[KeyboardButton]:
    return [
        KeyboardButton(text=t("nav.back", lang)),
        KeyboardButton(text=t("booking.cancel_button", lang)),
    ]


def phone_keyboard(lang: str) -> ReplyKeyboardMarkup:
    return ReplyKeyboardMarkup(
        keyboard=[
            [KeyboardButton(text=t("booking.share_phone_button", lang), request_contact=True)],
            _reply_nav_row(lang),
        ],
        resize_keyboard=True,
        one_time_keyboard=False,
    )


def name_keyboard(suggestion: str, lang: str) -> ReplyKeyboardMarkup:
    rows = [[KeyboardButton(text=suggestion)]] if suggestion else []
    rows.append(_reply_nav_row(lang))
    return ReplyKeyboardMarkup(keyboard=rows, resize_keyboard=True)


def confirm_only_keyboard(lang: str) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [_action(t("booking.confirm_button", lang), BookAction.CONFIRM)],
            _nav_buttons(lang),
        ]
    )
