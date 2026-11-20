import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  date,
  doublePrecision,
  index,
  integer,
  numeric,
  pgTable,
  primaryKey,
  text,
  time,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

export * from "./auth-schema";

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

// Salon settings: always a single row with id = 1
export const settings = pgTable(
  "settings",
  {
    id: integer("id").primaryKey().default(1),
    name: text("name").notNull(),
    addressRu: text("address_ru"),
    addressEn: text("address_en"),
    phone: text("phone"),
    instagram: text("instagram"),
    hoursRu: text("hours_ru"),
    hoursEn: text("hours_en"),
    latitude: doublePrecision("latitude"),
    longitude: doublePrecision("longitude"),
    timezone: text("timezone").notNull().default("Europe/Moscow"),
    currency: text("currency").notNull().default("USD"),
    slotStepMin: integer("slot_step_min").notNull().default(15),
    minLeadTimeMin: integer("min_lead_time_min").notNull().default(60),
    cancelDeadlineHours: integer("cancel_deadline_hours").notNull().default(3),
    bookingHorizonDays: integer("booking_horizon_days").notNull().default(14),
    remindersEnabled: boolean("reminders_enabled").notNull().default(true),
    reviewsEnabled: boolean("reviews_enabled").notNull().default(true),
  },
  (t) => [
    check("settings_single_row", sql`${t.id} = 1`),
    check("settings_slot_step_positive", sql`${t.slotStepMin} > 0`),
    check("settings_min_lead_time_non_negative", sql`${t.minLeadTimeMin} >= 0`),
    check("settings_cancel_deadline_non_negative", sql`${t.cancelDeadlineHours} >= 0`),
    check("settings_booking_horizon_positive", sql`${t.bookingHorizonDays} > 0`),
  ],
);

export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  nameRu: text("name_ru").notNull(),
  nameEn: text("name_en").notNull(),
  sort: integer("sort").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
});

export const services = pgTable(
  "services",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    nameRu: text("name_ru").notNull(),
    nameEn: text("name_en").notNull(),
    descriptionRu: text("description_ru"),
    descriptionEn: text("description_en"),
    durationMin: integer("duration_min").notNull(),
    price: numeric("price", { precision: 10, scale: 2 }).notNull(),
    sort: integer("sort").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: createdAt(),
  },
  (t) => [
    check("services_duration_positive", sql`${t.durationMin} > 0`),
    check("services_price_non_negative", sql`${t.price} >= 0`),
    index("services_category_idx").on(t.categoryId),
  ],
);

export const masters = pgTable(
  "masters",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    nameRu: text("name_ru").notNull(),
    nameEn: text("name_en").notNull(),
    specialtyRu: text("specialty_ru"),
    specialtyEn: text("specialty_en"),
    experienceYears: integer("experience_years"),
    photoUrl: text("photo_url"),
    sort: integer("sort").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: createdAt(),
  },
  (t) => [check("masters_experience_non_negative", sql`${t.experienceYears} >= 0`)],
);

export const masterServices = pgTable(
  "master_services",
  {
    masterId: uuid("master_id")
      .notNull()
      .references(() => masters.id, { onDelete: "cascade" }),
    serviceId: uuid("service_id")
      .notNull()
      .references(() => services.id, { onDelete: "cascade" }),
  },
  (t) => [
    primaryKey({ columns: [t.masterId, t.serviceId] }),
    index("master_services_service_idx").on(t.serviceId),
  ],
);

// Weekly schedule; weekday 1 = Monday ... 7 = Sunday (ISO)
export const workingHours = pgTable(
  "working_hours",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    masterId: uuid("master_id")
      .notNull()
      .references(() => masters.id, { onDelete: "cascade" }),
    weekday: integer("weekday").notNull(),
    startTime: time("start_time").notNull(),
    endTime: time("end_time").notNull(),
    breakStart: time("break_start"),
    breakEnd: time("break_end"),
  },
  (t) => [
    unique("working_hours_master_weekday_unique").on(t.masterId, t.weekday),
    check("working_hours_weekday_range", sql`${t.weekday} between 1 and 7`),
    check("working_hours_end_after_start", sql`${t.endTime} > ${t.startTime}`),
    check(
      "working_hours_break_valid",
      sql`(${t.breakStart} is null and ${t.breakEnd} is null) or (${t.breakStart} is not null and ${t.breakEnd} is not null and ${t.breakEnd} > ${t.breakStart} and ${t.breakStart} >= ${t.startTime} and ${t.breakEnd} <= ${t.endTime})`,
    ),
  ],
);

