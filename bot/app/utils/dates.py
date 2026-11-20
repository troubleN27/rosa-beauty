from datetime import date, datetime

from app.i18n import t


def _pick(key: str, lang: str, index: int) -> str:
    return t(key, lang).split(",")[index].strip()


def weekday_short(day: date, lang: str) -> str:
    return _pick("cal.weekdays", lang, day.weekday())


def format_date(day: date, lang: str) -> str:
    """'Пт, 28 ноября' / 'Fri, 28 November'."""
    return t(
        "format.date",
        lang,
        weekday=weekday_short(day, lang),
        day=day.day,
        month=_pick("cal.months_genitive", lang, day.month - 1),
    )


def format_month_range(first: date, last: date, lang: str) -> str:
    """'Ноябрь – декабрь 2026' style title for the calendar."""
    start = _pick("cal.months", lang, first.month - 1)
    if first.month == last.month:
        return f"{start} {first.year}"
    end = _pick("cal.months", lang, last.month - 1)
    return f"{start} – {end.lower() if lang == 'ru' else end} {last.year}"


def format_time(moment: datetime) -> str:
    return moment.strftime("%H:%M")
