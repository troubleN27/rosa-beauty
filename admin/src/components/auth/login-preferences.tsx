"use client";

import { LanguageSwitch } from "@/components/language-switch";
import { ThemeSwitch } from "@/components/theme-switch";
import { cn } from "@/lib/utils";

/** Language (RU / EN) and theme switches above the sign-in form. */
export function LoginPreferences({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center justify-end gap-2", className)}>
      <LanguageSwitch />
      <ThemeSwitch />
    </div>
  );
}
