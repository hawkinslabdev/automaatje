const DUTCH_MONTHS = [
  "januari", "februari", "maart", "april", "mei", "juni",
  "juli", "augustus", "september", "oktober", "november", "december"
];

const QUICK_PICK_LABELS: Record<string, string> = {
  'today': 'Vandaag',
  'this-week': 'Deze week',
  'this-month': 'Deze maand',
  'last-month': 'Vorige maand',
  'this-year': 'Dit jaar',
};

/**
 * Get Dutch month name by index (0-11)
 */
export function getDutchMonthName(monthIndex: number): string {
  return DUTCH_MONTHS[monthIndex] || '';
}

/**
 * Format period string for display
 */
export function formatPeriodLabel(period: string): string {
  // Quick picks
  if (QUICK_PICK_LABELS[period]) {
    return QUICK_PICK_LABELS[period];
  }

  // Year: year-2024 → "2024"
  const yearMatch = period.match(/^year-(\d{4})$/);
  if (yearMatch) {
    return yearMatch[1];
  }

  // Month: month-2024-03 → "maart 2024"
  const monthMatch = period.match(/^month-(\d{4})-(\d{2})$/);
  if (monthMatch) {
    const year = monthMatch[1];
    const month = parseInt(monthMatch[2]) - 1;
    return `${getDutchMonthName(month)} ${year}`;
  }

  return period;
}

/**
 * Get adjacent period (previous or next) for navigation
 */
export function getAdjacentPeriod(
  period: string,
  direction: 'prev' | 'next',
  availableYears: number[]
): string | null {
  // Year periods: year-2024
  const yearMatch = period.match(/^year-(\d{4})$/);
  if (yearMatch) {
    const currentYear = parseInt(yearMatch[1]);
    const targetYear = direction === 'prev' ? currentYear - 1 : currentYear + 1;

    // Check if target year has data
    if (availableYears.includes(targetYear)) {
      return `year-${targetYear}`;
    }
    return null;
  }

  // Month periods: month-2024-03
  const monthMatch = period.match(/^month-(\d{4})-(\d{2})$/);
  if (monthMatch) {
    const year = parseInt(monthMatch[1]);
    const month = parseInt(monthMatch[2]);

    let targetYear = year;
    let targetMonth = direction === 'prev' ? month - 1 : month + 1;

    // Handle year boundaries
    if (targetMonth < 1) {
      targetMonth = 12;
      targetYear--;
    } else if (targetMonth > 12) {
      targetMonth = 1;
      targetYear++;
    }

    // Don't navigate to future months
    const now = new Date();
    const targetDate = new Date(targetYear, targetMonth - 1);
    if (targetDate > now) {
      return null;
    }

    return `month-${targetYear}-${String(targetMonth).padStart(2, '0')}`;
  }

  // Quick picks don't support navigation
  return null;
}

/**
 * Calculate date range for predefined periods
 */
export function getDateRangeForPeriod(period: string): { startDate: Date; endDate: Date } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Handle year periods: year-2024
  const yearMatch = period.match(/^year-(\d{4})$/);
  if (yearMatch) {
    const year = parseInt(yearMatch[1]);
    return {
      startDate: new Date(year, 0, 1),
      endDate: new Date(year, 11, 31, 23, 59, 59, 999),
    };
  }

  // Handle month periods: month-2024-03
  const monthMatch = period.match(/^month-(\d{4})-(\d{2})$/);
  if (monthMatch) {
    const year = parseInt(monthMatch[1]);
    const month = parseInt(monthMatch[2]) - 1; // JS months are 0-indexed
    return {
      startDate: new Date(year, month, 1),
      endDate: new Date(year, month + 1, 0, 23, 59, 59, 999),
    };
  }

  switch (period) {
    case 'today':
      return {
        startDate: today,
        endDate: new Date(today.getTime() + 86400000 - 1), // End of today
      };

    case 'this-week': {
      const dayOfWeek = now.getDay();
      const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const startDate = new Date(today);
      startDate.setDate(today.getDate() - daysToMonday);
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);
      return { startDate, endDate };
    }

    case 'this-month':
      return {
        startDate: new Date(now.getFullYear(), now.getMonth(), 1),
        endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999),
      };

    case 'last-month': {
      const startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      return { startDate, endDate };
    }

    case 'this-year':
      return {
        startDate: new Date(now.getFullYear(), 0, 1),
        endDate: new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999),
      };

    default:
      // Default to this month
      return {
        startDate: new Date(now.getFullYear(), now.getMonth(), 1),
        endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999),
      };
  }
}
