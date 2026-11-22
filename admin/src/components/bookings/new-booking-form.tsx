"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Loader2, Search, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import {
  createBookingAction,
  searchClientsAction,
  serviceMastersAction,
} from "@/app/(dashboard)/bookings/actions";
import { SlotPicker } from "@/components/bookings/slot-picker";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/i18n/client";
import { SLOT_TAKEN } from "@/lib/booking-errors";
import { newBookingSchema, type NewBookingValues } from "@/lib/validations/booking";

type ServiceOption = { id: string; category: string; label: string; hint: string };
type ClientOption = { id: string; name: string; phone: string | null; telegram: boolean };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border bg-card p-4 md:p-5">
      <h2 className="mb-4 font-display text-xl font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export function NewBookingForm({ services, salonToday }: { services: ServiceOption[]; salonToday: string }) {
  const router = useRouter();
  const { t, tm } = useI18n();
  const [submitting, startSubmit] = useTransition();
  const form = useForm<NewBookingValues>({
    resolver: zodResolver(newBookingSchema),
    defaultValues: {
      clientMode: "existing",
      clientId: "",
      clientName: "",
      clientPhone: "",
      serviceId: "",
      masterId: "",
      day: salonToday,
      startsAt: "",
      comment: "",
    },
  });
  const { errors } = form.formState;
  const [clientMode, serviceId, masterId, day, startsAt] = useWatch({
    control: form.control,
    name: ["clientMode", "serviceId", "masterId", "day", "startsAt"],
  });

  // --- client search ---
  const [query, setQuery] = useState("");
  const [found, setFound] = useState<ClientOption[]>([]);
  const [selected, setSelected] = useState<ClientOption | null>(null);
  const [searching, startSearch] = useTransition();
  useEffect(() => {
    if (query.trim().length < 2) return;
    const timer = setTimeout(() => {
      startSearch(async () => {
        const result = await searchClientsAction(query);
        setFound(result.ok ? result.clients : []);
      });
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  // --- masters for the chosen service ---
  const [masters, setMasters] = useState<{ id: string; name: string }[]>([]);
  const [loadingMasters, startMasters] = useTransition();
  useEffect(() => {
    if (!serviceId) return;
    startMasters(async () => {
      const result = await serviceMastersAction(serviceId);
      const list = result.ok ? result.masters : [];
      setMasters(list);
      form.setValue("masterId", list.length === 1 ? list[0].id : "");
      form.setValue("startsAt", "");
    });
  }, [serviceId, form]);

  function onSubmit(values: NewBookingValues) {
    startSubmit(async () => {
      const result = await createBookingAction(values);
      if (!result.ok) {
        toast.error(tm(result.error));
        if (result.error === SLOT_TAKEN) form.setValue("startsAt", "");
        return;
      }
      toast.success(t("bookings.form.created"));
      router.push(`/bookings/${result.bookingId}`);
    });
  }

  const serviceItems = services.map((s) => ({ value: s.id, label: s.label }));
  const groups = [...new Set(services.map((s) => s.category))];
  const masterItems = masters.map((m) => ({ value: m.id, label: m.name }));

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="grid max-w-3xl gap-4">
      <Section title={t("bookings.form.client")}>
        <Tabs
          value={clientMode}
          onValueChange={(value) => form.setValue("clientMode", value as NewBookingValues["clientMode"])}
          className="mb-4"
        >
          <TabsList>
            <TabsTrigger value="existing">{t("bookings.form.existing")}</TabsTrigger>
            <TabsTrigger value="new">{t("bookings.form.newClient")}</TabsTrigger>
          </TabsList>
        </Tabs>

        {clientMode === "existing" ? (
          <Field data-invalid={!!errors.clientId}>
            <FieldLabel htmlFor="client-search">{t("bookings.form.search")}</FieldLabel>
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input
                id="client-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t("bookings.form.searchPlaceholder")}
                className="pl-8"
                autoComplete="off"
              />
            </div>
            {selected && (
              <p className="flex items-center gap-2 text-sm">
                <Check className="size-4 text-primary" aria-hidden />
                {t("bookings.form.selected")} <span className="font-medium">{selected.name}</span>
                {selected.phone && <span className="text-muted-foreground">{selected.phone}</span>}
              </p>
            )}
            {query.trim().length >= 2 && (
              <div className="rounded-lg border">
                {searching ? (
                  <p className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" aria-hidden /> {t("bookings.form.searching")}
                  </p>
                ) : found.length === 0 ? (
                  <p className="px-3 py-2 text-sm text-muted-foreground">
                    {t("bookings.form.notFound")}{" "}
                    <button
                      type="button"
                      className="text-primary hover:underline"
                      onClick={() => form.setValue("clientMode", "new")}
                    >
                      {t("bookings.form.createNew")}
                    </button>
                  </p>
                ) : (
                  <ul className="max-h-56 divide-y overflow-y-auto">
                    {found.map((client) => (
                      <li key={client.id}>
                        <button
                          type="button"
                          aria-pressed={selected?.id === client.id}
                          onClick={() => {
                            setSelected(client);
                            form.setValue("clientId", client.id, { shouldValidate: true });
                          }}
                          className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-accent aria-pressed:bg-accent"
                        >
                          <span className="min-w-0">
                            <span className="block truncate font-medium">{client.name}</span>
                            <span className="block truncate text-xs text-muted-foreground">{client.phone ?? t("bookings.form.noPhone")}</span>
                          </span>
                          {client.telegram && (
                            <span className="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                              <Send className="size-3" aria-hidden /> Telegram
                            </span>
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            <FieldError errors={[errors.clientId]} />
          </Field>
        ) : (
          <FieldGroup className="sm:grid sm:grid-cols-2">
            <Field data-invalid={!!errors.clientName}>
              <FieldLabel htmlFor="client-name">{t("bookings.form.name")}</FieldLabel>
              <Input id="client-name" autoComplete="off" aria-invalid={!!errors.clientName} {...form.register("clientName")} />
              <FieldError errors={[errors.clientName]} />
            </Field>
            <Field data-invalid={!!errors.clientPhone}>
              <FieldLabel htmlFor="client-phone">{t("bookings.form.phone")}</FieldLabel>
              <Input
                id="client-phone"
                type="tel"
                autoComplete="off"
                placeholder="+7 900 123-45-67"
                aria-invalid={!!errors.clientPhone}
                {...form.register("clientPhone")}
              />
              <FieldError errors={[errors.clientPhone]} />
            </Field>
            <p className="text-xs text-muted-foreground sm:col-span-2">
              {t("bookings.form.phoneHint")}
            </p>
          </FieldGroup>
        )}
      </Section>

      <Section title={t("bookings.form.serviceMaster")}>
        <FieldGroup className="sm:grid sm:grid-cols-2">
          <Field data-invalid={!!errors.serviceId}>
            <FieldLabel htmlFor="service">{t("bookings.form.service")}</FieldLabel>
            <Controller
              control={form.control}
              name="serviceId"
              render={({ field }) => (
                <Select items={serviceItems} value={field.value || null} onValueChange={(value) => field.onChange(value ?? "")}>
                  <SelectTrigger id="service" className="w-full" aria-invalid={!!errors.serviceId}>
                    <SelectValue placeholder={t("bookings.form.pickService")} />
                  </SelectTrigger>
                  <SelectContent>
                    {groups.map((group) => (
                      <SelectGroup key={group}>
                        <SelectLabel>{group}</SelectLabel>
                        {services
                          .filter((s) => s.category === group)
                          .map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              <span className="flex w-full items-center justify-between gap-3">
                                {s.label}
                                <span className="text-xs text-muted-foreground">{s.hint}</span>
                              </span>
                            </SelectItem>
                          ))}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <FieldError errors={[errors.serviceId]} />
          </Field>
          <Field data-invalid={!!errors.masterId}>
            <FieldLabel htmlFor="master">{t("bookings.form.master")}</FieldLabel>
            <Controller
              control={form.control}
              name="masterId"
              render={({ field }) => (
                <Select
                  items={masterItems}
                  value={field.value || null}
                  onValueChange={(value) => {
                    field.onChange(value ?? "");
                    form.setValue("startsAt", "");
                  }}
                  disabled={!serviceId || loadingMasters || masters.length === 0}
                >
                  <SelectTrigger id="master" className="w-full" aria-invalid={!!errors.masterId}>
                    <SelectValue
                      placeholder={
                        !serviceId ? t("bookings.form.pickServiceFirst") : masters.length === 0 && !loadingMasters ? t("bookings.form.nobodyDoes") : t("bookings.form.pickMaster")
                      }
                    />
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
            />
            <FieldError errors={[errors.masterId]} />
          </Field>
        </FieldGroup>
      </Section>

      <Section title={t("bookings.form.dateTime")}>
        <SlotPicker
          serviceId={serviceId || null}
          masterId={masterId || null}
          day={day}
          onDayChange={(value) => form.setValue("day", value)}
          value={startsAt || null}
          onChange={(value) => form.setValue("startsAt", value ?? "", { shouldValidate: !!value })}
          minDay={salonToday}
        />
        <FieldError className="mt-2" errors={[errors.startsAt]} />
      </Section>

      <Section title={t("bookings.form.comment")}>
        <Field data-invalid={!!errors.comment}>
          <FieldLabel htmlFor="comment" className="sr-only">
            {t("bookings.form.comment")}
          </FieldLabel>
          <Textarea id="comment" rows={3} placeholder={t("bookings.form.commentPlaceholder")} {...form.register("comment")} />
          <FieldError errors={[errors.comment]} />
        </Field>
      </Section>

      <div className="flex justify-end">
        <Button type="submit" size="lg" disabled={submitting}>
          {submitting && <Loader2 className="animate-spin" aria-hidden />}
          {t("bookings.form.submit")}
        </Button>
      </div>
    </form>
  );
}
