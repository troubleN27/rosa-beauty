"use client";

import { cn } from "cn";

import { useI18n } from "@/i18n/client";
import { STATUS_STYLES, statusKey } from "@/lib/status";

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const { t } = useI18n();
  const key = statusKey(status);
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center rounded-full bg-[color-mix(in_oklab,var(--status)_10%,transparent)] px-2 text-xs font-medium whitespace-nowrap text-(--status)",
        STATUS_STYLES[key].badge,
        className,
      )}
    >
      {t(`status.${key}`)}
    </span>
  );
}
