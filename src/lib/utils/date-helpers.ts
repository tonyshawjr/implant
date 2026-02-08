/**
 * Utility functions for working with dates
 */

/**
 * Get relative time string (e.g., "2 hours ago", "in 3 days")
 * @param date - The date to format
 * @returns Relative time string
 */
export function getRelativeTime(date: Date | string | null | undefined): string {
  if (!date) {
    return '-';
  }

  const dateObj = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(dateObj.getTime())) {
    return '-';
  }

  const now = new Date();
  const diffMs = dateObj.getTime() - now.getTime();
  const diffSecs = Math.round(diffMs / 1000);
  const diffMins = Math.round(diffSecs / 60);
  const diffHours = Math.round(diffMins / 60);
  const diffDays = Math.round(diffHours / 24);
  const diffWeeks = Math.round(diffDays / 7);
  const diffMonths = Math.round(diffDays / 30);
  const diffYears = Math.round(diffDays / 365);

  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

  if (Math.abs(diffSecs) < 60) {
    return rtf.format(diffSecs, 'second');
  }
  if (Math.abs(diffMins) < 60) {
    return rtf.format(diffMins, 'minute');
  }
  if (Math.abs(diffHours) < 24) {
    return rtf.format(diffHours, 'hour');
  }
  if (Math.abs(diffDays) < 7) {
    return rtf.format(diffDays, 'day');
  }
  if (Math.abs(diffWeeks) < 4) {
    return rtf.format(diffWeeks, 'week');
  }
  if (Math.abs(diffMonths) < 12) {
    return rtf.format(diffMonths, 'month');
  }
  return rtf.format(diffYears, 'year');
}

/**
 * Get a friendly relative time string for recent times
 * Returns "just now", "5 minutes ago", "2 hours ago", or falls back to date
 * @param date - The date to format
 * @returns Friendly relative time string
 */
export function getFriendlyRelativeTime(date: Date | string | null | undefined): string {
  if (!date) {
    return '-';
  }

  const dateObj = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(dateObj.getTime())) {
    return '-';
  }

  const now = new Date();
  const diffMs = now.getTime() - dateObj.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) {
    return 'just now';
  }
  if (diffMins < 60) {
    return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
  }
  if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  }
  if (diffDays === 1) {
    return 'yesterday';
  }
  if (diffDays < 7) {
    return `${diffDays} days ago`;
  }

  // Fall back to formatted date
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: dateObj.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  }).format(dateObj);
}

/**
 * Date range preset types
 */
export type DateRangePreset =
  | 'today'
  | 'yesterday'
  | 'last7days'
  | 'last14days'
  | 'last30days'
  | 'last90days'
  | 'thisWeek'
  | 'lastWeek'
  | 'thisMonth'
  | 'lastMonth'
  | 'thisQuarter'
  | 'lastQuarter'
  | 'thisYear'
  | 'lastYear'
  | 'allTime';

/**
 * Get start and end dates for a date range preset
 * @param preset - The date range preset
 * @returns Object with start and end Date objects
 */
export function getDateRange(preset: DateRangePreset): { start: Date; end: Date } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  switch (preset) {
    case 'today':
      return { start: today, end: tomorrow };

    case 'yesterday': {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return { start: yesterday, end: today };
    }

    case 'last7days': {
      const start = new Date(today);
      start.setDate(start.getDate() - 7);
      return { start, end: tomorrow };
    }

    case 'last14days': {
      const start = new Date(today);
      start.setDate(start.getDate() - 14);
      return { start, end: tomorrow };
    }

    case 'last30days': {
      const start = new Date(today);
      start.setDate(start.getDate() - 30);
      return { start, end: tomorrow };
    }

    case 'last90days': {
      const start = new Date(today);
      start.setDate(start.getDate() - 90);
      return { start, end: tomorrow };
    }

    case 'thisWeek': {
      const start = new Date(today);
      start.setDate(start.getDate() - start.getDay()); // Start of week (Sunday)
      return { start, end: tomorrow };
    }

    case 'lastWeek': {
      const start = new Date(today);
      start.setDate(start.getDate() - start.getDay() - 7);
      const end = new Date(start);
      end.setDate(end.getDate() + 7);
      return { start, end };
    }

    case 'thisMonth': {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      return { start, end: tomorrow };
    }

    case 'lastMonth': {
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const end = new Date(today.getFullYear(), today.getMonth(), 1);
      return { start, end };
    }

    case 'thisQuarter': {
      const quarterStart = Math.floor(today.getMonth() / 3) * 3;
      const start = new Date(today.getFullYear(), quarterStart, 1);
      return { start, end: tomorrow };
    }

    case 'lastQuarter': {
      const currentQuarterStart = Math.floor(today.getMonth() / 3) * 3;
      const start = new Date(today.getFullYear(), currentQuarterStart - 3, 1);
      const end = new Date(today.getFullYear(), currentQuarterStart, 1);
      return { start, end };
    }

    case 'thisYear': {
      const start = new Date(today.getFullYear(), 0, 1);
      return { start, end: tomorrow };
    }

    case 'lastYear': {
      const start = new Date(today.getFullYear() - 1, 0, 1);
      const end = new Date(today.getFullYear(), 0, 1);
      return { start, end };
    }

    case 'allTime':
    default:
      // Return a very old date for start
      return { start: new Date(2020, 0, 1), end: tomorrow };
  }
}

