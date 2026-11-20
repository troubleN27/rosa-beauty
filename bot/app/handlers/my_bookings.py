"""«📅 Мои записи»: upcoming bookings, cancel and reschedule (PRD 4.3, SPEC 4.5).

Also handles the "I'll come" / "Cancel" buttons of reminders.
"""

import uuid
from datetime import UTC, date, datetime
from html import escape
from zoneinfo import ZoneInfo

from aiogram import Bot, F, Router
from aiogram.fsm.context import FSMContext
from aiogram.types import CallbackQuery, Message
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import repo
from app.db.models import Booking, Client, Master, SalonSettings, Service
from app.handlers.common import StaleFlowError, callback_message, show
from app.i18n import all_translations, t
from app.keyboards.booking import (
    calendar_keyboard,
    confirm_only_keyboard,
    nav_keyboard,
    times_keyboard,
)
from app.keyboards.callbacks import BookAction, BookCb, DayCb, MyAction, MyCb, SlotCb
from app.keyboards.my_bookings import (
    booking_card_keyboard,
    bookings_list_keyboard,
    cancel_confirm_keyboard,
)
from app.scheduler import ReminderScheduler
from app.services.availability import free_slots
from app.services.booking import (
    SlotTakenError,
    TooLateToChangeError,
    can_client_change,
    cancel_by_client,
    reschedule_by_client,
)
from app.services.notify import cancellation_text, notify_admin, reschedule_text
from app.services.texts import booking_details, when
from app.states import RescheduleFlow
from app.utils.dates import format_date, format_month_range
from app.utils.text import localized, localized_html

router = Router(name="my_bookings")


def _now() -> datetime:
    return datetime.now(UTC)


async def _load_booking(
    session: AsyncSession, booking_id: str, client: Client | None
) -> tuple[Booking, Service, Master]:
    """The client's own booking with its service and master (ids from callbacks are untrusted)."""
    if client is None or not booking_id:
        raise StaleFlowError("booking")
    booking = await repo.get_client_booking(session, uuid.UUID(booking_id), client.id)
    if booking is None:
        raise StaleFlowError("booking")
    service = await session.get(Service, booking.service_id)
    master = await session.get(Master, booking.master_id)
    return booking, service, master


def _too_late_text(settings: SalonSettings, lang: str) -> str:
    return t(
        "bookings.too_late",
        lang,
        hours=settings.cancel_deadline_hours,
        phone=escape(settings.phone or ""),
    )


# --- List and card -------------------------------------------------------------------


async def _list_view(session: AsyncSession, client: Client, lang: str):
    bookings = await repo.list_upcoming_bookings(session, client.id, _now())
    if not bookings:
        return t("bookings.empty", lang), None
    settings = await repo.get_salon_settings(session)
    items = []
    for booking in bookings:
        service = await session.get(Service, booking.service_id)
        label = f"{when(booking, settings, lang)} · {localized(service, 'name', lang)}"
        items.append((booking, label))
    return t("bookings.list_title", lang), bookings_list_keyboard(items)


@router.message(F.text.in_(all_translations("menu.my_bookings")))
async def my_bookings(
    message: Message,
    state: FSMContext,
    session: AsyncSession,
    client: Client | None,
    lang: str,
) -> None:
    await state.clear()
    if client is None:
        await message.answer(t("bookings.empty", lang))
        return
    text, keyboard = await _list_view(session, client, lang)
    await message.answer(text, reply_markup=keyboard)


@router.callback_query(MyCb.filter(F.action == MyAction.LIST))
async def back_to_list(
    callback: CallbackQuery,
    state: FSMContext,
    session: AsyncSession,
    client: Client | None,
    lang: str,
) -> None:
    message = await callback_message(callback, lang)
    if message is None or client is None:
        return
    await state.clear()
    text, keyboard = await _list_view(session, client, lang)
    await callback.answer()
    await show(message, text, keyboard)


async def _card_view(session: AsyncSession, booking: Booking, service, master, lang: str):
    settings = await repo.get_salon_settings(session)
    if booking.status != "confirmed" or booking.starts_at <= _now():
        raise StaleFlowError("booking")
    text = t("bookings.card_title", lang) + "\n\n"
    text += booking_details(booking, service, master, settings, lang)
    can_change = can_client_change(booking, settings, _now())
    if not can_change:
        text += "\n\n" + _too_late_text(settings, lang)
    return text, booking_card_keyboard(booking, can_change, lang)


@router.callback_query(MyCb.filter(F.action == MyAction.CARD))
async def booking_card(
    callback: CallbackQuery,
    callback_data: MyCb,
    state: FSMContext,
    session: AsyncSession,
    client: Client | None,
    lang: str,
) -> None:
    message = await callback_message(callback, lang)
    if message is None:
        return
    await state.clear()
    booking, service, master = await _load_booking(session, callback_data.id, client)
    text, keyboard = await _card_view(session, booking, service, master, lang)
    await callback.answer()
    await show(message, text, keyboard)


