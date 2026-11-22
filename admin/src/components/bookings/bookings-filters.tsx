"use client";

import { X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useI18n } from "@/i18n/client";
import { BOOKING_SOURCES, BOOKING_STATUSES } from "@/lib/constants";
import { DatePicker } from "@/components/date-picker";

const ALL = "all";

function FilterSelect({
  label,
  value,
  items,
  onChange,
}: {
  label: string;
  value: string;
  items: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <Select items={items} value={value} onValueChange={(next) => onChange(String(next))}>
      <SelectTrigger aria-label={label} className="min-w-36">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function BookingsFilters({ masters }: { masters: { id: string; name: string }[] }) {
  const { t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function set(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (!value || value === ALL) params.delete(key);
    else params.set(key, value);
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  const hasFilters = ["from", "to", "master", "status", "source"].some((key) => searchParams.has(key));

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <div className="flex w-full items-center gap-1.5 sm:w-auto">
        <DatePicker
          ariaLabel={t("bookings.filters.from")}
          className="w-auto min-w-0 flex-1 sm:w-44 sm:flex-none"
          placeholder={t("bookings.filters.from")}
          clearable
          value={searchParams.get("from") ?? ""}
          onChange={(value) => set("from", value)}
        />
        <span className="text-muted-foreground" aria-hidden>
          —
        </span>
        <DatePicker
          ariaLabel={t("bookings.filters.to")}
          className="w-auto min-w-0 flex-1 sm:w-44 sm:flex-none"
          placeholder={t("bookings.filters.to")}
          clearable
          value={searchParams.get("to") ?? ""}
          onChange={(value) => set("to", value)}
        />
      </div>
      <FilterSelect
        label={t("bookings.filters.master")}
        value={searchParams.get("master") ?? ALL}
        items={[{ value: ALL, label: t("bookings.filters.allMasters") }, ...masters.map((m) => ({ value: m.id, label: m.name }))]}
        onChange={(value) => set("master", value)}
      />
      <FilterSelect
        label={t("bookings.filters.status")}
        value={searchParams.get("status") ?? ALL}
        items={[
          { value: ALL, label: t("bookings.filters.allStatuses") },
          ...BOOKING_STATUSES.map((value) => ({ value, label: t(`status.${value}`) })),
        ]}
        onChange={(value) => set("status", value)}
      />
      <FilterSelect
        label={t("bookings.filters.source")}
        value={searchParams.get("source") ?? ALL}
        items={[
          { value: ALL, label: t("bookings.filters.allSources") },
          ...BOOKING_SOURCES.map((value) => ({ value, label: t(`source.${value}`) })),
        ]}
        onChange={(value) => set("source", value)}
      />
      {hasFilters && (
        <Button variant="ghost" onClick={() => router.push(pathname)}>
          <X aria-hidden />
          {t("common.reset")}
        </Button>
      )}
    </div>
  );
}
