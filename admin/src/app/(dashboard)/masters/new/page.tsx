import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/layout/page-header";
import { MasterForm } from "@/components/masters/master-form";
import { requireSession } from "@/lib/session";
import { getI18n } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("masters.new") };
}

export default async function NewMasterPage() {
  await requireSession();
  const { t } = await getI18n();
  return (
    <>
      <Link href="/masters" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" aria-hidden />
        {t("masters.all")}
      </Link>
      <PageHeader title={t("masters.new")} description={t("masters.newDescription")} />
      <MasterForm
        initial={{
          nameRu: "",
          nameEn: "",
          specialtyRu: "",
          specialtyEn: "",
          experienceYears: "",
          sort: 10,
          isActive: true,
        }}
      />
    </>
  );
}
