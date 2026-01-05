"use server";

import { eq, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { getCurrentUser } from "@/lib/actions/auth";
import { isMeterstandEntry } from "@/lib/utils/registration-types";
import { z } from "zod";

/**
 * Location type
 */
export type Location = {
  id: string;
  text: string;
  lat?: number;
  lon?: number;
  isFavorite?: boolean;
  addedAt?: number; // Unix timestamp
};

/**
 * Favorite locations configuration
 */
export type FavoriteLocationsConfig = {
  locations: Location[];
};

/**
 * Validation schema for location
 */
const locationSchema = z.object({
  text: z.string().min(1, "Locatie mag niet leeg zijn").max(200),
  lat: z.number().optional(),
  lon: z.number().optional(),
});

/**
 * Get user's home address from profile
 */
export async function getHomeAddress(): Promise<{
  success: boolean;
  data?: Location;
  error?: string;
}> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Niet geautoriseerd" };
    }

    const profile = user.profile && typeof user.profile === 'object' ? user.profile : {};
    const location = profile && typeof profile === 'object' && 'location' in profile
      ? profile.location as { text?: string; lat?: number; lon?: number }
      : undefined;

    if (!location?.text) {
      return { success: true, data: undefined };
    }

    return {
      success: true,
      data: {
        id: "home",
        text: location.text,
        lat: location.lat,
        lon: location.lon,
        isFavorite: true,
      },
    };
  } catch (error) {
    console.error("Error fetching home address:", error);
    return {
      success: false,
      error: "Fout bij ophalen van thuisadres",
    };
  }
}

/**
 * Update user's home address
 */
export async function updateHomeAddress(data: {
  text: string;
  lat?: number;
  lon?: number;
  country?: string;
}): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Niet geautoriseerd" };
    }

    // Validate input
    const validated = locationSchema.parse(data);

    // Update user profile
    const profile = user.profile && typeof user.profile === 'object' ? user.profile : { name: '' };
    const updatedProfile = {
      ...profile,
      name: 'name' in profile ? String(profile.name) : '',
      location: {
        text: validated.text,
        lat: validated.lat,
        lon: validated.lon,
        country: data.country, // Save country for address formatting
      },
    };

    await db
      .update(schema.users)
      .set({
        profile: updatedProfile,
        updatedAt: new Date(),
      })
      .where(eq(schema.users.id, user.id));

    return { success: true };
  } catch (error) {
    console.error("Error updating home address:", error);

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: "Ongeldige invoer: " + error.issues[0].message,
      };
    }

    return {
      success: false,
      error: "Fout bij opslaan van thuisadres",
    };
  }
}

/**
 * Get favorite locations (work locations) - User-specific
 */
export async function getFavoriteLocations(): Promise<{
  success: boolean;
  data?: Location[];
  error?: string;
}> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Niet geautoriseerd" };
    }

    const profile = user.profile && typeof user.profile === 'object' ? user.profile : {};
    const favoriteLocations = 'favoriteLocations' in profile
      ? (profile.favoriteLocations as Location[])
      : [];

    return {
      success: true,
      data: favoriteLocations || [],
    };
  } catch (error) {
    console.error("Error fetching favorite locations:", error);
    return {
      success: false,
      error: "Fout bij ophalen van voorkeurslocaties",
    };
  }
}

/**
 * Add a favorite location - User-specific
 */
export async function addFavoriteLocation(data: {
  text: string;
  lat?: number;
  lon?: number;
}): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Niet geautoriseerd" };
    }

    // Validate input
    const validated = locationSchema.parse(data);

    // Get current profile and favorites
    const profile = user.profile && typeof user.profile === 'object' ? user.profile : { name: '' };
    const favoriteLocations = 'favoriteLocations' in profile
      ? (profile.favoriteLocations as Location[])
      : [];

    // Check if location already exists
    const exists = favoriteLocations.some((loc) => loc.text === validated.text);
    if (exists) {
      return {
        success: false,
        error: "Deze locatie bestaat al in je voorkeurslocaties",
      };
    }

    // Add new location
    const newLocation: Location = {
      id: `fav-${Date.now()}`,
      text: validated.text,
      lat: validated.lat,
      lon: validated.lon,
      isFavorite: true,
      addedAt: Date.now(),
    };

    // Update user profile with new favorite
    const updatedProfile = {
      ...profile,
      name: 'name' in profile ? String(profile.name) : '',
      favoriteLocations: [...favoriteLocations, newLocation],
    } as any;

    await db
      .update(schema.users)
      .set({
        profile: updatedProfile,
        updatedAt: new Date(),
      })
      .where(eq(schema.users.id, user.id));

    return { success: true };
  } catch (error) {
    console.error("Error adding favorite location:", error);

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: "Ongeldige invoer: " + error.issues[0].message,
      };
    }

    return {
      success: false,
      error: "Fout bij toevoegen van voorkeurslocatie",
    };
  }
}

