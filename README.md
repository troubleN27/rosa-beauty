# Rosa Beauty

Онлайн-запись в салон красоты Rosa Beauty: Telegram-бот для клиентов и веб-панель для администратора.

- **Telegram-бот** — клиент выбирает услугу, мастера, дату и свободное время и записывается за пару минут; смотрит, переносит и отменяет свои записи, получает напоминания.
- **Панель администратора** — записи, расписание мастеров, услуги, клиенты, отзывы и настройки салона.
- **Уведомления** — администратор получает в Telegram новые записи, отмены и переносы.

## Стек

| Часть | Технологии |
|---|---|
| База данных | Neon (PostgreSQL), миграции — Drizzle Kit (`db/migrations`) |
| Бот | Python 3.12, aiogram 3, SQLAlchemy 2 (async) + asyncpg, APScheduler, pydantic-settings, uv |
| Панель | Next.js (App Router, TypeScript), Tailwind CSS, shadcn/ui, Drizzle ORM, Better Auth |
| Хостинг | Панель — Vercel, бот — Railway, база — Neon |

## Структура

```
db/          SQL-миграции и стартовые данные (seed.sql)
admin/       панель администратора (Next.js)
bot/         Telegram-бот (Python)
docs/        требования и техническая спецификация
```

## Требования

- Node.js 20+ и npm
- Python 3.12 и [uv](https://docs.astral.sh/uv/)
- Аккаунт [Neon](https://neon.tech) и бот, созданный через [@BotFather](https://t.me/BotFather)

## 1. База данных Neon

1. Создайте проект в Neon (регион — ближе к серверу бота, например AWS Frankfurt).
2. Для разработки создайте ветку `dev`; рабочая система использует ветку `main`.
3. В настройках compute выберите размер **0.25 CU** и оставьте автоматическое «засыпание» включённым.
4. На вкладке **Connect** скопируйте две строки подключения:
   - **pooled** (адрес хоста с `-pooler`) — для панели;
   - **direct** (без `-pooler`) — для бота.

## 2. Панель администратора

```powershell
cd admin
npm install
Copy-Item .env.example .env
```

Заполните `admin/.env`:

| Переменная | Значение |
|---|---|
| `DATABASE_URL` | pooled-строка Neon |
| `BETTER_AUTH_SECRET` | случайная строка от 32 символов |
| `BETTER_AUTH_URL` | адрес панели, локально `http://localhost:3000` |
| `BLOB_READ_WRITE_TOKEN` | токен Vercel Blob (фото мастеров) |
| `TELEGRAM_BOT_TOKEN` | токен бота (сообщения клиентам от администратора) |

Примените миграции и стартовые данные, затем запустите панель:

```powershell
npm run db:migrate
npm run db:seed
npm run dev
```

Панель откроется на http://localhost:3000.

Изменение схемы: правка `admin/src/db/schema.ts` → `npm run db:generate` → `npm run db:migrate`.

## 3. Telegram-бот

```powershell
cd bot
uv sync
Copy-Item .env.example .env
```

Заполните `bot/.env`:

| Переменная | Значение |
|---|---|
| `BOT_TOKEN` | токен от @BotFather |
| `ADMIN_CHAT_ID` | id чата администратора для уведомлений |
| `DATABASE_URL` | direct-строка Neon в формате `postgresql+asyncpg://user:password@host/neondb` (SSL включается автоматически) |
| `LOG_LEVEL` | уровень логов, по умолчанию `INFO` |

Запуск:

```powershell
uv run python -m app.main
```

Проверки:

```powershell
uv run ruff check
uv run pytest
```

## Деплой

- **Бот → Railway:** деплой из GitHub, Root Directory `bot`, сборка по `pyproject.toml` и `uv.lock`, команда запуска — из `bot/railway.json`, переменные из таблицы выше.
- **Панель → Vercel:** Root Directory `admin`, переменные из таблицы выше, подключить хранилище Vercel Blob.
