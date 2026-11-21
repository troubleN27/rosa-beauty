import { CalendarPlus, ChevronLeft, ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { BookingsFilters } from "@/components/bookings/bookings-filters";
import { BookingsTable, type BookingTableRow } from "@/components/bookings/bookings-table";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { SOURCE_LABELS, type BookingSource } from "@/lib/constants";
import { listBookings, listMastersForFilter, PAGE_SIZE } from "@/lib/data/bookings";
import { getSalonSettings } from "@/lib/data/settings";
import { formatDay, formatPrice, formatTime } from "@/lib/format";
import { requireSession } from "@/lib/session";
import { bookingFiltersSchema } from "@/lib/validations/booking";

export const metadata: Metadata = { title: "Записи" };

export default async function BookingsPage({ searchParams }: PageProps<"/bookings">) {
  await requireSession();
  const raw = await searchParams;
  const filters = bookingFiltersSchema.parse(raw);
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
    date: formatDay(row.startsAt, tz),
    time: formatTime(row.startsAt, tz),
    client: row.clientName,
    phone: row.clientPhone,
    service: row.serviceName,
    master: row.masterName,
    price: formatPrice(row.price, settings.currency),
    status: row.status,
    source: SOURCE_LABELS[row.source as BookingSource] ?? row.source,
  }));

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageHref = (page: number) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(raw)) {
      if (typeof value === "string" && key !== "page") params.set(key, value);
    }
    if (page > 1) params.set("page", String(page));
    const query = params.toString();
    return query ? `/bookings?${query}` : "/bookings";
  };
  const hasFilters = Boolean(filters.from || filters.to || filters.master || filters.status || filters.source);

  return (
    <>
      <PageHeader
        title="Записи"
        description={total ? `Найдено: ${total}` : undefined}
        actions={
          <Button nativeButton={false} render={<Link href="/bookings/new" />}>
            <CalendarPlus aria-hidden />
            Новая запись
          </Button>
        }
      />
      <BookingsFilters masters={masters.map((m) => ({ id: m.id, name: m.name }))} />
      {data.length === 0 ? (
        <div className="rounded-xl border bg-card px-4 py-12 text-center">
          <p className="text-sm text-muted-foreground">
            {hasFilters ? "По этим фильтрам записей нет. Измените период или сбросьте фильтры." : "Записей пока нет."}
          </p>
          {!hasFilters && (
            <Link href="/bookings/new" className="mt-2 inline-block text-sm text-primary hover:underline">
              Создать первую запись
            </Link>
          )}
        </div>
      ) : (
        <>
          <BookingsTable data={data} />
          {pages > 1 && (
            <nav className="mt-4 flex items-center justify-between text-sm" aria-label="Страницы">
              <span className="text-muted-foreground">
                Страница {filters.page} из {pages}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  nativeButton={false}
                  disabled={filters.page <= 1}
                  render={<Link href={pageHref(filters.page - 1)} aria-disabled={filters.page <= 1} />}
                >
                  <ChevronLeft aria-hidden />
                  Назад
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  nativeButton={false}
                  disabled={filters.page >= pages}
                  render={<Link href={pageHref(filters.page + 1)} aria-disabled={filters.page >= pages} />}
                >
                  Дальше
                  <ChevronRight aria-hidden />
                </Button>
              </div>
            </nav>
          )}
        </>
      )}
    </>
  );
}
