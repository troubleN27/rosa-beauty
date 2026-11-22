"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/i18n/client";

export default function DashboardLoading() {
  const { t } = useI18n();
  return (
    <div aria-busy="true" aria-label={t("common.loading")}>
      <Skeleton className="mb-2 h-7 w-56" />
      <Skeleton className="mb-6 h-4 w-40" />
      <Skeleton className="mb-6 h-24 w-full rounded-xl" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    </div>
  );
}
