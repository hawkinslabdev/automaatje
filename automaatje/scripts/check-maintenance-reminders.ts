#!/usr/bin/env tsx

/**
 * Check for vehicles due for maintenance
 * Run daily via cron: 0 8 * * * (8 AM daily)
 *
 * Checks vehicles with maintenance configuration
 * Notifies when within threshold km of maintenance interval
 */

import { db } from "@/lib/db/standalone";
import { vehicles, registrations, notifications } from "@/lib/db/schema";
import { enqueueJob } from "@/lib/jobs/standalone";
import { eq, and, desc, sql } from "drizzle-orm";

/**
 * Check for vehicles due for maintenance and send reminders
 */
export async function checkMaintenanceReminders() {
  console.log("🔧 Checking for maintenance reminders...");

  const allVehicles = await db.query.vehicles.findMany({
    with: {
      user: true,
    },
  });

  // Filter enabled vehicles
  const enabledVehicles = allVehicles.filter((v) => {
    const details = v.details as any;
    return details.isEnabled === true;
  });

  if (enabledVehicles.length === 0) {
    console.log(" No enabled vehicles found");
    return [];
  }

  console.log(`🚗 Checking ${enabledVehicles.length} enabled vehicles`);

  const remindersSent: string[] = [];

  for (const vehicle of enabledVehicles) {
    try {
      const details = vehicle.details as any;
      const maintenanceConfig = details.maintenanceConfig;

      if (!maintenanceConfig) {
        continue; // No maintenance configured
      }

      // Get latest odometer reading for this vehicle
      const latestTrips = await db.query.registrations.findMany({
        where: eq(registrations.vehicleId, vehicle.id),
        orderBy: [desc(registrations.createdAt)],
        limit: 10,
      });

      if (latestTrips.length === 0) {
        continue; // No trips recorded
      }

      // Find most recent odometer reading
      let currentOdometer: number | null = null;
      for (const trip of latestTrips) {
        const data = trip.data as any;
        const odometer = data.endOdometerKm || data.startOdometerKm;
        if (odometer) {
          currentOdometer = odometer;
          break;
        }
      }

      if (!currentOdometer) {
        continue; // No odometer data
      }

      const lastMaintenanceOdometer = maintenanceConfig.lastMaintenanceOdometer || 0;
      const maintenanceIntervalKm = maintenanceConfig.intervalKm || 15000; // Default 15k km

      // Calculate km since last maintenance
      const kmSinceLastMaintenance = currentOdometer - lastMaintenanceOdometer;
      const kmUntilMaintenance = maintenanceIntervalKm - kmSinceLastMaintenance;

      // Notify when within 1000 km of maintenance (or overdue)
      const threshold = 1000;
      if (kmUntilMaintenance <= threshold) {
        // Check if already notified for this maintenance cycle
        const existingNotifications = await db.query.notifications.findMany({
          where: and(
            eq(notifications.userId, vehicle.userId),
            eq(notifications.isArchived, false)
          ),
        });

        let alreadyNotified = false;
        for (const notif of existingNotifications) {
          const notifData = notif.data as any;
          if (
            notifData.type === "maintenance_reminder" &&
            notifData.relatedVehicleId === vehicle.id
          ) {
            alreadyNotified = true;
            break;
          }
        }

        if (alreadyNotified) {
          console.log(`⏭️  Already notified for vehicle ${vehicle.id}`);
          continue;
        }

        // Determine urgency
        const isOverdue = kmUntilMaintenance <= 0;
        const priority = isOverdue ? "urgent" : kmUntilMaintenance <= 500 ? "high" : "normal";

        const vehicleName =
          details.make && details.model
            ? `${details.make} ${details.model}`
            : vehicle.licensePlate;

        let message: string;
        if (isOverdue) {
          const kmOverdue = Math.abs(kmUntilMaintenance);
          message = `Je ${vehicleName} is ${kmOverdue} km over de onderhoudsgrens! Plan onderhoud in.`;
        } else {
          message = `Je ${vehicleName} heeft binnen ${kmUntilMaintenance} km onderhoud nodig.`;
        }

        // Enqueue notification job
        await enqueueJob("notification", {
          userId: vehicle.userId,
          notificationData: {
            type: "maintenance_reminder",
            title: isOverdue ? "Onderhoud achterstallig!" : "Onderhoud binnenkort nodig",
            message,
            priority,
            icon: "Wrench",
            color: isOverdue ? "red" : "blue",
            action: {
              label: "Onderhoud plannen",
              url: `/garage`,
            },
            relatedVehicleId: vehicle.id,
            maintenanceInfo: {
              currentOdometer,
              lastMaintenanceOdometer,
              intervalKm: maintenanceIntervalKm,
              kmUntilMaintenance,
              isOverdue,
            },
          },
        });

        remindersSent.push(vehicle.id);
        console.log(
          `Maintenance reminder enqueued for vehicle ${vehicle.id} (${kmUntilMaintenance} km remaining)`
        );
      }
    } catch (error) {
      console.error(`Error checking vehicle ${vehicle.id}:`, error);
    }
  }

  console.log(
    `Maintenance check complete. Sent ${remindersSent.length} reminder(s).`
  );
  return remindersSent;
}

// Run if called directly
if (require.main === module) {
  checkMaintenanceReminders()
    .then((results) => {
      console.log(`\n📊 Summary: ${results.length} reminder(s) sent`);
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Error:", error);
      process.exit(1);
    });
}
