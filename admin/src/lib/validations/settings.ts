import { z } from "zod";

import { optionalNumber, optionalText as optional } from "@/lib/validations/common";

export const CURRENCIES = ["USD", "EUR", "RUB"] as const;
export const SLOT_STEPS = [5, 10, 15, 20, 30, 60] as const;

const coordinate = (min: number, max: number, label: string) =>
  optionalNumber(
    z.coerce
      .number(`Введите ${label.toLowerCase()} числом`)
      .min(min, `${label}: от ${min} до ${max}`)
      .max(max, `${label}: от ${min} до ${max}`),
  );

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
    name: z.string().trim().min(1, "Введите название салона").max(80, "Не длиннее 80 символов"),
    addressRu: optional(200),
    addressEn: optional(200),
    phone: optional(40).refine((value) => !value || /^\+?[\d\s()-]{7,20}$/.test(value), "Телефон в формате +7 495 123-45-67"),
    instagram: optional(200).refine((value) => !value || /^https:\/\/(www\.)?instagram\.com\/[\w.]+\/?$/.test(value), "Ссылка вида https://instagram.com/salon"),
    hoursRu: optional(120),
    hoursEn: optional(120),
    latitude: coordinate(-90, 90, "Широта"),
    longitude: coordinate(-180, 180, "Долгота"),
    timezone: z.string().refine(isTimeZone, "Выберите часовой пояс из списка"),
    currency: z.enum(CURRENCIES),
    slotStepMin: z.coerce.number().refine((v) => (SLOT_STEPS as readonly number[]).includes(v), "Выберите шаг из списка"),
    minLeadTimeMin: z.coerce.number().int("Целое число минут").min(0, "Не меньше 0").max(7 * 24 * 60, "Не больше недели"),
    cancelDeadlineHours: z.coerce.number().int("Целое число часов").min(0, "Не меньше 0").max(168, "Не больше 168 часов"),
    bookingHorizonDays: z.coerce.number().int("Целое число дней").min(1, "Не меньше 1 дня").max(90, "Не больше 90 дней"),
    remindersEnabled: z.boolean(),
    reviewsEnabled: z.boolean(),
  })
  .refine((v) => (v.latitude === null) === (v.longitude === null), {
    path: ["longitude"],
    message: "Укажите широту и долготу вместе",
  });

export type SettingsValues = z.input<typeof settingsSchema>;
export type SettingsOutput = z.output<typeof settingsSchema>;
