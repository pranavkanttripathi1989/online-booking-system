/**
 * dateTime.js — Centralised date/time formatting utilities
 *
 * Standard:
 *   Date    → DD/MM/YYYY          e.g. 19/03/2026
 *   Time    → h:mm A              e.g. 9:00 AM, 12:30 PM
 *   DateTime→ DD/MM/YYYY h:mm A   e.g. 19/03/2026 9:00 AM
 *
 * All visible dates/times in the UI MUST use these helpers.
 * YYYY-MM-DD is kept only for backend API params (not imported from here).
 */
import dayjs from 'dayjs';

/** DD/MM/YYYY — e.g. 19/03/2026 */
export const formatDate = (value) =>
  value ? dayjs(value).format('DD/MM/YYYY') : '—';

/** h:mm A — e.g. 9:00 AM, 12:30 PM */
export const formatTime = (value) =>
  value ? dayjs(value).format('h:mm A') : '—';

/** DD/MM/YYYY h:mm A — e.g. 19/03/2026 9:00 AM */
export const formatDateTime = (value) =>
  value ? dayjs(value).format('DD/MM/YYYY h:mm A') : '—';

/**
 * Convert HH:mm string (e.g. "09:30") → "9:30 AM"
 * Used for time strings that are NOT full ISO datetimes.
 * @param {string} hhmm - e.g. "09:30" or "14:00"
 */
export const formatTimeStr = (hhmm) =>
  hhmm ? dayjs(`2000-01-01T${hhmm}`).format('h:mm A') : '—';

/** dddd, DD MMMM YYYY — e.g. Thursday, 19 March 2026 */
export const formatLongDate = (value) =>
  value ? dayjs(value).format('dddd, DD MMMM YYYY') : '—';

/** DD MMM YYYY — e.g. 19 Mar 2026 */
export const formatShortDate = (value) =>
  value ? dayjs(value).format('DD MMM YYYY') : '—';

/** DD MMM YYYY h:mm A — e.g. 19 Mar 2026 9:00 AM */
export const formatShortDateTime = (value) =>
  value ? dayjs(value).format('DD MMM YYYY, h:mm A') : '—';

/** DD/MM — e.g. 19/03  (for chart axis labels) */
export const formatDayMonth = (value) =>
  value ? dayjs(value).format('DD/MM') : '';

/** ddd DD MMM — e.g. Thu 19 Mar  (for calendar column headers) */
export const formatWeekHeader = (value) =>
  value ? dayjs(value).format('ddd DD MMM') : '';

/**
 * Time range string: "9:00 AM – 9:30 AM"
 * @param {string} start - ISO datetime or HH:mm string
 * @param {string} end   - ISO datetime or HH:mm string
 * @param {boolean} isHHmm - if true, treats start/end as HH:mm strings
 */
export const formatTimeRange = (start, end, isHHmm = false) => {
  if (!start) return '—';
  const s = isHHmm ? formatTimeStr(start) : formatTime(start);
  const e = isHHmm && end ? formatTimeStr(end) : end ? formatTime(end) : '';
  return e ? `${s} – ${e}` : s;
};

/**
 * NEW-DT-011: Relative time — "just now", "2 minutes ago", "3 days ago", etc.
 * Uses dayjs native diff so no extra plugin is required.
 * Matches the informal language used in Messages sidebar + Patient Dashboard notifications.
 * @param {string|Date} value - ISO datetime or Date object
 */
export const formatRelativeTime = (value) => {
  if (!value) return '—';
  const now  = dayjs();
  const then = dayjs(value);
  const diffSec  = now.diff(then, 'second');
  const diffMin  = now.diff(then, 'minute');
  const diffHour = now.diff(then, 'hour');
  const diffDay  = now.diff(then, 'day');
  if (diffSec  < 60)  return 'just now';
  if (diffMin  < 60)  return `${diffMin} min ago`;
  if (diffHour < 24)  return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;
  if (diffDay  < 7)   return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
  return formatShortDate(value); // fall back to "19 Mar 2026" for older dates
};

/**
 * NEW-DT-011: GBP currency formatter — mirrors formatCurrency in dateUtils.js.
 * Centralised here so consumers can import from one place.
 * @param {number} amount
 * @param {string} currency - ISO 4217 code, default 'GBP'
 */
export const formatCurrency = (amount, currency = 'GBP') =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(amount ?? 0);
