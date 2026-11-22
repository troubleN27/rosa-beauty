"use client";

import { useRouter } from "next/navigation";
import { createContext, useContext, useMemo } from "react";
import { z } from "zod";

import { createI18n, LANG_COOKIE, type I18n, type Lang, type MessageKey, type Params } from "@/i18n";

const I18nContext = createContext<I18n>(createI18n("ru"));

/** Gives client components the panel language chosen on the server. */
export function I18nProvider({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  const value = useMemo(() => {
    // zod's own messages (rules without a custom message) follow the panel language
    z.config(lang === "en" ? z.locales.en() : z.locales.ru());
    return createI18n(lang);
  }, [lang]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}

/** Inline translation for places that cannot call the hook, such as table column headers. */
export function T({ k, params }: { k: MessageKey; params?: Params }) {
  return <>{useI18n().t(k, params)}</>;
}

/** Switch the panel language: remember it in a cookie and re-render the page on the server. */
export function useSetLang() {
  const router = useRouter();
  return (lang: Lang) => {
    document.cookie = `${LANG_COOKIE}=${lang}; path=/; max-age=31536000; samesite=lax`;
    document.documentElement.lang = lang;
    router.refresh();
  };
}
