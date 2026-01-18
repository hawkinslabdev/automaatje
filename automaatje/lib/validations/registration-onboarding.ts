import { z } from "zod";

/**
 * Registration onboarding validation schemas
 * Reuses the same validation as setup wizard, but for regular users (not admins)
 */

// Step 1: Account Setup (merged personal info + password)
export const accountSetupSchema = z
  .object({
    name: z.string().min(2, "Naam moet minimaal 2 tekens bevatten"),
    email: z.string().email("Ongeldig e-mailadres"),
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

// Legacy schemas (kept for backwards compatibility if needed)
export const personalInfoSchema = z.object({
  name: z.string().min(2, "Naam moet minimaal 2 tekens bevatten"),
  email: z.string().email("Ongeldig e-mailadres"),
});

// Step 2: Location
export const locationSchema = z.object({
  locationText: z.string().min(1, "Locatie is verplicht"),
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
export const vehicleRegistrationSchema = z.object({
  licensePlate: z
    .string()
    .min(1, "Kenteken is verplicht")
    .regex(
      /^[A-Z0-9]{2}-[A-Z0-9]{2,3}-[A-Z0-9]{1,2}$/,
      "Ongeldig Nederlands kenteken formaat (bijv. AB-CD-12)"
    ),
  vehicleType: z.enum(["Auto", "Motorfiets", "Scooter", "Fiets"]),
  vehicleName: z.string().optional(),
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
export const odometerTrackingSchema = z
  .object({
    odometerMode: z.enum(["manual", "auto_calculate"]),
    odometerFrequency: z.enum(["dagelijks", "wekelijks", "maandelijks"]).optional(),
    initialOdometerKm: z.number().optional(),
    initialOdometerDate: z.date().optional(),
  })
  .refine(
    (data) => {
      if (data.odometerMode === "auto_calculate") {
        return (
          data.odometerFrequency &&
          data.initialOdometerKm !== undefined &&
          data.initialOdometerDate
        );
      }
      return true;
    },
    {
      message:
        "Bij auto-berekenen zijn frequentie, beginstand en datum verplicht",
      path: ["odometerFrequency"],
    }
  );

// Step 5: Mileage Rates
export const mileageRatesSchema = z.object({
  rateType: z.enum(["standard", "custom", "none"]),
  customRate: z.number().optional(),
}).refine(
  (data) => {
    if (data.rateType === "custom") {
      return data.customRate !== undefined && data.customRate > 0;
    }
    return true;
  },
  {
    message: "Bij aangepast tarief moet je een bedrag invullen",
    path: ["customRate"],
  }
);

// Step 5: Account Password (legacy - now part of accountSetupSchema)
export const accountPasswordSchema = z
  .object({
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

// Combined schema for full registration
export const registrationSchema = z
  .object({
    // Step 1: Account
    name: z.string().min(2, "Naam moet minimaal 2 tekens bevatten"),
    email: z.string().email("Ongeldig e-mailadres"),
    password: z
      .string()
      .min(8, "Wachtwoord moet minimaal 8 tekens bevatten")
      .regex(/[A-Z]/, "Wachtwoord moet minimaal 1 hoofdletter bevatten")
      .regex(/[a-z]/, "Wachtwoord moet minimaal 1 kleine letter bevatten")
      .regex(/\d/, "Wachtwoord moet minimaal 1 cijfer bevatten"),
    confirmPassword: z.string().min(1, "Bevestig je wachtwoord"),

    // Step 2: Location
    locationText: z.string().min(1, "Locatie is verplicht"),
    locationLat: z.number().optional(),
    locationLon: z.number().optional(),

    // Step 3: Tracking Mode
    trackingMode: z.enum(["full_registration", "simple_reimbursement"]).default("full_registration"),

    // Step 4: Vehicle + Odometer
    licensePlate: z
      .string()
      .min(1, "Kenteken is verplicht")
      .regex(
        /^[A-Z0-9]{2}-[A-Z0-9]{2,3}-[A-Z0-9]{1,2}$/,
        "Ongeldig Nederlands kenteken formaat"
      ),
    vehicleType: z.enum(["Auto", "Motorfiets", "Scooter", "Fiets"]),
    vehicleName: z.string().optional(),
    initialOdometerKm: z.number().optional(),
    initialOdometerDate: z.string().optional(),

    // Step 5: Mileage rates
    rateType: z.enum(["standard", "custom", "none"]),
    customRate: z.number().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Wachtwoorden komen niet overeen",
    path: ["confirmPassword"],
  })
  .refine(
    (data) => {
      if (data.rateType === "custom") {
        return data.customRate !== undefined && data.customRate > 0;
      }
      return true;
    },
    {
      message: "Bij aangepast tarief moet je een bedrag invullen",
      path: ["customRate"],
    }
  );

export type TrackingModeInput = z.infer<typeof trackingModeSchema>;
export type RegistrationWizardData = z.infer<typeof registrationSchema>;
