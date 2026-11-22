"""Client-facing text blocks shared by handlers and the scheduler."""

from zoneinfo import ZoneInfo

from app.db.models import Booking, Master, SalonSettings, Service
from app.i18n import t
from app.utils.dates import format_date, format_time
from app.utils.format import format_duration, format_price
from app.utils.text import localized_html


def when(booking: Booking, settings: SalonSettings, lang: str) -> str:
    """'Сб, 22 ноября, 10:30' in the salon timezone."""
    local = booking.starts_at.astimezone(ZoneInfo(settings.timezone))
    return f"{format_date(local.date(), lang)}, {format_time(local)}"


def booking_details(
    booking: Booking, service: Service, master: Master, settings: SalonSettings, lang: str
) -> str:
    return t(
        "bookings.details",
        lang,
        service=localized_html(service, "name", lang),
        master=localized_html(master, "name", lang),
        when=when(booking, settings, lang),
        duration=format_duration(
            int((booking.ends_at - booking.starts_at).total_seconds() // 60), lang
        ),
        price=format_price(booking.price, settings.currency),
        address=localized_html(settings, "address", lang),
    )


def reminder_text(is_day_before: bool, lang: str) -> str:
    return t("reminder.day_before" if is_day_before else "reminder.soon", lang)


def review_request_text(service: Service, master: Master, lang: str) -> str:
    return t(
        "review.request",
        lang,
        service=localized_html(service, "name", lang),
        master=localized_html(master, "name", lang),
    )
