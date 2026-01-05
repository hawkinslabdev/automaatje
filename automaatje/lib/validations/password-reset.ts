import { z } from "zod";

/**
 * Schema for requesting a password reset
 */
export const requestResetSchema = z.object({
  email: z
    .string()
    .min(1, "E-mailadres is verplicht")
    .email("Ongeldig e-mailadres"),
});

/**
 * Schema for verifying reset token and setting new password
 */
export const verifyResetSchema = z
  .object({
    email: z
      .string()
      .min(1, "E-mailadres is verplicht")
      .email("Ongeldig e-mailadres"),
    token: z
      .string()
      .length(6, "Code moet 6 cijfers zijn")
      .regex(/^\d{6}$/, "Code moet alleen cijfers bevatten"),
    password: z
      .string()
      .min(8, "Wachtwoord moet minimaal 8 tekens bevatten")
      .regex(/[A-Z]/, "Wachtwoord moet minimaal 1 hoofdletter bevatten")
      .regex(/[a-z]/, "Wachtwoord moet minimaal 1 kleine letter bevatten")
      .regex(/\d/, "Wachtwoord moet minimaal 1 cijfer bevatten"),
    confirmPassword: z.string().min(1, "Bevestig je wachtwoord"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Wachtwoorden komen niet overeen",
    path: ["confirmPassword"],
  });

export type RequestResetInput = z.infer<typeof requestResetSchema>;
export type VerifyResetInput = z.infer<typeof verifyResetSchema>;
