"""Booking flow (PRD 4.2): category -> service -> master -> date -> time -> contacts -> confirm.

Inline steps edit a single message. FSM data holds only ids (as strings); everything
else is re-read from the database on each step, so admin changes apply immediately.
"""

import uuid
from datetime import UTC, date, datetime
from html import escape
from zoneinfo import ZoneInfo

from aiogram import Bot, F, Router
from aiogram.fsm.context import FSMContext
from aiogram.types import CallbackQuery, InlineKeyboardMarkup, Message
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import repo
from app.db.models import Category, Client, Master, Service
from app.handlers.common import StaleFlowError, callback_message, show
from app.i18n import all_translations, t
from app.keyboards.booking import (
    calendar_keyboard,
    categories_keyboard,
    confirm_keyboard,
    edit_keyboard,
    masters_keyboard,
    name_keyboard,
    nav_keyboard,
    phone_keyboard,
    services_keyboard,
    times_keyboard,
)
from app.keyboards.callbacks import (
    ANY_MASTER,
    BookAction,
    BookCb,
    BookFromMasterCb,
    CategoryCb,
    DayCb,
    MasterCb,
    ServiceCb,
    SlotCb,
)
from app.keyboards.menu import language_keyboard, main_menu
from app.scheduler import ReminderScheduler
from app.services.availability import free_slots
from app.services.booking import SlotTakenError, create_booking
from app.services.notify import new_booking_text, notify_admin
from app.states import BookingFlow
from app.utils.dates import format_date, format_month_range, format_time
from app.utils.format import format_duration, format_price
from app.utils.text import localized_html

router = Router(name="booking")

MAX_NAME_LENGTH = 64

View = tuple[str, InlineKeyboardMarkup | None]


def _now() -> datetime:
    return datetime.now(UTC)


# --- Loading flow data --------------------------------------------------------------


def _uuid(data: dict, key: str) -> uuid.UUID:
    value = data.get(key)
    if not value:
        raise StaleFlowError(key)
    return uuid.UUID(value)


async def _service(session: AsyncSession, data: dict) -> Service:
    service = await repo.get_active_service(session, _uuid(data, "service"))
    if service is None:
        raise StaleFlowError("service")
    return service


async def _service_masters(session: AsyncSession, data: dict, service: Service) -> list[Master]:
    """Masters to search slots for: the chosen one, or all for "any master"."""
    masters = await repo.list_service_masters(session, service.id)
    choice = data.get("master")
    if choice == ANY_MASTER:
        return masters
    chosen = [m for m in masters if str(m.id) == choice]
    if not chosen:
        raise StaleFlowError("master")
    return chosen


def _master_label(data: dict, masters: list[Master], lang: str) -> str:
    if data.get("master") == ANY_MASTER:
        return t("booking.any_master", lang)
    return localized_html(masters[0], "name", lang)


# --- Step views ------------------------------------------------------------------


async def _categories_view(session: AsyncSession, data: dict, lang: str) -> View:
    fixed = data.get("fixed_master")
    fixed_id = uuid.UUID(fixed) if fixed else None
    categories = await repo.list_bookable_categories(session, fixed_id)
    if not categories:
        settings = await repo.get_salon_settings(session)
        text = t("booking.no_categories", lang, phone=escape(settings.phone or ""))
        return text, nav_keyboard(lang, back=False)
    text = t("booking.choose_category", lang)
    if fixed_id is not None:
        master = await repo.get_active_master(session, fixed_id)
        if master is None:
            raise StaleFlowError("fixed_master")
        master_name = localized_html(master, "name", lang)
        text += "\n" + t("booking.master_line", lang, master=master_name)
    return text, categories_keyboard(categories, lang)


async def _services_view(session: AsyncSession, data: dict, lang: str) -> View:
    category = await session.get(Category, _uuid(data, "category"))
    if category is None or not category.is_active:
        raise StaleFlowError("category")
    fixed = data.get("fixed_master")
    services = await repo.list_bookable_services(
        session, category.id, uuid.UUID(fixed) if fixed else None
    )
    settings = await repo.get_salon_settings(session)
    text = t("booking.choose_service", lang, category=localized_html(category, "name", lang))
    return text, services_keyboard(services, settings.currency, lang)


