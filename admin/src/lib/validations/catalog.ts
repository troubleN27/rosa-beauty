import { z } from "zod";

import { optionalText as optional } from "@/lib/validations/common";

const name = (label: string) =>
  z.string().trim().min(1, label).max(80, "validation.maxLength|max=80");
const optionalText = optional(500);
const sort = z.coerce.number().int("validation.integer").min(0, "validation.min|min=0").max(999, "validation.max|max=999");

export const categorySchema = z.object({
  id: z.uuid().optional(),
  nameRu: name("validation.enterNameRu"),
  nameEn: name("validation.enterNameEn"),
  sort,
  isActive: z.boolean(),
});
export type CategoryValues = z.input<typeof categorySchema>;
export type CategoryOutput = z.output<typeof categorySchema>;

export const serviceSchema = z.object({
  id: z.uuid().optional(),
  categoryId: z.uuid("validation.pickCategory"),
  nameRu: name("validation.enterNameRu"),
  nameEn: name("validation.enterNameEn"),
  descriptionRu: optionalText,
  descriptionEn: optionalText,
  durationMin: z.coerce
    .number()
    .int("validation.integerMinutes")
    .min(5, "validation.durationMin")
    .max(600, "validation.durationMax")
    .refine((value) => value % 5 === 0, "validation.durationStep"),
  price: z.coerce
    .number("validation.enterPrice")
    .min(0, "validation.priceNegative")
    .max(100000, "validation.priceTooBig")
    // 19.99 * 100 is 1998.9999…, so compare with a tolerance instead of Number.isInteger
    .refine((value) => Math.abs(Math.round(value * 100) - value * 100) < 1e-6, "validation.priceCents"),
  sort,
  isActive: z.boolean(),
});
export type ServiceValues = z.input<typeof serviceSchema>;
export type ServiceOutput = z.output<typeof serviceSchema>;
