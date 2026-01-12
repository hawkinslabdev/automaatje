"use server";

import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { hashPassword } from "@/lib/auth/password";
import { setupSchema, type SetupWizardData } from "@/lib/validations/setup";
import { normalizeLicensePlate, validateDutchLicensePlate } from "@/lib/validations/vehicle";
import { getRandomAvatarSeed } from "@/lib/avatar";

/**
 * Check if setup is required (no users exist in database)
 * Returns true ONLY if we can confirm no users exist
 * Returns false if users exist OR if there's a database error
 * (database errors should not trigger setup flow)
 */
export async function checkSetupRequired(): Promise<boolean> {
  try {
    const userCount = await db
      .select({ count: schema.users.id })
      .from(schema.users);

    // Setup required only if we successfully queried and found 0 users
    return userCount.length === 0;
  } catch (error) {
    console.error("Error checking setup requirement:", error);
    // On database errors, assume setup is NOT required (don't redirect to setup)
    // If the database is broken, let the user see the login page and get proper error messages
    return false;
  }
}

/**
 * Complete the setup wizard - creates first admin user and vehicle
 */
export async function completeSetup(data: SetupWizardData) {
  try {
    console.log('[completeSetup] Starting setup process...');

    // 1. Security check: Verify no users exist (prevent duplicate setups)
    console.log('[completeSetup] Checking for existing users...');
    const userCount = await db
      .select({ count: schema.users.id })
      .from(schema.users);

    if (userCount.length > 0) {
      console.log('[completeSetup] Users already exist, aborting');
      return {
        success: false,
        error: "Setup is al voltooid. Je kunt inloggen met je bestaande account."
      };
    }

    // 2. Validate all data with Zod schema
    console.log('[completeSetup] Validating data with schema...');
    const validated = setupSchema.parse(data);
    console.log('[completeSetup] Schema validation passed');

    // 3. Validate license plate with RDW API
    console.log('[completeSetup] Validating license plate with RDW API:', validated.licensePlate);
    const plateValidation = await validateDutchLicensePlate(validated.licensePlate);
    console.log('[completeSetup] RDW validation complete:', plateValidation.valid);
    if (!plateValidation.valid) {
      return {
        success: false,
        error: plateValidation.error || "Ongeldig kenteken"
      };
    }

    // 4. Hash password
    console.log('[completeSetup] Hashing password...');
    const passwordHash = await hashPassword(validated.password);
    console.log('[completeSetup] Password hashed successfully');

    // 5. Create user with ADMIN role
    console.log('[completeSetup] Creating admin user...');
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
    console.log('[completeSetup] User created:', userId);

    // 6. Create vehicle with isMain: true
    console.log('[completeSetup] Creating vehicle...');
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
    console.log('[completeSetup] Vehicle created:', vehicleId);

    // 6a. Create initial meterstand entry for visibility and auditing
    // This ensures the initial odometer reading appears in reports
    if (validated.odometerMode === "auto_calculate" && validated.initialOdometerKm && validated.initialOdometerDate) {
      const meterstandId = nanoid();
      await db.insert(schema.registrations).values({
        id: meterstandId,
        userId,
        vehicleId,
        data: {
          type: "meterstand",
          timestamp: validated.initialOdometerDate.getTime(),
          startOdometerKm: validated.initialOdometerKm,
          tripType: "privé",
          departure: { text: "Kilometerstand registratie" },
          destination: { text: "Kilometerstand registratie" },
          description: "Initiële kilometerstand bij instellingen",
        } as any,
      });
    }

    // 7. Initialize settings
    console.log('[completeSetup] Initializing settings...');
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
    console.log('[completeSetup] Settings initialized');

    // 8. Create session (auto-login)
    console.log('[completeSetup] Creating session...');
    const session = await getSession();
    session.userId = userId;
    session.email = validated.email;
    session.role = "ADMIN";
    session.isLoggedIn = true;
    await session.save();
    console.log('[completeSetup] Session created and saved');

    console.log('[completeSetup] Setup completed successfully!');
    return {
      success: true,
      data: { userId, vehicleId }
    };
  } catch (error) {
    console.error("[completeSetup] Setup error:", error);

    if (error instanceof Error) {
      return { success: false, error: error.message };
    }

    return {
      success: false,
      error: "Er is een fout opgetreden bij het aanmaken van je account"
    };
  }
}
