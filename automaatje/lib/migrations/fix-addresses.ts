"use server";

import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { formatDutchAddress, type AddressComponents } from "@/lib/utils";

/**
 * Parse verbose Nominatim-style address into structured components
 * Example: "39, Houtwal, Zeewolde, Flevoland, Nederland, 3892 CW, Nederland"
 * Returns: { road: "Houtwal", houseNumber: "39", city: "Zeewolde", postcode: "3892CW", country: "Nederland" }
 */
function parseVerboseAddress(address: string): AddressComponents | null {
  if (!address) return null;

  // Split by comma and clean up parts
  const parts = address.split(',').map(p => p.trim()).filter(Boolean);

  if (parts.length === 0) return null;

  // Patterns
  const numberPattern = /^\d+[a-zA-Z]?(-\d+[a-zA-Z]?)?$/;
  const postcodePattern = /^\d{4}\s?[A-Z]{2}$/i;

  // Dutch provinces to filter out
  const dutchProvinces = new Set([
    'flevoland', 'noord-holland', 'zuid-holland', 'noord-brabant',
    'gelderland', 'utrecht', 'limburg', 'friesland', 'groningen',
    'drenthe', 'overijssel', 'zeeland'
  ]);

  let houseNumber = '';
  let street = '';
  let city = '';
  let postcode = '';
  let country = '';

  // Remove duplicate country at the end if present
  if (parts.length >= 2 && parts[parts.length - 1] === parts[parts.length - 3]) {
    parts.pop();
  }

  for (const part of parts) {
    const lowerPart = part.toLowerCase();

    if (numberPattern.test(part) && !houseNumber) {
      houseNumber = part;
    } else if (postcodePattern.test(part) && !postcode) {
      postcode = part.replace(/\s+/g, ''); // Remove spaces
    } else if (!street && houseNumber) {
      // Street name usually comes after house number in verbose format
      street = part;
    } else if (!city && street && !dutchProvinces.has(lowerPart)) {
      // City comes after street, but skip provinces
      city = part;
    } else if (!dutchProvinces.has(lowerPart) &&
               lowerPart !== 'nederland' &&
               lowerPart !== 'netherlands' &&
               !postcodePattern.test(part) &&
               !numberPattern.test(part)) {
      // Anything else that's not a province or Netherlands
      if (!country) {
        country = part;
      }
    }
  }

  // If we couldn't parse it properly, return null
  if (!street && !city && !postcode) {
    return null;
  }

  return {
    road: street || undefined,
    houseNumber: houseNumber || undefined,
    city: city || undefined,
    postcode: postcode || undefined,
    country: country || undefined,
  };
}

/**
 * Fix all broken addresses in the database
 * This includes:
 * - User home addresses
 * - Favorite locations
 * - Registration destinations
 */
export async function fixBrokenAddresses(): Promise<{
  success: boolean;
  fixed: {
    users: number;
    favorites: number;
    registrations: number;
  };
  error?: string;
}> {
  try {
    let fixedUsers = 0;
    let fixedFavorites = 0;
    let fixedRegistrations = 0;

    // 1. Fix user home addresses
    const users = await db.select().from(schema.users);

    for (const user of users) {
      const profile = user.profile && typeof user.profile === 'object' ? user.profile : null;
      if (!profile || typeof profile !== 'object' || !('location' in profile)) continue;

      const location = profile.location as { text?: string; lat?: number; lon?: number; country?: string } | undefined;
      if (!location?.text) continue;

      // Check if this looks like a verbose Nominatim address (contains multiple commas)
      if (location.text.split(',').length > 2) {
        const parsed = parseVerboseAddress(location.text);
        if (parsed) {
          const formatted = formatDutchAddress(parsed);
          if (formatted && formatted !== location.text) {
            // Update the address
            const updatedProfile = {
              ...profile,
              location: {
                text: formatted,
                lat: location.lat,
                lon: location.lon,
                country: parsed.country || location.country,
              },
            };

            await db
              .update(schema.users)
              .set({
                profile: updatedProfile,
                updatedAt: new Date(),
              })
              .where(eq(schema.users.id, user.id));

            fixedUsers++;
          }
        }
      }
    }

    // 2. Fix favorite locations
    const favoriteSettings = await db
      .select()
      .from(schema.settings)
      .where(eq(schema.settings.key, 'favorite_locations'))
      .limit(1);

    if (favoriteSettings.length > 0) {
      const config = favoriteSettings[0].value as { locations: Array<{ id: string; text: string; lat?: number; lon?: number }> };
      if (config.locations && Array.isArray(config.locations)) {
        let updated = false;

        const updatedLocations = config.locations.map(loc => {
          if (loc.text && loc.text.split(',').length > 2) {
            const parsed = parseVerboseAddress(loc.text);
            if (parsed) {
              const formatted = formatDutchAddress(parsed);
              if (formatted && formatted !== loc.text) {
                fixedFavorites++;
                updated = true;
                return { ...loc, text: formatted };
              }
            }
          }
          return loc;
        });

        if (updated) {
          await db
            .update(schema.settings)
            .set({
              value: { locations: updatedLocations },
              updatedAt: new Date(),
            })
            .where(eq(schema.settings.key, 'favorite_locations'));
        }
      }
    }

    // 3. Fix registration destinations
    const registrations = await db.select().from(schema.registrations);

    for (const reg of registrations) {
      const data = reg.data as {
        destination?: {
          text?: string;
          lat?: number;
          lon?: number;
        };
      };

      if (!data.destination?.text) continue;

      // Check if this looks like a verbose Nominatim address
      if (data.destination.text.split(',').length > 2) {
        const parsed = parseVerboseAddress(data.destination.text);
        if (parsed) {
          const formatted = formatDutchAddress(parsed);
          if (formatted && formatted !== data.destination.text) {
            // Update the registration data
            const updatedData = {
              ...data,
              destination: {
                ...data.destination,
                text: formatted,
              },
            };

            await db
              .update(schema.registrations)
              .set({
                data: updatedData as typeof reg.data,
                updatedAt: new Date(),
              })
              .where(eq(schema.registrations.id, reg.id));

            fixedRegistrations++;
          }
        }
      }
    }

    return {
      success: true,
      fixed: {
        users: fixedUsers,
        favorites: fixedFavorites,
        registrations: fixedRegistrations,
      },
    };
  } catch (error) {
    console.error('Error fixing broken addresses:', error);
    return {
      success: false,
      fixed: {
        users: 0,
        favorites: 0,
        registrations: 0,
      },
      error: error instanceof Error ? error.message : 'Onbekende fout',
    };
  }
}
