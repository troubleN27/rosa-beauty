"use client";

import { RotateCcw } from "lucide-react";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/client";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useI18n();
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <h1 className="font-display text-3xl font-semibold">{t("error.title")}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {t("error.text")}
      </p>
      <Button className="mt-6" variant="outline" onClick={reset}>
        <RotateCcw aria-hidden />
        {t("common.retry")}
      </Button>
    </div>
  );
}
