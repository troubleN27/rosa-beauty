"""Slash commands from the Telegram menu: each opens the same section as its menu button.

This router runs before the booking flow, so a command typed while the bot waits for a
name or a review comment is taken as a command, not as that text.
"""

from aiogram import Router
from aiogram.filters import Command
from aiogram.fsm.context import FSMContext
from aiogram.types import Message
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Client
from app.handlers import booking, info, menu, my_bookings

router = Router(name="commands")


@router.message(Command("menu"))
async def cmd_menu(message: Message, state: FSMContext, client: Client | None, lang: str) -> None:
    await state.clear()
    await menu.show_main_menu(message, client, lang)


@router.message(Command("book"))
async def cmd_book(
    message: Message, state: FSMContext, session: AsyncSession, client: Client | None, lang: str
) -> None:
    await booking.start_booking(message, state, session, client, lang)


@router.message(Command("my"))
async def cmd_my(
    message: Message, state: FSMContext, session: AsyncSession, client: Client | None, lang: str
) -> None:
    await my_bookings.my_bookings(message, state, session, client, lang)


@router.message(Command("services"))
async def cmd_services(
    message: Message, state: FSMContext, session: AsyncSession, lang: str
) -> None:
    await state.clear()
    await info.handle_services(message, session, lang)


@router.message(Command("masters"))
async def cmd_masters(
    message: Message, state: FSMContext, session: AsyncSession, lang: str
) -> None:
    await state.clear()
    await info.handle_masters(message, session, lang)


@router.message(Command("contacts"))
async def cmd_contacts(
    message: Message, state: FSMContext, session: AsyncSession, lang: str
) -> None:
    await state.clear()
    await info.handle_contacts(message, session, lang)


@router.message(Command("language"))
async def cmd_language(message: Message, state: FSMContext, lang: str) -> None:
    await state.clear()
    await menu.handle_language_menu(message, lang)
