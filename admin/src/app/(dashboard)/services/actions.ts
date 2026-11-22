"use server";

import { count, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { categories, services } from "@/db/schema";
import { ActionError, isForeignKeyViolation, refreshAll, run, type ActionResult } from "@/lib/actions";
import { serviceHasBookings } from "@/lib/data/catalog";
import { categorySchema, serviceSchema } from "@/lib/validations/catalog";

export async function saveCategoryAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  return run(async () => {
    const { id, ...values } = categorySchema.parse(input);
    if (id) {
      const updated = await db.update(categories).set(values).where(eq(categories.id, id)).returning({ id: categories.id });
      if (!updated.length) throw new ActionError("errors.categoryNotFound");
      refreshAll();
      return { id };
    }
    const [created] = await db.insert(categories).values(values).returning({ id: categories.id });
    refreshAll();
    return { id: created.id };
  });
}

export async function deleteCategoryAction(id: unknown): Promise<ActionResult> {
  return run(async () => {
    const categoryId = z.uuid().parse(id);
    const [{ value }] = await db.select({ value: count() }).from(services).where(eq(services.categoryId, categoryId));
    if (value > 0) {
      throw new ActionError("errors.categoryHasServices");
    }
    await db.delete(categories).where(eq(categories.id, categoryId));
    refreshAll();
    return {};
  });
}

export async function saveServiceAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  return run(async () => {
    const { id, price, ...values } = serviceSchema.parse(input);
    const row = { ...values, price: price.toFixed(2) };
    const [category] = await db.select({ id: categories.id }).from(categories).where(eq(categories.id, values.categoryId));
    if (!category) throw new ActionError("errors.categoryNotFound");
    if (id) {
      const updated = await db.update(services).set(row).where(eq(services.id, id)).returning({ id: services.id });
      if (!updated.length) throw new ActionError("errors.serviceNotFoundRefresh");
      refreshAll();
      return { id };
    }
    const [created] = await db.insert(services).values(row).returning({ id: services.id });
    refreshAll();
    return { id: created.id };
  });
}

export async function setServiceActiveAction(input: unknown): Promise<ActionResult> {
  return run(async () => {
    const { id, isActive } = z.object({ id: z.uuid(), isActive: z.boolean() }).parse(input);
    await db.update(services).set({ isActive }).where(eq(services.id, id));
    refreshAll();
    return {};
  });
}

export async function deleteServiceAction(id: unknown): Promise<ActionResult> {
  return run(async () => {
    const serviceId = z.uuid().parse(id);
    if (await serviceHasBookings(serviceId)) {
      throw new ActionError("errors.serviceHasBookings");
    }
    try {
      // master_services rows are removed by ON DELETE CASCADE
      await db.delete(services).where(eq(services.id, serviceId));
    } catch (error) {
      if (isForeignKeyViolation(error)) throw new ActionError("errors.serviceHasBookings");
      throw error;
    }
    refreshAll();
    return {};
  });
}
