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

/** Divider between sections: the logo's rose between two gold hairlines that fade out. */
export function Flourish({ className }: { className?: string }) {
  return (
    <span aria-hidden className={cn("flex w-36 items-center gap-2", className)}>
      <span className="h-px flex-1 bg-gradient-to-r from-transparent to-gold/70" />
      <Image src="/brand/rose.png" alt="" width={167} height={240} className="h-5 w-auto drop-shadow-[0_0_4px_rgb(216_170_98/0.45)]" />
      <span className="h-px flex-1 bg-gradient-to-l from-transparent to-gold/70" />
    </span>
  );
}
