"""Notifications to the salon administrator chat (SPEC 4.7). Always in Russian."""

import logging
from datetime import datetime
from html import escape
from zoneinfo import ZoneInfo

from aiogram import Bot

from app.config import get_settings
from app.db.models import Booking, Client, Master, SalonSettings, Service
from app.utils.dates import format_date, format_time
from app.utils.format import format_price

logger = logging.getLogger(__name__)

ADMIN_LANG = "ru"
SOURCE_LABELS = {"bot": "бот", "admin": "админка"}


def _contact(client: Client) -> str:
    contact = escape(client.name)
    if client.phone:
        contact += f", {escape(client.phone)}"
    return contact


def _when(moment: datetime, settings: SalonSettings) -> str:
    local = moment.astimezone(ZoneInfo(settings.timezone))
    return f"{format_date(local.date(), ADMIN_LANG)}, {format_time(local)}"


def _service_line(booking: Booking, service: Service, settings: SalonSettings) -> str:
    price = format_price(booking.price, settings.currency)
    return f"💇‍♀️ {escape(service.name_ru)} ({service.duration_min} мин) — {price}"


def new_booking_text(
    booking: Booking, client: Client, service: Service, master: Master, settings: SalonSettings
) -> str:
    return "\n".join(
        [
            "✨ <b>Новая запись</b>",
            f"👤 {_contact(client)}",
            _service_line(booking, service, settings),
            f"👩‍🎨 Мастер: {escape(master.name_ru)}",
            f"📅 {_when(booking.starts_at, settings)}",
            f"📲 Источник: {SOURCE_LABELS.get(booking.source, booking.source)}",
        ]
    )


def cancellation_text(
    booking: Booking, client: Client, service: Service, master: Master, settings: SalonSettings
) -> str:
    return "\n".join(
        [
            "❌ <b>Отмена</b>",
            f"👤 {_contact(client)}",
            _service_line(booking, service, settings),
            f"👩‍🎨 Мастер: {escape(master.name_ru)}",
            f"📅 {_when(booking.starts_at, settings)}",
            "📲 Отменил клиент в боте",
        ]
    )


def reschedule_text(
    booking: Booking,
    old_starts_at: datetime,
    client: Client,
    service: Service,
    master: Master,
    settings: SalonSettings,
) -> str:
    return "\n".join(
        [
            "🔁 <b>Перенос</b>",
            f"👤 {_contact(client)}",
            _service_line(booking, service, settings),
            f"👩‍🎨 Мастер: {escape(master.name_ru)}",
            f"📅 Было: {_when(old_starts_at, settings)}",
            f"📅 Стало: {_when(booking.starts_at, settings)}",
            "📲 Перенёс клиент в боте",
        ]
    )


def review_text(
    rating: int,
    booking: Booking,
    client: Client,
    service: Service,
    master: Master,
    settings: SalonSettings,
) -> str:
    return "\n".join(
        [
            f"⭐ <b>Отзыв {rating}/5</b>",
            f"👤 {_contact(client)}",
            f"💇‍♀️ {escape(service.name_ru)}",
            f"👩‍🎨 Мастер: {escape(master.name_ru)}",
            f"📅 Визит: {_when(booking.starts_at, settings)}",
        ]
    )


def review_comment_text(rating: int, client: Client, comment: str) -> str:
    return "\n".join(
        [
            f"💬 <b>Комментарий к отзыву {rating}/5</b>",
            f"👤 {_contact(client)}",
            f"«{escape(comment)}»",
        ]
    )


async def notify_admin(bot: Bot, text: str) -> None:
    """Send a message to the admin chat; failures are logged and never break the flow."""
    try:
        await bot.send_message(get_settings().admin_chat_id, text)
    except Exception:
        logger.exception("Failed to send admin notification")
