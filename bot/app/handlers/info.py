"""Information sections: services & prices, masters, contacts."""

from html import escape

from aiogram import F, Router
from aiogram.types import CallbackQuery, InlineKeyboardMarkup, LinkPreviewOptions, Message
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import repo
from app.db.models import Master, SalonSettings, Service
from app.handlers.common import callback_message
from app.i18n import all_translations, t
from app.keyboards.callbacks import InfoCategoryCb, InfoMasterCb, NavCb, NavTarget
from app.keyboards.info import (
    back_keyboard,
    categories_keyboard,
    master_card_keyboard,
    masters_keyboard,
)
from app.utils.format import format_duration, format_price, format_years
from app.utils.text import localized, localized_html

router = Router(name="info")


# --- Services & prices ---------------------------------------------------------


async def _categories_view(
    session: AsyncSession, lang: str
) -> tuple[str, InlineKeyboardMarkup | None]:
    categories = await repo.list_categories_with_services(session)
    if not categories:
        settings = await repo.get_salon_settings(session)
        return t("services.empty", lang, phone=escape(settings.phone or "")), None
    return t("services.choose_category", lang), categories_keyboard(categories, lang)


def _service_text(service: Service, settings: SalonSettings, lang: str) -> str:
    text = t(
        "services.item",
        lang,
        name=localized_html(service, "name", lang),
        duration=format_duration(service.duration_min, lang),
        price=format_price(service.price, settings.currency),
    )
    description = localized(service, "description", lang)
    return f"{text}\n<i>{escape(description)}</i>" if description else text


@router.message(F.text.in_(all_translations("menu.services")))
async def handle_services(message: Message, session: AsyncSession, lang: str) -> None:
    text, keyboard = await _categories_view(session, lang)
    await message.answer(text, reply_markup=keyboard)


@router.callback_query(InfoCategoryCb.filter())
async def handle_category(
    callback: CallbackQuery, callback_data: InfoCategoryCb, session: AsyncSession, lang: str
) -> None:
    message = await callback_message(callback, lang)
    if message is None:
        return
    category = await repo.get_active_category(session, callback_data.id)
    if category is None:
        await callback.answer(t("errors.outdated", lang), show_alert=True)
        return
    services = await repo.list_category_services(session, category.id)
    settings = await repo.get_salon_settings(session)

    title = f"<b>{localized_html(category, 'name', lang)}</b>"
    if services:
        body = "\n\n".join(_service_text(service, settings, lang) for service in services)
    else:
        body = t("services.category_empty", lang)
    await callback.answer()
    await message.edit_text(
        f"{title}\n\n{body}", reply_markup=back_keyboard(NavTarget.CATEGORIES, lang)
    )


@router.callback_query(NavCb.filter(F.to == NavTarget.CATEGORIES))
async def handle_back_to_categories(
    callback: CallbackQuery, session: AsyncSession, lang: str
) -> None:
    message = await callback_message(callback, lang)
    if message is None:
        return
    text, keyboard = await _categories_view(session, lang)
    await callback.answer()
    await message.edit_text(text, reply_markup=keyboard)


# --- Masters ------------------------------------------------------------------


async def _masters_view(
    session: AsyncSession, lang: str
) -> tuple[str, InlineKeyboardMarkup | None]:
    masters = await repo.list_active_masters(session)
    if not masters:
        return t("masters.empty", lang), None
    return t("masters.choose", lang), masters_keyboard(masters, lang)


def _master_card(master: Master, lang: str) -> str:
    lines = [f"<b>{localized_html(master, 'name', lang)}</b>"]
    specialty = localized_html(master, "specialty", lang)
    if specialty:
        lines.append(specialty)
    if master.experience_years:
        years = format_years(master.experience_years, lang)
        lines.append(t("masters.experience", lang, years=years))
    return "\n".join(lines)


@router.message(F.text.in_(all_translations("menu.masters")))
async def handle_masters(message: Message, session: AsyncSession, lang: str) -> None:
    text, keyboard = await _masters_view(session, lang)
    await message.answer(text, reply_markup=keyboard)


@router.callback_query(InfoMasterCb.filter())
async def handle_master(
    callback: CallbackQuery, callback_data: InfoMasterCb, session: AsyncSession, lang: str
) -> None:
    message = await callback_message(callback, lang)
    if message is None:
        return
    master = await repo.get_active_master(session, callback_data.id)
    if master is None:
        await callback.answer(t("masters.not_found", lang), show_alert=True)
        return

    card = _master_card(master, lang)
    keyboard = master_card_keyboard(master, lang)
    await callback.answer()
    if master.photo_url:
        # A text message cannot become a photo, so the list is replaced by a new message
        await message.delete()
        await message.answer_photo(master.photo_url, caption=card, reply_markup=keyboard)
    else:
        await message.edit_text(card, reply_markup=keyboard)


@router.callback_query(NavCb.filter(F.to == NavTarget.MASTERS))
async def handle_back_to_masters(callback: CallbackQuery, session: AsyncSession, lang: str) -> None:
    message = await callback_message(callback, lang)
    if message is None:
        return
    text, keyboard = await _masters_view(session, lang)
    await callback.answer()
    if message.photo:
        await message.delete()
        await message.answer(text, reply_markup=keyboard)
    else:
        await message.edit_text(text, reply_markup=keyboard)


# --- Contacts -----------------------------------------------------------------


@router.message(F.text.in_(all_translations("menu.contacts")))
async def handle_contacts(message: Message, session: AsyncSession, lang: str) -> None:
    settings = await repo.get_salon_settings(session)
    lines = [t("contacts.title", lang, name=escape(settings.name))]
    address = localized(settings, "address", lang)
    if address:
        lines.append(t("contacts.address", lang, address=escape(address)))
    if settings.phone:
        lines.append(t("contacts.phone", lang, phone=escape(settings.phone)))
    hours = localized(settings, "hours", lang)
    if hours:
        lines.append(t("contacts.hours", lang, hours=escape(hours)))
    if settings.instagram:
        lines.append(t("contacts.instagram", lang, url=escape(settings.instagram, quote=True)))

    has_location = settings.latitude is not None and settings.longitude is not None
    if has_location:
        lines.append(f"\n{t('contacts.map', lang)}")
    await message.answer(
        "\n".join(lines), link_preview_options=LinkPreviewOptions(is_disabled=True)
    )
    if has_location:
        await message.answer_location(latitude=settings.latitude, longitude=settings.longitude)
