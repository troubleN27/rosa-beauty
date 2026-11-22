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
import { useI18n } from "@/i18n/client";

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border bg-card p-4 md:p-5">
      <h2 className="font-display text-xl font-semibold">{title}</h2>
      {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
      <FieldGroup className="mt-4">{children}</FieldGroup>
    </section>
  );
}

export function SettingsForm({ initial }: { initial: SettingsValues }) {
  const router = useRouter();
  const { t, tm } = useI18n();
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
      if (!result.ok) return void toast.error(tm(result.error));
      toast.success(t("settings.saved"));
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
      <Section title={t("settings.salon")} description={t("settings.salonHint")}>
        {text("name", t("settings.name"))}
        <div className="grid gap-4 sm:grid-cols-2">
          {text("addressRu", t("settings.addressRu"))}
          {text("addressEn", t("settings.addressEn"))}
          {text("hoursRu", t("settings.hoursRu"), { placeholder: t("settings.hoursRuPlaceholder") })}
          {text("hoursEn", t("settings.hoursEn"), { placeholder: "Daily 10:00–21:00" })}
          {text("phone", t("settings.phone"), { type: "tel" })}
          {text("instagram", "Instagram", { type: "url", placeholder: "https://instagram.com/salon" })}
          {text("latitude", t("settings.latitude"), { inputMode: "decimal", placeholder: "55.7398" })}
          {text("longitude", t("settings.longitude"), { inputMode: "decimal", placeholder: "37.6273" })}
        </div>
        <FieldDescription>{t("settings.coordinatesHint")}</FieldDescription>
      </Section>

      <Section title={t("settings.booking")} description={t("settings.bookingHint")}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={!!errors.timezone}>
            <FieldLabel htmlFor="settings-timezone">{t("settings.timezone")}</FieldLabel>
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
            <FieldLabel htmlFor="settings-currency">{t("settings.currency")}</FieldLabel>
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
            <FieldLabel htmlFor="settings-step">{t("settings.step")}</FieldLabel>
            <Controller
              control={form.control}
              name="slotStepMin"
              render={({ field }) => (
                <Select
                  items={SLOT_STEPS.map((s) => ({ value: String(s), label: t("common.minutesShort", { count: s }) }))}
                  value={String(field.value)}
                  onValueChange={(v) => field.onChange(Number(v))}
                >
                  <SelectTrigger id="settings-step" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SLOT_STEPS.map((step) => (
                      <SelectItem key={step} value={String(step)}>
                        {t("common.minutesShort", { count: step })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <FieldDescription>{t("settings.stepHint")}</FieldDescription>
          </Field>
          {text("minLeadTimeMin", t("settings.minLead"), { type: "number", min: 0 })}
          {text("cancelDeadlineHours", t("settings.cancelDeadline"), { type: "number", min: 0 })}
          {text("bookingHorizonDays", t("settings.horizon"), { type: "number", min: 1 })}
        </div>
      </Section>

      <Section title={t("settings.messages")}>
        {(
          [
            ["remindersEnabled", t("settings.reminders")],
            ["reviewsEnabled", t("settings.reviewsRequest")],
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
          {t("settings.save")}
        </Button>
      </div>
    </form>
  );
}
