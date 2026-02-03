/**
 * Date utility functions for the analytics dashboard.
 */

import { subDays, subMonths, format, differenceInDays } from 'date-fns';

export type DatePreset =
  | 'last7days'
  | 'last14days'
  | 'last28days'
  | 'last30days'
  | 'last90days'
  | 'last6months'
  | 'last12months';

export interface DateRange {
  start: Date;
  end: Date;
}

export const DATE_PRESETS: { value: DatePreset; label: string }[] = [
  { value: 'last7days', label: 'Last 7 days' },
  { value: 'last14days', label: 'Last 14 days' },
  { value: 'last28days', label: 'Last 28 days' },
  { value: 'last30days', label: 'Last 30 days' },
  { value: 'last90days', label: 'Last 90 days' },
  { value: 'last6months', label: 'Last 6 months' },
  { value: 'last12months', label: 'Last 12 months' },
];

/**
 * Get date range for a preset.
 */
export function getDateRange(preset: DatePreset): DateRange {
  const end = new Date();
  let start: Date;

  switch (preset) {
    case 'last7days':
      start = subDays(end, 7);
      break;
    case 'last14days':
      start = subDays(end, 14);
      break;
    case 'last28days':
      start = subDays(end, 28);
      break;
    case 'last30days':
      start = subDays(end, 30);
      break;
    case 'last90days':
      start = subDays(end, 90);
      break;
    case 'last6months':
      start = subMonths(end, 6);
      break;
    case 'last12months':
      start = subMonths(end, 12);
      break;
    default:
      start = subDays(end, 30);
  }

  return { start, end };
}

/**
 * Get comparison date range (previous period of same length).
 */
export function getComparisonRange(start: Date, end: Date): DateRange {
  const days = differenceInDays(end, start);
  return {
    start: subDays(start, days + 1),
    end: subDays(start, 1),
  };
}

/**
 * Format date for API calls (YYYY-MM-DD).
 */
export function formatDateForApi(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

/**
 * Format date for display (Jan 15).
 */
export function formatDateForDisplay(date: Date): string {
  return format(date, 'MMM d');
}

/**
 * Format date range for display (Jan 15 - Feb 14).
 */
export function formatDateRangeForDisplay(start: Date, end: Date): string {
  return `${formatDateForDisplay(start)} - ${formatDateForDisplay(end)}`;
}

/**
 * Get days count between two dates.
 */
export function getDaysCount(start: Date, end: Date): number {
  return differenceInDays(end, start);
}
