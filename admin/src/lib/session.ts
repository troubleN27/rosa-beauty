import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { auth } from "@/lib/auth";

// One lookup per request: the layout and the page share it.
const getPageSession = cache(async () => auth.api.getSession({ headers: await headers() }));

/** Current admin session or a redirect to /login. Used by pages and layouts. */
export async function requireSession() {
  const session = await getPageSession();
  if (!session) {
    redirect("/login");
  }
  return session;
}

export class UnauthorizedError extends Error {
  constructor() {
    super("Unauthorized");
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
