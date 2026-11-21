import { Star } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { z } from "zod";

import { PageHeader } from "@/components/layout/page-header";
import { Pagination } from "@/components/pagination";
import { RatingFilter } from "@/components/reviews/rating-filter";
import { listReviews, REVIEWS_PAGE_SIZE } from "@/lib/data/clients";
import { getSalonSettings } from "@/lib/data/settings";
import { formatDay } from "@/lib/format";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = { title: "Отзывы" };

const paramsSchema = z.object({
  rating: z.enum(["1", "2", "3", "4", "5", "low"]).optional().catch(undefined),
  page: z.coerce.number().int().min(1).catch(1),
});

function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex gap-0.5" role="img" aria-label={`Оценка ${rating} из 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={i < rating ? "size-4 fill-current text-primary" : "size-4 text-border"}
          aria-hidden
        />
      ))}
    </span>
  );
}

export default async function ReviewsPage({ searchParams }: PageProps<"/reviews">) {
  await requireSession();
  const { rating, page } = paramsSchema.parse(await searchParams);
  const [settings, { rows, total }] = await Promise.all([getSalonSettings(), listReviews(rating, page)]);
  const pages = Math.max(1, Math.ceil(total / REVIEWS_PAGE_SIZE));

  return (
    <>
      <PageHeader
        title="Отзывы"
        description="Бот просит оценить визит через 2 часа после того, как запись отмечена выполненной."
      />
      <RatingFilter value={rating ?? "all"} />
      {rows.length === 0 ? (
        <p className="rounded-xl border bg-card px-4 py-12 text-center text-sm text-muted-foreground">
          {rating ? "Отзывов с такой оценкой нет." : "Отзывов пока нет."}
        </p>
      ) : (
        <ul className="space-y-3">
          {rows.map((review) => (
            <li key={review.id} className="rounded-xl border bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Stars rating={review.rating} />
                <span className="text-xs text-muted-foreground">{formatDay(review.createdAt, settings.timezone)}</span>
              </div>
              {review.comment ? (
                <p className="mt-2 text-sm whitespace-pre-line">{review.comment}</p>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">Без комментария</p>
              )}
              <p className="mt-3 text-xs text-muted-foreground">
                <Link href={`/clients/${review.clientId}`} className="font-medium text-foreground hover:text-primary">
                  {review.clientName}
                </Link>{" "}
                · {review.serviceName} · {review.masterName} ·{" "}
                <Link href={`/bookings/${review.bookingId}`} className="hover:text-primary">
                  запись
                </Link>
              </p>
            </li>
          ))}
        </ul>
      )}
      <Pagination basePath="/reviews" params={{ rating }} page={page} pages={pages} />
    </>
  );
}
