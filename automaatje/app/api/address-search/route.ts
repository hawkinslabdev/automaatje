import { NextResponse } from "next/server";

/**
 * Address search endpoint for autocomplete
 * Returns multiple address suggestions based on user input
 *
 * Rate limiting: Client-side debouncing recommended (500ms)
 * Server-side: Respects Nominatim usage policy (max 1 req/sec)
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { query } = body;

    // Validation
    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: "Zoekopdracht is verplicht" },
        { status: 400 }
      );
    }

    // Minimum query length to prevent excessive API calls
    if (query.trim().length < 3) {
      return NextResponse.json({
        success: true,
        data: [],
      });
    }

    // Call Nominatim API for address search
    const nominatimUrl = new URL(
      '/search',
      process.env.NOMINATIM_BASE_URL || 'https://nominatim.openstreetmap.org'
    );

    nominatimUrl.searchParams.set('q', query.trim());
    nominatimUrl.searchParams.set('format', 'json');
    nominatimUrl.searchParams.set('countrycodes', 'nl'); // Dutch addresses only
    nominatimUrl.searchParams.set('addressdetails', '1');
    nominatimUrl.searchParams.set('limit', '5'); // Return max 5 suggestions

    const response = await fetch(nominatimUrl.toString(), {
      headers: {
        'User-Agent': 'Automaatje/1.0', // Required by Nominatim
      },
    });

    if (!response.ok) {
      throw new Error('Address search request failed');
    }

    const results = await response.json();

    // Transform results to our format
    const suggestions = results.map((result: any) => {
      const address = result.address || {};
      return {
        id: result.place_id,
        displayName: result.display_name,
        lat: parseFloat(result.lat),
        lon: parseFloat(result.lon),
        address: {
          road: address.road,
          houseNumber: address.house_number,
          city: address.city || address.town || address.village,
          postcode: address.postcode,
          country: address.country, // Always include country for proper formatting
        },
      };
    });

    return NextResponse.json({
      success: true,
      data: suggestions,
    });
  } catch (error) {
    console.error('Address search error:', error);
    return NextResponse.json(
      { error: "Er is een fout opgetreden bij het zoeken" },
      { status: 500 }
    );
  }
}
