"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useState, useSyncExternalStore } from "react";

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
  // The icon blooms in only after a click, not when the page loads.
  const [clicked, setClicked] = useState(false);

  function toggle() {
    setClicked(true);
    setTheme(isDark ? "light" : "dark");
  }

  return (
    <button
      type="button"
      onClick={toggle}
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
      {/* keyed so the new icon mounts afresh and plays the bloom animation */}
      <span key={isDark ? "sun" : "moon"} className={cn("grid place-items-center", clicked && "theme-switch-icon")}>
        {isDark ? <Sun className="size-4" aria-hidden /> : <Moon className="size-4" aria-hidden />}
      </span>
    </button>
  );
}
