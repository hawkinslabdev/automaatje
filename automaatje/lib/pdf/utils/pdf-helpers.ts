const DUTCH_MONTHS = [
  'januari', 'februari', 'maart', 'april', 'mei', 'juni',
  'juli', 'augustus', 'september', 'oktober', 'november', 'december'
];

/**
 * Format date in Dutch format (d MMMM yyyy)
 */
export function formatPDFDate(date: Date): string {
  const day = date.getDate();
  const month = DUTCH_MONTHS[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}

/**
 * Format date in short Dutch format (d-M-yyyy)
 */
export function formatPDFDateShort(date: Date): string {
  return date.toLocaleDateString('nl-NL', {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
  });
}

/**
 * Format datetime in Dutch format
 */
export function formatPDFDateTime(date: Date): string {
  const day = date.getDate();
  const month = DUTCH_MONTHS[date.getMonth()];
  const year = date.getFullYear();
  const time = date.toLocaleTimeString('nl-NL', {
    hour: '2-digit',
    minute: '2-digit',
  });
  return `${day} ${month} ${year} ${time}`;
}

/**
 * Format period range
 */
export function formatPDFPeriodRange(startDate: Date, endDate: Date): string {
  return `${formatPDFDate(startDate)} - ${formatPDFDate(endDate)}`;
}

/**
 * Format distance in km
 */
export function formatPDFDistance(km: number): string {
  return `${km.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} km`;
}

/**
 * Format odometer reading
 */
export function formatPDFOdometer(km: number): string {
  return km.toLocaleString('nl-NL', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

/**
 * Format currency in EUR
 */
export function formatPDFCurrency(amount: number): string {
  return `€${amount.toFixed(2).replace('.', ',')}`;
}

/**
 * Capitalize first letter
 */
export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Format trip type label
 */
export function formatTripTypeLabel(tripType: string): string {
  if (tripType === 'zakelijk') return 'Zakelijk';
  if (tripType === 'privé') return 'Privé';
  return capitalize(tripType);
}

/**
 * Generate filename for PDF export
 */
export function generatePDFFilename(params: {
  organizationName?: string;
  startDate: Date;
  endDate: Date;
}): string {
  const now = new Date();
  const date = now.toISOString().split('T')[0];
  const orgPrefix = params.organizationName
    ? `${params.organizationName.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-`
    : '';

  return `${orgPrefix}kilometerrapport-${date}.pdf`;
}
