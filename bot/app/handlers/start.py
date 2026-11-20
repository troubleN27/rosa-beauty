from aiogram import Router
from aiogram.filters import CommandStart
from aiogram.types import Message

router = Router(name="start")


@router.message(CommandStart())
async def handle_start(message: Message) -> None:
    await message.answer(
        "Привет! 🌸 Это Rosa Beauty.\nЗдесь можно записаться к нашим мастерам за пару минут."
    )
