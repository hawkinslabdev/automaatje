import { z } from "zod";

/**
 * Validation schema for organization name
 */
export const organizationSchema = z.object({
  name: z
    .string()
    .min(1, "Bedrijfsnaam is verplicht")
    .max(200, "Bedrijfsnaam mag maximaal 200 tekens bevatten")
    .trim(),
});

export type OrganizationFormData = z.infer<typeof organizationSchema>;
