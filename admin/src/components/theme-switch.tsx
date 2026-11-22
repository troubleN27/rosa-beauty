"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

import { useI18n } from "@/i18n/client";
import { cn } from "@/lib/utils";

const noopSubscribe = () => () => {};

/**
 * Round button that switches between the "Boudoir" (light) and "Evening salon" (dark) themes.
 * "page" sits on the light page background, "sidebar" on the velvet menu.
 */
export function ThemeSwitch({ variant = "page", className }: { variant?: "page" | "sidebar"; className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const { t } = useI18n();
  // The stored theme is known only in the browser; show the moon until then.
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const isDark = mounted && resolvedTheme === "dark";
  const label = isDark ? t("nav.themeLight") : t("nav.themeDark");

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={label}
      title={label}
      className={cn(
        "theme-switch grid shrink-0 place-items-center rounded-full",
        variant === "sidebar"
          ? "size-7 bg-sidebar-accent/70 text-sidebar-primary ring-1 ring-sidebar-border hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          : "size-8 border border-gold/40 bg-card/70 text-gold hover:bg-primary/10 hover:text-primary",
        className,
      )}
    >
      {isDark ? <Sun className="size-4" aria-hidden /> : <Moon className="size-4" aria-hidden />}
    </button>
  );
}
