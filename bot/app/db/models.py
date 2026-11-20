"""ORM models mirroring tables created by migrations in db/migrations.

The bot never creates or alters tables: the schema is owned by admin/src/db/schema.ts.
"""

import uuid
from datetime import date, datetime, time
from decimal import Decimal

from sqlalchemy import BigInteger, DateTime, ForeignKey, Numeric, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class SalonSettings(Base):
    __tablename__ = "settings"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str]
    address_ru: Mapped[str | None]
    address_en: Mapped[str | None]
    phone: Mapped[str | None]
    instagram: Mapped[str | None]
    hours_ru: Mapped[str | None]
    hours_en: Mapped[str | None]
    latitude: Mapped[float | None]
    longitude: Mapped[float | None]
    timezone: Mapped[str]
    currency: Mapped[str]
    slot_step_min: Mapped[int]
    min_lead_time_min: Mapped[int]
    cancel_deadline_hours: Mapped[int]
    booking_horizon_days: Mapped[int]
    reminders_enabled: Mapped[bool]
    reviews_enabled: Mapped[bool]


class Category(Base):
    __tablename__ = "categories"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True)
    name_ru: Mapped[str]
    name_en: Mapped[str]
    sort: Mapped[int]
    is_active: Mapped[bool]


class Service(Base):
    __tablename__ = "services"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True)
    category_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("categories.id"))
    name_ru: Mapped[str]
    name_en: Mapped[str]
    description_ru: Mapped[str | None]
    description_en: Mapped[str | None]
    duration_min: Mapped[int]
    price: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    sort: Mapped[int]
    is_active: Mapped[bool]
    created_at: Mapped[datetime]


class MasterService(Base):
    __tablename__ = "master_services"

    master_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("masters.id"), primary_key=True)
    service_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("services.id"), primary_key=True)


class Master(Base):
    __tablename__ = "masters"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True)
    name_ru: Mapped[str]
    name_en: Mapped[str]
    specialty_ru: Mapped[str | None]
    specialty_en: Mapped[str | None]
    experience_years: Mapped[int | None]
    photo_url: Mapped[str | None]
    sort: Mapped[int]
    is_active: Mapped[bool]
    created_at: Mapped[datetime]


class Client(Base):
    __tablename__ = "clients"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    telegram_id: Mapped[int | None] = mapped_column(BigInteger, unique=True)
    name: Mapped[str]
    phone: Mapped[str | None]
    language: Mapped[str]
    created_at: Mapped[datetime]


class WorkingHours(Base):
    __tablename__ = "working_hours"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True)
    master_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("masters.id"))
    weekday: Mapped[int]  # 1 = Monday ... 7 = Sunday
    start_time: Mapped[time]
    end_time: Mapped[time]
    break_start: Mapped[time | None]
    break_end: Mapped[time | None]


class TimeOffPeriod(Base):
    __tablename__ = "time_off"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True)
    master_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("masters.id"))
    date_from: Mapped[date]
    date_to: Mapped[date]
    reason: Mapped[str | None]


class Booking(Base):
    __tablename__ = "bookings"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    client_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("clients.id"))
    master_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("masters.id"))
    service_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("services.id"))
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    ends_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    price: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    status: Mapped[str]
    source: Mapped[str]
    comment: Mapped[str | None] = mapped_column(default=None)
    reminder_24h_sent_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), default=None
    )
    reminder_2h_sent_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), default=None
    )
    review_requested_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), default=None
    )
    cancelled_by: Mapped[str | None] = mapped_column(default=None)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class BookingStatusHistory(Base):
    __tablename__ = "booking_status_history"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    booking_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("bookings.id"))
    old_status: Mapped[str | None]
    new_status: Mapped[str]
    changed_by: Mapped[str]
    changed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
