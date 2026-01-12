#!/usr/bin/env tsx

/**
 * Check for incomplete trips and send notifications
 * Run daily via cron: 0 9 * * * (9 AM daily)
 *
 * Finds trips without destination or distance created >24h ago
 * Groups by user and sends a single notification per user
 */

import { db } from "@/lib/db/standalone";
import { registrations, notifications, users } from "@/lib/db/schema";
import { enqueueJob } from "@/lib/jobs/standalone";
import { eq, and, isNull, lt, or, sql } from "drizzle-orm";

/**
 * Check for incomplete trips and send notifications
 */
export async function checkIncompleteTrips() {
  console.log("🔍 Checking for incomplete trips...");

  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  let skippedAutoCalculate = 0;

  // Find all registrations with vehicles
  const allRegistrations = await db.query.registrations.findMany({
    with: {
      vehicle: true,
    },
  });

  // Filter for incomplete trips (missing end odometer) created >24h ago
  const incompleteTrips = allRegistrations.filter((reg) => {
    const data = reg.data as any;

    // Skip meterstand entries - they don't need completion
    if (
      data.departure?.text === "Kilometerstand registratie" &&
      data.destination?.text === "Kilometerstand registratie"
    ) {
      return false;
    }

    // Skip auto-calculated trips - system handles odometer automatically
    // (This allows users to switch from manual to auto-calculate without losing
    // track of old manual trips that still need completion)
    if (data.odometerCalculated === true) {
      skippedAutoCalculate++;
      return false;
    }

    // Check if trip is incomplete (no end odometer or explicitly marked incomplete)
    const isIncomplete = !data.endOdometerKm || data.isIncomplete === true;
    if (!isIncomplete) return false;

    // Check if created more than 24h ago
    const createdAt = reg.createdAt || new Date(data.timestamp);
    if (createdAt > oneDayAgo) return false;

    return true;
  });

  if (skippedAutoCalculate > 0) {
    console.log(`⏭Skipped ${skippedAutoCalculate} auto-calculated trips`);
  }

  if (incompleteTrips.length === 0) {
    console.log("✓ No incomplete manual trips found");
    return [];
  }

  console.log(`Found ${incompleteTrips.length} incomplete manual trips`);

  // Group by user
  const tripsByUser = incompleteTrips.reduce((acc, trip) => {
    if (!acc[trip.userId]) {
      acc[trip.userId] = [];
    }
    acc[trip.userId].push(trip);
    return acc;
  }, {} as Record<string, typeof incompleteTrips>);

  const notificationsSent: string[] = [];

  // Send notification to each user with incomplete trips
  for (const [userId, trips] of Object.entries(tripsByUser)) {
    try {
      // Check if we already sent a notification for these trips
      // We'll check if there's an active notification (not archived) for incomplete trips
      const existingNotifications = await db.query.notifications.findMany({
        where: and(
          eq(notifications.userId, userId),
          eq(notifications.isArchived, false)
        ),
      });

      // Check if any existing notification covers these trips
      let alreadyNotified = false;
      for (const notif of existingNotifications) {
        const data = notif.data as any;
        if (data.type === "incomplete_trip") {
          const notifiedTripIds = data.incompleteTripIds || [data.relatedRegistrationId];
          // If all our incomplete trips are already in a notification, skip
          const allTripsNotified = trips.every((trip) =>
            notifiedTripIds.includes(trip.id)
          );
          if (allTripsNotified) {
            alreadyNotified = true;
            break;
          }
        }
      }

      if (alreadyNotified) {
        console.log(`User ${userId} already notified about these trips`);
        continue;
      }

      const tripCount = trips.length;
      const tripIds = trips.map((t) => t.id);

      // Build URL with trip IDs to auto-open completion dialog(s)
      const completionUrl = tripCount === 1
        ? `/registraties/overzicht?complete=${tripIds[0]}`
        : `/registraties/overzicht?incomplete=true`;

      // Enqueue notification job
      await enqueueJob("notification", {
        userId,
        notificationData: {
          type: "incomplete_trip",
          title: "Onvolledige ritten",
          message:
            tripCount === 1
              ? "Je hebt 1 rit zonder eindstand. Vul deze aan voor correcte kilometerregistratie."
              : `Je hebt ${tripCount} ritten zonder eindstand. Vul deze aan voor correcte kilometerregistratie.`,
          priority: "high",
          icon: "AlertTriangle",
          color: "orange",
          action: {
            label: tripCount === 1 ? "Rit voltooien" : "Ritten aanvullen",
            url: completionUrl,
          },
          relatedRegistrationId: tripIds[0], // First trip ID for reference
          incompleteTripIds: tripIds, // Track all incomplete trip IDs
        },
      });

      notificationsSent.push(userId);
      console.log(`Notification enqueued for user ${userId} (${tripCount} trips)`);
    } catch (error) {
      console.error(`Error notifying user ${userId}:`, error);
    }
  }

  console.log(
    `Incomplete trip check complete. Sent ${notificationsSent.length} notifications.`
  );
  return notificationsSent;
}

// Run if called directly
if (require.main === module) {
  checkIncompleteTrips()
    .then((results) => {
      console.log(`\n📊 Summary: ${results.length} notification(s) sent`);
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Error:", error);
      process.exit(1);
    });
}
