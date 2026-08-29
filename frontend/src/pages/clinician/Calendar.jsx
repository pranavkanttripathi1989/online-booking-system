import React, { useState, useEffect, useRef, useMemo } from 'react'
import { Box, Grid, Typography, Stack, Button, Chip, Avatar, IconButton, Tooltip, Drawer, Popover, Divider } from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import TodayIcon from '@mui/icons-material/Today'
import VideocamIcon from '@mui/icons-material/Videocam'
import LocationOnIcon from '@mui/icons-material/LocationOn'
import CloseIcon from '@mui/icons-material/Close'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import PersonIcon from '@mui/icons-material/Person'
import MedicalServicesIcon from '@mui/icons-material/MedicalServices'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom'
import { useNavigate } from 'react-router-dom'
import { useQuery, gql } from '@apollo/client'
import dayjs from 'dayjs'
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore'
import weekOfYear from 'dayjs/plugin/weekOfYear'
import { useAuth } from '../../hooks/useAuth'

dayjs.extend(isSameOrBefore)
dayjs.extend(weekOfYear)

// ─── GraphQL ────────────────────────────────────────────────────────────────
// REQ013/PLAN023 Phase A re-audit fix: getClinicianSchedule was never a real
// backend field at all -- no resolver of this name exists anywhere in
// backend/src/schema.gql, so this page fell back to MOCK_EVENTS 100% of the
// time, for every real clinician, regardless of their actual appointments.
// Replaced with the real appointments query (self-scoped to the caller's own
// clinician_id server-side, appointments.service.ts's selfScope()) plus the
// real getLunchBreaks query already used correctly by clinician/Availability.jsx.
const GET_WEEK_APPOINTMENTS = gql`
  query GetWeekAppointments($dateFrom: String!, $dateTo: String!) {
    appointments(filters: { date_from: $dateFrom, date_to: $dateTo }, first: 200) {
      data {
        id
        start_datetime
        end_datetime
        status
        duration_minutes
        patient {
          id
          full_name
        }
        service {
          name
        }
        room {
          name
        }
      }
    }
  }
`
const GET_LUNCH_BREAKS = gql`
  query GetLunchBreaksForCalendar($clinicianId: ID!) {
    getLunchBreaks(clinicianId: $clinicianId) {
      id
      dayOfWeek
      startTime
      endTime
    }
  }
`

// ─── Constants ────────────────────────────────────────────────────────────────
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const HOURS = Array.from({ length: 9 }, (_, i) => i + 9)
const HOURS_LABELS = HOURS.map((h) => dayjs().hour(h).minute(0).format('h:mm A'))
const GRID_ROW = 60
const GRID_START_HOUR = 9

// ─── Status config ────────────────────────────────────────────────────────────
// Consumes the shared theme.palette.appointmentStatus (theme/index.js) rather
// than a per-file hex map -- 'break' isn't a real appointment status (it's a
// lunch-break/schedule-block event), so it's derived from warning locally.
const STATUS_LABELS = {
  confirmed: 'Confirmed',
  scheduled: 'Scheduled',
  pending: 'Pending',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_show: 'No Show',
  break: 'Break',
}
function statusCfgFor(theme, status) {
  if (status === 'break') {
    const w = theme.palette.warning
    const dark = theme.palette.mode === 'dark'
    return {
      label: 'Break',
      bg: alpha(w.main, dark ? 0.18 : 0.12),
      color: dark ? w.light : w.dark,
      border: alpha(w.main, dark ? 0.4 : 0.3),
    }
  }
  const meta = theme.palette.appointmentStatus[status] ?? theme.palette.appointmentStatus.confirmed
  return { label: STATUS_LABELS[status] ?? status, bg: meta.bg, color: meta.text, border: meta.border }
}
// Colour shown on an event card/avatar. Mock events (no real channel data on
// the backend Appointment type) use a per-type colour; real events use their
// status colour -- matching what each previously stored in its own `color`
// field, now computed instead of hardcoded.
function eventDisplayColor(theme, ev) {
  if (ev.type === 'break') return theme.palette.warning.main
  if (ev.type === 'block') return theme.palette.grey[600]
  if (ev.type === 'video') return theme.palette.secondary.main
  if (!ev.status) return theme.palette.primary.main
  return statusCfgFor(theme, ev.status).color
}