// Days off and vacations (inclusive date range)
export const timeOff = pgTable(
  "time_off",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    masterId: uuid("master_id")
      .notNull()
      .references(() => masters.id, { onDelete: "cascade" }),
    dateFrom: date("date_from").notNull(),
    dateTo: date("date_to").notNull(),
    reason: text("reason"),
  },
  (t) => [
    check("time_off_range_valid", sql`${t.dateTo} >= ${t.dateFrom}`),
    index("time_off_master_idx").on(t.masterId, t.dateFrom),
  ],
);

export const clients = pgTable(
  "clients",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // null for clients booked manually without Telegram
    telegramId: bigint("telegram_id", { mode: "number" }).unique(),
    name: text("name").notNull(),
    phone: text("phone"),
    language: text("language").notNull().default("ru"),
    createdAt: createdAt(),
  },
  (t) => [
    check("clients_language_valid", sql`${t.language} in ('ru', 'en')`),
    index("clients_phone_idx").on(t.phone),
  ],
);

export const bookings = pgTable(
  "bookings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "restrict" }),
    masterId: uuid("master_id")
      .notNull()
      .references(() => masters.id, { onDelete: "restrict" }),
    serviceId: uuid("service_id")
      .notNull()
      .references(() => services.id, { onDelete: "restrict" }),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    // price at the moment of booking
    price: numeric("price", { precision: 10, scale: 2 }).notNull(),
    status: text("status").notNull(),
    source: text("source").notNull(),
    comment: text("comment"),
    reminder24hSentAt: timestamp("reminder_24h_sent_at", { withTimezone: true }),
    reminder2hSentAt: timestamp("reminder_2h_sent_at", { withTimezone: true }),
    reviewRequestedAt: timestamp("review_requested_at", { withTimezone: true }),
    cancelledBy: text("cancelled_by"),
    createdAt: createdAt(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    check(
      "bookings_status_valid",
      sql`${t.status} in ('confirmed', 'completed', 'cancelled', 'no_show')`,
    ),
    check("bookings_source_valid", sql`${t.source} in ('bot', 'admin')`),
    check(
      "bookings_cancelled_by_valid",
      sql`${t.cancelledBy} is null or ${t.cancelledBy} in ('client', 'admin')`,
    ),
    check("bookings_ends_after_starts", sql`${t.endsAt} > ${t.startsAt}`),
    check("bookings_price_non_negative", sql`${t.price} >= 0`),
    index("bookings_master_starts_idx").on(t.masterId, t.startsAt),
    index("bookings_client_idx").on(t.clientId),
    index("bookings_starts_idx").on(t.startsAt),
  ],
);

export const bookingStatusHistory = pgTable(
  "booking_status_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bookingId: uuid("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    oldStatus: text("old_status"),
    newStatus: text("new_status").notNull(),
    changedBy: text("changed_by").notNull(),
    changedAt: timestamp("changed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("booking_status_history_booking_idx").on(t.bookingId, t.changedAt)],
);

export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bookingId: uuid("booking_id")
      .notNull()
      .unique()
      .references(() => bookings.id, { onDelete: "cascade" }),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    masterId: uuid("master_id")
      .notNull()
      .references(() => masters.id, { onDelete: "restrict" }),
    rating: integer("rating").notNull(),
    comment: text("comment"),
    createdAt: createdAt(),
  },
  (t) => [
    check("reviews_rating_range", sql`${t.rating} between 1 and 5`),
    index("reviews_master_idx").on(t.masterId),
  ],
);
