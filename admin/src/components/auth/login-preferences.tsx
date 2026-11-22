"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

import { LanguageSwitch } from "@/components/language-switch";
import { useI18n } from "@/i18n/client";
import { cn } from "@/lib/utils";

const noopSubscribe = () => () => {};

/** Language (RU / EN) and theme switches above the sign-in form. */
export function LoginPreferences({ className }: { className?: string }) {
  const { t } = useI18n();
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const isDark = mounted && resolvedTheme === "dark";

  return (
    <div className={cn("flex items-center justify-end gap-2", className)}>
      <LanguageSwitch />
      <button
        type="button"
        onClick={() => setTheme(isDark ? "light" : "dark")}
        aria-label={t("login.theme")}
        title={isDark ? t("nav.themeLight") : t("nav.themeDark")}
        className="theme-switch grid size-8 place-items-center rounded-full border border-gold/40 bg-card/70 text-gold hover:bg-primary/10 hover:text-primary"
      >
        {isDark ? <Sun className="size-4" aria-hidden /> : <Moon className="size-4" aria-hidden />}
      </button>
    </div>
  );
}
