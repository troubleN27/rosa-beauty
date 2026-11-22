"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

import { LANGS } from "@/i18n";
import { useI18n, useSetLang } from "@/i18n/client";
import { cn } from "@/lib/utils";

const noopSubscribe = () => () => {};

/** Language (RU / EN) and theme switches above the sign-in form. */
export function LoginPreferences({ className }: { className?: string }) {
  const { t, lang } = useI18n();
  const setLang = useSetLang();
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const isDark = mounted && resolvedTheme === "dark";

  return (
    <div className={cn("flex items-center justify-end gap-2", className)}>
      <div
        role="group"
        aria-label={t("nav.languageLabel")}
        className="flex rounded-full border border-gold/40 bg-card/70 p-0.5 text-xs font-medium"
      >
        {LANGS.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => item !== lang && setLang(item)}
            aria-pressed={item === lang}
            className={cn(
              "rounded-full px-2.5 py-1 uppercase transition-colors duration-300",
              item === lang ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {item}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={() => setTheme(isDark ? "light" : "dark")}
        aria-label={t("login.theme")}
        title={isDark ? t("nav.themeLight") : t("nav.themeDark")}
        className="grid size-8 place-items-center rounded-full border border-gold/40 bg-card/70 text-gold transition-colors duration-300 hover:bg-primary/10 hover:text-primary"
      >
        {isDark ? <Sun className="size-4" aria-hidden /> : <Moon className="size-4" aria-hidden />}
      </button>
    </div>
  );
}
