"use server";

import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { eq, or, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { hashPassword } from "@/lib/auth/password";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import {
  registrationSchema,
  type RegistrationWizardData,
} from "@/lib/validations/registration-onboarding";
import { normalizeEmail } from "@/lib/utils/email";

interface RegistrationResult {
  success: boolean;
  error?: string;
  userId?: string;
  vehicleId?: string;
}

/**
 * Complete new user registration with full onboarding
 * Creates USER role (not ADMIN)
 */
export async function completeRegistration(
  data: RegistrationWizardData
): Promise<RegistrationResult> {
  try {
    // Check if registrations are enabled
    const settings = await db
      .select()
      .from(schema.settings)
      .where(eq(schema.settings.key, "registrations_enabled"))
      .limit(1);

    if (settings.length > 0) {
      const config = settings[0].value as { enabled?: boolean };
      if (config.enabled === false) {
        return {
          success: false,
          error: "Registratie is momenteel uitgeschakeld. Neem contact op met een beheerder.",
        };
      }
    }

    // Validate input
    const validated = registrationSchema.parse(data);

    // Normalize email for consistent comparison
    const normalizedEmail = normalizeEmail(validated.email);

    // Check if normalized email already exists
    // We need to check against all users because existing emails might not be normalized
    const allUsers = await db.select({ email: schema.users.email }).from(schema.users);
    
    for (const user of allUsers) {
      if (normalizeEmail(user.email) === normalizedEmail) {
        return {
          success: false,
          error: "Dit e-mailadres is al geregistreerd",
        };
      }
    }

    // Hash password
    const passwordHash = await hashPassword(validated.password);

    // Prepare odometer tracking metadata
    const odometerTracking =
      validated.odometerMode === "auto_calculate"
        ? {
            mode: validated.odometerMode,
            defaultFrequency: validated.odometerFrequency,
            notificationsEnabled: true,
          }
        : {
            mode: validated.odometerMode,
          };

    // Generate user ID
    const userId = nanoid();

    // Create user with USER role (not ADMIN)
    await db.insert(schema.users).values({
      id: userId,
      email: validated.email,
      passwordHash,
      role: "USER", // Regular user, not admin
      profile: {
        name: validated.name,
        avatarSeed: `seed-${Date.now()}`, // Random avatar seed
        location: {
          text: validated.locationText,
          lat: validated.locationLat,
          lon: validated.locationLon,
          country: "NL",
        },
      },
      metadata: {
        isActive: true,
        preferences: {
          odometerTracking,
        },
      },
    });

    // Prepare vehicle kilometerstand tracking
    const kilometerstandTracking =
      validated.odometerMode === "auto_calculate" && validated.odometerFrequency
        ? validated.odometerFrequency
        : "niet_registreren";

    // Generate vehicle ID
    const vehicleId = nanoid();

    // Create vehicle (first vehicle is main vehicle)
    await db.insert(schema.vehicles).values({
      id: vehicleId,
      userId,
      licensePlate: validated.licensePlate,
      details: {
        naamVoertuig: validated.vehicleName,
        type: validated.vehicleType,
        land: "Nederland",
        kilometerstandTracking,
        isMain: true,
        isEnabled: true,
        detailsStatus: "PENDING",
      },
    });

    // Create initial meterstand entry for auto-calculate mode
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
          description: "Initiële kilometerstand bij registratie",
        } as any,
      });
    }

    // Auto-login the new user
    const session = await getSession();
    session.userId = userId;
    session.email = validated.email;
    session.role = "USER";
    session.isLoggedIn = true;
    await session.save();

    // Note: Vehicle details will be fetched asynchronously by background job
    // or when user first visits the garage page. We don't fetch during
    // registration to avoid revalidatePath issues during render.

    return {
      success: true,
      userId,
      vehicleId,
    };
  } catch (error) {
    console.error("Registration error:", error);

    if (error instanceof Error && error.message.includes("validation")) {
      return {
        success: false,
        error: "Ongeldige invoer. Controleer je gegevens.",
      };
    }

    return {
      success: false,
      error: "Er is een fout opgetreden bij het aanmaken van je account",
    };
  }
}
