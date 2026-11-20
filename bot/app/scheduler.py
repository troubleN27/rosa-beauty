"""Reminders and review requests (SPEC 4.6).

The bot does not poll the database every minute (Neon must be able to sleep):
jobs are scheduled for exact times, and the database is synced at startup and
every 30 minutes. Jobs live in memory; the database is the source of truth, and
the *_sent_at / review_requested_at flags guarantee nothing is sent twice.
"""

import contextlib
import logging
import uuid
from collections.abc import Awaitable, Callable
from datetime import UTC, datetime, timedelta
from enum import StrEnum

from aiogram import Bot
from aiogram.exceptions import TelegramForbiddenError
from apscheduler.jobstores.base import JobLookupError
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.date import DateTrigger
from apscheduler.triggers.interval import IntervalTrigger
from sqlalchemy import exists, select, update
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.db import repo
from app.db.models import Booking, Client, Master, Review, Service
from app.keyboards.reminders import reminder_keyboard, review_keyboard
from app.services.texts import booking_details, reminder_text, review_request_text

logger = logging.getLogger(__name__)

SYNC_INTERVAL = timedelta(minutes=30)
SYNC_WINDOW = timedelta(hours=26)
REVIEW_LOOKBACK = timedelta(hours=24)
REVIEW_DELAY = timedelta(hours=2)
MISFIRE_GRACE_SECONDS = 3600


class ReminderKind(StrEnum):
    H24 = "remind24"
    H2 = "remind2"


REMINDER_OFFSETS = {ReminderKind.H24: timedelta(hours=24), ReminderKind.H2: timedelta(hours=2)}
REMINDER_FLAGS = {
    ReminderKind.H24: Booking.reminder_24h_sent_at,
    ReminderKind.H2: Booking.reminder_2h_sent_at,
}


def reminder_plan(
    starts_at: datetime,
    created_at: datetime,
    now: datetime,
    already_sent: frozenset[ReminderKind] = frozenset(),
) -> dict[ReminderKind, datetime]:
    """When to send each reminder (a past moment is replaced by `now`).

    - a reminder is not planned if the booking was created after its moment
      (the 24 h one is not set for bookings made less than 24 h ahead);
    - if the moment passed (e.g. the bot was down) but the visit has not started,
      the 2 h reminder is sent right away; the 24 h one only if 2 h or more remain.
    """
    plan: dict[ReminderKind, datetime] = {}
    if now >= starts_at:
        return plan
    for kind, offset in REMINDER_OFFSETS.items():
        moment = starts_at - offset
        if kind in already_sent or created_at > moment:
            continue
        if moment >= now:
            plan[kind] = moment
        elif kind is ReminderKind.H2 or starts_at - now >= REMINDER_OFFSETS[ReminderKind.H2]:
            plan[kind] = now
    return plan


def review_moment(ends_at: datetime, now: datetime) -> datetime:
    return max(ends_at + REVIEW_DELAY, now)


def _job_id(prefix: str, booking_id: uuid.UUID) -> str:
    return f"{prefix}:{booking_id}"


