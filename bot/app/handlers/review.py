"""Review after a completed visit (PRD 4.5): rating 1–5 and an optional comment."""

from aiogram import Bot, F, Router
from aiogram.fsm.context import FSMContext
from aiogram.types import CallbackQuery, Message
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import repo
from app.db.models import Client, Master, Review, Service
from app.handlers.common import StaleFlowError, callback_message, show
from app.i18n import t
from app.keyboards.callbacks import ReviewCb
from app.keyboards.menu import main_menu
from app.keyboards.reminders import skip_comment_keyboard
from app.services.notify import notify_admin, review_comment_text, review_text
from app.states import ReviewFlow

router = Router(name="review")

LOW_RATING = 3
MAX_COMMENT_LENGTH = 1000


@router.callback_query(ReviewCb.filter((F.rating >= 1) & (F.rating <= 5)))
async def rate(
    callback: CallbackQuery,
    callback_data: ReviewCb,
    state: FSMContext,
    session: AsyncSession,
    client: Client | None,
    bot: Bot,
    lang: str,
) -> None:
    message = await callback_message(callback, lang)
    if message is None:
        return
    if client is None:
        raise StaleFlowError("client")
    booking = await repo.get_client_booking(session, callback_data.id, client.id)
    if booking is None or booking.status != "completed":
        raise StaleFlowError("booking")

    result = await session.execute(
        insert(Review)
        .values(
            booking_id=booking.id,
            client_id=client.id,
            master_id=booking.master_id,
            rating=callback_data.rating,
        )
        .on_conflict_do_nothing(index_elements=[Review.booking_id])
        .returning(Review.id)
    )
    if result.scalar_one_or_none() is None:
        await callback.answer(t("review.already", lang), show_alert=True)
        return
    await session.commit()

    await state.set_state(ReviewFlow.comment)
    await state.set_data({"booking": str(booking.id), "rating": callback_data.rating})
    await callback.answer()
    text = t("review.thanks", lang, rating=callback_data.rating) + "\n\n"
    text += t("review.ask_comment", lang)
    await show(message, text, skip_comment_keyboard(booking.id, lang))

    if callback_data.rating <= LOW_RATING:
        settings = await repo.get_salon_settings(session)
        service = await session.get(Service, booking.service_id)
        master = await session.get(Master, booking.master_id)
        await notify_admin(
            bot, review_text(callback_data.rating, booking, client, service, master, settings)
        )


@router.callback_query(ReviewCb.filter(F.rating == 0))
async def skip_comment(callback: CallbackQuery, state: FSMContext, lang: str) -> None:
    message = await callback_message(callback, lang)
    if message is None:
        return
    await state.clear()
    await callback.answer()
    await show(message, t("review.done", lang), None)


@router.message(ReviewFlow.comment, F.text)
async def receive_comment(
    message: Message,
    state: FSMContext,
    session: AsyncSession,
    client: Client | None,
    bot: Bot,
    lang: str,
) -> None:
    comment = (message.text or "").strip()
    if not comment:
        return
    if len(comment) > MAX_COMMENT_LENGTH:
        await message.answer(t("review.comment_too_long", lang, limit=MAX_COMMENT_LENGTH))
        return
    data = await state.get_data()
    await state.clear()
    if client is None or not data.get("booking"):
        return
    review = (
        await session.execute(
            select(Review).where(
                Review.booking_id == data["booking"], Review.client_id == client.id
            )
        )
    ).scalar_one_or_none()
    if review is None:
        return
    review.comment = comment
    await session.commit()
    await message.answer(t("review.done", lang), reply_markup=main_menu(lang))
    if review.rating <= LOW_RATING:
        await notify_admin(bot, review_comment_text(review.rating, client, comment))
