import { z } from "zod";

import "@/lib/validations/common";

export const loginSchema = z.object({
  email: z.email("validation.email"),
  password: z.string().min(1, "validation.password"),
});

export type LoginValues = z.infer<typeof loginSchema>;
