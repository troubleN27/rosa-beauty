"use client";

import { RotateCcw } from "lucide-react";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <h1 className="text-lg font-semibold">Не удалось загрузить страницу</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Проверьте подключение к интернету и попробуйте ещё раз. Если ошибка повторяется, обновите страницу через минуту.
      </p>
      <Button className="mt-6" variant="outline" onClick={reset}>
        <RotateCcw aria-hidden />
        Повторить
      </Button>
    </div>
  );
}
