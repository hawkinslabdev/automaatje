import { z } from "zod";

export const addVehicleSchema = z.object({
  licensePlate: z.string().min(1, { message: "Kenteken is verplicht" }),
  naamVoertuig: z.string().max(100).optional(),
  type: z.enum(["Auto", "Motorfiets", "Scooter", "Fiets"], {
    message: "Selecteer een voertuigtype",
  }),
  land: z.string().default("Nederland"),
  kilometerstandTracking: z
    .enum(["niet_registreren", "dagelijks", "wekelijks", "maandelijks"])
    .optional(),
  isMain: z.boolean().optional(),
});

export type AddVehicleInput = z.infer<typeof addVehicleSchema>;

// Helper function to normalize Dutch license plates
export function normalizeLicensePlate(plate: string): string {
  // Remove spaces and dashes, convert to uppercase
  let normalized = plate.replace(/[\s-]/g, "").toUpperCase();

  // Add dashes for standard 6-character plates (XX-XX-XX format)
  if (normalized.length === 6) {
    normalized = `${normalized.slice(0, 2)}-${normalized.slice(2, 4)}-${normalized.slice(4, 6)}`;
  }

  return normalized;
}

// Dutch license plate validation regex
// Supports multiple formats: XX-XX-XX, XX-XXX-X, X-XXX-XX, etc.
export function isValidDutchLicensePlate(plate: string): boolean {
  const patterns = [
    // Standard 6-character formats (2-2-2)
    /^[A-Z]{2}-[A-Z]{2}-[A-Z]{2}$/,     // XX-XX-XX
    /^[0-9]{2}-[A-Z]{2}-[0-9]{2}$/,     // 00-XX-00
    /^[A-Z]{2}-[0-9]{2}-[A-Z]{2}$/,     // XX-00-XX
    /^[A-Z]{2}-[A-Z]{2}-[0-9]{2}$/,     // XX-XX-00
    /^[0-9]{2}-[A-Z]{2}-[A-Z]{2}$/,     // 00-XX-XX
    /^[0-9]{2}-[0-9]{2}-[A-Z]{2}$/,     // 00-00-XX
    /^[A-Z]{2}-[0-9]{2}-[0-9]{2}$/,     // XX-00-00

    // Formats with mixed segments
    /^[A-Z]{2}-[0-9]{2}-[0-9][A-Z]$/,   // XX-00-0X (like ZV-85-8G)
    /^[A-Z]{2}-[0-9]{2}-[A-Z][0-9]$/,   // XX-00-X0
    /^[0-9]{2}-[A-Z]{2}-[0-9][A-Z]$/,   // 00-XX-0X
    /^[0-9]{2}-[A-Z]{2}-[A-Z][0-9]$/,   // 00-XX-X0

    // Variable length formats (6 chars total)
    /^[0-9]{2}-[A-Z]{3}-[0-9]$/,        // 00-XXX-0
    /^[0-9]-[A-Z]{3}-[0-9]{2}$/,        // 0-XXX-00
    /^[A-Z]-[0-9]{3}-[A-Z]{2}$/,        // X-000-XX
    /^[A-Z]{2}-[0-9]{3}-[A-Z]$/,        // XX-000-X
    /^[A-Z]{3}-[0-9]{2}-[A-Z]$/,        // XXX-00-X
    /^[A-Z]-[A-Z]{2}-[0-9]{3}$/,        // X-XX-000
    /^[0-9]{3}-[A-Z]{2}-[A-Z]$/,        // 000-XX-X
  ];

  return patterns.some(pattern => pattern.test(plate));
}
