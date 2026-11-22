"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { saveCategoryAction } from "@/app/(dashboard)/services/actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { categorySchema, type CategoryOutput, type CategoryValues } from "@/lib/validations/catalog";
import { useI18n } from "@/i18n/client";

export function CategoryDialog({
  open,
  onOpenChange,
  initial,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: CategoryValues | null;
  onSaved: (id: string) => void;
}) {
  const router = useRouter();
  const { t, tm } = useI18n();
  const [pending, startTransition] = useTransition();
  const form = useForm<CategoryValues, unknown, CategoryOutput>({
    resolver: zodResolver(categorySchema),
    values: initial ?? { nameRu: "", nameEn: "", sort: 0, isActive: true },
  });
  const { errors } = form.formState;

  function onSubmit(values: CategoryOutput) {
    startTransition(async () => {
      const result = await saveCategoryAction(values);
      if (!result.ok) {
        toast.error(tm(result.error));
        return;
      }
      toast.success(initial?.id ? t("services.categorySaved") : t("services.categoryCreated"));
      onOpenChange(false);
      onSaved(result.id);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{initial?.id ? t("services.category") : t("services.newCategory")}</DialogTitle>
        </DialogHeader>
        <form id="category-form" onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <FieldGroup>
            <Field data-invalid={!!errors.nameRu}>
              <FieldLabel htmlFor="category-ru">{t("services.nameRu")}</FieldLabel>
              <Input id="category-ru" {...form.register("nameRu")} aria-invalid={!!errors.nameRu} />
              <FieldError errors={[errors.nameRu]} />
            </Field>
            <Field data-invalid={!!errors.nameEn}>
              <FieldLabel htmlFor="category-en">{t("services.nameEn")}</FieldLabel>
              <Input id="category-en" {...form.register("nameEn")} aria-invalid={!!errors.nameEn} />
              <FieldError errors={[errors.nameEn]} />
            </Field>
            <Field data-invalid={!!errors.sort}>
              <FieldLabel htmlFor="category-sort">{t("services.sortInList")}</FieldLabel>
              <Input id="category-sort" type="number" min={0} className="w-28" {...form.register("sort")} />
              <FieldError errors={[errors.sort]} />
            </Field>
            <Controller
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <Field orientation="horizontal">
                  <Switch id="category-active" checked={field.value} onCheckedChange={field.onChange} />
                  <FieldLabel htmlFor="category-active">{t("services.visibleInBot")}</FieldLabel>
                </Field>
              )}
            />
          </FieldGroup>
        </form>
        <DialogFooter>
          <Button type="submit" form="category-form" disabled={pending}>
            {pending && <Loader2 className="animate-spin" aria-hidden />}
            {t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
