#!/usr/bin/env tsx

/**
 * Check mileage compliance for all active vehicles
 * Run daily via cron: 0 7 * * * (7 AM daily)
 *
 * Analyzes trips for:
 * - Odometer gaps (unaccounted kilometers)
 * - Missing trips (long periods without registrations)
 * - Odometer rollbacks (decreasing odometer)
 * - Distance mismatches (trip distance vs odometer difference)
 */

import { db } from "@/lib/db/standalone";
import { registrations, vehicles, notifications } from "@/lib/db/schema";
import { enqueueJob } from "@/lib/jobs/standalone";
import { eq, asc } from "drizzle-orm";

interface DeviationReport {
  vehicleId: string;
  userId: string;
  deviations: Array<{
    type: "odometer_gap" | "missing_trips" | "distance_mismatch" | "unaccounted_km" | "odometer_rollback";
    severity: "low" | "medium" | "high";
    description: string;
    details: any;
  }>;
  totalUnaccountedKm: number;
  complianceScore: number; // 0-100
}

/**
 * Check mileage compliance for all active vehicles
 */
export async function checkMileageCompliance() {
  console.log("📊 Checking mileage compliance...");

  const allVehicles = await db.query.vehicles.findMany({
    with: {
      user: true,
    },
  });

  // Filter enabled vehicles
  const activeVehicles = allVehicles.filter((v) => {
    const details = v.details as any;
    return details.isEnabled === true;
  });

  if (activeVehicles.length === 0) {
    console.log(" No active vehicles found");
    return [];
  }

  console.log(`🚗 Analyzing ${activeVehicles.length} active vehicles`);

  const reports: DeviationReport[] = [];

  for (const vehicle of activeVehicles) {
    try {
      const report = await analyzeVehicleCompliance(vehicle.id, vehicle.userId);
      if (report.deviations.length > 0) {
        reports.push(report);
      }
    } catch (error) {
      console.error(`Error analyzing vehicle ${vehicle.id}:`, error);
    }
  }

  // Send notifications for significant deviations
  for (const report of reports) {
    if (report.complianceScore < 80 || report.totalUnaccountedKm > 100) {
      await sendComplianceNotification(report);
    }
  }

  console.log(
    `Compliance check complete. Found ${reports.length} vehicle(s) with deviations.`
  );
  return reports;
}

/**
 * Analyze a single vehicle for compliance deviations
 */
async function analyzeVehicleCompliance(
  vehicleId: string,
  userId: string
): Promise<DeviationReport> {
  const deviations: DeviationReport["deviations"] = [];

  // Get all registrations for this vehicle, ordered by timestamp
  const allTrips = await db.query.registrations.findMany({
    where: eq(registrations.vehicleId, vehicleId),
  });

  // Sort by timestamp (from data field)
  const trips = allTrips.sort((a, b) => {
    const aData = a.data as any;
    const bData = b.data as any;
    return aData.timestamp - bData.timestamp;
  });

  // Filter out meterstand entries - only analyze actual trips
  const actualTrips = trips.filter((trip) => {
    const data = trip.data as any;
    return !(
      data.departure?.text === "Kilometerstand registratie" &&
      data.destination?.text === "Kilometerstand registratie"
    );
  });

  if (actualTrips.length < 2) {
    return {
      vehicleId,
      userId,
      deviations: [],
      totalUnaccountedKm: 0,
      complianceScore: 100,
    };
  }

  let totalUnaccountedKm = 0;

  // Check each consecutive pair of trips
  for (let i = 0; i < actualTrips.length - 1; i++) {
    const currentTrip = actualTrips[i];
    const nextTrip = actualTrips[i + 1];

    const currentData = currentTrip.data as any;
    const nextData = nextTrip.data as any;

    // Get odometer readings
    const currentOdometer = currentData.endOdometerKm || currentData.startOdometerKm;
    const nextOdometer = nextData.startOdometerKm;

    if (!currentOdometer || !nextOdometer) {
      // Missing odometer data
      deviations.push({
        type: "distance_mismatch",
        severity: "medium",
        description: "Rit zonder kilometerstand",
        details: {
          tripId: currentData.endOdometerKm ? nextTrip.id : currentTrip.id,
          date: new Date(currentData.endOdometerKm ? nextData.timestamp : currentData.timestamp),
        },
      });
      continue;
    }

    // 1. Check for odometer rollback
    if (nextOdometer < currentOdometer) {
      deviations.push({
        type: "odometer_rollback",
        severity: "high",
        description: "Kilometerstand is lager dan vorige registratie",
        details: {
          tripId: nextTrip.id,
          date: new Date(nextData.timestamp),
          odometerBefore: currentOdometer,
          odometerAfter: nextOdometer,
          difference: currentOdometer - nextOdometer,
        },
      });
      continue; // Skip further checks for this pair
    }

    // 2. Check odometer gap
    const odometerDiff = nextOdometer - currentOdometer;
    const tripDistance = currentData.distanceKm || 0;
    const gap = odometerDiff - tripDistance;

    const TOLERANCE = 1; // Allow 1km tolerance for rounding
    if (gap > TOLERANCE) {
      const severity = gap > 50 ? "high" : gap > 20 ? "medium" : "low";
      deviations.push({
        type: "odometer_gap",
        severity,
        description: `${Math.round(gap)} km verschil tussen kilometerstand en geregistreerde afstand`,
        details: {
          tripId: currentTrip.id,
          date: new Date(currentData.timestamp),
          odometerBefore: currentOdometer,
          odometerAfter: nextOdometer,
          recordedDistance: tripDistance,
          gap: Math.round(gap),
        },
      });
      totalUnaccountedKm += gap;
    }

    // 3. Check for missing trips (long time gap + significant odometer change)
    const timeDiff = nextData.timestamp - currentData.timestamp;
    const daysDiff = timeDiff / (1000 * 60 * 60 * 24);

    if (daysDiff > 7 && odometerDiff > 100) {
      const severity = daysDiff > 30 ? "high" : "medium";
      deviations.push({
        type: "missing_trips",
        severity,
        description: `${Math.floor(daysDiff)} dagen zonder registraties, maar ${odometerDiff} km gereden`,
        details: {
          fromDate: new Date(currentData.timestamp),
          toDate: new Date(nextData.timestamp),
          daysDiff: Math.floor(daysDiff),
          kmDriven: odometerDiff,
        },
      });
    }

    // 4. Check if trip is incomplete (missing destination/distance)
    if (!currentData.endOdometerKm) {
      deviations.push({
        type: "distance_mismatch",
        severity: "medium",
        description: "Rit zonder eindstand",
        details: {
          tripId: currentTrip.id,
          date: new Date(currentData.timestamp),
          hasStartOdometer: !!currentData.startOdometerKm,
          hasEndOdometer: false,
        },
      });
    }
  }

  // Calculate compliance score (0-100)
  // Deduct points for deviations and unaccounted km
  const deviationPenalty = deviations.length * 5;
  const unaccountedPenalty = Math.min(50, totalUnaccountedKm / 10);
  const complianceScore = Math.max(0, 100 - deviationPenalty - unaccountedPenalty);

  return {
    vehicleId,
    userId,
    deviations,
    totalUnaccountedKm: Math.round(totalUnaccountedKm),
    complianceScore: Math.round(complianceScore),
  };
}

