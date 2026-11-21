"use server";

import { and, asc, eq, gte, inArray, lt } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { bookings, clients, masterServices, masters, services, timeOff, workingHours } from "@/db/schema";
import { ActionError, refreshAll, run, type ActionResult } from "@/lib/actions";
import { dayBounds } from "@/lib/availability";
import { deleteBlobQuietly, hasImageSignature, isBlobConfigured, isOwnBlobUrl } from "@/lib/blob";
import { masterHasHistory } from "@/lib/data/masters";
import { getSalonSettings } from "@/lib/data/settings";
import { formatDateTime } from "@/lib/format";
import { masterSchema, scheduleSchema, timeOffSchema } from "@/lib/validations/master";

const idSchema = z.uuid();

async function ensureMaster(id: string) {
  const [master] = await db.select().from(masters).where(eq(masters.id, id));
  if (!master) throw new ActionError("Мастер не найден. Обновите страницу.");
  return master;
}

// --- Profile ---------------------------------------------------------------------------

export async function createMasterAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  return run(async () => {
    const values = masterSchema.parse(input);
    const [created] = await db.insert(masters).values(values).returning({ id: masters.id });
    refreshAll();
    return { id: created.id };
  });
}

export async function updateMasterAction(id: unknown, input: unknown): Promise<ActionResult> {
  return run(async () => {
    const masterId = idSchema.parse(id);
    const values = masterSchema.parse(input);
    await ensureMaster(masterId);
    await db.update(masters).set(values).where(eq(masters.id, masterId));
    refreshAll();
    return {};
  });
}

export async function deleteMasterAction(id: unknown): Promise<ActionResult> {
  return run(async () => {
    const masterId = idSchema.parse(id);
    const master = await ensureMaster(masterId);
    if (await masterHasHistory(masterId)) {
      throw new ActionError("У мастера есть записи или отзывы — его можно только скрыть.");
    }
    // services, schedule and days off are removed by ON DELETE CASCADE
    await db.delete(masters).where(eq(masters.id, masterId));
    await deleteBlobQuietly(master.photoUrl);
    refreshAll();
    return {};
  });
}

// --- Photo -------------------------------------------------------------------------------

export async function savePhotoAction(id: unknown, url: unknown): Promise<ActionResult> {
  return run(async () => {
    const masterId = idSchema.parse(id);
    const photoUrl = z.string().max(1000).parse(url);
    if (!isBlobConfigured()) throw new ActionError("Хранилище фото не подключено (BLOB_READ_WRITE_TOKEN).");
    if (!isOwnBlobUrl(photoUrl)) throw new ActionError("Файл загружен не в хранилище салона.");
    if (!(await hasImageSignature(photoUrl))) {
      await deleteBlobQuietly(photoUrl);
      throw new ActionError("Файл не похож на изображение JPG, PNG или WebP.");
    }
    const master = await ensureMaster(masterId);
    await db.update(masters).set({ photoUrl }).where(eq(masters.id, masterId));
    if (master.photoUrl !== photoUrl) await deleteBlobQuietly(master.photoUrl);
    refreshAll();
    return {};
  });
}

export async function removePhotoAction(id: unknown): Promise<ActionResult> {
  return run(async () => {
    const masterId = idSchema.parse(id);
    const master = await ensureMaster(masterId);
    await db.update(masters).set({ photoUrl: null }).where(eq(masters.id, masterId));
    await deleteBlobQuietly(master.photoUrl);
    refreshAll();
    return {};
  });
}

// --- Services ------------------------------------------------------------------------------

export async function setMasterServicesAction(id: unknown, serviceIds: unknown): Promise<ActionResult> {
  return run(async () => {
    const masterId = idSchema.parse(id);
    const ids = [...new Set(z.array(z.uuid()).max(500).parse(serviceIds))];
    await ensureMaster(masterId);
    if (ids.length) {
      const existing = await db.select({ id: services.id }).from(services).where(inArray(services.id, ids));
      if (existing.length !== ids.length) throw new ActionError("Часть услуг не найдена. Обновите страницу.");
    }
    await db.transaction(async (tx) => {
      await tx.delete(masterServices).where(eq(masterServices.masterId, masterId));
      if (ids.length) {
        await tx.insert(masterServices).values(ids.map((serviceId) => ({ masterId, serviceId })));
      }
    });
    refreshAll();
    return {};
  });
}

// --- Weekly schedule -------------------------------------------------------------------------

export async function saveScheduleAction(input: unknown): Promise<ActionResult> {
  return run(async () => {
    const { masterId, days } = scheduleSchema.parse(input);
    await ensureMaster(masterId);
    const rows = days
      .filter((day) => day.works)
      .map((day) => ({
        masterId,
        weekday: day.weekday,
        startTime: day.start,
        endTime: day.end,
        breakStart: day.breakStart || null,
        breakEnd: day.breakEnd || null,
      }));
    await db.transaction(async (tx) => {
      await tx.delete(workingHours).where(eq(workingHours.masterId, masterId));
      if (rows.length) await tx.insert(workingHours).values(rows);
    });
    refreshAll();
    return {};
  });
}

// --- Days off ----------------------------------------------------------------------------------

export async function addTimeOffAction(
  input: unknown,
): Promise<ActionResult<{ conflicts: string[] }>> {
  return run(async () => {
    const values = timeOffSchema.parse(input);
    await ensureMaster(values.masterId);
    const settings = await getSalonSettings();
    await db.insert(timeOff).values(values);

    // Existing bookings are not cancelled automatically: show them to the admin
    const start = dayBounds(values.dateFrom, settings.timezone).start;
    const end = dayBounds(values.dateTo, settings.timezone).end;
    const conflicts = await db
      .select({ startsAt: bookings.startsAt, client: clients.name })
      .from(bookings)
      .innerJoin(clients, eq(clients.id, bookings.clientId))
      .where(
        and(
          eq(bookings.masterId, values.masterId),
          eq(bookings.status, "confirmed"),
          gte(bookings.startsAt, start),
          lt(bookings.startsAt, end),
        ),
      )
      .orderBy(asc(bookings.startsAt));
    refreshAll();
    return {
      conflicts: conflicts.map((c) => `${formatDateTime(c.startsAt, settings.timezone)} — ${c.client}`),
    };
  });
}

export async function deleteTimeOffAction(id: unknown): Promise<ActionResult> {
  return run(async () => {
    const timeOffId = idSchema.parse(id);
    await db.delete(timeOff).where(eq(timeOff.id, timeOffId));
    refreshAll();
    return {};
  });
}
