import "server-only";

import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";

import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set");
}

// WebSocket pool: supports interactive transactions (needed for reschedule/cancel)
const pool = new Pool({ connectionString: databaseUrl });

export const db = drizzle({ client: pool, schema });
