import { useId } from "react";

import { cn } from "@/lib/utils";

// Four-pointed glint, like light catching a mirror
const GLINT = "M12 0C12.9 7.2 16.8 11.1 24 12C16.8 12.9 12.9 16.8 12 24C11.1 16.8 7.2 12.9 0 12C7.2 11.1 11.1 7.2 12 0Z";

/**
 * Rating from 1 to 5 as gold-to-rose glints. A fractional average fills the last glint partly;
 * empty ones are a fine gold outline.
 */
export function StarRating({ rating, size = 18, className }: { rating: number; size?: number; className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <span className={cn("inline-flex items-center gap-1", className)} role="img" aria-label={`Оценка ${rating} из 5`}>
      {Array.from({ length: 5 }, (_, i) => {
        const fill = Math.min(1, Math.max(0, rating - i));
        return (
          <svg key={i} viewBox="0 0 24 24" width={size} height={size} aria-hidden className="overflow-visible">
            <defs>
              <linearGradient id={`${id}-g`} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="var(--gold)" />
                <stop offset="100%" stopColor="var(--primary)" />
              </linearGradient>
              <clipPath id={`${id}-c${i}`}>
                <rect x="0" y="0" width={24 * fill} height="24" />
              </clipPath>
            </defs>
            <path d={GLINT} fill="none" stroke="var(--gold)" strokeOpacity={0.55} strokeWidth={1} />
            {fill > 0 && (
              <path
                d={GLINT}
                fill={`url(#${id}-g)`}
                clipPath={`url(#${id}-c${i})`}
                style={{ filter: "drop-shadow(0 0 3px color-mix(in oklab, var(--gold) 60%, transparent))" }}
              />
            )}
          </svg>
        );
      })}
    </span>
  );
}
