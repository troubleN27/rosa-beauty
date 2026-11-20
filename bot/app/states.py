from aiogram.fsm.state import State, StatesGroup


class BookingFlow(StatesGroup):
    category = State()
    service = State()
    master = State()
    day = State()
    time = State()
    phone = State()
    name = State()
    confirm = State()
    edit_menu = State()


class RescheduleFlow(StatesGroup):
    day = State()
    time = State()
    confirm = State()


class ReviewFlow(StatesGroup):
    comment = State()
