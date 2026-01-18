import { Page, Text, View } from '@react-pdf/renderer';
import { commonStyles } from '../utils/pdf-styles';
import { formatPDFDate, formatPDFPeriodRange, formatPDFDistance, formatTripTypeLabel } from '../utils/pdf-helpers';

interface SummaryPageProps {
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
    businessDistance: number;
    commuteDistance: number;
    privateDistance: number;
  };
  vehicle?: {
    licensePlate: string;
    name?: string;
  };
  generatedDate: Date;
  pageNumber: number;
  totalPages: number;
}

export function SummaryPage({
  driverName,
  organizationName,
  period,
  summary,
  vehicle,
  generatedDate,
  pageNumber,
  totalPages,
}: SummaryPageProps) {
  return (
    <Page size="A4" orientation="landscape" style={commonStyles.page}>
      {/* Header - Period */}
      <View style={commonStyles.header}>
        <Text>{formatPDFPeriodRange(period.start, period.end)}</Text>
      </View>

      {/* Title Section */}
      <View style={{ marginBottom: 40 }}>
        <Text style={{ fontSize: 18, color: '#666666', marginBottom: 10 }}>
          {driverName}
        </Text>
        <Text style={commonStyles.title}>Kilometerrapport</Text>
        <Text style={commonStyles.subtitle}>
          {formatPDFPeriodRange(period.start, period.end)}
        </Text>
      </View>

      {/* Summary Section */}
      <View style={commonStyles.section}>
        <Text style={commonStyles.sectionTitle}>Samenvatting</Text>

        <View style={commonStyles.table}>
          {/* Table Header */}
          <View style={commonStyles.tableHeader}>
            <View style={{ width: '30%' }}>
              <Text style={commonStyles.tableCellHeader}>Type</Text>
            </View>
            <View style={{ width: '20%' }}>
              <Text style={[commonStyles.tableCellHeader, commonStyles.tableCellRight]}>Tarief</Text>
            </View>
            <View style={{ width: '30%' }}>
              <Text style={[commonStyles.tableCellHeader, commonStyles.tableCellRight]}>Afstand</Text>
            </View>
            <View style={{ width: '20%' }}>
              <Text style={[commonStyles.tableCellHeader, commonStyles.tableCellRight]}>Vergoeding</Text>
            </View>
          </View>

          {/* Business Row - Only show if there is business distance */}
          {summary.businessDistance > 0 && (
            <View style={commonStyles.tableRow}>
              <View style={{ width: '30%' }}>
                <Text style={commonStyles.tableCell}>Zakelijk</Text>
              </View>
              <View style={{ width: '20%' }}>
                <Text style={[commonStyles.tableCell, commonStyles.tableCellRight]}>-</Text>
              </View>
              <View style={{ width: '30%' }}>
                <Text style={[commonStyles.tableCell, commonStyles.tableCellRight]}>
                  {formatPDFDistance(summary.businessDistance)}
                </Text>
              </View>
              <View style={{ width: '20%' }}>
                <Text style={[commonStyles.tableCell, commonStyles.tableCellRight]}>-</Text>
              </View>
            </View>
          )}

          {/* Commute Row - Only show if there is commute distance */}
          {summary.commuteDistance > 0 && (
            <View style={commonStyles.tableRow}>
              <View style={{ width: '30%' }}>
                <Text style={commonStyles.tableCell}>Woon-werk</Text>
              </View>
              <View style={{ width: '20%' }}>
                <Text style={[commonStyles.tableCell, commonStyles.tableCellRight]}>-</Text>
              </View>
              <View style={{ width: '30%' }}>
                <Text style={[commonStyles.tableCell, commonStyles.tableCellRight]}>
                  {formatPDFDistance(summary.commuteDistance)}
                </Text>
              </View>
              <View style={{ width: '20%' }}>
                <Text style={[commonStyles.tableCell, commonStyles.tableCellRight]}>-</Text>
              </View>
            </View>
          )}

          {/* Private Row - Only show if there is private distance */}
          {summary.privateDistance > 0 && (
            <View style={commonStyles.tableRow}>
              <View style={{ width: '30%' }}>
                <Text style={commonStyles.tableCell}>Privé</Text>
              </View>
              <View style={{ width: '20%' }}>
                <Text style={[commonStyles.tableCell, commonStyles.tableCellRight]}>-</Text>
              </View>
              <View style={{ width: '30%' }}>
                <Text style={[commonStyles.tableCell, commonStyles.tableCellRight]}>
                  {formatPDFDistance(summary.privateDistance)}
                </Text>
              </View>
              <View style={{ width: '20%' }}>
                <Text style={[commonStyles.tableCell, commonStyles.tableCellRight]}>-</Text>
              </View>
            </View>
          )}

          {/* Total Row */}
          <View style={[commonStyles.tableRow, commonStyles.totalRow]}>
            <View style={{ width: '30%' }}>
              <Text style={[commonStyles.tableCell, { fontWeight: 'bold' }]}>Totaal</Text>
            </View>
            <View style={{ width: '20%' }}>
              <Text style={[commonStyles.tableCell, commonStyles.tableCellRight]}></Text>
            </View>
            <View style={{ width: '30%' }}>
              <Text style={[commonStyles.tableCell, commonStyles.tableCellRight, { fontWeight: 'bold' }]}>
                {formatPDFDistance(summary.totalDistance)}
              </Text>
            </View>
            <View style={{ width: '20%' }}>
              <Text style={[commonStyles.tableCell, commonStyles.tableCellRight, { fontWeight: 'bold' }]}>
                -
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Metadata Section */}
      <View style={commonStyles.metadata}>
        <View style={commonStyles.metadataRow}>
          <Text style={commonStyles.metadataLabel}>Persoon</Text>
          <Text style={commonStyles.metadataValue}>{driverName}</Text>
        </View>

        {organizationName && (
          <View style={commonStyles.metadataRow}>
            <Text style={commonStyles.metadataLabel}>Organisatie</Text>
            <Text style={commonStyles.metadataValue}>{organizationName}</Text>
          </View>
        )}

        {vehicle && (
          <View style={commonStyles.metadataRow}>
            <Text style={commonStyles.metadataLabel}>Voertuig</Text>
            <Text style={commonStyles.metadataValue}>
              {vehicle.name ? `${vehicle.name} (${vehicle.licensePlate})` : vehicle.licensePlate}
            </Text>
          </View>
        )}

        <View style={commonStyles.metadataRow}>
          <Text style={commonStyles.metadataLabel}>Gegenereerd op</Text>
          <Text style={commonStyles.metadataValue}>{formatPDFDate(generatedDate)}</Text>
        </View>
      </View>

      {/* Footer - Page Number */}
      <View style={commonStyles.footer}>
        <Text>{pageNumber} van {totalPages}</Text>
      </View>
    </Page>
  );
}
