import { EyeOff, UserPlus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/layout/page-header";
import { MasterAvatar } from "@/components/masters/master-avatar";
import { Button } from "@/components/ui/button";
import { listMasters } from "@/lib/data/masters";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = { title: "Мастера" };

function years(n: number) {
  const last = n % 10;
  const lastTwo = n % 100;
  if (last === 1 && lastTwo !== 11) return `${n} год`;
  if (last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14)) return `${n} года`;
  return `${n} лет`;
}

export default async function MastersPage() {
  await requireSession();
  const masters = await listMasters();

  return (
    <>
      <PageHeader
        title="Мастера"
        description="Данные, фото, услуги, график и выходные. Изменения сразу видны в боте."
        actions={
          <Button nativeButton={false} render={<Link href="/masters/new" />}>
            <UserPlus aria-hidden />
            Новый мастер
          </Button>
        }
      />
      {masters.length === 0 ? (
        <p className="rounded-xl border bg-card px-4 py-12 text-center text-sm text-muted-foreground">
          Мастеров пока нет. Добавьте первого мастера, чтобы клиенты могли записываться.
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {masters.map((master) => (
            <li key={master.id}>
              <Link
                href={`/masters/${master.id}`}
                className="flex h-full items-center gap-4 rounded-xl border bg-card p-4 transition-colors hover:border-primary/50 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                <MasterAvatar name={master.nameRu} photoUrl={master.photoUrl} />
                <span className="min-w-0">
                  <span className="flex items-center gap-2">
                    <span className="truncate font-medium">{master.nameRu}</span>
                    {!master.isActive && (
                      <EyeOff className="size-3.5 shrink-0 text-muted-foreground" aria-label="Скрыт" />
                    )}
                  </span>
                  <span className="block truncate text-sm text-muted-foreground">
                    {master.specialtyRu ?? "Специализация не указана"}
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {[
                      master.experienceYears !== null ? `опыт ${years(master.experienceYears)}` : null,
                      master.servicesCount ? `услуг: ${master.servicesCount}` : "нет услуг",
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
