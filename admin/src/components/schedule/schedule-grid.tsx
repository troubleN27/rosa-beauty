import Link from "next/link";
import { cn } from "cn";

import { STATUS_STYLES } from "@/components/status-badge";
import type { BookingStatus } from "@/lib/constants";

export const SLOT_MINUTES = 30;
const PX_PER_MINUTE = 1.4; // 30 min = 42px

export type GridBooking = {
  id: string;
  startMin: number; // minutes from local midnight
  endMin: number;
  status: string;
  title: string;
  subtitle: string;
  time: string;
  href: string;
  accent?: string; // master colour in the "all masters" week view
};

export type GridColumn = {
  key: string;
  title: string;
  subtitle?: string;
  highlight?: boolean;
  /** Working interval in minutes from midnight; null = day off */
  work: { start: number; end: number; breakStart: number | null; breakEnd: number | null } | null;
  offLabel?: string;
  bookings: GridBooking[];
};

function minutesLabel(minutes: number) {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

/** Lays out overlapping blocks side by side (e.g. several masters in the week view). */
function layout(bookings: GridBooking[]) {
  const sorted = [...bookings].sort((a, b) => a.startMin - b.startMin || b.endMin - a.endMin);
  const placed: (GridBooking & { lane: number; lanes: number })[] = [];
  let group: (GridBooking & { lane: number; lanes: number })[] = [];
  let groupEnd = -1;
  const flush = () => {
    const lanes = Math.max(1, ...group.map((b) => b.lane + 1));
    group.forEach((b) => (b.lanes = lanes));
    placed.push(...group);
    group = [];
  };
  for (const booking of sorted) {
    if (booking.startMin >= groupEnd && group.length) flush();
    const used = new Set(group.filter((b) => b.endMin > booking.startMin).map((b) => b.lane));
    let lane = 0;
    while (used.has(lane)) lane++;
    group.push({ ...booking, lane, lanes: 1 });
    groupEnd = Math.max(groupEnd, booking.endMin);
  }
  if (group.length) flush();
  return placed;
}

export function ScheduleGrid({
  columns,
  startMin,
  endMin,
}: {
  columns: GridColumn[];
  startMin: number;
  endMin: number;
}) {
  const height = (endMin - startMin) * PX_PER_MINUTE;
  const rows = Array.from(
    { length: Math.ceil((endMin - startMin) / SLOT_MINUTES) },
    (_, i) => startMin + i * SLOT_MINUTES,
  );
  const y = (minutes: number) => (Math.min(Math.max(minutes, startMin), endMin) - startMin) * PX_PER_MINUTE;

  return (
    <div className="overflow-x-auto rounded-xl border bg-card">
      <div
        className="grid min-w-full"
        style={{ gridTemplateColumns: `3.5rem repeat(${columns.length}, minmax(9.5rem, 1fr))` }}
      >
        {/* header */}
        <div className="sticky left-0 z-10 border-b bg-card" />
        {columns.map((column) => (
          <div
            key={column.key}
            className={cn("border-b border-l px-3 py-2.5", column.highlight && "bg-accent/60")}
          >
            <p className="truncate text-sm font-medium">{column.title}</p>
            {column.subtitle && <p className="truncate text-xs text-muted-foreground">{column.subtitle}</p>}
          </div>
        ))}

        {/* time axis */}
        <div className="sticky left-0 z-10 bg-card" style={{ height }}>
          {rows.map((minutes) => (
            <div
              key={minutes}
              className="relative text-right text-[11px] text-muted-foreground tabular-nums"
              style={{ height: SLOT_MINUTES * PX_PER_MINUTE }}
            >
              {minutes % 60 === 0 && <span className="absolute -top-2 right-2">{minutesLabel(minutes)}</span>}
            </div>
          ))}
        </div>

        {columns.map((column) => (
          <div
            key={column.key}
            className="relative border-l bg-[repeating-linear-gradient(135deg,#f3ece8_0_6px,#f8f4f2_6px_12px)]"
            style={{ height }}
          >
            {column.work && (
              <div
                className="absolute inset-x-0 bg-card"
                style={{ top: y(column.work.start), height: y(column.work.end) - y(column.work.start) }}
              />
            )}
            {column.work?.breakStart != null && column.work.breakEnd != null && (
              <div
                className="absolute inset-x-0 flex items-center justify-center bg-[repeating-linear-gradient(135deg,#f3ece8_0_6px,#f8f4f2_6px_12px)] text-[11px] text-muted-foreground"
                style={{ top: y(column.work.breakStart), height: y(column.work.breakEnd) - y(column.work.breakStart) }}
              >
                Перерыв
              </div>
            )}
            {!column.work && (
              <p className="absolute inset-x-0 top-4 text-center text-xs text-muted-foreground">
                {column.offLabel ?? "Выходной"}
              </p>
            )}
            {rows.map((minutes) => (
              <div
                key={minutes}
                className={cn(
                  "pointer-events-none absolute inset-x-0 border-t",
                  minutes % 60 === 0 ? "border-border" : "border-border/40 border-dashed",
                )}
                style={{ top: y(minutes) }}
              />
            ))}
            {layout(column.bookings).map((booking) => {
              const styles = STATUS_STYLES[(booking.status as BookingStatus) in STATUS_STYLES ? (booking.status as BookingStatus) : "confirmed"];
              const top = y(booking.startMin);
              const blockHeight = Math.max(y(booking.endMin) - top - 2, 20);
              return (
                <Link
                  key={booking.id}
                  href={booking.href}
                  scroll={false}
                  className={cn(
                    "absolute overflow-hidden rounded-md border-l-[3px] px-2 py-1 text-xs leading-tight shadow-[0_1px_0_rgba(31,26,28,0.06)] transition-[filter] hover:brightness-95 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                    styles.block,
                  )}
                  style={{
                    top: top + 1,
                    height: blockHeight,
                    left: `calc(${(booking.lane / booking.lanes) * 100}% + 3px)`,
                    width: `calc(${100 / booking.lanes}% - 6px)`,
                    ...(booking.accent ? { borderLeftColor: booking.accent } : {}),
                  }}
                >
                  <span className="block font-semibold tabular-nums">{booking.time}</span>
                  <span className="block truncate">{booking.title}</span>
                  <span className="block truncate opacity-80">{booking.subtitle}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
