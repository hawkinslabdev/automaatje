import { z } from "zod";
import { normalizeLicensePlate, isValidDutchLicensePlate } from "./vehicle";

// Step 1: Account Setup (merged personal info + password)
export const accountSetupSchema = z
  .object({
    name: z
      .string()
      .min(2, { message: "Naam moet minimaal 2 tekens bevatten" }),
    email: z
      .string()
      .email({ message: "Ongeldig e-mailadres" }),
    password: z
      .string()
      .min(8, { message: "Wachtwoord moet minimaal 8 tekens bevatten" })
      .regex(/[A-Z]/, { message: "Wachtwoord moet minimaal één hoofdletter bevatten" })
      .regex(/[a-z]/, { message: "Wachtwoord moet minimaal één kleine letter bevatten" })
      .regex(/[0-9]/, { message: "Wachtwoord moet minimaal één cijfer bevatten" }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Wachtwoorden komen niet overeen",
    path: ["confirmPassword"],
  });

// Legacy schemas (kept for backwards compatibility if needed)
export const personalInfoSchema = z.object({
  name: z
    .string()
    .min(2, { message: "Naam moet minimaal 2 tekens bevatten" }),
  email: z
    .string()
    .email({ message: "Ongeldig e-mailadres" }),
});

// Step 2: Location
export const locationSchema = z.object({
  locationText: z
    .string()
    .min(2, { message: "Locatie is verplicht" }),
  locationLat: z.number().optional(),
  locationLon: z.number().optional(),
});

// Step 3: Tracking Mode
export const trackingModeSchema = z.object({
  trackingMode: z
    .enum(["full_registration", "simple_reimbursement"], {
      message: "Selecteer een registratiemethode",
    })
    .default("full_registration"),
});

// Step 4: Vehicle (with optional odometer)
export const vehicleSetupSchema = z.object({
  licensePlate: z
    .string()
    .min(1, { message: "Kenteken is verplicht" })
    .refine(
      (plate) => isValidDutchLicensePlate(normalizeLicensePlate(plate)),
      { message: "Ongeldig Nederlands kenteken" }
    ),
  vehicleType: z.enum(["Auto", "Motorfiets", "Scooter", "Fiets"], {
    message: "Selecteer een voertuigtype",
  }),
  vehicleName: z.string().max(100).optional(),
  // Optional odometer fields (merged from old step 4)
  initialOdometerKm: z
    .number({
      message: "Kilometerstand moet een geldig getal zijn",
    })
    .int({ message: "Kilometerstand moet een geheel getal zijn" })
    .min(0, { message: "Kilometerstand kan niet negatief zijn" })
    .max(999999, { message: "Kilometerstand lijkt onrealistisch hoog" })
    .optional(),
  initialOdometerDate: z.string().optional(), // ISO date string
});

// Step 4: Odometer Tracking
export const odometerTrackingSchema = z.object({
  odometerMode: z.enum(["manual", "auto_calculate"], {
    message: "Selecteer een tracking methode",
  }),
  odometerFrequency: z
    .enum(["dagelijks", "wekelijks", "maandelijks"])
    .optional(),
  initialOdometerKm: z
    .number({
      message: "Kilometerstand moet een geldig getal zijn",
    })
    .int({ message: "Kilometerstand moet een geheel getal zijn" })
    .min(0, { message: "Kilometerstand kan niet negatief zijn" })
    .max(999999, { message: "Kilometerstand lijkt onrealistisch hoog" })
    .optional(),
  initialOdometerDate: z.date().optional(),
}).refine(
  (data) => {
    // If auto-calculate mode, require frequency and initial odometer
    if (data.odometerMode === "auto_calculate") {
      return (
        data.odometerFrequency &&
        data.initialOdometerKm !== undefined &&
        data.initialOdometerDate !== undefined
      );
    }
    return true;
  },
  {
    message: "Frequentie, kilometerstand en datum zijn verplicht voor automatisch berekenen",
    path: ["odometerFrequency"],
  }
);

// Step 5: Mileage Rates
export const mileageRatesSchema = z.object({
  rateType: z.enum(["standard", "custom", "none"], {
    message: "Selecteer een tarief optie",
  }),
  customRate: z.number().min(0).max(10).optional(),
});

// Step 5: Account Password (legacy - now part of accountSetupSchema)
export const accountPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, { message: "Wachtwoord moet minimaal 8 tekens bevatten" })
      .regex(/[A-Z]/, { message: "Wachtwoord moet minimaal één hoofdletter bevatten" })
      .regex(/[a-z]/, { message: "Wachtwoord moet minimaal één kleine letter bevatten" })
      .regex(/[0-9]/, { message: "Wachtwoord moet minimaal één cijfer bevatten" }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Wachtwoorden komen niet overeen",
    path: ["confirmPassword"],
  });

// Complete setup schema (all steps combined)
export const setupSchema = z.object({
  // Step 1: Account
  name: z.string().min(2),
  email: z.string().email(),
  password: z
    .string()
    .min(8)
    .regex(/[A-Z]/, { message: "Wachtwoord moet minimaal één hoofdletter bevatten" })
    .regex(/[a-z]/, { message: "Wachtwoord moet minimaal één kleine letter bevatten" })
    .regex(/[0-9]/, { message: "Wachtwoord moet minimaal één cijfer bevatten" }),
  // Step 2: Location
  locationText: z.string().min(2),
  locationLat: z.number().optional(),
  locationLon: z.number().optional(),
  // Step 3: Tracking Mode
  trackingMode: z.enum(["full_registration", "simple_reimbursement"]).default("full_registration"),
  // Step 4: Vehicle + Odometer
  licensePlate: z.string(),
  vehicleType: z.enum(["Auto", "Motorfiets", "Scooter", "Fiets"]),
  vehicleName: z.string().max(100).optional(),
  initialOdometerKm: z.number().optional(),
  initialOdometerDate: z.string().optional(),
  // Step 5: Mileage Rates
  rateType: z.enum(["standard", "custom", "none"]),
  customRate: z.number().min(0).max(10).optional(),
});

export type AccountSetupInput = z.infer<typeof accountSetupSchema>;
export type PersonalInfoInput = z.infer<typeof personalInfoSchema>;
export type LocationInput = z.infer<typeof locationSchema>;
export type TrackingModeInput = z.infer<typeof trackingModeSchema>;
export type VehicleSetupInput = z.infer<typeof vehicleSetupSchema>;
export type OdometerTrackingInput = z.infer<typeof odometerTrackingSchema>;
export type MileageRatesInput = z.infer<typeof mileageRatesSchema>;
export type AccountPasswordInput = z.infer<typeof accountPasswordSchema>;
export type SetupWizardData = z.infer<typeof setupSchema>;