async def _masters_view(session: AsyncSession, data: dict, lang: str) -> View:
    service = await _service(session, data)
    masters = await repo.list_service_masters(session, service.id)
    if not masters:
        return t("booking.no_masters", lang), nav_keyboard(lang)
    text = t("booking.choose_master", lang, service=localized_html(service, "name", lang))
    return text, masters_keyboard(masters, lang)


async def _days_view(session: AsyncSession, data: dict, lang: str) -> View:
    service = await _service(session, data)
    masters = await _service_masters(session, data, service)
    settings = await repo.get_salon_settings(session)
    free = await free_slots(
        session, [m.id for m in masters], service.duration_min, settings, _now()
    )
    days = list(free)
    available = {day for day, slots in free.items() if slots}
    if not available:
        text = t(
            "booking.no_days",
            lang,
            days=settings.booking_horizon_days,
            phone=escape(settings.phone or ""),
        )
        return text, nav_keyboard(lang)
    text = t(
        "booking.choose_day",
        lang,
        service=localized_html(service, "name", lang),
        master=_master_label(data, masters, lang),
        month=format_month_range(days[0], days[-1], lang),
    )
    return text, calendar_keyboard(days, available, lang)


async def _times_view(session: AsyncSession, data: dict, lang: str, prefix: str = "") -> View:
    service = await _service(session, data)
    masters = await _service_masters(session, data, service)
    settings = await repo.get_salon_settings(session)
    day = date.fromisoformat(data["day"]) if data.get("day") else None
    if day is None:
        raise StaleFlowError("day")
    free = await free_slots(
        session, [m.id for m in masters], service.duration_min, settings, _now(), days=[day]
    )
    slots = free.get(day, {})
    if not slots:
        return prefix + t("booking.no_time", lang), nav_keyboard(lang)
    text = prefix + t(
        "booking.choose_time",
        lang,
        service=localized_html(service, "name", lang),
        master=_master_label(data, masters, lang),
        date=format_date(day, lang),
    )
    return text, times_keyboard(slots, ZoneInfo(settings.timezone), lang)


async def _summary_view(session: AsyncSession, data: dict, client: Client, lang: str) -> View:
    service = await _service(session, data)
    master = await repo.get_active_master(session, _uuid(data, "slot_master"))
    if master is None:
        raise StaleFlowError("slot_master")
    settings = await repo.get_salon_settings(session)
    start = datetime.fromtimestamp(data["slot_ts"], UTC).astimezone(ZoneInfo(settings.timezone))
    text = t(
        "booking.summary",
        lang,
        service=localized_html(service, "name", lang),
        master=localized_html(master, "name", lang),
        date=format_date(start.date(), lang),
        time=format_time(start),
        duration=format_duration(service.duration_min, lang),
        price=format_price(service.price, settings.currency),
        address=localized_html(settings, "address", lang),
        name=escape(client.name),
        phone=escape(client.phone or ""),
    )
    return text, confirm_keyboard(lang)


async def _selected_text(session: AsyncSession, data: dict, lang: str) -> str:
    settings = await repo.get_salon_settings(session)
    start = datetime.fromtimestamp(data["slot_ts"], UTC).astimezone(ZoneInfo(settings.timezone))
    return t(
        "booking.selected", lang, date=format_date(start.date(), lang), time=format_time(start)
    )


async def _ask_phone(message: Message, state: FSMContext, lang: str) -> None:
    await state.set_state(BookingFlow.phone)
    await message.answer(t("booking.ask_phone", lang), reply_markup=phone_keyboard(lang))


# --- Start -------------------------------------------------------------------


@router.message(F.text.in_(all_translations("menu.book")))
async def start_booking(
    message: Message, state: FSMContext, session: AsyncSession, client: Client | None, lang: str
) -> None:
    if client is None:
        await message.answer(t("start.welcome_new", "ru"), reply_markup=language_keyboard())
        return
    await state.clear()
    await state.set_state(BookingFlow.category)
    text, keyboard = await _categories_view(session, {}, lang)
    await message.answer(text, reply_markup=keyboard)


