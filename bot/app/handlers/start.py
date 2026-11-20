from html import escape

from aiogram import Router
from aiogram.filters import CommandStart
from aiogram.fsm.context import FSMContext
from aiogram.types import CallbackQuery, Message
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import repo
from app.db.models import Client
from app.handlers.common import callback_message
from app.i18n import t
from app.keyboards.callbacks import LanguageCb
from app.keyboards.menu import language_keyboard, main_menu

router = Router(name="start")


@router.message(CommandStart())
async def handle_start(message: Message, state: FSMContext, client: Client | None) -> None:
    await state.clear()
    if client is None:
        await message.answer(t("start.welcome_new", "ru"), reply_markup=language_keyboard())
        return
    await message.answer(
        t("start.welcome_back", client.language, name=escape(client.name)),
        reply_markup=main_menu(client.language),
    )


@router.callback_query(LanguageCb.filter())
async def handle_language_choice(
    callback: CallbackQuery, callback_data: LanguageCb, session: AsyncSession
) -> None:
    lang = callback_data.code
    user = callback.from_user
    await repo.save_client_language(session, user.id, user.full_name, lang)
    message = await callback_message(callback, lang)
    if message is None:
        return
    await callback.answer()
    # The inline language picker is replaced by a message with the reply-keyboard menu
    await message.delete()
    await message.answer(t("start.language_saved", lang), reply_markup=main_menu(lang))
