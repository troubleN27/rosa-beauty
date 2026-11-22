"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/i18n/client";

/** Loading placeholder for list and detail pages. */
export function ListSkeleton({ rows = 6 }: { rows?: number }) {
  const { t } = useI18n();
  return (
    <div aria-busy="true" aria-label={t("common.loading")}>
      <Skeleton className="mb-2 h-7 w-48" />
      <Skeleton className="mb-6 h-4 w-72 max-w-full" />
      <Skeleton className="mb-4 h-8 w-80 max-w-full" />
      <div className="space-y-px overflow-hidden rounded-xl border bg-card">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="hidden h-4 w-24 sm:block" />
          </div>
        ))}
      </div>
    </div>
  );
}
