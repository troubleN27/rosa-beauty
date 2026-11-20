import "dotenv/config";

import { defineConfig } from "drizzle-kit";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set (admin/.env)");
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  // Migrations live at the repo root: single source of truth for the bot and the admin
  out: "../db/migrations",
  dbCredentials: { url: databaseUrl },
  strict: true,
  verbose: true,
});
