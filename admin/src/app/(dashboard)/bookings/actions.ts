"use server";

import { and, asc, eq, ilike, or, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import { clients, masterServices, masters, services } from "@/db/schema";
import { freeSlots } from "@/lib/availability";
import { BookingError, changeStatus, createManualBooking, rescheduleBooking } from "@/lib/bookings";
import { getSalonSettings } from "@/lib/data/settings";
import { formatTime } from "@/lib/format";
import { assertSession, UnauthorizedError } from "@/lib/session";
import type { DeliveryResult } from "@/lib/telegram";
import {
  freeSlotsSchema,
  newBookingSchema,
  rescheduleSchema,
  statusSchema,
} from "@/lib/validations/booking";

export type ActionResult<T = object> = ({ ok: true } & T) | { ok: false; error: string };

const GENERIC_ERROR = "Не удалось сохранить изменения. Попробуйте ещё раз.";

async function run<T extends object>(work: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    await assertSession();
    return { ok: true, ...(await work()) };
  } catch (error) {
    if (error instanceof UnauthorizedError) return { ok: false, error: "Сессия истекла. Войдите снова." };
    if (error instanceof BookingError) return { ok: false, error: error.message };
    console.error(error);
    return { ok: false, error: GENERIC_ERROR };
  }
}

function refresh() {
  revalidatePath("/", "layout");
}

export async function changeStatusAction(
  input: unknown,
): Promise<ActionResult<{ delivery: DeliveryResult | null }>> {
  return run(async () => {
    const { bookingId, status } = statusSchema.parse(input);
    const result = await changeStatus(bookingId, status);
    refresh();
    return result;
  });
}

export async function rescheduleAction(
  input: unknown,
): Promise<ActionResult<{ newBookingId: string; delivery: DeliveryResult }>> {
  return run(async () => {
    const { bookingId, startsAt } = rescheduleSchema.parse(input);
    const result = await rescheduleBooking(bookingId, new Date(startsAt));
    refresh();
    return result;
  });
}

export async function freeSlotsAction(
  input: unknown,
): Promise<ActionResult<{ slots: { value: string; label: string }[] }>> {
  return run(async () => {
    const { serviceId, masterId, day, excludeBookingId } = freeSlotsSchema.parse(input);
    const [service] = await db.select().from(services).where(eq(services.id, serviceId));
    if (!service) throw new BookingError("Услуга не найдена.");
    const settings = await getSalonSettings();
    const free = await freeSlots(db, settings, [masterId], service.durationMin, day, excludeBookingId);
    return {
      slots: [...free.keys()].map((ms) => ({
        value: new Date(ms).toISOString(),
        label: formatTime(new Date(ms), settings.timezone),
      })),
    };
  });
}

export async function createBookingAction(
  input: unknown,
): Promise<ActionResult<{ bookingId: string }>> {
  return run(async () => {
    const parsed = newBookingSchema.safeParse(input);
    if (!parsed.success) throw new BookingError(parsed.error.issues[0].message);
    const values = parsed.data;
    const bookingId = await createManualBooking({
      client:
        values.clientMode === "existing"
          ? { id: values.clientId! }
          : { name: values.clientName!, phone: values.clientPhone!.trim() },
      serviceId: values.serviceId,
      masterId: values.masterId,
      startsAt: new Date(values.startsAt),
      comment: values.comment || null,
    });
    refresh();
    return { bookingId };
  });
}

export async function searchClientsAction(
  query: string,
): Promise<ActionResult<{ clients: { id: string; name: string; phone: string | null; telegram: boolean }[] }>> {
  return run(async () => {
    const text = String(query ?? "").trim().slice(0, 64);
    if (text.length < 2) return { clients: [] };
    const digits = text.replace(/\D/g, "");
    const rows = await db
      .select({ id: clients.id, name: clients.name, phone: clients.phone, telegramId: clients.telegramId })
      .from(clients)
      .where(
        or(
          ilike(clients.name, `%${text.replace(/[%_\\]/g, "\\$&")}%`),
          digits.length >= 3
            ? sql`regexp_replace(coalesce(${clients.phone}, ''), '[^0-9]', '', 'g') like ${`%${digits}%`}`
            : undefined,
        ),
      )
      .orderBy(asc(clients.name))
      .limit(10);
    return {
      clients: rows.map((row) => ({
        id: row.id,
        name: row.name,
        phone: row.phone,
        telegram: row.telegramId !== null,
      })),
    };
  });
}

/** Masters who perform the service (active only), for the new-booking form. */
export async function serviceMastersAction(
  serviceId: string,
): Promise<ActionResult<{ masters: { id: string; name: string }[] }>> {
  return run(async () => {
    const id = z.uuid().parse(serviceId);
    const rows = await db
      .select({ id: masters.id, name: masters.nameRu })
      .from(masterServices)
      .innerJoin(masters, eq(masters.id, masterServices.masterId))
      .where(and(eq(masterServices.serviceId, id), eq(masters.isActive, true)))
      .orderBy(asc(masters.sort));
    return { masters: rows };
  });
}
