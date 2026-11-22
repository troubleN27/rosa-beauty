import { cn } from "@/lib/utils";

type Point = { day: string; label: string; weekday: string; count: number };

const MAX_BULBS = 10;

function bulbsFor(count: number, max: number) {
  if (count === 0) return 0;
  if (max <= MAX_BULBS) return count;
  return Math.max(1, Math.round((count / max) * MAX_BULBS));
}

/**
 * Bookings per day drawn as columns of vanity-mirror bulbs: one bulb per booking
 * (scaled down when a day has more than ten). The number sits above each column and the
 * day below it, in rows of their own, so nothing crosses the text.
 */
export function BookingsChart({ data }: { data: Point[] }) {
  const max = Math.max(0, ...data.map((point) => point.count));
  const todayIndex = data.length - 1;


  return (
    <div role="img" aria-label="Записи по дням за последние две недели" className="select-none">
      <div className="grid grid-cols-14 gap-0.5 sm:gap-1.5">
        {data.map((point, index) => {
          const bulbs = bulbsFor(point.count, max);
          const today = index === todayIndex;
          return (
            <div key={point.day} title={`${point.label}: ${point.count}`} className="group flex flex-col items-center">
              {/* the column grows from the shelf; its number rides on top of the last bulb */}
              <div
                                className="flex h-52 w-full flex-col items-center justify-end gap-1.5 rounded-t-full pt-2 pb-2 transition-colors duration-300 group-hover:bg-accent/50"
              >
                <span
                                    className={cn(
                    "mb-0.5 font-display text-lg leading-none font-semibold",
                    point.count === 0 ? "text-muted-foreground/40" : today ? "text-gold" : "text-foreground",
                  )}
                >
                  {point.count}
                </span>
                {bulbs === 0 ? (
                  <span className="bulb-socket size-3 rounded-full" aria-hidden />
                ) : (
                  Array.from({ length: bulbs }, (_, i) => (
                    <span
                      key={i}
                                            aria-hidden
                      className={cn("bulb size-3 rounded-full sm:size-3.5", today && "bulb-today")}
                      style={{ "--lit": (bulbs - 1 - i) / MAX_BULBS } as React.CSSProperties}
                    />
                  ))
                )}
              </div>
              <span className="h-px w-full bg-gradient-to-r from-transparent via-gold/60 to-transparent" aria-hidden />
              <span className={cn("mt-2 font-display text-sm leading-none tabular-nums", today && "font-semibold text-gold")}>
                {point.label}
              </span>
              <span className="mt-0.5 text-[10px] leading-none text-muted-foreground">{point.weekday}</span>
            </div>
          );
        })}
      </div>
      {max > MAX_BULBS && (
        <p className="mt-3 text-center text-xs text-muted-foreground">
          Одна лампочка ≈ {Math.ceil(max / MAX_BULBS)} записи
        </p>
      )}
    </div>
  );
}
