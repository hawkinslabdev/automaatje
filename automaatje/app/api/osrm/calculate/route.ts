import { NextRequest, NextResponse } from "next/server";

/**
 * OSRM Distance Calculation API
 *
 * Calculates driving distance between two coordinates using OSRM
 *
 * Query parameters:
 * - fromLat: Departure latitude
 * - fromLon: Departure longitude
 * - toLat: Destination latitude
 * - toLon: Destination longitude
 */

interface OSRMRoute {
  distance: number; // meters
  duration: number; // seconds
  geometry?: string; // Polyline encoded geometry
}

interface OSRMResponse {
  code: string;
  routes: OSRMRoute[];
  waypoints?: Array<{
    location: [number, number]; // [lon, lat]
  }>;
}

const OSRM_BASE_URL = process.env.OSRM_BASE_URL || "https://router.project-osrm.org";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const fromLat = searchParams.get("fromLat");
    const fromLon = searchParams.get("fromLon");
    const toLat = searchParams.get("toLat");
    const toLon = searchParams.get("toLon");

    // Validate parameters
    if (!fromLat || !fromLon || !toLat || !toLon) {
      return NextResponse.json(
        { error: "Ontbrekende coördinaten (fromLat, fromLon, toLat, toLon vereist)" },
        { status: 400 }
      );
    }

    const fromLatNum = parseFloat(fromLat);
    const fromLonNum = parseFloat(fromLon);
    const toLatNum = parseFloat(toLat);
    const toLonNum = parseFloat(toLon);

    // Validate coordinate ranges
    if (
      isNaN(fromLatNum) ||
      isNaN(fromLonNum) ||
      isNaN(toLatNum) ||
      isNaN(toLonNum) ||
      fromLatNum < -90 ||
      fromLatNum > 90 ||
      toLatNum < -90 ||
      toLatNum > 90 ||
      fromLonNum < -180 ||
      fromLonNum > 180 ||
      toLonNum < -180 ||
      toLonNum > 180
    ) {
      return NextResponse.json(
        { error: "Ongeldige coördinaten" },
        { status: 400 }
      );
    }

    // Call OSRM API
    // Format: /route/v1/driving/{lon},{lat};{lon},{lat}
    // Request simplified geometry for route visualization
    const osrmUrl = `${OSRM_BASE_URL}/route/v1/driving/${fromLonNum},${fromLatNum};${toLonNum},${toLatNum}?overview=simplified&geometries=geojson`;

    const response = await fetch(osrmUrl, {
      headers: {
        "User-Agent": "Automaatje/1.0",
      },
      // Add timeout
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!response.ok) {
      console.error("OSRM API error:", response.status, response.statusText);
      return NextResponse.json(
        { error: "Kon route niet berekenen" },
        { status: 502 }
      );
    }

    const data: OSRMResponse = await response.json();

    if (data.code !== "Ok" || !data.routes || data.routes.length === 0) {
      return NextResponse.json(
        { error: "Geen route gevonden tussen de opgegeven locaties" },
        { status: 404 }
      );
    }

    const route = data.routes[0];
    const distanceKm = route.distance / 1000; // Convert meters to kilometers
    const durationMinutes = Math.round(route.duration / 60); // Convert seconds to minutes

    return NextResponse.json({
      success: true,
      data: {
        distanceKm: Math.round(distanceKm * 10) / 10, // Round to 1 decimal
        durationMinutes,
        method: "osrm",
        geometry: (route as any).geometry, // GeoJSON geometry for route visualization
        waypoints: data.waypoints?.map(wp => ({
          lon: wp.location[0],
          lat: wp.location[1],
        })),
      },
    });
  } catch (error) {
    console.error("OSRM calculation error:", error);

    // Handle timeout
    if (error instanceof Error && error.name === "AbortError") {
      return NextResponse.json(
        { error: "Time-out bij berekenen route. Probeer het opnieuw." },
        { status: 504 }
      );
    }

    return NextResponse.json(
      { error: "Er is een fout opgetreden bij het berekenen van de afstand" },
      { status: 500 }
    );
  }
}
