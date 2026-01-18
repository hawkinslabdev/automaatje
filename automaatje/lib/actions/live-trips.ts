"use server";

import { eq, and, lt } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import type { LiveTrip } from "@/lib/db/schema";
import { geocodingService } from "@/lib/services/geocoding.service";
import type { GPSPoint } from "@/lib/services/gps-tracker.service";
import { getLatestOdometerForVehicle } from "@/lib/actions/registrations";

/**
 * Result type voor server actions
 */
type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Start een nieuwe live trip registratie
 */
export async function startLiveTrip(data: {
  carId: string;
  startLat: number;
  startLon: number;
}): Promise<ActionResult<LiveTrip>> {
  try {
    // Check authenticatie
    const session = await getSession();
    if (!session.userId) {
      return { success: false, error: "Niet ingelogd" };
    }
    const userId = session.userId; // Type narrowing

    // Valideer dat de auto bestaat en van de gebruiker is (of gedeeld)
    const vehicle = await db.query.vehicles.findFirst({
      where: eq(schema.vehicles.id, data.carId),
    });

    if (!vehicle) {
      return { success: false, error: "Voertuig niet gevonden" };
    }

    // Check of gebruiker toegang heeft tot dit voertuig
    if (vehicle.userId !== userId) {
      // Check of voertuig gedeeld is met deze gebruiker
      const share = await db.query.vehicleShares.findFirst({
        where: (shares, { and, eq }) =>
          and(
            eq(shares.vehicleId, data.carId),
            eq(shares.sharedWithUserId, userId)
          ),
      });

      if (!share) {
        return { success: false, error: "Geen toegang tot dit voertuig" };
      }
    }

    // Cleanup stale RECORDING trips (older than 2 hours)
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    await db
      .update(schema.liveTrips)
      .set({ status: "CANCELLED", updatedAt: new Date() })
      .where(
        and(
          eq(schema.liveTrips.userId, userId),
          eq(schema.liveTrips.status, "RECORDING"),
          lt(schema.liveTrips.startedAt, twoHoursAgo)
        )
      );

    // Check of er nog een actieve trip is (na cleanup)
    const existingTrip = await db.query.liveTrips.findFirst({
      where: (trips, { and, eq }) =>
        and(
          eq(trips.userId, userId),
          eq(trips.status, "RECORDING")
        ),
    });

    if (existingTrip) {
      return {
        success: false,
        error: "Er is al een actieve rit bezig. Stop eerst je huidige rit voordat je een nieuwe start."
      };
    }

    // Reverse geocode start address (async, don't wait)
    let startAddress: string | undefined;
    try {
      startAddress = await geocodingService.reverseGeocode(data.startLat, data.startLon);
    } catch (err) {
      console.error("Failed to geocode start address:", err);
      // Continue without address
    }

    // Maak nieuwe live trip
    const tripId = crypto.randomUUID();
    const now = new Date();

    await db.insert(schema.liveTrips).values({
      id: tripId,
      userId,
      vehicleId: data.carId,
      status: "RECORDING",
      startedAt: now,
      startLat: data.startLat,
      startLon: data.startLon,
      startAddress,
      createdAt: now,
      updatedAt: now,
    });

    // Haal de nieuwe trip op
    const newTrip = await db.query.liveTrips.findFirst({
      where: eq(schema.liveTrips.id, tripId),
    });

    if (!newTrip) {
      return { success: false, error: "Fout bij aanmaken rit" };
    }

    return { success: true, data: newTrip };
  } catch (error) {
    console.error("startLiveTrip error:", error);
    return { success: false, error: "Er is een fout opgetreden" };
  }
}

/**
 * Stop een actieve live trip
 */
