import { Coffee } from "lucide-react";
import Link from "next/link";
import { STATUS_STYLES, statusKey } from "@/components/status-badge";
import { STATUS_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";

const SLOT_MINUTES = 30;
const PX_PER_MINUTE = 1.6; // 30 min = 48px
const PAD = 18; // room above the first and below the last hour label
const COMPACT_HEIGHT = 50;

export type GridBooking = {
  id: string;
  startMin: number; // minutes from local midnight
  endMin: number;
  status: string;
  title: string;
  subtitle: string;
  time: string;
  href: string;
  categoryName: string;
};

export type GridColumn = {
  key: string;
  title: string;
  subtitle?: string;
  /** Initials of the master, or the day number in the week view */
  badge?: string;
  badgeKind?: "monogram" | "day";
  highlight?: boolean;
  /** Draw the "now" line in this column */
  isToday?: boolean;
  /** Share of the shift taken by bookings, 0..1; null on a day off, undefined when not meaningful */
  load?: number | null;
  /** Working interval in minutes from midnight; null = day off */
  work: { start: number; end: number; breakStart: number | null; breakEnd: number | null } | null;
  offLabel?: string;
  bookings: GridBooking[];
};

function clock(minutes: number) {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

function bookingsLabel(count: number) {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return `${count} запись`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${count} записи`;
  return `${count} записей`;
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

/** Half-ring gauge of how full the shift is. */
function LoadGauge({ load }: { load: number }) {
  const percent = Math.round(load * 100);
  return (
    <span className="flex items-end gap-1.5" title={`Загрузка смены ${percent}%`}>
      <svg viewBox="0 0 40 22" className="h-[18px] w-8" aria-hidden>
        <path d="M4 20 A16 16 0 0 1 36 20" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="text-gold/25" />
        <path
          d="M4 20 A16 16 0 0 1 36 20"
          fill="none"
          strokeWidth="3"
          strokeLinecap="round"
          pathLength={100}
          strokeDasharray={`${percent} 100`}
          className="stroke-primary"
        />
      </svg>
      <span className="font-display text-base leading-none font-semibold tabular-nums">{percent}%</span>
    </span>
  );
}

/**
 * "Mirror gallery" schedule: a gold thread with hour beads on the left, an arched mirror
 * heading each column, the shift as a pane of glass on velvet, breaks as a gold ribbon and
 * bookings as cards hung at their time. Nothing is drawn across text: hour rules stay faint
 * and behind the cards, the "now" time sits in its own chip on the thread.
 */
export function ScheduleGrid({
  columns,
  startMin,
  endMin,
  nowMin,
}: {
  columns: GridColumn[];
  startMin: number;
  endMin: number;
  /** Current salon-local time in minutes, for the "now" line */
  nowMin?: number;
}) {
  const height = (endMin - startMin) * PX_PER_MINUTE + PAD * 2;
  const marks = Array.from({ length: (endMin - startMin) / SLOT_MINUTES + 1 }, (_, i) => startMin + i * SLOT_MINUTES);
  const y = (minutes: number) => PAD + (Math.min(Math.max(minutes, startMin), endMin) - startMin) * PX_PER_MINUTE;
  const showNow =
    nowMin !== undefined && nowMin > startMin && nowMin < endMin && columns.some((column) => column.isToday);
  const firstToday = columns.findIndex((column) => column.isToday);


  return (
    <div className="overflow-hidden rounded-2xl border bg-card">
      <div className="snap-x snap-mandatory overflow-x-auto md:snap-none">
        <div
          className="grid min-w-full"
          style={{ gridTemplateColumns: `4.75rem repeat(${columns.length}, minmax(${columns.length > 5 ? "7.5rem" : "10.5rem"}, 1fr))` }}
        >
          {/* corner */}
          <div className="sticky left-0 z-30 border-b border-gold/25 bg-card" />

          {/* arched heads */}
          {columns.map((column) => (
            <div key={column.key} className="snap-start scroll-ml-[4.75rem] border-b border-gold/25 px-2 pt-3 pb-3">
              <div
                className={cn(
                  "sched-arch flex h-[124px] flex-col items-center justify-end px-2 pb-2.5 text-center",
                  column.highlight && "sched-arch-today",
                )}
              >
                {column.badge && (
                  <span
                    className={cn(
                      "font-display leading-none font-semibold text-gold",
                      column.badgeKind === "day" ? "text-4xl" : "text-[28px] tracking-wide",
                    )}
                  >
                    {column.badge}
                  </span>
                )}
                <span className={cn("mt-1.5 w-full truncate font-medium", column.badgeKind === "day" ? "text-[13px]" : "text-sm")}>
                  {column.title}
                </span>
                {column.subtitle && <span className="w-full truncate text-xs text-muted-foreground">{column.subtitle}</span>}
                <span className="mt-2 flex min-h-[18px] items-center gap-2 text-xs text-muted-foreground">
                  {column.load != null && <LoadGauge load={column.load} />}
                  <span>{column.work ? bookingsLabel(column.bookings.length) : (column.offLabel ?? "Выходной")}</span>
                </span>
              </div>
            </div>
          ))}

          {/* the gold thread with hour beads */}
          <div className="sticky left-0 z-20 bg-card" style={{ height }}>
            <span className="sched-thread absolute top-0 right-[11px] bottom-0 w-px" aria-hidden />
            {marks.map((minutes) => {
              const hour = minutes % 60 === 0;
              const nearNow = showNow && Math.abs(minutes - (nowMin ?? 0)) < 14;
              return (
                <div key={minutes} className="absolute inset-x-0" style={{ top: y(minutes) }}>
                  <span
                    aria-hidden
                    className={cn(
                      "sched-bead absolute -translate-y-1/2 rounded-full",
                      hour ? "right-[8px] size-[7px]" : "right-[10px] size-[3px] opacity-70",
                    )}
                  />
                  {hour && !nearNow && (
                    <span className="absolute right-5 -translate-y-1/2 font-display text-[15px] leading-none font-medium tabular-nums">
                      {clock(minutes)}
                    </span>
                  )}
                </div>
              );
            })}
            {showNow && (
              <span
                className="sched-now-chip absolute right-1 z-10 -translate-y-1/2 rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabular-nums"
                style={{ top: y(nowMin!) }}
              >
                {clock(nowMin!)}
              </span>
            )}
          </div>

          {/* columns */}
          {columns.map((column, columnIndex) => (
            <div key={column.key} className="sched-velvet relative border-l border-gold/15" style={{ height }}>
              {marks
                .filter((minutes) => minutes % 60 === 0)
                .map((minutes) => (
                  <span
                    key={minutes}
                    aria-hidden
                    className="pointer-events-none absolute inset-x-0 border-t border-dashed border-border/45"
                    style={{ top: y(minutes) }}
                  />
                ))}

              {column.work && (
                <div
                  className="sched-glass absolute inset-x-1.5"
                  style={{ top: y(column.work.start), height: y(column.work.end) - y(column.work.start) }}
                />
              )}

              {column.work?.breakStart != null && column.work.breakEnd != null && (
                <div
                  className={cn(
                    "sched-break absolute inset-x-3 flex items-center justify-center gap-1.5 px-2 text-center",
                    y(column.work.breakEnd) - y(column.work.breakStart) >= 56 && "flex-col gap-0.5",
                  )}
                  style={{
                    top: y(column.work.breakStart) + 3,
                    height: Math.max(y(column.work.breakEnd) - y(column.work.breakStart) - 6, 22),
                  }}
                >
                  <Coffee className="size-3.5 shrink-0 text-gold" aria-hidden />
                  <span className="text-xs font-medium text-foreground/80">Перерыв</span>
                  <span className="font-display text-sm leading-none tabular-nums">
                    {clock(column.work.breakStart)}–{clock(column.work.breakEnd)}
                  </span>
                </div>
              )}

              {showNow && column.isToday && (
                <div
                  aria-hidden
                  data-rose={columnIndex === firstToday ? "true" : undefined}
                  className="sched-now pointer-events-none absolute inset-x-0"
                  style={{ top: y(nowMin!) }}
                />
              )}

              {layout(column.bookings).map((booking) => {
                const status = statusKey(booking.status);
                const top = y(booking.startMin);
                const blockHeight = Math.max(y(booking.endMin) - top - 3, 24);
                const compact = blockHeight < COMPACT_HEIGHT;
                // side-by-side cards in a narrow column keep only the start time; the rest is in the tooltip
                const narrow = booking.lanes > 1 && columns.length > 5;
                return (
                  <Link
                    key={booking.id}
                    href={booking.href}
                    scroll={false}
                    title={`${booking.time} ${booking.title}, ${booking.subtitle} (${booking.categoryName}: ${STATUS_LABELS[status].toLowerCase()})`}
                    className={cn(
                      "sched-card absolute z-10 overflow-hidden px-2.5 text-xs leading-tight focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                      narrow ? "px-1.5 py-1.5" : compact ? "flex items-center gap-1.5 py-0" : "py-1.5",
                      STATUS_STYLES[status].badge,
                      status === "no_show" && "opacity-80",
                    )}
                    data-status={status}
                    style={{
                      top: top + 1.5,
                      height: blockHeight,
                      left: `calc(${(booking.lane / booking.lanes) * 100}% + 8px)`,
                      width: `calc(${100 / booking.lanes}% - 16px)`,
                    }}
                  >
                    {narrow ? (
                      <span className="block font-display text-sm leading-none font-semibold whitespace-nowrap tabular-nums">
                        {booking.time.split("–")[0]}
                      </span>
                    ) : compact ? (
                      <>
                        <span className="shrink-0 font-display text-sm font-semibold tabular-nums">
                          {booking.time.split("–")[0]}
                        </span>
                        <span className="min-w-0 truncate font-medium">{booking.title}</span>
                      </>
                    ) : (
                      <>
                        <span className="flex items-center gap-1.5">
                          <span className="font-display text-[15px] leading-none font-semibold whitespace-nowrap tabular-nums">
                            {booking.time}
                          </span>
                          {status !== "confirmed" && (
                            <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">
                              {STATUS_LABELS[status].toLowerCase()}
                            </span>
                          )}
                        </span>
                        <span className="mt-1 block truncate font-medium">{booking.title}</span>
                        <span className="block truncate text-muted-foreground">{booking.subtitle}</span>
                      </>
                    )}
                    {status === "confirmed" && <span className="sr-only">{STATUS_LABELS[status]}</span>}
                  </Link>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
