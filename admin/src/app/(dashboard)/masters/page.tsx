import { EyeOff, UserPlus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/layout/page-header";
import { MasterAvatar } from "@/components/masters/master-avatar";
import { Button } from "@/components/ui/button";
import { listMasters } from "@/lib/data/masters";
import { requireSession } from "@/lib/session";
import { getI18n } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("masters.title") };
}


export default async function MastersPage() {
  await requireSession();
  const { t, pick } = await getI18n();
  const masters = await listMasters();

  return (
    <>
      <PageHeader
        title={t("masters.title")}
        description={t("masters.description")}
        actions={
          <Button nativeButton={false} render={<Link href="/masters/new" />}>
            <UserPlus aria-hidden />
            {t("masters.new")}
          </Button>
        }
      />
      {masters.length === 0 ? (
        <p className="rounded-xl border bg-card empty-state px-4 py-12 text-center text-sm text-muted-foreground">
          {t("masters.empty")}
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {masters.map((master) => (
            <li key={master.id}>
              <Link
                href={`/masters/${master.id}`}
                className="flex h-full items-center gap-4 rounded-xl border bg-card p-4 transition-colors hover:border-primary/50 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                <MasterAvatar name={pick(master.nameRu, master.nameEn)} photoUrl={master.photoUrl} />
                <span className="min-w-0">
                  <span className="flex items-center gap-2">
                    <span className="truncate font-medium">{pick(master.nameRu, master.nameEn)}</span>
                    {!master.isActive && (
                      <EyeOff className="size-3.5 shrink-0 text-muted-foreground" aria-label={t("common.hiddenMaster")} />
                    )}
                  </span>
                  <span className="block truncate text-sm text-muted-foreground">
                    {master.specialtyRu ? pick(master.specialtyRu, master.specialtyEn) : t("masters.noSpecialty")}
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {[
                      master.experienceYears !== null ? t("masters.experience", { count: master.experienceYears }) : null,
                      master.servicesCount ? t("masters.servicesCount", { count: master.servicesCount }) : t("masters.noServicesShort"),
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
