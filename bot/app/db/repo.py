"""Data access functions. Data is read on every request (no cache), so changes
made in the admin panel are visible in the bot immediately."""

import uuid
from datetime import date, datetime

from sqlalchemy import exists, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import (
    Booking,
    Category,
    Client,
    Master,
    MasterService,
    SalonSettings,
    Service,
    TimeOffPeriod,
    WorkingHours,
)


async def get_salon_settings(session: AsyncSession) -> SalonSettings:
    settings = await session.get(SalonSettings, 1)
    if settings is None:
        raise RuntimeError("Salon settings row is missing (run db:seed)")
    return settings


async def get_client_by_telegram_id(session: AsyncSession, telegram_id: int) -> Client | None:
    result = await session.execute(select(Client).where(Client.telegram_id == telegram_id))
    return result.scalar_one_or_none()


async def save_client_language(
    session: AsyncSession, telegram_id: int, name: str, language: str
) -> Client:
    """Create the client on first language choice or update the language."""
    stmt = (
        insert(Client)
        .values(id=uuid.uuid4(), telegram_id=telegram_id, name=name, language=language)
        .on_conflict_do_update(index_elements=[Client.telegram_id], set_={"language": language})
        .returning(Client)
    )
    result = await session.execute(stmt, execution_options={"populate_existing": True})
    return result.scalar_one()


async def list_categories_with_services(session: AsyncSession) -> list[Category]:
    """Active categories that have at least one active service."""
    has_services = exists().where(Service.category_id == Category.id, Service.is_active)
    result = await session.execute(
        select(Category)
        .where(Category.is_active, has_services)
        .order_by(Category.sort, Category.name_ru)
    )
    return list(result.scalars())


async def get_active_category(session: AsyncSession, category_id: uuid.UUID) -> Category | None:
    category = await session.get(Category, category_id)
    return category if category and category.is_active else None


async def list_category_services(session: AsyncSession, category_id: uuid.UUID) -> list[Service]:
    result = await session.execute(
        select(Service)
        .where(Service.category_id == category_id, Service.is_active)
        .order_by(Service.sort, Service.name_ru)
    )
    return list(result.scalars())


async def list_active_masters(session: AsyncSession) -> list[Master]:
    result = await session.execute(
        select(Master).where(Master.is_active).order_by(Master.sort, Master.name_ru)
    )
    return list(result.scalars())


async def get_active_master(session: AsyncSession, master_id: uuid.UUID) -> Master | None:
    master = await session.get(Master, master_id)
    return master if master and master.is_active else None


# --- Booking catalog ------------------------------------------------------------


def _service_has_active_master(master_id: uuid.UUID | None = None):
    """SQL condition: the service is performed by an active master (or by `master_id`)."""
    condition = exists().where(
        MasterService.service_id == Service.id,
        MasterService.master_id == Master.id,
        Master.is_active,
    )
    if master_id is not None:
        condition = condition.where(Master.id == master_id)
    return condition


async def list_bookable_categories(
    session: AsyncSession, master_id: uuid.UUID | None = None
) -> list[Category]:
    """Active categories with at least one active service that an active master performs."""
    has_services = exists().where(
        Service.category_id == Category.id,
        Service.is_active,
        _service_has_active_master(master_id),
    )
    result = await session.execute(
        select(Category)
        .where(Category.is_active, has_services)
        .order_by(Category.sort, Category.name_ru)
    )
    return list(result.scalars())


async def list_bookable_services(
    session: AsyncSession, category_id: uuid.UUID, master_id: uuid.UUID | None = None
) -> list[Service]:
    result = await session.execute(
        select(Service)
        .join(Category, Category.id == Service.category_id)
        .where(
            Service.category_id == category_id,
            Service.is_active,
            Category.is_active,
            _service_has_active_master(master_id),
        )
        .order_by(Service.sort, Service.name_ru)
    )
    return list(result.scalars())


async def get_active_service(session: AsyncSession, service_id: uuid.UUID) -> Service | None:
    service = await session.get(Service, service_id)
    return service if service and service.is_active else None


async def list_service_masters(session: AsyncSession, service_id: uuid.UUID) -> list[Master]:
    """Active masters performing the service, in display order."""
    result = await session.execute(
        select(Master)
        .join(MasterService, MasterService.master_id == Master.id)
        .where(MasterService.service_id == service_id, Master.is_active)
        .order_by(Master.sort, Master.name_ru)
    )
    return list(result.scalars())


# --- Schedules ------------------------------------------------------------------


async def list_working_hours(
    session: AsyncSession, master_ids: list[uuid.UUID]
) -> list[WorkingHours]:
    result = await session.execute(
        select(WorkingHours).where(WorkingHours.master_id.in_(master_ids))
    )
    return list(result.scalars())


async def list_time_off(
    session: AsyncSession, master_ids: list[uuid.UUID], date_from: date, date_to: date
) -> list[TimeOffPeriod]:
    result = await session.execute(
        select(TimeOffPeriod).where(
            TimeOffPeriod.master_id.in_(master_ids),
            TimeOffPeriod.date_from <= date_to,
            TimeOffPeriod.date_to >= date_from,
        )
    )
    return list(result.scalars())


async def list_confirmed_bookings(
    session: AsyncSession, master_ids: list[uuid.UUID], start: datetime, end: datetime
) -> list[Booking]:
    """Confirmed bookings of the masters overlapping [start, end)."""
    result = await session.execute(
        select(Booking).where(
            Booking.master_id.in_(master_ids),
            Booking.status == "confirmed",
            Booking.starts_at < end,
            Booking.ends_at > start,
        )
    )
    return list(result.scalars())
