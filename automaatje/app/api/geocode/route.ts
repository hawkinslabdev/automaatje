import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { address } = body;

    if (!address || typeof address !== 'string') {
      return NextResponse.json(
        { error: "Adres is verplicht" },
        { status: 400 }
      );
    }

    // Call Nominatim API for geocoding
    const nominatimUrl = new URL(
      '/search',
      process.env.NOMINATIM_BASE_URL || 'https://nominatim.openstreetmap.org'
    );
    nominatimUrl.searchParams.set('q', address);
    nominatimUrl.searchParams.set('format', 'json');
    nominatimUrl.searchParams.set('countrycodes', 'nl'); // Dutch only
    nominatimUrl.searchParams.set('addressdetails', '1');
    nominatimUrl.searchParams.set('limit', '1');

    const response = await fetch(nominatimUrl.toString(), {
      headers: {
        'User-Agent': 'Automaatje/1.0', // Required by Nominatim
      },
    });

    if (!response.ok) {
      throw new Error('Geocoding request failed');
    }

    const results = await response.json();

    if (!results || results.length === 0) {
      return NextResponse.json(
        { error: "Adres niet gevonden. Probeer een andere locatie." },
        { status: 404 }
      );
    }

    const location = results[0];
    const locationAddress = location.address || {};

    return NextResponse.json({
      success: true,
      data: {
        lat: parseFloat(location.lat),
        lon: parseFloat(location.lon),
        displayName: location.display_name,
        address: {
          road: locationAddress.road,
          houseNumber: locationAddress.house_number,
          city: locationAddress.city || locationAddress.town || locationAddress.village,
          postcode: locationAddress.postcode,
          country: locationAddress.country,
        },
      },
    });
  } catch (error) {
    console.error('Geocoding error:', error);
    return NextResponse.json(
      { error: "Er is een fout opgetreden bij het geocoderen" },
      { status: 500 }
    );
  }
}
