import { useState, useCallback, useRef, useMemo, useEffect } from 'react'
import { useQuery, useSubscription } from '@apollo/client'
import { Helmet } from 'react-helmet-async'
import { useNavigate } from 'react-router-dom'
import { useSnackbar } from 'notistack'
import dayjs from 'dayjs'
import isBetween from 'dayjs/plugin/isBetween'
import {
  Badge,
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  Divider,
  Fab,
  IconButton,
  InputAdornment,
  MenuItem,
  Select,
  Skeleton,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded'
import PersonRoundedIcon from '@mui/icons-material/PersonRounded'
import LocalHospitalRoundedIcon from '@mui/icons-material/LocalHospitalRounded'
import ClearRoundedIcon from '@mui/icons-material/ClearRounded'
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord'
import MeetingRoomRoundedIcon from '@mui/icons-material/MeetingRoomRounded'
import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded'
import MedicalServicesRoundedIcon from '@mui/icons-material/MedicalServicesRounded'
import VideocamRoundedIcon from '@mui/icons-material/VideocamRounded'
import EventNoteRoundedIcon from '@mui/icons-material/EventNoteRounded'
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded'
import ChevronLeftRoundedIcon from '@mui/icons-material/ChevronLeftRounded'
import TodayRoundedIcon from '@mui/icons-material/TodayRounded'
import DirectionsCarRoundedIcon from '@mui/icons-material/DirectionsCarRounded'
import EventAvailableRoundedIcon from '@mui/icons-material/EventAvailableRounded'

import { APPOINTMENTS_QUERY, CLINICIANS_QUERY, CLINICS_QUERY, ROOMS_QUERY, AVAILABILITIES_QUERY } from '../../graphql/queries'
import { APPOINTMENT_UPDATED_SUBSCRIPTION } from '../../graphql/subscriptions'
import CalendarView from '../../components/Calendar/CalendarView'
import * as MockStore from '../../mocks/store'

dayjs.extend(isBetween)

// ─── Status meta ─────────────────────────────────────────────────────────────
const STATUS_OPTIONS = ['', 'pending', 'confirmed', 'cancelled', 'completed', 'no_show']
const STATUS_LABELS = {
  '': 'All Statuses',
  pending: 'Pending',
  confirmed: 'Confirmed',
  cancelled: 'Cancelled',
  completed: 'Completed',
  no_show: 'No Show',
}
// BUG047 Phase 3 -- status colour comes from theme.palette.appointmentStatus
// (theme/index.js)'s own `.dot`, the one shared source, instead of this
// file's own hex map. Callers with no `theme` in scope take it as an arg.
function statusDot(theme, status) {
  return theme.palette.appointmentStatus[status]?.dot ?? theme.palette.text.disabled
}

// ─── Appointment type meta ────────────────────────────────────────────────────
const TYPE_OPTIONS = ['', 'in_person', 'video', 'home_visit']
const TYPE_LABELS = { '': 'All Types', in_person: 'In-Person', video: 'Video', home_visit: 'Home Visit' }

// ─── Room-view time range ─────────────────────────────────────────────────────
const ROOM_VIEW_HOURS = Array.from({ length: 15 }, (_, i) => i + 7) // 07–21

// ─── Map appointment → FullCalendar event ────────────────────────────────────
function toCalendarEvent(apt) {
  // REQ017: session/hybrid-mode appointments share a start time with many
  // others in the same session -- the token number is what distinguishes
  // them on the calendar (a real live queue board is REQ019's job, not
  // this page's).
  const tokenPrefix = apt.token_no ? `#${apt.token_no} — ` : ''
  return {
    id: apt.id,
    title: `${tokenPrefix}${apt.patient?.full_name ?? 'Unknown'}`,
    start: apt.start_datetime,
    end: apt.end_datetime,
    extendedProps: {
      patient: apt.patient?.full_name,
      clinician: apt.clinician?.full_name,
      service: apt.service?.name,
      room: apt.room?.name,
      roomId: apt.room?.id,
      status: apt.status,
      clinicianId: apt.clinician?.id,
      tokenNo: apt.token_no ?? undefined,
      bookingMode: apt.booking_mode,
    },
  }
}

// ─── 1-Month Mock Calendar Data ───────────────────────────────────────────────
// BUG-CAL-002 FIX: Use real MockStore IDs so popover → detail navigation resolves correctly
const MOCK_CLINICIANS = ['Dr. Jane Smith', 'Dr. Carlos Vega', 'Dr. Amy Chen', 'Dr. Michael Patel', 'Dr. Sarah Williams']
const MOCK_PATIENTS = [
  'John Miller',
  'Sarah Evans',
  'Robert Clark',
  'Emily Davis',
  'Michael Brown',
  'Lisa Johnson',
  'James Wilson',
  'Anna Thompson',
  'David Martinez',
  'Grace Lee',
  'Tom Anderson',
  'Maria Garcia',
  'Chris Taylor',
  'Jessica Moore',
  'Daniel Harris',
  'Olivia White',
  'Matthew Lewis',
  'Sophie Robinson',
  'Ryan Walker',
  'Laura Hall',
]
const MOCK_ROOMS = ['Room 1A', 'Room 1B', 'Room 2A', 'Room 2B', 'Room 3', 'Exam Suite']
const MOCK_APPOINTMENT_TYPES = [
  { service: 'General Consultation', status: 'confirmed', apptType: 'in_person', duration: 30 },
  { service: 'Follow-up Visit', status: 'confirmed', apptType: 'in_person', duration: 20 },
  { service: 'First Visit', status: 'pending', apptType: 'in_person', duration: 40 },
  { service: 'Blood Test', status: 'confirmed', apptType: 'in_person', duration: 20 },
  { service: 'Telehealth Check-up', status: 'confirmed', apptType: 'video', duration: 30 },
  { service: 'Routine Checkup', status: 'completed', apptType: 'in_person', duration: 30 },
  { service: 'Home Physio', status: 'confirmed', apptType: 'home_visit', duration: 60 },
]
const WEEKDAY_SLOTS = [
  '08:00',
  '08:30',
  '09:00',
  '09:30',
  '10:00',
  '10:30',
  '11:00',
  '11:30',
  '13:00',
  '13:30',
  '14:00',
  '14:30',
  '15:00',
  '15:30',
  '16:00',
  '16:30',
  '17:00',
]
const WEEKEND_SLOTS = ['09:00', '09:30', '10:00', '10:30', '11:00']

function generateMockCalendarData(theme) {
  // First use real MockStore appointments
  const storeApts = MockStore.getAppointments()
  const realEvents = storeApts.map((apt) => ({
    id: apt.id,
    title: apt.patient?.full_name ?? 'Unknown',
    start: apt.start_datetime,
    end: apt.end_datetime,
    backgroundColor: statusDot(theme, apt.status),
    borderColor: statusDot(theme, apt.status),
    extendedProps: {
      patient: apt.patient?.full_name,
      clinician: apt.clinician?.full_name,
      clinicianId: apt.clinician?.id,
      service: apt.service?.name,
      room: apt.room?.name,
      roomId: apt.room?.id,
      status: apt.status,
      apptType: 'in_person',
    },
  }))

  // Pad with generated events for current month visual density
  const extraEvents = []
  const now = new Date()
  const year = now.getFullYear(),
    month = now.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  let eventId = 500 // avoid ID collision with store IDs
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day)
    const isWeekend = date.getDay() === 0 || date.getDay() === 6
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const apptCount = isWeekend ? Math.floor(Math.random() * 2) + 1 : Math.floor(Math.random() * 3) + 2
    const slots = isWeekend ? [...WEEKEND_SLOTS] : [...WEEKDAY_SLOTS]
    slots.sort(() => Math.random() - 0.5)
    const usedSlots = slots.slice(0, apptCount).sort()
    usedSlots.forEach((timeSlot) => {
      const type = MOCK_APPOINTMENT_TYPES[Math.floor(Math.random() * MOCK_APPOINTMENT_TYPES.length)]
      const patient = MOCK_PATIENTS[Math.floor(Math.random() * MOCK_PATIENTS.length)]
      const clinician = MOCK_CLINICIANS[Math.floor(Math.random() * MOCK_CLINICIANS.length)]
      const room = MOCK_ROOMS[Math.floor(Math.random() * MOCK_ROOMS.length)]
      const [h, m] = timeSlot.split(':').map(Number)
      const startDt = new Date(year, month, day, h, m)
      const endDt = new Date(startDt.getTime() + type.duration * 60 * 1000)
      const bg = statusDot(theme, type.status)
      extraEvents.push({
        id: `gen-${eventId++}`,
        title: patient,
        start: startDt.toISOString(),
        end: endDt.toISOString(),
        backgroundColor: bg,
        borderColor: bg,
        extendedProps: {
          patient,
          clinician,
          service: type.service,
          room,
          status: type.status,
          roomId: `mock-room-${room}`,
          apptType: type.apptType,
        },
      })
    })
    if (!isWeekend) {
      extraEvents.push({
        id: `blocked-lunch-${day}`,
        title: 'Lunch Break',
        start: `${dateStr}T12:00:00`,
        end: `${dateStr}T13:00:00`,
        display: 'background',
        backgroundColor: 'rgba(128,134,139,0.18)',
        extendedProps: { isBlocked: true },
      })
    }
  }
  return [...realEvents, ...extraEvents]
}

