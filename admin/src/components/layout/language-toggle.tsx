"use client";

import { Languages } from "lucide-react";

import { SidebarMenuButton } from "@/components/ui/sidebar";
import { useI18n, useSetLang } from "@/i18n/client";

/** Menu item that switches the panel between Russian and English. */
export function LanguageToggle() {
  const { t, lang } = useI18n();
  const setLang = useSetLang();
  return (
    <SidebarMenuButton onClick={() => setLang(lang === "ru" ? "en" : "ru")} lang={lang === "ru" ? "en" : "ru"}>
      <Languages aria-hidden />
      <span>{t("nav.switchLanguage")}</span>
    </SidebarMenuButton>
  );
}
