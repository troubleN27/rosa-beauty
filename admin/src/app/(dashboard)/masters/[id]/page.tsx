import { ChevronLeft, EyeOff } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { MasterAvatar } from "@/components/masters/master-avatar";
import { MasterForm } from "@/components/masters/master-form";
import { MasterTabs } from "@/components/masters/master-tabs";
import { PhotoUploader } from "@/components/masters/photo-uploader";
import { ScheduleEditor, type ScheduleDay } from "@/components/masters/schedule-editor";
import { ServicesPicker } from "@/components/masters/services-picker";
import { TimeOffManager } from "@/components/masters/time-off-manager";
import { isBlobConfigured } from "@/lib/blob";
import { MASTER_TABS, type MasterTab } from "@/lib/constants";
import { getCatalog } from "@/lib/data/catalog";
import { getMasterDetail } from "@/lib/data/masters";
import { getSalonSettings } from "@/lib/data/settings";
import { formatDuration, formatPrice } from "@/lib/format";
import { requireSession } from "@/lib/session";
import { localDate } from "@/lib/slots";

export const metadata: Metadata = { title: "Мастер" };

const tabSchema = z.enum(MASTER_TABS.map((t) => t.value) as [MasterTab, ...MasterTab[]]).catch("profile");

function dayLabel(day: string) {
  const [y, m, d] = day.split("-");
  return `${d}.${m}.${y}`;
}

export default async function MasterPage({ params, searchParams }: PageProps<"/masters/[id]">) {
  await requireSession();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const tab = tabSchema.parse((await searchParams).tab);
  const settings = await getSalonSettings();
  const today = localDate(new Date(), settings.timezone);
  const detail = await getMasterDetail(id, today);
  if (!detail) notFound();
  const { master } = detail;

  let content: React.ReactNode;
  if (tab === "profile") {
    content = (
      <MasterForm
        masterId={master.id}
        canDelete={detail.canDelete}
        initial={{
          nameRu: master.nameRu,
          nameEn: master.nameEn,
          specialtyRu: master.specialtyRu ?? "",
          specialtyEn: master.specialtyEn ?? "",
          experienceYears: master.experienceYears ?? "",
          sort: master.sort,
          isActive: master.isActive,
        }}
      />
    );
  } else if (tab === "photo") {
    content = (
      <PhotoUploader masterId={master.id} name={master.nameRu} photoUrl={master.photoUrl} configured={isBlobConfigured()} />
    );
  } else if (tab === "services") {
    const catalog = await getCatalog();
    content = (
      <ServicesPicker
        masterId={master.id}
        selected={detail.serviceIds}
        groups={catalog
          .filter((c) => c.services.length > 0)
          .map((c) => ({
            id: c.id,
            name: c.nameRu,
            services: c.services.map((s) => ({
              id: s.id,
              name: s.nameRu,
              hint: `${formatDuration(s.durationMin)} · ${formatPrice(s.price, settings.currency)}`,
              isActive: s.isActive && c.isActive,
            })),
          }))}
      />
    );
  } else if (tab === "schedule") {
    const days: ScheduleDay[] = Array.from({ length: 7 }, (_, i) => {
      const row = detail.hours.find((h) => h.weekday === i + 1);
      return {
        weekday: i + 1,
        works: Boolean(row),
        start: row?.startTime.slice(0, 5) ?? "",
        end: row?.endTime.slice(0, 5) ?? "",
        breakStart: row?.breakStart?.slice(0, 5) ?? "",
        breakEnd: row?.breakEnd?.slice(0, 5) ?? "",
      };
    });
    content = <ScheduleEditor key={JSON.stringify(days)} masterId={master.id} initial={days} />;
  } else {
    content = (
      <TimeOffManager
        masterId={master.id}
        today={today}
        periods={detail.timeOff.map((p) => ({
          id: p.id,
          label: p.dateFrom === p.dateTo ? dayLabel(p.dateFrom) : `${dayLabel(p.dateFrom)} — ${dayLabel(p.dateTo)}`,
          reason: p.reason,
        }))}
      />
    );
  }

  return (
    <>
      <Link href="/masters" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" aria-hidden />
        Все мастера
      </Link>
      <div className="mb-6 flex items-center gap-4">
        <MasterAvatar name={master.nameRu} photoUrl={master.photoUrl} size={64} />
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight md:text-2xl">
            <span className="truncate">{master.nameRu}</span>
            {!master.isActive && (
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground">
                <EyeOff className="size-3" aria-hidden />
                Скрыт
              </span>
            )}
          </h1>
          <p className="truncate text-sm text-muted-foreground">{master.specialtyRu ?? "Специализация не указана"}</p>
        </div>
      </div>
      <MasterTabs tab={tab} />
      {content}
    </>
  );
}
