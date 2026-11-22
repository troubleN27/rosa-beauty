"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

import { SidebarMenuButton } from "@/components/ui/sidebar";
import { useI18n } from "@/i18n/client";

const noopSubscribe = () => () => {};

/** Switches between the "Boudoir" (light) and "Evening salon" (dark) themes. */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const { t } = useI18n();
  // The stored theme is known only in the browser; render a neutral label until then.
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const isDark = mounted && resolvedTheme === "dark";

  return (
    <SidebarMenuButton onClick={() => setTheme(isDark ? "light" : "dark")} aria-pressed={isDark}>
      {isDark ? <Sun aria-hidden /> : <Moon aria-hidden />}
      <span>{isDark ? t("nav.themeLight") : t("nav.themeDark")}</span>
    </SidebarMenuButton>
  );
}