@router.callback_query(BookFromMasterCb.filter())
async def start_booking_with_master(
    callback: CallbackQuery,
    callback_data: BookFromMasterCb,
    state: FSMContext,
    session: AsyncSession,
    client: Client | None,
    lang: str,
) -> None:
    message = await callback_message(callback, lang)
    if message is None:
        return
    if client is None:
        await callback.answer()
        await message.answer(t("start.welcome_new", "ru"), reply_markup=language_keyboard())
        return
    master = await repo.get_active_master(session, callback_data.id)
    if master is None:
        await callback.answer(t("masters.not_found", lang), show_alert=True)
        return
    await state.clear()
    data = {"fixed_master": str(master.id)}
    await state.set_data(data)
    await state.set_state(BookingFlow.category)
    text, keyboard = await _categories_view(session, data, lang)
    await callback.answer()
    await show(message, text, keyboard)


# --- Inline steps ----------------------------------------------------------------


@router.callback_query(BookingFlow.category, CategoryCb.filter())
async def choose_category(
    callback: CallbackQuery,
    callback_data: CategoryCb,
    state: FSMContext,
    session: AsyncSession,
    lang: str,
) -> None:
    message = await callback_message(callback, lang)
    if message is None:
        return
    data = await state.update_data(category=str(callback_data.id))
    text, keyboard = await _services_view(session, data, lang)
    await state.set_state(BookingFlow.service)
    await callback.answer()
    await show(message, text, keyboard)


@router.callback_query(BookingFlow.service, ServiceCb.filter())
async def choose_service(
    callback: CallbackQuery,
    callback_data: ServiceCb,
    state: FSMContext,
    session: AsyncSession,
    lang: str,
) -> None:
    message = await callback_message(callback, lang)
    if message is None:
        return
    data = await state.update_data(service=str(callback_data.id))
    if data.get("fixed_master"):
        data = await state.update_data(master=data["fixed_master"])
        text, keyboard = await _days_view(session, data, lang)
        await state.set_state(BookingFlow.day)
    else:
        text, keyboard = await _masters_view(session, data, lang)
        await state.set_state(BookingFlow.master)
    await callback.answer()
    await show(message, text, keyboard)


@router.callback_query(BookingFlow.master, MasterCb.filter())
async def choose_master(
    callback: CallbackQuery,
    callback_data: MasterCb,
    state: FSMContext,
    session: AsyncSession,
    lang: str,
) -> None:
    message = await callback_message(callback, lang)
    if message is None:
        return
    data = await state.update_data(master=callback_data.id)
    text, keyboard = await _days_view(session, data, lang)
    await state.set_state(BookingFlow.day)
    await callback.answer()
    await show(message, text, keyboard)


@router.callback_query(BookingFlow.day, DayCb.filter())
async def choose_day(
    callback: CallbackQuery,
    callback_data: DayCb,
    state: FSMContext,
    session: AsyncSession,
    lang: str,
) -> None:
    message = await callback_message(callback, lang)
    if message is None:
        return
    data = await state.update_data(day=callback_data.day)
    text, keyboard = await _times_view(session, data, lang)
    await state.set_state(BookingFlow.time)
    await callback.answer()
    await show(message, text, keyboard)


@router.callback_query(BookingFlow.time, SlotCb.filter())
async def choose_slot(
    callback: CallbackQuery,
    callback_data: SlotCb,
    state: FSMContext,
    session: AsyncSession,
    client: Client,
    lang: str,
) -> None:
    message = await callback_message(callback, lang)
    if message is None:
        return
    # Callback data is client-controlled: the master must be one allowed by the flow
    data = await state.get_data()
    allowed = await _service_masters(session, data, await _service(session, data))
    if callback_data.master not in {m.id for m in allowed}:
        raise StaleFlowError("slot_master")
    data = await state.update_data(slot_ts=callback_data.ts, slot_master=str(callback_data.master))
    await callback.answer()
    if client.phone and not data.get("edit_contacts"):
        text, keyboard = await _summary_view(session, data, client, lang)
        await state.set_state(BookingFlow.confirm)
        await show(message, text, keyboard)
        return

    await show(message, await _selected_text(session, data, lang), None)
    await _ask_phone(message, state, lang)


@router.callback_query(BookCb.filter(F.action == BookAction.NOOP))
async def unavailable_day(callback: CallbackQuery, lang: str) -> None:
    await callback.answer(t("booking.day_unavailable", lang))


