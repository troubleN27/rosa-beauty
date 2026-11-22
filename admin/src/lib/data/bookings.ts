import "server-only";

import { and, asc, count, desc, eq, gte, inArray, lt, lte, ne, type SQL } from "drizzle-orm";

import { db } from "@/db";
import {
  bookingStatusHistory,
  bookings,
  categories,
  clients,
  masters,
  services,
  timeOff,
  workingHours,
} from "@/db/schema";
import { dayBounds } from "@/lib/availability";
import type { BookingSource, BookingStatus } from "@/lib/constants";

const bookingColumns = {
  id: bookings.id,
  startsAt: bookings.startsAt,
  endsAt: bookings.endsAt,
  status: bookings.status,
  source: bookings.source,
  price: bookings.price,
  comment: bookings.comment,
  createdAt: bookings.createdAt,
  masterId: bookings.masterId,
  serviceId: bookings.serviceId,
  clientId: clients.id,
  clientName: clients.name,
  clientPhone: clients.phone,
  clientTelegramId: clients.telegramId,
  serviceName: services.nameRu,
  serviceNameEn: services.nameEn,
  serviceDuration: services.durationMin,
  masterName: masters.nameRu,
  masterNameEn: masters.nameEn,
  categoryName: categories.nameRu,
  categoryNameEn: categories.nameEn,
};

function bookingsQuery() {
  return db
    .select(bookingColumns)
    .from(bookings)
    .innerJoin(clients, eq(clients.id, bookings.clientId))
    .innerJoin(services, eq(services.id, bookings.serviceId))
    .innerJoin(categories, eq(categories.id, services.categoryId))
    .innerJoin(masters, eq(masters.id, bookings.masterId));
}

export type BookingRow = Awaited<ReturnType<typeof bookingsQuery>>[number];

// --- Card -----------------------------------------------------------------------------

export async function getBookingDetails(id: string) {
  const [booking] = await bookingsQuery().where(eq(bookings.id, id));
  if (!booking) return null;
  const history = await db
    .select()
    .from(bookingStatusHistory)
    .where(eq(bookingStatusHistory.bookingId, id))
    .orderBy(asc(bookingStatusHistory.changedAt));
  return { booking, history };
}

// --- Table ------------------------------------------------------------------------------

export const PAGE_SIZE = 20;

export type BookingFilters = {
  from?: string; // salon-local dates, inclusive
  to?: string;
  masterId?: string;
  status?: BookingStatus;
  source?: BookingSource;
  sort: "starts_asc" | "starts_desc" | "created_desc";
  page: number;
};

export async function listBookings(filters: BookingFilters, timezone: string) {
  const conditions: SQL[] = [];
  if (filters.from) conditions.push(gte(bookings.startsAt, dayBounds(filters.from, timezone).start));
  if (filters.to) conditions.push(lt(bookings.startsAt, dayBounds(filters.to, timezone).end));
  if (filters.masterId) conditions.push(eq(bookings.masterId, filters.masterId));
  if (filters.status) conditions.push(eq(bookings.status, filters.status));
  if (filters.source) conditions.push(eq(bookings.source, filters.source));
  const where = conditions.length ? and(...conditions) : undefined;

  const order =
    filters.sort === "starts_asc"
      ? asc(bookings.startsAt)
      : filters.sort === "created_desc"
        ? desc(bookings.createdAt)
        : desc(bookings.startsAt);

  const [rows, [total]] = await Promise.all([
    bookingsQuery()
      .where(where)
      .orderBy(order, asc(bookings.id))
      .limit(PAGE_SIZE)
      .offset((filters.page - 1) * PAGE_SIZE),
    db.select({ value: count() }).from(bookings).where(where),
  ]);
  return { rows, total: total.value };
}

export async function listMastersForFilter() {
  return db
    .select({ id: masters.id, name: masters.nameRu, nameEn: masters.nameEn, isActive: masters.isActive })
    .from(masters)
    .orderBy(asc(masters.sort), asc(masters.nameRu));
}

// --- Schedule ----------------------------------------------------------------------------

export async function getScheduleData(days: string[], masterIds: string[], timezone: string) {
  const start = dayBounds(days[0], timezone).start;
  const end = dayBounds(days[days.length - 1], timezone).end;
  if (masterIds.length === 0) return { bookings: [], hours: [], offs: [] };
  const [rows, hours, offs] = await Promise.all([
    bookingsQuery().where(
      and(
        inArray(bookings.masterId, masterIds),
        gte(bookings.startsAt, start),
        lt(bookings.startsAt, end),
        ne(bookings.status, "cancelled"),
      ),
    ),
    db.select().from(workingHours).where(inArray(workingHours.masterId, masterIds)),
    db
      .select()
      .from(timeOff)
      .where(
        and(
          inArray(timeOff.masterId, masterIds),
          lte(timeOff.dateFrom, days[days.length - 1]),
          gte(timeOff.dateTo, days[0]),
        ),
      ),
  ]);
  return { bookings: rows, hours, offs };
}
