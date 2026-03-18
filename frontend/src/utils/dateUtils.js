import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import relativeTime from 'dayjs/plugin/relativeTime'
import duration from 'dayjs/plugin/duration'
import localizedFormat from 'dayjs/plugin/localizedFormat'

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(relativeTime)
dayjs.extend(duration)
dayjs.extend(localizedFormat)

// ─── Formatting ───────────────────────────────────────────────────────────────

/** Format: "Thu, 12 Mar 2026" */
export const formatDate = (datetime, tz = 'UTC') =>
  dayjs.utc(datetime).tz(tz).format('ddd, DD MMM YYYY')

/** Format: "09:30 AM" */
export const formatTime = (datetime, tz = 'UTC') =>
  dayjs.utc(datetime).tz(tz).format('hh:mm A')

/** Format: "Thu, 12 Mar 2026 • 09:30 AM" */
export const formatDateTime = (datetime, tz = 'UTC') =>
  dayjs.utc(datetime).tz(tz).format('ddd, DD MMM YYYY • hh:mm A')

/** Format: "09:30 – 10:00 AM" */
export const formatTimeRange = (start, end, tz = 'UTC') => {
  const s = dayjs.utc(start).tz(tz)
  const e = dayjs.utc(end).tz(tz)
  return `${s.format('hh:mm')} – ${e.format('hh:mm A')}`
}

/** Format: "2 hours 30 minutes" or "45 minutes" */
export const formatDuration = (minutes) => {
  const d = dayjs.duration(minutes, 'minutes')
  if (minutes >= 60) {
    const hrs = Math.floor(minutes / 60)
    const mins = minutes % 60
    return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`
  }
  return `${minutes}m`
}

/** Relative time: "2 hours ago", "in 3 days" */
export const fromNow = (datetime) => dayjs.utc(datetime).fromNow()

/** ISO string for GraphQL DateTime input (UTC) */
export const toISOString = (date) => dayjs(date).utc().toISOString()

/** Format slot time for slot picker buttons: "09:30" */
export const formatSlotTime = (datetime, tz = 'UTC') =>
  dayjs.utc(datetime).tz(tz).format('HH:mm')

// ─── Comparisons ──────────────────────────────────────────────────────────────

export const isToday = (datetime) => dayjs.utc(datetime).isToday?.() ?? dayjs.utc(datetime).isSame(dayjs(), 'day')

export const isPast = (datetime) => dayjs.utc(datetime).isBefore(dayjs().utc())

export const isFuture = (datetime) => dayjs.utc(datetime).isAfter(dayjs().utc())

/** Returns true if date is a weekday (Mon–Fri) */
export const isWeekday = (date) => {
  const day = dayjs(date).day()
  return day !== 0 && day !== 6
}

// ─── FullCalendar Helpers ─────────────────────────────────────────────────────

/**
 * Maps a MediBook appointment to a FullCalendar event object
 */
export const appointmentToEvent = (appointment, clinicTimezone = 'UTC') => ({
  id: appointment.id,
  title: `${appointment.patient?.full_name} — ${appointment.service?.name}`,
  start: appointment.start_datetime,
  end: appointment.end_datetime,
  backgroundColor: getStatusColor(appointment.status),
  borderColor: 'transparent',
  textColor: '#FFFFFF',
  extendedProps: {
    appointment,
    status: appointment.status,
    clinician: appointment.clinician,
    patient: appointment.patient,
    service: appointment.service,
    room: appointment.room,
  },
})

// ─── Appointment Status ───────────────────────────────────────────────────────

export const STATUS_COLORS = {
  PENDING: '#FFA726',
  CONFIRMED: '#4CAF50',
  CANCELLED: '#EF5350',
  COMPLETED: '#1565C0',
  NO_SHOW: '#9E9E9E',
}

export const STATUS_BG_COLORS = {
  PENDING: '#FFF3E0',
  CONFIRMED: '#E8F5E9',
  CANCELLED: '#FFEBEE',
  COMPLETED: '#E3F2FD',
  NO_SHOW: '#F5F5F5',
}

export const STATUS_LABELS = {
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  CANCELLED: 'Cancelled',
  COMPLETED: 'Completed',
  NO_SHOW: 'No Show',
}

export const getStatusColor = (status) =>
  STATUS_COLORS[status?.toUpperCase()] ?? '#9E9E9E'

export const getStatusBgColor = (status) =>
  STATUS_BG_COLORS[status?.toUpperCase()] ?? '#F5F5F5'

export const getStatusLabel = (status) =>
  STATUS_LABELS[status?.toUpperCase()] ?? status

// ─── Avatar Helpers ───────────────────────────────────────────────────────────

/** Generate initials from a full name */
export const getInitials = (name = '') => {
  const parts = name.trim().split(' ')
  if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

/** Generate a deterministic colour for an avatar from a name string */
const AVATAR_COLORS = [
  '#1565C0', '#00838F', '#2E7D32', '#6A1B9A',
  '#AD1457', '#C62828', '#E65100', '#00695C',
]
export const getAvatarColor = (name = '') => {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

// ─── Currency ─────────────────────────────────────────────────────────────────

export const formatCurrency = (amount, currency = 'GBP') =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(amount ?? 0)

export default dayjs
