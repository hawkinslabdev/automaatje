import { z } from "zod";

/**
 * Schema for changing password (requires current password verification)
 */
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Huidig wachtwoord is verplicht"),
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
  })
  .refine((data) => data.currentPassword !== data.password, {
    message: "Nieuw wachtwoord moet verschillend zijn van het huidige wachtwoord",
    path: ["password"],
  });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
