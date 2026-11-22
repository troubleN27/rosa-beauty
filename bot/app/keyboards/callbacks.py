"""Callback data factories. Packed values must stay within Telegram's 64-byte limit
(a UUID is 36 characters, so prefixes are kept short)."""

import uuid
from enum import StrEnum

from aiogram.filters.callback_data import CallbackData


class LanguageCb(CallbackData, prefix="lang"):
    code: str


class CloseCb(CallbackData, prefix="x"):
    """«Закрыть»: removes the message; `also` is another message of the same section
    (the contacts text above the map), 0 if none."""

    also: int = 0


# --- Information sections ----------------------------------------------------------


class InfoCategoryCb(CallbackData, prefix="icat"):
    id: uuid.UUID


class InfoMasterCb(CallbackData, prefix="imst"):
    id: uuid.UUID


class NavTarget(StrEnum):
    CATEGORIES = "cats"
    MASTERS = "msts"


class NavCb(CallbackData, prefix="nav"):
    to: NavTarget


# --- Booking flow (SPEC 4.3) --------------------------------------------------------

ANY_MASTER = "any"


class CategoryCb(CallbackData, prefix="cat"):
    id: uuid.UUID


class ServiceCb(CallbackData, prefix="svc"):
    id: uuid.UUID


class MasterCb(CallbackData, prefix="mst"):
    id: str  # master UUID or ANY_MASTER


class DayCb(CallbackData, prefix="day"):
    day: str  # ISO date, salon timezone


class SlotCb(CallbackData, prefix="slot"):
    ts: int  # start, unix seconds
    master: uuid.UUID  # master assigned to this time


class BookFromMasterCb(CallbackData, prefix="bkm"):
    id: uuid.UUID


class BookAction(StrEnum):
    BACK = "back"
    CANCEL = "cancel"
    CONFIRM = "ok"
    EDIT = "edit"
    EDIT_SERVICE = "e_svc"
    EDIT_MASTER = "e_mst"
    EDIT_TIME = "e_time"
    EDIT_CONTACTS = "e_cnt"
    NOOP = "noop"  # a calendar day without free time
    IGNORE = "ign"  # decorative buttons (weekday header, empty cells)


class BookCb(CallbackData, prefix="bk"):
    action: BookAction


# --- My bookings, reminders, reviews --------------------------------------------------


class MyAction(StrEnum):
    LIST = "list"
    CARD = "card"
    CANCEL = "cancel"  # ask for confirmation
    CANCEL_YES = "cyes"
    RESCHEDULE = "move"
    COMING = "come"  # "I'll come" from a reminder


class MyCb(CallbackData, prefix="my"):
    action: MyAction
    id: str = ""  # booking UUID (empty for the list)


class ReviewCb(CallbackData, prefix="rv"):
    id: uuid.UUID  # booking
    rating: int  # 1..5; 0 = skip the comment
