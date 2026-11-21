import { z } from "zod";

import { optionalText as optional } from "@/lib/validations/common";

const name = (label: string) =>
  z.string().trim().min(1, `Введите ${label}`).max(80, "Не длиннее 80 символов");
const optionalText = optional(500);
const sort = z.coerce.number().int("Целое число").min(0, "Не меньше 0").max(999, "Не больше 999");

export const categorySchema = z.object({
  id: z.uuid().optional(),
  nameRu: name("название на русском"),
  nameEn: name("название на английском"),
  sort,
  isActive: z.boolean(),
});
export type CategoryValues = z.input<typeof categorySchema>;
export type CategoryOutput = z.output<typeof categorySchema>;

export const serviceSchema = z.object({
  id: z.uuid().optional(),
  categoryId: z.uuid("Выберите категорию"),
  nameRu: name("название на русском"),
  nameEn: name("название на английском"),
  descriptionRu: optionalText,
  descriptionEn: optionalText,
  durationMin: z.coerce
    .number()
    .int("Целое число минут")
    .min(5, "Не меньше 5 минут")
    .max(600, "Не больше 10 часов")
    .refine((value) => value % 5 === 0, "Кратно 5 минутам"),
  price: z.coerce
    .number("Введите цену")
    .min(0, "Цена не может быть отрицательной")
    .max(100000, "Слишком большая цена")
    // 19.99 * 100 is 1998.9999…, so compare with a tolerance instead of Number.isInteger
    .refine((value) => Math.abs(Math.round(value * 100) - value * 100) < 1e-6, "Не больше двух знаков после запятой"),
  sort,
  isActive: z.boolean(),
});
export type ServiceValues = z.input<typeof serviceSchema>;
export type ServiceOutput = z.output<typeof serviceSchema>;
