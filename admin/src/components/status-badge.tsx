import { cn } from "cn";

import { STATUS_LABELS, type BookingStatus } from "@/lib/constants";

/**
 * SPEC 6.2: confirmed — blue, completed — green, cancelled — grey, no-show — red.
 * The hues are toned to the salon palette and redefined for the dark theme in globals.css.
 */
export const STATUS_STYLES: Record<BookingStatus, { badge: string }> = {
  confirmed: { badge: "status-confirmed" },
  completed: { badge: "status-completed" },
  cancelled: { badge: "status-cancelled" },
  no_show: { badge: "status-no-show" },
};

export function statusKey(status: string): BookingStatus {
  return (status in STATUS_LABELS ? status : "confirmed") as BookingStatus;
}

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const key = statusKey(status);
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center rounded-full bg-[color-mix(in_oklab,var(--status)_10%,transparent)] px-2 text-xs font-medium whitespace-nowrap text-(--status)",
        STATUS_STYLES[key].badge,
        className,
      )}
    >
      {STATUS_LABELS[key]}
    </span>
  );
}
