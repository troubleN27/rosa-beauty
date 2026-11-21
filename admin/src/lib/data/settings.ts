import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/db";
import { settings } from "@/db/schema";

export type SalonSettings = typeof settings.$inferSelect;

export async function getSalonSettings(): Promise<SalonSettings> {
  const row = await db.query.settings.findFirst({ where: eq(settings.id, 1) });
  if (!row) {
    throw new Error("Salon settings row is missing (run npm run db:seed)");
  }
  return row;
}
