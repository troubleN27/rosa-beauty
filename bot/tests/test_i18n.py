import json
from pathlib import Path

from app.i18n import all_translations, language_from_telegram, menu_button_texts, t
from app.main import COMMANDS

I18N_DIR = Path(__file__).parent.parent / "app" / "i18n"


def _keys(lang: str) -> set[str]:
    return set(json.loads((I18N_DIR / f"{lang}.json").read_text(encoding="utf-8")))


def test_languages_have_same_keys() -> None:
    assert _keys("ru") == _keys("en")


def test_params_are_substituted() -> None:
    assert "Welcome back, Anna!" in t("start.welcome_back", "en", name="Anna")


def test_unknown_language_falls_back_to_russian() -> None:
    assert t("menu.book", "de") == t("menu.book", "ru")


def test_menu_buttons_match_both_languages() -> None:
    assert all_translations("menu.services") == {"💰 Услуги и цены", "💰 Services & prices"}


def test_no_texts_mention_demo_or_test() -> None:
    for lang in ("ru", "en"):
        content = (I18N_DIR / f"{lang}.json").read_text(encoding="utf-8").lower()
        for word in ("demo", "демо", "тестов", "portfolio", "портфолио"):
            assert word not in content


def test_language_from_telegram() -> None:
    assert language_from_telegram("ru") == "ru"
    assert language_from_telegram("uk-UA") == "ru"
    assert language_from_telegram("en-US") == "en"
    assert language_from_telegram("de") == "en"
    assert language_from_telegram(None) == "ru"


def test_menu_buttons_keep_former_labels() -> None:
    texts = menu_button_texts("menu.book")
    assert all_translations("menu.book") <= texts
    assert {"✨ Записаться", "✨ Book now"} <= texts
    assert {"📅 Мои записи", "📅 My bookings"} <= menu_button_texts("menu.my_bookings")


def test_every_command_has_a_description() -> None:
    for lang in ("ru", "en"):
        for name in COMMANDS:
            assert t(f"commands.{name}", lang)
