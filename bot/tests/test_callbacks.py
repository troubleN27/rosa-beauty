import uuid

from aiogram.filters.callback_data import CallbackData

from app.keyboards.callbacks import (
    ANY_MASTER,
    BookAction,
    BookCb,
    BookFromMasterCb,
    CategoryCb,
    DayCb,
    InfoCategoryCb,
    InfoMasterCb,
    LanguageCb,
    MasterCb,
    NavCb,
    NavTarget,
    ServiceCb,
    SlotCb,
)

SOME_ID = uuid.UUID("ffffffff-ffff-4fff-bfff-ffffffffffff")

LONGEST_EXAMPLES: list[CallbackData] = [
    LanguageCb(code="en"),
    InfoCategoryCb(id=SOME_ID),
    InfoMasterCb(id=SOME_ID),
    NavCb(to=NavTarget.MASTERS),
    CategoryCb(id=SOME_ID),
    ServiceCb(id=SOME_ID),
    MasterCb(id=str(SOME_ID)),
    MasterCb(id=ANY_MASTER),
    DayCb(day="2099-12-31"),
    SlotCb(ts=9_999_999_999, master=SOME_ID),
    BookFromMasterCb(id=SOME_ID),
    *[BookCb(action=action) for action in BookAction],
]


def test_callback_data_fits_telegram_limit() -> None:
    for example in LONGEST_EXAMPLES:
        assert len(example.pack().encode()) <= 64, example.pack()


def test_callback_data_round_trip() -> None:
    for example in LONGEST_EXAMPLES:
        assert type(example).unpack(example.pack()) == example


def test_prefixes_are_unique() -> None:
    prefixes = [type(example).__prefix__ for example in LONGEST_EXAMPLES]
    assert len(set(prefixes)) == len({type(example) for example in LONGEST_EXAMPLES})