# --- Cancel ----------------------------------------------------------------------------


@router.callback_query(MyCb.filter(F.action == MyAction.CANCEL))
async def ask_cancel(
    callback: CallbackQuery,
    callback_data: MyCb,
    session: AsyncSession,
    client: Client | None,
    lang: str,
) -> None:
    message = await callback_message(callback, lang)
    if message is None:
        return
    booking, service, master = await _load_booking(session, callback_data.id, client)
    settings = await repo.get_salon_settings(session)
    if booking.status != "confirmed":
        raise StaleFlowError("booking")
    await callback.answer()
    if not can_client_change(booking, settings, _now()):
        await show(message, _too_late_text(settings, lang), None)
        return
    text = t("bookings.cancel_question", lang) + "\n\n"
    text += booking_details(booking, service, master, settings, lang)
    await show(message, text, cancel_confirm_keyboard(booking, lang))


@router.callback_query(MyCb.filter(F.action == MyAction.CANCEL_YES))
async def do_cancel(
    callback: CallbackQuery,
    callback_data: MyCb,
    session: AsyncSession,
    client: Client | None,
    bot: Bot,
    reminders: ReminderScheduler,
    lang: str,
) -> None:
    message = await callback_message(callback, lang)
    if message is None:
        return
    booking, service, master = await _load_booking(session, callback_data.id, client)
    settings = await repo.get_salon_settings(session)
    if booking.status != "confirmed":
        raise StaleFlowError("booking")
    try:
        await cancel_by_client(session, booking, _now())
    except TooLateToChangeError:
        await callback.answer()
        await show(message, _too_late_text(settings, lang), None)
        return
    await session.commit()
    reminders.unschedule_booking(booking.id)

    await callback.answer()
    await show(message, t("bookings.cancelled", lang, when=when(booking, settings, lang)), None)
    await notify_admin(bot, cancellation_text(booking, client, service, master, settings))


# --- Reminder: "I'll come" -----------------------------------------------------------


@router.callback_query(MyCb.filter(F.action == MyAction.COMING))
async def coming(
    callback: CallbackQuery,
    callback_data: MyCb,
    session: AsyncSession,
    client: Client | None,
    lang: str,
) -> None:
    message = await callback_message(callback, lang)
    if message is None:
        return
    booking, _, _ = await _load_booking(session, callback_data.id, client)
    if booking.status != "confirmed":
        raise StaleFlowError("booking")
    await callback.answer()
    await show(message, f"{message.html_text}\n\n{t('reminder.coming_reply', lang)}", None)


# --- Reschedule --------------------------------------------------------------------------


async def _reschedule_context(session: AsyncSession, data: dict, client: Client | None):
    booking, service, master = await _load_booking(session, data.get("booking", ""), client)
    if booking.status != "confirmed":
        raise StaleFlowError("booking")
    settings = await repo.get_salon_settings(session)
    return booking, service, master, settings


async def _reschedule_days_view(session, data, client, lang):
    booking, service, master, settings = await _reschedule_context(session, data, client)
    free = await free_slots(
        session, [master.id], service.duration_min, settings, _now(), exclude_booking_id=booking.id
    )
    days = list(free)
    available = {day for day, slots in free.items() if set(slots) - {booking.starts_at}}
    header = t(
        "reschedule.header",
        lang,
        service=localized_html(service, "name", lang),
        master=localized_html(master, "name", lang),
        current=when(booking, settings, lang),
    )
    if not available:
        text = (
            header
            + "\n\n"
            + t(
                "booking.no_days",
                lang,
                days=settings.booking_horizon_days,
                phone=escape(settings.phone or ""),
            )
        )
        return text, nav_keyboard(lang)
    text = (
        header
        + "\n\n"
        + t("reschedule.choose_day", lang, month=format_month_range(days[0], days[-1], lang))
    )
    return text, calendar_keyboard(days, available, lang)


async def _reschedule_times_view(session, data, client, lang, prefix: str = ""):
    booking, service, master, settings = await _reschedule_context(session, data, client)
    day = date.fromisoformat(data["day"])
    free = await free_slots(
        session,
        [master.id],
        service.duration_min,
        settings,
        _now(),
        days=[day],
        exclude_booking_id=booking.id,
    )
    slots = {start: m for start, m in free.get(day, {}).items() if start != booking.starts_at}
    if not slots:
        return prefix + t("booking.no_time", lang), nav_keyboard(lang)
    text = prefix + t(
        "reschedule.choose_time",
        lang,
        service=localized_html(service, "name", lang),
        master=localized_html(master, "name", lang),
        date=format_date(day, lang),
    )
    return text, times_keyboard(slots, ZoneInfo(settings.timezone), lang)


