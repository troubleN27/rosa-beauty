import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";

/** Current admin session or a redirect to /login. Used by pages and layouts. */
export async function requireSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/login");
  }
  return session;
}

export class UnauthorizedError extends Error {
  constructor() {
    super("Требуется вход");
  }
}

/** Session check for Server Actions: throws instead of redirecting. */
export async function assertSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    throw new UnauthorizedError();
  }
  return session;
}
