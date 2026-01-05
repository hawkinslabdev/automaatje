import { Document } from '@react-pdf/renderer';
import { SummaryPage } from '../components/summary-page';
import { createDetailedPages } from '../components/detailed-page';

interface Trip {
  date: Date;
  from: string;
  to: string;
  purpose: string;
  odometerStart: number;
  odometerEnd: number;
  distance: number;
  tripType: string;
}

export interface OdometerReportPDFProps {
  driverName: string;
  organizationName?: string;
  period: {
    start: Date;
    end: Date;
    label: string;
  };
  summary: {
    totalTrips: number;
    totalDistance: number;
    privateDistance: number;
    businessDistance: number;
  };
  trips: Trip[];
  vehicle?: {
    licensePlate: string;
    name?: string;
  };
  generatedDate: Date;
}

const TRIPS_PER_PAGE = 15;

export function OdometerReportPDF({
  driverName,
  organizationName,
  period,
  summary,
  trips,
  vehicle,
  generatedDate,
}: OdometerReportPDFProps) {
  // Calculate total pages
  // 1 page for summary + ceil(trips.length / TRIPS_PER_PAGE) for detailed pages
  const detailedPagesCount = Math.ceil(trips.length / TRIPS_PER_PAGE);
  const totalPages = 1 + (trips.length > 0 ? detailedPagesCount : 0);

  // Group trips by month for headers
  const tripsByMonth = new Map<string, Trip[]>();
  trips.forEach((trip) => {
    const monthKey = `${trip.date.getFullYear()}-${trip.date.getMonth()}`;
    if (!tripsByMonth.has(monthKey)) {
      tripsByMonth.set(monthKey, []);
    }
    tripsByMonth.get(monthKey)!.push(trip);
  });

  // Get month label from first trip (or use period)
  const monthLabel = trips.length > 0
    ? new Intl.DateTimeFormat('nl-NL', { month: 'long', year: 'numeric' }).format(trips[0].date)
    : new Intl.DateTimeFormat('nl-NL', { month: 'long', year: 'numeric' }).format(period.start);

  const detailedPages = trips.length > 0
    ? createDetailedPages(trips, period, monthLabel, 2, totalPages)
    : [];

  return (
    <Document>
      {/* Page 1: Summary */}
      <SummaryPage
        driverName={driverName}
        organizationName={organizationName}
        period={period}
        summary={summary}
        vehicle={vehicle}
        generatedDate={generatedDate}
        pageNumber={1}
        totalPages={totalPages}
      />

      {/* Page 2+: Detailed trips */}
      {detailedPages}
    </Document>
  );
}
