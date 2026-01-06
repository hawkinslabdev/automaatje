"use server";

import { nanoid } from "nanoid";
import { eq, and, desc } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { requireAuth } from "@/lib/auth/session";
import {
  createRegistrationSchema,
  createOdometerEntrySchema
} from "@/lib/validations/registration";
import { isMeterstandEntry, isTripEntry } from "@/lib/utils/registration-types";
import { revalidatePath } from "next/cache";
import { enqueueJob } from "@/lib/jobs";
import {
  calculateOdometerForTrip,
  isOdometerCalculationError,
} from "@/lib/utils/odometer-calculator";

/**
 * Create a new trip registration
 * Supports full legal compliance with Dutch tax authority requirements
 */
export async function createRegistration(formData: FormData) {
  try {
    const session = await requireAuth();

    const rawData = {
      vehicleId: formData.get("vehicleId"),
      timestamp: formData.get("timestamp"),
      startOdometerKm: formData.get("startOdometerKm"),
      endOdometerKm: formData.get("endOdometerKm") || null,
      tripType: formData.get("tripType"),
      departure: {
        text: formData.get("departureText") as string,
        lat: formData.get("departureLat") ? Number(formData.get("departureLat")) : undefined,
        lon: formData.get("departureLon") ? Number(formData.get("departureLon")) : undefined,
      },
      destination: {
        text: formData.get("destinationText") as string,
        lat: formData.get("destinationLat") ? Number(formData.get("destinationLat")) : undefined,
        lon: formData.get("destinationLon") ? Number(formData.get("destinationLon")) : undefined,
      },
      distanceKm: formData.get("distanceKm") ? Number(formData.get("distanceKm")) : null,
      calculationMethod: formData.get("calculationMethod") || undefined,
      description: formData.get("description") || undefined,
      alternativeRoute: formData.get("alternativeRoute") || undefined,
      privateDetourKm: formData.get("privateDetourKm") ? Number(formData.get("privateDetourKm")) : null,
      linkedTripId: formData.get("linkedTripId") || undefined,
      tripDirection: formData.get("tripDirection") || undefined,
    };

    // Validate input
    const validated = createRegistrationSchema.parse(rawData);

    // Verify vehicle belongs to user or is shared with user
    const vehicle = await db.query.vehicles.findFirst({
      where: eq(schema.vehicles.id, validated.vehicleId),
      with: {
        shares: true,
      },
    });

    if (!vehicle) {
      return { success: false, error: "Voertuig niet gevonden" };
    }

    // Check if user owns vehicle or has access via share
    const isOwner = vehicle.userId === session.userId;
    const hasAccess = vehicle.shares.some(
      (share) => share.sharedWithUserId === session.userId
    );

    if (!isOwner && !hasAccess) {
      return { success: false, error: "Geen toegang tot dit voertuig" };
    }

    const vehicleDetails = vehicle.details as any;
    if (!vehicleDetails.isEnabled) {
      return { success: false, error: "Dit voertuig is uitgeschakeld" };
    }

    // AUTO-CALCULATE LOGIC: Check if user has auto-calculate mode enabled
    const user = await db.query.users.findFirst({
      where: eq(schema.users.id, session.userId!),
    });

    const isAutoCalculate = user?.metadata?.preferences?.odometerTracking?.mode === "auto_calculate";
    let odometerCalculated = false;
    let calculationBasedOn: any = undefined;

    // If auto-calculate is enabled AND odometer fields are not provided (or 0)
    if (isAutoCalculate && (!validated.startOdometerKm || validated.startOdometerKm === 0)) {
      // Calculate odometer readings automatically
      const calculated = await calculateOdometerForTrip(
        validated.vehicleId,
        validated.timestamp.getTime(),
        validated.distanceKm || undefined
      );

      if (isOdometerCalculationError(calculated)) {
        // Auto-calculate failed - return error
        return { success: false, error: calculated.message };
      }

      // Use calculated values
      validated.startOdometerKm = calculated.startOdometerKm;
      if (calculated.endOdometerKm) {
        validated.endOdometerKm = calculated.endOdometerKm;
      }

      // Mark as auto-calculated
      odometerCalculated = true;
      calculationBasedOn = {
        previousMeterstandId: calculated.calculatedFrom.previousMeterstand.id,
        nextMeterstandId: calculated.calculatedFrom.nextMeterstand?.id,
        interpolationMethod: "linear",
      };
    }

    // Check if odometer is chronologically valid
    // SKIP chronological validation when odometer was auto-calculated
    // (auto-calculate uses linear interpolation and ensures consistency with meterstand entries)
    let previousRegistration: any = null;

    if (!odometerCalculated) {
      // Find the registration that occurred immediately BEFORE this timestamp
      // (exclude meterstand entries - they're separate from trip odometer tracking)
      const allRegistrations = await db.query.registrations.findMany({
        where: and(
          eq(schema.registrations.userId, session.userId!),
          eq(schema.registrations.vehicleId, validated.vehicleId)
        ),
      });

      // Filter to trip entries only and sort by timestamp
      const tripRegistrations = allRegistrations
        .filter(reg => !isMeterstandEntry(reg))
        .map(reg => ({
          ...reg,
          timestamp: (reg.data as any).timestamp
        }))
        .sort((a, b) => b.timestamp - a.timestamp);

      // Find the previous registration (chronologically before this one)
      previousRegistration = tripRegistrations.find(
        reg => reg.timestamp < validated.timestamp.getTime()
      );

      if (previousRegistration) {
        const prevData = previousRegistration.data as any;
        const prevOdometer = prevData.endOdometerKm || prevData.startOdometerKm || prevData.odometerKm;

        if (prevOdometer && validated.startOdometerKm < prevOdometer) {
          return {
            success: false,
            error: `Kilometerstand moet hoger zijn dan de vorige registratie (${prevOdometer} km)`,
          };
        }
      }

      // Also check the next registration (chronologically after this one)
      const nextRegistration = tripRegistrations
        .filter(reg => reg.timestamp > validated.timestamp.getTime())
        .sort((a, b) => a.timestamp - b.timestamp)[0];

      if (nextRegistration) {
        const nextData = nextRegistration.data as any;
        const nextOdometer = nextData.startOdometerKm || nextData.odometerKm;

        if (nextOdometer && validated.startOdometerKm > nextOdometer) {
          return {
            success: false,
            error: `Kilometerstand moet lager zijn dan de volgende registratie (${nextOdometer} km)`,
          };
        }

        // Also check end odometer if provided
        if (validated.endOdometerKm && nextOdometer && validated.endOdometerKm > nextOdometer) {
          return {
            success: false,
            error: `Eindstand moet lager zijn dan de volgende registratie (${nextOdometer} km)`,
          };
        }
      }
    }

    // Validate end odometer is higher than start odometer
    if (validated.endOdometerKm && validated.endOdometerKm <= validated.startOdometerKm) {
      return {
        success: false,
        error: "Eindstand moet hoger zijn dan de beginstand",
      };
    }

    // Validate timestamp (not too far in future)
    const now = new Date();
    const maxFutureTime = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes
    if (validated.timestamp > maxFutureTime) {
      return {
        success: false,
        error: "Tijdstip mag niet meer dan 5 minuten in de toekomst zijn",
      };
    }

    // Calculate distance from odometer if not provided
    let calculatedDistance = validated.distanceKm;
    let calculationMethod = validated.calculationMethod;

    if (!calculatedDistance && validated.endOdometerKm) {
      calculatedDistance = validated.endOdometerKm - validated.startOdometerKm;
      calculationMethod = "odometer";
    }

    // NOTE: Auto-backfill logic removed for legal compliance
    // Dutch tax authority requires recording ACTUAL end odometer at the time
    // the trip ends, not backfilling based on next trip's start.
    // Users must manually complete incomplete trips via "Laatste rit voltooien".

    // Create registration
    const registrationId = nanoid();
    await db.insert(schema.registrations).values({
      id: registrationId,
      userId: session.userId!,
      vehicleId: validated.vehicleId,
      data: {
        type: "trip",
        timestamp: validated.timestamp.getTime(),
        startOdometerKm: validated.startOdometerKm,
        endOdometerKm: validated.endOdometerKm || undefined,
        tripType: validated.tripType,
        departure: validated.departure,
        destination: validated.destination,
        distanceKm: calculatedDistance || undefined,
        calculationMethod: calculationMethod as any,
        description: validated.description,
        alternativeRoute: validated.alternativeRoute,
        privateDetourKm: validated.privateDetourKm || undefined,
        linkedTripId: validated.linkedTripId,
        tripDirection: validated.tripDirection,
        // A trip is incomplete if it doesn't have an actual end odometer reading
        // Having OSRM distance doesn't make it complete - we need the actual odometer
        isIncomplete: !validated.endOdometerKm,
        // Auto-calculate metadata
        odometerCalculated: odometerCalculated || undefined,
        calculationBasedOn: calculationBasedOn || undefined,
      } as any,
    });

    revalidatePath("/registraties");
    revalidatePath("/dashboard");

    // Check for odometer milestone after successful creation
    if (validated.endOdometerKm) {
      await checkOdometerMilestone(
        session.userId!,
        validated.vehicleId,
        validated.endOdometerKm
      );
    } else {
      // Send real-time incomplete trip notification
      await notifyIncompleteTrip(
        session.userId!,
        registrationId,
        validated.vehicleId
      );
    }

    // Check for odometer gap (real-time compliance warning)
    // Skip gap check if odometer was auto-calculated (interpolated values don't have gaps)
    if (previousRegistration && !odometerCalculated) {
      await checkOdometerGap(
        session.userId!,
        validated.vehicleId,
        previousRegistration,
        validated.startOdometerKm
      );
    }

    return { success: true, data: { id: registrationId } };
  } catch (error) {
    console.error("Create registration error:", error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return {
      success: false,
      error: "Er is een fout opgetreden bij aanmaken van registratie",
    };
  }
}

/**
 * Check if odometer crossed a milestone and send notification
 * Milestones: 10k, 25k, 50k, 75k, 100k, 150k, 200k, 250k, 500k km
 */
async function checkOdometerMilestone(
  userId: string,
  vehicleId: string,
  newOdometer: number
) {
  try {
    // Get previous odometer reading (from end of last trip, or start if no end)
    const previousRegistrations = await db.query.registrations.findMany({
      where: and(
        eq(schema.registrations.userId, userId),
        eq(schema.registrations.vehicleId, vehicleId)
      ),
      orderBy: [desc(schema.registrations.createdAt)],
      limit: 5, // Get a few to find the most recent with odometer data
    });

    if (previousRegistrations.length === 0) return;

    // Find the most recent odometer reading
    let previousOdometer: number | null = null;
    for (const reg of previousRegistrations) {
      const data = reg.data as any;
      const odometer = data.endOdometerKm || data.startOdometerKm;
      if (odometer && odometer < newOdometer) {
        previousOdometer = odometer;
        break;
      }
    }

    if (!previousOdometer) return;

    // Milestone values in kilometers
    const milestones = [10000, 25000, 50000, 75000, 100000, 150000, 200000, 250000, 500000];

    // Check if we crossed any milestone
    for (const milestone of milestones) {
      if (previousOdometer < milestone && newOdometer >= milestone) {
        // Get vehicle details for notification
        const vehicle = await db.query.vehicles.findFirst({
          where: eq(schema.vehicles.id, vehicleId),
        });

        if (!vehicle) continue;

        const vehicleDetails = vehicle.details as any;
        const vehicleName = vehicleDetails.make && vehicleDetails.model
          ? `${vehicleDetails.make} ${vehicleDetails.model}`
          : vehicle.licensePlate;

        // Enqueue milestone notification
        await enqueueJob("notification", {
          userId,
          notificationData: {
            type: "odometer_milestone",
            title: `🎉 ${milestone.toLocaleString("nl-NL")} km mijlpaal!`,
            message: `Je ${vehicleName} heeft de ${milestone.toLocaleString("nl-NL")} kilometer bereikt!`,
            priority: "low",
            icon: "Trophy",
            color: "yellow",
            action: {
              label: "Bekijk voertuig",
              url: `/garage`,
            },
            relatedVehicleId: vehicleId,
          },
        });

        console.log(`Milestone notification enqueued: ${milestone} km for vehicle ${vehicleId}`);
      }
    }
  } catch (error) {
    console.error("Check odometer milestone error:", error);
    // Don't throw - milestone notifications are non-critical
  }
}

/**
 * Auto-archive incomplete trip notifications when a trip is completed
 * Checks if ALL trips in the notification are now complete before archiving
 */
async function autoArchiveIncompleteNotifications(
  userId: string,
  completedRegistrationId: string
) {
  try {
    // Find all unarchived incomplete trip notifications for this user
    const relatedNotifications = await db.query.notifications.findMany({
      where: and(
        eq(schema.notifications.userId, userId),
        eq(schema.notifications.isArchived, false)
      ),
    });

    for (const notification of relatedNotifications) {
      const data = notification.data as any;

      // Skip if not an incomplete trip notification
      if (data.type !== "incomplete_trip") continue;

      // Get all trip IDs mentioned in this notification
      const incompleteTripIds = data.incompleteTripIds || [data.relatedRegistrationId];

      // Skip if this notification doesn't include the completed trip
      if (!incompleteTripIds.includes(completedRegistrationId)) continue;

      // Check if ALL trips in this notification are now complete
      let allComplete = true;
      for (const tripId of incompleteTripIds) {
        const trip = await db.query.registrations.findFirst({
          where: eq(schema.registrations.id, tripId),
        });

        if (!trip) continue;

        const tripData = trip.data as any;
        // Check if trip is still incomplete
        if (!tripData.endOdometerKm || tripData.isIncomplete === true) {
          allComplete = false;
          break;
        }
      }

      // Archive the notification if all trips are complete
      if (allComplete) {
        await db
          .update(schema.notifications)
          .set({
            isArchived: true,
            archivedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(schema.notifications.id, notification.id));

        console.log(
          `Auto-archived incomplete trip notification ${notification.id} (all trips complete)`
        );
      }
    }
  } catch (error) {
    console.error("Auto-archive incomplete notifications error:", error);
    // Don't throw - auto-archive is non-critical
  }
}

/**
 * Check for odometer gap between trips and send real-time warning
 * Tolerance: 1 km for rounding errors
 */
async function checkOdometerGap(
  userId: string,
  vehicleId: string,
  lastRegistration: any,
  newStartOdometer: number
) {
  try {
    const lastData = lastRegistration.data as any;
    const lastOdometer = lastData.endOdometerKm || lastData.startOdometerKm;

    if (!lastOdometer) return; // Can't check without previous odometer

    const gap = newStartOdometer - lastOdometer;
    const TOLERANCE = 1; // 1 km tolerance

    if (gap > TOLERANCE) {
      // Get vehicle details
      const vehicle = await db.query.vehicles.findFirst({
        where: eq(schema.vehicles.id, vehicleId),
      });

      if (!vehicle) return;

      const vehicleDetails = vehicle.details as any;
      const vehicleName = vehicleDetails.make && vehicleDetails.model
        ? `${vehicleDetails.make} ${vehicleDetails.model}`
        : vehicle.licensePlate;

      // Determine severity
      const severity = gap > 50 ? "urgent" : gap > 20 ? "high" : gap > 5 ? "medium" : "normal";

      // Send gap warning notification
      await enqueueJob("notification", {
        userId,
        notificationData: {
          type: "custom",
          title: "Kilometerstand gat gedetecteerd",
          message: `Er zijn ${Math.round(gap)} km niet verantwoord tussen je laatste rit (${lastOdometer.toLocaleString("nl-NL")} km) en nieuwe rit (${newStartOdometer.toLocaleString("nl-NL")} km) voor ${vehicleName}. Controleer of je geen ritten mist.`,
          priority: severity as any,
          icon: "AlertTriangle",
          color: "orange",
          action: {
            label: "Bekijk ritten",
            url: "/registraties/overzicht",
          },
          relatedVehicleId: vehicleId,
          gapInfo: {
            lastOdometer,
            newOdometer: newStartOdometer,
            gap: Math.round(gap),
            lastTripId: lastRegistration.id,
          },
        },
      });

      console.log(`Odometer gap warning sent: ${Math.round(gap)} km gap detected`);
    }
  } catch (error) {
    console.error("Check odometer gap error:", error);
    // Don't throw - gap checking is non-critical
  }
}

/**
 * Send real-time notification for incomplete trip
 * Called immediately when trip is created without end odometer
 */
async function notifyIncompleteTrip(
  userId: string,
  registrationId: string,
  vehicleId: string
) {
  try {
    // Get vehicle details
    const vehicle = await db.query.vehicles.findFirst({
      where: eq(schema.vehicles.id, vehicleId),
    });

    if (!vehicle) return;

    const vehicleDetails = vehicle.details as any;
    const vehicleName = vehicleDetails.make && vehicleDetails.model
      ? `${vehicleDetails.make} ${vehicleDetails.model}`
      : vehicle.licensePlate;

    // Send incomplete trip notification
    await enqueueJob("notification", {
      userId,
      notificationData: {
        type: "incomplete_trip",
        title: "Onvolledige rit",
        message: `Je hebt een rit zonder eindstand aangemaakt voor ${vehicleName}. Vul de eindstand aan voor correcte kilometerregistratie.`,
        priority: "high",
        icon: "AlertTriangle",
        color: "orange",
        action: {
          label: "Rit voltooien",
          url: `/registraties/overzicht?complete=${registrationId}`,
        },
        relatedRegistrationId: registrationId,
        relatedVehicleId: vehicleId,
        incompleteTripIds: [registrationId], // Track for auto-clearing
      },
    });

    console.log(`Incomplete trip notification sent for registration ${registrationId}`);
  } catch (error) {
    console.error("Notify incomplete trip error:", error);
    // Don't throw - notifications are non-critical
  }
}

/**
 * Create a simple odometer entry (no trip details)
 */
export async function createOdometerEntry(formData: FormData) {
  try {
    const session = await requireAuth();

    const rawData = {
      vehicleId: formData.get("vehicleId"),
      timestamp: formData.get("timestamp"),
      startOdometerKm: formData.get("startOdometerKm"),
      description: formData.get("description") || undefined,
    };

    // Validate input
    const validated = createOdometerEntrySchema.parse(rawData);

    // Verify vehicle belongs to user
    const vehicle = await db.query.vehicles.findFirst({
      where: and(
        eq(schema.vehicles.id, validated.vehicleId),
        eq(schema.vehicles.userId, session.userId!)
      ),
    });

    if (!vehicle) {
      return { success: false, error: "Voertuig niet gevonden" };
    }

    const vehicleDetails = vehicle.details as any;
    if (!vehicleDetails.isEnabled) {
      return { success: false, error: "Dit voertuig is uitgeschakeld" };
    }

    // Create a minimal registration entry
    const registrationId = nanoid();
    await db.insert(schema.registrations).values({
      id: registrationId,
      userId: session.userId!,
      vehicleId: validated.vehicleId,
      data: {
        type: "meterstand",
        timestamp: validated.timestamp.getTime(),
        startOdometerKm: validated.startOdometerKm,
        tripType: "privé", // Default for odometer-only entries
        departure: { text: "Kilometerstand registratie" },
        destination: { text: "Kilometerstand registratie" },
        description: validated.description,
      } as any,
    });

    revalidatePath("/registraties");
    return { success: true, data: { id: registrationId } };
  } catch (error) {
    console.error("Create odometer entry error:", error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return {
      success: false,
      error: "Er is een fout opgetreden bij aanmaken van kilometerstand",
    };
  }
}

/**
 * Create a return journey based on an existing trip
 */
export async function createReturnJourney(outwardTripId: string) {
  try {
    const session = await requireAuth();

    // Get the outward trip
    const outwardTrip = await db.query.registrations.findFirst({
      where: and(
        eq(schema.registrations.id, outwardTripId),
        eq(schema.registrations.userId, session.userId!)
      ),
    });

    if (!outwardTrip) {
      return { success: false, error: "Heenreis niet gevonden" };
    }

    // Block return journey from meterstand entries
    if (isMeterstandEntry(outwardTrip)) {
      return {
        success: false,
        error: "Kan geen retourrit maken van een kilometerstandregistratie",
      };
    }

    const outwardData = outwardTrip.data as any;

    // Create return journey with swapped addresses
    const registrationId = nanoid();
    await db.insert(schema.registrations).values({
      id: registrationId,
      userId: session.userId!,
      vehicleId: outwardTrip.vehicleId,
      data: {
        type: "trip",
        timestamp: Date.now(),
        startOdometerKm: outwardData.endOdometerKm || outwardData.startOdometerKm,
        tripType: outwardData.tripType,
        departure: outwardData.destination, // Swap: destination becomes departure
        destination: outwardData.departure, // Swap: departure becomes destination
        distanceKm: outwardData.distanceKm,
        calculationMethod: outwardData.calculationMethod,
        linkedTripId: outwardTripId,
        tripDirection: "terugreis",
        description: outwardData.description ? `Terugreis: ${outwardData.description}` : "Terugreis",
      } as any,
    });

    revalidatePath("/registraties");
    return { success: true, data: { id: registrationId } };
  } catch (error) {
    console.error("Create return journey error:", error);
    return {
      success: false,
      error: "Er is een fout opgetreden bij aanmaken van terugreis",
    };
  }
}

/**
 * Get all user registrations
 */
export async function getUserRegistrations(limit?: number) {
  try {
    const session = await requireAuth();

    const registrations = await db.query.registrations.findMany({
      where: eq(schema.registrations.userId, session.userId!),
      orderBy: [desc(schema.registrations.createdAt)],
      limit: limit || undefined,
      with: {
        vehicle: true,
      },
    });

    return { success: true, data: registrations };
  } catch (error) {
    console.error("Get user registrations error:", error);
    return { success: false, error: "Kon registraties niet ophalen" };
  }
}

/**
 * Get highest odometer reading for a vehicle
 * Returns the highest odometer value from all registrations (trips and meterstand entries)
 */
export async function getHighestOdometerForVehicle(vehicleId?: string) {
  try {
    const session = await requireAuth();

    // Get all registrations for user (or specific vehicle)
    const whereClause = vehicleId
      ? and(
          eq(schema.registrations.userId, session.userId!),
          eq(schema.registrations.vehicleId, vehicleId)
        )
      : eq(schema.registrations.userId, session.userId!);

    const registrations = await db.query.registrations.findMany({
      where: whereClause,
      with: {
        vehicle: true,
      },
    });

    if (registrations.length === 0) {
      return { success: true, data: null };
    }

    // Find the highest odometer reading across all registrations
    let highestOdometer = 0;
    let highestRegistration = null;

    for (const reg of registrations) {
      const data = reg.data as any;

      // For trips: use endOdometerKm if available, otherwise startOdometerKm
      let odometer = 0;
      if (isTripEntry(reg)) {
        odometer = data.endOdometerKm || data.startOdometerKm || 0;
      } else if (isMeterstandEntry(reg)) {
        // For meterstand entries: use startOdometerKm
        odometer = data.startOdometerKm || 0;
      }

      if (odometer > highestOdometer) {
        highestOdometer = odometer;
        highestRegistration = reg;
      }
    }

    return {
      success: true,
      data: highestRegistration,
      highestOdometer,
    };
  } catch (error) {
    console.error("Get highest odometer error:", error);
    return { success: false, error: "Kon hoogste kilometerstand niet ophalen" };
  }
}

/**
 * Get the last trip registration (excludes meterstand entries)
 * Use this to get the most recent actual trip for pre-filling forms
 */
export async function getLastTripRegistration() {
  try {
    const session = await requireAuth();

    const allRegistrations = await db.query.registrations.findMany({
      where: eq(schema.registrations.userId, session.userId!),
      orderBy: [desc(schema.registrations.createdAt)],
      with: { vehicle: true },
      limit: 10, // Get more to filter through
    });

    // Find first trip (non-meterstand) entry
    const lastTrip = allRegistrations.find((reg) => !isMeterstandEntry(reg));

    return { success: true, data: lastTrip || null };
  } catch (error) {
    console.error("Get last trip registration error:", error);
    return { success: false, error: "Kon laatste rit niet ophalen" };
  }
}

/**
 * Get registration statistics
 */
export async function getRegistrationStats() {
  try {
    const session = await requireAuth();

    const now = new Date();

    // Start of current week (Monday)
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1));
    startOfWeek.setHours(0, 0, 0, 0);

    // Start of current month
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    startOfMonth.setHours(0, 0, 0, 0);

    // Start of current year
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    startOfYear.setHours(0, 0, 0, 0);

    // Get all user registrations
    const allRegistrations = await db.query.registrations.findMany({
      where: eq(schema.registrations.userId, session.userId!),
    });

    // Calculate stats (only count actual trips, not meterstand entries)
    const thisWeek = allRegistrations.filter((reg) => {
      const data = reg.data as any;

      // Only count actual trips
      if (!isTripEntry(reg)) {
        return false;
      }

      return data.timestamp >= startOfWeek.getTime();
    });

    const thisMonth = allRegistrations.filter((reg) => {
      const data = reg.data as any;

      // Only count actual trips
      if (!isTripEntry(reg)) {
        return false;
      }

      return data.timestamp >= startOfMonth.getTime();
    });

    const thisYear = allRegistrations.filter((reg) => {
      const data = reg.data as any;

      // Only count actual trips
      if (!isTripEntry(reg)) {
        return false;
      }

      return data.timestamp >= startOfYear.getTime();
    });

    // Filter all registrations to only trips for total stats
    const allTrips = allRegistrations.filter((reg) => isTripEntry(reg));

    const stats = {
      thisWeek: {
        trips: thisWeek.length,
        kilometers: thisWeek.reduce((sum, reg) => {
          const data = reg.data as any;
          return sum + (data.distanceKm || 0);
        }, 0),
        business: thisWeek.filter((r) => (r.data as any).tripType === "zakelijk").length,
      },
      thisMonth: {
        trips: thisMonth.length,
        kilometers: thisMonth.reduce((sum, reg) => {
          const data = reg.data as any;
          return sum + (data.distanceKm || 0);
        }, 0),
        business: thisMonth.filter((r) => (r.data as any).tripType === "zakelijk").length,
      },
      thisYear: {
        trips: thisYear.length,
        kilometers: thisYear.reduce((sum, reg) => {
          const data = reg.data as any;
          return sum + (data.distanceKm || 0);
        }, 0),
        privateKilometers: thisYear.reduce((sum, reg) => {
          const data = reg.data as any;
          // Calculate distance from odometer if not explicitly stored
          const tripDistance = data.distanceKm || 
            (data.endOdometerKm && data.startOdometerKm 
              ? data.endOdometerKm - data.startOdometerKm 
              : 0);
          // Only count private trips
          if (data.tripType === "privé" && tripDistance) {
            return sum + tripDistance;
          }
          // Also count private portion of business trips if tracked
          if (data.tripType === "zakelijk" && data.privateDetourKm) {
            return sum + data.privateDetourKm;
          }
          return sum;
        }, 0),
      },
      total: {
        trips: allTrips.length,
        kilometers: allTrips.reduce((sum, reg) => {
          const data = reg.data as any;
          return sum + (data.distanceKm || 0);
        }, 0),
      },
    };

    return { success: true, data: stats };
  } catch (error) {
    console.error("Get registration stats error:", error);
    return { success: false, error: "Kon statistieken niet ophalen" };
  }
}

/**
 * Get daily mileage stats for the current year (for contribution graph)
 */
export async function getDailyMileageStats() {
  try {
    const session = await requireAuth();

    const now = new Date();
    // Get data for the last 365 days
    const last365Days = new Date(now);
    last365Days.setDate(last365Days.getDate() - 365);
    last365Days.setHours(0, 0, 0, 0);

    // Get all user registrations for the last 365 days
    const allRegistrations = await db.query.registrations.findMany({
      where: eq(schema.registrations.userId, session.userId!),
    });

    // Filter to only trips from the last 365 days
    const thisYearTrips = allRegistrations.filter((reg) => {
      if (!isTripEntry(reg)) return false;
      const data = reg.data as any;
      return data.timestamp >= last365Days.getTime();
    });

    // Group by date
    const dailyStats = new Map<string, { kilometers: number; trips: number }>();

    thisYearTrips.forEach((reg) => {
      const data = reg.data as any;
      const date = new Date(data.timestamp);
      const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD

      if (!dailyStats.has(dateKey)) {
        dailyStats.set(dateKey, { kilometers: 0, trips: 0 });
      }

      const stats = dailyStats.get(dateKey)!;
      stats.trips += 1;
      stats.kilometers += data.distanceKm || 0;
    });

    // Convert to array format
    const result = Array.from(dailyStats.entries()).map(([date, stats]) => ({
      date,
      kilometers: stats.kilometers,
      trips: stats.trips,
    }));

    return { success: true, data: result };
  } catch (error) {
    console.error("Get daily mileage stats error:", error);
    return { success: false, error: "Kon dagelijkse statistieken niet ophalen" };
  }
}

/**
 * Get monthly kilometers with trend data
 */
export async function getMonthlyKilometersTrend() {
  try {
    const session = await requireAuth();

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Start of current month
    const startOfCurrentMonth = new Date(currentYear, currentMonth, 1);
    startOfCurrentMonth.setHours(0, 0, 0, 0);

    // Start of previous month
    const startOfPreviousMonth = new Date(currentYear, currentMonth - 1, 1);
    startOfPreviousMonth.setHours(0, 0, 0, 0);

    // Get all user registrations
    const allRegistrations = await db.query.registrations.findMany({
      where: eq(schema.registrations.userId, session.userId!),
    });

    // Filter trips for current month
    const currentMonthTrips = allRegistrations.filter((reg) => {
      if (!isTripEntry(reg)) return false;
      const data = reg.data as any;
      return data.timestamp >= startOfCurrentMonth.getTime();
    });

    // Filter trips for previous month
    const previousMonthTrips = allRegistrations.filter((reg) => {
      if (!isTripEntry(reg)) return false;
      const data = reg.data as any;
      return (
        data.timestamp >= startOfPreviousMonth.getTime() &&
        data.timestamp < startOfCurrentMonth.getTime()
      );
    });

    // Calculate totals
    const currentMonthKm = currentMonthTrips.reduce(
      (sum, reg) => sum + ((reg.data as any).distanceKm || 0),
      0
    );

    const previousMonthKm = previousMonthTrips.reduce(
      (sum, reg) => sum + ((reg.data as any).distanceKm || 0),
      0
    );

    // Group current month by day for chart
    const dailyData = new Map<number, number>();
    currentMonthTrips.forEach((reg) => {
      const data = reg.data as any;
      const date = new Date(data.timestamp);
      const day = date.getDate();
      
      if (!dailyData.has(day)) {
        dailyData.set(day, 0);
      }
      dailyData.set(day, dailyData.get(day)! + (data.distanceKm || 0));
    });

    // Convert to array format
    const dailyDataArray = Array.from(dailyData.entries())
      .sort(([a], [b]) => a - b)
      .map(([day, km]) => ({
        day: day.toString(),
        kilometers: km,
      }));

    return {
      success: true,
      data: {
        currentMonthKm,
        previousMonthKm,
        currentMonthName: now.toLocaleDateString("nl-NL", { month: "long" }),
        previousMonthName: startOfPreviousMonth.toLocaleDateString("nl-NL", { month: "long" }),
        dailyData: dailyDataArray,
      },
    };
  } catch (error) {
    console.error("Get monthly kilometers trend error:", error);
    return { success: false, error: "Kon maandelijkse trend niet ophalen" };
  }
}

/**
 * Get yearly private kilometers with trend data
 */
export async function getYearlyPrivateKilometersTrend() {
  try {
    const session = await requireAuth();

    const now = new Date();
    const currentYear = now.getFullYear();

    // Start of current year
    const startOfCurrentYear = new Date(currentYear, 0, 1);
    startOfCurrentYear.setHours(0, 0, 0, 0);

    // Start of previous year
    const startOfPreviousYear = new Date(currentYear - 1, 0, 1);
    startOfPreviousYear.setHours(0, 0, 0, 0);

    // Get all user registrations
    const allRegistrations = await db.query.registrations.findMany({
      where: eq(schema.registrations.userId, session.userId!),
    });

    // Filter trips for current year
    const currentYearTrips = allRegistrations.filter((reg) => {
      if (!isTripEntry(reg)) return false;
      const data = reg.data as any;
      return data.timestamp >= startOfCurrentYear.getTime();
    });

    // Filter trips for previous year
    const previousYearTrips = allRegistrations.filter((reg) => {
      if (!isTripEntry(reg)) return false;
      const data = reg.data as any;
      return (
        data.timestamp >= startOfPreviousYear.getTime() &&
        data.timestamp < startOfCurrentYear.getTime()
      );
    });

    // Calculate private kilometers for current year
    const currentYearKm = currentYearTrips.reduce((sum, reg) => {
      const data = reg.data as any;
      const tripDistance = data.distanceKm || 
        (data.endOdometerKm && data.startOdometerKm 
          ? data.endOdometerKm - data.startOdometerKm 
          : 0);
      
      if (data.tripType === "privé" && tripDistance) {
        return sum + tripDistance;
      }
      if (data.tripType === "zakelijk" && data.privateDetourKm) {
        return sum + data.privateDetourKm;
      }
      return sum;
    }, 0);

    // Calculate private kilometers for previous year
    const previousYearKm = previousYearTrips.reduce((sum, reg) => {
      const data = reg.data as any;
      const tripDistance = data.distanceKm || 
        (data.endOdometerKm && data.startOdometerKm 
          ? data.endOdometerKm - data.startOdometerKm 
          : 0);
      
      if (data.tripType === "privé" && tripDistance) {
        return sum + tripDistance;
      }
      if (data.tripType === "zakelijk" && data.privateDetourKm) {
        return sum + data.privateDetourKm;
      }
      return sum;
    }, 0);

    // Group current year by month for chart
    const monthlyData = new Map<number, number>();
    currentYearTrips.forEach((reg) => {
      const data = reg.data as any;
      const date = new Date(data.timestamp);
      const month = date.getMonth();
      
      const tripDistance = data.distanceKm || 
        (data.endOdometerKm && data.startOdometerKm 
          ? data.endOdometerKm - data.startOdometerKm 
          : 0);
      
      if (!monthlyData.has(month)) {
        monthlyData.set(month, 0);
      }
      
      if (data.tripType === "privé" && tripDistance) {
        monthlyData.set(month, monthlyData.get(month)! + tripDistance);
      }
      if (data.tripType === "zakelijk" && data.privateDetourKm) {
        monthlyData.set(month, monthlyData.get(month)! + data.privateDetourKm);
      }
    });

    const monthNames = ["Jan", "Feb", "Mrt", "Apr", "Mei", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
    // Convert to array format
    const monthlyDataArray = Array.from(monthlyData.entries())
      .sort(([a], [b]) => a - b)
      .map(([month, km]) => ({
        month: monthNames[month],
        kilometers: km,
      }));

    return {
      success: true,
      data: {
        currentYearKm,
        previousYearKm,
        currentYear: currentYear.toString(),
        previousYear: (currentYear - 1).toString(),
        monthlyData: monthlyDataArray,
      },
    };
  } catch (error) {
    console.error("Get yearly private kilometers trend error:", error);
    return { success: false, error: "Kon jaarlijkse trend niet ophalen" };
  }
}

/**
 * Get registrations grouped by date
 */
export async function getRegistrationsByDate() {
  try {
    const session = await requireAuth();

    const registrations = await db.query.registrations.findMany({
      where: eq(schema.registrations.userId, session.userId!),
      orderBy: [desc(schema.registrations.createdAt)],
      with: {
        vehicle: true,
      },
    });

    // Group by date
    const grouped: Record<string, any[]> = {};

    registrations.forEach((reg) => {
      const data = reg.data as any;
      const date = new Date(data.timestamp);
      const dateKey = date.toISOString().split("T")[0]; // YYYY-MM-DD

      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }

      grouped[dateKey].push({
        ...reg,
        parsedData: data,
      });
    });

    return { success: true, data: grouped };
  } catch (error) {
    console.error("Get registrations by date error:", error);
    return { success: false, error: "Kon registraties niet ophalen" };
  }
}

/**
 * Get registrations filtered by date range
 * @param startDate - Start of the date range (inclusive)
 * @param endDate - End of the date range (inclusive)
 */
export async function getRegistrationsByDateRange(
  startDate?: Date,
  endDate?: Date
) {
  try {
    const session = await requireAuth();

    const registrations = await db.query.registrations.findMany({
      where: eq(schema.registrations.userId, session.userId!),
      orderBy: [desc(schema.registrations.createdAt)],
      with: {
        vehicle: true,
      },
    });

    // Filter by date range and group by date
    const grouped: Record<string, any[]> = {};
    const flatList: any[] = [];
    let totalDistance = 0;
    let totalTrips = 0;
    let privateKilometers = 0;

    const startTimestamp = startDate ? startDate.getTime() : 0;
    const endTimestamp = endDate ? endDate.getTime() : Date.now() + 86400000; // +1 day

    registrations.forEach((reg) => {
      const data = reg.data as any;
      const timestamp = data.timestamp;

      // Skip meterstand entries - only show actual trips in overview
      if (isMeterstandEntry(reg)) {
        return;
      }

      // Filter by date range
      if (timestamp >= startTimestamp && timestamp <= endTimestamp) {
        const date = new Date(timestamp);
        const dateKey = date.toISOString().split("T")[0]; // YYYY-MM-DD

        const enrichedReg = {
          ...reg,
          parsedData: data,
        };

        if (!grouped[dateKey]) {
          grouped[dateKey] = [];
        }

        grouped[dateKey].push(enrichedReg);
        flatList.push(enrichedReg);

        // Calculate totals
        const tripDistance = data.distanceKm || 0;
        totalDistance += tripDistance;
        totalTrips++;

        // Calculate private kilometers
        if (data.tripType === "privé" && tripDistance) {
          privateKilometers += tripDistance;
        } else if (data.tripType === "zakelijk" && data.privateDetourKm) {
          privateKilometers += data.privateDetourKm;
        }
      }
    });

    return {
      success: true,
      data: grouped,
      flatList,
      stats: {
        totalDistance,
        totalTrips,
        privateKilometers,
      },
    };
  } catch (error) {
    console.error("Get registrations by date range error:", error);
    return { success: false, error: "Kon registraties niet ophalen" };
  }
}

/**
 * Get incomplete registrations that need user attention
 */
export async function getIncompleteRegistrations() {
  try {
    const session = await requireAuth();

    const allRegistrations = await db.query.registrations.findMany({
      where: eq(schema.registrations.userId, session.userId!),
      orderBy: [desc(schema.registrations.createdAt)],
      with: {
        vehicle: true,
      },
    });

    // Filter incomplete registrations (missing end odometer)
    const incomplete = allRegistrations.filter((reg) => {
      const data = reg.data as any;

      // Skip meterstand - they don't need completion
      if (isMeterstandEntry(reg)) {
        return false;
      }

      // Skip auto-calculated trips - system handles odometer automatically
      if (data.odometerCalculated === true) {
        return false;
      }

      // Only show trips that were expected to be manually completed
      return !data.endOdometerKm;
    });

    return { success: true, data: incomplete };
  } catch (error) {
    console.error("Get incomplete registrations error:", error);
    return { success: false, error: "Kon incomplete registraties niet ophalen" };
  }
}

/**
 * Complete a registration by adding end odometer
 */
export async function completeRegistration(registrationId: string, endOdometerKm: number) {
  try {
    const session = await requireAuth();

    // Verify registration belongs to user
    const registration = await db.query.registrations.findFirst({
      where: and(
        eq(schema.registrations.id, registrationId),
        eq(schema.registrations.userId, session.userId!)
      ),
    });

    if (!registration) {
      return { success: false, error: "Registratie niet gevonden" };
    }

    const data = registration.data as any;

    // Validate end odometer is higher than start
    if (endOdometerKm <= data.startOdometerKm) {
      return {
        success: false,
        error: "Eindstand moet hoger zijn dan de beginstand",
      };
    }

    // Calculate distance from odometer
    const distanceKm = endOdometerKm - data.startOdometerKm;

    // Update registration
    await db
      .update(schema.registrations)
      .set({
        data: {
          ...data,
          endOdometerKm,
          distanceKm,
          calculationMethod: "odometer",
          isIncomplete: false,
        },
      })
      .where(eq(schema.registrations.id, registrationId));

    revalidatePath("/registraties");
    revalidatePath("/dashboard");

    // Check for odometer milestone after completion
    await checkOdometerMilestone(
      session.userId!,
      registration.vehicleId,
      endOdometerKm
    );

    // Auto-archive incomplete trip notifications for this trip
    await autoArchiveIncompleteNotifications(
      session.userId!,
      registrationId
    );

    return { success: true };
  } catch (error) {
    console.error("Complete registration error:", error);
    return { success: false, error: "Kon registratie niet voltooien" };
  }
}

/**
 * Delete a registration
 */
export async function deleteRegistration(registrationId: string) {
  try {
    const session = await requireAuth();

    // Verify registration belongs to user
    const registration = await db.query.registrations.findFirst({
      where: and(
        eq(schema.registrations.id, registrationId),
        eq(schema.registrations.userId, session.userId!)
      ),
    });

    if (!registration) {
      return { success: false, error: "Registratie niet gevonden" };
    }

    await db
      .delete(schema.registrations)
      .where(eq(schema.registrations.id, registrationId));

    revalidatePath("/registraties");
    return { success: true };
  } catch (error) {
    console.error("Delete registration error:", error);
    return { success: false, error: "Kon registratie niet verwijderen" };
  }
}

/**
 * Get available periods (years and months) that contain registrations
 * Used to populate the period selector dropdown
 */
export async function getAvailablePeriodsForUser() {
  try {
    const session = await requireAuth();

    // Fetch all user registrations (only need timestamps)
    const registrations = await db.query.registrations.findMany({
      where: eq(schema.registrations.userId, session.userId!),
      orderBy: [desc(schema.registrations.createdAt)],
    });

    // Extract unique years and months from timestamps
    const yearsSet = new Set<number>();
    const monthsMap = new Map<string, { year: number; month: number }>();

    registrations.forEach((reg) => {
      const data = reg.data as any;
      const date = new Date(data.timestamp);
      const year = date.getFullYear();
      const month = date.getMonth() + 1; // 1-indexed

      yearsSet.add(year);
      const monthKey = `${year}-${String(month).padStart(2, '0')}`;
      monthsMap.set(monthKey, { year, month });
    });

    return {
      success: true,
      data: {
        years: Array.from(yearsSet).sort((a, b) => b - a), // Descending
        months: Array.from(monthsMap.values()).sort((a, b) => {
          if (a.year !== b.year) return b.year - a.year;
          return b.month - a.month;
        }),
      },
    };
  } catch (error) {
    console.error("Get available periods error:", error);
    return { success: false, error: "Kon periodes niet ophalen" };
  }
}

/**
 * Get odometer readings report with detailed statistics
 * Returns all registrations with odometer data, sorted by timestamp
 */
export async function getOdometerReadingsReport(options?: {
  startDate?: Date;
  endDate?: Date;
  vehicleId?: string;
  tripType?: string;
}) {
  try {
    const session = await requireAuth();

    // Fetch all user registrations with vehicles
    const registrations = await db.query.registrations.findMany({
      where: eq(schema.registrations.userId, session.userId!),
      orderBy: [desc(schema.registrations.createdAt)],
      with: {
        vehicle: true,
      },
    });

    // Filter by date range and vehicle if specified
    const startTimestamp = options?.startDate ? options.startDate.getTime() : 0;
    const endTimestamp = options?.endDate ? options.endDate.getTime() : Date.now() + 86400000;

    const filteredRegistrations = registrations.filter((reg) => {
      const data = reg.data as any;
      const timestamp = data.timestamp;

      // Skip meterstand entries - only show actual trips
      if (isMeterstandEntry(reg)) {
        return false;
      }

      // Date filter
      if (timestamp < startTimestamp || timestamp > endTimestamp) {
        return false;
      }

      // Vehicle filter
      if (options?.vehicleId && reg.vehicleId !== options.vehicleId) {
        return false;
      }

      // Trip type filter
      if (options?.tripType && options.tripType !== "all" && data.tripType !== options.tripType) {
        return false;
      }

      return true;
    });

    // Calculate statistics
    const stats = {
      totalReadings: filteredRegistrations.length,
      privateKilometers: 0,
      vehicleStats: {} as Record<string, {
        count: number;
        firstReading?: number;
        lastReading?: number;
        totalDistance?: number;
        privateKilometers?: number;
      }>,
      periodStart: options?.startDate,
      periodEnd: options?.endDate,
    };

    // Group by vehicle and calculate stats
    filteredRegistrations.forEach((reg) => {
      const data = reg.data as any;
      const vehicleId = reg.vehicleId;
      const odometer = data.endOdometerKm || data.startOdometerKm;

      // Calculate distance from odometer if not explicitly stored
      const tripDistance = data.distanceKm || 
        (data.endOdometerKm && data.startOdometerKm 
          ? data.endOdometerKm - data.startOdometerKm 
          : 0);

      // Calculate private kilometers
      if (data.tripType === "privé" && tripDistance) {
        stats.privateKilometers += tripDistance;
      } else if (data.tripType === "zakelijk" && data.privateDetourKm) {
        stats.privateKilometers += data.privateDetourKm;
      }

      if (!stats.vehicleStats[vehicleId]) {
        stats.vehicleStats[vehicleId] = {
          count: 0,
          privateKilometers: 0,
        };
      }

      stats.vehicleStats[vehicleId].count++;

      // Calculate private kilometers per vehicle
      if (data.tripType === "privé" && tripDistance) {
        stats.vehicleStats[vehicleId].privateKilometers =
          (stats.vehicleStats[vehicleId].privateKilometers || 0) + tripDistance;
      } else if (data.tripType === "zakelijk" && data.privateDetourKm) {
        stats.vehicleStats[vehicleId].privateKilometers =
          (stats.vehicleStats[vehicleId].privateKilometers || 0) + data.privateDetourKm;
      }

      // Sum up actual trip distances for totalDistance
      stats.vehicleStats[vehicleId].totalDistance =
        (stats.vehicleStats[vehicleId].totalDistance || 0) + tripDistance;

      // Track odometer readings for reference
      if (odometer) {
        if (!stats.vehicleStats[vehicleId].firstReading || odometer < stats.vehicleStats[vehicleId].firstReading!) {
          stats.vehicleStats[vehicleId].firstReading = odometer;
        }
        if (!stats.vehicleStats[vehicleId].lastReading || odometer > stats.vehicleStats[vehicleId].lastReading!) {
          stats.vehicleStats[vehicleId].lastReading = odometer;
        }
      }
    });

    // Enrich data for display
    const enrichedData = filteredRegistrations.map((reg) => {
      const data = reg.data as any;
      return {
        ...reg,
        parsedData: data,
        odometer: data.endOdometerKm || data.startOdometerKm,
        hasDistance: !!data.distanceKm,
      };
    });

    return {
      success: true,
      data: enrichedData,
      stats,
    };
  } catch (error) {
    console.error("Get odometer readings report error:", error);
    return { success: false, error: "Kon kilometerrapport niet ophalen" };
  }
}

/**
 * Update a registration
 */
export async function updateRegistration(registrationId: string, formData: FormData) {
  try {
    const session = await requireAuth();

    // Verify registration belongs to user
    const existing = await db.query.registrations.findFirst({
      where: and(
        eq(schema.registrations.id, registrationId),
        eq(schema.registrations.userId, session.userId!)
      ),
    });

    if (!existing) {
      return { success: false, error: "Registratie niet gevonden" };
    }

    const rawData = {
      vehicleId: formData.get("vehicleId"),
      timestamp: formData.get("timestamp"),
      startOdometerKm: formData.get("startOdometerKm"),
      endOdometerKm: formData.get("endOdometerKm") || null,
      tripType: formData.get("tripType"),
      departure: {
        text: formData.get("departureText") as string,
        lat: formData.get("departureLat") ? Number(formData.get("departureLat")) : undefined,
        lon: formData.get("departureLon") ? Number(formData.get("departureLon")) : undefined,
      },
      destination: {
        text: formData.get("destinationText") as string,
        lat: formData.get("destinationLat") ? Number(formData.get("destinationLat")) : undefined,
        lon: formData.get("destinationLon") ? Number(formData.get("destinationLon")) : undefined,
      },
      distanceKm: formData.get("distanceKm") ? Number(formData.get("distanceKm")) : null,
      calculationMethod: formData.get("calculationMethod") || undefined,
      description: formData.get("description") || undefined,
      alternativeRoute: formData.get("alternativeRoute") || undefined,
      privateDetourKm: formData.get("privateDetourKm") ? Number(formData.get("privateDetourKm")) : null,
      linkedTripId: formData.get("linkedTripId") || undefined,
      tripDirection: formData.get("tripDirection") || undefined,
    };

    // Validate input
    const validated = createRegistrationSchema.parse(rawData);

    // Calculate distance from odometer if not provided
    let calculatedDistance = validated.distanceKm;
    let calculationMethod = validated.calculationMethod;

    if (!calculatedDistance && validated.endOdometerKm) {
      calculatedDistance = validated.endOdometerKm - validated.startOdometerKm;
      calculationMethod = "odometer";
    }

    // Update registration
    await db
      .update(schema.registrations)
      .set({
        vehicleId: validated.vehicleId,
        data: {
          timestamp: validated.timestamp.getTime(),
          startOdometerKm: validated.startOdometerKm,
          endOdometerKm: validated.endOdometerKm || undefined,
          tripType: validated.tripType,
          departure: validated.departure,
          destination: validated.destination,
          distanceKm: calculatedDistance || undefined,
          calculationMethod: calculationMethod as any,
          description: validated.description,
          alternativeRoute: validated.alternativeRoute,
          privateDetourKm: validated.privateDetourKm || undefined,
          linkedTripId: validated.linkedTripId,
          tripDirection: validated.tripDirection,
        },
      })
      .where(eq(schema.registrations.id, registrationId));

    revalidatePath("/registraties");
    return { success: true };
  } catch (error) {
    console.error("Update registration error:", error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Kon registratie niet bijwerken" };
  }
}

/**
 * Get meterstand (odometer-only) entries report
 * Filters for entries created via /registraties/meterstand
 */
export async function getMeterstandReport(options?: {
  startDate?: Date;
  endDate?: Date;
  vehicleId?: string;
  tripType?: string;
}) {
  try {
    const session = await requireAuth();

    // Fetch all user registrations with vehicles
    const registrations = await db.query.registrations.findMany({
      where: eq(schema.registrations.userId, session.userId!),
      orderBy: [desc(schema.registrations.createdAt)],
      with: {
        vehicle: true,
      },
    });

    // Filter for odometer-only entries (created via meterstand page)
    const startTimestamp = options?.startDate ? options.startDate.getTime() : 0;
    const endTimestamp = options?.endDate ? options.endDate.getTime() : Date.now() + 86400000;

    const meterstandEntries = registrations.filter((reg) => {
      const data = reg.data as any;
      const timestamp = data.timestamp;

      // Only include odometer-only entries
      const isMeterstandEntry =
        data.departure?.text === "Kilometerstand registratie" &&
        data.destination?.text === "Kilometerstand registratie";

      if (!isMeterstandEntry) {
        return false;
      }

      // Date filter
      if (timestamp < startTimestamp || timestamp > endTimestamp) {
        return false;
      }

      // Vehicle filter
      if (options?.vehicleId && reg.vehicleId !== options.vehicleId) {
        return false;
      }

      // Trip type filter
      if (options?.tripType && options.tripType !== "all" && data.tripType !== options.tripType) {
        return false;
      }

      return true;
    });

    // Calculate statistics
    const stats = {
      totalReadings: meterstandEntries.length,
      vehicleStats: {} as Record<string, {
        count: number;
        firstReading?: number;
        lastReading?: number;
        totalDistance?: number;
      }>,
      periodStart: options?.startDate,
      periodEnd: options?.endDate,
    };

    // Group by vehicle and calculate stats
    meterstandEntries.forEach((reg) => {
      const data = reg.data as any;
      const vehicleId = reg.vehicleId;
      const odometer = data.startOdometerKm;

      if (!stats.vehicleStats[vehicleId]) {
        stats.vehicleStats[vehicleId] = {
          count: 0,
        };
      }

      stats.vehicleStats[vehicleId].count++;

      if (odometer) {
        if (!stats.vehicleStats[vehicleId].firstReading || odometer < stats.vehicleStats[vehicleId].firstReading!) {
          stats.vehicleStats[vehicleId].firstReading = odometer;
        }
        if (!stats.vehicleStats[vehicleId].lastReading || odometer > stats.vehicleStats[vehicleId].lastReading!) {
          stats.vehicleStats[vehicleId].lastReading = odometer;
        }

        // Calculate total distance for this vehicle in period
        if (stats.vehicleStats[vehicleId].firstReading && stats.vehicleStats[vehicleId].lastReading) {
          stats.vehicleStats[vehicleId].totalDistance =
            stats.vehicleStats[vehicleId].lastReading! - stats.vehicleStats[vehicleId].firstReading!;
        }
      }
    });

    // Enrich data for display
    const enrichedData = meterstandEntries.map((reg) => {
      const data = reg.data as any;
      return {
        ...reg,
        parsedData: data,
        odometer: data.startOdometerKm,
      };
    });

    return {
      success: true,
      data: enrichedData,
      stats,
    };
  } catch (error) {
    console.error("Get meterstand report error:", error);
    return { success: false, error: "Kon meterstandrapport niet ophalen" };
  }
}
