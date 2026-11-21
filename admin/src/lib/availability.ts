import "server-only";

import { addDays } from "date-fns";
import { fromZonedTime } from "date-fns-tz";
import { and, eq, gt, gte, inArray, lt, lte, ne } from "drizzle-orm";

import { db } from "@/db";
import { bookings, timeOff, workingHours } from "@/db/schema";
import type { SalonSettings } from "@/lib/data/settings";
import {
  daySlots,
  isoWeekday,
  mergeAnyMaster,
  type BusyBooking,
  type SlotRules,
  type TimeOff,
  type WorkingDay,
} from "@/lib/slots";

/** Drizzle database or transaction — anything that can run selects. */
export type DbExecutor = Pick<typeof db, "select">;

/** Admin rules: same schedule checks as the bot, but no minimum lead time and a 1-year horizon. */
export function adminRules(settings: SalonSettings): SlotRules {
  return {
    timezone: settings.timezone,
    stepMin: settings.slotStepMin,
    minLeadTimeMin: 0,
    horizonDays: 365,
  };
}

/** UTC bounds of a salon-local calendar day. */
export function dayBounds(day: string, timezone: string): { start: Date; end: Date } {
  const start = fromZonedTime(`${day}T00:00:00`, timezone);
  const next = addDays(new Date(`${day}T00:00:00Z`), 1).toISOString().slice(0, 10);
  return { start, end: fromZonedTime(`${next}T00:00:00`, timezone) };
}

type Schedule = { working: Map<number, WorkingDay>; timeOff: TimeOff[]; bookings: BusyBooking[] };

async function loadSchedules(
  executor: DbExecutor,
  masterIds: string[],
  day: string,
  timezone: string,
  excludeBookingId?: string,
): Promise<Map<string, Schedule>> {
  const schedules = new Map<string, Schedule>(
    masterIds.map((id) => [id, { working: new Map(), timeOff: [], bookings: [] }]),
  );
  if (masterIds.length === 0) return schedules;
  const { start, end } = dayBounds(day, timezone);

  const [hours, offs, busy] = await Promise.all([
    executor.select().from(workingHours).where(inArray(workingHours.masterId, masterIds)),
    executor
      .select()
      .from(timeOff)
      .where(
        and(inArray(timeOff.masterId, masterIds), lte(timeOff.dateFrom, day), gte(timeOff.dateTo, day)),
      ),
    executor
      .select()
      .from(bookings)
      .where(
        and(
          inArray(bookings.masterId, masterIds),
          eq(bookings.status, "confirmed"),
          lt(bookings.startsAt, end),
          gt(bookings.endsAt, start),
          excludeBookingId ? ne(bookings.id, excludeBookingId) : undefined,
        ),
      ),
  ]);
  for (const row of hours) {
    schedules.get(row.masterId)?.working.set(row.weekday, {
      start: row.startTime,
      end: row.endTime,
      breakStart: row.breakStart,
      breakEnd: row.breakEnd,
    });
  }
  for (const row of offs) {
    schedules.get(row.masterId)?.timeOff.push({ dateFrom: row.dateFrom, dateTo: row.dateTo });
  }
  for (const row of busy) {
    schedules.get(row.masterId)?.bookings.push({ start: row.startsAt, end: row.endsAt, status: row.status });
  }
  return schedules;
}

/**
 * Free start times on `day` (salon date "YYYY-MM-DD"); for each time — the first free
 * master in `masterIds` order. `excludeBookingId`: a booking being rescheduled does not
 * block its own time.
 */
export async function freeSlots(
  executor: DbExecutor,
  settings: SalonSettings,
  masterIds: string[],
  durationMin: number,
  day: string,
  excludeBookingId?: string,
  now: Date = new Date(),
): Promise<Map<number, string>> {
  const rules = adminRules(settings);
  const schedules = await loadSchedules(executor, masterIds, day, rules.timezone, excludeBookingId);
  const weekday = isoWeekday(day);
  const perMaster: [string, Date[]][] = masterIds.map((id) => {
    const schedule = schedules.get(id)!;
    return [
      id,
      daySlots(day, durationMin, schedule.working.get(weekday) ?? null, schedule.timeOff, schedule.bookings, rules, now),
    ];
  });
  return mergeAnyMaster(perMaster);
}