/**
 * Remove a favorite location - User-specific
 */
export async function removeFavoriteLocation(locationId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Niet geautoriseerd" };
    }

    // Get current profile and favorites
    const profile = user.profile && typeof user.profile === 'object' ? user.profile : { name: '' };
    const favoriteLocations = 'favoriteLocations' in profile
      ? (profile.favoriteLocations as Location[])
      : [];

    // Remove location by ID
    const filtered = favoriteLocations.filter((loc) => loc.id !== locationId);

    if (filtered.length === favoriteLocations.length) {
      return {
        success: false,
        error: "Locatie niet gevonden",
      };
    }

    // Update user profile
    const updatedProfile = {
      ...profile,
      name: 'name' in profile ? String(profile.name) : '',
      favoriteLocations: filtered,
    } as any;

    await db
      .update(schema.users)
      .set({
        profile: updatedProfile,
        updatedAt: new Date(),
      })
      .where(eq(schema.users.id, user.id));

    return { success: true };
  } catch (error) {
    console.error("Error removing favorite location:", error);
    return {
      success: false,
      error: "Fout bij verwijderen van voorkeurslocatie",
    };
  }
}

/**
 * Get previously used locations from registrations
 */
export async function getPreviouslyUsedLocations(): Promise<{
  success: boolean;
  data?: Location[];
  error?: string;
}> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Niet geautoriseerd" };
    }

    // Get all registrations with destinations
    const registrations = await db
      .select()
      .from(schema.registrations)
      .where(eq(schema.registrations.userId, user.id))
      .orderBy(sql`${schema.registrations.createdAt} DESC`);

    // Extract unique destinations
    const locationMap = new Map<string, Location>();

    for (const reg of registrations) {
      // Skip meterstand - not real locations
      if (isMeterstandEntry(reg)) {
        continue;
      }

      const data = reg.data as {
        destination?: {
          text?: string;
          lat?: number;
          lon?: number;
        };
        timestamp?: number;
      };

      if (data.destination?.text) {
        const key = data.destination.text.toLowerCase().trim();

        // Only add if not already in map (keeps the most recent)
        if (!locationMap.has(key)) {
          locationMap.set(key, {
            id: `prev-${key}`,
            text: data.destination.text,
            lat: data.destination.lat,
            lon: data.destination.lon,
            isFavorite: false,
            addedAt: data.timestamp || reg.createdAt.getTime(),
          });
        }
      }
    }

    // Convert to array and sort by date (most recent first)
    const locations = Array.from(locationMap.values()).sort(
      (a, b) => (b.addedAt || 0) - (a.addedAt || 0)
    );

    return {
      success: true,
      data: locations,
    };
  } catch (error) {
    console.error("Error fetching previously used locations:", error);
    return {
      success: false,
      error: "Fout bij ophalen van eerder gebruikte locaties",
    };
  }
}

/**
 * Move a previously used location to favorites
 */
export async function moveToFavorites(locationText: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Niet geautoriseerd" };
    }

    // Find the location in previously used
    const prevResult = await getPreviouslyUsedLocations();
    if (!prevResult.success || !prevResult.data) {
      return { success: false, error: "Locatie niet gevonden" };
    }

    const location = prevResult.data.find(
      (loc) => loc.text.toLowerCase().trim() === locationText.toLowerCase().trim()
    );

    if (!location) {
      return { success: false, error: "Locatie niet gevonden" };
    }

    // Add to favorites
    return await addFavoriteLocation({
      text: location.text,
      lat: location.lat,
      lon: location.lon,
    });
  } catch (error) {
    console.error("Error moving to favorites:", error);
    return {
      success: false,
      error: "Fout bij toevoegen aan voorkeurslocaties",
    };
  }
}
