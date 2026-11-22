"use client";

import { Clock } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const HOURS = Array.from({ length: 24 }, (_, h) => String(h).padStart(2, "0"));
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, "0"));

function Column({
  items,
  value,
  onPick,
  label,
  open,
}: {
  items: string[];
  value: string;
  onPick: (value: string) => void;
  label: string;
  open: boolean;
}) {
  const listRef = useRef<HTMLDivElement>(null);

  // Bring the chosen value to the middle once the popup has been laid out.
  useEffect(() => {
    if (!open) return;
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => {
        const list = listRef.current;
        const chosen = list?.querySelector<HTMLElement>("[aria-selected=true]");
        if (list && chosen) list.scrollTop = chosen.offsetTop - list.clientHeight / 2 + chosen.offsetHeight / 2;
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [open, value]);

  return (
    <div ref={listRef} role="listbox" aria-label={label} className="relative h-52 w-14 overflow-y-auto overscroll-contain py-1 [scrollbar-width:none]">
      {items.map((item) => (
        <button
          key={item}
          type="button"
          role="option"
          aria-selected={item === value}
          onClick={() => onPick(item)}
          className={cn(
            "mx-auto my-0.5 flex h-8 w-11 items-center justify-center rounded-full font-display text-lg tabular-nums transition-[background-color,color,transform] duration-200 hover:bg-primary/12",
            item === value && "time-chosen bg-primary text-primary-foreground hover:bg-primary",
          )}
        >
          {item}
        </button>
      ))}
    </div>
  );
}

/** Themed "HH:MM" field with hour and 5-minute columns. */
export function TimePicker({
  value,
  onChange,
  label,
  invalid,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  invalid?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [hour = "10", minute = "00"] = value ? value.split(":") : [];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        aria-label={label}
        aria-invalid={invalid || undefined}
        className="flex h-8 w-[6.5rem] items-center gap-2 rounded-lg border border-input bg-card px-2.5 text-sm tabular-nums transition-[border-color,box-shadow] duration-300 outline-none hover:border-gold/60 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 aria-invalid:border-destructive data-popup-open:border-gold data-popup-open:ring-3 data-popup-open:ring-gold/20"
      >
        <Clock className="size-3.5 shrink-0 text-gold" aria-hidden />
        <span className={cn(!value && "text-muted-foreground")}>{value || "--:--"}</span>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto flex-row gap-0 p-1.5">
        <Column items={HOURS} value={hour} label="Часы" open={open} onPick={(h) => onChange(`${h}:${minute}`)} />
        <div className="my-3 w-px bg-gold/30" aria-hidden />
        <Column
          items={MINUTES}
          value={minute}
          label="Минуты"
          open={open}
          onPick={(m) => {
            onChange(`${hour}:${m}`);
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