// ─── Availability helpers ─────────────────────────────────────────────────────
function isAvailInRange(avail, date) {
  const validFrom = avail.valid_from ? dayjs(avail.valid_from) : null
  const validUntil = avail.valid_until ? dayjs(avail.valid_until) : null
  if (validFrom && date.isBefore(validFrom, 'day')) return false
  if (validUntil && date.isAfter(validUntil, 'day')) return false
  const excludedDays = Array.isArray(avail.excluded_days)
    ? avail.excluded_days
    : typeof avail.excluded_days === 'string'
      ? JSON.parse(avail.excluded_days || '[]')
      : []
  if (avail.exclude_weekends && (date.day() === 0 || date.day() === 6)) return false
  if (excludedDays.includes(date.day())) return false
  const rt = avail.recurrence_type
  if (rt === 'daily') return true
  if (rt === 'weekly') return avail.day_of_week === date.day()
  if (rt === 'monthly') return validFrom && validFrom.date() === date.date()
  if (rt === 'once') return validFrom && date.isSame(validFrom, 'day')
  // no recurrence — treat as once
  return validFrom ? date.isSame(validFrom, 'day') : false
}

function availableAtHour(avail, hour) {
  const sh = parseInt((avail.start_time || '00:00').split(':')[0])
  const eh = parseInt((avail.end_time || '00:00').split(':')[0])
  return hour >= sh && hour < eh
}

// ─── PillSelect ──────────────────────────────────────────────────────────────
function PillSelect({ value, onChange, label, placeholder, icon: Icon, children, minWidth = 145 }) {
  const active = Boolean(value)
  const theme = useTheme()
  return (
    <TextField
      select
      size="small"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      SelectProps={{
        displayEmpty: true,
        renderValue: (val) => {
          if (!val && placeholder)
            return (
              <span style={{ color: theme.palette.text.secondary, fontWeight: 500 }}>{placeholder}</span>
            )
          const childArr = Array.isArray(children) ? children.flat() : [children]
          const match = childArr.find((c) => c?.props?.value === val)
          return match?.props?.children ?? val
        },
      }}
      sx={{
        minWidth,
        '& .MuiOutlinedInput-root': {
          borderRadius: '22px',
          bgcolor: active ? (t) => alpha(t.palette.primary.main, 0.08) : 'action.hover',
          transition: 'all 0.15s ease',
          '& fieldset': { borderColor: active ? (t) => alpha(t.palette.primary.main, 0.4) : 'divider', transition: 'border-color 0.15s' },
          '&:hover fieldset': { borderColor: 'primary.main' },
          '&.Mui-focused fieldset': { borderColor: 'primary.main', borderWidth: 1.5 },
        },
        '& .MuiSelect-select': {
          color: active ? 'primary.main' : 'text.secondary',
          fontWeight: active ? 700 : 500,
          fontSize: '0.82rem',
          py: '7px',
          fontFamily: "'Plus Jakarta Sans', sans-serif",
        },
        '& .MuiSvgIcon-root.MuiSelect-icon': { color: active ? 'primary.main' : 'text.disabled' },
      }}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start" sx={{ mr: 0.25 }}>
            <Icon sx={{ fontSize: '0.9rem', color: active ? 'primary.main' : 'text.disabled', transition: 'color 0.15s' }} />
          </InputAdornment>
        ),
      }}
    >
      {children}
    </TextField>
  )
}

// ─── RoomView ────────────────────────────────────────────────────────────────
function RoomView({ date, rooms, appointments, availability, onEventClick }) {
  const theme = useTheme()
  const dateStr = dayjs(date).format('YYYY-MM-DD')
  const dayAppts = useMemo(
    () =>
      appointments.filter((evt) => {
        const s = dayjs(evt.start).format('YYYY-MM-DD')
        return s === dateStr && !evt.extendedProps?.isBlocked
      }),
    [appointments, dateStr],
  )

  const getRoomAvails = useCallback(
    (roomId) => (availability || []).filter((a) => a.room?.id === roomId && isAvailInRange(a, dayjs(date))),
    [availability, date],
  )

  const getApptAtHour = (roomId, hour) =>
    dayAppts.filter(
      (e) =>
        dayjs(e.start).hour() === hour &&
        (e.extendedProps?.roomId === roomId || e.extendedProps?.room === rooms.find((r) => r.id === roomId)?.name),
    )

  const colTemplate = `80px repeat(${rooms.length}, 1fr)`

  return (
    <Box sx={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 'calc(100vh - 280px)' }}>
      <Box sx={{ minWidth: rooms.length * 160 + 80 }}>
        {/* Header row */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: colTemplate,
            borderBottom: '2px solid',
            borderBottomColor: 'divider',
            position: 'sticky',
            top: 0,
            bgcolor: 'background.paper',
            zIndex: 2,
          }}
        >
          <Box sx={{ p: 1.5, borderRight: '1px solid', borderRightColor: 'divider', bgcolor: 'action.hover' }}>
            <Typography variant="caption" fontWeight={700} color="text.secondary">
              TIME
            </Typography>
          </Box>
          {rooms.map((room) => {
            const avails = getRoomAvails(room.id)
            return (
              <Box key={room.id} sx={{ p: 1.5, textAlign: 'center', borderRight: '1px solid', borderRightColor: 'divider', bgcolor: 'action.hover' }}>
                <Typography variant="body2" fontWeight={700} color="text.primary">
                  {room.name}
                </Typography>
                {avails.map((a) => (
                  <Box
                    key={a.id}
                    sx={{ mt: 0.5, display: 'inline-block', bgcolor: (t) => alpha(t.palette.info.main, 0.12), borderRadius: 1, px: 0.75, py: 0.25 }}
                  >
                    <Typography variant="caption" sx={{ color: 'info.main', fontWeight: 700, fontSize: '0.68rem' }}>
                      {a.clinician?.first_name?.charAt(0)}
                      {a.clinician?.last_name?.charAt(0)} · {(a.start_time || '').slice(0, 5)}–{(a.end_time || '').slice(0, 5)}
                    </Typography>
                  </Box>
                ))}
              </Box>
            )
          })}
        </Box>

        {/* Hour rows */}
        {ROOM_VIEW_HOURS.map((hour) => (
          <Box key={hour} sx={{ display: 'grid', gridTemplateColumns: colTemplate, borderBottom: '1px solid', borderBottomColor: 'divider' }}>
            {/* Time label */}
            <Box
              sx={{
                p: 1,
                pr: 1.5,
                borderRight: '1px solid',
                borderRightColor: 'divider',
                textAlign: 'right',
                bgcolor: 'action.hover',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'flex-end',
              }}
            >
              <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 600, mt: 0.5 }}>
                {hour < 10 ? `0${hour}` : hour}:00
              </Typography>
            </Box>
            {/* Room cells */}
            {rooms.map((room) => {
              const avails = getRoomAvails(room.id).filter((a) => availableAtHour(a, hour))
              const appts = getApptAtHour(room.id, hour)
              const hasAvail = avails.length > 0
              return (
                <Box
                  key={room.id}
                  sx={{
                    p: 0.5,
                    borderRight: '1px solid',
                    borderRightColor: 'divider',
                    minHeight: 72,
                    bgcolor: hasAvail && appts.length === 0 ? (t) => alpha(t.palette.info.main, 0.04) : 'background.paper',
                    position: 'relative',
                    transition: 'background 0.15s',
                  }}
                >
                  {/* Availability hint */}
                  {hasAvail && appts.length === 0 && (
                    <Tooltip title={avails.map((a) => `${a.clinician?.full_name || ''}`).join(', ')} placement="top">
                      <Box sx={{ position: 'absolute', top: 4, left: 4, display: 'flex', alignItems: 'center', gap: 0.25 }}>
                        {avails.slice(0, 2).map((a) => (
                          <Box
                            key={a.id}
                            sx={{
                              width: 20,
                              height: 20,
                              borderRadius: '50%',
                              bgcolor: (t) => alpha(t.palette.primary.main, 0.15),
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Typography sx={{ fontSize: '0.6rem', fontWeight: 800, color: 'primary.main' }}>
                              {a.clinician?.first_name?.charAt(0)}
                              {a.clinician?.last_name?.charAt(0)}
                            </Typography>
                          </Box>
                        ))}
                        {avails.length > 2 && <Typography sx={{ fontSize: '0.6rem', color: 'primary.main' }}>+{avails.length - 2}</Typography>}
                      </Box>
                    </Tooltip>
                  )}
                  {/* Appointment cards */}
                  {appts.map((evt) => {
                    const s = evt.extendedProps?.status
                    const meta = theme.palette.appointmentStatus[s] ?? theme.palette.appointmentStatus.confirmed
                    const c = { bg: meta.bg, border: meta.dot, text: meta.text }
                    return (
                      <Box
                        key={evt.id}
                        onClick={() => onEventClick(evt.id)}
                        sx={{
                          width: '100%',
                          bgcolor: c.bg,
                          border: `1px solid ${c.border}`,
                          borderRadius: 1.5,
                          p: '4px 6px',
                          mb: 0.5,
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                          '&:hover': { boxShadow: `0 2px 8px ${c.border}40`, transform: 'translateY(-1px)' },
                        }}
                      >
                        <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: c.text }}>
                          {dayjs(evt.start).format('h:mm A')}
                        </Typography>
                        <Typography sx={{ fontSize: '0.7rem', color: c.text, fontWeight: 500 }} noWrap>
                          {evt.extendedProps?.patient}
                        </Typography>
                        {evt.extendedProps?.clinician && (
                          <Typography sx={{ fontSize: '0.65rem', color: 'text.secondary' }} noWrap>
                            {evt.extendedProps.clinician}
                          </Typography>
                        )}
                        {/* NEW-CAL-016: apptType chip in Room View card */}
                        {evt.extendedProps?.apptType && evt.extendedProps.apptType !== 'in_person' && (
                          <Box
                            sx={{
                              mt: 0.2,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 0.25,
                              bgcolor: (t) => alpha(t.palette.primary.main, 0.09),
                              borderRadius: 0.75,
                              px: 0.5,
                              py: '1px',
                            }}
                          >
                            {evt.extendedProps.apptType === 'video' ? (
                              <VideocamRoundedIcon sx={{ fontSize: '0.58rem', color: 'primary.main' }} />
                            ) : (
                              <DirectionsCarRoundedIcon sx={{ fontSize: '0.58rem', color: 'primary.main' }} />
                            )}
                            <Typography sx={{ fontSize: '0.58rem', fontWeight: 700, color: 'primary.main' }}>
                              {evt.extendedProps.apptType === 'video' ? 'Video' : 'Home Visit'}
                            </Typography>
                          </Box>
                        )}
                        <Box sx={{ mt: 0.25, display: 'inline-block', bgcolor: `${c.border}22`, borderRadius: 0.75, px: 0.5 }}>
                          <Typography sx={{ fontSize: '0.6rem', fontWeight: 700, color: c.text, textTransform: 'capitalize' }}>
                            {s?.replace('_', ' ')}
                          </Typography>
                        </Box>
                      </Box>
                    )
                  })}
                </Box>
              )
            })}
          </Box>
        ))}
      </Box>
    </Box>
  )
}

