/**
 * Free time calculation (SPEC section 5).
 *
 * The same algorithm as bot/app/services/slots.py — keep them in sync.
 * Working hours are interpreted in the salon timezone; results are UTC Dates.
 */
import { addDays, differenceInCalendarDays } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

export type WorkingDay = {
  start: string; // "HH:mm" or "HH:mm:ss"
  end: string;
  breakStart: string | null;
  breakEnd: string | null;
};

export type TimeOff = { dateFrom: string; dateTo: string }; // ISO dates, inclusive

export type BusyBooking = { start: Date; end: Date; status: string };

export type SlotRules = {
  timezone: string;
  stepMin: number;
  minLeadTimeMin: number;
  horizonDays: number;
};

type Interval = { start: number; end: number }; // epoch ms

const MINUTE = 60_000;

/** "YYYY-MM-DD" of `moment` in the salon timezone. */
export function localDate(moment: Date, timezone: string): string {
  return formatInTimeZone(moment, timezone, "yyyy-MM-dd");
}

/** Calendar days open for booking: today (salon time) and the following days. */
export function bookableDays(now: Date, rules: SlotRules): string[] {
  const today = localDate(now, rules.timezone);
  const base = new Date(`${today}T00:00:00Z`);
  return Array.from({ length: rules.horizonDays }, (_, i) =>
    addDays(base, i).toISOString().slice(0, 10),
  );
}

function atLocal(day: string, clock: string, timezone: string): number {
  const hhmm = clock.slice(0, 5);
  return fromZonedTime(`${day}T${hhmm}:00`, timezone).getTime();
}

function subtract(free: Interval[], busy: Interval): Interval[] {
  const result: Interval[] = [];
  for (const part of free) {
    if (busy.end <= part.start || busy.start >= part.end) {
      result.push(part);
      continue;
    }
    if (busy.start > part.start) result.push({ start: part.start, end: busy.start });
    if (busy.end < part.end) result.push({ start: busy.end, end: part.end });
  }
  return result;
}

/** ISO weekday of a "YYYY-MM-DD" date: 1 = Monday ... 7 = Sunday. */
export function isoWeekday(day: string): number {
  const weekday = new Date(`${day}T00:00:00Z`).getUTCDay();
  return weekday === 0 ? 7 : weekday;
}

/**
 * Start times (UTC) when a service of `durationMin` fits into one master's day.
 * Only confirmed bookings block time; other statuses are ignored.
 */
export function daySlots(
  day: string,
  durationMin: number,
  workingDay: WorkingDay | null,
  timeOff: TimeOff[],
  bookings: BusyBooking[],
  rules: SlotRules,
  now: Date,
): Date[] {
  const today = localDate(now, rules.timezone);
  const offset = differenceInCalendarDays(new Date(`${day}T00:00:00Z`), new Date(`${today}T00:00:00Z`));
  if (offset < 0 || offset >= rules.horizonDays) return [];
  if (timeOff.some((off) => off.dateFrom <= day && day <= off.dateTo)) return [];
  if (!workingDay) return [];

  const tz = rules.timezone;
  const workStart = atLocal(day, workingDay.start, tz);
  let free: Interval[] = [{ start: workStart, end: atLocal(day, workingDay.end, tz) }];
  if (workingDay.breakStart && workingDay.breakEnd) {
    free = subtract(free, {
      start: atLocal(day, workingDay.breakStart, tz),
      end: atLocal(day, workingDay.breakEnd, tz),
    });
  }
  for (const booking of bookings) {
    if (booking.status !== "confirmed") continue;
    free = subtract(free, { start: booking.start.getTime(), end: booking.end.getTime() });
  }

  const step = rules.stepMin * MINUTE;
  const duration = durationMin * MINUTE;
  const earliest = now.getTime() + rules.minLeadTimeMin * MINUTE;

  const slots: number[] = [];
  for (const interval of free) {
    // Slot starts are aligned to the step counted from the start of the working day
    let start = workStart + Math.ceil((interval.start - workStart) / step) * step;
    while (start + duration <= interval.end) {
      if (start >= earliest) slots.push(start);
      start += step;
    }
  }
  return slots.sort((a, b) => a - b).map((ms) => new Date(ms));
}

/**
 * Union of slots of several masters ("any master"). `perMaster` must be ordered by
 * masters.sort: for each time the first free master is kept. Ordered by time.
 */
export function mergeAnyMaster(perMaster: [string, Date[]][]): Map<number, string> {
  const merged = new Map<number, string>();
  for (const [masterId, slots] of perMaster) {
    for (const slot of slots) {
      if (!merged.has(slot.getTime())) merged.set(slot.getTime(), masterId);
    }
  }
  return new Map([...merged.entries()].sort((a, b) => a[0] - b[0]));
}

/** Shift a "YYYY-MM-DD" date by whole days (timezone independent). */
export function shiftDay(day: string, days: number): string {
  return addDays(new Date(`${day}T00:00:00Z`), days).toISOString().slice(0, 10);
}

/** Monday of the ISO week that contains `day` ("YYYY-MM-DD"). */
export function weekStart(day: string): string {
  return shiftDay(day, 1 - isoWeekday(day));
}
