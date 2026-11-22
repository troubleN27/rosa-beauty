"use client";

import { useId } from "react";

import { useI18n } from "@/i18n/client";
import { cn } from "@/lib/utils";

// Slender five-pointed star with softened corners
const STAR = "M12.00 1.00 L14.88 8.64 L23.03 9.02 L16.66 14.11 L18.82 21.98 L12.00 17.50 L5.18 21.98 L7.34 14.11 L0.97 9.02 L9.12 8.64Z";

/**
 * Rating from 1 to 5 as slender gold-to-rose stars. A fractional average fills the last star partly;
 * empty ones are a fine gold outline.
 */
export function StarRating({ rating, size = 18, className }: { rating: number; size?: number; className?: string }) {
  const { t } = useI18n();
  const id = useId().replace(/:/g, "");
  return (
    <span className={cn("inline-flex items-center gap-1", className)} role="img" aria-label={t("rating.aria", { rating })}>
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
            <path d={STAR} fill="none" stroke="var(--gold)" strokeOpacity={0.55} strokeWidth={1} strokeLinejoin="round" />
            {fill > 0 && (
              <path
                d={STAR}
                fill={`url(#${id}-g)`}
                stroke={`url(#${id}-g)`}
                strokeWidth={1.2}
                strokeLinejoin="round"
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
