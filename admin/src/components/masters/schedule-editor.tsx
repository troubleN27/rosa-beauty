"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { saveScheduleAction } from "@/app/(dashboard)/masters/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { scheduleDaySchema } from "@/lib/validations/master";

const WEEKDAYS = ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота", "Воскресенье"];

export type ScheduleDay = {
  weekday: number;
  works: boolean;
  start: string;
  end: string;
  breakStart: string;
  breakEnd: string;
};

function TimeInput({ label, value, onChange, invalid }: { label: string; value: string; onChange: (v: string) => void; invalid?: boolean }) {
  return (
    <Input type="time" step={300} aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} aria-invalid={invalid} className="w-[6.5rem]" />
  );
}

export function ScheduleEditor({ masterId, initial }: { masterId: string; initial: ScheduleDay[] }) {
  const router = useRouter();
  const [days, setDays] = useState(initial);
  const [pending, startTransition] = useTransition();
  const errors = days.map((day) => {
    const result = scheduleDaySchema.safeParse(day);
    return result.success ? null : result.error.issues[0];
  });
  const hasErrors = errors.some(Boolean);
  const dirty = JSON.stringify(days) !== JSON.stringify(initial);

  function update(index: number, patch: Partial<ScheduleDay>) {
    setDays((current) => current.map((day, i) => (i === index ? { ...day, ...patch } : day)));
  }

  function save() {
    startTransition(async () => {
      const result = await saveScheduleAction({ masterId, days });
      if (!result.ok) return void toast.error(result.error);
      toast.success("График сохранён — свободное время в боте уже пересчитано");
      router.refresh();
    });
  }

  return (
    <div className="max-w-3xl space-y-4">
      <div className="divide-y rounded-xl border bg-card">
        {days.map((day, index) => {
          const error = errors[index];
          return (
            <div key={day.weekday} className="grid gap-3 px-4 py-3 md:grid-cols-[10rem_minmax(0,1fr)] md:items-center">
              <label className="flex items-center gap-3">
                <Switch
                  checked={day.works}
                  onCheckedChange={(works) =>
                    update(index, works && !day.start ? { works, start: "10:00", end: "19:00" } : { works })
                  }
                />
                <span className={day.works ? "font-medium" : "text-muted-foreground"}>{WEEKDAYS[index]}</span>
              </label>
              {day.works ? (
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                    <span className="inline-flex items-center gap-2">
                      <TimeInput label={`${WEEKDAYS[index]}: начало`} value={day.start} onChange={(v) => update(index, { start: v })} invalid={error?.path[0] === "start"} />
                      <span aria-hidden>—</span>
                      <TimeInput label={`${WEEKDAYS[index]}: конец`} value={day.end} onChange={(v) => update(index, { end: v })} invalid={error?.path[0] === "end"} />
                    </span>
                    <span className="inline-flex flex-wrap items-center gap-2">
                      <span className="text-muted-foreground">перерыв</span>
                      <TimeInput label={`${WEEKDAYS[index]}: начало перерыва`} value={day.breakStart} onChange={(v) => update(index, { breakStart: v })} invalid={error?.path[0] === "breakStart"} />
                      <span aria-hidden>—</span>
                      <TimeInput label={`${WEEKDAYS[index]}: конец перерыва`} value={day.breakEnd} onChange={(v) => update(index, { breakEnd: v })} invalid={error?.path[0] === "breakEnd"} />
                      {(day.breakStart || day.breakEnd) && (
                        <Button variant="ghost" size="sm" onClick={() => update(index, { breakStart: "", breakEnd: "" })}>
                          Убрать
                        </Button>
                      )}
                    </span>
                  </div>
                  {error && <p className="text-xs text-destructive">{error.message}</p>}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Выходной</p>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-end gap-3">
        <p className="text-xs text-muted-foreground">Уже созданные записи не меняются.</p>
        <Button onClick={save} disabled={!dirty || hasErrors || pending}>
          {pending && <Loader2 className="animate-spin" aria-hidden />}
          Сохранить график
        </Button>
      </div>
    </div>
  );
}