export async function stopLiveTrip(data: {
  tripId: string;
  endLat: number;
  endLon: number;
  distanceKm: number;
  routeGeoJson: string;
}): Promise<ActionResult<{ registrationId: string }>> {
  try {
    // Check authenticatie
    const session = await getSession();
    if (!session.userId) {
      return { success: false, error: "Niet ingelogd" };
    }
    const userId = session.userId; // Type narrowing

    // Haal de trip op
    const trip = await db.query.liveTrips.findFirst({
      where: eq(schema.liveTrips.id, data.tripId),
    });

    if (!trip) {
      return { success: false, error: "Rit niet gevonden" };
    }

    // Check ownership
    if (trip.userId !== userId) {
      return { success: false, error: "Geen toegang tot deze rit" };
    }

    // Check status
    if (trip.status !== "RECORDING") {
      return { success: false, error: "Rit is niet actief" };
    }

    // Reverse geocode end address
    let endAddress: string | undefined;
    try {
      endAddress = await geocodingService.reverseGeocode(data.endLat, data.endLon);
    } catch (err) {
      console.error("Failed to geocode end address:", err);
      // Continue without address
    }

    // Bereken duur
    const endedAt = new Date();
    const durationSeconds = Math.floor(
      (endedAt.getTime() - new Date(trip.startedAt).getTime()) / 1000
    );

    // Update trip
    await db
      .update(schema.liveTrips)
      .set({
        status: "COMPLETED",
        endedAt,
        endLat: data.endLat,
        endLon: data.endLon,
        endAddress,
        distanceKm: data.distanceKm,
        durationSeconds,
        routeGeoJson: data.routeGeoJson,
        updatedAt: new Date(),
      })
      .where(eq(schema.liveTrips.id, data.tripId));

    // Bereken kilometerstand op basis van actuele kilometerstand
    // Gebruikt meest recente meterstand entry OF eindstand van vorige rit
    const startOdometerKm = (await getLatestOdometerForVehicle(trip.vehicleId, userId)) ?? 0;
    const endOdometerKm = startOdometerKm + data.distanceKm;

    // Maak direct een registratie aan met default waarden
    // Deze wordt later bijgewerkt tijdens classificatie
    const registrationId = crypto.randomUUID();
    const now = new Date();

    await db.insert(schema.registrations).values({
      id: registrationId,
      userId,
      vehicleId: trip.vehicleId,
      sourceTripId: trip.id,
      registrationType: "LIVE_TRACKING",
      data: {
        timestamp: new Date(trip.startedAt).getTime(),
        startOdometerKm,
        endOdometerKm,
        tripType: "zakelijk", // Default - wordt bijgewerkt tijdens classificatie
        departure: {
          text: trip.startAddress || "Onbekend",
          lat: trip.startLat,
          lon: trip.startLon,
          timestamp: new Date(trip.startedAt).getTime(),
        },
        destination: {
          text: endAddress || "Onbekend",
          lat: data.endLat,
          lon: data.endLon,
          timestamp: endedAt.getTime(),
        },
        distanceKm: data.distanceKm,
        calculationMethod: "osrm", // GPS-based tracking
        description: "", // Leeg - wordt bijgewerkt tijdens classificatie
      },
      createdAt: now,
      updatedAt: now,
    });

    return { success: true, data: { registrationId } };
  } catch (error) {
    console.error("stopLiveTrip error:", error);
    return { success: false, error: "Er is een fout opgetreden" };
  }
}

/**
 * Classificeer een voltooide live trip en converteer naar registratie
 */
