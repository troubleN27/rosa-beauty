import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { formatInTimeZone } from "date-fns-tz";
import type { Metadata } from "next";
import { z } from "zod";

import { BookingCard } from "@/components/bookings/booking-card";
import { PageHeader } from "@/components/layout/page-header";
import { BookingSheet } from "@/components/schedule/booking-sheet";
import { ScheduleGrid, type GridBooking, type GridColumn } from "@/components/schedule/schedule-grid";
import { ScheduleToolbar } from "@/components/schedule/schedule-toolbar";
import { getBookingDetails, getScheduleData, listMastersForFilter } from "@/lib/data/bookings";
import { getSalonSettings } from "@/lib/data/settings";
import { requireSession } from "@/lib/session";
import { isoWeekday, localDate, shiftDay as shift, weekStart } from "@/lib/slots";

export const metadata: Metadata = { title: "Расписание" };

const paramsSchema = z.object({
  view: z.enum(["day", "week"]).catch("day"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().catch(undefined),
  master: z.uuid().optional().catch(undefined),
  booking: z.uuid().optional().catch(undefined),
});

function toMinutes(clock: string) {
  const [h, m] = clock.split(":").map(Number);
  return h * 60 + m;
}

function monogram(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join("");
}

/** Share of the shift taken by bookings, 0..1; null on a day off. */
function shiftLoad(work: GridColumn["work"], bookings: GridBooking[]) {
  if (!work) return null;
  const breakMinutes =
    work.breakStart != null && work.breakEnd != null ? Math.max(0, work.breakEnd - work.breakStart) : 0;
  const shift = work.end - work.start - breakMinutes;
  if (shift <= 0) return null;
  const booked = bookings.reduce(
    (sum, b) => sum + Math.max(0, Math.min(b.endMin, work.end) - Math.max(b.startMin, work.start)),
    0,
  );
  return Math.min(1, booked / shift);
}

function dayTitle(day: string, pattern: string) {
  const text = format(new Date(`${day}T12:00:00Z`), pattern, { locale: ru });
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export default async function SchedulePage({ searchParams }: PageProps<"/schedule">) {
  await requireSession();
  const params = paramsSchema.parse(await searchParams);
  const settings = await getSalonSettings();
  const tz = settings.timezone;
  const today = localDate(new Date(), tz);
  const date = params.date ?? today;
  const view = params.view;

  const allMasters = (await listMastersForFilter()).filter((m) => m.isActive);
  const days =
    view === "day"
      ? [date]
      : Array.from({ length: 7 }, (_, i) =>
          shift(weekStart(date), i),
        );
  const shownMasters = view === "week" && params.master ? allMasters.filter((m) => m.id === params.master) : allMasters;
  const data = await getScheduleData(days, shownMasters.map((m) => m.id), tz);


  const linkParams = (bookingId: string) => {
    const query = new URLSearchParams({ view, date });
    if (params.master) query.set("master", params.master);
    query.set("booking", bookingId);
    return `/schedule?${query.toString()}`;
  };

  const toGridBooking = (b: (typeof data.bookings)[number], withMaster: boolean): GridBooking => {
    const start = formatInTimeZone(b.startsAt, tz, "HH:mm");
    const end = formatInTimeZone(b.endsAt, tz, "HH:mm");
    const endMin = localDate(b.endsAt, tz) === localDate(b.startsAt, tz) ? toMinutes(end) : 24 * 60;
    return {
      id: b.id,
      startMin: toMinutes(start),
      endMin,
      status: b.status,
      title: b.serviceName,
      subtitle: withMaster ? `${b.clientName}, ${b.masterName}` : b.clientName,
      time: `${start}–${end}`,
      href: linkParams(b.id),
      categoryName: b.categoryName,
    };
  };

  const workFor = (masterId: string, day: string): GridColumn["work"] => {
    const off = data.offs.find((o) => o.masterId === masterId && o.dateFrom <= day && day <= o.dateTo);
    if (off) return null;
    const hours = data.hours.find((h) => h.masterId === masterId && h.weekday === isoWeekday(day));
    if (!hours) return null;
    return {
      start: toMinutes(hours.startTime),
      end: toMinutes(hours.endTime),
      breakStart: hours.breakStart ? toMinutes(hours.breakStart) : null,
      breakEnd: hours.breakEnd ? toMinutes(hours.breakEnd) : null,
    };
  };
  const offLabel = (masterId: string, day: string) => {
    const off = data.offs.find((o) => o.masterId === masterId && o.dateFrom <= day && day <= o.dateTo);
    return off ? off.reason || "Отпуск / выходной" : "Выходной";
  };

  let columns: GridColumn[];
  if (view === "day") {
    columns = shownMasters.map((master) => {
      const work = workFor(master.id, date);
      const bookings = data.bookings
        .filter((b) => b.masterId === master.id && localDate(b.startsAt, tz) === date)
        .map((b) => toGridBooking(b, false));
      return {
        key: master.id,
        title: master.name,
        badge: monogram(master.name),
        badgeKind: "monogram" as const,
        work,
        offLabel: offLabel(master.id, date),
        isToday: date === today,
        load: shiftLoad(work, bookings),
        bookings,
      };
    });
  } else {
    const single = shownMasters.length === 1 ? shownMasters[0] : null;
    columns = days.map((day) => {
      let work: GridColumn["work"];
      if (single) {
        work = workFor(single.id, day);
      } else {
        // all masters: the salon is open from the earliest start to the latest end
        const intervals = shownMasters.map((m) => workFor(m.id, day)).filter((w) => w !== null);
        work = intervals.length
          ? {
              start: Math.min(...intervals.map((w) => w.start)),
              end: Math.max(...intervals.map((w) => w.end)),
              breakStart: null,
              breakEnd: null,
            }
          : null;
      }
      const bookings = data.bookings
        .filter((b) => localDate(b.startsAt, tz) === day)
        .map((b) => toGridBooking(b, !single));
      return {
        key: day,
        title: dayTitle(day, "EEEE"),
        subtitle: dayTitle(day, "d MMMM").split(" ")[1],
        badge: dayTitle(day, "d"),
        badgeKind: "day" as const,
        highlight: day === today,
        isToday: day === today,
        work,
        offLabel: single ? offLabel(single.id, day) : "Никто не работает",
        // load is meaningful only for one master's shift
        load: single ? shiftLoad(work, bookings) : undefined,
        bookings,
      };
    });
  }

  // Visible hours: working time of everyone shown, widened to fit all bookings
  const starts = columns.flatMap((c) => [...(c.work ? [c.work.start] : []), ...c.bookings.map((b) => b.startMin)]);
  const ends = columns.flatMap((c) => [...(c.work ? [c.work.end] : []), ...c.bookings.map((b) => b.endMin)]);
  const startMin = Math.floor((starts.length ? Math.min(...starts) : 10 * 60) / 60) * 60;
  const endMin = Math.ceil((ends.length ? Math.max(...ends) : 20 * 60) / 60) * 60;

  const details = params.booking ? await getBookingDetails(params.booking) : null;

  const title =
    view === "day"
      ? dayTitle(date, "EEEE, d MMMM")
      : `${dayTitle(days[0], "d MMM")} — ${dayTitle(days[6], "d MMM yyyy")}`;

  return (
    <>
      <PageHeader title="Расписание" description={title} />
      <ScheduleToolbar
        view={view}
        date={date}
        today={today}
        prevDate={shift(date, view === "day" ? -1 : -7)}
        nextDate={shift(date, view === "day" ? 1 : 7)}
        master={params.master ?? "all"}
        masters={allMasters.map((m) => ({ id: m.id, name: m.name }))}
      />
      {shownMasters.length === 0 ? (
        <p className="rounded-xl border bg-card empty-state px-4 py-10 text-center text-sm text-muted-foreground">
          Активных мастеров пока нет. Добавьте мастера в разделе «Мастера».
        </p>
      ) : (
        <ScheduleGrid
          columns={columns}
          startMin={startMin}
          endMin={endMin}
          nowMin={toMinutes(formatInTimeZone(new Date(), tz, "HH:mm"))}
        />
      )}
      {details && (
        <BookingSheet>
          <BookingCard details={details} variant="sheet" />
        </BookingSheet>
      )}
    </>
  );
}
