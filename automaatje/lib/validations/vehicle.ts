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
  trackingMode: z
    .enum(["full_registration", "simple_reimbursement"], {
      message: "Selecteer een registratie modus",
    })
    .default("full_registration"),
  isMain: z.boolean().optional(),
});

export type AddVehicleInput = z.infer<typeof addVehicleSchema>;

// Comprehensive Dutch license plate regex covering all formats (1951-2025)
const DUTCH_LICENSE_PLATE_REGEX = /^((\w{2}-\d{2}-\d{2})|(\d{2}-\d{2}-\w{2})|(\d{2}-\w{2}-\d{2})|(\w{2}-\d{2}-\w{2})|(\w{2}-\w{2}-\d{2})|(\d{2}-\w{2}-\w{2})|(\d{2}-\w{3}-\d{1})|(\d{1}-\w{3}-\d{2})|(\w{2}-\d{3}-\w{1})|(\w{1}-\d{3}-\w{2})|(\w{3}-\d{2}-\w{1})|(\d{1}-\w{2}-\d{3}))$/;

// Helper function to normalize Dutch license plates
export function normalizeLicensePlate(plate: string): string {
  // Remove spaces, dashes, and convert to uppercase
  const cleaned = plate.replace(/[\s-]/g, "").toUpperCase();

  // All Dutch license plates are either 6 or 7 characters without dashes
  // Match against all known patterns and format accordingly

  // 6-character formats
  if (/^[A-Z]{2}\d{2}\d{2}$/.test(cleaned)) {
    // XX-99-99
    return `${cleaned.slice(0, 2)}-${cleaned.slice(2, 4)}-${cleaned.slice(4, 6)}`;
  }
  if (/^\d{2}\d{2}[A-Z]{2}$/.test(cleaned)) {
    // 99-99-XX
    return `${cleaned.slice(0, 2)}-${cleaned.slice(2, 4)}-${cleaned.slice(4, 6)}`;
  }
  if (/^\d{2}[A-Z]{2}\d{2}$/.test(cleaned)) {
    // 99-XX-99
    return `${cleaned.slice(0, 2)}-${cleaned.slice(2, 4)}-${cleaned.slice(4, 6)}`;
  }
  if (/^[A-Z]{2}\d{2}[A-Z]{2}$/.test(cleaned)) {
    // XX-99-XX
    return `${cleaned.slice(0, 2)}-${cleaned.slice(2, 4)}-${cleaned.slice(4, 6)}`;
  }
  if (/^[A-Z]{2}[A-Z]{2}\d{2}$/.test(cleaned)) {
    // XX-XX-99
    return `${cleaned.slice(0, 2)}-${cleaned.slice(2, 4)}-${cleaned.slice(4, 6)}`;
  }
  if (/^\d{2}[A-Z]{2}[A-Z]{2}$/.test(cleaned)) {
    // 99-XX-XX
    return `${cleaned.slice(0, 2)}-${cleaned.slice(2, 4)}-${cleaned.slice(4, 6)}`;
  }

  // 7-character formats
  if (/^\d{2}[A-Z]{3}\d$/.test(cleaned)) {
    // 99-XXX-9
    return `${cleaned.slice(0, 2)}-${cleaned.slice(2, 5)}-${cleaned.slice(5, 6)}`;
  }
  if (/^\d[A-Z]{3}\d{2}$/.test(cleaned)) {
    // 9-XXX-99
    return `${cleaned.slice(0, 1)}-${cleaned.slice(1, 4)}-${cleaned.slice(4, 6)}`;
  }
  if (/^[A-Z]{2}\d{3}[A-Z]$/.test(cleaned)) {
    // XX-999-X
    return `${cleaned.slice(0, 2)}-${cleaned.slice(2, 5)}-${cleaned.slice(5, 6)}`;
  }
  if (/^[A-Z]\d{3}[A-Z]{2}$/.test(cleaned)) {
    // X-999-XX
    return `${cleaned.slice(0, 1)}-${cleaned.slice(1, 4)}-${cleaned.slice(4, 6)}`;
  }
  if (/^[A-Z]{3}\d{2}[A-Z]$/.test(cleaned)) {
    // XXX-99-X
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 5)}-${cleaned.slice(5, 6)}`;
  }
  if (/^\d[A-Z]{2}\d{3}$/.test(cleaned)) {
    // 9-XX-999
    return `${cleaned.slice(0, 1)}-${cleaned.slice(1, 3)}-${cleaned.slice(3, 6)}`;
  }

  // Return as-is if we can't format it (might already have dashes)
  return plate;
}

// Dutch license plate format validation (client-side)
export function isValidDutchLicensePlateFormat(plate: string): boolean {
  const normalized = normalizeLicensePlate(plate);
  return DUTCH_LICENSE_PLATE_REGEX.test(normalized);
}

// Full validation including RDW API check
export async function validateDutchLicensePlate(plate: string): Promise<{
  valid: boolean;
  error?: string;
  vehicleData?: any;
}> {
  // First check format
  if (!isValidDutchLicensePlateFormat(plate)) {
    return { valid: false, error: "Ongeldig kenteken formaat" };
  }

  // Then validate against RDW API
  try {
    const normalized = normalizeLicensePlate(plate).replace(/-/g, "");
    const response = await fetch(
      `https://opendata.rdw.nl/resource/m9d7-ebf2.json?kenteken=${normalized}`
    );

    if (!response.ok) {
      // If API fails, accept format validation
      console.warn("RDW API unavailable, using format validation only");
      return { valid: true };
    }

    const data = await response.json();

    if (data.length === 0) {
      return { valid: false, error: "Kenteken niet gevonden in RDW database" };
    }

    return {
      valid: true,
      vehicleData: data[0],
    };
  } catch (error) {
    // If API fails, accept format validation
    console.warn("RDW API error:", error);
    return { valid: true };
  }
}

// Synchronous validation for client-side (format only)
export function isValidDutchLicensePlate(plate: string): boolean {
  return isValidDutchLicensePlateFormat(plate);
}
