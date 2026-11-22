import { cn } from "cn";

import { STATUS_LABELS, type BookingStatus } from "@/lib/constants";

/**
 * SPEC 6.2: confirmed — blue, completed — green, cancelled — grey, no-show — red.
 * The hues are toned to the salon palette and redefined for the dark theme in globals.css.
 */
export const STATUS_STYLES: Record<BookingStatus, { badge: string; dot: string }> = {
  confirmed: { badge: "status-confirmed", dot: "bg-(--status)" },
  completed: { badge: "status-completed", dot: "bg-(--status)" },
  cancelled: { badge: "status-cancelled", dot: "bg-(--status)" },
  no_show: { badge: "status-no-show", dot: "bg-(--status)" },
};

export function statusKey(status: string): BookingStatus {
  return (status in STATUS_LABELS ? status : "confirmed") as BookingStatus;
}

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const key = statusKey(status);
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center gap-1.5 rounded-full bg-[color-mix(in_oklab,var(--status)_14%,transparent)] px-2 text-xs font-medium whitespace-nowrap text-(--status)",
        STATUS_STYLES[key].badge,
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", STATUS_STYLES[key].dot)} aria-hidden />
      {STATUS_LABELS[key]}
    </span>
  );
}