class ReminderScheduler:
    def __init__(self, bot: Bot, session_factory: async_sessionmaker[AsyncSession]) -> None:
        self.bot = bot
        self.session_factory = session_factory
        self.scheduler = AsyncIOScheduler(timezone=UTC)

    # --- lifecycle ---------------------------------------------------------------

    def start(self) -> None:
        self.scheduler.add_job(
            self.sync,
            IntervalTrigger(seconds=int(SYNC_INTERVAL.total_seconds())),
            id="sync",
            next_run_time=datetime.now(UTC),  # also run at startup
            replace_existing=True,
            coalesce=True,
            max_instances=1,
        )
        self.scheduler.start()

    def shutdown(self) -> None:
        if self.scheduler.running:
            self.scheduler.shutdown(wait=False)

    # --- planning ----------------------------------------------------------------

    def _add(
        self, job_id: str, run_at: datetime, func: Callable[..., Awaitable[None]], *args
    ) -> None:
        self.scheduler.add_job(
            func,
            DateTrigger(run_date=run_at),
            args=list(args),
            id=job_id,
            replace_existing=True,
            misfire_grace_time=MISFIRE_GRACE_SECONDS,
        )

    def schedule_booking(self, booking: Booking, now: datetime | None = None) -> None:
        """Plan reminders for a confirmed booking (replaces existing jobs)."""
        now = now or datetime.now(UTC)
        sent = frozenset(
            kind
            for kind, flag in (
                (ReminderKind.H24, booking.reminder_24h_sent_at),
                (ReminderKind.H2, booking.reminder_2h_sent_at),
            )
            if flag is not None
        )
        plan = reminder_plan(booking.starts_at, booking.created_at, now, sent)
        for kind in ReminderKind:
            job_id = _job_id(kind, booking.id)
            if kind in plan:
                self._add(
                    job_id, plan[kind], self.send_reminder, booking.id, kind, booking.starts_at
                )
            else:
                self._remove(job_id)

    def schedule_review(self, booking: Booking, now: datetime | None = None) -> None:
        now = now or datetime.now(UTC)
        self._add(
            _job_id("review", booking.id),
            review_moment(booking.ends_at, now),
            self.send_review_request,
            booking.id,
        )

    def unschedule_booking(self, booking_id: uuid.UUID) -> None:
        for prefix in (*ReminderKind, "review"):
            self._remove(_job_id(prefix, booking_id))

    def _remove(self, job_id: str) -> None:
        with contextlib.suppress(JobLookupError):
            self.scheduler.remove_job(job_id)

    def job_ids(self) -> set[str]:
        return {job.id for job in self.scheduler.get_jobs()}

    # --- sync ----------------------------------------------------------------------

    async def sync(self) -> None:
        """Pick up bookings created/changed in the admin panel and anything planned
        before a restart. Two queries every 30 minutes."""
        now = datetime.now(UTC)
        try:
            async with self.session_factory() as session:
                settings = await repo.get_salon_settings(session)
                upcoming = []
                if settings.reminders_enabled:
                    upcoming = await repo.list_bookings_for_reminders(
                        session, now, now + SYNC_WINDOW
                    )
                completed = []
                if settings.reviews_enabled:
                    completed = await repo.list_bookings_for_review(
                        session, now - REVIEW_LOOKBACK, now + SYNC_WINDOW
                    )
        except Exception:
            logger.exception("Scheduler sync failed")
            return
        for booking in upcoming:
            self.schedule_booking(booking, now)
        for booking in completed:
            self.schedule_review(booking, now)
        logger.info(
            "Scheduler sync: %d upcoming, %d awaiting review", len(upcoming), len(completed)
        )

    # --- jobs ----------------------------------------------------------------------

    async def _claim(self, session: AsyncSession, flag, *conditions) -> bool:
        """Atomically set a 'sent' flag; False if it was already set or conditions fail."""
        result = await session.execute(
            update(Booking)
            .where(flag.is_(None), *conditions)
            .values({flag.key: datetime.now(UTC)})
            .returning(Booking.id)
        )
        claimed = result.scalar_one_or_none() is not None
        await session.commit()
        return claimed

    async def _release(self, session: AsyncSession, booking_id: uuid.UUID, flag) -> None:
        await session.execute(
            update(Booking).where(Booking.id == booking_id).values({flag.key: None})
        )
        await session.commit()

    async def _load(self, session: AsyncSession, booking_id: uuid.UUID):
        result = await session.execute(
            select(Booking, Client, Service, Master)
            .join(Client, Client.id == Booking.client_id)
            .join(Service, Service.id == Booking.service_id)
            .join(Master, Master.id == Booking.master_id)
            .where(Booking.id == booking_id)
        )
        return result.one_or_none()

    async def _deliver(
        self, session: AsyncSession, booking_id: uuid.UUID, flag, chat_id: int, text: str, markup
    ) -> None:
        try:
            await self.bot.send_message(chat_id, text, reply_markup=markup)
        except TelegramForbiddenError:
            logger.warning("Client blocked the bot, booking %s", booking_id)
        except Exception:
            logger.exception("Failed to send %s for booking %s", flag.key, booking_id)
            await self._release(session, booking_id, flag)

    async def send_reminder(
        self, booking_id: uuid.UUID, kind: ReminderKind, expected_starts_at: datetime
    ) -> None:
        flag = REMINDER_FLAGS[ReminderKind(kind)]
        async with self.session_factory() as session:
            settings = await repo.get_salon_settings(session)
            if not settings.reminders_enabled:
                return
            claimed = await self._claim(
                session,
                flag,
                Booking.id == booking_id,
                Booking.status == "confirmed",
                Booking.starts_at == expected_starts_at,
                Booking.starts_at > datetime.now(UTC),
            )
            if not claimed:
                return
            row = await self._load(session, booking_id)
            if row is None or row.Client.telegram_id is None:
                return
            booking, client, service, master = row
            lang = client.language
            text = reminder_text(ReminderKind(kind) is ReminderKind.H24, lang) + "\n\n"
            text += booking_details(booking, service, master, settings, lang)
            await self._deliver(
                session,
                booking_id,
                flag,
                client.telegram_id,
                text,
                reminder_keyboard(booking.id, lang),
            )

    async def send_review_request(self, booking_id: uuid.UUID) -> None:
        flag = Booking.review_requested_at
        async with self.session_factory() as session:
            settings = await repo.get_salon_settings(session)
            if not settings.reviews_enabled:
                return
            claimed = await self._claim(
                session,
                flag,
                Booking.id == booking_id,
                Booking.status == "completed",
                ~exists().where(Review.booking_id == Booking.id),
            )
            if not claimed:
                return
            row = await self._load(session, booking_id)
            if row is None or row.Client.telegram_id is None:
                return
            booking, client, service, master = row
            text = review_request_text(service, master, client.language)
            await self._deliver(
                session,
                booking_id,
                flag,
                client.telegram_id,
                text,
                review_keyboard(booking.id),
            )
