"use client";

import { X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SOURCE_LABELS, STATUS_LABELS } from "@/lib/constants";

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
      <div className="flex items-center gap-1.5">
        <Input
          type="date"
          aria-label="С даты"
          value={searchParams.get("from") ?? ""}
          onChange={(event) => set("from", event.target.value)}
          className="w-38"
        />
        <span className="text-muted-foreground" aria-hidden>
          —
        </span>
        <Input
          type="date"
          aria-label="По дату"
          value={searchParams.get("to") ?? ""}
          onChange={(event) => set("to", event.target.value)}
          className="w-38"
        />
      </div>
      <FilterSelect
        label="Мастер"
        value={searchParams.get("master") ?? ALL}
        items={[{ value: ALL, label: "Все мастера" }, ...masters.map((m) => ({ value: m.id, label: m.name }))]}
        onChange={(value) => set("master", value)}
      />
      <FilterSelect
        label="Статус"
        value={searchParams.get("status") ?? ALL}
        items={[
          { value: ALL, label: "Все статусы" },
          ...Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label })),
        ]}
        onChange={(value) => set("status", value)}
      />
      <FilterSelect
        label="Источник"
        value={searchParams.get("source") ?? ALL}
        items={[
          { value: ALL, label: "Все источники" },
          ...Object.entries(SOURCE_LABELS).map(([value, label]) => ({ value, label })),
        ]}
        onChange={(value) => set("source", value)}
      />
      {hasFilters && (
        <Button variant="ghost" onClick={() => router.push(pathname)}>
          <X aria-hidden />
          Сбросить
        </Button>
      )}
    </div>
  );
}