@router.callback_query(BookCb.filter(F.action == BookAction.IGNORE))
async def ignore_button(callback: CallbackQuery) -> None:
    await callback.answer()


@router.callback_query(BookingFlow(), BookCb.filter(F.action == BookAction.CANCEL))
async def cancel_inline(callback: CallbackQuery, state: FSMContext, lang: str) -> None:
    message = await callback_message(callback, lang)
    if message is None:
        return
    await state.clear()
    await callback.answer()
    await show(message, t("booking.cancelled", lang), None)


@router.callback_query(BookingFlow(), BookCb.filter(F.action == BookAction.BACK))
async def go_back(
    callback: CallbackQuery,
    state: FSMContext,
    session: AsyncSession,
    client: Client,
    lang: str,
) -> None:
    message = await callback_message(callback, lang)
    if message is None:
        return
    current = await state.get_state()
    data = await state.get_data()

    if current == BookingFlow.category.state:
        await state.clear()
        await callback.answer()
        await show(message, t("booking.cancelled", lang), None)
        return
    if current == BookingFlow.service.state:
        view, target = await _categories_view(session, data, lang), BookingFlow.category
    elif current == BookingFlow.master.state:
        view, target = await _services_view(session, data, lang), BookingFlow.service
    elif current == BookingFlow.day.state:
        if data.get("fixed_master"):
            view, target = await _services_view(session, data, lang), BookingFlow.service
        else:
            view, target = await _masters_view(session, data, lang), BookingFlow.master
    elif current == BookingFlow.time.state:
        view, target = await _days_view(session, data, lang), BookingFlow.day
    elif current == BookingFlow.confirm.state:
        view, target = await _times_view(session, data, lang), BookingFlow.time
    elif current == BookingFlow.edit_menu.state:
        view, target = await _summary_view(session, data, client, lang), BookingFlow.confirm
    else:
        await callback.answer(t("errors.outdated", lang), show_alert=True)
        return

    await state.set_state(target)
    await callback.answer()
    await show(message, *view)


# --- Confirmation and "Change" menu -------------------------------------------------


@router.callback_query(BookingFlow.confirm, BookCb.filter(F.action == BookAction.CONFIRM))
async def confirm_booking(
    callback: CallbackQuery,
    state: FSMContext,
    session: AsyncSession,
    client: Client,
    bot: Bot,
    reminders: ReminderScheduler,
    lang: str,
) -> None:
    message = await callback_message(callback, lang)
    if message is None:
        return
    data = await state.get_data()
    service = await _service(session, data)
    master_choice = data.get("master")
    # The master comes from the validated flow choice; the slot only says when
    preferred = None if master_choice == ANY_MASTER else _uuid(data, "master")
    starts_at = datetime.fromtimestamp(data["slot_ts"], UTC)

    try:
        booking = await create_booking(session, client, service, preferred, starts_at, _now())
    except SlotTakenError:
        text, keyboard = await _times_view(
            session, data, lang, prefix=t("booking.slot_taken", lang) + "\n\n"
        )
        await state.set_state(BookingFlow.time)
        await callback.answer()
        await show(message, text, keyboard)
        return
    await session.commit()
    await state.clear()
    reminders.schedule_booking(booking)

    settings = await repo.get_salon_settings(session)
    master = await session.get(Master, booking.master_id)
    start = booking.starts_at.astimezone(ZoneInfo(settings.timezone))
    text = t(
        "booking.success",
        lang,
        service=localized_html(service, "name", lang),
        master=localized_html(master, "name", lang),
        date=format_date(start.date(), lang),
        time=format_time(start),
        price=format_price(booking.price, settings.currency),
        address=localized_html(settings, "address", lang),
    )
    await callback.answer()
    await show(message, text, None)
    await notify_admin(bot, new_booking_text(booking, client, service, master, settings))


@router.callback_query(BookingFlow.confirm, BookCb.filter(F.action == BookAction.EDIT))
async def open_edit_menu(callback: CallbackQuery, state: FSMContext, lang: str) -> None:
    message = await callback_message(callback, lang)
    if message is None:
        return
    await state.set_state(BookingFlow.edit_menu)
    await callback.answer()
    await show(message, t("booking.edit_menu", lang), edit_keyboard(lang))


