"use server";

import { nanoid } from "nanoid";
import { eq, and } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { requireAuth } from "@/lib/auth/session";
import { addVehicleSchema, normalizeLicensePlate } from "@/lib/validations/vehicle";
import { revalidatePath } from "next/cache";
import { enqueueJob } from "@/lib/jobs";

export async function addVehicle(formData: FormData) {
  try {
    const session = await requireAuth();

    const rawData = {
      licensePlate: formData.get("licensePlate"),
      naamVoertuig: formData.get("naamVoertuig") || undefined,
      type: formData.get("type") || "Auto",
      land: formData.get("land") || "Nederland",
      kilometerstandTracking: formData.get("kilometerstandTracking") || undefined,
      isMain: formData.get("isMain") === "true",
    };

    // Validate input
    const validated = addVehicleSchema.parse(rawData);

    // Normalize license plate
    const normalizedPlate = normalizeLicensePlate(validated.licensePlate);

    // Check if license plate already exists for this user
    const existingVehicle = await db.query.vehicles.findFirst({
      where: and(
        eq(schema.vehicles.userId, session.userId!),
        eq(schema.vehicles.licensePlate, normalizedPlate)
      ),
    });

    if (existingVehicle) {
      return { success: false, error: "Dit kenteken bestaat al in je garage" };
    }

    // Check if user has any vehicles
    const existingVehicles = await db.query.vehicles.findMany({
      where: eq(schema.vehicles.userId, session.userId!),
    });

    const isFirstVehicle = existingVehicles.length === 0;

    // Set default name for first vehicle
    const vehicleName = validated.naamVoertuig || (isFirstVehicle ? "Mijn eerste voertuig" : undefined);

    // Determine if this should be main vehicle
    const shouldBeMain = isFirstVehicle || validated.isMain;

    // If setting as main vehicle and not first, unset other main vehicles
    if (shouldBeMain && !isFirstVehicle) {
      const currentMain = existingVehicles.find(v => {
        const details = v.details as any;
        return details.isMain === true;
      });

      if (currentMain) {
        const currentDetails = currentMain.details as any;
        await db.update(schema.vehicles)
          .set({
            details: {
              ...currentDetails,
              isMain: false,
            },
          })
          .where(eq(schema.vehicles.id, currentMain.id));
      }
    }

    // Create vehicle
    const vehicleId = nanoid();
    await db.insert(schema.vehicles).values({
      id: vehicleId,
      userId: session.userId!,
      licensePlate: normalizedPlate,
      details: {
        naamVoertuig: vehicleName,
        type: validated.type,
        land: validated.land,
        kilometerstandTracking: validated.kilometerstandTracking,
        isMain: shouldBeMain,
        isEnabled: true,
        detailsStatus: "PENDING",
      },
    });

    // Enqueue background job to fetch RDW details
    await enqueueJob("rdw_lookup", {
      vehicleId,
      licensePlate: normalizedPlate,
    });

    revalidatePath("/garage");
    return { success: true, data: { id: vehicleId } };
  } catch (error) {
    console.error("Add vehicle error:", error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return {
      success: false,
      error: "Er is een fout opgetreden bij toevoegen van voertuig",
    };
  }
}

export async function getUserVehicles() {
  try {
    const session = await requireAuth();

    const vehicles = await db.query.vehicles.findMany({
      where: eq(schema.vehicles.userId, session.userId!),
    });

    return { success: true, data: vehicles };
  } catch (error) {
    console.error("Get user vehicles error:", error);
    return { success: false, error: "Kon voertuigen niet ophalen" };
  }
}

export async function toggleVehicleEnabled(vehicleId: string) {
  try {
    const session = await requireAuth();

    // Get vehicle
    const vehicle = await db.query.vehicles.findFirst({
      where: and(
        eq(schema.vehicles.id, vehicleId),
        eq(schema.vehicles.userId, session.userId!)
      ),
    });

    if (!vehicle) {
      return { success: false, error: "Voertuig niet gevonden" };
    }

    const details = vehicle.details as any;

    // Cannot disable main vehicle
    if (details.isMain && details.isEnabled) {
      return {
        success: false,
        error: "Je kan je hoofdvoertuig niet uitschakelen",
      };
    }

    // Toggle enabled status
    await db
      .update(schema.vehicles)
      .set({
        details: {
          ...details,
          isEnabled: !details.isEnabled,
        },
      })
      .where(eq(schema.vehicles.id, vehicleId));

    revalidatePath("/garage");
    return { success: true };
  } catch (error) {
    console.error("Toggle vehicle enabled error:", error);
    return {
      success: false,
      error: "Voertuigstatus niet wijzigen",
    };
  }
}

export async function setMainVehicle(vehicleId: string) {
  try {
    const session = await requireAuth();

    // Verify vehicle belongs to user
    const vehicle = await db.query.vehicles.findFirst({
      where: and(
        eq(schema.vehicles.id, vehicleId),
        eq(schema.vehicles.userId, session.userId!)
      ),
    });

    if (!vehicle) {
      return { success: false, error: "Voertuig niet gevonden" };
    }

    // Get all user's vehicles
    const allVehicles = await db.query.vehicles.findMany({
      where: eq(schema.vehicles.userId, session.userId!),
    });

    // Update all vehicles: set the selected one as main, others as not main
    for (const v of allVehicles) {
      const details = v.details as any;
      await db
        .update(schema.vehicles)
        .set({
          details: {
            ...details,
            isMain: v.id === vehicleId,
            isEnabled: v.id === vehicleId ? true : details.isEnabled, // Ensure main vehicle is enabled
          },
        })
        .where(eq(schema.vehicles.id, v.id));
    }

    revalidatePath("/garage");
    return { success: true };
  } catch (error) {
    console.error("Set main vehicle error:", error);
    return { success: false, error: "Kon hoofdvoertuig niet instellen" };
  }
}

export async function updateVehicle(vehicleId: string, formData: FormData) {
  try {
    const session = await requireAuth();

    // Verify vehicle belongs to user
    const vehicle = await db.query.vehicles.findFirst({
      where: and(
        eq(schema.vehicles.id, vehicleId),
        eq(schema.vehicles.userId, session.userId!)
      ),
    });

    if (!vehicle) {
      return { success: false, error: "Voertuig niet gevonden" };
    }

    const rawData = {
      licensePlate: formData.get("licensePlate"),
      naamVoertuig: formData.get("naamVoertuig") || undefined,
      type: formData.get("type") || "Auto",
      land: formData.get("land") || "Nederland",
      kilometerstandTracking: formData.get("kilometerstandTracking") || undefined,
      isMain: formData.get("isMain") === "true",
    };

    // Validate input
    const validated = addVehicleSchema.parse(rawData);

    // Normalize license plate
    const normalizedPlate = normalizeLicensePlate(validated.licensePlate);

    // Check if license plate already exists for this user (excluding current vehicle)
    const existingVehicle = await db.query.vehicles.findFirst({
      where: and(
        eq(schema.vehicles.userId, session.userId!),
        eq(schema.vehicles.licensePlate, normalizedPlate)
      ),
    });

    if (existingVehicle && existingVehicle.id !== vehicleId) {
      return { success: false, error: "Dit kenteken bestaat al in je garage" };
    }

    const currentDetails = vehicle.details as any;

    // Check if license plate changed - if so, trigger new RDW lookup
    const licensePlateChanged = vehicle.licensePlate !== normalizedPlate;

    // If setting as main vehicle, unset other main vehicles
    if (validated.isMain && !currentDetails.isMain) {
      const allVehicles = await db.query.vehicles.findMany({
        where: eq(schema.vehicles.userId, session.userId!),
      });

      for (const v of allVehicles) {
        if (v.id !== vehicleId) {
          const details = v.details as any;
          if (details.isMain) {
            await db
              .update(schema.vehicles)
              .set({
                details: {
                  ...details,
                  isMain: false,
                },
              })
              .where(eq(schema.vehicles.id, v.id));
          }
        }
      }
    }

    // Update vehicle
    await db
      .update(schema.vehicles)
      .set({
        licensePlate: normalizedPlate,
        details: {
          ...currentDetails,
          naamVoertuig: validated.naamVoertuig,
          type: validated.type,
          land: validated.land,
          kilometerstandTracking: validated.kilometerstandTracking,
          isMain: validated.isMain,
          // Reset RDW status if license plate changed
          detailsStatus: licensePlateChanged ? "PENDING" : currentDetails.detailsStatus,
          make: licensePlateChanged ? undefined : currentDetails.make,
          model: licensePlateChanged ? undefined : currentDetails.model,
          year: licensePlateChanged ? undefined : currentDetails.year,
          fetchError: licensePlateChanged ? undefined : currentDetails.fetchError,
        },
        updatedAt: new Date(),
      })
      .where(eq(schema.vehicles.id, vehicleId));

    // Enqueue RDW lookup if license plate changed
    if (licensePlateChanged) {
      await enqueueJob("rdw_lookup", {
        vehicleId,
        licensePlate: normalizedPlate,
      });
    }

    revalidatePath("/garage");
    return { success: true };
  } catch (error) {
    console.error("Update vehicle error:", error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Kon voertuig niet bijwerken" };
  }
}

export async function deleteVehicle(vehicleId: string) {
  try {
    const session = await requireAuth();

    // Verify vehicle belongs to user
    const vehicle = await db.query.vehicles.findFirst({
      where: and(
        eq(schema.vehicles.id, vehicleId),
        eq(schema.vehicles.userId, session.userId!)
      ),
    });

    if (!vehicle) {
      return { success: false, error: "Voertuig niet gevonden" };
    }

    // Check if vehicle has any registrations
    const registrations = await db.query.registrations.findFirst({
      where: eq(schema.registrations.vehicleId, vehicleId),
    });

    if (registrations) {
      return {
        success: false,
        error: "Dit voertuig heeft registraties en kan niet verwijderd worden",
      };
    }

    // Delete vehicle
    await db.delete(schema.vehicles).where(eq(schema.vehicles.id, vehicleId));

    revalidatePath("/garage");
    return { success: true };
  } catch (error) {
    console.error("Delete vehicle error:", error);
    return { success: false, error: "Kon voertuig niet verwijderen" };
  }
}

export async function fetchVehicleDetails(vehicleId: string) {
  try {
    // Get vehicle (no auth required for setup flow, but check if needed for retry from garage)
    const vehicle = await db.query.vehicles.findFirst({
      where: eq(schema.vehicles.id, vehicleId),
    });

    if (!vehicle) {
      return { success: false, error: "Voertuig niet gevonden" };
    }

    const details = vehicle.details as any;

    // Call RDW API to fetch vehicle details
    const rdwUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3123'}/api/rdw?kenteken=${vehicle.licensePlate}`;

    const response = await fetch(rdwUrl);
    const result = await response.json();

    if (result.success && result.data) {
      // Update vehicle with RDW data
      await db
        .update(schema.vehicles)
        .set({
          details: {
            ...details,
            make: result.data.make,
            model: result.data.model,
            year: result.data.year,
            detailsStatus: "READY",
          },
          updatedAt: new Date(),
        })
        .where(eq(schema.vehicles.id, vehicleId));

      revalidatePath("/garage");
      return { success: true, data: result.data };
    } else {
      // Update status to FAILED if RDW lookup failed
      await db
        .update(schema.vehicles)
        .set({
          details: {
            ...details,
            detailsStatus: "FAILED",
            fetchError: result.error || "Onbekende fout",
          },
          updatedAt: new Date(),
        })
        .where(eq(schema.vehicles.id, vehicleId));

      revalidatePath("/garage");
      return { success: false, error: result.error || "Kon gegevens niet ophalen" };
    }
  } catch (error) {
    console.error("Fetch vehicle details error:", error);

    // Try to update status to FAILED
    try {
      const vehicle = await db.query.vehicles.findFirst({
        where: eq(schema.vehicles.id, vehicleId),
      });

      if (vehicle) {
        const details = vehicle.details as any;
        await db
          .update(schema.vehicles)
          .set({
            details: {
              ...details,
              detailsStatus: "FAILED",
              fetchError: error instanceof Error ? error.message : "Onbekende fout",
            },
            updatedAt: new Date(),
          })
          .where(eq(schema.vehicles.id, vehicleId));
      }
    } catch (updateError) {
      console.error("Failed to update vehicle status:", updateError);
    }

    return {
      success: false,
      error: "Er is een fout opgetreden bij ophalen van voertuiggegevens",
    };
  }
}

/**
 * Share a vehicle with another user
 */
export async function shareVehicle(
  vehicleId: string,
  targetUserEmail: string,
  options?: {
    canEdit?: boolean;
    canDelete?: boolean;
    note?: string;
  }
) {
  try {
    const session = await requireAuth();

    // Verify vehicle belongs to current user
    const vehicle = await db.query.vehicles.findFirst({
      where: and(
        eq(schema.vehicles.id, vehicleId),
        eq(schema.vehicles.userId, session.userId!)
      ),
    });

    if (!vehicle) {
      return { success: false, error: "Voertuig niet gevonden" };
    }

    // Find target user by email
    const targetUser = await db.query.users.findFirst({
      where: eq(schema.users.email, targetUserEmail.toLowerCase()),
    });

    if (!targetUser) {
      return { success: false, error: "Gebruiker niet gevonden met dit e-mailadres" };
    }

    // Cannot share with yourself
    if (targetUser.id === session.userId) {
      return { success: false, error: "Je kunt een voertuig niet met jezelf delen" };
    }

    // Check if already shared
    const existingShare = await db.query.vehicleShares.findFirst({
      where: and(
        eq(schema.vehicleShares.vehicleId, vehicleId),
        eq(schema.vehicleShares.sharedWithUserId, targetUser.id)
      ),
    });

    if (existingShare) {
      return { success: false, error: "Dit voertuig is al gedeeld met deze gebruiker" };
    }

    // Create share
    const shareId = nanoid();
    await db.insert(schema.vehicleShares).values({
      id: shareId,
      vehicleId,
      ownerId: session.userId!,
      sharedWithUserId: targetUser.id,
      metadata: {
        canEdit: options?.canEdit || false,
        canDelete: options?.canDelete || false,
        note: options?.note,
      },
    });

    // Get vehicle details for notification
    const vehicleDetails = vehicle.details as any;
    const vehicleName = vehicleDetails.make && vehicleDetails.model
      ? `${vehicleDetails.make} ${vehicleDetails.model}`
      : vehicle.licensePlate;

    // Get current user profile
    const currentUser = await db.query.users.findFirst({
      where: eq(schema.users.id, session.userId!),
    });

    const currentUserProfile = currentUser?.profile as any;
    const currentUserName = currentUserProfile?.name || "Een gebruiker";

    // Enqueue notification to target user
    await enqueueJob("notification", {
      userId: targetUser.id,
      notificationData: {
        type: "shared_vehicle",
        title: "Voertuig gedeeld met jou",
        message: `${currentUserName} heeft ${vehicleName} (${vehicle.licensePlate}) met je gedeeld.`,
        priority: "normal",
        icon: "Users",
        color: "green",
        action: {
          label: "Bekijk voertuig",
          url: `/garage`,
        },
        relatedVehicleId: vehicleId,
      },
    });

    console.log(`Vehicle share notification enqueued for user ${targetUser.id}`);

    revalidatePath("/garage");
    return { success: true, data: { id: shareId } };
  } catch (error) {
    console.error("Share vehicle error:", error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Kon voertuig niet delen" };
  }
}

/**
 * Remove vehicle share
 */
export async function unshareVehicle(shareId: string) {
  try {
    const session = await requireAuth();

    // Verify share belongs to current user (as owner)
    const share = await db.query.vehicleShares.findFirst({
      where: and(
        eq(schema.vehicleShares.id, shareId),
        eq(schema.vehicleShares.ownerId, session.userId!)
      ),
    });

    if (!share) {
      return { success: false, error: "Delen niet gevonden" };
    }

    // Delete share
    await db.delete(schema.vehicleShares).where(eq(schema.vehicleShares.id, shareId));

    revalidatePath("/garage");
    return { success: true };
  } catch (error) {
    console.error("Unshare vehicle error:", error);
    return { success: false, error: "Kon delen niet verwijderen" };
  }
}

/**
 * Get shared vehicles for current user
 */
export async function getSharedVehicles() {
  try {
    const session = await requireAuth();

    const shares = await db.query.vehicleShares.findMany({
      where: eq(schema.vehicleShares.sharedWithUserId, session.userId!),
      with: {
        vehicle: true,
        owner: true,
      },
    });

    return { success: true, data: shares };
  } catch (error) {
    console.error("Get shared vehicles error:", error);
    return { success: false, error: "Kon gedeelde voertuigen niet ophalen" };
  }
}

/**
 * Mark maintenance as complete for a vehicle
 * Updates maintenance tracking and auto-archives reminder notifications
 */
export async function markMaintenanceComplete(
  vehicleId: string,
  newOdometerKm: number
) {
  try {
    const session = await requireAuth();

    // Verify vehicle belongs to user
    const vehicle = await db.query.vehicles.findFirst({
      where: and(
        eq(schema.vehicles.id, vehicleId),
        eq(schema.vehicles.userId, session.userId!)
      ),
    });

    if (!vehicle) {
      return { success: false, error: "Voertuig niet gevonden" };
    }

    const details = vehicle.details as any;

    // Update vehicle with new maintenance info
    await db
      .update(schema.vehicles)
      .set({
        details: {
          ...details,
          maintenanceConfig: {
            ...details.maintenanceConfig,
            lastMaintenanceOdometer: newOdometerKm,
            lastMaintenanceDate: new Date().toISOString(),
          },
        },
        updatedAt: new Date(),
      })
      .where(eq(schema.vehicles.id, vehicleId));

    // Auto-archive maintenance reminder notifications
    const maintenanceNotifications = await db.query.notifications.findMany({
      where: and(
        eq(schema.notifications.userId, session.userId!),
        eq(schema.notifications.isArchived, false)
      ),
    });

    for (const notification of maintenanceNotifications) {
      const notifData = notification.data as any;
      if (
        notifData.type === "maintenance_reminder" &&
        notifData.relatedVehicleId === vehicleId
      ) {
        await db
          .update(schema.notifications)
          .set({
            isArchived: true,
            archivedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(schema.notifications.id, notification.id));

        console.log(`Auto-archived maintenance notification ${notification.id}`);
      }
    }

    // Send confirmation notification
    const vehicleName = details.make && details.model
      ? `${details.make} ${details.model}`
      : vehicle.licensePlate;

    await enqueueJob("notification", {
      userId: session.userId!,
      notificationData: {
        type: "custom",
        title: "Onderhoud voltooid",
        message: `Onderhoud voor ${vehicleName} geregistreerd bij ${newOdometerKm.toLocaleString("nl-NL")} km.`,
        priority: "low",
        icon: "CheckCircle",
        color: "green",
        relatedVehicleId: vehicleId,
      },
    });

    revalidatePath("/garage");
    return { success: true };
  } catch (error) {
    console.error("Mark maintenance complete error:", error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Kon onderhoud niet registreren" };
  }
}
