"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { addTimeOffAction, deleteTimeOffAction } from "@/app/(dashboard)/masters/actions";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { timeOffSchema, type TimeOffOutput, type TimeOffValues } from "@/lib/validations/master";

type Period = { id: string; label: string; reason: string | null };

export function TimeOffManager({ masterId, periods, today }: { masterId: string; periods: Period[]; today: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [toDelete, setToDelete] = useState<Period | null>(null);
  const [conflicts, setConflicts] = useState<string[]>([]);
  const form = useForm<TimeOffValues, unknown, TimeOffOutput>({
    resolver: zodResolver(timeOffSchema),
    defaultValues: { masterId, dateFrom: today, dateTo: today, reason: "" },
  });
  const { errors } = form.formState;

  function onSubmit(values: TimeOffOutput) {
    startTransition(async () => {
      const result = await addTimeOffAction(values);
      if (!result.ok) return void toast.error(result.error);
      setConflicts(result.conflicts);
      toast.success("Выходные добавлены — в эти дни бот не предложит запись к мастеру");
      form.reset({ masterId, dateFrom: today, dateTo: today, reason: "" });
      router.refresh();
    });
  }

  function remove() {
    if (!toDelete) return;
    startTransition(async () => {
      const result = await deleteTimeOffAction(toDelete.id);
      setToDelete(null);
      if (!result.ok) return void toast.error(result.error);
      toast.success("Период удалён");
      router.refresh();
    });
  }

  return (
    <div className="grid max-w-3xl gap-4">
      <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="rounded-xl border bg-card p-4 md:p-5">
        <h2 className="mb-4 font-display text-xl font-semibold">Добавить выходной или отпуск</h2>
        <div className="flex flex-wrap items-start gap-3">
          <Field data-invalid={!!errors.dateFrom} className="w-auto">
            <FieldLabel htmlFor="off-from">С</FieldLabel>
            <Input id="off-from" type="date" min={today} {...form.register("dateFrom")} className="w-40" />
            <FieldError errors={[errors.dateFrom]} />
          </Field>
          <Field data-invalid={!!errors.dateTo} className="w-auto">
            <FieldLabel htmlFor="off-to">По</FieldLabel>
            <Input id="off-to" type="date" min={today} {...form.register("dateTo")} className="w-40" />
            <FieldError errors={[errors.dateTo]} />
          </Field>
          <Field data-invalid={!!errors.reason} className="min-w-48 flex-1">
            <FieldLabel htmlFor="off-reason">Причина (необязательно)</FieldLabel>
            <Input id="off-reason" placeholder="Отпуск, больничный, обучение" {...form.register("reason")} />
            <FieldError errors={[errors.reason]} />
          </Field>
        </div>
        <div className="mt-4 flex justify-end">
          <Button type="submit" disabled={pending}>
            {pending ? <Loader2 className="animate-spin" aria-hidden /> : <Plus aria-hidden />}
            Добавить
          </Button>
        </div>
      </form>

      {conflicts.length > 0 && (
        <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
          <p className="font-medium">На эти дни у мастера уже есть записи — они не отменены автоматически:</p>
          <ul className="mt-2 list-inside list-disc text-muted-foreground">
            {conflicts.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <p className="mt-2">Перенесите или отмените их в разделе «Записи» — клиент получит сообщение.</p>
        </div>
      )}

      <section className="rounded-xl border bg-card">
        <h2 className="border-b px-4 py-3 font-display text-xl font-semibold">Ближайшие выходные и отпуска</h2>
        {periods.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">Запланированных выходных нет.</p>
        ) : (
          <ul className="divide-y">
            {periods.map((period) => (
              <li key={period.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div>
                  <p className="text-sm font-medium">{period.label}</p>
                  {period.reason && <p className="text-xs text-muted-foreground">{period.reason}</p>}
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Удалить период ${period.label}`}
                  onClick={() => setToDelete(period)}
                >
                  <Trash2 aria-hidden />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(open) => !open && setToDelete(null)}
        title="Удалить период?"
        description={`${toDelete?.label ?? ""}: мастер снова будет доступен для записи в эти дни по своему графику.`}
        confirmLabel="Удалить"
        pending={pending}
        onConfirm={remove}
      />
    </div>
  );
}