// ─── CalendarPage ─────────────────────────────────────────────────────────────
export default function CalendarPage() {
  const navigate = useNavigate()
  const { enqueueSnackbar } = useSnackbar()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  // ── Standard filters ─────────────────────────────────────────────────────
  const [filterClinician, setFilterClinician] = useState('')
  const [filterClinic, setFilterClinic] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterType, setFilterType] = useState('') // BUG-CAL-004: add type filter

  // ── Calendar view state ───────────────────────────────────────────────────
  const calendarRef = useRef(null)
  const [currentView, setCurrentView] = useState('dayGridMonth')

  // ── Room View state ───────────────────────────────────────────────────────
  const [roomViewDate, setRoomViewDate] = useState(dayjs())
  const [roomViewClinicId, setRoomViewClinicId] = useState('')
  const [roomViewRoomIds, setRoomViewRoomIds] = useState([]) // [] = all rooms selected
  const isRoomView = currentView === 'resourceDay'

  // ── Drawer state ──────────────────────────────────────────────────────────
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedId, setSelectedId] = useState(null)

  // ── SUG-CAL-005: Today's Schedule panel ──────────────────────────────────
  const [todayOpen, setTodayOpen] = useState(true)

  // ── NEW-CAL-015: Jump to Date state ──────────────────────────────────────
  const [jumpDateOpen, setJumpDateOpen] = useState(false)
  const jumpInputRef = useRef(null)

  // ── BUG019: visible date range, reported by FullCalendar's own datesSet
  // callback. Seeded to the current month so the very first query is already
  // bounded, before FullCalendar fires its own callback on mount.
  const [dateRange, setDateRange] = useState(() => ({
    from: dayjs().startOf('month').format('YYYY-MM-DD'),
    to: dayjs().endOf('month').format('YYYY-MM-DD'),
  }))
  const handleVisibleRangeChange = useCallback((dateInfo) => {
    setDateRange({
      from: dayjs(dateInfo.start).format('YYYY-MM-DD'),
      // FullCalendar's `end` is exclusive (midnight of the day after the
      // visible range); using it as-is over-includes by one day rather than
      // risking hiding events on the last visible day.
      to: dayjs(dateInfo.end).format('YYYY-MM-DD'),
    })
  }, [])

  // ── Build GraphQL filters ─────────────────────────────────────────────────
  const buildFilters = useCallback(() => {
    const f = { date_from: dateRange.from, date_to: dateRange.to }
    if (filterClinician) f.clinician_id = filterClinician
    if (filterClinic) f.clinic_id = filterClinic
    if (filterStatus) f.status = filterStatus
    return f
  }, [dateRange, filterClinician, filterClinic, filterStatus])

  // ── Appointments query ────────────────────────────────────────────────────
  const { data, loading, error, refetch, client } = useQuery(APPOINTMENTS_QUERY, {
    variables: { filters: buildFilters(), first: 500, page: 1 },
    fetchPolicy: 'cache-and-network',
    pollInterval: 30_000,
  })

  // ── Clinicians + Clinics ──────────────────────────────────────────────────
  const { data: cliniciansData, error: cliniciansError } = useQuery(CLINICIANS_QUERY, { variables: { first: 100, is_active: true } })
  const { data: clinicsData, error: clinicsError } = useQuery(CLINICS_QUERY)
  // Fall back to mock options only on a real query error -- a genuinely
  // empty real list (e.g. an org with zero active clinicians/clinics) is a
  // valid state, not a reason to populate filters with fake entities.
  const clinicians = cliniciansError ? MockStore.getClinicians() : (cliniciansData?.clinicians?.data ?? [])
  const rawClinics = clinicsData?.clinics ?? []
  const MOCK_CLINICS = [
    { id: 'clinic-1', name: 'Meridian Central', is_active: true },
    { id: 'clinic-2', name: 'Northside Medical', is_active: true },
    { id: 'clinic-3', name: 'Eastbrook Health', is_active: true },
  ]
  const clinics = (clinicsError ? MOCK_CLINICS : rawClinics).filter((c) => c.is_active)

  // ── Rooms (for Room View) ─────────────────────────────────────────────────
  const { data: roomsData, error: roomsError } = useQuery(ROOMS_QUERY, {
    variables: { clinic_id: roomViewClinicId || undefined },
    skip: !isRoomView,
  })
  const rawRooms = (roomsData?.rooms ?? []).filter((r) => r.is_active)
  // Fallback to mock rooms only on a real query error, same reasoning.
  const MOCK_ROOM_OBJECTS = MOCK_ROOMS.map((name, i) => ({ id: `mock-room-${name.replace(/\s/g, '-')}`, name, is_active: true }))
  const allRooms = roomsError ? MOCK_ROOM_OBJECTS : rawRooms
  const visibleRooms = roomViewRoomIds.length > 0 ? allRooms.filter((r) => roomViewRoomIds.includes(r.id)) : allRooms

  // ── Availability (for Room View overlay) ─────────────────────────────────
  const { data: availData } = useQuery(AVAILABILITIES_QUERY, {
    variables: {
      clinic_id: roomViewClinicId || undefined,
      room_ids: roomViewRoomIds.length > 0 ? roomViewRoomIds : undefined,
      start_date: roomViewDate.format('YYYY-MM-DD'),
      end_date: roomViewDate.format('YYYY-MM-DD'),
    },
    skip: !isRoomView,
    fetchPolicy: 'network-only',
  })
  const availability = availData?.availabilities?.data ?? []

  // ── Real-time subscription ────────────────────────────────────────────────
  useSubscription(APPOINTMENT_UPDATED_SUBSCRIPTION, {
    variables: filterClinician ? { clinician_id: filterClinician } : {},
    onData: ({ data: subData }) => {
      const updated = subData?.data?.appointmentUpdated
      if (!updated) return
      client.cache.modify({
        id: client.cache.identify({ __typename: 'Appointment', id: updated.id }),
        fields: {
          status: () => updated.status,
          start_datetime: () => updated.start_datetime,
          end_datetime: () => updated.end_datetime,
          notes: () => updated.notes,
        },
      })
      enqueueSnackbar(`${updated.patient?.full_name ?? 'An appointment'} was updated — ${updated.status.replace('_', ' ')}`, {
        variant: 'info',
        autoHideDuration: 4000,
        anchorOrigin: { vertical: 'top', horizontal: 'right' },
      })
    },
  })

  // ── Events ────────────────────────────────────────────────────────────────
  // Fall back to generated mock events only on a real query error -- a
  // legitimately empty real result (e.g. every appointment filtered out by
  // clinician/clinic/status) is a valid "nothing scheduled" calendar state,
  // not a reason to pad it with a month of fabricated events.
  const appointments = data?.appointments?.data ?? []
  const realEvents = appointments.map(toCalendarEvent)
  const events = error ? generateMockCalendarData(theme) : realEvents

  // ── Status counts ─────────────────────────────────────────────────────────
  const realAppts = events.filter((e) => !e.extendedProps?.isBlocked)
  const statusCounts = {
    confirmed: realAppts.filter((e) => e.extendedProps?.status === 'confirmed').length,
    pending: realAppts.filter((e) => e.extendedProps?.status === 'pending').length,
    cancelled: realAppts.filter((e) => e.extendedProps?.status === 'cancelled').length,
  }

  // ── SUG-CAL-005: Today's appointments sorted by start time ───────────────
  const todayEvents = useMemo(() => {
    const todayStr = dayjs().format('YYYY-MM-DD')
    return realAppts
      .filter((e) => {
        const s = e.start ?? e.extendedProps?.start
        return s && dayjs(s).format('YYYY-MM-DD') === todayStr
      })
      .sort((a, b) => dayjs(a.start).valueOf() - dayjs(b.start).valueOf())
  }, [realAppts])

  // ── Popover state (replaces drawer) ──────────────────────────────────────
  const [popoverAnchor, setPopoverAnchor] = useState(null)
  const [popoverEvent, setPopoverEvent] = useState(null)

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleEventClick = (id, anchorEl, eventData) => {
    // anchorEl may be passed from CalendarView; fall back to a center anchor
    setPopoverEvent(eventData ?? events.find((e) => e.id === id) ?? { id })
    setPopoverAnchor(anchorEl ?? document.getElementById('calendar-container'))
    setSelectedId(id)
  }
  const handleSlotClick = (dateStr) => navigate(`/appointments/new?date=${encodeURIComponent(dateStr)}`)
  const handleClearFilters = () => {
    setFilterClinician('')
    setFilterClinic('')
    setFilterStatus('')
    setFilterType('')
  }
  const anyFilterActive = filterClinician || filterClinic || filterStatus || filterType
  const activeFilterCount = [filterClinician, filterClinic, filterStatus, filterType].filter(Boolean).length

  // NEW-CAL-011: Escape key closes the event popover
  useEffect(() => {
    if (!popoverEvent) return
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setPopoverAnchor(null)
        setPopoverEvent(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [popoverEvent])

  // NEW-CAL-014: Keyboard shortcuts to switch views (M/W/D/L/R)
  // Only fires when the user is NOT typing in an input/textarea/select
  useEffect(() => {
    const SHORTCUT_MAP = {
      m: 'dayGridMonth',
      w: 'timeGridWeek',
      d: 'timeGridDay',
      l: 'listWeek',
      r: 'resourceDay',
    }
    const onKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT' || e.target.isContentEditable)
        return
      if (e.altKey || e.ctrlKey || e.metaKey) return
      const view = SHORTCUT_MAP[e.key.toLowerCase()]
      if (view) handleViewChange(null, view)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // ── BUG-CAL-001 FIX: Filtered events ─────────────────────────────────────
  const filteredEvents = useMemo(() => {
    let result = events.filter((e) => !e.extendedProps?.isBlocked)
    if (filterClinician) result = result.filter((e) => e.extendedProps?.clinicianId === filterClinician)
    if (filterStatus) result = result.filter((e) => e.extendedProps?.status?.toLowerCase() === filterStatus.toLowerCase())
    if (filterType) result = result.filter((e) => e.extendedProps?.apptType === filterType)
    // Clinic filter: only applies when using real store events (which have clinicId)
    if (filterClinic) result = result.filter((e) => !e.extendedProps?.clinicId || e.extendedProps?.clinicId === filterClinic)
    // Re-add background events (lunch blocks etc.) unless status/type filter active
    const bgEvents = filterStatus || filterType ? [] : events.filter((e) => e.extendedProps?.isBlocked)
    return [...result, ...bgEvents]
  }, [events, filterClinician, filterClinic, filterStatus, filterType])

  const handleViewChange = (_, newView) => {
    if (!newView) return
    if (newView !== 'resourceDay') {
      calendarRef.current?.getApi().changeView(newView)
    }
    setCurrentView(newView)
  }

  const toggleRoom = (roomId) => {
    setRoomViewRoomIds((prev) => (prev.includes(roomId) ? prev.filter((id) => id !== roomId) : [...prev, roomId]))
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <Box className="page-enter" sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <Helmet>
        <title>Calendar — MediBook</title>
      </Helmet>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <Box
        sx={{
          display: 'flex',
          alignItems: { xs: 'flex-start', sm: 'center' },
          justifyContent: 'space-between',
          flexDirection: { xs: 'column', sm: 'row' },
          gap: { xs: 2, sm: 0 },
          mb: 2.5,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: 2.5,
              background: (t) => `linear-gradient(135deg, ${alpha(t.palette.primary.main, 0.12)} 0%, ${alpha(t.palette.primary.main, 0.20)} 100%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <CalendarMonthRoundedIcon sx={{ color: 'primary.main', fontSize: '1.3rem' }} />
          </Box>
          <Box>
            <Typography variant="h4" fontWeight={800} sx={{ color: 'text.primary', fontSize: { xs: '1.35rem', sm: '1.6rem' }, lineHeight: 1 }}>
              Calendar
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.3 }}>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {loading ? 'Loading…' : `${events.length.toLocaleString()} appointment${events.length !== 1 ? 's' : ''}`}
              </Typography>
              {loading && <CircularProgress size={14} thickness={5} sx={{ color: 'primary.main' }} />}
            </Box>
          </Box>
          {/* Today's Schedule toggle badge (SUG-CAL-005) */}
          {!isMobile && (
            <Tooltip title={todayOpen ? "Hide Today's Schedule" : "Show Today's Schedule"} placement="bottom">
              <Badge
                badgeContent={todayEvents.length}
                color="error"
                sx={{ cursor: 'pointer', '& .MuiBadge-badge': { bgcolor: 'primary.main', fontSize: '0.65rem', minWidth: 16, height: 16 } }}
                onClick={() => setTodayOpen((v) => !v)}
              >
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: 2,
                    bgcolor: todayOpen ? (t) => alpha(t.palette.primary.main, 0.12) : 'action.hover',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: todayOpen ? (t) => `1.5px solid ${alpha(t.palette.primary.main, 0.3)}` : '1.5px solid',
                    borderColor: todayOpen ? undefined : 'divider',
                    transition: 'all 0.2s',
                    '&:hover': { bgcolor: (t) => alpha(t.palette.primary.main, 0.12), borderColor: (t) => alpha(t.palette.primary.main, 0.3) },
                  }}
                >
                  <TodayRoundedIcon sx={{ fontSize: '1.1rem', color: todayOpen ? 'primary.main' : 'text.disabled' }} />
                </Box>
              </Badge>
            </Tooltip>
          )}
          {/* NEW-CAL-015: Jump to Date button */}
          {!isMobile && (
            <Tooltip title="Jump to date (click to pick)" placement="bottom">
              <Box sx={{ position: 'relative' }}>
                <Box
                  onClick={() => {
                    setJumpDateOpen((v) => !v)
                    setTimeout(() => jumpInputRef.current?.showPicker?.(), 50)
                  }}
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: 2,
                    bgcolor: jumpDateOpen ? (t) => alpha(t.palette.primary.main, 0.12) : 'action.hover',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    border: jumpDateOpen ? (t) => `1.5px solid ${alpha(t.palette.primary.main, 0.3)}` : '1.5px solid',
                    borderColor: jumpDateOpen ? undefined : 'divider',
                    transition: 'all 0.2s',
                    '&:hover': { bgcolor: (t) => alpha(t.palette.primary.main, 0.12), borderColor: (t) => alpha(t.palette.primary.main, 0.3) },
                  }}
                >
                  <EventAvailableRoundedIcon sx={{ fontSize: '1.1rem', color: jumpDateOpen ? 'primary.main' : 'text.disabled' }} />
                </Box>
                {/* Native date input — visually hidden, triggered via .showPicker() */}
                <input
                  ref={jumpInputRef}
                  type="date"
                  defaultValue={dayjs().format('YYYY-MM-DD')}
                  style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: 1, height: 1, top: 0, left: 0 }}
                  onChange={(e) => {
                    if (!e.target.value) return
                    const target = dayjs(e.target.value)
                    if (!target.isValid()) return
                    // Navigate FullCalendar to the picked date
                    if (currentView !== 'resourceDay') {
                      calendarRef.current?.getApi().gotoDate(target.toDate())
                    } else {
                      setRoomViewDate(target)
                    }
                    setJumpDateOpen(false)
                  }}
                />
              </Box>
            </Tooltip>
          )}
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
          {/* Mobile-only view Select — BUG-CAL-003 FIX */}
          <Select
            value={currentView}
            onChange={(e) => handleViewChange(null, e.target.value)}
            size="small"
            sx={{
              display: { xs: 'flex', sm: 'none' },
              borderRadius: '12px',
              fontSize: '0.78rem',
              fontWeight: 700,
              bgcolor: 'action.hover',
              minWidth: 110,
              '& fieldset': { border: 'none' },
              '& .MuiSelect-select': { py: '6px', fontWeight: 700, color: 'primary.main' },
            }}
          >
            <MenuItem value="dayGridMonth">Month</MenuItem>
            <MenuItem value="timeGridWeek">Week</MenuItem>
            <MenuItem value="timeGridDay">Day</MenuItem>
            <MenuItem value="listWeek">List</MenuItem>
            <MenuItem value="resourceDay">Room</MenuItem>
          </Select>

          {/* Desktop-only ToggleButtonGroup */}
          <ToggleButtonGroup
            value={currentView}
            exclusive
            onChange={handleViewChange}
            size="small"
            sx={{
              bgcolor: 'action.hover',
              borderRadius: '12px',
              p: '4px',
              gap: '2px',
              border: 'none',
              display: { xs: 'none', sm: 'flex' },
              '& .MuiToggleButtonGroup-grouped': { border: 'none !important', mx: 0 },
              '& .MuiToggleButton-root': {
                border: 'none !important',
                borderRadius: '8px !important',
                px: 1.75,
                py: 0.65,
                fontSize: '0.78rem',
                fontWeight: 700,
                color: 'text.secondary',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                textTransform: 'none',
                transition: 'all 0.18s ease',
                minWidth: 52,
                '&.Mui-selected': { bgcolor: 'background.paper', color: 'primary.main', boxShadow: '0 1px 5px rgba(32,33,36,0.16)' },
                '&:hover:not(.Mui-selected)': { bgcolor: 'divider' },
              },
            }}
          >
            <ToggleButton value="dayGridMonth">Month</ToggleButton>
            <ToggleButton value="timeGridWeek">Week</ToggleButton>
            <ToggleButton value="timeGridDay">Day</ToggleButton>
            <ToggleButton value="listWeek">List</ToggleButton>
            <ToggleButton value="resourceDay">
              <MeetingRoomRoundedIcon sx={{ fontSize: '0.9rem', mr: 0.5 }} />
              Room
            </ToggleButton>
          </ToggleButtonGroup>

          {/* New Booking — hidden on mobile (FAB provided instead) */}
          <Button
            variant="contained"
            startIcon={<AddRoundedIcon />}
            onClick={() => navigate('/appointments/new')}
            sx={{
              borderRadius: 2.5,
              px: 2.5,
              py: 0.9,
              fontWeight: 700,
              textTransform: 'none',
              fontSize: '0.875rem',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              background: (t) => `linear-gradient(135deg, ${t.palette.primary.light} 0%, ${t.palette.primary.main} 100%)`,
              boxShadow: '0 2px 8px rgba(0,109,119,0.30)',
              display: { xs: 'none', sm: 'flex' },
              '&:hover': {
                background: (t) => `linear-gradient(135deg, ${t.palette.primary.main} 0%, ${t.palette.primary.dark} 100%)`,
                boxShadow: '0 4px 14px rgba(0,109,119,0.40)',
                transform: 'translateY(-1px)',
              },
              transition: 'all 0.2s ease',
            }}
          >
            New Booking
          </Button>
        </Box>
      </Box>

      {/* ── Filter row (standard views) ──────────────────────────────────── */}
      {!isRoomView && (
        <Box
          sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5, flexWrap: { xs: 'wrap', sm: 'nowrap' }, overflowX: { sm: 'auto' } }}
        >
          <PillSelect value={filterClinician} onChange={setFilterClinician} icon={PersonRoundedIcon} placeholder="All Clinicians">
            <MenuItem value="">All Clinicians</MenuItem>
            {clinicians.map((c) => (
              <MenuItem key={c.id} value={c.id}>
                {c.full_name}
              </MenuItem>
            ))}
          </PillSelect>

          <PillSelect value={filterClinic} onChange={setFilterClinic} icon={LocalHospitalRoundedIcon} placeholder="All Clinics">
            <MenuItem value="">All Clinics</MenuItem>
            {clinics.map((c) => (
              <MenuItem key={c.id} value={c.id}>
                {c.name}
              </MenuItem>
            ))}
          </PillSelect>

          <TextField
            select
            size="small"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            SelectProps={{
              displayEmpty: true,
              renderValue: (val) => {
                const color = val ? statusDot(theme, val) : theme.palette.text.disabled
                return (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <FiberManualRecordIcon sx={{ fontSize: '0.70rem', color, flexShrink: 0 }} />
                    <span>{STATUS_LABELS[val] ?? 'All Statuses'}</span>
                  </Box>
                )
              },
            }}
            sx={{
              minWidth: 145,
              '& .MuiOutlinedInput-root': {
                borderRadius: '22px',
                bgcolor: filterStatus ? (t) => alpha(t.palette.primary.main, 0.08) : 'action.hover',
                '& fieldset': { borderColor: filterStatus ? (t) => alpha(t.palette.primary.main, 0.4) : 'divider' },
                '&:hover fieldset': { borderColor: 'primary.main' },
                '&.Mui-focused fieldset': { borderColor: 'primary.main', borderWidth: 1.5 },
              },
              '& .MuiSelect-select': {
                color: filterStatus ? 'primary.main' : 'text.secondary',
                fontWeight: filterStatus ? 700 : 500,
                fontSize: '0.82rem',
                py: '7px',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
              },
            }}
          >
            {STATUS_OPTIONS.map((s) => (
              <MenuItem key={s} value={s}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {s && <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: statusDot(theme, s), flexShrink: 0 }} />}
                  {STATUS_LABELS[s]}
                </Box>
              </MenuItem>
            ))}
          </TextField>

          {/* BUG-CAL-004 FIX: Appointment Type filter */}
          <PillSelect value={filterType} onChange={setFilterType} icon={VideocamRoundedIcon} placeholder="All Types" minWidth={130}>
            {TYPE_OPTIONS.map((t) => (
              <MenuItem key={t} value={t}>
                {TYPE_LABELS[t]}
              </MenuItem>
            ))}
          </PillSelect>

          {anyFilterActive && (
            <Chip
              label={`Clear${activeFilterCount > 1 ? ` (${activeFilterCount})` : ''}`}
              size="small"
              icon={<ClearRoundedIcon sx={{ fontSize: '0.78rem !important' }} />}
              onClick={handleClearFilters}
              sx={{
                bgcolor: (t) => alpha(t.palette.error.main, 0.12),
                color: 'error.main',
                fontWeight: 700,
                fontSize: '0.75rem',
                border: (t) => `1px solid ${alpha(t.palette.error.main, 0.20)}`,
                borderRadius: '20px',
                '&:hover': { bgcolor: (t) => alpha(t.palette.error.main, 0.22) },
                '& .MuiChip-icon': { color: 'error.main' },
              }}
            />
          )}

          <Box sx={{ ml: 'auto', display: { xs: 'none', md: 'flex' }, gap: 0.75, flexShrink: 0 }}>
            {['confirmed', 'pending', 'cancelled'].map((key) => {
              const meta = theme.palette.appointmentStatus[key]
              return (
                statusCounts[key] > 0 && (
                  <Chip
                    key={key}
                    label={`${statusCounts[key]} ${STATUS_LABELS[key]}`}
                    size="small"
                    sx={{
                      bgcolor: meta.bg,
                      color: meta.text,
                      fontWeight: 700,
                      fontSize: '0.72rem',
                      borderRadius: '20px',
                      border: `1px solid ${meta.border}`,
                      height: 24,
                    }}
                  />
                )
              )
            })}
          </Box>
        </Box>
      )}

      {/* ── SUG-CAL-007: Status Legend Strip ─────────────────────────────── */}
      {!isRoomView && (
        <Box sx={{ display: { xs: 'none', sm: 'flex' }, gap: 2, mb: 1.5, px: 0.5, flexWrap: 'wrap' }}>
          {[
            { label: 'Confirmed', color: theme.palette.appointmentStatus.confirmed.dot },
            { label: 'Pending', color: theme.palette.appointmentStatus.pending.dot },
            { label: 'Cancelled', color: theme.palette.appointmentStatus.cancelled.dot },
            { label: 'Completed', color: theme.palette.appointmentStatus.completed.dot },
            { label: 'No Show', color: theme.palette.appointmentStatus.no_show.dot },
          ].map(({ label, color }) => (
            <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: color, flexShrink: 0 }} />
              <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.72rem', fontWeight: 600 }}>
                {label}
              </Typography>
            </Box>
          ))}
        </Box>
      )}

      {/* ── Room View controls (clinic selector + room chips + date nav) ── */}
      {isRoomView && (
        <Box sx={{ mb: 2 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }} flexWrap="wrap">
            {/* Clinic picker */}
            <PillSelect
              value={roomViewClinicId}
              onChange={(v) => {
                setRoomViewClinicId(v)
                setRoomViewRoomIds([])
              }}
              icon={LocalHospitalRoundedIcon}
              minWidth={180}
              placeholder="All Clinics"
            >
              <MenuItem value="">All Clinics</MenuItem>
              {clinics.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.name}
                </MenuItem>
              ))}
            </PillSelect>

            {/* Date navigation */}
            <Stack direction="row" spacing={0.5} alignItems="center">
              <Chip
                label="‹"
                size="small"
                onClick={() => setRoomViewDate((d) => d.subtract(1, 'day'))}
                sx={{ cursor: 'pointer', fontWeight: 700, borderRadius: '10px', bgcolor: 'action.hover', '&:hover': { bgcolor: 'divider' } }}
              />
              <Chip
                label={roomViewDate.isSame(dayjs(), 'day') ? 'Today' : roomViewDate.format('ddd, DD MMM')}
                size="small"
                onClick={() => setRoomViewDate(dayjs())}
                sx={{
                  cursor: 'pointer',
                  fontWeight: 700,
                  borderRadius: '10px',
                  bgcolor: roomViewDate.isSame(dayjs(), 'day') ? (t) => alpha(t.palette.primary.main, 0.10) : 'action.hover',
                  color: roomViewDate.isSame(dayjs(), 'day') ? 'primary.main' : 'inherit',
                  '&:hover': { bgcolor: 'divider' },
                }}
              />
              <Chip
                label="›"
                size="small"
                onClick={() => setRoomViewDate((d) => d.add(1, 'day'))}
                sx={{ cursor: 'pointer', fontWeight: 700, borderRadius: '10px', bgcolor: 'action.hover', '&:hover': { bgcolor: 'divider' } }}
              />
            </Stack>

            {/* Room toggles */}
            {allRooms.length > 0 && (
              <>
                <Divider orientation="vertical" flexItem />
                <Stack direction="row" spacing={0.5} flexWrap="wrap">
                  {allRooms.map((room) => {
                    const selected = roomViewRoomIds.length === 0 || roomViewRoomIds.includes(room.id)
                    return (
                      <Chip
                        key={room.id}
                        label={room.name}
                        size="small"
                        onClick={() => toggleRoom(room.id)}
                        sx={{
                          cursor: 'pointer',
                          fontWeight: 600,
                          fontSize: '0.75rem',
                          borderRadius: '20px',
                          transition: 'all 0.15s',
                          bgcolor: selected ? 'primary.main' : 'action.hover',
                          color: selected ? 'primary.contrastText' : 'text.secondary',
                          '&:hover': { bgcolor: selected ? 'primary.dark' : 'divider' },
                        }}
                      />
                    )
                  })}
                  {roomViewRoomIds.length > 0 && (
                    <Chip
                      label="Show All"
                      size="small"
                      onClick={() => setRoomViewRoomIds([])}
                      variant="outlined"
                      sx={{ cursor: 'pointer', fontWeight: 600, fontSize: '0.75rem', borderRadius: '20px' }}
                    />
                  )}
                </Stack>
              </>
            )}
          </Stack>

          {/* Availability legend */}
          <Stack direction="row" spacing={2} sx={{ mt: 1 }} alignItems="center">
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: (t) => alpha(t.palette.info.main, 0.3) }} />
              <Typography variant="caption" color="text.secondary">
                Clinician available (no appointment)
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box sx={{ width: 12, height: 12, borderRadius: 1, bgcolor: 'success.main' }} />
              <Typography variant="caption" color="text.secondary">
                Confirmed
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box sx={{ width: 12, height: 12, borderRadius: 1, bgcolor: 'warning.main' }} />
              <Typography variant="caption" color="text.secondary">
                Pending
              </Typography>
            </Box>
          </Stack>
        </Box>
      )}

      {/* ── SUG-CAL-008: Full skeleton when loading ───────────────────────── */}
      {loading && (
        <Box sx={{ flex: 1, bgcolor: 'background.paper', borderRadius: 3, border: '1px solid #E8EAED', overflow: 'hidden', minHeight: 480, p: 2 }}>
          {/* Toolbar skeleton */}
          <Stack direction="row" spacing={1} mb={2} justifyContent="space-between" alignItems="center">
            <Stack direction="row" spacing={1}>
              <Skeleton variant="rounded" width={28} height={28} />
              <Skeleton variant="rounded" width={130} height={28} sx={{ borderRadius: '14px' }} />
              <Skeleton variant="rounded" width={60} height={28} sx={{ borderRadius: '14px' }} />
            </Stack>
            <Skeleton variant="rounded" width={180} height={28} sx={{ borderRadius: '14px' }} />
          </Stack>
          {/* Day-of-week headers */}
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.5, mb: 0.5 }}>
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} variant="rounded" height={24} sx={{ borderRadius: 1 }} />
            ))}
          </Box>
          {/* Calendar cells (5 weeks) */}
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.5 }}>
            {Array.from({ length: 35 }).map((_, i) => (
              <Box key={i} sx={{ borderRadius: 1.5, border: '1px solid #F1F3F4', p: 0.5, minHeight: 80 }}>
                <Skeleton variant="text" width={20} height={18} sx={{ mb: 0.5 }} />
                {Math.random() > 0.5 && <Skeleton variant="rounded" height={16} sx={{ mb: 0.4, borderRadius: 1 }} />}
                {Math.random() > 0.65 && <Skeleton variant="rounded" height={16} sx={{ mb: 0.4, borderRadius: 1 }} />}
                {Math.random() > 0.78 && <Skeleton variant="rounded" height={16} sx={{ borderRadius: 1 }} />}
              </Box>
            ))}
          </Box>
        </Box>
      )}

      {/* ── Calendar / Room View container + Today's Schedule sidebar ────── */}
      {!loading && (
        <Box sx={{ flex: 1, display: 'flex', gap: 2, minHeight: 0, alignItems: 'stretch' }}>
          {/* Main calendar */}
          <Box
            id="calendar-container"
            sx={{
              flex: 1,
              minWidth: 0,
              bgcolor: 'background.paper',
              borderRadius: 3,
              border: '1px solid #E8EAED',
              overflow: 'hidden',
              minHeight: 480,
              boxShadow: '0 1px 4px rgba(32,33,36,0.06), 0 4px 16px rgba(32,33,36,0.04)',
            }}
          >
            {isRoomView ? (
              <RoomView
                date={roomViewDate.toDate()}
                rooms={visibleRooms}
                appointments={filteredEvents}
                availability={availability}
                onEventClick={(id) =>
                  handleEventClick(
                    id,
                    null,
                    filteredEvents.find((e) => e.id === id),
                  )
                }
              />
            ) : (
              <CalendarView
                calendarRef={calendarRef}
                events={filteredEvents}
                onEventClick={(id, el, evtData) => handleEventClick(id, el, evtData)}
                onSlotClick={handleSlotClick}
                currentView={currentView}
                onViewChange={setCurrentView}
                onDatesSet={handleVisibleRangeChange}
              />
            )}
          </Box>

          {/* ── SUG-CAL-005: Today's Schedule sidebar ───────────────────── */}
          <Collapse
            in={todayOpen && !isMobile}
            orientation="horizontal"
            unmountOnExit
            sx={{ flexShrink: 0, '& .MuiCollapse-wrapperInner': { width: 272 } }}
          >
            <Box
              data-testid="today-schedule-panel"
              sx={{
                width: 272,
                height: '100%',
                bgcolor: 'background.paper',
                borderRadius: 3,
                border: '1px solid #E8EAED',
                boxShadow: '0 1px 4px rgba(32,33,36,0.06), 0 4px 16px rgba(32,33,36,0.04)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
            >
              {/* Panel header */}
              <Box
                sx={{
                  px: 2,
                  py: 1.5,
                  background: 'linear-gradient(135deg, rgba(0,109,119,0.07) 0%, rgba(0,109,119,0.12) 100%)',
                  borderBottom: '1px solid #E8EAED',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Stack direction="row" spacing={1} alignItems="center">
                  <EventNoteRoundedIcon sx={{ fontSize: '1rem', color: 'primary.main' }} />
                  <Box>
                    <Typography sx={{ fontWeight: 800, fontSize: '0.82rem', color: 'text.primary', lineHeight: 1 }}>Today's Schedule</Typography>
                    <Typography sx={{ fontSize: '0.68rem', color: 'text.secondary', fontWeight: 500 }}>{dayjs().format('ddd, DD MMM')}</Typography>
                  </Box>
                </Stack>
                <Stack direction="row" spacing={0.5} alignItems="center">
                  {todayEvents.length > 0 && (
                    <Chip
                      label={todayEvents.length}
                      size="small"
                      sx={{
                        bgcolor: 'primary.main',
                        color: 'primary.contrastText',
                        fontWeight: 800,
                        fontSize: '0.7rem',
                        height: 20,
                        minWidth: 20,
                        '& .MuiChip-label': { px: 0.75 },
                      }}
                    />
                  )}
                  <IconButton size="small" onClick={() => setTodayOpen(false)} sx={{ color: 'text.disabled', '&:hover': { color: 'primary.main' } }}>
                    <ChevronRightRoundedIcon sx={{ fontSize: '1rem' }} />
                  </IconButton>
                </Stack>
              </Box>

              {/* Appointment list */}
              <Box
                sx={{
                  flex: 1,
                  overflowY: 'auto',
                  p: 1.5,
                  '&::-webkit-scrollbar': { width: 4 },
                  '&::-webkit-scrollbar-thumb': { bgcolor: 'divider', borderRadius: 2 },
                }}
              >
                {todayEvents.length === 0 ? (
                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      height: '100%',
                      minHeight: 180,
                      gap: 1,
                    }}
                  >
                    <EventNoteRoundedIcon sx={{ fontSize: '2.5rem', color: 'divider' }} />
                    <Typography sx={{ fontSize: '0.78rem', color: 'text.disabled', fontWeight: 600, textAlign: 'center' }}>
                      No appointments today
                    </Typography>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => navigate('/appointments/new?date=' + encodeURIComponent(dayjs().format('YYYY-MM-DD')))}
                      sx={{
                        mt: 0.5,
                        borderRadius: 2,
                        textTransform: 'none',
                        fontSize: '0.72rem',
                        borderColor: 'primary.main',
                        color: 'primary.main',
                        fontWeight: 700,
                        '&:hover': { bgcolor: (t) => alpha(t.palette.primary.main, 0.06) },
                      }}
                    >
                      + Add Appointment
                    </Button>
                  </Box>
                ) : (
                  todayEvents.map((evt, idx) => {
                    const status = evt.extendedProps?.status ?? 'confirmed'
                    const statusColor = statusDot(theme, status)
                    const startTime = dayjs(evt.start)
                    const endTime = dayjs(evt.end)
                    const isPast = endTime.isBefore(dayjs())
                    const isCurrent = startTime.isBefore(dayjs()) && endTime.isAfter(dayjs())
                    return (
                      <Box
                        key={evt.id}
                        onClick={() => navigate(`/appointments/${evt.id}`)}
                        sx={{
                          p: 1.25,
                          mb: 0.75,
                          borderRadius: 2,
                          cursor: 'pointer',
                          border: '1px solid',
                          borderColor: isCurrent ? statusColor + '60' : theme.palette.divider,
                          bgcolor: isCurrent ? statusColor + '08' : isPast ? 'action.hover' : 'background.paper',
                          opacity: isPast ? 0.65 : 1,
                          transition: 'all 0.15s',
                          position: 'relative',
                          overflow: 'hidden',
                          '&:hover': { borderColor: statusColor + '80', bgcolor: statusColor + '06', transform: 'translateX(2px)' },
                        }}
                      >
                        {/* Current appointment highlight stripe */}
                        {isCurrent && (
                          <Box
                            sx={{
                              position: 'absolute',
                              left: 0,
                              top: 0,
                              bottom: 0,
                              width: 3,
                              bgcolor: statusColor,
                              borderRadius: '2px 0 0 2px',
                            }}
                          />
                        )}
                        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={0.4}>
                          <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: statusColor }}>
                            {startTime.format('h:mm A')} – {endTime.format('h:mm A')}
                          </Typography>
                          {isCurrent && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                              <Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: 'success.main', animation: 'pulse 2s infinite' }} />
                              <Typography sx={{ fontSize: '0.6rem', color: 'success.main', fontWeight: 700 }}>NOW</Typography>
                            </Box>
                          )}
                        </Stack>
                        <Typography sx={{ fontSize: '0.78rem', fontWeight: 800, color: 'text.primary', lineHeight: 1.2, mb: 0.2 }} noWrap>
                          {evt.extendedProps?.patient ?? evt.title}
                        </Typography>
                        {evt.extendedProps?.clinician && (
                          <Typography sx={{ fontSize: '0.68rem', color: 'text.secondary', fontWeight: 500 }} noWrap>
                            {evt.extendedProps.clinician}
                          </Typography>
                        )}
                        {evt.extendedProps?.service && (
                          <Typography sx={{ fontSize: '0.65rem', color: 'text.disabled', mt: 0.3 }} noWrap>
                            {evt.extendedProps.service}
                          </Typography>
                        )}
                        <Box sx={{ mt: 0.5, display: 'inline-block', bgcolor: statusColor + '18', borderRadius: 0.75, px: 0.6, py: '1px' }}>
                          <Typography sx={{ fontSize: '0.6rem', fontWeight: 700, color: statusColor, textTransform: 'capitalize' }}>
                            {status.replace('_', ' ')}
                          </Typography>
                        </Box>
                      </Box>
                    )
                  })
                )}
              </Box>

              {/* Footer */}
              <Box sx={{ px: 2, py: 1.25, borderTop: '1px solid #F1F3F4' }}>
                <Button
                  fullWidth
                  size="small"
                  variant="text"
                  onClick={() => navigate('/appointments')}
                  endIcon={<ChevronRightRoundedIcon sx={{ fontSize: '0.9rem' }} />}
                  sx={{
                    textTransform: 'none',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: 'primary.main',
                    '&:hover': { bgcolor: 'rgba(0,109,119,0.06)' },
                  }}
                >
                  View All Appointments
                </Button>
              </Box>
            </Box>
          </Collapse>
        </Box>
      )}

      {/* ── Event detail Popover ─────────────────────────────────────────── */}
      {popoverEvent && (
        <Box
          onClick={() => {
            setPopoverAnchor(null)
            setPopoverEvent(null)
          }}
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            zIndex: 1300,
            pointerEvents: 'auto',
            bgcolor: 'rgba(0,0,0,0.05)',
          }}
        >
          <Box
            onClick={(e) => e.stopPropagation()}
            sx={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 340,
              bgcolor: 'background.paper',
              borderRadius: 3,
              boxShadow: '0 12px 40px rgba(32,33,36,0.22), 0 2px 8px rgba(32,33,36,0.10)',
              border: '1px solid #E8EAED',
              overflow: 'hidden',
              animation: 'popIn 0.18s ease',
              '@keyframes popIn': {
                from: { opacity: 0, transform: 'translate(-50%,-50%) scale(0.94)' },
                to: { opacity: 1, transform: 'translate(-50%,-50%) scale(1)' },
              },
            }}
          >
            {/* Accent top */}
            <Box sx={{ height: 4, background: (t) => `linear-gradient(90deg, ${t.palette.primary.main}, ${t.palette.primary.light})` }} />
            <Box sx={{ p: 2.5 }}>
              {/* Status + close */}
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1.5}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <CalendarMonthRoundedIcon sx={{ color: 'primary.main', fontSize: '1.1rem' }} />
                  <Typography variant="subtitle1" fontWeight={800} sx={{ color: 'text.primary' }}>
                    Appointment
                  </Typography>
                </Stack>
                {popoverEvent.extendedProps?.status &&
                  (() => {
                    const meta = theme.palette.appointmentStatus[popoverEvent.extendedProps.status]
                    return (
                      <Chip
                        label={STATUS_LABELS[popoverEvent.extendedProps.status] ?? popoverEvent.extendedProps.status}
                        size="small"
                        sx={{
                          bgcolor: meta ? meta.bg : 'action.hover',
                          color: meta ? meta.text : 'text.secondary',
                          border: `1px solid ${meta ? meta.border : theme.palette.divider}`,
                          fontWeight: 700,
                          fontSize: '0.7rem',
                          height: 22,
                        }}
                      />
                    )
                  })()}
              </Stack>

              {/* Patient */}
              <Stack direction="row" spacing={1.5} alignItems="center" mb={2}>
                <Box
                  sx={{
                    width: 42,
                    height: 42,
                    borderRadius: '50%',
                    bgcolor: 'primary.main',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    boxShadow: '0 2px 8px rgba(0,109,119,0.3)',
                  }}
                >
                  <Typography sx={{ color: 'primary.contrastText', fontWeight: 800, fontSize: '0.9rem' }}>
                    {(popoverEvent.extendedProps?.patient ?? popoverEvent.title ?? '?')
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" fontWeight={800} sx={{ color: 'text.primary' }}>
                    {popoverEvent.extendedProps?.patient ?? popoverEvent.title ?? '—'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {popoverEvent.extendedProps?.clinician ?? 'Clinician not assigned'}
                  </Typography>
                </Box>
              </Stack>

              <Divider sx={{ mb: 1.5 }} />

              {/* Details grid */}
              <Stack spacing={1} mb={2}>
                {[
                  [
                    <AccessTimeRoundedIcon sx={{ fontSize: '0.9rem', color: 'primary.main' }} />,
                    'Time',
                    `${dayjs(popoverEvent.start).format('ddd DD MMM, h:mm A')} \u2013 ${dayjs(popoverEvent.end).format('h:mm A')}`,
                  ],
                  [
                    <MedicalServicesRoundedIcon sx={{ fontSize: '0.9rem', color: 'primary.main' }} />,
                    'Service',
                    popoverEvent.extendedProps?.service,
                  ],
                  [<MeetingRoomRoundedIcon sx={{ fontSize: '0.9rem', color: 'primary.main' }} />, 'Room', popoverEvent.extendedProps?.room],
                  [
                    // NEW-CAL-012: appointment type icon in popover
                    popoverEvent.extendedProps?.apptType === 'video' ? (
                      <VideocamRoundedIcon sx={{ fontSize: '0.9rem', color: 'primary.main' }} />
                    ) : popoverEvent.extendedProps?.apptType === 'home_visit' ? (
                      <DirectionsCarRoundedIcon sx={{ fontSize: '0.9rem', color: 'primary.main' }} />
                    ) : (
                      <PersonRoundedIcon sx={{ fontSize: '0.9rem', color: 'primary.main' }} />
                    ),
                    'Type',
                    popoverEvent.extendedProps?.apptType
                      ? ({ in_person: 'In-Person', video: 'Video / Telehealth', home_visit: 'Home Visit' }[
                          popoverEvent.extendedProps.apptType
                        ] ?? popoverEvent.extendedProps.apptType)
                      : null,
                  ],
                ]
                  .filter(([, , v]) => v)
                  .map(([icon, label, value], i) => (
                    <Stack key={i} direction="row" spacing={1.5} alignItems="center">
                      <Box
                        sx={{
                          width: 28,
                          height: 28,
                          borderRadius: 1.5,
                          bgcolor: 'rgba(0,109,119,0.08)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        {icon}
                      </Box>
                      <Box>
                        <Typography
                          variant="caption"
                          sx={{
                            color: 'text.disabled',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            fontSize: '0.6rem',
                            letterSpacing: '0.05em',
                          }}
                        >
                          {label}
                        </Typography>
                        <Typography variant="body2" fontWeight={600} sx={{ color: 'text.primary', lineHeight: 1.2 }}>
                          {value}
                        </Typography>
                      </Box>
                    </Stack>
                  ))}
              </Stack>

              {/* Actions */}
              <Stack direction="row" spacing={1}>
                <Button
                  fullWidth
                  variant="contained"
                  size="small"
                  onClick={() => {
                    navigate(`/appointments/${popoverEvent.id}`)
                    setPopoverAnchor(null)
                    setPopoverEvent(null)
                  }}
                  sx={{
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    background: (t) => `linear-gradient(135deg,${t.palette.primary.light},${t.palette.primary.main})`,
                    '&:hover': {
                      background: (t) => `linear-gradient(135deg,${t.palette.primary.main},${t.palette.primary.dark})`,
                      boxShadow: '0 4px 12px rgba(0,109,119,0.35)',
                    },
                  }}
                >
                  View Full Details
                </Button>
                <Button
                  fullWidth
                  variant="outlined"
                  size="small"
                  onClick={() => {
                    navigate(`/appointments/${popoverEvent.id}/edit`)
                    setPopoverAnchor(null)
                    setPopoverEvent(null)
                  }}
                  sx={{
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    borderColor: 'divider',
                    color: 'text.secondary',
                    '&:hover': { borderColor: 'primary.main', color: 'primary.main', bgcolor: (t) => alpha(t.palette.primary.main, 0.04) },
                  }}
                >
                  Edit
                </Button>
              </Stack>
            </Box>
          </Box>
        </Box>
      )}

      {/* ── SUG-CAL-010: Mobile FAB for New Booking ───────────────────────── */}
      <Fab
        aria-label="New Booking"
        onClick={() => navigate('/appointments/new')}
        sx={{
          display: { xs: 'flex', sm: 'none' },
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 1200,
          background: (t) => `linear-gradient(135deg, ${t.palette.primary.light} 0%, ${t.palette.primary.main} 100%)`,
          boxShadow: '0 4px 14px rgba(0,109,119,0.40)',
          '&:hover': { background: (t) => `linear-gradient(135deg, ${t.palette.primary.main} 0%, ${t.palette.primary.dark} 100%)` },
        }}
      >
        <AddRoundedIcon sx={{ color: 'primary.contrastText' }} />
      </Fab>
    </Box>
  )
}
