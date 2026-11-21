"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { createMasterAction, deleteMasterAction, updateMasterAction } from "@/app/(dashboard)/masters/actions";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { masterSchema, type MasterOutput, type MasterValues } from "@/lib/validations/master";

export function MasterForm({
  masterId,
  initial,
  canDelete = false,
}: {
  masterId?: string;
  initial: MasterValues;
  canDelete?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const form = useForm<MasterValues, unknown, MasterOutput>({ resolver: zodResolver(masterSchema), values: initial });
  const { errors, isDirty } = form.formState;

  function onSubmit(values: MasterOutput) {
    startTransition(async () => {
      if (masterId) {
        const result = await updateMasterAction(masterId, values);
        if (!result.ok) return void toast.error(result.error);
        toast.success("Данные мастера сохранены");
        router.refresh();
        return;
      }
      const result = await createMasterAction(values);
      if (!result.ok) return void toast.error(result.error);
      toast.success("Мастер добавлен. Отметьте его услуги и график.");
      router.push(`/masters/${result.id}?tab=services`);
    });
  }

  function remove() {
    if (!masterId) return;
    startTransition(async () => {
      const result = await deleteMasterAction(masterId);
      setConfirmDelete(false);
      if (!result.ok) return void toast.error(result.error);
      toast.success("Мастер удалён");
      router.push("/masters");
    });
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="max-w-2xl rounded-xl border bg-card p-4 md:p-5">
      <FieldGroup>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={!!errors.nameRu}>
            <FieldLabel htmlFor="master-name-ru">Имя (RU)</FieldLabel>
            <Input id="master-name-ru" {...form.register("nameRu")} aria-invalid={!!errors.nameRu} />
            <FieldError errors={[errors.nameRu]} />
          </Field>
          <Field data-invalid={!!errors.nameEn}>
            <FieldLabel htmlFor="master-name-en">Имя (EN)</FieldLabel>
            <Input id="master-name-en" {...form.register("nameEn")} aria-invalid={!!errors.nameEn} />
            <FieldError errors={[errors.nameEn]} />
          </Field>
          <Field data-invalid={!!errors.specialtyRu}>
            <FieldLabel htmlFor="master-spec-ru">Специализация (RU)</FieldLabel>
            <Input id="master-spec-ru" placeholder="Стилист-колорист" {...form.register("specialtyRu")} />
            <FieldError errors={[errors.specialtyRu]} />
          </Field>
          <Field data-invalid={!!errors.specialtyEn}>
            <FieldLabel htmlFor="master-spec-en">Специализация (EN)</FieldLabel>
            <Input id="master-spec-en" placeholder="Hair stylist & colorist" {...form.register("specialtyEn")} />
            <FieldError errors={[errors.specialtyEn]} />
          </Field>
          <Field data-invalid={!!errors.experienceYears}>
            <FieldLabel htmlFor="master-exp">Стаж, лет</FieldLabel>
            <Input id="master-exp" type="number" min={0} max={70} className="w-28" {...form.register("experienceYears")} />
            <FieldError errors={[errors.experienceYears]} />
          </Field>
          <Field data-invalid={!!errors.sort}>
            <FieldLabel htmlFor="master-sort">Порядок в списке</FieldLabel>
            <Input id="master-sort" type="number" min={0} className="w-28" {...form.register("sort")} />
            <FieldDescription>Первым при «Любом мастере» назначается мастер с меньшим числом.</FieldDescription>
            <FieldError errors={[errors.sort]} />
          </Field>
        </div>
        <Controller
          control={form.control}
          name="isActive"
          render={({ field }) => (
            <Field orientation="horizontal">
              <Switch id="master-active" checked={field.value} onCheckedChange={field.onChange} />
              <div>
                <FieldLabel htmlFor="master-active">Принимает записи</FieldLabel>
                <FieldDescription>Скрытый мастер не виден в боте, но остаётся в истории записей.</FieldDescription>
              </div>
            </Field>
          )}
        />
        <div className="flex flex-wrap items-center justify-between gap-2">
          {masterId && canDelete ? (
            <Button type="button" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setConfirmDelete(true)}>
              <Trash2 aria-hidden />
              Удалить мастера
            </Button>
          ) : (
            <span />
          )}
          <Button type="submit" disabled={pending || (!!masterId && !isDirty)}>
            {pending && <Loader2 className="animate-spin" aria-hidden />}
            {masterId ? "Сохранить" : "Добавить мастера"}
          </Button>
        </div>
      </FieldGroup>
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Удалить мастера?"
        description="Мастер, его график, выходные и фото будут удалены без возможности восстановления."
        confirmLabel="Удалить"
        pending={pending}
        onConfirm={remove}
      />
    </form>
  );
}
