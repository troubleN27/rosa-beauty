"""Free time calculation (SPEC section 5).

Pure functions without database access. The same logic is repeated in
admin/src/lib/slots.ts — keep them in sync.

All datetimes are timezone-aware. Working hours are interpreted in the salon
timezone; results are returned in UTC.
"""

import math
import uuid
from collections.abc import Iterable
from dataclasses import dataclass
from datetime import UTC, date, datetime, time, timedelta
from zoneinfo import ZoneInfo


@dataclass(frozen=True)
class WorkingDay:
    start: time
    end: time
    break_start: time | None = None
    break_end: time | None = None


@dataclass(frozen=True)
class TimeOff:
    date_from: date
    date_to: date  # inclusive


@dataclass(frozen=True)
class Interval:
    start: datetime
    end: datetime


@dataclass(frozen=True)
class BusyBooking:
    start: datetime
    end: datetime
    status: str = "confirmed"


@dataclass(frozen=True)
class SlotRules:
    timezone: ZoneInfo
    step_min: int = 15
    min_lead_time_min: int = 60
    horizon_days: int = 14


def bookable_days(now: datetime, rules: SlotRules) -> list[date]:
    """Calendar days open for booking: today (salon time) and the following days."""
    today = now.astimezone(rules.timezone).date()
    return [today + timedelta(days=offset) for offset in range(rules.horizon_days)]


def _subtract(free: list[Interval], busy: Interval) -> list[Interval]:
    result: list[Interval] = []
    for part in free:
        if busy.end <= part.start or busy.start >= part.end:
            result.append(part)
            continue
        if busy.start > part.start:
            result.append(Interval(part.start, busy.start))
        if busy.end < part.end:
            result.append(Interval(busy.end, part.end))
    return result


def day_slots(
    day: date,
    duration_min: int,
    working_day: WorkingDay | None,
    time_off: Iterable[TimeOff],
    bookings: Iterable[BusyBooking],
    rules: SlotRules,
    now: datetime,
) -> list[datetime]:
    """Start times (UTC) when a service of `duration_min` fits into one master's day.

    Only confirmed bookings of the master block time; other statuses are ignored.
    """
    if day not in bookable_days(now, rules):
        return []
    if any(off.date_from <= day <= off.date_to for off in time_off):
        return []
    if working_day is None:
        return []

    tz = rules.timezone

    def local(moment: time) -> datetime:
        return datetime.combine(day, moment, tzinfo=tz)

    work_start = local(working_day.start)
    free = [Interval(work_start, local(working_day.end))]
    if working_day.break_start is not None and working_day.break_end is not None:
        free = _subtract(
            free, Interval(local(working_day.break_start), local(working_day.break_end))
        )
    for booking in bookings:
        if booking.status != "confirmed":
            continue
        # Same tzinfo everywhere keeps the arithmetic in salon wall-clock time
        free = _subtract(free, Interval(booking.start.astimezone(tz), booking.end.astimezone(tz)))

    step = timedelta(minutes=rules.step_min)
    duration = timedelta(minutes=duration_min)
    earliest = now + timedelta(minutes=rules.min_lead_time_min)

    slots: list[datetime] = []
    for interval in free:
        # Slot starts are aligned to the step counted from the start of the working day
        steps_from_open = math.ceil((interval.start - work_start) / step)
        start = work_start + steps_from_open * step
        while start + duration <= interval.end:
            if start >= earliest:
                slots.append(start.astimezone(UTC))
            start += step
    return sorted(slots)


def merge_any_master(
    per_master: Iterable[tuple[uuid.UUID, list[datetime]]],
) -> dict[datetime, uuid.UUID]:
    """Union of slots of several masters ("any master").

    `per_master` must be ordered by masters.sort: for each time the first free
    master is kept. The result is ordered by time.
    """
    merged: dict[datetime, uuid.UUID] = {}
    for master_id, slots in per_master:
        for slot in slots:
            merged.setdefault(slot, master_id)
    return dict(sorted(merged.items()))