export async function classifyLiveTrip(data: {
  tripId: string;
  tripType: "BUSINESS" | "PRIVATE" | "COMMUTE";
  notes?: string;
  privateDetourKm?: number;
}): Promise<ActionResult<{ registrationId: string }>> {
  try {
    // Check authenticatie
    const session = await getSession();
    if (!session.userId) {
      return { success: false, error: "Niet ingelogd" };
    }
    const userId = session.userId; // Type narrowing

    // Haal de trip op
    const trip = await db.query.liveTrips.findFirst({
      where: eq(schema.liveTrips.id, data.tripId),
    });

    if (!trip) {
      return { success: false, error: "Rit niet gevonden" };
    }

    // Check ownership
    if (trip.userId !== userId) {
      return { success: false, error: "Geen toegang tot deze rit" };
    }

    // Check status
    if (trip.status !== "COMPLETED") {
      return { success: false, error: "Rit is nog niet voltooid" };
    }

    // Check of trip al geclassificeerd is
    if (trip.tripType) {
      return { success: false, error: "Rit is al geclassificeerd" };
    }

    // Update trip met classificatie
    await db
      .update(schema.liveTrips)
      .set({
        tripType: data.tripType,
        notes: data.notes,
        privateDetourKm: data.privateDetourKm,
        updatedAt: new Date(),
      })
      .where(eq(schema.liveTrips.id, data.tripId));

    // Zoek bestaande registratie (aangemaakt tijdens stop)
    const existingRegistration = await db.query.registrations.findFirst({
      where: and(
        eq(schema.registrations.sourceTripId, data.tripId),
        eq(schema.registrations.userId, userId)
      ),
    });

    if (!existingRegistration) {
      return {
        success: false,
        error: "Geen registratie gevonden voor deze rit",
      };
    }

    // Map trip type naar Nederlandse termen
    let tripTypeNL: "zakelijk" | "privé" | "woon-werk";
    if (data.tripType === "BUSINESS") {
      tripTypeNL = "zakelijk";
    } else if (data.tripType === "COMMUTE") {
      tripTypeNL = "woon-werk";
    } else {
      tripTypeNL = "privé";
    }

    // Update bestaande registratie met classificatie
    await db
      .update(schema.registrations)
      .set({
        data: {
          ...existingRegistration.data,
          tripType: tripTypeNL,
          description: data.notes || "",
          privateDetourKm: data.privateDetourKm || undefined,
        },
        updatedAt: new Date(),
      })
      .where(eq(schema.registrations.id, existingRegistration.id));

    return { success: true, data: { registrationId: existingRegistration.id } };
  } catch (error) {
    console.error("classifyLiveTrip error:", error);
    return { success: false, error: "Er is een fout opgetreden" };
  }
}

/**
 * Annuleer een actieve live trip
 */
export async function cancelLiveTrip(tripId: string): Promise<ActionResult<void>> {
  try {
    // Check authenticatie
    const session = await getSession();
    if (!session.userId) {
      return { success: false, error: "Niet ingelogd" };
    }
    const userId = session.userId; // Type narrowing

    // Haal de trip op
    const trip = await db.query.liveTrips.findFirst({
      where: eq(schema.liveTrips.id, tripId),
    });

    if (!trip) {
      return { success: false, error: "Rit niet gevonden" };
    }

    // Check ownership
    if (trip.userId !== userId) {
      return { success: false, error: "Geen toegang tot deze rit" };
    }

    // Update status naar CANCELLED
    await db
      .update(schema.liveTrips)
      .set({
        status: "CANCELLED",
        updatedAt: new Date(),
      })
      .where(eq(schema.liveTrips.id, tripId));

    return { success: true, data: undefined };
  } catch (error) {
    console.error("cancelLiveTrip error:", error);
    return { success: false, error: "Er is een fout opgetreden" };
  }
}

/**
 * Haal een actieve live trip op voor de huidige gebruiker
 */
export async function getActiveLiveTrip(): Promise<ActionResult<LiveTrip | null>> {
  try {
    // Check authenticatie
    const session = await getSession();
    if (!session.userId) {
      return { success: false, error: "Niet ingelogd" };
    }
    const userId = session.userId; // Type narrowing

    // Zoek actieve trip
    const trip = await db.query.liveTrips.findFirst({
      where: (trips, { and, eq }) =>
        and(
          eq(trips.userId, userId),
          eq(trips.status, "RECORDING")
        ),
    });

    return { success: true, data: trip || null };
  } catch (error) {
    console.error("getActiveLiveTrip error:", error);
    return { success: false, error: "Er is een fout opgetreden" };
  }
}

