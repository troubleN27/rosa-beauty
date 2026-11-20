import uuid
from datetime import UTC, date, datetime, time, timedelta
from zoneinfo import ZoneInfo

from app.services.slots import (
    BusyBooking,
    SlotRules,
    TimeOff,
    WorkingDay,
    bookable_days,
    day_slots,
    merge_any_master,
)

UTC_RULES = SlotRules(timezone=ZoneInfo("UTC"), step_min=15, min_lead_time_min=60, horizon_days=14)
MOSCOW = ZoneInfo("Europe/Moscow")
DAY = date(2026, 12, 2)  # Wednesday
NOW = datetime(2026, 12, 1, 8, 0, tzinfo=UTC)  # the day before
WORK = WorkingDay(time(10, 0), time(13, 0))


def at(hour: int, minute: int = 0, day: date = DAY, tz: ZoneInfo | None = None) -> datetime:
    """A moment in `tz` (UTC by default) returned in UTC."""
    return datetime.combine(day, time(hour, minute), tzinfo=tz or UTC).astimezone(UTC)


def hhmm(slots: list[datetime], tz: ZoneInfo | None = None) -> list[str]:
    return [s.astimezone(tz or UTC).strftime("%H:%M") for s in slots]


def test_regular_day_without_bookings() -> None:
    slots = day_slots(DAY, 60, WORK, [], [], UTC_RULES, NOW)
    assert hhmm(slots) == [
        "10:00", "10:15", "10:30", "10:45", "11:00", "11:15", "11:30", "11:45", "12:00",
    ]  # fmt: skip
    assert all(s.tzinfo == UTC for s in slots)


def test_long_service_only_fits_whole() -> None:
    day = WorkingDay(time(10, 0), time(15, 0))
    slots = day_slots(DAY, 240, day, [], [], UTC_RULES, NOW)
    assert hhmm(slots) == ["10:00", "10:15", "10:30", "10:45", "11:00"]


def test_booking_in_the_middle_splits_free_time() -> None:
    busy = [BusyBooking(at(11, 0), at(12, 0))]
    slots = day_slots(DAY, 30, WORK, [], busy, UTC_RULES, NOW)
    assert hhmm(slots) == ["10:00", "10:15", "10:30", "12:00", "12:15", "12:30"]


def test_booking_with_unaligned_end_starts_next_slot_on_step() -> None:
    busy = [BusyBooking(at(10, 0), at(10, 50))]
    slots = day_slots(DAY, 60, WORK, [], busy, UTC_RULES, NOW)
    assert hhmm(slots)[0] == "11:00"


def test_lunch_break() -> None:
    day = WorkingDay(time(10, 0), time(16, 0), time(12, 0), time(13, 0))
    slots = day_slots(DAY, 60, day, [], [], UTC_RULES, NOW)
    assert "11:00" in hhmm(slots)
    assert not any("11:15" <= s < "13:00" for s in hhmm(slots))
    assert hhmm(slots)[-1] == "15:00"


def test_service_does_not_fit_at_end_of_day() -> None:
    slots = day_slots(DAY, 90, WORK, [], [], UTC_RULES, NOW)
    assert hhmm(slots)[-1] == "11:30"
    assert day_slots(DAY, 240, WORK, [], [], UTC_RULES, NOW) == []


def test_day_off_by_time_off() -> None:
    off = [TimeOff(date(2026, 12, 1), date(2026, 12, 3))]
    assert day_slots(DAY, 30, WORK, off, [], UTC_RULES, NOW) == []
    assert day_slots(date(2026, 12, 4), 30, WORK, off, [], UTC_RULES, NOW) != []


def test_day_off_without_working_hours() -> None:
    assert day_slots(DAY, 30, None, [], [], UTC_RULES, NOW) == []


def test_min_lead_time_today() -> None:
    now = at(10, 20)
    slots = day_slots(DAY, 30, WORK, [], [], UTC_RULES, now)
    # earliest is 11:20 -> first aligned slot is 11:30
    assert hhmm(slots)[0] == "11:30"


def test_cancelled_bookings_do_not_block_time() -> None:
    bookings = [
        BusyBooking(at(10), at(11), status="cancelled"),
        BusyBooking(at(11), at(12), status="no_show"),
        BusyBooking(at(12), at(13), status="completed"),
    ]
    free_day = day_slots(DAY, 30, WORK, [], bookings, UTC_RULES, NOW)
    assert free_day == day_slots(DAY, 30, WORK, [], [], UTC_RULES, NOW)
    assert len(free_day) == 11


def test_any_master_picks_free_one() -> None:
    first, second = uuid.uuid4(), uuid.uuid4()
    first_slots = day_slots(DAY, 60, WORK, [], [BusyBooking(at(10), at(11))], UTC_RULES, NOW)
    second_slots = day_slots(DAY, 60, WORK, [], [], UTC_RULES, NOW)
    merged = merge_any_master([(first, first_slots), (second, second_slots)])

    assert merged[at(10)] == second  # first master is busy at 10:00
    assert merged[at(11)] == first  # both free: first by sort order wins
    assert list(merged) == sorted(merged)


def test_salon_timezone_differs_from_utc() -> None:
    rules = SlotRules(timezone=MOSCOW, step_min=30, min_lead_time_min=0, horizon_days=14)
    slots = day_slots(DAY, 60, WorkingDay(time(10, 0), time(12, 0)), [], [], rules, NOW)
    assert hhmm(slots, MOSCOW) == ["10:00", "10:30", "11:00"]
    assert hhmm(slots) == ["07:00", "07:30", "08:00"]  # Moscow is UTC+3


def test_booking_stored_in_utc_blocks_local_time() -> None:
    rules = SlotRules(timezone=MOSCOW, step_min=30, min_lead_time_min=0, horizon_days=14)
    busy = [BusyBooking(at(10, tz=MOSCOW), at(11, tz=MOSCOW))]
    slots = day_slots(DAY, 60, WorkingDay(time(10, 0), time(12, 0)), [], busy, rules, NOW)
    assert hhmm(slots, MOSCOW) == ["11:00"]


def test_dst_transition_day() -> None:
    new_york = ZoneInfo("America/New_York")
    rules = SlotRules(timezone=new_york, step_min=60, min_lead_time_min=0, horizon_days=14)
    dst_day = date(2026, 3, 8)  # clocks go forward at 02:00
    now = datetime(2026, 3, 7, 12, 0, tzinfo=UTC)
    slots = day_slots(dst_day, 60, WorkingDay(time(10, 0), time(12, 0)), [], [], rules, now)
    assert hhmm(slots, new_york) == ["10:00", "11:00"]
    assert hhmm(slots) == ["14:00", "15:00"]  # UTC-4 after the switch


def test_booking_horizon() -> None:
    days = bookable_days(NOW, UTC_RULES)
    assert days[0] == date(2026, 12, 1)
    assert len(days) == 14
    assert day_slots(days[-1], 30, WORK, [], [], UTC_RULES, NOW) != []
    beyond = days[-1] + timedelta(days=1)
    assert day_slots(beyond, 30, WORK, [], [], UTC_RULES, NOW) == []


def test_past_day_has_no_slots() -> None:
    yesterday = date(2026, 11, 30)
    assert day_slots(yesterday, 30, WORK, [], [], UTC_RULES, NOW) == []
