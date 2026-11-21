import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { CalendarPlus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { BookingsChart } from "@/components/dashboard/bookings-chart";
import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { getDashboard } from "@/lib/data/dashboard";
import { getSalonSettings } from "@/lib/data/settings";
import { formatPrice, formatTime } from "@/lib/format";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = { title: "Главная" };

function dayLabel(day: string, pattern: string) {
  return format(new Date(`${day}T12:00:00Z`), pattern, { locale: ru });
}

export default async function DashboardPage() {
  await requireSession();
  const settings = await getSalonSettings();
  const data = await getDashboard(settings);
  const tz = settings.timezone;

  const metrics = [
    { label: "Записи сегодня", value: String(data.todayCount) },
    { label: "Записи за неделю", value: String(data.week.total) },
    { label: "Выручка за неделю", value: formatPrice(data.week.revenue, settings.currency), hint: "по выполненным" },
    {
      label: "Отмены и неявки",
      value: `${data.week.cancelled} / ${data.week.noShow}`,
      hint: "за неделю",
    },
    {
      label: "Средняя оценка",
      value: data.rating.average === null ? "—" : data.rating.average.toFixed(1),
      hint: data.rating.count ? `${data.rating.count} отз. за неделю` : "нет отзывов за неделю",
    },
  ];

  const today = dayLabel(data.today, "EEEE, d MMMM");
  const chart = data.chart.map((point) => ({ ...point, label: dayLabel(point.day, "d.MM") }));

  return (
    <>
      <PageHeader
        title={today.charAt(0).toUpperCase() + today.slice(1)}
        description={`Неделя ${dayLabel(data.week.start, "d MMM")} — ${dayLabel(data.week.end, "d MMM")}`}
        actions={
          <Button nativeButton={false} render={<Link href="/bookings/new" />}>
            <CalendarPlus aria-hidden />
            Новая запись
          </Button>
        }
      />

      <dl className="grid grid-cols-2 overflow-hidden rounded-xl border bg-card sm:grid-cols-3 lg:grid-cols-5">
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className="border-b border-r p-4 last:col-span-2 last:border-r-0 sm:last:col-span-1 lg:border-b-0"
          >
            <dt className="text-xs text-muted-foreground">{metric.label}</dt>
            <dd className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">{metric.value}</dd>
            {metric.hint && <dd className="mt-0.5 text-xs text-muted-foreground">{metric.hint}</dd>}
          </div>
        ))}
      </dl>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <section className="rounded-xl border bg-card">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h2 className="font-medium">Записи на сегодня</h2>
            <Link href="/schedule" className="text-sm text-primary hover:underline">
              Расписание
            </Link>
          </div>
          {data.todayList.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <p className="text-sm text-muted-foreground">На сегодня записей пока нет.</p>
              <Link href="/bookings/new" className="mt-2 inline-block text-sm text-primary hover:underline">
                Записать клиента
              </Link>
            </div>
          ) : (
            <ol className="divide-y">
              {data.todayList.map((booking) => (
                <li key={booking.id}>
                  <Link
                    href={`/bookings/${booking.id}`}
                    className="grid grid-cols-[3.5rem_minmax(0,1fr)] gap-x-3 px-4 py-3 transition-colors hover:bg-accent/50 sm:grid-cols-[3.5rem_minmax(0,1fr)_auto]"
                  >
                    <span className="text-sm font-semibold tabular-nums">
                      {formatTime(booking.startsAt, tz)}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{booking.serviceName}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {booking.clientName} · {booking.masterName}
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
          <div className="border-b px-4 py-3">
            <h2 className="font-medium">Записи по дням</h2>
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
