import type { Metadata } from "next";
import { z } from "zod";

import { PageHeader } from "@/components/layout/page-header";
import { ServicesView, type CategoryView } from "@/components/services/services-view";
import { getCatalog } from "@/lib/data/catalog";
import { getSalonSettings } from "@/lib/data/settings";
import { formatDuration, formatPrice } from "@/lib/format";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = { title: "Услуги" };

export default async function ServicesPage({ searchParams }: PageProps<"/services">) {
  await requireSession();
  const { category } = z
    .object({ category: z.uuid().optional().catch(undefined) })
    .parse(await searchParams);
  const [catalog, settings] = await Promise.all([getCatalog(), getSalonSettings()]);

  const categories: CategoryView[] = catalog.map((c) => ({
    id: c.id,
    nameRu: c.nameRu,
    nameEn: c.nameEn,
    sort: c.sort,
    isActive: c.isActive,
    services: c.services.map((s) => ({
      id: s.id,
      nameRu: s.nameRu,
      nameEn: s.nameEn,
      descriptionRu: s.descriptionRu,
      descriptionEn: s.descriptionEn,
      durationMin: s.durationMin,
      duration: formatDuration(s.durationMin),
      price: s.price,
      priceLabel: formatPrice(s.price, settings.currency),
      sort: s.sort,
      isActive: s.isActive,
      bookingsCount: s.bookingsCount,
      mastersCount: s.mastersCount,
    })),
  }));

  return (
    <>
      <PageHeader
        title="Услуги"
        description="Изменения сразу видны клиентам в боте. Услуги с записями можно только скрыть."
      />
      <ServicesView categories={categories} selectedId={category ?? null} currency={settings.currency} />
    </>
  );
}
