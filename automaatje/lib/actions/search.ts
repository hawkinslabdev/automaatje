"use server";

import { eq, desc } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { requireAuth } from "@/lib/auth/session";
import { isMeterstandEntry } from "@/lib/utils/registration-types";
import type { SearchResult, SearchActionResult } from "@/lib/types/search";

/**
 * Search through trip registrations by departure, destination, and description
 * @param query - Search query string
 * @param limit - Maximum number of results to return (default: 10)
 * @returns SearchActionResult with matching registrations
 */
export async function searchRegistrations(
  query: string,
  limit: number = 10
): Promise<SearchActionResult> {
  try {
    const session = await requireAuth();

    // Return empty if query is too short
    if (!query || query.trim().length < 2) {
      return { success: true, data: [] };
    }

    // Fetch recent registrations (limit to 50 for performance)
    const registrations = await db.query.registrations.findMany({
      where: eq(schema.registrations.userId, session.userId!),
      orderBy: [desc(schema.registrations.createdAt)],
      limit: 50,
      with: {
        vehicle: true,
      },
    });

    // Client-side fuzzy filtering
    const lowercaseQuery = query.toLowerCase().trim();

    const filtered = registrations
      .filter((reg) => {
        // Skip meterstand entries - only show actual trips
        if (isMeterstandEntry(reg)) {
          return false;
        }

        const data = reg.data as any;

        // Search in departure, destination, description
        const searchableText = [
          data.departure?.text || "",
          data.destination?.text || "",
          data.description || "",
        ]
          .join(" ")
          .toLowerCase();

        return searchableText.includes(lowercaseQuery);
      })
      .slice(0, limit)
      .map((reg) => {
        const data = reg.data as any;
        const vehicleDetails = reg.vehicle.details as any;

        return {
          id: reg.id,
          departure: data.departure?.text || "",
          destination: data.destination?.text || "",
          description: data.description || "",
          timestamp: data.timestamp,
          distanceKm: data.distanceKm,
          tripType: data.tripType || "privé",
          vehicleId: reg.vehicleId,
          vehicleName: vehicleDetails.naamVoertuig || reg.vehicle.licensePlate,
        } as SearchResult;
      });

    return { success: true, data: filtered };
  } catch (error) {
    console.error("Search registrations error:", error);
    return { success: false, error: "Kon ritten niet doorzoeken" };
  }
}
