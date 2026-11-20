"""Callback data factories. Packed values must stay within Telegram's 64-byte limit
(a UUID is 36 characters, so prefixes are kept short)."""

import uuid
from enum import StrEnum

from aiogram.filters.callback_data import CallbackData


class LanguageCb(CallbackData, prefix="lang"):
    code: str


class CategoryCb(CallbackData, prefix="cat"):
    id: uuid.UUID


class MasterCb(CallbackData, prefix="mst"):
    id: uuid.UUID


class NavTarget(StrEnum):
    CATEGORIES = "cats"
    MASTERS = "msts"


class NavCb(CallbackData, prefix="nav"):
    to: NavTarget
