"use server";

import { eq } from "drizzle-orm";

import { db } from "@/db";
import { settings } from "@/db/schema";
import { refreshAll, run, type ActionResult } from "@/lib/actions";
import { settingsSchema } from "@/lib/validations/settings";

export async function saveSettingsAction(input: unknown): Promise<ActionResult> {
  return run(async () => {
    const values = settingsSchema.parse(input);
    await db.update(settings).set(values).where(eq(settings.id, 1));
    refreshAll();
    return {};
  });
}
