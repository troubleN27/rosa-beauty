"""Bot texts. All user-facing strings live in ru.json / en.json."""

import json
from functools import cache
from pathlib import Path

LANGUAGES = ("ru", "en")
DEFAULT_LANGUAGE = "ru"

_DIR = Path(__file__).parent


@cache
def _load(lang: str) -> dict[str, str]:
    with (_DIR / f"{lang}.json").open(encoding="utf-8") as file:
        return json.load(file)


def normalize_language(lang: str | None) -> str:
    return lang if lang in LANGUAGES else DEFAULT_LANGUAGE


def t(key: str, lang: str | None, **params: object) -> str:
    texts = _load(normalize_language(lang))
    template = texts.get(key) or _load(DEFAULT_LANGUAGE)[key]
    return template.format(**params) if params else template


# Former labels of reply-keyboard buttons: clients keep an old keyboard until the bot sends
# a new one, so these must still open the right section.
_LEGACY_BUTTONS: dict[str, set[str]] = {
    "menu.book": {"✨ Записаться", "✨ Book now"},
}


def all_translations(key: str) -> set[str]:
    """The text of a key in every language (to match reply-keyboard buttons)."""
    return {t(key, lang) for lang in LANGUAGES}


def menu_button_texts(key: str) -> set[str]:
    """Every text a main-menu button may carry: current labels and former ones."""
    return all_translations(key) | _LEGACY_BUTTONS.get(key, set())


def language_from_telegram(language_code: str | None) -> str:
    """Best guess for users who have not chosen a language yet."""
    if language_code and language_code.split("-")[0] in {"ru", "uk", "be", "kk"}:
        return "ru"
    return "en" if language_code else DEFAULT_LANGUAGE
