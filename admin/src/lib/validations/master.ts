import { z } from "zod";

import { optionalNumber, optionalText as optional } from "@/lib/validations/common";

const text = (label: string, max = 80) =>
  z.string().trim().min(1, label).max(max, `validation.maxLength|max=${max}`);

export const masterSchema = z.object({
  nameRu: text("validation.enterMasterNameRu"),
  nameEn: text("validation.enterMasterNameEn"),
  specialtyRu: optional(120),
  specialtyEn: optional(120),
  experienceYears: optionalNumber(
    z.coerce.number().int("validation.integerYears").min(0, "validation.min|min=0").max(70, "validation.max|max=70"),
  ),
  sort: z.coerce.number().int("validation.integer").min(0, "validation.min|min=0").max(999, "validation.max|max=999"),
  isActive: z.boolean(),
});
export type MasterValues = z.input<typeof masterSchema>;
export type MasterOutput = z.output<typeof masterSchema>;

const clock = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "validation.clock");
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
      if (!clock.safeParse(day[key]).success) ctx.addIssue({ code: "custom", path: [key], message: "validation.clockShort" });
    }
    if (clock.safeParse(day.start).success && clock.safeParse(day.end).success && toMinutes(day.end) <= toMinutes(day.start)) {
      ctx.addIssue({ code: "custom", path: ["end"], message: "validation.endAfterStart" });
    }
    const hasBreak = Boolean(day.breakStart || day.breakEnd);
    if (!hasBreak) return;
    if (!clock.safeParse(day.breakStart).success || !clock.safeParse(day.breakEnd).success) {
      ctx.addIssue({ code: "custom", path: ["breakStart"], message: "validation.breakBoth" });
      return;
    }
    const [s, e, bs, be] = [day.start, day.end, day.breakStart, day.breakEnd].map(toMinutes);
    if (be <= bs) ctx.addIssue({ code: "custom", path: ["breakEnd"], message: "validation.breakEndAfterStart" });
    else if (bs < s || be > e) ctx.addIssue({ code: "custom", path: ["breakStart"], message: "validation.breakInside" });
  });

export const scheduleSchema = z.object({
  masterId: z.uuid(),
  days: z.array(scheduleDaySchema).length(7),
});
export type ScheduleValues = z.input<typeof scheduleSchema>;

const isoDay = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "validation.pickDate");

export const timeOffSchema = z
  .object({
    masterId: z.uuid(),
    dateFrom: isoDay,
    dateTo: isoDay,
    reason: optional(120),
  })
  .refine((value) => value.dateTo >= value.dateFrom, { path: ["dateTo"], message: "validation.notBeforeStart" });
export type TimeOffValues = z.input<typeof timeOffSchema>;
export type TimeOffOutput = z.output<typeof timeOffSchema>;
