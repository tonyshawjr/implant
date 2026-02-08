/**
 * Utility functions for formatting values consistently across the application
 */

/**
 * Format a number as USD currency
 * @param value - The numeric value to format
 * @param options - Optional formatting options
 * @returns Formatted currency string (e.g., "$1,234.56")
 */
export function formatCurrency(
  value: number | null | undefined,
  options: {
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
    showCents?: boolean;
    compact?: boolean;
  } = {}
): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '$0.00';
  }

  const {
    minimumFractionDigits = options.showCents === false ? 0 : 2,
    maximumFractionDigits = options.showCents === false ? 0 : 2,
    compact = false
  } = options;

  if (compact) {
    return formatCompactCurrency(value);
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits,
    maximumFractionDigits
  }).format(value);
}

/**
 * Format a large currency value in compact notation
 * @param value - The numeric value to format
 * @returns Compact currency string (e.g., "$1.2M", "$45K")
 */
export function formatCompactCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '$0';
  }

  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  if (absValue >= 1_000_000) {
    return `${sign}$${(absValue / 1_000_000).toFixed(1)}M`;
  }

  if (absValue >= 1_000) {
    return `${sign}$${(absValue / 1_000).toFixed(absValue >= 10_000 ? 0 : 1)}K`;
  }

  return formatCurrency(value, { showCents: false });
}

/**
 * Format a date for display
 * @param date - The date to format (Date object or ISO string)
 * @param format - The format style to use
 * @returns Formatted date string
 */
export function formatDate(
  date: Date | string | null | undefined,
  format: 'short' | 'medium' | 'long' | 'full' | 'time' | 'datetime' | 'relative' = 'medium'
): string {
  if (!date) {
    return '-';
  }

  const dateObj = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(dateObj.getTime())) {
    return '-';
  }

  const formatOptions: Record<string, Intl.DateTimeFormatOptions> = {
    short: { month: 'numeric', day: 'numeric', year: '2-digit' },
    medium: { month: 'short', day: 'numeric', year: 'numeric' },
    long: { month: 'long', day: 'numeric', year: 'numeric' },
    full: { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' },
    time: { hour: 'numeric', minute: '2-digit', hour12: true },
    datetime: { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }
  };

  if (format === 'relative') {
    return formatRelativeDate(dateObj);
  }

  return new Intl.DateTimeFormat('en-US', formatOptions[format]).format(dateObj);
}

/**
 * Format a date as relative time (e.g., "2 hours ago", "in 3 days")
 * @param date - The date to format
 * @returns Relative time string
 */
function formatRelativeDate(date: Date): string {
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
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
 * Format a phone number for display
 * @param phone - The phone number to format
 * @returns Formatted phone string (e.g., "(512) 555-1234")
 */
export function formatPhone(phone: string | null | undefined): string {
  if (!phone) {
    return '-';
  }

  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, '');

  // Handle different lengths
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }

  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }

  // Return original if we can't format it
  return phone;
}

/**
 * Format a number as a percentage
 * @param value - The numeric value (0-100 or 0-1 depending on isDecimal)
 * @param options - Formatting options
 * @returns Formatted percentage string (e.g., "45.2%")
 */
export function formatPercent(
  value: number | null | undefined,
  options: {
    decimals?: number;
    isDecimal?: boolean;
    showSign?: boolean;
  } = {}
): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '0%';
  }

  const { decimals = 1, isDecimal = false, showSign = false } = options;

  // Convert decimal to percentage if needed (e.g., 0.45 -> 45)
  const percentValue = isDecimal ? value * 100 : value;

  const formatted = percentValue.toFixed(decimals);
  const sign = showSign && percentValue > 0 ? '+' : '';

  return `${sign}${formatted}%`;
}

/**
 * Format a number with thousand separators
 * @param value - The number to format
 * @param decimals - Number of decimal places
 * @returns Formatted number string
 */
export function formatNumber(
  value: number | null | undefined,
  decimals: number = 0
): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '0';
  }

  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value);
}

/**
 * Format a number in compact notation
 * @param value - The number to format
 * @returns Compact number string (e.g., "1.2K", "3.5M")
 */
export function formatCompactNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '0';
  }

  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  if (absValue >= 1_000_000) {
    return `${sign}${(absValue / 1_000_000).toFixed(1)}M`;
  }

  if (absValue >= 1_000) {
    return `${sign}${(absValue / 1_000).toFixed(absValue >= 10_000 ? 0 : 1)}K`;
  }

  return formatNumber(value);
}

/**
 * Format file size in bytes to human-readable format
 * @param bytes - The file size in bytes
 * @returns Formatted file size string (e.g., "1.5 MB")
 */
export function formatFileSize(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined || isNaN(bytes) || bytes === 0) {
    return '0 B';
  }

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${units[i]}`;
}

/**
 * Format a duration in seconds to human-readable format
 * @param seconds - The duration in seconds
 * @returns Formatted duration string (e.g., "2m 30s", "1h 15m")
 */
export function formatDuration(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || isNaN(seconds) || seconds === 0) {
    return '0s';
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }

  if (minutes > 0) {
    return secs > 0 ? `${minutes}m ${secs}s` : `${minutes}m`;
  }

  return `${secs}s`;
}

/**
 * Truncate a string to a maximum length with ellipsis
 * @param str - The string to truncate
 * @param maxLength - Maximum length before truncation
 * @returns Truncated string with ellipsis if needed
 */
export function truncate(str: string | null | undefined, maxLength: number = 50): string {
  if (!str) {
    return '';
  }

  if (str.length <= maxLength) {
    return str;
  }

  return `${str.slice(0, maxLength - 3)}...`;
}

/**
 * Format a name (capitalize first letters)
 * @param name - The name to format
 * @returns Formatted name string
 */
export function formatName(name: string | null | undefined): string {
  if (!name) {
    return '';
  }

  return name
    .toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Get initials from a name
 * @param firstName - First name
 * @param lastName - Last name
 * @returns Initials string (e.g., "JD")
 */
export function getInitials(firstName?: string | null, lastName?: string | null): string {
  const first = firstName?.charAt(0).toUpperCase() || '';
  const last = lastName?.charAt(0).toUpperCase() || '';
  return `${first}${last}` || '?';
}

/**
 * Format a full name from parts
 * @param firstName - First name
 * @param lastName - Last name
 * @returns Full name string
 */
export function formatFullName(firstName?: string | null, lastName?: string | null): string {
  const parts = [firstName, lastName].filter(Boolean);
  return parts.join(' ') || 'Unknown';
}