/**
 * Haal een specifieke live trip op
 */
export async function getLiveTrip(tripId: string): Promise<ActionResult<LiveTrip>> {
  try {
    // Check authenticatie
    const session = await getSession();
    if (!session.userId) {
      return { success: false, error: "Niet ingelogd" };
    }
    const userId = session.userId; // Type narrowing

    // Haal de trip op
    const trip = await db.query.liveTrips.findFirst({
      where: eq(schema.liveTrips.id, tripId),
    });

    if (!trip) {
      return { success: false, error: "Rit niet gevonden" };
    }

    // Check ownership
    if (trip.userId !== userId) {
      return { success: false, error: "Geen toegang tot deze rit" };
    }

    return { success: true, data: trip };
  } catch (error) {
    console.error("getLiveTrip error:", error);
    return { success: false, error: "Er is een fout opgetreden" };
  }
}

/**
 * Save GPS points incrementally to database
 * Prevents data loss during navigation or crashes
 */
export async function saveGPSPoints(
  tripId: string,
  points: GPSPoint[]
): Promise<ActionResult<{ saved: number }>> {
  try {
    // Check authenticatie
    const session = await getSession();
    if (!session.userId) {
      return { success: false, error: "Niet ingelogd" };
    }
    const userId = session.userId;

    // Haal de trip op
    const trip = await db.query.liveTrips.findFirst({
      where: eq(schema.liveTrips.id, tripId),
    });

    if (!trip) {
      return { success: false, error: "Rit niet gevonden" };
    }

    // Check ownership
    if (trip.userId !== userId) {
      return { success: false, error: "Geen toegang tot deze rit" };
    }

    // Check status
    if (trip.status !== "RECORDING") {
      return { success: false, error: "Rit is niet actief" };
    }

    // Save points to DB
    if (points.length > 0) {
      const values = points.map((point) => ({
        id: crypto.randomUUID(),
        tripId,
        latitude: point.latitude,
        longitude: point.longitude,
        accuracy: point.accuracy,
        altitude: point.altitude,
        speed: point.speed,
        heading: point.heading,
        timestamp: point.timestamp,
        createdAt: new Date(),
      }));

      await db.insert(schema.gpsPoints).values(values);
    }

    return { success: true, data: { saved: points.length } };
  } catch (error) {
    console.error("saveGPSPoints error:", error);
    return { success: false, error: "Er is een fout opgetreden" };
  }
}

/**
 * Load GPS points from database for a trip
 * Used when resuming a trip to restore tracking history
 */
export async function loadGPSPoints(
  tripId: string
): Promise<ActionResult<GPSPoint[]>> {
  try {
    // Check authenticatie
    const session = await getSession();
    if (!session.userId) {
      return { success: false, error: "Niet ingelogd" };
    }
    const userId = session.userId;

    // Haal de trip op
    const trip = await db.query.liveTrips.findFirst({
      where: eq(schema.liveTrips.id, tripId),
    });

    if (!trip) {
      return { success: false, error: "Rit niet gevonden" };
    }

    // Check ownership
    if (trip.userId !== userId) {
      return { success: false, error: "Geen toegang tot deze rit" };
    }

    // Load points from DB
    const dbPoints = await db.query.gpsPoints.findMany({
      where: eq(schema.gpsPoints.tripId, tripId),
      orderBy: (gpsPoints, { asc }) => [asc(gpsPoints.timestamp)],
    });

    // Convert to GPSPoint format
    const points: GPSPoint[] = dbPoints.map((p) => ({
      latitude: p.latitude,
      longitude: p.longitude,
      accuracy: p.accuracy,
      altitude: p.altitude,
      speed: p.speed,
      heading: p.heading,
      timestamp: p.timestamp,
    }));

    return { success: true, data: points };
  } catch (error) {
    console.error("loadGPSPoints error:", error);
    return { success: false, error: "Er is een fout opgetreden" };
  }
}
