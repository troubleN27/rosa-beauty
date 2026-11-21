import { Phone, Send } from "lucide-react";

import { BookingActions } from "@/components/bookings/booking-actions";
import { StatusBadge } from "@/components/status-badge";
import { CHANGED_BY_LABELS, SOURCE_LABELS, STATUS_LABELS, type BookingSource, type BookingStatus } from "@/lib/constants";
import type { getBookingDetails } from "@/lib/data/bookings";
import { getSalonSettings } from "@/lib/data/settings";
import { formatDateTime, formatDuration, formatPrice, formatTime } from "@/lib/format";
import { localDate } from "@/lib/slots";

/** Request-time values (kept out of the component body). */
function bookingTiming(startsAt: Date, timezone: string) {
  const now = new Date();
  return { salonToday: localDate(now, timezone), isPast: startsAt.getTime() < now.getTime() };
}

type Details = NonNullable<Awaited<ReturnType<typeof getBookingDetails>>>;

export async function BookingCard({ details, variant = "page" }: { details: Details; variant?: "page" | "sheet" }) {
  const settings = await getSalonSettings();
  const { booking, history } = details;
  const tz = settings.timezone;
  const timing = bookingTiming(booking.startsAt, tz);
  const durationMin = Math.round((booking.endsAt.getTime() - booking.startsAt.getTime()) / 60_000);

  const rows: [string, React.ReactNode][] = [
    ["Услуга", `${booking.serviceName} · ${formatDuration(durationMin)}`],
    ["Мастер", booking.masterName],
    ["Время", `${formatDateTime(booking.startsAt, tz)} – ${formatTime(booking.endsAt, tz)}`],
    ["Цена", formatPrice(booking.price, settings.currency)],
    ["Источник", SOURCE_LABELS[booking.source as BookingSource] ?? booking.source],
    ["Комментарий", booking.comment || <span className="text-muted-foreground">—</span>],
  ];

  return (
    <div className={variant === "page" ? "grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]" : "grid gap-6"}>
      <div className="space-y-6">
        <section className="rounded-xl border bg-card">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b px-4 py-4">
            <div className="min-w-0">
              <p className="text-lg font-semibold">{booking.clientName}</p>
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                {booking.clientPhone && (
                  <a href={`tel:${booking.clientPhone}`} className="inline-flex items-center gap-1.5 hover:text-foreground">
                    <Phone className="size-3.5" aria-hidden />
                    {booking.clientPhone}
                  </a>
                )}
                {booking.clientTelegramId !== null && (
                  <span className="inline-flex items-center gap-1.5">
                    <Send className="size-3.5" aria-hidden />
                    Telegram
                  </span>
                )}
              </div>
            </div>
            <StatusBadge status={booking.status} />
          </div>
          <dl className="divide-y text-sm">
            {rows.map(([label, value]) => (
              <div key={label} className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-3 px-4 py-2.5">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="min-w-0 break-words">{value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section>
          <h2 className="mb-2 text-sm font-medium">История статусов</h2>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">Изменений пока не было.</p>
          ) : (
            <ol className="space-y-2 border-l pl-4">
              {history.map((entry) => (
                <li key={entry.id} className="text-sm">
                  <span className="font-medium">
                    {entry.oldStatus
                      ? `${STATUS_LABELS[entry.oldStatus as BookingStatus] ?? entry.oldStatus} → ${STATUS_LABELS[entry.newStatus as BookingStatus] ?? entry.newStatus}`
                      : `Создана: ${STATUS_LABELS[entry.newStatus as BookingStatus] ?? entry.newStatus}`}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {formatDateTime(entry.changedAt, tz)} · {CHANGED_BY_LABELS[entry.changedBy] ?? entry.changedBy}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      <BookingActions
        bookingId={booking.id}
        status={booking.status as BookingStatus}
        masterId={booking.masterId}
        serviceId={booking.serviceId}
        variant={variant}
        salonToday={timing.salonToday}
        isPast={timing.isPast}
        hasTelegram={booking.clientTelegramId !== null}
      />
    </div>
  );
}
