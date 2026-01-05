import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "E-mailadres is verplicht")
    .email("Ongeldig e-mailadres"),
  password: z.string().min(1, "Wachtwoord is verplicht"),
});

export const registerSchema = z
  .object({
    name: z.string().min(2, "Naam moet minimaal 2 tekens bevatten"),
    email: z
      .string()
      .min(1, "E-mailadres is verplicht")
      .email("Ongeldig e-mailadres"),
    password: z
      .string()
      .min(8, "Wachtwoord moet minimaal 8 tekens bevatten")
      .regex(/[A-Z]/, "Wachtwoord moet minimaal één hoofdletter bevatten")
      .regex(/[a-z]/, "Wachtwoord moet minimaal één kleine letter bevatten")
      .regex(/[0-9]/, "Wachtwoord moet minimaal één cijfer bevatten"),
    confirmPassword: z.string().min(1, "Bevestig wachtwoord is verplicht"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Wachtwoorden komen niet overeen",
    path: ["confirmPassword"],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
