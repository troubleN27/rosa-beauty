import "server-only";

import { eq } from "drizzle-orm";
import { cache } from "react";

import { db } from "@/db";
import { settings } from "@/db/schema";

export type SalonSettings = typeof settings.$inferSelect;

/** Salon settings; read once per request however many components ask for them. */
export const getSalonSettings = cache(async (): Promise<SalonSettings> => {
  const row = await db.query.settings.findFirst({ where: eq(settings.id, 1) });
  if (!row) {
    throw new Error("Salon settings row is missing (run npm run db:seed)");
  }
  return row;
});
