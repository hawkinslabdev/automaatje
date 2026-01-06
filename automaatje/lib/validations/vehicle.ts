import { z } from "zod";
import { KentekenCheck } from "rdw-kenteken-check";

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
// Uses rdw-kenteken-check for proper formatting across all 14 RDW series (1951-2023)
export function normalizeLicensePlate(plate: string): string {
  // Remove spaces, dashes, and convert to uppercase for validation
  const cleaned = plate.replace(/[\s-]/g, "").toUpperCase();
  
  // Use rdw-kenteken-check to validate and format the license plate correctly
  const kentekenCheck = new KentekenCheck(cleaned);
  const formatted = kentekenCheck.formatLicense();
  
  console.log(`[normalizeLicensePlate] Input: "${plate}" → Cleaned: "${cleaned}" → Formatted: "${formatted}" (Valid: ${kentekenCheck.valid})`);
  
  // Always format the license plate (formatLicense returns the input if invalid)
  return formatted;
}

// Dutch license plate validation using rdw-kenteken-check
// Supports all RDW formats from 1951-2023 (14 series including latest X-99-XXX)
export function isValidDutchLicensePlate(plate: string): boolean {
  // Remove spaces and dashes before validation
  const cleaned = plate.replace(/[\s-]/g, "").toUpperCase();
  const kentekenCheck = new KentekenCheck(cleaned);
  const isValid = kentekenCheck.valid;
  
  console.log(`[isValidDutchLicensePlate] Input: "${plate}" → Cleaned: "${cleaned}" → Valid: ${isValid}`);
  
  return isValid;
}
