"use client";

import { format, parse } from "date-fns";
import { ru as ruDateFns } from "date-fns/locale";
import { CalendarDays, X } from "lucide-react";
import { useState } from "react";
import { ru } from "react-day-picker/locale";

import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const ISO = "yyyy-MM-dd";

function toDate(value: string | undefined) {
  if (!value) return undefined;
  const date = parse(value, ISO, new Date());
  return Number.isNaN(date.getTime()) ? undefined : date;
}

/**
 * Themed date field. Keeps the value as a "YYYY-MM-DD" string, like a native date input,
 * so forms and URL filters stay unchanged.
 */
export function DatePicker({
  value,
  onChange,
  min,
  id,
  placeholder = "Выберите дату",
  ariaLabel,
  clearable = false,
  className,
  invalid,
}: {
  value: string | undefined;
  onChange: (value: string) => void;
  min?: string;
  id?: string;
  placeholder?: string;
  ariaLabel?: string;
  clearable?: boolean;
  className?: string;
  invalid?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = toDate(value);
  const minDate = toDate(min);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div className={cn("relative w-44", className)}>
        <PopoverTrigger
          id={id}
          aria-label={ariaLabel}
          aria-invalid={invalid || undefined}
          className={cn(
            "flex h-8 w-full items-center gap-2 rounded-lg border border-input bg-card px-2.5 text-left text-sm transition-[border-color,box-shadow] duration-300 outline-none hover:border-gold/60 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 aria-invalid:border-destructive data-popup-open:border-gold data-popup-open:ring-3 data-popup-open:ring-gold/20",
            clearable && value && "pr-8",
          )}
        >
          <CalendarDays className="size-4 shrink-0 text-gold" aria-hidden />
          <span className={cn("truncate", !selected && "text-muted-foreground")}>
            {selected ? format(selected, "d MMMM yyyy", { locale: ruDateFns }) : placeholder}
          </span>
        </PopoverTrigger>
        {clearable && value && (
          <button
            type="button"
            onClick={() => onChange("")}
            aria-label="Очистить дату"
            className="absolute top-1/2 right-1.5 grid size-5 -translate-y-1/2 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="size-3.5" aria-hidden />
          </button>
        )}
      </div>
      <PopoverContent align="start" className="w-auto p-2">
        <Calendar
          mode="single"
          animate
          locale={ru}
          weekStartsOn={1}
          selected={selected}
          defaultMonth={selected ?? minDate}
          disabled={minDate ? { before: minDate } : undefined}
          modifiers={{ weekend: { dayOfWeek: [0, 6] } }}
          modifiersClassNames={{ weekend: "rdp-weekend" }}
          onSelect={(date) => {
            if (!date) return;
            onChange(format(date, ISO));
            setOpen(false);
          }}
          className="rose-calendar"
        />
      </PopoverContent>
    </Popover>
  );
}
