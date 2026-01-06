"use server";

import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { hashPassword } from "@/lib/auth/password";
import { setupSchema, type SetupWizardData } from "@/lib/validations/setup";
import { normalizeLicensePlate, validateDutchLicensePlate } from "@/lib/validations/vehicle";
import { cookies } from "next/headers";
import { getRandomAvatarSeed } from "@/lib/avatar";

/**
 * Check if setup is required (no users exist in database)
 */
export async function checkSetupRequired(): Promise<boolean> {
  try {
    const userCount = await db
      .select({ count: schema.users.id })
      .from(schema.users);

    return userCount.length === 0;
  } catch (error) {
    console.error("Error checking setup requirement:", error);
    // If database doesn't exist or error, assume setup required
    return true;
  }
}

/**
 * Complete the setup wizard - creates first admin user and vehicle
 */
export async function completeSetup(data: SetupWizardData) {
  try {
    // 1. Security check: Verify no users exist (prevent duplicate setups)
    const userCount = await db
      .select({ count: schema.users.id })
      .from(schema.users);

    if (userCount.length > 0) {
      return {
        success: false,
        error: "Setup is al voltooid. Je kunt inloggen met je bestaande account."
      };
    }

    // 2. Validate all data with Zod schema
    const validated = setupSchema.parse(data);

    // 3. Validate license plate with RDW API
    const plateValidation = await validateDutchLicensePlate(validated.licensePlate);
    if (!plateValidation.valid) {
      return {
        success: false,
        error: plateValidation.error || "Ongeldig kenteken"
      };
    }

    // 4. Hash password
    const passwordHash = await hashPassword(validated.password);

    // 5. Create user with ADMIN role
    const userId = nanoid();
    await db.insert(schema.users).values({
      id: userId,
      email: validated.email,
      passwordHash,
      role: "ADMIN",
      profile: {
        name: validated.name,
        avatarSeed: getRandomAvatarSeed(),
        location: {
          text: validated.locationText,
          lat: validated.locationLat,
          lon: validated.locationLon,
        },
      },
      metadata: {
        isActive: true,
        preferences: {
          odometerTracking: {
            mode: validated.odometerMode,
            defaultFrequency: validated.odometerFrequency,
            notificationsEnabled: true,
          },
        },
      },
    });

    // 6. Create vehicle with isMain: true
    const vehicleId = nanoid();
    const normalizedPlate = normalizeLicensePlate(validated.licensePlate);

    // Prepare vehicle details with RDW data if available
    const vehicleDetails: any = {
      type: validated.vehicleType,
      land: "Nederland",
      naamVoertuig: validated.vehicleName || plateValidation.vehicleData?.merk || undefined,
      isMain: true,
      isEnabled: true,
      detailsStatus: plateValidation.vehicleData ? "COMPLETE" : "PENDING",
      kilometerstandTracking: validated.odometerFrequency || "niet_registreren",
      initialOdometerKm: validated.initialOdometerKm,
      initialOdometerDate: validated.initialOdometerDate?.getTime(),
    };

    // Add RDW vehicle data if available
    if (plateValidation.vehicleData) {
      vehicleDetails.rdwData = plateValidation.vehicleData;
    }

    await db.insert(schema.vehicles).values({
      id: vehicleId,
      userId,
      licensePlate: normalizedPlate,
      details: vehicleDetails,
    });

    // 7. Initialize settings
    const currentYear = new Date().getFullYear();

    await db.insert(schema.settings).values([
      {
        key: "registrations_enabled",
        value: { enabled: true },
      },
      {
        key: "mileage_rate_config",
        value: {
          userPreference: validated.rateType, // "standard", "custom", or "none"
          customRatePerKm: validated.customRate, // Only used if userPreference is "custom"
        },
      },
      {
        key: "standard_mileage_rates",
        value: {
          // Standard rates per country per year
          // Software will automatically lookup the rate based on registration date
          rates: [
            {
              country: "NL", // ISO 3166-1 alpha-2 code
              year: 2026,
              businessRate: 0.23, // Zakelijk tarief
              description: "Belastingvrije kilometervergoeding 2026",
            },
            // Future rates can be added here:
            // { country: "NL", year: 2027, businessRate: 0.24, description: "..." },
            // { country: "BE", year: 2027, businessRate: 0.42, description: "..." },
          ],
          fallbackCountry: "NL",
          fallbackRate: 0.23,
        },
      },
    ]);

    // 8. Create session (auto-login)
    const session = await getSession();
    session.userId = userId;
    session.email = validated.email;
    session.role = "ADMIN";
    session.isLoggedIn = true;
    await session.save();

    // 9. Set setup_complete cookie
    const cookieStore = await cookies();
    cookieStore.set("setup_complete", "true", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 365 * 24 * 60 * 60, // 1 year
      path: "/",
    });

    return {
      success: true,
      data: { userId, vehicleId }
    };
  } catch (error) {
    console.error("Setup error:", error);

    if (error instanceof Error) {
      return { success: false, error: error.message };
    }

    return {
      success: false,
      error: "Er is een fout opgetreden bij het aanmaken van je account"
    };
  }
}
