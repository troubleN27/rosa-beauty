import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { and, asc, eq } from "drizzle-orm";

import { NewBookingForm } from "@/components/bookings/new-booking-form";
import { PageHeader } from "@/components/layout/page-header";
import { db } from "@/db";
import { categories, services } from "@/db/schema";
import { getSalonSettings } from "@/lib/data/settings";
import { formatDuration, formatPrice } from "@/lib/format";
import { requireSession } from "@/lib/session";
import { localDate } from "@/lib/slots";

export const metadata: Metadata = { title: "Новая запись" };

export default async function NewBookingPage() {
  await requireSession();
  const settings = await getSalonSettings();
  const rows = await db
    .select({
      id: services.id,
      name: services.nameRu,
      duration: services.durationMin,
      price: services.price,
      category: categories.nameRu,
    })
    .from(services)
    .innerJoin(categories, eq(categories.id, services.categoryId))
    .where(and(eq(services.isActive, true), eq(categories.isActive, true)))
    .orderBy(asc(categories.sort), asc(services.sort), asc(services.nameRu));

  const serviceOptions = rows.map((row) => ({
    id: row.id,
    category: row.category,
    label: row.name,
    hint: `${formatDuration(row.duration)} · ${formatPrice(row.price, settings.currency)}`,
  }));

  return (
    <>
      <Link
        href="/bookings"
        className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" aria-hidden />
        Все записи
      </Link>
      <PageHeader
        title="Новая запись"
        description="Для клиентов, которые позвонили или пришли в салон. Время проверяется по графику мастера."
      />
      {serviceOptions.length === 0 ? (
        <p className="rounded-xl border bg-card px-4 py-10 text-center text-sm text-muted-foreground">
          Нет активных услуг. Добавьте услуги в разделе «Услуги».
        </p>
      ) : (
        <NewBookingForm services={serviceOptions} salonToday={localDate(new Date(), settings.timezone)} />
      )}
    </>
  );
}
