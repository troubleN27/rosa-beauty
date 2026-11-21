import "server-only";

import { asc, count, eq } from "drizzle-orm";

import { db } from "@/db";
import { bookings, categories, masterServices, services } from "@/db/schema";

export async function getCatalog() {
  const [categoryRows, serviceRows, bookingCounts, masterCounts] = await Promise.all([
    db.select().from(categories).orderBy(asc(categories.sort), asc(categories.nameRu)),
    db.select().from(services).orderBy(asc(services.sort), asc(services.nameRu)),
    db.select({ serviceId: bookings.serviceId, value: count() }).from(bookings).groupBy(bookings.serviceId),
    db
      .select({ serviceId: masterServices.serviceId, value: count() })
      .from(masterServices)
      .groupBy(masterServices.serviceId),
  ]);
  const bookingsBy = new Map(bookingCounts.map((row) => [row.serviceId, row.value]));
  const mastersBy = new Map(masterCounts.map((row) => [row.serviceId, row.value]));

  return categoryRows.map((category) => ({
    ...category,
    services: serviceRows
      .filter((service) => service.categoryId === category.id)
      .map((service) => ({
        ...service,
        bookingsCount: bookingsBy.get(service.id) ?? 0,
        mastersCount: mastersBy.get(service.id) ?? 0,
      })),
  }));
}

export type CatalogCategory = Awaited<ReturnType<typeof getCatalog>>[number];
export type CatalogService = CatalogCategory["services"][number];

export async function serviceHasBookings(serviceId: string) {
  const [row] = await db.select({ value: count() }).from(bookings).where(eq(bookings.serviceId, serviceId));
  return row.value > 0;
}
