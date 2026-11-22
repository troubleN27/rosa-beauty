import "server-only";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";

import { assertSession, UnauthorizedError } from "@/lib/session";

export type ActionResult<T = object> = ({ ok: true } & T) | { ok: false; error: string };

/** An error whose message (a dictionary key, see i18n) is safe and useful to show to the admin. */
export class ActionError extends Error {}

const GENERIC_ERROR = "errors.generic";

/**
 * Wraps every Server Action: checks the session first, turns known errors into
 * readable messages and never leaks internal details to the client.
 */
export async function run<T extends object>(work: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    await assertSession();
    return { ok: true, ...(await work()) };
  } catch (error) {
    if (error instanceof UnauthorizedError) return { ok: false, error: "errors.sessionExpired" };
    if (error instanceof ActionError) return { ok: false, error: error.message };
    if (error instanceof ZodError) return { ok: false, error: error.issues[0]?.message ?? GENERIC_ERROR };
    console.error(error);
    return { ok: false, error: GENERIC_ERROR };
  }
}

/** Data changed: refresh every admin page (they are all dynamic). */
export function refreshAll() {
  revalidatePath("/", "layout");
}

const FOREIGN_KEY_VIOLATION = "23503";

export function isForeignKeyViolation(error: unknown): boolean {
  let current: unknown = error;
  for (let depth = 0; current && depth < 4; depth++) {
    if (typeof current === "object" && "code" in current && current.code === FOREIGN_KEY_VIOLATION) {
      return true;
    }
    current = (current as { cause?: unknown }).cause;
  }
  return false;
}
