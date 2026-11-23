# Rosa Beauty

Онлайн-запись в салон красоты Rosa Beauty: Telegram-бот для клиентов и веб-панель для администратора салона.

> **Концепт-проект.** Салон Rosa Beauty, его мастера, услуги и цены придуманы. Проект показывает полный цикл разработки сервиса записи: от требований и схемы базы данных до бота, панели администратора и деплоя.

- Бот: [@rosabeauty_booking_bot](https://t.me/rosabeauty_booking_bot)
- Панель администратора: [rosa-beauty-admin.vercel.app](https://rosa-beauty-admin.vercel.app) (вход только для администраторов)

## Возможности

**Telegram-бот** (русский и английский):
- запись за пару минут: категория → услуга → мастер или «Любой мастер» → дата → свободное время → контакты → подтверждение;
- в календаре показаны только дни, когда есть свободное время; время учитывает график мастера, перерывы, выходные и уже существующие записи;
- «Мои записи»: отмена и перенос не позднее чем за N часов до визита (N задаётся в настройках);
- напоминания за 24 и за 2 часа с кнопками «Приду» / «Отменить»;
- после выполненного визита — просьба оценить его от 1 до 5 и оставить комментарий;
- разделы «Услуги и цены», «Мастера» (с фото), «Контакты» (с точкой на карте);
- меню внизу экрана, кнопки «Назад» и «Закрыть» во всех разделах;
- команды в меню Telegram: `/menu`, `/book`, `/my`, `/services`, `/masters`, `/contacts`, `/language`.

**Панель администратора** (русский и английский, переключатель в меню и на странице входа):
- главная: записи на сегодня, показатели недели, график записей по дням;
- расписание по мастерам (день и неделя), записи с фильтрами, карточка записи со сменой статуса, переносом и отменой (клиент получает сообщение в Telegram), ручная запись для клиентов, которые позвонили или пришли сами;
- услуги и категории, мастера (данные, фото, услуги, график, выходные), клиенты, отзывы, настройки салона;
- светлая и тёмная темы, адаптивная вёрстка: основные действия работают с телефона.

**Уведомления администратору в Telegram:** новая запись, отмена, перенос, отзыв с оценкой 3 и ниже.

Двойная запись к одному мастеру на одно время невозможна: это гарантирует ограничение в базе данных, даже при одновременных запросах.

## Стек

| Часть | Технологии |
|---|---|
| База данных | Neon (PostgreSQL); схема и миграции — Drizzle Kit (`db/migrations`) |
| Бот | Python 3.12, aiogram 3, SQLAlchemy 2 (async) + asyncpg, APScheduler, pydantic-settings, uv |
| Панель | Next.js (App Router, TypeScript), Tailwind CSS, shadcn/ui, Drizzle ORM, Better Auth, Vercel Blob |
| Хостинг | Панель — Vercel, бот — Railway, база — Neon |

## Структура

```
db/          SQL-миграции (единственный источник правды о схеме) и стартовые данные seed.sql
admin/       панель администратора (Next.js)
bot/         Telegram-бот (Python)
docs/        требования (PRD), техническая спецификация (SPEC) и оформление бота для BotFather
```

## Требования

- Node.js 20+ и npm
- Python 3.12 и [uv](https://docs.astral.sh/uv/)
- Аккаунты [Neon](https://neon.tech), [Vercel](https://vercel.com), [Railway](https://railway.com)
- Бот, созданный через [@BotFather](https://t.me/BotFather)

## Переменные окружения

Секреты хранятся только в `.env` (файлы не попадают в git) и в настройках Vercel/Railway. Шаблоны — `admin/.env.example` и `bot/.env.example`.

**Бот** (`bot/.env`, Railway → Variables):

| Переменная | Значение |
|---|---|
| `BOT_TOKEN` | токен бота от @BotFather |
| `ADMIN_CHAT_ID` | id чата администратора для уведомлений (см. «Как узнать ADMIN_CHAT_ID») |
| `DATABASE_URL` | **прямая** (direct, без `-pooler`) строка Neon в формате `postgresql+asyncpg://user:password@host/neondb`; параметры `sslmode` и `channel_binding` можно не указывать — SSL включается автоматически |
| `LOG_LEVEL` | `INFO` (по умолчанию) или `DEBUG` |

**Панель** (`admin/.env`, Vercel → Settings → Environment Variables):

| Переменная | Значение |
|---|---|
| `DATABASE_URL` | **pooled**-строка Neon (адрес хоста с `-pooler`) |
| `BETTER_AUTH_SECRET` | случайная строка от 32 символов, например результат `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | адрес панели: локально `http://localhost:3000`, в работе — адрес на Vercel или свой домен |
| `BLOB_READ_WRITE_TOKEN` | токен хранилища Vercel Blob для фото мастеров (на Vercel добавляется автоматически при подключении хранилища) |
| `TELEGRAM_BOT_TOKEN` | тот же токен бота — панель отправляет клиентам сообщения об отмене и переносе |

### Как узнать ADMIN_CHAT_ID

1. Напишите своему боту любое сообщение (или добавьте бота в чат администраторов и напишите там).
2. Откройте в браузере `https://api.telegram.org/bot<BOT_TOKEN>/getUpdates` и найдите `"chat":{"id": …}`. Для группы id начинается с минуса.

## Локальный запуск

### 1. База данных Neon

1. Создайте проект в Neon (регион — рядом с ботом, например AWS Frankfurt).
2. Создайте ветку `dev` для разработки; рабочая система использует ветку `main`.
3. В настройках compute выберите **0.25 CU** и оставьте автоматическое «засыпание» включённым.
4. На вкладке **Connect** скопируйте две строки ветки `dev`: pooled — для панели, direct — для бота.

### 2. Панель администратора

```powershell
cd admin
npm install
Copy-Item .env.example .env
```

Заполните `admin/.env`, затем примените миграции, стартовые данные и создайте администратора:

```powershell
npm run db:migrate
npm run db:seed
npm run create-admin -- --email owner@example.com --password "надёжный-пароль"
npm run dev
```

Панель откроется на http://localhost:3000. Регистрации нет — каждого администратора создаёт команда `create-admin` (пароль от 8 символов).

Изменение схемы: правка `admin/src/db/schema.ts` → `npm run db:generate` → `npm run db:migrate`. То, что Drizzle не умеет описать (например, ограничение `bookings_no_overlap`), добавляется ручной миграцией `npx drizzle-kit generate --custom --name=<имя>`.

### 3. Telegram-бот

```powershell
cd bot
uv sync
Copy-Item .env.example .env
uv run python -m app.main
```

Одновременно должен работать только один экземпляр бота с этим токеном (long polling). Если бот запущен на Railway, локально запускайте бота с другим токеном.

### Проверки

```powershell
cd bot; uv run ruff check; uv run pytest
```

```powershell
cd admin; npm run lint; npm run build
```

## Деплой

### Neon (рабочая база)

1. В проекте Neon откройте ветку `main` → **Connect** и скопируйте pooled- и direct-строки.
2. Примените схему и стартовые данные к `main` (временно укажите pooled-строку `main` в `admin/.env` или передайте её через переменную окружения):

   ```powershell
   cd admin
   $env:DATABASE_URL = "<pooled-строка ветки main>"
   npm run db:migrate
   npm run db:seed
   npm run create-admin -- --email owner@example.com --password "надёжный-пароль"
   Remove-Item Env:DATABASE_URL
   ```

3. Проверьте compute ветки `main`: **0.25 CU**, автоматическое «засыпание» включено. Бот обращается к базе только при действиях клиентов и раз в 30 минут для синхронизации напоминаний, поэтому база успевает засыпать и бесплатного лимита хватает на месяц.
4. Отредактируйте адрес, телефон, часы работы и координаты салона в панели: «Настройки».

### Бот → Railway

1. Загрузите репозиторий на GitHub (файлы `.env` в git не попадают).
2. В Railway: **New Project → Deploy from GitHub repo** → выберите репозиторий.
3. В настройках сервиса: **Root Directory** = `bot`. Railway соберёт проект сам (Railpack: Python из `.python-version`, зависимости из `uv.lock`, Docker не нужен).
4. **Settings → Deploy:** Start Command = `python -m app.main`, Restart Policy = On Failure (10 попыток). Настройки хранятся в самом сервисе Railway — файла `railway.json` в проекте нет.
5. **Variables:** `BOT_TOKEN`, `ADMIN_CHAT_ID`, `DATABASE_URL` (direct-строка ветки `main` в формате `postgresql+asyncpg://…`), `LOG_LEVEL=INFO`.
6. **Region:** EU West (Amsterdam) — рядом с Neon во Франкфурте, так ответы бота быстрее.
7. Домен и порт не нужны — бот работает через long polling. В логах после старта должны быть строки `Database connection is ready` и `Scheduler sync: …`.

### Панель → Vercel

1. **Add New → Project** → импортируйте тот же репозиторий.
2. **Root Directory** = `admin`, Framework — Next.js (определится автоматически).
3. **Environment Variables:** `DATABASE_URL` (pooled-строка `main`), `BETTER_AUTH_SECRET` (новая случайная строка, не локальная), `BETTER_AUTH_URL` (адрес проекта на Vercel, например `https://rosa-beauty-admin.vercel.app`), `TELEGRAM_BOT_TOKEN`.
4. **Storage → Blob:** подключите хранилище `rosa-beauty-photos` (или создайте новое) к проекту — Vercel сам добавит `BLOB_READ_WRITE_TOKEN`.
5. Нажмите **Deploy**. Если адрес проекта изменится (свой домен), обновите `BETTER_AUTH_URL` и сделайте Redeploy.

### Оформление бота в BotFather

Аватар, картинка 640×360 для экрана «Что умеет этот бот?», тексты описания и «О боте» на русском и английском лежат в [docs/botfather](docs/botfather). Пошаговая инструкция — в [docs/botfather/texts.md](docs/botfather/texts.md). Команды бот выставляет сам при запуске.
