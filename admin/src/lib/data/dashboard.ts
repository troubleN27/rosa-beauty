import "server-only";

import { and, asc, eq, gte, lt, ne, sql } from "drizzle-orm";

import { db } from "@/db";
import { bookings, clients, masters, reviews, services } from "@/db/schema";
import { dayBounds } from "@/lib/availability";
import type { SalonSettings } from "@/lib/data/settings";
import { localDate, shiftDay, weekStart } from "@/lib/slots";

const CHART_DAYS = 14;

export async function getDashboard(settings: SalonSettings, now = new Date()) {
  const tz = settings.timezone;
  const today = localDate(now, tz);
  const todayRange = dayBounds(today, tz);
  const weekStartDay = weekStart(today);
  const weekFrom = dayBounds(weekStartDay, tz).start;
  const weekEnd = dayBounds(shiftDay(weekStartDay, 6), tz).end;
  const chartFrom = shiftDay(today, -(CHART_DAYS - 1));
  const chartStart = dayBounds(chartFrom, tz).start;

  const inWeek = and(gte(bookings.startsAt, weekFrom), lt(bookings.startsAt, weekEnd));
  const localDay = sql<string>`to_char(${bookings.startsAt} at time zone ${tz}, 'YYYY-MM-DD')`;

  const [todayList, [week], [rating], perDay] = await Promise.all([
    db
      .select({
        id: bookings.id,
        startsAt: bookings.startsAt,
        endsAt: bookings.endsAt,
        status: bookings.status,
        clientName: clients.name,
        clientPhone: clients.phone,
        serviceName: services.nameRu,
        masterName: masters.nameRu,
      })
      .from(bookings)
      .innerJoin(clients, eq(clients.id, bookings.clientId))
      .innerJoin(services, eq(services.id, bookings.serviceId))
      .innerJoin(masters, eq(masters.id, bookings.masterId))
      .where(
        and(
          gte(bookings.startsAt, todayRange.start),
          lt(bookings.startsAt, todayRange.end),
          ne(bookings.status, "cancelled"),
        ),
      )
      .orderBy(asc(bookings.startsAt)),
    db
      .select({
        total: sql<number>`count(*) filter (where ${bookings.status} <> 'cancelled')`.mapWith(Number),
        revenue: sql<string>`coalesce(sum(${bookings.price}) filter (where ${bookings.status} = 'completed'), 0)`,
        cancelled: sql<number>`count(*) filter (where ${bookings.status} = 'cancelled')`.mapWith(Number),
        noShow: sql<number>`count(*) filter (where ${bookings.status} = 'no_show')`.mapWith(Number),
      })
      .from(bookings)
      .where(inWeek),
    db
      .select({
        average: sql<string | null>`round(avg(${reviews.rating}), 1)`,
        count: sql<number>`count(*)`.mapWith(Number),
      })
      .from(reviews)
      .where(and(gte(reviews.createdAt, weekFrom), lt(reviews.createdAt, weekEnd))),
    db
      .select({ day: localDay, count: sql<number>`count(*)`.mapWith(Number) })
      .from(bookings)
      .where(
        and(
          gte(bookings.startsAt, chartStart),
          lt(bookings.startsAt, todayRange.end),
          ne(bookings.status, "cancelled"),
        ),
      )
      // by position: the timezone is a bind parameter, so the expression can't be repeated
      .groupBy(sql`1`),
  ]);

  const counts = new Map(perDay.map((row) => [row.day, row.count]));
  const chart = Array.from({ length: CHART_DAYS }, (_, i) => {
    const day = shiftDay(chartFrom, i);
    return { day, count: counts.get(day) ?? 0 };
  });

  return {
    today,
    todayList,
    todayCount: todayList.length,
    week: {
      start: weekStartDay,
      end: shiftDay(weekStartDay, 6),
      total: week.total,
      revenue: week.revenue,
      cancelled: week.cancelled,
      noShow: week.noShow,
    },
    rating: { average: rating.average === null ? null : Number(rating.average), count: rating.count },
    chart,
  };
}
