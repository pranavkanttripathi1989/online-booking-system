import {
  formatDate,
  formatTime,
  formatDateTime,
  formatTimeStr,
  formatLongDate,
  formatShortDate,
  formatShortDateTime,
  formatDayMonth,
  formatWeekHeader,
  formatTimeRange,
  formatRelativeTime,
  formatCurrency,
  formatPercent,
} from './dateTime'

// A fixed, zone-less local timestamp so every formatter test is deterministic
// regardless of when — and in which timezone — the suite runs. dayjs().format()
// renders in the host's local time; a 'Z'-suffixed UTC instant would shift by
// the runner's offset (confirmed: this host is UTC+5:30).
const FIXED = '2026-03-19T09:00:00'

describe('formatDate', () => {
  it('formats as DD/MM/YYYY', () => {
    expect(formatDate(FIXED)).toBe('19/03/2026')
  })
  it('falls back to em dash for a falsy value', () => {
    expect(formatDate(null)).toBe('—')
    expect(formatDate(undefined)).toBe('—')
  })
})

describe('formatTime', () => {
  it('formats as h:mm A', () => {
    expect(formatTime(FIXED)).toBe('9:00 AM')
  })
  it('falls back to em dash for a falsy value', () => {
    expect(formatTime(null)).toBe('—')
  })
})

describe('formatDateTime', () => {
  it('formats as DD/MM/YYYY h:mm A', () => {
    expect(formatDateTime(FIXED)).toBe('19/03/2026 9:00 AM')
  })
  it('falls back to em dash for a falsy value', () => {
    expect(formatDateTime(null)).toBe('—')
  })
})

describe('formatTimeStr', () => {
  it('converts an HH:mm string to h:mm A', () => {
    expect(formatTimeStr('09:30')).toBe('9:30 AM')
    expect(formatTimeStr('14:00')).toBe('2:00 PM')
  })
  it('falls back to em dash for a falsy value', () => {
    expect(formatTimeStr(null)).toBe('—')
    expect(formatTimeStr('')).toBe('—')
  })
})

describe('formatLongDate', () => {
  it('formats as dddd, DD MMMM YYYY', () => {
    expect(formatLongDate(FIXED)).toBe('Thursday, 19 March 2026')
  })
  it('falls back to em dash for a falsy value', () => {
    expect(formatLongDate(null)).toBe('—')
  })
})

describe('formatShortDate', () => {
  it('formats as DD MMM YYYY', () => {
    expect(formatShortDate(FIXED)).toBe('19 Mar 2026')
  })
  it('falls back to em dash for a falsy value', () => {
    expect(formatShortDate(null)).toBe('—')
  })
})

describe('formatShortDateTime', () => {
  it('formats as DD MMM YYYY, h:mm A', () => {
    expect(formatShortDateTime(FIXED)).toBe('19 Mar 2026, 9:00 AM')
  })
  it('falls back to em dash for a falsy value', () => {
    expect(formatShortDateTime(null)).toBe('—')
  })
})

describe('formatDayMonth', () => {
  it('formats as DD/MM', () => {
    expect(formatDayMonth(FIXED)).toBe('19/03')
  })
  it('falls back to empty string for a falsy value', () => {
    expect(formatDayMonth(null)).toBe('')
  })
})

describe('formatWeekHeader', () => {
  it('formats as ddd DD MMM', () => {
    expect(formatWeekHeader(FIXED)).toBe('Thu 19 Mar')
  })
  it('falls back to empty string for a falsy value', () => {
    expect(formatWeekHeader(null)).toBe('')
  })
})

describe('formatTimeRange', () => {
  it('formats an ISO start/end pair as "h:mm A – h:mm A"', () => {
    expect(formatTimeRange('2026-03-19T09:00:00', '2026-03-19T09:30:00')).toBe('9:00 AM – 9:30 AM')
  })
  it('formats an HH:mm start/end pair when isHHmm is true', () => {
    expect(formatTimeRange('09:00', '09:30', true)).toBe('9:00 AM – 9:30 AM')
  })
  it('omits the end half when no end is given', () => {
    expect(formatTimeRange('09:00', null, true)).toBe('9:00 AM')
  })
  it('falls back to em dash when there is no start', () => {
    expect(formatTimeRange(null, null)).toBe('—')
  })
})

describe('formatRelativeTime', () => {
  const NOW = new Date('2026-03-19T12:00:00.000Z')

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(NOW)
  })
  afterEach(() => {
    jest.useRealTimers()
  })

  it('returns "just now" under a minute ago', () => {
    expect(formatRelativeTime(new Date(NOW.getTime() - 30 * 1000).toISOString())).toBe('just now')
  })
  it('returns "N min ago" under an hour ago', () => {
    expect(formatRelativeTime(new Date(NOW.getTime() - 5 * 60 * 1000).toISOString())).toBe('5 min ago')
  })
  it('returns "N hour(s) ago" under a day ago', () => {
    expect(formatRelativeTime(new Date(NOW.getTime() - 3 * 60 * 60 * 1000).toISOString())).toBe('3 hours ago')
    expect(formatRelativeTime(new Date(NOW.getTime() - 1 * 60 * 60 * 1000).toISOString())).toBe('1 hour ago')
  })
  it('returns "N day(s) ago" under a week ago', () => {
    expect(formatRelativeTime(new Date(NOW.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString())).toBe('2 days ago')
  })
  it('falls back to formatShortDate a week or more ago', () => {
    expect(formatRelativeTime(new Date(NOW.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString())).toBe(
      formatShortDate(new Date(NOW.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString()),
    )
  })
  it('falls back to em dash for a falsy value', () => {
    expect(formatRelativeTime(null)).toBe('—')
  })
})

describe('formatCurrency', () => {
  it('formats a paise-free rupee amount as INR', () => {
    expect(formatCurrency(500)).toBe('₹500.00')
  })
  it('defaults a missing amount to zero', () => {
    expect(formatCurrency(undefined)).toBe('₹0.00')
    expect(formatCurrency(null)).toBe('₹0.00')
  })
  it('honours an explicit currency code', () => {
    expect(formatCurrency(500, 'USD')).toBe('$500.00')
  })
})

describe('formatPercent (BUG034)', () => {
  it('rounds a long raw division result to 1 decimal by default', () => {
    expect(formatPercent(2.9629629629629632)).toBe('3.0%')
    expect(formatPercent(66.666666666666666)).toBe('66.7%')
  })
  it('honours an explicit decimal count', () => {
    expect(formatPercent(66.666666666666666, 2)).toBe('66.67%')
    expect(formatPercent(50, 0)).toBe('50%')
  })
  it('defaults a missing value to zero', () => {
    expect(formatPercent(undefined)).toBe('0.0%')
    expect(formatPercent(null)).toBe('0.0%')
  })
})
