"""Notifications to the salon administrator chat (SPEC 4.7). Always in Russian."""

import logging
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


def new_booking_text(
    booking: Booking, client: Client, service: Service, master: Master, settings: SalonSettings
) -> str:
    local_start = booking.starts_at.astimezone(ZoneInfo(settings.timezone))
    contact = escape(client.name)
    if client.phone:
        contact += f", {escape(client.phone)}"
    return "\n".join(
        [
            "✨ <b>Новая запись</b>",
            f"👤 {contact}",
            f"💇‍♀️ {escape(service.name_ru)} ({service.duration_min} мин) — "
            f"{format_price(booking.price, settings.currency)}",
            f"👩‍🎨 Мастер: {escape(master.name_ru)}",
            f"📅 {format_date(local_start.date(), ADMIN_LANG)}, {format_time(local_start)}",
            f"📲 Источник: {SOURCE_LABELS.get(booking.source, booking.source)}",
        ]
    )


async def notify_admin(bot: Bot, text: str) -> None:
    """Send a message to the admin chat; failures are logged and never break the flow."""
    try:
        await bot.send_message(get_settings().admin_chat_id, text)
    except Exception:
        logger.exception("Failed to send admin notification")
