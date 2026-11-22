"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { saveServiceAction } from "@/app/(dashboard)/services/actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { serviceSchema, type ServiceOutput, type ServiceValues } from "@/lib/validations/catalog";
import { useI18n } from "@/i18n/client";

export function ServiceDialog({
  open,
  onOpenChange,
  initial,
  categories,
  currency,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: ServiceValues;
  categories: { id: string; name: string }[];
  currency: string;
}) {
  const router = useRouter();
  const { t, tm } = useI18n();
  const [pending, startTransition] = useTransition();
  const form = useForm<ServiceValues, unknown, ServiceOutput>({ resolver: zodResolver(serviceSchema), values: initial });
  const { errors } = form.formState;
  const categoryItems = categories.map((c) => ({ value: c.id, label: c.name }));

  function onSubmit(values: ServiceOutput) {
    startTransition(async () => {
      const result = await saveServiceAction(values);
      if (!result.ok) {
        toast.error(tm(result.error));
        return;
      }
      toast.success(initial.id ? t("services.serviceSaved") : t("services.serviceCreated"));
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{initial.id ? t("services.service") : t("services.newService")}</DialogTitle>
          {!initial.id && (
            <DialogDescription>
              {t("services.serviceHint")}
            </DialogDescription>
          )}
        </DialogHeader>
        <form id="service-form" onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <FieldGroup>
            <Field data-invalid={!!errors.categoryId}>
              <FieldLabel htmlFor="service-category">{t("services.category")}</FieldLabel>
              <Controller
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <Select items={categoryItems} value={field.value || null} onValueChange={(v) => field.onChange(v ?? "")}>
                    <SelectTrigger id="service-category" className="w-full">
                      <SelectValue placeholder={t("services.pickCategory")} />
                    </SelectTrigger>
                    <SelectContent>
                      {categoryItems.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldError errors={[errors.categoryId]} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field data-invalid={!!errors.nameRu}>
                <FieldLabel htmlFor="service-ru">{t("services.nameRu")}</FieldLabel>
                <Input id="service-ru" {...form.register("nameRu")} aria-invalid={!!errors.nameRu} />
                <FieldError errors={[errors.nameRu]} />
              </Field>
              <Field data-invalid={!!errors.nameEn}>
                <FieldLabel htmlFor="service-en">{t("services.nameEn")}</FieldLabel>
                <Input id="service-en" {...form.register("nameEn")} aria-invalid={!!errors.nameEn} />
                <FieldError errors={[errors.nameEn]} />
              </Field>
              <Field data-invalid={!!errors.descriptionRu}>
                <FieldLabel htmlFor="service-desc-ru">{t("services.descriptionRu")}</FieldLabel>
                <Textarea id="service-desc-ru" rows={3} {...form.register("descriptionRu")} />
                <FieldError errors={[errors.descriptionRu]} />
              </Field>
              <Field data-invalid={!!errors.descriptionEn}>
                <FieldLabel htmlFor="service-desc-en">{t("services.descriptionEn")}</FieldLabel>
                <Textarea id="service-desc-en" rows={3} {...form.register("descriptionEn")} />
                <FieldError errors={[errors.descriptionEn]} />
              </Field>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <Field data-invalid={!!errors.durationMin}>
                <FieldLabel htmlFor="service-duration">{t("services.durationMin")}</FieldLabel>
                <Input id="service-duration" type="number" min={5} step={5} {...form.register("durationMin")} />
                <FieldError errors={[errors.durationMin]} />
              </Field>
              <Field data-invalid={!!errors.price}>
                <FieldLabel htmlFor="service-price">{t("services.priceIn", { currency })}</FieldLabel>
                <Input id="service-price" type="number" min={0} step="0.01" {...form.register("price")} />
                <FieldError errors={[errors.price]} />
              </Field>
              <Field data-invalid={!!errors.sort}>
                <FieldLabel htmlFor="service-sort">{t("services.sort")}</FieldLabel>
                <Input id="service-sort" type="number" min={0} {...form.register("sort")} />
                <FieldError errors={[errors.sort]} />
              </Field>
            </div>
            <Controller
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <Field orientation="horizontal">
                  <Switch id="service-active" checked={field.value} onCheckedChange={field.onChange} />
                  <div>
                    <FieldLabel htmlFor="service-active">{t("services.visibleInBot")}</FieldLabel>
                    <FieldDescription>{t("services.hiddenKept")}</FieldDescription>
                  </div>
                </Field>
              )}
            />
          </FieldGroup>
        </form>
        <DialogFooter>
          <Button type="submit" form="service-form" disabled={pending}>
            {pending && <Loader2 className="animate-spin" aria-hidden />}
            {t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
