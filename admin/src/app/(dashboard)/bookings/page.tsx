import { CalendarPlus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { BookingsFilters } from "@/components/bookings/bookings-filters";
import { BookingsTable, type BookingTableRow } from "@/components/bookings/bookings-table";
import { PageHeader } from "@/components/layout/page-header";
import { Pagination } from "@/components/pagination";
import { Button } from "@/components/ui/button";
import { getI18n } from "@/i18n/server";
import { isBookingSource } from "@/lib/constants";
import { listBookings, listMastersForFilter, PAGE_SIZE } from "@/lib/data/bookings";
import { getSalonSettings } from "@/lib/data/settings";
import { formatDay, formatPrice, formatTime } from "@/lib/format";
import { requireSession } from "@/lib/session";
import { bookingFiltersSchema } from "@/lib/validations/booking";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("bookings.title") };
}

export default async function BookingsPage({ searchParams }: PageProps<"/bookings">) {
  await requireSession();
  const { t, lang, pick } = await getI18n();
  const filters = bookingFiltersSchema.parse(await searchParams);
  const settings = await getSalonSettings();
  const tz = settings.timezone;

  const [{ rows, total }, masters] = await Promise.all([
    listBookings(
      {
        from: filters.from,
        to: filters.to,
        masterId: filters.master,
        status: filters.status,
        source: filters.source,
        sort: filters.sort,
        page: filters.page,
      },
      tz,
    ),
    listMastersForFilter(),
  ]);

  const data: BookingTableRow[] = rows.map((row) => ({
    id: row.id,
    date: formatDay(row.startsAt, tz, lang),
    time: formatTime(row.startsAt, tz),
    client: row.clientName,
    phone: row.clientPhone,
    service: pick(row.serviceName, row.serviceNameEn),
    master: pick(row.masterName, row.masterNameEn),
    price: formatPrice(row.price, settings.currency),
    status: row.status,
    source: isBookingSource(row.source) ? t(`source.${row.source}`) : row.source,
  }));

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasFilters = Boolean(filters.from || filters.to || filters.master || filters.status || filters.source);

  return (
    <>
      <PageHeader
        title={t("bookings.title")}
        description={total ? t("bookings.found", { count: total }) : undefined}
        actions={
          <Button nativeButton={false} render={<Link href="/bookings/new" />}>
            <CalendarPlus aria-hidden />
            {t("bookings.new")}
          </Button>
        }
      />
      <BookingsFilters masters={masters.map((m) => ({ id: m.id, name: m.name }))} />
      {data.length === 0 ? (
        <div className="rounded-xl border bg-card empty-state px-4 py-12 text-center">
          <p className="text-sm text-muted-foreground">
            {hasFilters ? t("bookings.emptyFiltered") : t("bookings.empty")}
          </p>
          {!hasFilters && (
            <Link href="/bookings/new" className="mt-2 inline-block text-sm text-primary hover:underline">
              {t("bookings.createFirst")}
            </Link>
          )}
        </div>
      ) : (
        <>
          <BookingsTable data={data} />
          <Pagination
            basePath="/bookings"
            params={{
              from: filters.from,
              to: filters.to,
              master: filters.master,
              status: filters.status,
              source: filters.source,
              sort: filters.sort === "starts_desc" ? undefined : filters.sort,
            }}
            page={filters.page}
            pages={pages}
          />
        </>
      )}
    </>
  );
}
