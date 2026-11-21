import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/layout/page-header";
import { MasterForm } from "@/components/masters/master-form";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = { title: "Новый мастер" };

export default async function NewMasterPage() {
  await requireSession();
  return (
    <>
      <Link href="/masters" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" aria-hidden />
        Все мастера
      </Link>
      <PageHeader title="Новый мастер" description="После сохранения отметьте услуги мастера и его график." />
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
