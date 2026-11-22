"use client";

import { usePathname, useRouter } from "next/navigation";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useI18n } from "@/i18n/client";

const RATINGS = [
  { value: "5", label: "5 ★" },
  { value: "4", label: "4 ★" },
  { value: "3", label: "3 ★" },
  { value: "2", label: "2 ★" },
  { value: "1", label: "1 ★" },
];

export function RatingFilter({ value }: { value: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useI18n();
  const ITEMS = [
    { value: "all", label: t("reviews.allRatings") },
    { value: "low", label: t("reviews.lowRatings") },
    ...RATINGS,
  ];
  return (
    <Select
      items={ITEMS}
      value={value}
      onValueChange={(next) => router.push(next === "all" || !next ? pathname : `${pathname}?rating=${next}`)}
    >
      <SelectTrigger aria-label={t("reviews.filter")} className="mb-4 min-w-40">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {ITEMS.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
