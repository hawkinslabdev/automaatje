import React from 'react';
import { Page, Text, View } from '@react-pdf/renderer';
import { commonStyles } from '../utils/pdf-styles';
import { formatPDFDateShort, formatPDFPeriodRange, formatPDFOdometer, formatPDFDistance, formatTripTypeLabel, formatPDFCurrency } from '../utils/pdf-helpers';

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

interface DetailedPageProps {
  period: {
    start: Date;
    end: Date;
    label: string;
  };
  trips: Trip[];
  monthLabel: string;
  pageNumber: number;
  totalPages: number;
}

const TRIPS_PER_PAGE = 15;

export function DetailedPage({
  period,
  trips,
  monthLabel,
  pageNumber,
  totalPages,
}: DetailedPageProps) {
  return (
    <Page size="A4" orientation="landscape" style={commonStyles.page}>
      {/* Header - Period */}
      <View style={commonStyles.header}>
        <Text>{formatPDFPeriodRange(period.start, period.end)}</Text>
      </View>

      {/* Month Header */}
      <View style={{ marginBottom: 20 }}>
        <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#000000' }}>
          {monthLabel}
        </Text>
      </View>

      {/* Trips Table */}
      <View style={commonStyles.table}>
        {/* Table Header */}
        <View style={commonStyles.tableHeader}>
          <View style={{ width: '8%' }}>
            <Text style={commonStyles.tableCellHeader}>Datum</Text>
          </View>
          <View style={{ width: '18%' }}>
            <Text style={commonStyles.tableCellHeader}>Van</Text>
          </View>
          <View style={{ width: '18%' }}>
            <Text style={commonStyles.tableCellHeader}>Naar</Text>
          </View>
          <View style={{ width: '14%' }}>
            <Text style={commonStyles.tableCellHeader}>Doel</Text>
          </View>
          <View style={{ width: '14%' }}>
            <Text style={[commonStyles.tableCellHeader, commonStyles.tableCellRight]}>Kilometerstand</Text>
          </View>
          <View style={{ width: '10%' }}>
            <Text style={[commonStyles.tableCellHeader, commonStyles.tableCellRight]}>Afstand</Text>
          </View>
          <View style={{ width: '9%' }}>
            <Text style={[commonStyles.tableCellHeader, commonStyles.tableCellRight]}>Tarief</Text>
          </View>
          <View style={{ width: '9%' }}>
            <Text style={[commonStyles.tableCellHeader, commonStyles.tableCellRight]}>Bedrag</Text>
          </View>
        </View>

        {/* Table Rows */}
        {trips.map((trip, index) => (
          <View
            key={index}
            style={[
              commonStyles.tableRow,
              index % 2 === 0 ? commonStyles.tableRowEven : {},
            ]}
          >
            <View style={{ width: '8%' }}>
              <Text style={[commonStyles.tableCell, { fontSize: 8 }]}>
                {trip.date.getDate()} {trip.date.toLocaleDateString('nl-NL', { month: 'short' })} {trip.date.getFullYear()}
              </Text>
            </View>
            <View style={{ width: '18%' }}>
              <Text style={[commonStyles.tableCell, { fontSize: 7 }]}>
                {trip.from || '-'}
              </Text>
            </View>
            <View style={{ width: '18%' }}>
              <Text style={[commonStyles.tableCell, { fontSize: 7 }]}>
                {trip.to || '-'}
              </Text>
            </View>
            <View style={{ width: '14%' }}>
              <Text style={[commonStyles.tableCell, { fontSize: 7 }]}>
                {trip.purpose || '-'}
              </Text>
            </View>
            <View style={{ width: '14%' }}>
              <Text style={[commonStyles.tableCell, commonStyles.tableCellRight, { fontSize: 7 }]}>
                {trip.odometerStart > 0 && trip.odometerEnd > 0
                  ? `${formatPDFOdometer(trip.odometerStart)}\n-\n${formatPDFOdometer(trip.odometerEnd)}`
                  : '-'}
              </Text>
            </View>
            <View style={{ width: '10%' }}>
              <Text style={[commonStyles.tableCell, commonStyles.tableCellRight, { fontSize: 8 }]}>
                {trip.distance > 0 ? `${trip.distance.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} km` : '-'}
              </Text>
            </View>
            <View style={{ width: '9%' }}>
              <Text style={[commonStyles.tableCell, commonStyles.tableCellRight, { fontSize: 8 }]}>
                {formatPDFCurrency(0)}
              </Text>
            </View>
            <View style={{ width: '9%' }}>
              <Text style={[commonStyles.tableCell, commonStyles.tableCellRight, { fontSize: 8 }]}>
                {formatPDFCurrency(0)}
              </Text>
            </View>
          </View>
        ))}
      </View>

      {/* Footer - Page Number */}
      <View style={commonStyles.footer}>
        <Text>{pageNumber} van {totalPages}</Text>
      </View>
    </Page>
  );
}

/**
 * Split trips into pages with max TRIPS_PER_PAGE per page
 */
export function createDetailedPages(
  trips: Trip[],
  period: { start: Date; end: Date; label: string },
  monthLabel: string,
  startPageNumber: number,
  totalPages: number
): React.ReactElement[] {
  const pages: React.ReactElement[] = [];

  for (let i = 0; i < trips.length; i += TRIPS_PER_PAGE) {
    const pageTrips = trips.slice(i, i + TRIPS_PER_PAGE);
    const pageNumber = startPageNumber + Math.floor(i / TRIPS_PER_PAGE);

    pages.push(
      <DetailedPage
        key={`page-${pageNumber}`}
        period={period}
        trips={pageTrips}
        monthLabel={monthLabel}
        pageNumber={pageNumber}
        totalPages={totalPages}
      />
    );
  }

  return pages;
}
