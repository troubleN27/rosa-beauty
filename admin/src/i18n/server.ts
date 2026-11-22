import "server-only";

import { cookies } from "next/headers";
import { cache } from "react";

import { createI18n, DEFAULT_LANG, isLang, LANG_COOKIE, type Lang } from "@/i18n";

/** Panel language from the cookie set by the language switch; Russian by default. */
export const getLang = cache(async (): Promise<Lang> => {
  const value = (await cookies()).get(LANG_COOKIE)?.value;
  return isLang(value) ? value : DEFAULT_LANG;
});

/** Translator for Server Components, one per request. */
export const getI18n = cache(async () => createI18n(await getLang()));
