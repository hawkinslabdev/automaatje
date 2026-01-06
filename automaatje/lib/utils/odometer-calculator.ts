/**
 * Odometer Calculator - Auto-calculate trip odometer readings
 *
 * Uses linear interpolation between meterstand entries to estimate
 * start and end odometer readings for trips.
 */

import { db, schema } from "@/lib/db";
import { eq, and } from "drizzle-orm";

export interface MeterstandEntry {
  id: string;
  timestamp: number;
  odometerKm: number;
}

export interface TripWithCalculatedOdometer {
  startOdometerKm: number;
  endOdometerKm?: number;
  calculatedFrom: {
    previousMeterstand: MeterstandEntry;
    nextMeterstand?: MeterstandEntry;
  };
}

export interface OdometerCalculationError {
  code: "NO_PREVIOUS_READING" | "INVALID_TIMESTAMP" | "CALCULATION_ERROR";
  message: string;
}

/**
 * Get all meterstand entries for a vehicle, sorted by timestamp
 */
async function getMeterstandEntries(vehicleId: string): Promise<MeterstandEntry[]> {
  const registrations = await db.query.registrations.findMany({
    where: eq(schema.registrations.vehicleId, vehicleId),
  });

  // Filter to only meterstand entries
  const meterstandEntries = registrations
    .filter(reg => {
      const data = reg.data as any;
      return (
        data.type === "meterstand" ||
        (data.departure?.text === "Kilometerstand registratie" &&
         data.destination?.text === "Kilometerstand registratie")
      );
    })
    .map(reg => {
      const data = reg.data as any;
      return {
        id: reg.id,
        timestamp: data.timestamp,
        odometerKm: data.startOdometerKm,
      };
    })
    .sort((a, b) => a.timestamp - b.timestamp);

  return meterstandEntries;
}

/**
 * Find the meterstand entry immediately before a given timestamp
 */
function findPreviousReading(
  entries: MeterstandEntry[],
  timestamp: number
): MeterstandEntry | null {
  // Find the last entry before the trip timestamp
  const previousEntries = entries.filter(e => e.timestamp <= timestamp);

  if (previousEntries.length === 0) {
    return null;
  }

  return previousEntries[previousEntries.length - 1];
}

/**
 * Find the meterstand entry immediately after a given timestamp
 */
function findNextReading(
  entries: MeterstandEntry[],
  timestamp: number
): MeterstandEntry | null {
  // Find the first entry after the trip timestamp
  const nextEntries = entries.filter(e => e.timestamp > timestamp);

  if (nextEntries.length === 0) {
    return null;
  }

  return nextEntries[0];
}

/**
 * Calculate odometer readings for a trip using linear interpolation
 *
 * @param vehicleId - ID of the vehicle
 * @param tripTimestamp - Timestamp when the trip occurred
 * @param tripDistanceKm - Optional distance of the trip (for calculating end odometer)
 * @returns Calculated odometer readings or error
 */
export async function calculateOdometerForTrip(
  vehicleId: string,
  tripTimestamp: number,
  tripDistanceKm?: number
): Promise<TripWithCalculatedOdometer | OdometerCalculationError> {
  try {
    // 1. Get all meterstand entries for this vehicle
    const meterstandEntries = await getMeterstandEntries(vehicleId);

    // 2. Find the meterstand BEFORE and AFTER the trip
    const previousReading = findPreviousReading(meterstandEntries, tripTimestamp);
    const nextReading = findNextReading(meterstandEntries, tripTimestamp);

    // 4. Validation - must have at least a previous reading
    if (!previousReading) {
      return {
        code: "NO_PREVIOUS_READING",
        message: "Geen kilometerstand gevonden vóór deze rit. Voeg eerst een kilometerstand toe.",
      };
    }

    // 5. Calculate start odometer via linear interpolation
    let startOdometerKm: number;

    if (nextReading) {
      // We have both before and after readings - interpolate
      const totalKm = nextReading.odometerKm - previousReading.odometerKm;
      const totalTime = nextReading.timestamp - previousReading.timestamp;
      const timeElapsed = tripTimestamp - previousReading.timestamp;

      // Linear interpolation formula
      startOdometerKm = previousReading.odometerKm + (totalKm * (timeElapsed / totalTime));
    } else {
      // Only have previous reading - use it as baseline
      // This is conservative: assumes the trip starts at the last known reading
      startOdometerKm = previousReading.odometerKm;
    }

    // 6. Calculate end odometer (if distance is known)
    let endOdometerKm: number | undefined;
    if (tripDistanceKm && tripDistanceKm > 0) {
      endOdometerKm = startOdometerKm + tripDistanceKm;
    }

    // 7. Round to whole kilometers (like real odometer)
    return {
      startOdometerKm: Math.round(startOdometerKm),
      endOdometerKm: endOdometerKm ? Math.round(endOdometerKm) : undefined,
      calculatedFrom: {
        previousMeterstand: previousReading,
        nextMeterstand: nextReading || undefined,
      },
    };
  } catch (error) {
    console.error("Odometer calculation error:", error);
    return {
      code: "CALCULATION_ERROR",
      message: "Er is een fout opgetreden bij het berekenen van de kilometerstand.",
    };
  }
}

/**
 * Check if a result is an error
 */
export function isOdometerCalculationError(
  result: TripWithCalculatedOdometer | OdometerCalculationError
): result is OdometerCalculationError {
  return "code" in result && "message" in result;
}

/**
 * Get expected odometer reading at a specific timestamp
 * Useful for showing "expected reading" to users
 */
export async function getExpectedOdometerReading(
  vehicleId: string,
  timestamp: number
): Promise<number | null> {
  const result = await calculateOdometerForTrip(vehicleId, timestamp);

  if (isOdometerCalculationError(result)) {
    return null;
  }

  return result.startOdometerKm;
}
