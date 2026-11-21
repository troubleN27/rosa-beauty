import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

/** Server-side pagination links that keep the other query parameters. */
export function Pagination({
  basePath,
  params,
  page,
  pages,
}: {
  basePath: string;
  params: Record<string, string | undefined>;
  page: number;
  pages: number;
}) {
  if (pages <= 1) return null;
  const href = (target: number) => {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) if (value) query.set(key, value);
    if (target > 1) query.set("page", String(target));
    const text = query.toString();
    return text ? `${basePath}?${text}` : basePath;
  };
  return (
    <nav className="mt-4 flex items-center justify-between text-sm" aria-label="Страницы">
      <span className="text-muted-foreground">
        Страница {page} из {pages}
      </span>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" nativeButton={false} disabled={page <= 1} render={<Link href={href(page - 1)} aria-disabled={page <= 1} />}>
          <ChevronLeft aria-hidden />
          Назад
        </Button>
        <Button variant="outline" size="sm" nativeButton={false} disabled={page >= pages} render={<Link href={href(page + 1)} aria-disabled={page >= pages} />}>
          Дальше
          <ChevronRight aria-hidden />
        </Button>
      </div>
    </nav>
  );
}
