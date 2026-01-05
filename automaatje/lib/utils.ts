import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Address components from geocoding APIs
 */
export interface AddressComponents {
  road?: string;
  houseNumber?: string;
  city?: string;
  postcode?: string;
  country?: string;
}

/**
 * Normalize country name for comparison
 * Handles common variations of country names
 */
function normalizeCountryName(country: string): string {
  const normalized = country.toLowerCase().trim();

  // Map common variations to canonical names
  const countryMap: Record<string, string> = {
    'nederland': 'netherlands',
    'the netherlands': 'netherlands',
    'holland': 'netherlands',
    'belgië': 'belgium',
    'belgique': 'belgium',
    'deutschland': 'germany',
    'france': 'france',
    'frankrijk': 'france',
  };

  return countryMap[normalized] || normalized;
}

/**
 * Format an address in clean, concise style
 * Examples:
 * - Same country as user: "Prinsengracht 12-12B, 1000AB Amsterdam"
 * - Different country: "Brusselweg 42B, 1212 Brussel, België"
 *
 * The country is only shown when it differs from the user's country.
 *
 * @param address - Structured address components
 * @param userCountry - The user's home country (optional, defaults to showing all countries)
 * @returns Formatted address string
 */
export function formatDutchAddress(
  address: AddressComponents,
  userCountry?: string
): string {
  const parts: string[] = [];

  // Part 1: Street and house number
  // Format: "Straatnaam HuisNummer"
  if (address.road && address.houseNumber) {
    parts.push(`${address.road} ${address.houseNumber}`);
  } else if (address.road) {
    parts.push(address.road);
  }

  // Part 2: Postcode and City
  // Format: "1234AB Amsterdam" or just "Amsterdam" if no postcode
  const cityParts: string[] = [];
  if (address.postcode) {
    // Remove spaces from postcode for clean format
    const postcode = address.postcode.replace(/\s+/g, '');
    cityParts.push(postcode);
  }
  if (address.city) {
    cityParts.push(address.city);
  }

  if (cityParts.length > 0) {
    parts.push(cityParts.join(' '));
  }

  // Part 3: Country (only shown when different from user's country)
  if (address.country && userCountry) {
    const normalizedAddressCountry = normalizeCountryName(address.country);
    const normalizedUserCountry = normalizeCountryName(userCountry);

    // Only show country if it's different from user's country
    if (normalizedAddressCountry !== normalizedUserCountry) {
      parts.push(address.country);
    }
  } else if (address.country && !userCountry) {
    // If no user country is provided, show country for all addresses
    parts.push(address.country);
  }

  return parts.join(', ');
}

/**
 * Format a number with Dutch locale formatting (comma as decimal separator)
 * @param value - Number to format
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted number string with comma as decimal separator
 */
export function formatDutchNumber(value: number, decimals: number = 1): string {
  return value.toLocaleString('nl-NL', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Parse a Dutch formatted number string (with comma) to a number
 * @param value - String with comma as decimal separator
 * @returns Parsed number
 */
export function parseDutchNumber(value: string): number {
  // Replace comma with dot for parsing
  const normalized = value.replace(',', '.');
  return parseFloat(normalized);
}

/**
 * Format a distance in kilometers with Dutch formatting
 * @param km - Distance in kilometers
 * @returns Formatted string like "125,5 km"
 */
export function formatDistance(km: number): string {
  return `${formatDutchNumber(km, 1)} km`;
}

/**
 * Format a duration in minutes to hours and minutes
 * @param minutes - Duration in minutes
 * @returns Formatted string like "2u 15min" or "45 min"
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}u ${mins}min` : `${hours}u`;
}

/**
 * Format a Dutch date and time
 * @param date - Date to format
 * @returns Formatted string like "18-12-2026 14:30"
 */
export function formatDutchDateTime(date: Date): string {
  return date.toLocaleString('nl-NL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format a Dutch date
 * @param date - Date to format
 * @returns Formatted string like "18-12-2026"
 */
export function formatDutchDate(date: Date): string {
  return date.toLocaleDateString('nl-NL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}
