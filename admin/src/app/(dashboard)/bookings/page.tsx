import { CalendarPlus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { BookingsFilters } from "@/components/bookings/bookings-filters";
import { BookingsTable, type BookingTableRow } from "@/components/bookings/bookings-table";
import { PageHeader } from "@/components/layout/page-header";
import { Pagination } from "@/components/pagination";
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
        <div className="rounded-xl border bg-card empty-state px-4 py-12 text-center">
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
