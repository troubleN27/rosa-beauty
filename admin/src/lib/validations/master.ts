import { z } from "zod";

import { optionalNumber, optionalText as optional } from "@/lib/validations/common";

const text = (label: string, max = 80) =>
  z.string().trim().min(1, `Введите ${label}`).max(max, `Не длиннее ${max} символов`);

export const masterSchema = z.object({
  nameRu: text("имя на русском"),
  nameEn: text("имя на английском"),
  specialtyRu: optional(120),
  specialtyEn: optional(120),
  experienceYears: optionalNumber(
    z.coerce.number().int("Целое число лет").min(0, "Не меньше 0").max(70, "Не больше 70"),
  ),
  sort: z.coerce.number().int("Целое число").min(0, "Не меньше 0").max(999, "Не больше 999"),
  isActive: z.boolean(),
});
export type MasterValues = z.input<typeof masterSchema>;
export type MasterOutput = z.output<typeof masterSchema>;

const clock = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Время в формате ЧЧ:ММ");
const toMinutes = (value: string) => Number(value.slice(0, 2)) * 60 + Number(value.slice(3, 5));

export const scheduleDaySchema = z
  .object({
    weekday: z.number().int().min(1).max(7),
    works: z.boolean(),
    start: z.string(),
    end: z.string(),
    breakStart: z.string(),
    breakEnd: z.string(),
  })
  .superRefine((day, ctx) => {
    if (!day.works) return;
    for (const key of ["start", "end"] as const) {
      if (!clock.safeParse(day[key]).success) ctx.addIssue({ code: "custom", path: [key], message: "ЧЧ:ММ" });
    }
    if (clock.safeParse(day.start).success && clock.safeParse(day.end).success && toMinutes(day.end) <= toMinutes(day.start)) {
      ctx.addIssue({ code: "custom", path: ["end"], message: "Конец позже начала" });
    }
    const hasBreak = Boolean(day.breakStart || day.breakEnd);
    if (!hasBreak) return;
    if (!clock.safeParse(day.breakStart).success || !clock.safeParse(day.breakEnd).success) {
      ctx.addIssue({ code: "custom", path: ["breakStart"], message: "Укажите начало и конец перерыва" });
      return;
    }
    const [s, e, bs, be] = [day.start, day.end, day.breakStart, day.breakEnd].map(toMinutes);
    if (be <= bs) ctx.addIssue({ code: "custom", path: ["breakEnd"], message: "Конец перерыва позже начала" });
    else if (bs < s || be > e) ctx.addIssue({ code: "custom", path: ["breakStart"], message: "Перерыв внутри рабочего дня" });
  });

export const scheduleSchema = z.object({
  masterId: z.uuid(),
  days: z.array(scheduleDaySchema).length(7),
});
export type ScheduleValues = z.input<typeof scheduleSchema>;

const isoDay = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Выберите дату");

export const timeOffSchema = z
  .object({
    masterId: z.uuid(),
    dateFrom: isoDay,
    dateTo: isoDay,
    reason: optional(120),
  })
  .refine((value) => value.dateTo >= value.dateFrom, { path: ["dateTo"], message: "Не раньше даты начала" });
export type TimeOffValues = z.input<typeof timeOffSchema>;
export type TimeOffOutput = z.output<typeof timeOffSchema>;