/**
 * Get the label for a date range preset
 * @param preset - The date range preset
 * @returns Human-readable label
 */
export function getDateRangeLabel(preset: DateRangePreset): string {
  const labels: Record<DateRangePreset, string> = {
    today: 'Today',
    yesterday: 'Yesterday',
    last7days: 'Last 7 Days',
    last14days: 'Last 14 Days',
    last30days: 'Last 30 Days',
    last90days: 'Last 90 Days',
    thisWeek: 'This Week',
    lastWeek: 'Last Week',
    thisMonth: 'This Month',
    lastMonth: 'Last Month',
    thisQuarter: 'This Quarter',
    lastQuarter: 'Last Quarter',
    thisYear: 'This Year',
    lastYear: 'Last Year',
    allTime: 'All Time'
  };

  return labels[preset] || preset;
}

/**
 * Check if a date is within a specified number of days from now
 * @param date - The date to check
 * @param days - Number of days
 * @param direction - 'past' for days ago, 'future' for days from now, 'both' for either
 * @returns True if date is within the specified range
 */
export function isWithinDays(
  date: Date | string | null | undefined,
  days: number,
  direction: 'past' | 'future' | 'both' = 'both'
): boolean {
  if (!date) {
    return false;
  }

  const dateObj = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(dateObj.getTime())) {
    return false;
  }

  const now = new Date();
  const diffMs = dateObj.getTime() - now.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  switch (direction) {
    case 'past':
      return diffDays >= -days && diffDays <= 0;
    case 'future':
      return diffDays >= 0 && diffDays <= days;
    case 'both':
    default:
      return Math.abs(diffDays) <= days;
  }
}

/**
 * Check if a date is today
 * @param date - The date to check
 * @returns True if the date is today
 */
export function isToday(date: Date | string | null | undefined): boolean {
  if (!date) {
    return false;
  }

  const dateObj = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(dateObj.getTime())) {
    return false;
  }

  const today = new Date();
  return (
    dateObj.getDate() === today.getDate() &&
    dateObj.getMonth() === today.getMonth() &&
    dateObj.getFullYear() === today.getFullYear()
  );
}

/**
 * Check if a date is yesterday
 * @param date - The date to check
 * @returns True if the date is yesterday
 */
export function isYesterday(date: Date | string | null | undefined): boolean {
  if (!date) {
    return false;
  }

  const dateObj = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(dateObj.getTime())) {
    return false;
  }

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  return (
    dateObj.getDate() === yesterday.getDate() &&
    dateObj.getMonth() === yesterday.getMonth() &&
    dateObj.getFullYear() === yesterday.getFullYear()
  );
}

/**
 * Check if a date is in the past
 * @param date - The date to check
 * @returns True if the date is in the past
 */
export function isPast(date: Date | string | null | undefined): boolean {
  if (!date) {
    return false;
  }

  const dateObj = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(dateObj.getTime())) {
    return false;
  }

  return dateObj.getTime() < Date.now();
}

/**
 * Check if a date is in the future
 * @param date - The date to check
 * @returns True if the date is in the future
 */
export function isFuture(date: Date | string | null | undefined): boolean {
  if (!date) {
    return false;
  }

  const dateObj = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(dateObj.getTime())) {
    return false;
  }

  return dateObj.getTime() > Date.now();
}

/**
 * Get the number of days between two dates
 * @param startDate - The start date
 * @param endDate - The end date
 * @returns Number of days between the dates
 */
export function getDaysBetween(
  startDate: Date | string | null | undefined,
  endDate: Date | string | null | undefined
): number {
  if (!startDate || !endDate) {
    return 0;
  }

  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate;

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return 0;
  }

  const diffMs = end.getTime() - start.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Get the number of days until a date
 * @param date - The target date
 * @returns Number of days until the date (negative if past)
 */
export function getDaysUntil(date: Date | string | null | undefined): number {
  return getDaysBetween(new Date(), date);
}

/**
 * Get the number of days since a date
 * @param date - The target date
 * @returns Number of days since the date (negative if future)
 */
export function getDaysSince(date: Date | string | null | undefined): number {
  return getDaysBetween(date, new Date());
}

/**
 * Add days to a date
 * @param date - The starting date
 * @param days - Number of days to add (can be negative)
 * @returns New date with days added
 */
