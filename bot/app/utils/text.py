from html import escape


def localized(obj: object, field: str, lang: str) -> str:
    """Value of `<field>_<lang>` with fallback to Russian; empty string if missing."""
    value = getattr(obj, f"{field}_{lang}", None) or getattr(obj, f"{field}_ru", None)
    return value or ""


def localized_html(obj: object, field: str, lang: str) -> str:
    """Same as `localized`, escaped for HTML parse mode."""
    return escape(localized(obj, field, lang))
