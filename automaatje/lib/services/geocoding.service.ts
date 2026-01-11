/**
 * Geocoding Service
 * Reverse geocoding using Nominatim (OpenStreetMap)
 * Converts GPS coordinates to human-readable addresses
 */

interface NominatimResponse {
  display_name: string;
  address: {
    road?: string;
    house_number?: string;
    suburb?: string;
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    county?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
}

export class GeocodingService {
  private baseUrl = process.env.NOMINATIM_BASE_URL || "https://nominatim.openstreetmap.org";
  private cache = new Map<string, string>();

  /**
   * Reverse geocode: coordinates → address
   * Met respect voor Nominatim rate limiting (max 1 request/second)
   */
  async reverseGeocode(lat: number, lon: number): Promise<string> {
    // Check cache eerst
    const cacheKey = `${lat.toFixed(6)},${lon.toFixed(6)}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    try {
      // Nominatim API call
      const params = new URLSearchParams({
        lat: lat.toString(),
        lon: lon.toString(),
        format: "json",
        addressdetails: "1",
        "accept-language": "nl",
      });

      const response = await fetch(`${this.baseUrl}/reverse?${params}`, {
        headers: {
          "User-Agent": "Automaatje/1.0", // Required by Nominatim
        },
      });

      if (!response.ok) {
        console.error("Geocoding failed:", response.status);
        return this.formatFallbackAddress(lat, lon);
      }

      const data: NominatimResponse = await response.json();

      // Format Nederlands adres
      const address = this.formatDutchAddress(data);

      // Cache result
      this.cache.set(cacheKey, address);

      // Respect rate limit: wait 1 second before next request
      await this.delay(1000);

      return address;
    } catch (error) {
      console.error("Reverse geocoding error:", error);
      return this.formatFallbackAddress(lat, lon);
    }
  }

  /**
   * Format Nederlands adres uit Nominatim data
   */
  private formatDutchAddress(data: NominatimResponse): string {
    const addr = data.address;

    // Straatnaam + huisnummer
    const street = addr.road
      ? `${addr.road}${addr.house_number ? " " + addr.house_number : ""}`
      : null;

    // Plaatsnaam (in volgorde van voorkeur)
    const city =
      addr.city ||
      addr.town ||
      addr.village ||
      addr.municipality ||
      addr.suburb;

    // Bouw adres
    const parts: string[] = [];

    if (street) {
      parts.push(street);
    }

    if (city) {
      if (addr.postcode) {
        parts.push(`${addr.postcode} ${city}`);
      } else {
        parts.push(city);
      }
    } else if (addr.county) {
      parts.push(addr.county);
    }

    return parts.length > 0 ? parts.join(", ") : data.display_name;
  }

  /**
   * Fallback adres als geocoding faalt
   */
  private formatFallbackAddress(lat: number, lon: number): string {
    return `GPS: ${lat.toFixed(6)}, ${lon.toFixed(6)}`;
  }

  /**
   * Delay helper voor rate limiting
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Clear cache (voor geheugen management)
   */
  clearCache(): void {
    this.cache.clear();
  }
}

// Singleton instance
export const geocodingService = new GeocodingService();
