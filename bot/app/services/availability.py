"""Glue between the database and the pure slot algorithm in slots.py.

Schedules for all requested masters and days are loaded with three queries,
so a 14-day calendar is computed in one round trip.
"""

import uuid
from dataclasses import dataclass
from datetime import UTC, date, datetime, time, timedelta
from zoneinfo import ZoneInfo

from sqlalchemy.ext.asyncio import AsyncSession

from app.db import repo
from app.db.models import SalonSettings
from app.services.slots import (
    BusyBooking,
    SlotRules,
    TimeOff,
    WorkingDay,
    bookable_days,
    day_slots,
    merge_any_master,
)


def slot_rules(settings: SalonSettings) -> SlotRules:
    return SlotRules(
        timezone=ZoneInfo(settings.timezone),
        step_min=settings.slot_step_min,
        min_lead_time_min=settings.min_lead_time_min,
        horizon_days=settings.booking_horizon_days,
    )


@dataclass
class MasterSchedule:
    working: dict[int, WorkingDay]  # ISO weekday -> hours
    time_off: list[TimeOff]
    bookings: list[BusyBooking]


async def load_schedules(
    session: AsyncSession, master_ids: list[uuid.UUID], days: list[date], tz: ZoneInfo
) -> dict[uuid.UUID, MasterSchedule]:
    schedules = {
        master_id: MasterSchedule(working={}, time_off=[], bookings=[]) for master_id in master_ids
    }
    if not master_ids or not days:
        return schedules

    first, last = min(days), max(days)
    range_start = datetime.combine(first, time.min, tzinfo=tz).astimezone(UTC)
    range_end = datetime.combine(last + timedelta(days=1), time.min, tzinfo=tz).astimezone(UTC)

    for row in await repo.list_working_hours(session, master_ids):
        schedules[row.master_id].working[row.weekday] = WorkingDay(
            row.start_time, row.end_time, row.break_start, row.break_end
        )
    for row in await repo.list_time_off(session, master_ids, first, last):
        schedules[row.master_id].time_off.append(TimeOff(row.date_from, row.date_to))
    for row in await repo.list_confirmed_bookings(session, master_ids, range_start, range_end):
        schedules[row.master_id].bookings.append(
            BusyBooking(row.starts_at, row.ends_at, row.status)
        )
    return schedules


def master_day_slots(
    schedule: MasterSchedule, day: date, duration_min: int, rules: SlotRules, now: datetime
) -> list[datetime]:
    return day_slots(
        day,
        duration_min,
        schedule.working.get(day.isoweekday()),
        schedule.time_off,
        schedule.bookings,
        rules,
        now,
    )


async def free_slots(
    session: AsyncSession,
    master_ids: list[uuid.UUID],
    duration_min: int,
    settings: SalonSettings,
    now: datetime,
    days: list[date] | None = None,
) -> dict[date, dict[datetime, uuid.UUID]]:
    """Free start times per day; for each time — the first free master in `master_ids` order.

    With a single master this is simply that master's slots.
    """
    rules = slot_rules(settings)
    days = days if days is not None else bookable_days(now, rules)
    schedules = await load_schedules(session, master_ids, days, rules.timezone)
    result: dict[date, dict[datetime, uuid.UUID]] = {}
    for day in days:
        per_master = [
            (master_id, master_day_slots(schedules[master_id], day, duration_min, rules, now))
            for master_id in master_ids
        ]
        result[day] = merge_any_master(per_master)
    return result


async def masters_free_at(
    session: AsyncSession,
    master_ids: list[uuid.UUID],
    duration_min: int,
    settings: SalonSettings,
    now: datetime,
    starts_at: datetime,
) -> list[uuid.UUID]:
    """All masters (in the given order) for whom `starts_at` is still a valid free slot."""
    rules = slot_rules(settings)
    day = starts_at.astimezone(rules.timezone).date()
    schedules = await load_schedules(session, master_ids, [day], rules.timezone)
    return [
        master_id
        for master_id in master_ids
        if starts_at in master_day_slots(schedules[master_id], day, duration_min, rules, now)
    ]
