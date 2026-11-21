/**
 * Create an admin account (public sign-up is disabled).
 *
 *   npm run create-admin -- --email owner@example.com --password "strong password" [--name "Анна"]
 */
import "dotenv/config";

import { parseArgs } from "node:util";

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { Pool } from "@neondatabase/serverless";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-serverless";

import * as schema from "../src/db/schema";

const MIN_PASSWORD_LENGTH = 8;

async function main() {
  const { values } = parseArgs({
    options: {
      email: { type: "string" },
      password: { type: "string" },
      name: { type: "string" },
    },
  });
  const email = values.email?.trim().toLowerCase();
  const password = values.password ?? "";
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Укажите корректный email: --email owner@example.com");
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`Пароль должен быть не короче ${MIN_PASSWORD_LENGTH} символов: --password "..."`);
  }
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set (admin/.env)");
  }

  const pool = new Pool({ connectionString: databaseUrl });
  const db = drizzle({ client: pool, schema });
  try {
    const existing = await db.query.user.findFirst({ where: eq(schema.user.email, email) });
    if (existing) {
      throw new Error(`Администратор ${email} уже существует`);
    }

    const auth = betterAuth({
      database: drizzleAdapter(db, { provider: "pg", schema }),
      emailAndPassword: { enabled: true, disableSignUp: true },
    });
    const ctx = await auth.$context;
    const hash = await ctx.password.hash(password);
    const user = await ctx.internalAdapter.createUser(
      { email, name: values.name?.trim() || "Администратор", emailVerified: true },
      { method: "email-password" },
    );
    await ctx.internalAdapter.linkAccount({
      userId: user.id,
      providerId: "credential",
      accountId: user.id,
      password: hash,
    });
    console.log(`Администратор создан: ${email}`);
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
