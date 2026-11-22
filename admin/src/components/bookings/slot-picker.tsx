"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useState, useTransition } from "react";

import { freeSlotsAction } from "@/app/(dashboard)/bookings/actions";
import { Field, FieldLabel } from "@/components/ui/field";
import { DatePicker } from "@/components/date-picker";

type Slot = { value: string; label: string };

/** Date + free time picker; times come from lib/slots.ts on the server. */
export function SlotPicker({
  serviceId,
  masterId,
  excludeBookingId,
  day,
  onDayChange,
  value,
  onChange,
  minDay,
}: {
  serviceId: string | null;
  masterId: string | null;
  excludeBookingId?: string;
  day: string;
  onDayChange: (day: string) => void;
  value: string | null;
  onChange: (value: string | null) => void;
  minDay: string;
}) {
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const ready = Boolean(serviceId && masterId && day);

  useEffect(() => {
    if (!serviceId || !masterId || !day) return;
    let cancelled = false;
    startTransition(async () => {
      const result = await freeSlotsAction({ serviceId, masterId, day, excludeBookingId });
      if (cancelled) return;
      if (result.ok) {
        setSlots(result.slots);
        setError(null);
      } else {
        setSlots(null);
        setError(result.error);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [serviceId, masterId, day, excludeBookingId]);

  return (
    <div className="space-y-3">
      <Field>
        <FieldLabel htmlFor="slot-day">Дата</FieldLabel>
        <DatePicker
          id="slot-day"
          min={minDay}
          value={day}
          onChange={(value) => {
            onChange(null);
            onDayChange(value);
          }}
          className="w-52"
        />
      </Field>
      <div>
        <p className="mb-2 text-sm font-medium">Свободное время</p>
        {!ready ? (
          <p className="text-sm text-muted-foreground">Сначала выберите услугу, мастера и дату.</p>
        ) : pending ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden /> Считаем свободное время…
          </p>
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : !slots || slots.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            В этот день у мастера нет свободного времени — выберите другую дату.
          </p>
        ) : (
          <div role="radiogroup" aria-label="Свободное время" className="grid grid-cols-4 gap-1.5 sm:grid-cols-6">
            {slots.map((slot) => {
              const selected = slot.value === value;
              return (
                <button
                  key={slot.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => onChange(slot.value)}
                  className={
                    "h-8 rounded-md border text-sm tabular-nums transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none " +
                    (selected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "bg-card hover:border-primary/60 hover:bg-accent")
                  }
                >
                  {slot.label}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
