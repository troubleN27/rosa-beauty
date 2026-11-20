from decimal import Decimal

import pytest

from app.utils.format import format_duration, format_price, format_years


@pytest.mark.parametrize(
    ("amount", "currency", "expected"),
    [
        (Decimal("45.00"), "USD", "$45"),
        (Decimal("45.50"), "usd", "$45.50"),
        (Decimal("1500"), "RUB", "1 500 ₽"),
        (Decimal("20"), "GBP", "20 GBP"),
    ],
)
def test_format_price(amount: Decimal, currency: str, expected: str) -> None:
    assert format_price(amount, currency) == expected


@pytest.mark.parametrize(
    ("minutes", "lang", "expected"),
    [
        (30, "ru", "30 мин"),
        (60, "ru", "1 ч"),
        (90, "ru", "1 ч 30 мин"),
        (240, "en", "4 h"),
        (45, "en", "45 min"),
    ],
)
def test_format_duration(minutes: int, lang: str, expected: str) -> None:
    assert format_duration(minutes, lang) == expected


@pytest.mark.parametrize(
    ("years", "lang", "expected"),
    [
        (1, "ru", "1 год"),
        (4, "ru", "4 года"),
        (5, "ru", "5 лет"),
        (11, "ru", "11 лет"),
        (21, "ru", "21 год"),
        (1, "en", "1 year"),
        (7, "en", "7 years"),
    ],
)
def test_format_years(years: int, lang: str, expected: str) -> None:
    assert format_years(years, lang) == expected
