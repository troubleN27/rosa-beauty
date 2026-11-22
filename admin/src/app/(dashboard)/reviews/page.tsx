import type { Metadata } from "next";
import Link from "next/link";
import { z } from "zod";

import { PageHeader } from "@/components/layout/page-header";
import { Pagination } from "@/components/pagination";
import { RatingFilter } from "@/components/reviews/rating-filter";
import { StarRating } from "@/components/star-rating";
import { listReviews, REVIEWS_PAGE_SIZE } from "@/lib/data/clients";
import { getSalonSettings } from "@/lib/data/settings";
import { formatDay } from "@/lib/format";
import { requireSession } from "@/lib/session";
import { getI18n } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("reviews.title") };
}

const paramsSchema = z.object({
  rating: z.enum(["1", "2", "3", "4", "5", "low"]).optional().catch(undefined),
  page: z.coerce.number().int().min(1).catch(1),
});

export default async function ReviewsPage({ searchParams }: PageProps<"/reviews">) {
  await requireSession();
  const { t, lang, pick } = await getI18n();
  const { rating, page } = paramsSchema.parse(await searchParams);
  const [settings, { rows, total }] = await Promise.all([getSalonSettings(), listReviews(rating, page)]);
  const pages = Math.max(1, Math.ceil(total / REVIEWS_PAGE_SIZE));

  return (
    <>
      <PageHeader
        title={t("reviews.title")}
        description={t("reviews.description")}
      />
      <RatingFilter value={rating ?? "all"} />
      {rows.length === 0 ? (
        <p className="rounded-xl border bg-card empty-state px-4 py-12 text-center text-sm text-muted-foreground">
          {rating ? t("reviews.emptyFiltered") : t("reviews.empty")}
        </p>
      ) : (
        <ul className="space-y-3">
          {rows.map((review) => (
            <li key={review.id} className="rounded-xl border bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="flex items-center gap-3">
                  <StarRating rating={review.rating} size={20} />
                  <span className="font-display text-2xl leading-none font-semibold">{review.rating}</span>
                </span>
                <span className="text-xs text-muted-foreground">{formatDay(review.createdAt, settings.timezone, lang)}</span>
              </div>
              {review.comment ? (
                <p className="mt-2 text-sm whitespace-pre-line">{review.comment}</p>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">{t("reviews.noComment")}</p>
              )}
              <p className="mt-3 text-xs text-muted-foreground">
                <Link href={`/clients/${review.clientId}`} className="font-medium text-foreground hover:text-primary">
                  {review.clientName}
                </Link>{" "}
                · {pick(review.serviceName, review.serviceNameEn)} · {pick(review.masterName, review.masterNameEn)} ·{" "}
                <Link href={`/bookings/${review.bookingId}`} className="hover:text-primary">
                  {t("reviews.booking")}
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
