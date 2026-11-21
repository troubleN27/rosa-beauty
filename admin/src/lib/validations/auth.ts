import { z } from "zod";

export const loginSchema = z.object({
  email: z.email("Введите email в формате name@example.com"),
  password: z.string().min(1, "Введите пароль"),
});

export type LoginValues = z.infer<typeof loginSchema>;