// ─── Mock Events ──────────────────────────────────────────────────────────────
const MOCK_EVENTS = [
  {
    id: 1,
    week: 0,
    day: 0,
    start: 9,
    end: 9.5,
    patient: 'Emma Wilson',
    type: 'in-person',
    status: 'confirmed',
    patientId: 'pt-101',
    service: 'General Consultation',
    duration: 30,
    room: 'Room 1A',
  },
  {
    id: 2,
    week: 0,
    day: 0,
    start: 10,
    end: 10.5,
    patient: 'Omar Hassan',
    type: 'in-person',
    status: 'confirmed',
    patientId: 'pt-102',
    service: 'Follow-up',
    duration: 30,
    room: 'Room 1A',
  },
  {
    id: 3,
    week: 0,
    day: 0,
    start: 12,
    end: 12.5,
    patient: 'LUNCH',
    type: 'break',
    status: 'break',
    patientId: null,
    service: null,
    duration: 30,
    room: null,
  },
  {
    id: 4,
    week: 0,
    day: 1,
    start: 9,
    end: 9.5,
    patient: 'Lily Chen',
    type: 'video',
    status: 'scheduled',
    patientId: 'pt-103',
    service: 'Video Consultation',
    duration: 30,
    room: null,
  },
  {
    id: 5,
    week: 0,
    day: 1,
    start: 10,
    end: 11,
    patient: 'James Brown',
    type: 'in-person',
    status: 'confirmed',
    patientId: 'pt-104',
    service: 'Specialist Review',
    duration: 60,
    room: 'Room 2B',
  },
  {
    id: 6,
    week: 0,
    day: 2,
    start: 9,
    end: 9.5,
    patient: 'Amir Patel',
    type: 'in-person',
    status: 'confirmed',
    patientId: 'pt-105',
    service: 'General Consultation',
    duration: 30,
    room: 'Room 1A',
  },
  {
    id: 7,
    week: 0,
    day: 2,
    start: 14,
    end: 14.5,
    patient: 'Sophie M.',
    type: 'video',
    status: 'scheduled',
    patientId: 'pt-106',
    service: 'Video Consultation',
    duration: 30,
    room: null,
  },
  {
    id: 8,
    week: 0,
    day: 3,
    start: 11,
    end: 11.5,
    patient: 'Team Meeting',
    type: 'block',
    status: 'break',
    patientId: null,
    service: null,
    duration: 30,
    room: 'Conf. Room',
  },
  {
    id: 9,
    week: 0,
    day: 4,
    start: 9,
    end: 9.5,
    patient: 'Kenji Yamada',
    type: 'in-person',
    status: 'confirmed',
    patientId: 'pt-107',
    service: 'Follow-up',
    duration: 30,
    room: 'Room 3C',
  },
  {
    id: 10,
    week: 0,
    day: 0,
    start: 10.1,
    end: 10.6,
    patient: 'Anna Ko',
    type: 'in-person',
    status: 'confirmed',
    patientId: 'pt-108',
    service: 'General Consultation',
    duration: 30,
    room: 'Room 1B',
  },
  {
    id: 11,
    week: 1,
    day: 0,
    start: 9,
    end: 9.5,
    patient: 'Clara Singh',
    type: 'in-person',
    status: 'confirmed',
    patientId: 'pt-201',
    service: 'General Consultation',
    duration: 30,
    room: 'Room 1A',
  },
  {
    id: 12,
    week: 1,
    day: 0,
    start: 12,
    end: 12.5,
    patient: 'LUNCH',
    type: 'break',
    status: 'break',
    patientId: null,
    service: null,
    duration: 30,
    room: null,
  },
  {
    id: 13,
    week: 1,
    day: 2,
    start: 14,
    end: 15,
    patient: 'Ravi Shah',
    type: 'video',
    status: 'scheduled',
    patientId: 'pt-202',
    service: 'Video Consultation',
    duration: 60,
    room: null,
  },
  {
    id: 14,
    week: -1,
    day: 1,
    start: 10,
    end: 11,
    patient: 'Past Patient',
    type: 'in-person',
    status: 'completed',
    patientId: 'pt-301',
    service: 'General Consultation',
    duration: 60,
    room: 'Room 2A',
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatHour(decHour) {
  const h = Math.floor(decHour)
  const m = Math.round((decHour - h) * 60)
  return dayjs().hour(h).minute(m).format('h:mm A')
}

function assignOverlapColumns(events) {
  const sorted = [...events].sort((a, b) => a.start - b.start)
  const columns = []
  const result = sorted.map((ev) => {
    for (let c = 0; c < columns.length; c++) {
      if (columns[c][columns[c].length - 1].end <= ev.start) {
        columns[c].push(ev)
        return { ...ev, _col: c }
      }
    }
    columns.push([ev])
    return { ...ev, _col: columns.length - 1 }
  })
  return result.map((ev) => ({ ...ev, _totalCols: columns.length }))
}

function getWeekLabel(offset) {
  if (offset === 0) return 'This Week'
  if (offset === 1) return 'Next Week'
  if (offset === -1) return 'Last Week'
  if (offset < 0) return `${Math.abs(offset)} Weeks Ago`
  return `Week +${offset}`
}

function getCurrentTimePx() {
  const now = dayjs()
  return (now.hour() + now.minute() / 60 - GRID_START_HOUR) * GRID_ROW
}

// ─── Hover Popover Card ────────────────────────────────────────────────────────
function ApptPopover({ ev, anchorEl, onClose, onViewFull, clinicianName, onPaperMouseEnter, onPaperMouseLeave }) {
  const theme = useTheme()
  const open = Boolean(anchorEl)
  if (!ev) return null

  const isPatient = ev.type !== 'break' && ev.type !== 'block'
  const sc = statusCfgFor(theme, ev.status)
  const startFmt = formatHour(ev.start)
  const endFmt = formatHour(ev.end)
  const initials = ev.patient
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase()

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      disableRestoreFocus
      anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      slotProps={{
        paper: {
          // BUG (found live 2026-08-29): pointerEvents:'none' on the whole
          // Popover made the "Click to view full details" link inside it
          // permanently unclickable, and moving the mouse off the trigger
          // card toward the popover always counted as a real mouse-leave --
          // the popover hid itself the instant a real user tried to reach
          // it. Fixed by making only the Paper interactive and having it
          // cancel/reschedule the same hide-timer the trigger card uses, so
          // hovering from the card into the popover is one continuous hover.
          onMouseEnter: onPaperMouseEnter,
          onMouseLeave: onPaperMouseLeave,
          sx: {
            width: 320,
            borderRadius: 3,
            overflow: 'hidden',
            boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
            mt: -1,
            ml: 0.5,
            pointerEvents: 'auto',
          },
        },
      }}
      sx={{ pointerEvents: 'none' }}
    >
      {/* Popover Header */}
      <Box
        sx={{
          px: 2,
          py: 1.5,
          bgcolor: 'background.paper',
          borderBottom: '1px solid', borderBottomColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Stack direction="row" spacing={1} alignItems="center">
          <CalendarMonthIcon sx={{ color: 'primary.main', fontSize: 18 }} />
          <Typography fontWeight={700} fontSize="0.9rem">
            {isPatient ? 'Appointment' : ev.patient}
          </Typography>
        </Stack>
        {isPatient && (
          <Chip
            size="small"
            label={sc.label}
            sx={{ bgcolor: sc.bg, color: sc.color, border: `1px solid ${sc.border}`, fontWeight: 700, fontSize: '0.68rem', height: 20 }}
          />
        )}
      </Box>

      {/* Popover Body */}
      <Box sx={{ px: 2, py: 1.5, bgcolor: 'background.paper' }}>
        {isPatient ? (
          <>
            {/* Patient row */}
            <Stack direction="row" spacing={1.5} alignItems="center" mb={1.5}>
              <Avatar sx={{ width: 38, height: 38, bgcolor: (t) => eventDisplayColor(t, ev), fontWeight: 800, fontSize: '0.85rem' }}>{initials}</Avatar>
              <Box>
                <Typography fontWeight={700} fontSize="0.95rem">
                  {ev.patient}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {clinicianName}
                </Typography>
              </Box>
            </Stack>

            <Divider sx={{ mb: 1.5 }} />

            {/* Time */}
            <Stack direction="row" spacing={1.5} alignItems="flex-start" mb={1}>
              <AccessTimeIcon sx={{ color: 'primary.main', fontSize: 16, mt: 0.3 }} />
              <Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  fontWeight={700}
                  sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}
                >
                  Time
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {startFmt} – {endFmt}
                </Typography>
              </Box>
            </Stack>

            {/* Service */}
            {ev.service && (
              <Stack direction="row" spacing={1.5} alignItems="flex-start" mb={1}>
                <MedicalServicesIcon sx={{ color: 'primary.main', fontSize: 16, mt: 0.3 }} />
                <Box>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    fontWeight={700}
                    sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}
                  >
                    Service
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {ev.service}
                  </Typography>
                </Box>
              </Stack>
            )}

            {/* Room */}
            {ev.room && (
              <Stack direction="row" spacing={1.5} alignItems="flex-start" mb={1}>
                <MeetingRoomIcon sx={{ color: 'primary.main', fontSize: 16, mt: 0.3 }} />
                <Box>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    fontWeight={700}
                    sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}
                  >
                    Room
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {ev.room}
                  </Typography>
                </Box>
              </Stack>
            )}

            {/* Type chip inline */}
            <Stack direction="row" spacing={1} mt={0.5}>
              <Chip
                size="small"
                icon={ev.type === 'video' ? <VideocamIcon sx={{ fontSize: 12 }} /> : <LocationOnIcon sx={{ fontSize: 12 }} />}
                label={ev.type === 'video' ? 'Video' : 'In-Person'}
                sx={{
                  bgcolor: (t) => alpha(ev.type === 'video' ? t.palette.secondary.main : t.palette.primary.main, 0.12),
                  color: ev.type === 'video' ? 'secondary.main' : 'primary.main',
                  fontWeight: 600,
                  fontSize: '0.68rem',
                  height: 20,
                }}
              />
            </Stack>
          </>
        ) : (
          /* Break / block mini view */
          <Stack direction="row" spacing={1.5} alignItems="center">
            <AccessTimeIcon sx={{ color: 'text.disabled', fontSize: 16 }} />
            <Typography variant="body2" fontWeight={600}>
              {startFmt} – {endFmt}
            </Typography>
          </Stack>
        )}
      </Box>

      {isPatient && (
        <Box sx={{ px: 2, py: 1.5, borderTop: '1px solid', borderTopColor: 'divider', bgcolor: 'action.hover' }}>
          <Typography
            variant="caption"
            sx={{ color: 'primary.main', fontWeight: 700, cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
            onClick={onViewFull}
          >
            Click to view full details →
          </Typography>
        </Box>
      )}
    </Popover>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ClinicianCalendar() {
  const theme = useTheme()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [weekOffset, setWeekOffset] = useState(0)
  const [selected, setSelected] = useState(null) // full drawer
  const [hovered, setHovered] = useState(null) // popover event
  const [anchorEl, setAnchorEl] = useState(null) // popover anchor
  const [currentTimePx, setCurrentTimePx] = useState(getCurrentTimePx)
  const hoverTimer = useRef(null)

  useEffect(() => {
    const interval = setInterval(() => setCurrentTimePx(getCurrentTimePx()), 60_000)
    return () => clearInterval(interval)
  }, [])

  const today = dayjs()
  const monday = today.startOf('week').add(1, 'day').add(weekOffset, 'week')
  const weekDates = DAYS.map((_, i) => monday.add(i, 'day'))
  const weekLabel = getWeekLabel(weekOffset)

  const clinicianName = user?.clinician?.full_name || user?.name || 'Dr. Sarah Mitchell'
  const clinicName = user?.organisation?.name || user?.clinic?.name || 'Clinic'

  // Real query first; fall back to MOCK_EVENTS only on a genuine query error
  // (offline/unreachable backend), not on a real-but-empty week -- matching
  // the error-only fallback convention established this session (see
  // appointments/index.jsx, calendar/index.jsx).
  // REQ121 (F-21) — was cache-first; a booking made through the patient
  // portal or front desk while this calendar tab sits open went unseen
  // until a hard refresh.
  const { data, error } = useQuery(GET_WEEK_APPOINTMENTS, {
    variables: {
      dateFrom: monday.format('YYYY-MM-DD'),
      dateTo: monday.add(6, 'day').format('YYYY-MM-DD'),
    },
    skip: !user?.id,
    fetchPolicy: 'cache-and-network',
  })
  const { data: lunchData } = useQuery(GET_LUNCH_BREAKS, {
    variables: { clinicianId: user?.clinician?.id },
    skip: !user?.clinician?.id,
    fetchPolicy: 'cache-and-network',
  })

  const weekEvents = useMemo(() => {
    if (error) return MOCK_EVENTS.filter((e) => e.week === weekOffset)

    const apptEvents = (data?.appointments?.data ?? []).map((a) => {
      const start = dayjs(a.start_datetime)
      const end = dayjs(a.end_datetime)
      // Monday=0..Sunday=6, matching DAYS/monday above.
      const day = (start.day() + 6) % 7
      return {
        id: a.id,
        day,
        start: start.hour() + start.minute() / 60,
        end: end.hour() + end.minute() / 60,
        patient: a.patient?.full_name ?? 'Patient',
        // No real in-person/video distinction exists on the backend Appointment
        // type -- every real appointment renders as 'in-person' rather than
        // fabricating a channel the schema doesn't track (see open-questions.md #8
        // for the same "drop rather than fake" call on clinician detail fields).
        type: 'in-person',
        status: a.status,
        patientId: a.patient?.id ?? null,
        service: a.service?.name ?? null,
        duration: a.duration_minutes,
        room: a.room?.name ?? null,
      }
    })

    // Real recurring weekly lunch breaks, expanded onto the days of the
    // currently-viewed week. getLunchBreaks returns dayOfWeek as a nullable
    // Int, already Monday=0-based to match this app's own DAYS array (not
    // ISO/JS-Date Sunday=0) -- confirmed against clinician/Availability.jsx's
    // own write path (day_of_week: String(dayIndex) from the same DAYS.map
    // iteration). null means every day (saveLunchBreak's 'daily' input
    // sentinel is stored as a null day_of_week column, not the literal string).
    const lunchEvents = (lunchData?.getLunchBreaks ?? []).flatMap((lb) => {
      const days = lb.dayOfWeek == null ? [0, 1, 2, 3, 4, 5, 6] : [Number(lb.dayOfWeek)]
      const [sh, sm] = lb.startTime.split(':').map(Number)
      const [eh, em] = lb.endTime.split(':').map(Number)
      return days.map((day) => ({
        id: `lunch-${lb.id}-${day}`,
        day,
        start: sh + sm / 60,
        end: eh + em / 60,
        patient: 'LUNCH',
        type: 'break',
        status: 'break',
        patientId: null,
        service: null,
        duration: eh * 60 + em - (sh * 60 + sm),
        room: null,
      }))
    })

    return [...apptEvents, ...lunchEvents]
  }, [data, lunchData, error, weekOffset])

  const isPatientAppt = selected && selected.type !== 'break' && selected.type !== 'block'
  const statusCfg = selected ? statusCfgFor(theme, selected.status) : null
  const initials = selected?.patient
    ? selected.patient
        .split(' ')
        .filter(Boolean)
        .map((n) => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase()
    : ''

  // Popover handlers
  const handleMouseEnter = (ev, e) => {
    clearTimeout(hoverTimer.current)
    setHovered(ev)
    setAnchorEl(e.currentTarget)
  }

  const handleMouseLeave = () => {
    hoverTimer.current = setTimeout(() => {
      setHovered(null)
      setAnchorEl(null)
    }, 200)
  }

  const handleClick = (ev) => {
    setHovered(null)
    setAnchorEl(null)
    clearTimeout(hoverTimer.current)
    setSelected(ev)
  }

  const closePopover = () => {
    setHovered(null)
    setAnchorEl(null)
  }

  return (
    <Box>
      {/* HEADER */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" rowGap={1} sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h2" fontWeight={700}>
            Calendar
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {clinicianName} · {clinicName}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          <IconButton onClick={() => setWeekOffset((w) => w - 1)}>
            <ChevronLeftIcon />
          </IconButton>
          <Chip
            label={weekLabel}
            color="primary"
            onClick={() => setWeekOffset(0)}
            sx={{ fontWeight: 700, cursor: 'pointer', minWidth: 100 }}
          />
          <IconButton onClick={() => setWeekOffset((w) => w + 1)}>
            <ChevronRightIcon />
          </IconButton>
          <Button variant="outlined" startIcon={<TodayIcon />} onClick={() => setWeekOffset(0)} size="small">
            Today
          </Button>
        </Stack>
      </Stack>

      {/* LEGEND */}
      <Stack direction="row" spacing={2} sx={{ mb: 2 }} flexWrap="wrap" gap={1}>
        {[
          ['In-Person', theme.palette.primary.main],
          ['Video', theme.palette.secondary.main],
          ['Break', theme.palette.warning.main],
          ['Blocked', theme.palette.grey[600]],
        ].map(([label, color]) => (
          <Stack key={label} direction="row" alignItems="center" spacing={0.75}>
            <Box sx={{ width: 12, height: 12, borderRadius: 1, bgcolor: color }} />
            <Typography variant="caption" color="text.secondary">
              {label}
            </Typography>
          </Stack>
        ))}
        <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto', fontStyle: 'italic' }}>
          {monday.format('DD MMM')} – {monday.add(6, 'day').format('DD MMM YYYY')}
        </Typography>
      </Stack>

      {/* GRID */}
      <Box sx={{ overflowX: 'auto', pb: 1, width: '100%', minWidth: 0 }}>
        <Box sx={{ minWidth: 700 }}>
          <Grid container spacing={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
            {/* Time column */}
            <Grid item sx={{ width: 64, borderRight: '1px solid', borderRightColor: 'divider', flexShrink: 0 }}>
              <Box sx={{ height: 48, borderBottom: '1px solid', borderBottomColor: 'divider' }} />
              {HOURS_LABELS.map((label) => (
                <Box
                  key={label}
                  sx={{ height: GRID_ROW, borderBottom: '1px solid', borderBottomColor: 'divider', display: 'flex', alignItems: 'flex-start', pt: 0.5, pl: 0.5 }}
                >
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem', lineHeight: 1 }}>
                    {label}
                  </Typography>
                </Box>
              ))}
            </Grid>

            {/* Day columns */}
            {DAYS.map((day, dayIdx) => {
              const colDate = weekDates[dayIdx]
              const isToday = colDate.isSame(today, 'day')
              const rawEvents = weekEvents.filter((e) => e.day === dayIdx)
              const events = assignOverlapColumns(rawEvents)

              return (
                <Grid item key={day} xs sx={{ borderRight: dayIdx < 6 ? '1px solid' : 'none', borderRightColor: 'divider', minWidth: 0 }}>
                  {/* Day header */}
                  <Box
                    sx={{
                      height: 48,
                      borderBottom: '1px solid #D0E8EA',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: isToday ? (t) => alpha(t.palette.primary.main, 0.08) : 'action.hover',
                    }}
                  >
                    <Typography variant="caption" color="text.secondary" fontWeight={700}>
                      {day}
                    </Typography>
                    <Typography
                      variant="body2"
                      fontWeight={700}
                      sx={{
                        color: isToday ? 'primary.main' : 'text.primary',
                        bgcolor: isToday ? (t) => alpha(t.palette.primary.main, 0.08) : 'transparent',
                        borderRadius: '50%',
                        width: 24,
                        height: 24,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {colDate.date()}
                    </Typography>
                  </Box>

                  {/* Hour slots + events */}
                  <Box sx={{ position: 'relative' }}>
                    {HOURS.map((h) => (
                      <Box key={h} sx={{ height: GRID_ROW, borderBottom: '1px solid', borderBottomColor: 'divider' }} />
                    ))}

                    {/* Current time line */}
                    {isToday && currentTimePx >= 0 && currentTimePx <= HOURS.length * GRID_ROW && (
                      <Box
                        sx={{
                          position: 'absolute',
                          top: currentTimePx,
                          left: 0,
                          right: 0,
                          height: 2,
                          bgcolor: 'error.main',
                          zIndex: 10,
                          '&::before': {
                            content: '""',
                            position: 'absolute',
                            left: -4,
                            top: -4,
                            width: 10,
                            height: 10,
                            borderRadius: '50%',
                            bgcolor: 'error.main',
                          },
                        }}
                      />
                    )}

                    {/* Event cards */}
                    {events.map((ev) => {
                      const topPx = (ev.start - GRID_START_HOUR) * GRID_ROW
                      const heightPx = (ev.end - ev.start) * GRID_ROW - 2
                      const totalCols = ev._totalCols ?? 1
                      const col = ev._col ?? 0
                      const isSelected = selected?.id === ev.id

                      return (
                        <Box
                          key={ev.id}
                          onMouseEnter={(e) => handleMouseEnter(ev, e)}
                          onMouseLeave={handleMouseLeave}
                          onClick={() => handleClick(ev)}
                          sx={{
                            position: 'absolute',
                            top: topPx,
                            left: `calc(${(col / totalCols) * 100}% + 2px)`,
                            right: `calc(${((totalCols - col - 1) / totalCols) * 100}% + 2px)`,
                            height: heightPx,
                            bgcolor: (t) => eventDisplayColor(t, ev),
                            borderRadius: 1,
                            cursor: 'pointer',
                            p: 0.5,
                            overflow: 'hidden',
                            opacity: 0.9,
                            border: isSelected ? '2px solid rgba(255,255,255,0.9)' : '2px solid transparent',
                            boxShadow: isSelected ? '0 0 0 2px rgba(0,109,119,0.4)' : 'none',
                            '&:hover': { opacity: 1, boxShadow: '0 3px 10px rgba(0,0,0,0.2)', transform: 'translateY(-1px)', zIndex: 5 },
                            transition: 'all 0.15s',
                            zIndex: isSelected ? 4 : 2,
                          }}
                        >
                          <Typography
                            variant="caption"
                            sx={{ color: 'common.white', fontWeight: 700, fontSize: '0.65rem', display: 'block' }}
                            noWrap
                          >
                            {ev.patient}
                          </Typography>
                          {heightPx > 22 && (
                            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.6rem' }}>
                              {ev.type === 'video' ? '📹' : ev.type === 'break' ? '☕' : '🏥'} {formatHour(ev.start)}
                            </Typography>
                          )}
                        </Box>
                      )
                    })}

                    {(dayIdx === 5 || dayIdx === 6) && rawEvents.length === 0 && (
                      <Typography
                        variant="caption"
                        color="text.disabled"
                        sx={{ position: 'absolute', top: 8, left: 0, right: 0, textAlign: 'center', fontSize: '0.6rem' }}
                      >
                        No appts
                      </Typography>
                    )}
                  </Box>
                </Grid>
              )
            })}
          </Grid>
        </Box>
      </Box>

      {/* HOVER POPOVER */}
      <ApptPopover
        ev={hovered}
        anchorEl={anchorEl}
        onClose={closePopover}
        onViewFull={() => {
          handleClick(hovered)
        }}
        clinicianName={clinicianName}
        onPaperMouseEnter={() => clearTimeout(hoverTimer.current)}
        onPaperMouseLeave={handleMouseLeave}
      />

      {/* FULL DETAIL DRAWER */}
      <Drawer
        anchor="right"
        open={!!selected}
        onClose={() => setSelected(null)}
        PaperProps={{
          sx: {
            width: { xs: '100vw', sm: 400 },
            display: 'flex',
            flexDirection: 'column',
            bgcolor: 'background.default',
          },
        }}
      >
        {selected && (
          <>
            {/* Drawer Header */}
            <Box
              sx={{
                bgcolor: (t) => (isPatientAppt ? eventDisplayColor(t, selected) : t.palette.grey[600]),
                px: 3,
                py: 2.5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Typography variant="h6" fontWeight={700} color="white">
                {isPatientAppt ? 'Appointment Details' : 'Schedule Block'}
              </Typography>
              <IconButton onClick={() => setSelected(null)} sx={{ color: 'white' }} size="small">
                <CloseIcon />
              </IconButton>
            </Box>

            {/* Drawer Body */}
            <Box sx={{ flex: 1, overflowY: 'auto', p: 2.5 }}>
              {isPatientAppt ? (
                <>
                  {/* Patient Card */}
                  <Box sx={{ p: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider', mb: 2, bgcolor: 'background.paper' }}>
                    <Stack direction="row" spacing={1} alignItems="center" mb={1.5}>
                      <PersonIcon sx={{ color: 'primary.main', fontSize: 18 }} />
                      <Typography variant="subtitle2" fontWeight={700} color="text.secondary">
                        Patient
                      </Typography>
                    </Stack>
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Avatar sx={{ width: 52, height: 52, bgcolor: (t) => eventDisplayColor(t, selected), fontWeight: 800, fontSize: '1rem' }}>
                        {initials}
                      </Avatar>
                      <Box>
                        <Typography fontWeight={700} variant="subtitle1">
                          {selected.patient}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {clinicianName}
                        </Typography>
                        <Stack direction="row" spacing={0.75} mt={0.5} flexWrap="wrap" gap={0.5}>
                          <Chip
                            size="small"
                            label={statusCfg.label}
                            sx={{
                              bgcolor: statusCfg.bg,
                              color: statusCfg.color,
                              border: `1px solid ${statusCfg.border}`,
                              fontWeight: 700,
                              fontSize: '0.7rem',
                            }}
                          />
                          <Chip
                            size="small"
                            icon={
                              selected.type === 'video' ? <VideocamIcon sx={{ fontSize: 13 }} /> : <LocationOnIcon sx={{ fontSize: 13 }} />
                            }
                            label={selected.type === 'video' ? 'Video' : 'In-Person'}
                            sx={{
                              bgcolor: (t) =>
                                alpha(selected.type === 'video' ? t.palette.secondary.main : t.palette.primary.main, 0.12),
                              color: selected.type === 'video' ? 'secondary.main' : 'primary.main',
                              fontWeight: 600,
                              fontSize: '0.7rem',
                            }}
                          />
                        </Stack>
                      </Box>
                    </Stack>
                  </Box>

                  {/* Time & Duration */}
                  <Box sx={{ p: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider', mb: 2, bgcolor: 'background.paper' }}>
                    <Stack direction="row" spacing={1} alignItems="center" mb={1.5}>
                      <AccessTimeIcon sx={{ color: 'primary.main', fontSize: 18 }} />
                      <Typography variant="subtitle2" fontWeight={700} color="text.secondary">
                        Time & Duration
                      </Typography>
                    </Stack>
                    <Stack spacing={1.5}>
                      <Stack direction="row" spacing={1.5}>
                        <AccessTimeIcon sx={{ color: 'primary.main', fontSize: 16, mt: 0.3 }} />
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Time
                          </Typography>
                          <Typography variant="body2" fontWeight={600}>
                            {formatHour(selected.start)} – {formatHour(selected.end)}
                          </Typography>
                        </Box>
                      </Stack>
                      <Stack direction="row" spacing={1.5}>
                        <AccessTimeIcon sx={{ color: 'primary.main', fontSize: 16, mt: 0.3 }} />
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Duration
                          </Typography>
                          <Typography variant="body2" fontWeight={600}>
                            {selected.duration || Math.round((selected.end - selected.start) * 60)} mins
                          </Typography>
                        </Box>
                      </Stack>
                    </Stack>
                  </Box>

                  {/* Service */}
                  {selected.service && (
                    <Box sx={{ p: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider', mb: 2, bgcolor: 'background.paper' }}>
                      <Stack direction="row" spacing={1} alignItems="center" mb={1.5}>
                        <MedicalServicesIcon sx={{ color: 'primary.main', fontSize: 18 }} />
                        <Typography variant="subtitle2" fontWeight={700} color="text.secondary">
                          Service
                        </Typography>
                      </Stack>
                      <Typography variant="body2" fontWeight={600}>
                        {selected.service}
                      </Typography>
                    </Box>
                  )}

                  {/* Room */}
                  {selected.room && (
                    <Box sx={{ p: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider', mb: 2, bgcolor: 'background.paper' }}>
                      <Stack direction="row" spacing={1} alignItems="center" mb={1.5}>
                        <MeetingRoomIcon sx={{ color: 'primary.main', fontSize: 18 }} />
                        <Typography variant="subtitle2" fontWeight={700} color="text.secondary">
                          Room
                        </Typography>
                      </Stack>
                      <Typography variant="body2" fontWeight={600}>
                        {selected.room}
                      </Typography>
                    </Box>
                  )}
                </>
              ) : (
                <Box sx={{ p: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider', mb: 2, bgcolor: 'background.paper' }}>
                  <Stack spacing={1.5}>
                    <Stack direction="row" spacing={1.5}>
                      <AccessTimeIcon sx={{ color: 'primary.main', fontSize: 16, mt: 0.3 }} />
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Time
                        </Typography>
                        <Typography variant="body2" fontWeight={600}>
                          {formatHour(selected.start)} – {formatHour(selected.end)}
                        </Typography>
                      </Box>
                    </Stack>
                    <Stack direction="row" spacing={1.5}>
                      <Box sx={{ fontSize: 16 }}>{selected.type === 'break' ? '☕' : '🚫'}</Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Type
                        </Typography>
                        <Typography variant="body2" fontWeight={600}>
                          {selected.patient}
                        </Typography>
                      </Box>
                    </Stack>
                  </Stack>
                </Box>
              )}
            </Box>

            {/* Drawer Footer */}
            {isPatientAppt && (
              <Box sx={{ p: 2.5, borderTop: '1px solid', borderTopColor: 'divider', flexShrink: 0, bgcolor: 'background.paper' }}>
                <Stack spacing={1.5}>
                  {selected.type === 'video' && (
                    <Button
                      variant="contained"
                      fullWidth
                      startIcon={<VideocamIcon />}
                      onClick={() => navigate(`/video/${selected.id}`)}
                      sx={{ bgcolor: 'secondary.main', '&:hover': { bgcolor: 'secondary.dark' }, borderRadius: 2, fontWeight: 700 }}
                    >
                      Join Video Call
                    </Button>
                  )}
                  <Button
                    variant="outlined"
                    fullWidth
                    startIcon={<PersonIcon />}
                    onClick={() => selected.patientId && navigate(`/patients/${selected.patientId}`)}
                    sx={{ borderRadius: 2, fontWeight: 600, borderColor: 'primary.main', color: 'primary.main' }}
                  >
                    View Patient
                  </Button>
                  <Button variant="text" fullWidth onClick={() => setSelected(null)} sx={{ color: 'text.secondary', borderRadius: 2 }}>
                    Close
                  </Button>
                </Stack>
              </Box>
            )}
          </>
        )}
      </Drawer>
    </Box>
  )
}
