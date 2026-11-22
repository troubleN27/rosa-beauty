"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DatePicker } from "@/components/date-picker";

export function ScheduleToolbar({
  view,
  date,
  today,
  prevDate,
  nextDate,
  master,
  masters,
}: {
  view: "day" | "week";
  date: string;
  today: string;
  prevDate: string;
  nextDate: string;
  master: string;
  masters: { id: string; name: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function go(changes: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("booking");
    for (const [key, value] of Object.entries(changes)) {
      if (value === null) params.delete(key);
      else params.set(key, value);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  const masterItems = [{ value: "all", label: "Все мастера" }, ...masters.map((m) => ({ value: m.id, label: m.name }))];

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <Tabs value={view} onValueChange={(value) => go({ view: String(value) })}>
        <TabsList>
          <TabsTrigger value="day">День</TabsTrigger>
          <TabsTrigger value="week">Неделя</TabsTrigger>
        </TabsList>
      </Tabs>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="icon" aria-label={view === "day" ? "Предыдущий день" : "Предыдущая неделя"} onClick={() => go({ date: prevDate })}>
          <ChevronLeft aria-hidden />
        </Button>
        <Button variant="outline" onClick={() => go({ date: today })} disabled={date === today}>
          Сегодня
        </Button>
        <Button variant="outline" size="icon" aria-label={view === "day" ? "Следующий день" : "Следующая неделя"} onClick={() => go({ date: nextDate })}>
          <ChevronRight aria-hidden />
        </Button>
      </div>
      <DatePicker ariaLabel="Дата" value={date} onChange={(value) => value && go({ date: value })} className="w-48" />
      {view === "week" && (
        <Select items={masterItems} value={master} onValueChange={(value) => go({ master: value === "all" ? null : String(value) })}>
          <SelectTrigger aria-label="Мастер" className="min-w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {masterItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