export function addDays(date: Date | string, days: number): Date {
  const dateObj = typeof date === 'string' ? new Date(date) : new Date(date);
  dateObj.setDate(dateObj.getDate() + days);
  return dateObj;
}

/**
 * Add months to a date
 * @param date - The starting date
 * @param months - Number of months to add (can be negative)
 * @returns New date with months added
 */
export function addMonths(date: Date | string, months: number): Date {
  const dateObj = typeof date === 'string' ? new Date(date) : new Date(date);
  dateObj.setMonth(dateObj.getMonth() + months);
  return dateObj;
}

/**
 * Get the start of a day (midnight)
 * @param date - The date
 * @returns Date at midnight
 */
export function startOfDay(date: Date | string): Date {
  const dateObj = typeof date === 'string' ? new Date(date) : new Date(date);
  dateObj.setHours(0, 0, 0, 0);
  return dateObj;
}

/**
 * Get the end of a day (23:59:59.999)
 * @param date - The date
 * @returns Date at end of day
 */
export function endOfDay(date: Date | string): Date {
  const dateObj = typeof date === 'string' ? new Date(date) : new Date(date);
  dateObj.setHours(23, 59, 59, 999);
  return dateObj;
}

/**
 * Get the start of a month
 * @param date - The date
 * @returns First day of the month at midnight
 */
export function startOfMonth(date: Date | string): Date {
  const dateObj = typeof date === 'string' ? new Date(date) : new Date(date);
  return new Date(dateObj.getFullYear(), dateObj.getMonth(), 1);
}

/**
 * Get the end of a month
 * @param date - The date
 * @returns Last day of the month at end of day
 */
export function endOfMonth(date: Date | string): Date {
  const dateObj = typeof date === 'string' ? new Date(date) : new Date(date);
  return endOfDay(new Date(dateObj.getFullYear(), dateObj.getMonth() + 1, 0));
}

/**
 * Format a date range for display
 * @param startDate - Start of the range
 * @param endDate - End of the range
 * @returns Formatted date range string
 */
export function formatDateRange(
  startDate: Date | string | null | undefined,
  endDate: Date | string | null | undefined
): string {
  if (!startDate && !endDate) {
    return '-';
  }

  const start = startDate ? (typeof startDate === 'string' ? new Date(startDate) : startDate) : null;
  const end = endDate ? (typeof endDate === 'string' ? new Date(endDate) : endDate) : null;

  const formatOptions: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };

  if (start && end) {
    // Same year - omit year from start date if same as end
    if (start.getFullYear() === end.getFullYear()) {
      if (start.getMonth() === end.getMonth() && start.getDate() === end.getDate()) {
        // Same day
        return new Intl.DateTimeFormat('en-US', { ...formatOptions, year: 'numeric' }).format(start);
      }
      return `${new Intl.DateTimeFormat('en-US', formatOptions).format(start)} - ${new Intl.DateTimeFormat('en-US', { ...formatOptions, year: 'numeric' }).format(end)}`;
    }
    // Different years
    return `${new Intl.DateTimeFormat('en-US', { ...formatOptions, year: 'numeric' }).format(start)} - ${new Intl.DateTimeFormat('en-US', { ...formatOptions, year: 'numeric' }).format(end)}`;
  }

  if (start) {
    return `From ${new Intl.DateTimeFormat('en-US', { ...formatOptions, year: 'numeric' }).format(start)}`;
  }

  if (end) {
    return `Until ${new Intl.DateTimeFormat('en-US', { ...formatOptions, year: 'numeric' }).format(end)}`;
  }

  return '-';
}

/**
 * Get a list of dates between two dates
 * @param startDate - Start of the range
 * @param endDate - End of the range
 * @returns Array of dates between start and end (inclusive)
 */
export function getDatesBetween(
  startDate: Date | string,
  endDate: Date | string
): Date[] {
  const start = startOfDay(typeof startDate === 'string' ? new Date(startDate) : startDate);
  const end = startOfDay(typeof endDate === 'string' ? new Date(endDate) : endDate);

  const dates: Date[] = [];
  const current = new Date(start);

  while (current <= end) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

/**
 * Parse a date string with multiple format support
 * @param dateString - The date string to parse
 * @returns Parsed Date object or null if invalid
 */
export function parseDate(dateString: string | null | undefined): Date | null {
  if (!dateString) {
    return null;
  }

  // Try ISO format first
  const isoDate = new Date(dateString);
  if (!isNaN(isoDate.getTime())) {
    return isoDate;
  }

  // Try common formats
  const formats = [
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, // MM/DD/YYYY
    /^(\d{4})-(\d{1,2})-(\d{1,2})$/, // YYYY-MM-DD
    /^(\d{1,2})-(\d{1,2})-(\d{4})$/ // DD-MM-YYYY
  ];

  for (const format of formats) {
    const match = dateString.match(format);
    if (match) {
      // Try to parse based on format
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
  }

  return null;
}
