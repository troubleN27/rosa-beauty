import Image from "next/image";

import { cn } from "@/lib/utils";

/** Rose mark with the salon wordmark set in the display serif. */
export function BrandMark({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <Image src="/brand/rose.png" alt="" width={22} height={32} className="h-8 w-auto shrink-0" priority />
      <span className="flex flex-col leading-none">
        <span className="font-display text-[22px] font-semibold tracking-wide">Rosa Beauty</span>
        {!compact && <span className="mt-1 text-[11px] tracking-wide opacity-60">панель салона</span>}
      </span>
    </span>
  );
}

/** Ornamental flourish used between sections, drawn after the frame of the logo. */
export function Flourish({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 12" aria-hidden className={cn("h-3 w-28 text-gold", className)} fill="none">
      <path d="M0 6h46M74 6h46" stroke="currentColor" strokeWidth="0.75" />
      <path
        d="M60 1.5c2.4 2.2 2.4 6.8 0 9-2.4-2.2-2.4-6.8 0-9Zm-9 4.5c3-1.8 6-1.8 9 0-3 1.8-6 1.8-9 0Zm18 0c-3-1.8-6-1.8-9 0 3 1.8 6 1.8 9 0Z"
        stroke="currentColor"
        strokeWidth="0.75"
      />
    </svg>
  );
}
