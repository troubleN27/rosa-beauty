import { cn } from "cn";

import { STATUS_LABELS, type BookingStatus } from "@/lib/constants";

/** SPEC 6.2: confirmed — blue, completed — green, cancelled — grey, no-show — red. */
export const STATUS_STYLES: Record<BookingStatus, { badge: string; block: string; dot: string }> = {
  confirmed: {
    badge: "bg-[#e7eefa] text-[#2f5aa0]",
    block: "border-l-[#3b6fb6] bg-[#eef3fb] text-[#1f3f73]",
    dot: "bg-[#3b6fb6]",
  },
  completed: {
    badge: "bg-[#e5f2ea] text-[#2f6b45]",
    block: "border-l-[#3f8a5a] bg-[#edf6f0] text-[#24513a]",
    dot: "bg-[#3f8a5a]",
  },
  cancelled: {
    badge: "bg-[#efecec] text-[#6b6366]",
    block: "border-l-[#9a9295] bg-[#f3f1f1] text-[#6b6366] line-through",
    dot: "bg-[#9a9295]",
  },
  no_show: {
    badge: "bg-[#f9e6e4] text-[#a8352e]",
    block: "border-l-[#c2413a] bg-[#fbeceb] text-[#7d2722]",
    dot: "bg-[#c2413a]",
  },
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const key = (status in STATUS_LABELS ? status : "confirmed") as BookingStatus;
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center gap-1.5 rounded-full px-2 text-xs font-medium whitespace-nowrap",
        STATUS_STYLES[key].badge,
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", STATUS_STYLES[key].dot)} aria-hidden />
      {STATUS_LABELS[key]}
    </span>
  );
}
