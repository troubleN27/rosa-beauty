import { format } from "date-fns";
import { CalendarPlus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Flourish } from "@/components/brand";
import { BookingsChart } from "@/components/dashboard/bookings-chart";
import { PageHeader } from "@/components/layout/page-header";
import { StarRating } from "@/components/star-rating";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { dateLocale, type Lang, type MessageKey } from "@/i18n";
import { getI18n } from "@/i18n/server";
import { getDashboard } from "@/lib/data/dashboard";
import { getSalonSettings } from "@/lib/data/settings";
import { formatPrice, formatTime } from "@/lib/format";
import { requireSession } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("dashboard.title") };
}

function dayLabel(day: string, pattern: string, lang: Lang) {
  return format(new Date(`${day}T12:00:00Z`), pattern, { locale: dateLocale(lang) });
}

function greetingKey(now: Date, timezone: string): MessageKey {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone: timezone }).format(now),
  );
  if (hour < 5) return "dashboard.greetingNight";
  if (hour < 12) return "dashboard.greetingMorning";
  if (hour < 18) return "dashboard.greetingDay";
  return "dashboard.greetingEvening";
}

export default async function DashboardPage() {
  await requireSession();
  const { t, lang, pick } = await getI18n();
  const settings = await getSalonSettings();
  const data = await getDashboard(settings);
  const tz = settings.timezone;
  const now = new Date();

  const metrics = [
    { key: "bookings", label: t("dashboard.weekBookings"), value: String(data.week.total) },
    {
      key: "revenue",
      label: t("dashboard.weekRevenue"),
      value: formatPrice(data.week.revenue, settings.currency),
      hint: t("dashboard.revenueHint"),
    },
    {
      key: "cancels",
      label: t("dashboard.cancelsNoShows"),
      value: `${data.week.cancelled} / ${data.week.noShow}`,
      hint: t("dashboard.thisWeek"),
    },
    {
      key: "rating",
      label: t("dashboard.avgRating"),
      value: data.rating.average === null ? "—" : data.rating.average.toFixed(1),
      rating: data.rating.average,
      hint: data.rating.count
        ? t("dashboard.reviewsThisWeek", { count: data.rating.count })
        : t("dashboard.noReviewsThisWeek"),
    },
  ];
  const next = data.todayList.find((booking) => booking.status === "confirmed" && booking.startsAt > now);

  const today = dayLabel(data.today, "EEEE, d MMMM", lang);
  const chart = data.chart.map((point) => ({
    ...point,
    label: dayLabel(point.day, "d", lang),
    weekday: dayLabel(point.day, "EEEEEE", lang),
  }));

  return (
    <>
      <PageHeader
        title={today.charAt(0).toUpperCase() + today.slice(1)}
        description={t("dashboard.week", {
          greeting: t(greetingKey(now, tz)),
          from: dayLabel(data.week.start, "d MMM", lang),
          to: dayLabel(data.week.end, "d MMM", lang),
        })}
        actions={
          <Button nativeButton={false} render={<Link href="/bookings/new" />}>
            <CalendarPlus aria-hidden />
            {t("dashboard.newBooking")}
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
        {/* Today, framed like the arched vanity mirror */}
        <section className="frame-gold arch flex flex-col items-center bg-card px-6 pt-14 pb-7 text-center">
          <Flourish />
          <p className="mt-4 font-display text-[88px] leading-none font-medium tabular-nums">{data.todayCount}</p>
          <p className="mt-2 text-sm text-muted-foreground">{t("dashboard.todayWord", { count: data.todayCount })}</p>
          <div className="mt-6 w-full border-t border-gold/30 pt-4 text-sm">
            {next ? (
              <Link href={`/bookings/${next.id}`} className="block rounded-md hover:text-primary">
                <span className="block text-xs text-muted-foreground">{t("dashboard.nextVisit")}</span>
                <span className="mt-1 block font-display text-2xl tabular-nums">{formatTime(next.startsAt, tz)}</span>
                <span className="block truncate">{pick(next.serviceName, next.serviceNameEn)}</span>
              </Link>
            ) : (
              <span className="text-muted-foreground">{t("dashboard.noMoreVisits")}</span>
            )}
          </div>
        </section>

        <dl className="grid grid-cols-2 gap-4">
          {metrics.map((metric) => (
            <div key={metric.key} className="flex flex-col rounded-xl border bg-card p-4 sm:p-5">
              <dt className="text-sm text-muted-foreground">{metric.label}</dt>
              <dd className="mt-auto pt-3 font-display text-3xl leading-none font-medium tabular-nums sm:text-[40px]">
                {metric.value}
              </dd>
              {metric.rating != null && (
                <dd className="mt-2">
                  <StarRating rating={metric.rating} size={16} />
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
            <h2 className="font-display text-2xl font-semibold">{t("dashboard.todayList")}</h2>
            <Link href="/schedule" className="text-sm text-primary hover:underline">
              {t("dashboard.toSchedule")}
            </Link>
          </div>
          {data.todayList.length === 0 ? (
            <div className="empty-state px-5 py-12 text-center">
              <p className="text-sm text-muted-foreground">{t("dashboard.todayEmpty")}</p>
              <Link href="/bookings/new" className="mt-2 inline-block text-sm text-primary hover:underline">
                {t("dashboard.bookClient")}
              </Link>
            </div>
          ) : (
            <ol className="divide-y">
              {data.todayList.map((booking) => (
                <li key={booking.id}>
                  <Link
                    href={`/bookings/${booking.id}`}
                    className="grid grid-cols-[4.25rem_minmax(0,1fr)] gap-x-3 px-5 py-3.5 transition-colors hover:bg-accent/50 sm:grid-cols-[4.25rem_minmax(0,1fr)_auto]"
                  >
                    <span className="flex items-center gap-2">
                      <span className="font-display text-xl leading-none font-semibold tabular-nums">
                        {formatTime(booking.startsAt, tz)}
                      </span>
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">
                        {pick(booking.serviceName, booking.serviceNameEn)}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {t("dashboard.clientWithMaster", {
                          client: booking.clientName,
                          master: pick(booking.masterName, booking.masterNameEn),
                        })}
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
            <h2 className="font-display text-2xl font-semibold">{t("dashboard.chartTitle")}</h2>
            <p className="text-xs text-muted-foreground">{t("dashboard.chartHint")}</p>
          </div>
          <div className="p-4">
            <BookingsChart data={chart} />
          </div>
        </section>
      </div>
    </>
  );
}