/**
 * Send compliance notification to user
 */
async function sendComplianceNotification(report: DeviationReport) {
  try {
    const vehicle = await db.query.vehicles.findFirst({
      where: eq(vehicles.id, report.vehicleId),
    });

    if (!vehicle) return;

    const details = vehicle.details as any;
    const vehicleName =
      details.make && details.model
        ? `${details.make} ${details.model}`
        : vehicle.licensePlate;

    const highSeverityCount = report.deviations.filter((d) => d.severity === "high").length;
    const mediumSeverityCount = report.deviations.filter((d) => d.severity === "medium").length;

    let message = "";
    if (report.totalUnaccountedKm > 0) {
      message += `Er zijn ${report.totalUnaccountedKm} km niet verantwoord. `;
    }
    if (highSeverityCount > 0) {
      message += `${highSeverityCount} ernstige afwijking(en) gevonden. `;
    }
    if (mediumSeverityCount > 0) {
      message += `${mediumSeverityCount} afwijking(en) gevonden. `;
    }
    message += "Controleer je kilometerregistratie voor Belastingdienst compliance.";

    const priority = report.complianceScore < 60 ? "urgent" : "high";

    await enqueueJob("notification", {
      userId: report.userId,
      notificationData: {
        type: "custom",
        title: `Afwijkingen in kilometerregistratie (${vehicleName})`,
        message,
        priority,
        icon: "AlertTriangle",
        color: "red",
        action: {
          label: "Bekijk rapport",
          url: `/rapporten/compliance?vehicleId=${report.vehicleId}`,
        },
        relatedVehicleId: report.vehicleId,
        complianceReport: report, // Attach full report for viewing
      },
    });

    console.log(
      `Compliance notification sent for vehicle ${report.vehicleId} (score: ${report.complianceScore})`
    );
  } catch (error) {
    console.error("Error sending compliance notification:", error);
  }
}

// Run if called directly
if (require.main === module) {
  checkMileageCompliance()
    .then((reports) => {
      console.log(`\n📊 Summary: ${reports.length} vehicle(s) with deviations`);
      reports.forEach((report) => {
        console.log(
          `  - Vehicle ${report.vehicleId}: ${report.deviations.length} deviations, ${report.totalUnaccountedKm} km unaccounted, score: ${report.complianceScore}/100`
        );
      });
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Error:", error);
      process.exit(1);
    });
}

// Export for use in compliance report page
export { analyzeVehicleCompliance };