@router.callback_query(MyCb.filter(F.action == MyAction.RESCHEDULE))
async def start_reschedule(
    callback: CallbackQuery,
    callback_data: MyCb,
    state: FSMContext,
    session: AsyncSession,
    client: Client | None,
    lang: str,
) -> None:
    message = await callback_message(callback, lang)
    if message is None:
        return
    booking, _, _ = await _load_booking(session, callback_data.id, client)
    settings = await repo.get_salon_settings(session)
    await callback.answer()
    if not can_client_change(booking, settings, _now()):
        await show(message, _too_late_text(settings, lang), None)
        return
    await state.clear()
    data = {"booking": str(booking.id)}
    await state.set_data(data)
    await state.set_state(RescheduleFlow.day)
    await show(message, *await _reschedule_days_view(session, data, client, lang))


@router.callback_query(RescheduleFlow.day, DayCb.filter())
async def reschedule_day(
    callback: CallbackQuery,
    callback_data: DayCb,
    state: FSMContext,
    session: AsyncSession,
    client: Client | None,
    lang: str,
) -> None:
    message = await callback_message(callback, lang)
    if message is None:
        return
    data = await state.update_data(day=callback_data.day)
    view = await _reschedule_times_view(session, data, client, lang)
    await state.set_state(RescheduleFlow.time)
    await callback.answer()
    await show(message, *view)


@router.callback_query(RescheduleFlow.time, SlotCb.filter())
async def reschedule_slot(
    callback: CallbackQuery,
    callback_data: SlotCb,
    state: FSMContext,
    session: AsyncSession,
    client: Client | None,
    lang: str,
) -> None:
    message = await callback_message(callback, lang)
    if message is None:
        return
    data = await state.get_data()
    booking, service, master, settings = await _reschedule_context(session, data, client)
    if callback_data.master != master.id:
        raise StaleFlowError("slot_master")  # callback data is client-controlled
    data = await state.update_data(slot_ts=callback_data.ts)
    new_start = datetime.fromtimestamp(callback_data.ts, UTC)
    preview = Booking(starts_at=new_start)
    text = t(
        "reschedule.confirm",
        lang,
        service=localized_html(service, "name", lang),
        master=localized_html(master, "name", lang),
        old=when(booking, settings, lang),
        new=when(preview, settings, lang),
    )
    await state.set_state(RescheduleFlow.confirm)
    await callback.answer()
    await show(message, text, confirm_only_keyboard(lang))


@router.callback_query(RescheduleFlow.confirm, BookCb.filter(F.action == BookAction.CONFIRM))
async def reschedule_confirm(
    callback: CallbackQuery,
    state: FSMContext,
    session: AsyncSession,
    client: Client | None,
    bot: Bot,
    reminders: ReminderScheduler,
    lang: str,
) -> None:
    message = await callback_message(callback, lang)
    if message is None:
        return
    data = await state.get_data()
    booking, service, master, settings = await _reschedule_context(session, data, client)
    old_when = when(booking, settings, lang)
    old_start = booking.starts_at
    new_start = datetime.fromtimestamp(data["slot_ts"], UTC)
    try:
        new_booking = await reschedule_by_client(session, booking, new_start, _now())
    except TooLateToChangeError:
        await state.clear()
        await callback.answer()
        await show(message, _too_late_text(settings, lang), None)
        return
    except SlotTakenError:
        prefix = t("booking.slot_taken", lang) + "\n\n"
        view = await _reschedule_times_view(session, data, client, lang, prefix=prefix)
        await state.set_state(RescheduleFlow.time)
        await callback.answer()
        await show(message, *view)
        return
    await session.commit()
    await state.clear()
    reminders.unschedule_booking(booking.id)
    reminders.schedule_booking(new_booking)

    text = t("reschedule.done", lang, old=old_when) + "\n\n"
    text += booking_details(new_booking, service, master, settings, lang)
    await callback.answer()
    await show(message, text, None)
    await notify_admin(
        bot, reschedule_text(new_booking, old_start, client, service, master, settings)
    )


@router.callback_query(RescheduleFlow(), BookCb.filter(F.action == BookAction.BACK))
async def reschedule_back(
    callback: CallbackQuery,
    state: FSMContext,
    session: AsyncSession,
    client: Client | None,
    lang: str,
) -> None:
    message = await callback_message(callback, lang)
    if message is None:
        return
    current = await state.get_state()
    data = await state.get_data()
    if current == RescheduleFlow.day.state:
        await state.clear()
        booking, service, master = await _load_booking(session, data.get("booking", ""), client)
        view = await _card_view(session, booking, service, master, lang)
    elif current == RescheduleFlow.time.state:
        await state.set_state(RescheduleFlow.day)
        view = await _reschedule_days_view(session, data, client, lang)
    else:
        await state.set_state(RescheduleFlow.time)
        view = await _reschedule_times_view(session, data, client, lang)
    await callback.answer()
    await show(message, *view)


@router.callback_query(RescheduleFlow(), BookCb.filter(F.action == BookAction.CANCEL))
async def reschedule_cancel(callback: CallbackQuery, state: FSMContext, lang: str) -> None:
    message = await callback_message(callback, lang)
    if message is None:
        return
    await state.clear()
    await callback.answer()
    await show(message, t("reschedule.cancelled", lang), None)
