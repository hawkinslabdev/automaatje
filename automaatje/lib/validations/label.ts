import { z } from "zod";

/**
 * Validation schema for label
 */
export const labelSchema = z.object({
  name: z
    .string()
    .min(1, "Label naam is verplicht")
    .max(50, "Label naam mag maximaal 50 tekens bevatten")
    .trim(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Ongeldige kleurcode"),
});

export type LabelFormData = z.infer<typeof labelSchema>;
