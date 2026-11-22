"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { saveScheduleAction } from "@/app/(dashboard)/masters/actions";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { TimePicker } from "@/components/time-picker";
import { scheduleDaySchema } from "@/lib/validations/master";
import { useI18n } from "@/i18n/client";
import type { MessageKey } from "@/i18n";


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
    <TimePicker label={label} value={value} onChange={onChange} invalid={invalid} />
  );
}

export function ScheduleEditor({ masterId, initial }: { masterId: string; initial: ScheduleDay[] }) {
  const router = useRouter();
  const { t, tm } = useI18n();
  const weekday = (index: number) => t(`masters.schedule.weekdays.${index + 1}` as MessageKey);
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
      if (!result.ok) return void toast.error(tm(result.error));
      toast.success(t("masters.schedule.saved"));
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
                <span className={day.works ? "font-medium" : "text-muted-foreground"}>{weekday(index)}</span>
              </label>
              {day.works ? (
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                    <span className="inline-flex items-center gap-2">
                      <TimeInput label={t("masters.schedule.start", { day: weekday(index) })} value={day.start} onChange={(v) => update(index, { start: v })} invalid={error?.path[0] === "start"} />
                      <span aria-hidden>—</span>
                      <TimeInput label={t("masters.schedule.end", { day: weekday(index) })} value={day.end} onChange={(v) => update(index, { end: v })} invalid={error?.path[0] === "end"} />
                    </span>
                    <span className="inline-flex flex-wrap items-center gap-2">
                      <span className="text-muted-foreground">{t("masters.schedule.break")}</span>
                      <TimeInput label={t("masters.schedule.breakStart", { day: weekday(index) })} value={day.breakStart} onChange={(v) => update(index, { breakStart: v })} invalid={error?.path[0] === "breakStart"} />
                      <span aria-hidden>—</span>
                      <TimeInput label={t("masters.schedule.breakEnd", { day: weekday(index) })} value={day.breakEnd} onChange={(v) => update(index, { breakEnd: v })} invalid={error?.path[0] === "breakEnd"} />
                      {(day.breakStart || day.breakEnd) && (
                        <Button variant="ghost" size="sm" onClick={() => update(index, { breakStart: "", breakEnd: "" })}>
                          {t("masters.schedule.removeBreak")}
                        </Button>
                      )}
                    </span>
                  </div>
                  {error && <p className="text-xs text-destructive">{error.message}</p>}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{t("masters.schedule.dayOff")}</p>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-end gap-3">
        <p className="text-xs text-muted-foreground">{t("masters.schedule.existingKept")}</p>
        <Button onClick={save} disabled={!dirty || hasErrors || pending}>
          {pending && <Loader2 className="animate-spin" aria-hidden />}
          {t("masters.schedule.save")}
        </Button>
      </div>
    </div>
  );
}
