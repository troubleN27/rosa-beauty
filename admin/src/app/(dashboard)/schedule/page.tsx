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

const MASTER_ACCENTS = ["#3b6fb6", "#c9707d", "#3f8a5a", "#a0712b", "#7a5ea8", "#2f8a8a"];

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

  const accent = new Map(allMasters.map((m, i) => [m.id, MASTER_ACCENTS[i % MASTER_ACCENTS.length]]));
  const masterName = new Map(allMasters.map((m) => [m.id, m.name]));

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
      subtitle: withMaster ? `${b.clientName} · ${b.masterName}` : b.clientName,
      time: `${start}–${end}`,
      href: linkParams(b.id),
      accent: withMaster ? accent.get(b.masterId) : undefined,
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
    columns = shownMasters.map((master) => ({
      key: master.id,
      title: master.name,
      work: workFor(master.id, date),
      offLabel: offLabel(master.id, date),
      bookings: data.bookings
        .filter((b) => b.masterId === master.id && localDate(b.startsAt, tz) === date)
        .map((b) => toGridBooking(b, false)),
    }));
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
      return {
        key: day,
        title: dayTitle(day, "EEEEEE, d MMM"),
        highlight: day === today,
        work,
        offLabel: single ? offLabel(single.id, day) : "Никто не работает",
        bookings: data.bookings
          .filter((b) => localDate(b.startsAt, tz) === day)
          .map((b) => toGridBooking(b, !single)),
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
        <p className="rounded-xl border bg-card px-4 py-10 text-center text-sm text-muted-foreground">
          Активных мастеров пока нет. Добавьте мастера в разделе «Мастера».
        </p>
      ) : (
        <ScheduleGrid columns={columns} startMin={startMin} endMin={endMin} />
      )}
      {view === "week" && !params.master && shownMasters.length > 1 && (
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground" aria-label="Мастера">
          {shownMasters.map((m) => (
            <li key={m.id} className="inline-flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm" style={{ background: accent.get(m.id) }} aria-hidden />
              {masterName.get(m.id)}
            </li>
          ))}
        </ul>
      )}
      {details && (
        <BookingSheet>
          <BookingCard details={details} variant="sheet" />
        </BookingSheet>
      )}
    </>
  );
}
