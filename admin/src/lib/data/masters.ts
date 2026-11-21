import "server-only";

import { and, asc, count, desc, eq, gte } from "drizzle-orm";

import { db } from "@/db";
import { bookings, masterServices, masters, reviews, timeOff, workingHours } from "@/db/schema";

export async function listMasters() {
  const [rows, serviceCounts] = await Promise.all([
    db.select().from(masters).orderBy(asc(masters.sort), asc(masters.nameRu)),
    db
      .select({ masterId: masterServices.masterId, value: count() })
      .from(masterServices)
      .groupBy(masterServices.masterId),
  ]);
  const services = new Map(serviceCounts.map((row) => [row.masterId, row.value]));
  return rows.map((master) => ({ ...master, servicesCount: services.get(master.id) ?? 0 }));
}

export async function getMasterDetail(id: string, today: string) {
  const [master] = await db.select().from(masters).where(eq(masters.id, id));
  if (!master) return null;
  const [serviceRows, hours, offs, [bookingCount], [reviewCount]] = await Promise.all([
    db.select({ serviceId: masterServices.serviceId }).from(masterServices).where(eq(masterServices.masterId, id)),
    db.select().from(workingHours).where(eq(workingHours.masterId, id)).orderBy(asc(workingHours.weekday)),
    db
      .select()
      .from(timeOff)
      .where(and(eq(timeOff.masterId, id), gte(timeOff.dateTo, today)))
      .orderBy(asc(timeOff.dateFrom)),
    db.select({ value: count() }).from(bookings).where(eq(bookings.masterId, id)),
    db.select({ value: count() }).from(reviews).where(eq(reviews.masterId, id)),
  ]);
  return {
    master,
    serviceIds: serviceRows.map((row) => row.serviceId),
    hours,
    timeOff: offs,
    canDelete: bookingCount.value === 0 && reviewCount.value === 0,
  };
}

export async function masterHasHistory(id: string) {
  const [[b], [r]] = await Promise.all([
    db.select({ value: count() }).from(bookings).where(eq(bookings.masterId, id)),
    db.select({ value: count() }).from(reviews).where(eq(reviews.masterId, id)),
  ]);
  return b.value > 0 || r.value > 0;
}

export async function recentTimeOff(id: string) {
  return db.select().from(timeOff).where(eq(timeOff.masterId, id)).orderBy(desc(timeOff.dateFrom)).limit(20);
}
