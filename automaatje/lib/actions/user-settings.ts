"use server";

import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { requireAuth } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";

/**
 * Update user's odometer tracking settings
 */
export async function updateOdometerTrackingSettings(settings: {
  mode: "manual" | "auto_calculate";
  notificationsEnabled?: boolean;
}) {
  try {
    const session = await requireAuth();

    // Get current user
    const user = await db.query.users.findFirst({
      where: eq(schema.users.id, session.userId!),
    });

    if (!user) {
      return { success: false, error: "Gebruiker niet gevonden" };
    }

    // Update metadata with new odometer tracking settings
    const currentMetadata = user.metadata || {};
    const currentPreferences = currentMetadata.preferences || {};

    const updatedMetadata = {
      ...currentMetadata,
      preferences: {
        ...currentPreferences,
        odometerTracking: {
          mode: settings.mode,
          defaultFrequency: currentPreferences.odometerTracking?.defaultFrequency, // Keep existing
          notificationsEnabled: settings.notificationsEnabled !== false,
          lastReminderSent: currentPreferences.odometerTracking?.lastReminderSent,
        },
      },
    };

    await db
      .update(schema.users)
      .set({
        metadata: updatedMetadata,
      })
      .where(eq(schema.users.id, session.userId!));

    revalidatePath("/account/kilometerlezingen");
    revalidatePath("/registraties/nieuw");

    return { success: true };
  } catch (error) {
    console.error("Update odometer tracking settings error:", error);
    return {
      success: false,
      error: "Kon instellingen niet opslaan",
    };
  }
}

/**
 * Update vehicle-specific odometer tracking frequency
 */
export async function updateVehicleOdometerTracking(
  vehicleId: string,
  frequency: "niet_registreren" | "dagelijks" | "wekelijks" | "maandelijks"
) {
  try {
    const session = await requireAuth();

    // Get vehicle and verify ownership
    const vehicle = await db.query.vehicles.findFirst({
      where: eq(schema.vehicles.id, vehicleId),
    });

    if (!vehicle) {
      return { success: false, error: "Voertuig niet gevonden" };
    }

    if (vehicle.userId !== session.userId) {
      return { success: false, error: "Geen toegang tot dit voertuig" };
    }

    // Update vehicle details
    const currentDetails = vehicle.details || {};
    const updatedDetails = {
      ...currentDetails,
      kilometerstandTracking: frequency,
    };

    await db
      .update(schema.vehicles)
      .set({
        details: updatedDetails,
      })
      .where(eq(schema.vehicles.id, vehicleId));

    revalidatePath("/account/kilometerlezingen");
    revalidatePath("/garage");

    return { success: true };
  } catch (error) {
    console.error("Update vehicle odometer tracking error:", error);
    return {
      success: false,
      error: "Kon voertuig instellingen niet opslaan",
    };
  }
}
