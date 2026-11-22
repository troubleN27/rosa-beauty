import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { and, asc, eq } from "drizzle-orm";

import { NewBookingForm } from "@/components/bookings/new-booking-form";
import { PageHeader } from "@/components/layout/page-header";
import { db } from "@/db";
import { categories, services } from "@/db/schema";
import { getI18n } from "@/i18n/server";
import { getSalonSettings } from "@/lib/data/settings";
import { formatDuration, formatPrice } from "@/lib/format";
import { requireSession } from "@/lib/session";
import { localDate } from "@/lib/slots";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("bookings.new") };
}

export default async function NewBookingPage() {
  await requireSession();
  const { t, lang, pick } = await getI18n();
  const settings = await getSalonSettings();
  const rows = await db
    .select({
      id: services.id,
      name: services.nameRu,
      nameEn: services.nameEn,
      duration: services.durationMin,
      price: services.price,
      category: categories.nameRu,
      categoryEn: categories.nameEn,
    })
    .from(services)
    .innerJoin(categories, eq(categories.id, services.categoryId))
    .where(and(eq(services.isActive, true), eq(categories.isActive, true)))
    .orderBy(asc(categories.sort), asc(services.sort), asc(services.nameRu));

  const serviceOptions = rows.map((row) => ({
    id: row.id,
    category: pick(row.category, row.categoryEn),
    label: pick(row.name, row.nameEn),
    hint: `${formatDuration(row.duration, lang)} · ${formatPrice(row.price, settings.currency)}`,
  }));

  return (
    <>
      <Link
        href="/bookings"
        className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" aria-hidden />
        {t("bookings.all")}
      </Link>
      <PageHeader
        title={t("bookings.new")}
        description={t("bookings.newDescription")}
      />
      {serviceOptions.length === 0 ? (
        <p className="rounded-xl border bg-card empty-state px-4 py-10 text-center text-sm text-muted-foreground">
          {t("bookings.noServices")}
        </p>
      ) : (
        <NewBookingForm services={serviceOptions} salonToday={localDate(new Date(), settings.timezone)} />
      )}
    </>
  );
}
