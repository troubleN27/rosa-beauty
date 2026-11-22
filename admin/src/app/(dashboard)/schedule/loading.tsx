"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/i18n/client";

export default function Loading() {
  const { t } = useI18n();
  return (
    <div aria-busy="true" aria-label={t("common.loading")}>
      <Skeleton className="mb-2 h-7 w-40" />
      <Skeleton className="mb-6 h-4 w-56" />
      <Skeleton className="mb-4 h-8 w-96 max-w-full" />
      <Skeleton className="h-[32rem] w-full rounded-xl" />
    </div>
  );
}
