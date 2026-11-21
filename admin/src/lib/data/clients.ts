import "server-only";

import { and, asc, count, desc, eq, ilike, lte, or, sql, type SQL } from "drizzle-orm";

import { db } from "@/db";
import { bookings, clients, masters, reviews, services } from "@/db/schema";

export const CLIENTS_PAGE_SIZE = 25;

function searchCondition(search: string): SQL | undefined {
  const text = search.trim().slice(0, 64);
  if (!text) return undefined;
  const digits = text.replace(/\D/g, "");
  return or(
    ilike(clients.name, `%${text.replace(/[%_\\]/g, "\\$&")}%`),
    digits.length >= 3
      ? sql`regexp_replace(coalesce(${clients.phone}, ''), '[^0-9]', '', 'g') like ${`%${digits}%`}`
      : undefined,
  );
}

export async function listClients(search: string, page: number) {
  const stats = db
    .select({
      clientId: bookings.clientId,
      visits: sql<number>`count(*) filter (where ${bookings.status} = 'completed')`.mapWith(Number).as("visits"),
      lastVisit: sql<Date | null>`max(${bookings.startsAt}) filter (where ${bookings.status} = 'completed')`.as("last_visit"),
      cancelled: sql<number>`count(*) filter (where ${bookings.status} = 'cancelled')`.mapWith(Number).as("cancelled"),
      noShows: sql<number>`count(*) filter (where ${bookings.status} = 'no_show')`.mapWith(Number).as("no_shows"),
    })
    .from(bookings)
    .groupBy(bookings.clientId)
    .as("stats");

  const where = searchCondition(search);
  const [rows, [total]] = await Promise.all([
    db
      .select({
        id: clients.id,
        name: clients.name,
        phone: clients.phone,
        telegramId: clients.telegramId,
        visits: sql<number>`coalesce(${stats.visits}, 0)`.mapWith(Number),
        lastVisit: stats.lastVisit,
        cancelled: sql<number>`coalesce(${stats.cancelled}, 0)`.mapWith(Number),
        noShows: sql<number>`coalesce(${stats.noShows}, 0)`.mapWith(Number),
      })
      .from(clients)
      .leftJoin(stats, eq(stats.clientId, clients.id))
      .where(where)
      .orderBy(sql`${stats.lastVisit} desc nulls last`, asc(clients.name))
      .limit(CLIENTS_PAGE_SIZE)
      .offset((page - 1) * CLIENTS_PAGE_SIZE),
    db.select({ value: count() }).from(clients).where(where),
  ]);
  return {
    rows: rows.map((row) => ({ ...row, lastVisit: row.lastVisit ? new Date(row.lastVisit) : null })),
    total: total.value,
  };
}

export async function getClientDetail(id: string) {
  const [client] = await db.select().from(clients).where(eq(clients.id, id));
  if (!client) return null;
  const history = await db
    .select({
      id: bookings.id,
      startsAt: bookings.startsAt,
      status: bookings.status,
      price: bookings.price,
      source: bookings.source,
      serviceName: services.nameRu,
      masterName: masters.nameRu,
      rating: reviews.rating,
    })
    .from(bookings)
    .innerJoin(services, eq(services.id, bookings.serviceId))
    .innerJoin(masters, eq(masters.id, bookings.masterId))
    .leftJoin(reviews, eq(reviews.bookingId, bookings.id))
    .where(eq(bookings.clientId, id))
    .orderBy(desc(bookings.startsAt));
  return { client, history };
}

// --- Reviews ---------------------------------------------------------------------------

export const REVIEWS_PAGE_SIZE = 25;
export type RatingFilter = "1" | "2" | "3" | "4" | "5" | "low";

export async function listReviews(rating: RatingFilter | undefined, page: number) {
  const where =
    rating === "low" ? lte(reviews.rating, 3) : rating ? eq(reviews.rating, Number(rating)) : undefined;
  const [rows, [total]] = await Promise.all([
    db
      .select({
        id: reviews.id,
        createdAt: reviews.createdAt,
        rating: reviews.rating,
        comment: reviews.comment,
        bookingId: reviews.bookingId,
        clientId: clients.id,
        clientName: clients.name,
        masterName: masters.nameRu,
        serviceName: services.nameRu,
      })
      .from(reviews)
      .innerJoin(clients, eq(clients.id, reviews.clientId))
      .innerJoin(masters, eq(masters.id, reviews.masterId))
      .innerJoin(bookings, eq(bookings.id, reviews.bookingId))
      .innerJoin(services, eq(services.id, bookings.serviceId))
      .where(where ? and(where) : undefined)
      .orderBy(desc(reviews.createdAt))
      .limit(REVIEWS_PAGE_SIZE)
      .offset((page - 1) * REVIEWS_PAGE_SIZE),
    db.select({ value: count() }).from(reviews).where(where),
  ]);
  return { rows, total: total.value };
}
