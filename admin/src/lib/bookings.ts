import "server-only";

import { and, desc, eq, isNotNull, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  bookingStatusHistory,
  bookings,
  clients,
  masterServices,
  masters,
  services,
} from "@/db/schema";
import { freeSlots } from "@/lib/availability";
import { clientMessage } from "@/lib/client-messages";
import type { BookingStatus } from "@/lib/constants";
import { getSalonSettings } from "@/lib/data/settings";
import { formatDateTime, phoneDigits } from "@/lib/format";
import { localDate } from "@/lib/slots";
import { escapeHtml, sendToClient, type DeliveryResult } from "@/lib/telegram";

export class BookingError extends Error {}

export const SLOT_TAKEN = "Это время уже занято. Выберите другое.";
const EXCLUSION_VIOLATION = "23P01";

function isExclusionViolation(error: unknown): boolean {
  let current: unknown = error;
  for (let depth = 0; current && depth < 4; depth++) {
    if (typeof current === "object" && "code" in current && current.code === EXCLUSION_VIOLATION) {
      return true;
    }
    current = (current as { cause?: unknown }).cause;
  }
  return false;
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function loadBooking(executor: typeof db | Tx, bookingId: string) {
  const [row] = await executor
    .select({ booking: bookings, client: clients, service: services, master: masters })
    .from(bookings)
    .innerJoin(clients, eq(clients.id, bookings.clientId))
    .innerJoin(services, eq(services.id, bookings.serviceId))
    .innerJoin(masters, eq(masters.id, bookings.masterId))
    .where(eq(bookings.id, bookingId));
  if (!row) throw new BookingError("Запись не найдена");
  return row;
}

async function assertSlotFree(
  executor: Tx,
  masterId: string,
  durationMin: number,
  startsAt: Date,
  excludeBookingId?: string,
) {
  if (startsAt.getTime() <= Date.now()) {
    throw new BookingError("Нельзя записать на прошедшее время.");
  }
  const settings = await getSalonSettings();
  const day = localDate(startsAt, settings.timezone);
  const free = await freeSlots(executor, settings, [masterId], durationMin, day, excludeBookingId);
  if (!free.has(startsAt.getTime())) {
    throw new BookingError(SLOT_TAKEN);
  }
}

// --- Status -------------------------------------------------------------------------

export type StatusChangeResult = { delivery: DeliveryResult | null };

export async function changeStatus(
  bookingId: string,
  newStatus: BookingStatus,
): Promise<StatusChangeResult> {
  const before = await loadBooking(db, bookingId);
  if (before.booking.status === newStatus) return { delivery: null };

  try {
    await db.transaction(async (tx) => {
      const [current] = await tx
        .select({ status: bookings.status })
        .from(bookings)
        .where(eq(bookings.id, bookingId))
        .for("update");
      if (!current || current.status === newStatus) return;
      await tx
        .update(bookings)
        .set({
          status: newStatus,
          cancelledBy: newStatus === "cancelled" ? "admin" : null,
        })
        .where(eq(bookings.id, bookingId));
      await tx.insert(bookingStatusHistory).values({
        bookingId,
        oldStatus: current.status,
        newStatus,
        changedBy: "admin",
      });
    });
  } catch (error) {
    // Returning a booking to "confirmed" may collide with a booking made since
    if (isExclusionViolation(error)) throw new BookingError(SLOT_TAKEN);
    throw error;
  }

  if (newStatus !== "cancelled" || before.booking.status !== "confirmed") {
    return { delivery: null };
  }
  // F11: tell the client about a cancellation made by the salon
  const settings = await getSalonSettings();
  const { booking, client, service, master } = before;
  const lang = client.language;
  const text = clientMessage("cancelled", lang, {
    service: escapeHtml(lang === "en" ? service.nameEn : service.nameRu),
    master: escapeHtml(lang === "en" ? master.nameEn : master.nameRu),
    when: formatDateTime(booking.startsAt, settings.timezone, lang === "en" ? "en" : "ru"),
    phone: escapeHtml(settings.phone ?? ""),
  });
  return { delivery: await sendToClient(client.telegramId, text) };
}

// --- Reschedule ------------------------------------------------------------------------

/**
 * Same model as in the bot (SPEC 4.5): the old booking is cancelled by the admin and a
 * new confirmed one is created with the same client, service, master, price and source.
 */
export async function rescheduleBooking(
  bookingId: string,
  newStart: Date,
): Promise<{ newBookingId: string; delivery: DeliveryResult }> {
  const { booking, client, service, master } = await loadBooking(db, bookingId);
  if (booking.status !== "confirmed") {
    throw new BookingError("Перенести можно только подтверждённую запись.");
  }
  const durationMin = Math.round((booking.endsAt.getTime() - booking.startsAt.getTime()) / 60_000);

  let newBookingId = "";
  try {
    await db.transaction(async (tx) => {
      await assertSlotFree(tx, booking.masterId, durationMin, newStart, booking.id);
      const updated = await tx
        .update(bookings)
        .set({ status: "cancelled", cancelledBy: "admin" })
        .where(and(eq(bookings.id, booking.id), eq(bookings.status, "confirmed")))
        .returning({ id: bookings.id });
      if (updated.length === 0) throw new BookingError("Запись уже изменена. Обновите страницу.");
      await tx.insert(bookingStatusHistory).values({
        bookingId: booking.id,
        oldStatus: "confirmed",
        newStatus: "cancelled",
        changedBy: "admin",
      });
      const [created] = await tx
        .insert(bookings)
        .values({
          clientId: booking.clientId,
          masterId: booking.masterId,
          serviceId: booking.serviceId,
          startsAt: newStart,
          endsAt: new Date(newStart.getTime() + durationMin * 60_000),
          price: booking.price,
          status: "confirmed",
          source: booking.source,
          comment: booking.comment,
        })
        .returning({ id: bookings.id });
      await tx.insert(bookingStatusHistory).values({
        bookingId: created.id,
        oldStatus: null,
        newStatus: "confirmed",
        changedBy: "admin",
      });
      newBookingId = created.id;
    });
  } catch (error) {
    if (isExclusionViolation(error)) throw new BookingError(SLOT_TAKEN);
    throw error;
  }

  const settings = await getSalonSettings();
  const lang = client.language === "en" ? "en" : "ru";
  const text = clientMessage("rescheduled", lang, {
    service: escapeHtml(lang === "en" ? service.nameEn : service.nameRu),
    master: escapeHtml(lang === "en" ? master.nameEn : master.nameRu),
    old: formatDateTime(booking.startsAt, settings.timezone, lang),
    when: formatDateTime(newStart, settings.timezone, lang),
    address: escapeHtml((lang === "en" ? settings.addressEn : settings.addressRu) ?? ""),
    phone: escapeHtml(settings.phone ?? ""),
  });
  return { newBookingId, delivery: await sendToClient(client.telegramId, text) };
}

// --- Manual booking ----------------------------------------------------------------------

export type ManualBookingInput = {
  client: { id: string } | { name: string; phone: string };
  serviceId: string;
  masterId: string;
  startsAt: Date;
  comment: string | null;
};

export async function createManualBooking(input: ManualBookingInput): Promise<string> {
  try {
    return await db.transaction(async (tx) => {
      const [service] = await tx
        .select()
        .from(services)
        .where(and(eq(services.id, input.serviceId), eq(services.isActive, true)));
      if (!service) throw new BookingError("Услуга не найдена или скрыта.");
      const [link] = await tx
        .select({ masterId: masters.id })
        .from(masterServices)
        .innerJoin(masters, eq(masters.id, masterServices.masterId))
        .where(
          and(
            eq(masterServices.masterId, input.masterId),
            eq(masterServices.serviceId, service.id),
            eq(masters.isActive, true),
          ),
        );
      if (!link) throw new BookingError("Этот мастер не выполняет выбранную услугу.");

      await assertSlotFree(tx, input.masterId, service.durationMin, input.startsAt);
      const clientId = await resolveClient(tx, input.client);

      const [created] = await tx
        .insert(bookings)
        .values({
          clientId,
          masterId: input.masterId,
          serviceId: service.id,
          startsAt: input.startsAt,
          endsAt: new Date(input.startsAt.getTime() + service.durationMin * 60_000),
          price: service.price,
          status: "confirmed",
          source: "admin",
          comment: input.comment,
        })
        .returning({ id: bookings.id });
      await tx.insert(bookingStatusHistory).values({
        bookingId: created.id,
        oldStatus: null,
        newStatus: "confirmed",
        changedBy: "admin",
      });
      return created.id;
    });
  } catch (error) {
    if (isExclusionViolation(error)) throw new BookingError(SLOT_TAKEN);
    throw error;
  }
}

/** Existing client, or a client with the same phone (e.g. from the bot), or a new one. */
async function resolveClient(tx: Tx, client: ManualBookingInput["client"]): Promise<string> {
  if ("id" in client) {
    const [existing] = await tx.select({ id: clients.id }).from(clients).where(eq(clients.id, client.id));
    if (!existing) throw new BookingError("Клиент не найден.");
    return existing.id;
  }
  // Phones are compared by digits only: "+7 900 123-45-67" equals "79001234567"
  const [samePhone] = await tx
    .select({ id: clients.id })
    .from(clients)
    .where(
      and(
        isNotNull(clients.phone),
        sql`regexp_replace(${clients.phone}, '[^0-9]', '', 'g') = ${phoneDigits(client.phone)}`,
      ),
    )
    .orderBy(desc(sql`${clients.telegramId} is not null`))
    .limit(1);
  if (samePhone) return samePhone.id;
  const [created] = await tx
    .insert(clients)
    .values({ name: client.name, phone: client.phone, language: "ru" })
    .returning({ id: clients.id });
  return created.id;
}
