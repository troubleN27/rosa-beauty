import { z } from "zod";

// Russian default messages for any rule without a custom message
z.config(z.locales.ru());

/**
 * Optional text: "" becomes null. Accepts null as well, so the same schema validates
 * both the raw form input (client) and its own output sent to a Server Action.
 */
export const optionalText = (max: number) =>
  z.preprocess(
    (value) => value ?? "",
    z
      .string()
      .trim()
      .max(max, `Не длиннее ${max} символов`)
      .transform((value) => value || null),
  );

/** Optional number from a text input: "" or null becomes null (never 0). */
export const optionalNumber = <T extends z.ZodType<number>>(schema: T) =>
  z.preprocess((value) => (value === "" || value === null || value === undefined ? null : value), schema.nullable());
