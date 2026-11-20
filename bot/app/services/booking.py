"""Creating, cancelling and rescheduling bookings (SPEC 4.4, 4.5).

Functions here never commit: the caller commits the session.
"""

import logging
import uuid
from datetime import datetime, timedelta

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import repo
from app.db.models import Booking, BookingStatusHistory, Client, SalonSettings, Service
from app.services.availability import masters_free_at

logger = logging.getLogger(__name__)

EXCLUSION_VIOLATION = "23P01"


class SlotTakenError(Exception):
    """The chosen time is no longer free."""


class TooLateToChangeError(Exception):
    """The client's cancel/reschedule deadline has passed (or the booking is not active)."""


def _is_exclusion_violation(error: IntegrityError) -> bool:
    orig = error.orig
    for candidate in (orig, getattr(orig, "__cause__", None)):
        if getattr(candidate, "sqlstate", None) == EXCLUSION_VIOLATION:
            return True
    return False


def can_client_change(booking: Booking, settings: SalonSettings, now: datetime) -> bool:
    """A client may cancel or reschedule a confirmed booking until the deadline."""
    deadline = timedelta(hours=settings.cancel_deadline_hours)
    return booking.status == "confirmed" and booking.starts_at - now >= deadline


def change_status(
    session: AsyncSession,
    booking: Booking,
    new_status: str,
    changed_by: str,
    cancelled_by: str | None = None,
) -> None:
    """Set a new status and record it in booking_status_history."""
    session.add(
        BookingStatusHistory(
            booking_id=booking.id,
            old_status=booking.status,
            new_status=new_status,
            changed_by=changed_by,
        )
    )
    booking.status = new_status
    if new_status == "cancelled":
        booking.cancelled_by = cancelled_by


async def _bookable_masters(
    session: AsyncSession, service: Service, master_id: uuid.UUID | None
) -> list[uuid.UUID]:
    # Only active masters who perform this service may be booked (ids may come from
    # client-controlled callback data, so they are never trusted as is)
    service_masters = [m.id for m in await repo.list_service_masters(session, service.id)]
    if master_id is None:
        return service_masters
    return [master_id] if master_id in service_masters else []


async def _insert_confirmed(
    session: AsyncSession,
    client_id: uuid.UUID,
    service: Service,
    candidates: list[uuid.UUID],
    starts_at: datetime,
) -> Booking | None:
    """Try candidates in order; the DB exclusion constraint is the final guard."""
    for candidate in candidates:
        booking = Booking(
            client_id=client_id,
            master_id=candidate,
            service_id=service.id,
            starts_at=starts_at,
            ends_at=starts_at + timedelta(minutes=service.duration_min),
            price=service.price,
            status="confirmed",
            source="bot",
        )
        try:
            async with session.begin_nested():
                session.add(booking)
                await session.flush()
                session.add(
                    BookingStatusHistory(
                        booking_id=booking.id,
                        old_status=None,
                        new_status="confirmed",
                        changed_by="client",
                    )
                )
                await session.flush()
        except IntegrityError as error:
            if not _is_exclusion_violation(error):
                raise
            logger.info("Slot %s for master %s was taken concurrently", starts_at, candidate)
            continue
        return booking
    return None


async def create_booking(
    session: AsyncSession,
    client: Client,
    service: Service,
    master_id: uuid.UUID | None,
    starts_at: datetime,
    now: datetime,
) -> Booking:
    """Create a confirmed booking from the bot.

    `master_id=None` means "any master": the first master (by sort order) who is
    still free at `starts_at` is assigned. Raises SlotTakenError if nobody is free.
    """
    settings = await repo.get_salon_settings(session)
    candidates = await _bookable_masters(session, service, master_id)
    free_masters = await masters_free_at(
        session, candidates, service.duration_min, settings, now, starts_at
    )
    booking = await _insert_confirmed(session, client.id, service, free_masters, starts_at)
    if booking is None:
        raise SlotTakenError
    return booking


async def cancel_by_client(session: AsyncSession, booking: Booking, now: datetime) -> None:
    settings = await repo.get_salon_settings(session)
    if not can_client_change(booking, settings, now):
        raise TooLateToChangeError
    change_status(session, booking, "cancelled", changed_by="client", cancelled_by="client")
    await session.flush()


async def reschedule_by_client(
    session: AsyncSession, booking: Booking, new_start: datetime, now: datetime
) -> Booking:
    """Move a booking to a new time with the same master and service (SPEC 4.5).

    The old booking is cancelled and a new one is created in one savepoint; if the
    new time is taken, nothing changes and SlotTakenError is raised.
    """
    settings = await repo.get_salon_settings(session)
    if not can_client_change(booking, settings, now):
        raise TooLateToChangeError
    service = await repo.get_active_service(session, booking.service_id)
    if service is None:
        raise SlotTakenError
    candidates = await _bookable_masters(session, service, booking.master_id)
    free = await masters_free_at(
        session, candidates, service.duration_min, settings, now, new_start, booking.id
    )
    if not free:
        raise SlotTakenError

    async with session.begin_nested() as savepoint:
        change_status(session, booking, "cancelled", changed_by="client", cancelled_by="client")
        await session.flush()
        new_booking = await _insert_confirmed(session, booking.client_id, service, free, new_start)
        if new_booking is None:
            await savepoint.rollback()
    if new_booking is None:
        # The savepoint rollback expired the old booking; reload it unchanged
        await session.refresh(booking)
        raise SlotTakenError
    return new_booking
