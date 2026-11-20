import "dotenv/config";

import { readFile } from "node:fs/promises";
import path from "node:path";

import { Pool } from "@neondatabase/serverless";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set (admin/.env)");
  }

  const seedPath = path.resolve(process.cwd(), "..", "db", "seed.sql");
  const seedSql = await readFile(seedPath, "utf8");

  const pool = new Pool({ connectionString: databaseUrl });
  try {
    await pool.query(seedSql);
    console.log(`Seed applied: ${seedPath}`);
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
