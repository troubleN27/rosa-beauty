import Image from "next/image";

import { cn } from "@/lib/utils";

/** Rating from 1 to 5 shown as roses: bloomed ones for the score, pale buds for the rest. */
export function RoseRating({ rating, className }: { rating: number; className?: string }) {
  const full = Math.round(rating);
  return (
    <span className={cn("inline-flex items-end gap-1", className)} role="img" aria-label={`Оценка ${rating} из 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Image
          key={i}
          src="/brand/rose.png"
          alt=""
          width={167}
          height={240}
          className={cn(
            "h-6 w-auto transition-[filter,opacity,transform] duration-500",
            i < full
              ? "saturate-125 drop-shadow-[0_0_4px_rgb(216_170_98/0.45)] dark:brightness-125"
              : "scale-90 opacity-25 grayscale",
          )}
        />
      ))}
    </span>
  );
}
