import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const kenteken = searchParams.get('kenteken');

    if (!kenteken) {
      return NextResponse.json(
        { error: "Kenteken is verplicht" },
        { status: 400 }
      );
    }

    // RDW Open Data API endpoint for vehicle data
    const rdwUrl = `https://opendata.rdw.nl/resource/m9d7-ebf2.json?kenteken=${kenteken.toUpperCase().replace(/-/g, '')}`;

    const response = await fetch(rdwUrl);

    if (!response.ok) {
      throw new Error('RDW API request failed');
    }

    const data = await response.json();

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: "Geen voertuiggegevens gevonden voor dit kenteken" },
        { status: 404 }
      );
    }

    const vehicle = data[0];

    // Extract year from date_first_registration (format: YYYYMMDD)
    let year: number | undefined;
    if (vehicle.datum_eerste_toelating) {
      const yearStr = vehicle.datum_eerste_toelating.toString().substring(0, 4);
      year = parseInt(yearStr);
    }

    return NextResponse.json({
      success: true,
      data: {
        make: vehicle.merk || undefined,
        model: vehicle.handelsbenaming || undefined,
        year: year,
      },
    });
  } catch (error) {
    console.error('RDW lookup error:', error);
    return NextResponse.json(
      { error: "Kon voertuiggegevens niet ophalen" },
      { status: 500 }
    );
  }
}
