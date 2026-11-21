"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useTransition } from "react";
import { Controller, useForm, type FieldPath } from "react-hook-form";
import { toast } from "sonner";

import { saveSettingsAction } from "@/app/(dashboard)/settings/actions";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  CURRENCIES,
  SLOT_STEPS,
  settingsSchema,
  type SettingsOutput,
  type SettingsValues,
} from "@/lib/validations/settings";

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border bg-card p-4 md:p-5">
      <h2 className="font-medium">{title}</h2>
      {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
      <FieldGroup className="mt-4">{children}</FieldGroup>
    </section>
  );
}

export function SettingsForm({ initial }: { initial: SettingsValues }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const form = useForm<SettingsValues, unknown, SettingsOutput>({ resolver: zodResolver(settingsSchema), values: initial });
  const { errors, isDirty } = form.formState;
  const timezones = useMemo(() => {
    const zones = Intl.supportedValuesOf("timeZone");
    return zones.includes(String(initial.timezone)) ? zones : [String(initial.timezone), ...zones];
  }, [initial.timezone]);

  function onSubmit(values: SettingsOutput) {
    startTransition(async () => {
      const result = await saveSettingsAction(values);
      if (!result.ok) return void toast.error(result.error);
      toast.success("Настройки сохранены — бот уже работает с новыми значениями");
      router.refresh();
    });
  }

  const text = (name: FieldPath<SettingsValues>, label: string, props: React.ComponentProps<typeof Input> = {}) => (
    <Field data-invalid={!!errors[name as keyof typeof errors]}>
      <FieldLabel htmlFor={`settings-${name}`}>{label}</FieldLabel>
      <Input id={`settings-${name}`} {...props} {...form.register(name)} aria-invalid={!!errors[name as keyof typeof errors]} />
      <FieldError errors={[errors[name as keyof typeof errors]]} />
    </Field>
  );

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="grid max-w-3xl gap-4">
      <Section title="Салон" description="Эти данные клиенты видят в разделе «Контакты» и в подтверждении записи.">
        {text("name", "Название")}
        <div className="grid gap-4 sm:grid-cols-2">
          {text("addressRu", "Адрес (RU)")}
          {text("addressEn", "Адрес (EN)")}
          {text("hoursRu", "Часы работы (RU)", { placeholder: "Ежедневно с 10:00 до 21:00" })}
          {text("hoursEn", "Часы работы (EN)", { placeholder: "Daily 10:00–21:00" })}
          {text("phone", "Телефон", { type: "tel" })}
          {text("instagram", "Instagram", { type: "url", placeholder: "https://instagram.com/salon" })}
          {text("latitude", "Широта", { inputMode: "decimal", placeholder: "55.7398" })}
          {text("longitude", "Долгота", { inputMode: "decimal", placeholder: "37.6273" })}
        </div>
        <FieldDescription>Координаты нужны для точки на карте в «Контактах». Их можно скопировать из Яндекс или Google Карт.</FieldDescription>
      </Section>

      <Section title="Запись" description="Изменения сразу применяются к расчёту свободного времени в боте.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={!!errors.timezone}>
            <FieldLabel htmlFor="settings-timezone">Часовой пояс салона</FieldLabel>
            <Controller
              control={form.control}
              name="timezone"
              render={({ field }) => (
                <Select items={timezones.map((z) => ({ value: z, label: z }))} value={String(field.value)} onValueChange={(v) => field.onChange(v ?? "")}>
                  <SelectTrigger id="settings-timezone" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {timezones.map((zone) => (
                      <SelectItem key={zone} value={zone}>
                        {zone}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <FieldError errors={[errors.timezone]} />
          </Field>
          <Field data-invalid={!!errors.currency}>
            <FieldLabel htmlFor="settings-currency">Валюта цен</FieldLabel>
            <Controller
              control={form.control}
              name="currency"
              render={({ field }) => (
                <Select items={CURRENCIES.map((c) => ({ value: c, label: c }))} value={field.value} onValueChange={(v) => field.onChange(v)}>
                  <SelectTrigger id="settings-currency" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((currency) => (
                      <SelectItem key={currency} value={currency}>
                        {currency}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
          <Field data-invalid={!!errors.slotStepMin}>
            <FieldLabel htmlFor="settings-step">Шаг времени записи</FieldLabel>
            <Controller
              control={form.control}
              name="slotStepMin"
              render={({ field }) => (
                <Select
                  items={SLOT_STEPS.map((s) => ({ value: String(s), label: `${s} мин` }))}
                  value={String(field.value)}
                  onValueChange={(v) => field.onChange(Number(v))}
                >
                  <SelectTrigger id="settings-step" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SLOT_STEPS.map((step) => (
                      <SelectItem key={step} value={String(step)}>
                        {step} мин
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <FieldDescription>Например, при 15 мин клиент выбирает 10:00, 10:15, 10:30…</FieldDescription>
          </Field>
          {text("minLeadTimeMin", "Записываться не позже чем за, мин", { type: "number", min: 0 })}
          {text("cancelDeadlineHours", "Отмена и перенос клиентом не позже чем за, ч", { type: "number", min: 0 })}
          {text("bookingHorizonDays", "Записываться вперёд на, дней", { type: "number", min: 1 })}
        </div>
      </Section>

      <Section title="Сообщения клиентам">
        {(
          [
            ["remindersEnabled", "Напоминания за 24 и 2 часа до визита"],
            ["reviewsEnabled", "Просить оценить визит после выполненной записи"],
          ] as const
        ).map(([name, label]) => (
          <Controller
            key={name}
            control={form.control}
            name={name}
            render={({ field }) => (
              <Field orientation="horizontal">
                <Switch id={`settings-${name}`} checked={Boolean(field.value)} onCheckedChange={field.onChange} />
                <FieldLabel htmlFor={`settings-${name}`}>{label}</FieldLabel>
              </Field>
            )}
          />
        ))}
      </Section>

      <div className="sticky bottom-0 -mx-4 flex justify-end border-t bg-background/95 px-4 py-3 backdrop-blur md:static md:mx-0 md:border-0 md:bg-transparent md:p-0">
        <Button type="submit" disabled={!isDirty || pending}>
          {pending && <Loader2 className="animate-spin" aria-hidden />}
          Сохранить настройки
        </Button>
      </div>
    </form>
  );
}