@router.callback_query(BookingFlow.edit_menu, BookCb.filter())
async def edit_choice(
    callback: CallbackQuery,
    callback_data: BookCb,
    state: FSMContext,
    session: AsyncSession,
    lang: str,
) -> None:
    message = await callback_message(callback, lang)
    if message is None:
        return
    action = callback_data.action
    if action == BookAction.EDIT_SERVICE:
        data = await state.get_data()
        view, target = await _categories_view(session, data, lang), BookingFlow.category
    elif action == BookAction.EDIT_MASTER:
        data = await state.update_data(fixed_master=None)
        view, target = await _masters_view(session, data, lang), BookingFlow.master
    elif action == BookAction.EDIT_TIME:
        data = await state.get_data()
        view, target = await _days_view(session, data, lang), BookingFlow.day
    elif action == BookAction.EDIT_CONTACTS:
        await state.update_data(edit_contacts=True)
        await callback.answer()
        await show(message, await _selected_text(session, await state.get_data(), lang), None)
        await _ask_phone(message, state, lang)
        return
    else:
        await callback.answer(t("errors.outdated", lang), show_alert=True)
        return
    await state.set_state(target)
    await callback.answer()
    await show(message, *view)


# --- Contacts (reply keyboard steps) -------------------------------------------------


async def _back_to_times(
    message: Message, state: FSMContext, session: AsyncSession, lang: str
) -> None:
    data = await state.get_data()
    await state.set_state(BookingFlow.time)
    await message.answer(t("booking.back_to_time", lang), reply_markup=main_menu(lang))
    text, keyboard = await _times_view(session, data, lang)
    await message.answer(text, reply_markup=keyboard)


async def _cancel_by_text(message: Message, state: FSMContext, lang: str) -> None:
    await state.clear()
    await message.answer(t("booking.cancelled", lang), reply_markup=main_menu(lang))


@router.message(BookingFlow.phone, F.contact)
async def receive_phone(message: Message, state: FSMContext, lang: str) -> None:
    contact = message.contact
    user = message.from_user
    if contact is None or user is None or contact.user_id != user.id:
        await message.answer(t("booking.phone_not_own", lang), reply_markup=phone_keyboard(lang))
        return
    phone = (
        contact.phone_number if contact.phone_number.startswith("+") else f"+{contact.phone_number}"
    )
    await state.update_data(phone=phone)
    await state.set_state(BookingFlow.name)
    suggestion = (user.full_name or "")[:MAX_NAME_LENGTH]
    await message.answer(t("booking.ask_name", lang), reply_markup=name_keyboard(suggestion, lang))


@router.message(BookingFlow.phone, F.text.in_(all_translations("nav.back")))
async def phone_back(message: Message, state: FSMContext, session: AsyncSession, lang: str) -> None:
    await _back_to_times(message, state, session, lang)


@router.message(BookingFlow.name, F.text.in_(all_translations("nav.back")))
async def name_back(message: Message, state: FSMContext, lang: str) -> None:
    await _ask_phone(message, state, lang)


@router.message(BookingFlow.phone, F.text.in_(all_translations("booking.cancel_button")))
@router.message(BookingFlow.name, F.text.in_(all_translations("booking.cancel_button")))
async def contacts_cancel(message: Message, state: FSMContext, lang: str) -> None:
    await _cancel_by_text(message, state, lang)


@router.message(BookingFlow.phone)
async def phone_other(message: Message, lang: str) -> None:
    await message.answer(t("booking.phone_use_button", lang), reply_markup=phone_keyboard(lang))


@router.message(BookingFlow.name)
async def receive_name(
    message: Message, state: FSMContext, session: AsyncSession, client: Client, lang: str
) -> None:
    name = (message.text or "").strip()
    if not name or len(name) > MAX_NAME_LENGTH:
        await message.answer(t("booking.name_invalid", lang))
        return
    data = await state.update_data(edit_contacts=False)
    client.name = name
    client.phone = data["phone"]
    await session.flush()
    await state.set_state(BookingFlow.confirm)
    await message.answer(
        t("booking.contacts_saved", lang, name=escape(name)), reply_markup=main_menu(lang)
    )
    text, keyboard = await _summary_view(session, data, client, lang)
    await message.answer(text, reply_markup=keyboard)
