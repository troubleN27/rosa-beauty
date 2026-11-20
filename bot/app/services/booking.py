"""Creating bookings (SPEC 4.4)."""

import logging
import uuid
from datetime import datetime, timedelta

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import repo
from app.db.models import Booking, BookingStatusHistory, Client, Service
from app.services.availability import masters_free_at

logger = logging.getLogger(__name__)

EXCLUSION_VIOLATION = "23P01"


class SlotTakenError(Exception):
    """The chosen time is no longer free."""


def _is_exclusion_violation(error: IntegrityError) -> bool:
    orig = error.orig
    for candidate in (orig, getattr(orig, "__cause__", None)):
        if getattr(candidate, "sqlstate", None) == EXCLUSION_VIOLATION:
            return True
    return False


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
    The caller commits the session.
    """
    settings = await repo.get_salon_settings(session)
    # Only active masters who perform this service may be booked (ids may come from
    # client-controlled callback data, so they are never trusted as is)
    service_masters = [m.id for m in await repo.list_service_masters(session, service.id)]
    if master_id is None:
        candidates = service_masters
    elif master_id in service_masters:
        candidates = [master_id]
    else:
        raise SlotTakenError

    free_masters = await masters_free_at(
        session, candidates, service.duration_min, settings, now, starts_at
    )
    for candidate in free_masters:
        booking = Booking(
            client_id=client.id,
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
    raise SlotTakenError
