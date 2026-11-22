"use client";

import { useState } from "react";

import { LANGS, type Lang } from "@/i18n";
import { useI18n, useSetLang } from "@/i18n/client";
import { cn } from "@/lib/utils";

/**
 * RU / EN segmented switch with a sliding pill (springy, like the panel's switches).
 * "page" sits on the light page background, "sidebar" on the velvet menu.
 */
export function LanguageSwitch({ variant = "page", className }: { variant?: "page" | "sidebar"; className?: string }) {
  const { t, lang } = useI18n();
  const setLang = useSetLang();
  // The pill moves at once; the page re-renders in the new language a moment later.
  const [shown, setShown] = useState<Lang>(lang);
  const [lastLang, setLastLang] = useState(lang);
  if (lastLang !== lang) {
    setLastLang(lang);
    setShown(lang);
  }

  function choose(next: Lang) {
    if (next === shown) return;
    setShown(next);
    setLang(next);
  }

  const sidebar = variant === "sidebar";
  return (
    <div
      role="group"
      aria-label={t("nav.languageLabel")}
      className={cn(
        "lang-switch relative grid grid-cols-2 rounded-full p-0.5 text-xs font-semibold",
        sidebar ? "bg-sidebar-accent/70 ring-1 ring-sidebar-border" : "border border-gold/40 bg-card/70",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "lang-switch-pill absolute top-0.5 bottom-0.5 left-0.5 w-[calc(50%-2px)] rounded-full",
          sidebar ? "bg-sidebar-primary" : "bg-primary",
        )}
        style={{ transform: shown === "en" ? "translateX(100%)" : "translateX(0)" }}
      />
      {LANGS.map((item) => (
        <button
          key={item}
          type="button"
          lang={item}
          onClick={() => choose(item)}
          aria-pressed={item === shown}
          className={cn(
            "lang-switch-option relative z-10 rounded-full px-2.5 py-1 uppercase",
            item === shown
              ? sidebar
                ? "text-sidebar-primary-foreground"
                : "text-primary-foreground"
              : sidebar
                ? "text-sidebar-foreground/70 hover:text-sidebar-accent-foreground"
                : "text-muted-foreground hover:text-foreground",
          )}
        >
          {item}
        </button>
      ))}
    </div>
  );
}
