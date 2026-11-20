from decimal import Decimal

from app.i18n import t

_CURRENCY_SYMBOLS = {"USD": "$", "EUR": "€", "RUB": "₽"}
_SYMBOL_AFTER = {"RUB"}


def format_price(amount: Decimal, currency: str) -> str:
    """$45, $45.50, 1500 ₽; unknown currencies are shown by code."""
    value = f"{amount:,.0f}" if amount == amount.to_integral_value() else f"{amount:,.2f}"
    value = value.replace(",", " ")
    symbol = _CURRENCY_SYMBOLS.get(currency.upper())
    if symbol is None:
        return f"{value} {currency.upper()}"
    if currency.upper() in _SYMBOL_AFTER:
        return f"{value} {symbol}"
    return f"{symbol}{value}"


def format_duration(minutes: int, lang: str) -> str:
    """90 -> '1 ч 30 мин' / '1 h 30 min'."""
    hours, mins = divmod(minutes, 60)
    parts = []
    if hours:
        parts.append(t("format.hours", lang, n=hours))
    if mins or not hours:
        parts.append(t("format.minutes", lang, n=mins))
    return " ".join(parts)


def format_years(years: int, lang: str) -> str:
    """Years of experience with correct plural forms."""
    if lang == "en":
        return f"{years} year" if years == 1 else f"{years} years"
    last_two, last = years % 100, years % 10
    if last == 1 and last_two != 11:
        word = "год"
    elif 2 <= last <= 4 and not 12 <= last_two <= 14:
        word = "года"
    else:
        word = "лет"
    return f"{years} {word}"
