import { z } from "zod";

import { optionalNumber, optionalText as optional } from "@/lib/validations/common";

export const CURRENCIES = ["USD", "EUR", "RUB"] as const;
export const SLOT_STEPS = [5, 10, 15, 20, 30, 60] as const;

const coordinate = (min: number, max: number, enter: string, range: string) =>
  optionalNumber(z.coerce.number(enter).min(min, range).max(max, range));

function isTimeZone(value: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

export const settingsSchema = z
  .object({
    name: z.string().trim().min(1, "validation.salonName").max(80, "validation.maxLength|max=80"),
    addressRu: optional(200),
    addressEn: optional(200),
    phone: optional(40).refine((value) => !value || /^\+?[\d\s()-]{7,20}$/.test(value), "validation.salonPhone"),
    instagram: optional(200).refine((value) => !value || /^https:\/\/(www\.)?instagram\.com\/[\w.]+\/?$/.test(value), "validation.instagram"),
    hoursRu: optional(120),
    hoursEn: optional(120),
    latitude: coordinate(-90, 90, "validation.enterLatitude", "validation.latitudeRange"),
    longitude: coordinate(-180, 180, "validation.enterLongitude", "validation.longitudeRange"),
    timezone: z.string().refine(isTimeZone, "validation.timezone"),
    currency: z.enum(CURRENCIES),
    slotStepMin: z.coerce.number().refine((v) => (SLOT_STEPS as readonly number[]).includes(v), "validation.step"),
    minLeadTimeMin: z.coerce.number().int("validation.integerMinutes").min(0, "validation.min|min=0").max(7 * 24 * 60, "validation.maxWeek"),
    cancelDeadlineHours: z.coerce.number().int("validation.integerHours").min(0, "validation.min|min=0").max(168, "validation.maxHours168"),
    bookingHorizonDays: z.coerce.number().int("validation.integerDays").min(1, "validation.minDay").max(90, "validation.maxDays90"),
    remindersEnabled: z.boolean(),
    reviewsEnabled: z.boolean(),
  })
  .refine((v) => (v.latitude === null) === (v.longitude === null), {
    path: ["longitude"],
    message: "validation.coordinatesBoth",
  });

export type SettingsValues = z.input<typeof settingsSchema>;
export type SettingsOutput = z.output<typeof settingsSchema>;
