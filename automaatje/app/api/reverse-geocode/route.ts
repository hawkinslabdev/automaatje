import { NextResponse } from "next/server";
import { formatDutchAddress } from "@/lib/utils";

/**
 * Reverse geocode: Convert GPS coordinates to a Dutch address
 * POST /api/reverse-geocode
 * Body: { lat: number, lon: number }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { lat, lon } = body;

    // Validate coordinates
    if (typeof lat !== "number" || typeof lon !== "number") {
      return NextResponse.json(
        { success: false, error: "Ongeldige coördinaten" },
        { status: 400 }
      );
    }

    // Validate coordinate ranges
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      return NextResponse.json(
        { success: false, error: "Coördinaten buiten bereik" },
        { status: 400 }
      );
    }

    // Call Nominatim reverse geocoding API
    const nominatimUrl = new URL(
      '/reverse',
      process.env.NOMINATIM_BASE_URL || 'https://nominatim.openstreetmap.org'
    );
    nominatimUrl.searchParams.set("lat", lat.toString());
    nominatimUrl.searchParams.set("lon", lon.toString());
    nominatimUrl.searchParams.set("format", "json");
    nominatimUrl.searchParams.set("addressdetails", "1");
    nominatimUrl.searchParams.set("accept-language", "nl");

    const response = await fetch(nominatimUrl.toString(), {
      headers: {
        "User-Agent": "Automaatje/1.0 (github.com/hawkinslabdev/automaatje)",
      },
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!response.ok) {
      console.error("Nominatim API error:", response.status, response.statusText);
      return NextResponse.json(
        { success: false, error: "Locatie kon niet worden omgezet naar een adres" },
        { status: 500 }
      );
    }

    const data = await response.json();

    // Check if Nominatim returned an error
    if (data.error) {
      console.error("Nominatim error:", data.error);
      return NextResponse.json(
        { success: false, error: "Locatie kon niet worden omgezet naar een adres" },
        { status: 404 }
      );
    }

    // Extract address components
    const address = data.address || {};

    // Format the address using the same utility as address search
    const formattedAddress = formatDutchAddress(address);

    // Return formatted address with coordinates
    return NextResponse.json({
      success: true,
      data: {
        text: formattedAddress || data.display_name || `${lat.toFixed(6)}, ${lon.toFixed(6)}`,
        lat: parseFloat(data.lat) || lat,
        lon: parseFloat(data.lon) || lon,
        address: {
          road: address.road,
          houseNumber: address.house_number,
          city: address.city || address.town || address.village || address.municipality,
          postcode: address.postcode,
          country: address.country,
        },
      },
    });
  } catch (error) {
    console.error("Reverse geocode error:", error);

    if (error instanceof Error && error.name === "TimeoutError") {
      return NextResponse.json(
        { success: false, error: "Verzoek duurde te lang. Probeer het opnieuw." },
        { status: 504 }
      );
    }

    return NextResponse.json(
      { success: false, error: "Er is een fout opgetreden bij het ophalen van het adres" },
      { status: 500 }
    );
  }
}
