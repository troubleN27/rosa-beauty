import { z } from "zod";

import "@/lib/validations/common";

import { BOOKING_SOURCES, BOOKING_STATUSES } from "@/lib/constants";

const isoDay = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "validation.pickDate");

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
  .min(1, "validation.phoneRequired")
  .refine((value) => /^\+?[\d\s()-]{7,20}$/.test(value), "validation.phoneFormat")
  .refine((value) => value.replace(/\D/g, "").length >= 7, "validation.phoneShort");

export const newBookingSchema = z
  .object({
    clientMode: z.enum(["existing", "new"]),
    clientId: z.string().optional(),
    clientName: z.string().trim().max(64, "validation.maxLength|max=64").optional(),
    clientPhone: z.string().optional(),
    serviceId: z.uuid("validation.pickService"),
    masterId: z.uuid("validation.pickMaster"),
    day: isoDay,
    startsAt: z.iso.datetime({ offset: true, message: "validation.pickTime" }),
    comment: z.string().trim().max(500, "validation.maxLength|max=500").optional(),
  })
  .superRefine((value, ctx) => {
    if (value.clientMode === "existing") {
      if (!value.clientId || !z.uuid().safeParse(value.clientId).success) {
        ctx.addIssue({ code: "custom", path: ["clientId"], message: "validation.pickClient" });
      }
      return;
    }
    if (!value.clientName) {
      ctx.addIssue({ code: "custom", path: ["clientName"], message: "validation.enterName" });
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
