import { z } from "zod";

/**
 * Registration onboarding validation schemas
 * Reuses the same validation as setup wizard, but for regular users (not admins)
 */

// Step 1: Personal Info
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

// Step 3: Vehicle
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

// Step 6: Account (Password)
export const accountRegistrationSchema = z
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
    // Personal info
    name: z.string().min(2, "Naam moet minimaal 2 tekens bevatten"),
    email: z.string().email("Ongeldig e-mailadres"),

    // Location
    locationText: z.string().min(1, "Locatie is verplicht"),
    locationLat: z.number().optional(),
    locationLon: z.number().optional(),

    // Vehicle
    licensePlate: z
      .string()
      .min(1, "Kenteken is verplicht")
      .regex(
        /^[A-Z0-9]{2}-[A-Z0-9]{2,3}-[A-Z0-9]{1,2}$/,
        "Ongeldig Nederlands kenteken formaat"
      ),
    vehicleType: z.enum(["Auto", "Motorfiets", "Scooter", "Fiets"]),
    vehicleName: z.string().optional(),

    // Odometer tracking
    odometerMode: z.enum(["manual", "auto_calculate"]),
    odometerFrequency: z.enum(["dagelijks", "wekelijks", "maandelijks"]).optional(),
    initialOdometerKm: z.number().optional(),
    initialOdometerDate: z.date().optional(),

    // Mileage rates
    rateType: z.enum(["standard", "custom", "none"]),
    customRate: z.number().optional(),

    // Password
    password: z
      .string()
      .min(8, "Wachtwoord moet minimaal 8 tekens bevatten")
      .regex(/[A-Z]/, "Wachtwoord moet minimaal 1 hoofdletter bevatten")
      .regex(/[a-z]/, "Wachtwoord moet minimaal 1 kleine letter bevatten")
      .regex(/\d/, "Wachtwoord moet minimaal 1 cijfer bevatten"),
    confirmPassword: z.string().min(1, "Bevestig je wachtwoord"),
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
  )
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

export type RegistrationWizardData = z.infer<typeof registrationSchema>;
