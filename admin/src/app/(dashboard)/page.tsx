import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { CalendarPlus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Flourish } from "@/components/brand";
import { BookingsChart } from "@/components/dashboard/bookings-chart";
import { PageHeader } from "@/components/layout/page-header";
import { RoseRating } from "@/components/rose-rating";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { categoryTone } from "@/lib/category-tone";
import { getDashboard } from "@/lib/data/dashboard";
import { getSalonSettings } from "@/lib/data/settings";
import { formatPrice, formatTime } from "@/lib/format";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = { title: "Главная" };

function dayLabel(day: string, pattern: string) {
  return format(new Date(`${day}T12:00:00Z`), pattern, { locale: ru });
}

function pluralRu(n: number, forms: [string, string, string]) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms[1];
  return forms[2];
}

function greeting(now: Date, timezone: string) {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone: timezone }).format(now),
  );
  if (hour < 5) return "Доброй ночи";
  if (hour < 12) return "Доброе утро";
  if (hour < 18) return "Добрый день";
  return "Добрый вечер";
}

export default async function DashboardPage() {
  await requireSession();
  const settings = await getSalonSettings();
  const data = await getDashboard(settings);
  const tz = settings.timezone;
  const now = new Date();

  const metrics = [
    { label: "Записи за неделю", value: String(data.week.total) },
    { label: "Выручка за неделю", value: formatPrice(data.week.revenue, settings.currency), hint: "по выполненным" },
    { label: "Отмены и неявки", value: `${data.week.cancelled} / ${data.week.noShow}`, hint: "за неделю" },
    {
      label: "Средняя оценка",
      value: data.rating.average === null ? "—" : data.rating.average.toFixed(1),
      rating: data.rating.average,
      hint: data.rating.count ? `${data.rating.count} отз. за неделю` : "нет отзывов за неделю",
    },
  ];
  const next = data.todayList.find((booking) => booking.status === "confirmed" && booking.startsAt > now);

  const today = dayLabel(data.today, "EEEE, d MMMM");
  const chart = data.chart.map((point) => ({
    ...point,
    label: dayLabel(point.day, "d"),
    weekday: dayLabel(point.day, "EEEEEE"),
  }));

  return (
    <>
      <PageHeader
        title={today.charAt(0).toUpperCase() + today.slice(1)}
        description={`${greeting(now, tz)}. Неделя ${dayLabel(data.week.start, "d MMM")} — ${dayLabel(data.week.end, "d MMM")}`}
        actions={
          <Button nativeButton={false} render={<Link href="/bookings/new" />}>
            <CalendarPlus aria-hidden />
            Новая запись
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
        {/* Today, framed like the arched vanity mirror */}
        <section className="frame-gold arch flex flex-col items-center bg-card px-6 pt-14 pb-7 text-center">
          <Flourish />
          <p className="mt-4 font-display text-[88px] leading-none font-medium tabular-nums">{data.todayCount}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {pluralRu(data.todayCount, ["запись", "записи", "записей"])} сегодня
          </p>
          <div className="mt-6 w-full border-t border-gold/30 pt-4 text-sm">
            {next ? (
              <Link href={`/bookings/${next.id}`} className="block rounded-md hover:text-primary">
                <span className="block text-xs text-muted-foreground">Ближайший визит</span>
                <span className="mt-1 block font-display text-2xl tabular-nums">{formatTime(next.startsAt, tz)}</span>
                <span className="block truncate">{next.serviceName}</span>
              </Link>
            ) : (
              <span className="text-muted-foreground">Больше визитов сегодня нет</span>
            )}
          </div>
        </section>

        <dl className="grid grid-cols-2 gap-4">
          {metrics.map((metric) => (
            <div key={metric.label} className="flex flex-col rounded-xl border bg-card p-4 sm:p-5">
              <dt className="text-sm text-muted-foreground">{metric.label}</dt>
              <dd className="mt-auto pt-3 font-display text-3xl leading-none font-medium tabular-nums sm:text-[40px]">
                {metric.value}
              </dd>
              {metric.rating != null && (
                <dd className="mt-2">
                  <RoseRating rating={metric.rating} className="[&_img]:h-5" />
                </dd>
              )}
              {metric.hint && <dd className="mt-1.5 text-xs text-muted-foreground">{metric.hint}</dd>}
            </div>
          ))}
        </dl>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <section className="rounded-xl border bg-card">
          <div className="flex items-baseline justify-between border-b px-5 py-4">
            <h2 className="font-display text-2xl font-semibold">Записи на сегодня</h2>
            <Link href="/schedule" className="text-sm text-primary hover:underline">
              Расписание
            </Link>
          </div>
          {data.todayList.length === 0 ? (
            <div className="empty-state px-5 py-12 text-center">
              <p className="text-sm text-muted-foreground">На сегодня записей пока нет.</p>
              <Link href="/bookings/new" className="mt-2 inline-block text-sm text-primary hover:underline">
                Записать клиента
              </Link>
            </div>
          ) : (
            <ol data-stagger className="divide-y">
              {data.todayList.map((booking) => (
                <li key={booking.id} style={categoryTone(booking.categorySort)}>
                  <Link
                    href={`/bookings/${booking.id}`}
                    className="grid grid-cols-[4.25rem_minmax(0,1fr)] gap-x-3 px-5 py-3.5 transition-colors hover:bg-accent/50 sm:grid-cols-[4.25rem_minmax(0,1fr)_auto]"
                  >
                    <span className="flex items-center gap-2">
                      <span className="tone-dot size-2 shrink-0 rounded-full" aria-hidden />
                      <span className="font-display text-xl leading-none font-semibold tabular-nums">
                        {formatTime(booking.startsAt, tz)}
                      </span>
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{booking.serviceName}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {booking.clientName}, мастер {booking.masterName}
                      </span>
                    </span>
                    <span className="col-start-2 mt-1 sm:col-start-3 sm:mt-0 sm:self-center">
                      <StatusBadge status={booking.status} />
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="rounded-xl border bg-card">
          <div className="border-b px-5 py-4">
            <h2 className="font-display text-2xl font-semibold">Записи по дням</h2>
            <p className="text-xs text-muted-foreground">Последние 14 дней, без отменённых</p>
          </div>
          <div className="p-4">
            <BookingsChart data={chart} />
          </div>
        </section>
      </div>
    </>
  );
}
