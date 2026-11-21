import { z } from "zod";

import { BOOKING_SOURCES, BOOKING_STATUSES } from "@/lib/constants";

const isoDay = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Выберите дату");

export const statusSchema = z.object({
  bookingId: z.uuid(),
  status: z.enum(BOOKING_STATUSES),
});

export const freeSlotsSchema = z.object({
  serviceId: z.uuid(),
  masterId: z.uuid(),
  day: isoDay,
  excludeBookingId: z.uuid().optional(),
});

export const rescheduleSchema = z.object({
  bookingId: z.uuid(),
  startsAt: z.iso.datetime({ offset: true }),
});

export const phoneSchema = z
  .string()
  .trim()
  .min(1, "Введите телефон")
  .refine((value) => /^\+?[\d\s()-]{7,20}$/.test(value), "Телефон в формате +7 900 123-45-67")
  .refine((value) => value.replace(/\D/g, "").length >= 7, "Слишком короткий номер");

export const newBookingSchema = z
  .object({
    clientMode: z.enum(["existing", "new"]),
    clientId: z.string().optional(),
    clientName: z.string().trim().max(64, "Не длиннее 64 символов").optional(),
    clientPhone: z.string().optional(),
    serviceId: z.uuid("Выберите услугу"),
    masterId: z.uuid("Выберите мастера"),
    day: isoDay,
    startsAt: z.iso.datetime({ offset: true, message: "Выберите время" }),
    comment: z.string().trim().max(500, "Не длиннее 500 символов").optional(),
  })
  .superRefine((value, ctx) => {
    if (value.clientMode === "existing") {
      if (!value.clientId || !z.uuid().safeParse(value.clientId).success) {
        ctx.addIssue({ code: "custom", path: ["clientId"], message: "Выберите клиента" });
      }
      return;
    }
    if (!value.clientName) {
      ctx.addIssue({ code: "custom", path: ["clientName"], message: "Введите имя" });
    }
    const phone = phoneSchema.safeParse(value.clientPhone ?? "");
    if (!phone.success) {
      ctx.addIssue({ code: "custom", path: ["clientPhone"], message: phone.error.issues[0].message });
    }
  });

export type NewBookingValues = z.infer<typeof newBookingSchema>;

export const bookingFiltersSchema = z.object({
  from: isoDay.optional().catch(undefined),
  to: isoDay.optional().catch(undefined),
  master: z.uuid().optional().catch(undefined),
  status: z.enum(BOOKING_STATUSES).optional().catch(undefined),
  source: z.enum(BOOKING_SOURCES).optional().catch(undefined),
  sort: z.enum(["starts_asc", "starts_desc", "created_desc"]).catch("starts_desc"),
  page: z.coerce.number().int().min(1).catch(1),
});
