import {
  Table, TableHead, TableBody, TableRow, TableCell,
  Chip, IconButton, Typography, Box, Tooltip, Avatar, Button,
} from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'
import { useMediaQuery } from '@mui/material'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'

// ─── Helpers ────────────────────────────────────────────────────────────────────
const AVATAR_PALETTE = ['#1A73E8', '#0F9D58', '#9334E6', '#FA7B17',
                        '#D93025', '#009688', '#F9AB00', '#EA4335']
const avatarColor = (name) =>
  AVATAR_PALETTE[(name?.charCodeAt(0) ?? 0) % AVATAR_PALETTE.length]
const initials = (name) =>
  (name ?? '').split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()

// ─── Google status chip config ─────────────────────────────────────────────────
const STATUS_CONFIG = {
  confirmed:   { label: 'Confirmed',   bg: '#E6F4EA', text: '#137333', border: '#CEEAD6', dot: '#0F9D58' },
  pending:     { label: 'Pending',     bg: '#FEF7E0', text: '#8A4700', border: '#FDD663', dot: '#F9AB00' },
  cancelled:   { label: 'Cancelled',   bg: '#FCE8E6', text: '#A50E0E', border: '#F5C6C2', dot: '#D93025' },
  no_show:     { label: 'No Show',     bg: '#F8F9FA', text: '#3C4043', border: '#E8EAED', dot: '#80868B' },
  completed:   { label: 'Completed',   bg: '#E8F0FE', text: '#1557B0', border: '#AECBFA', dot: '#1A73E8' },
  rescheduled: { label: 'Rescheduled', bg: '#F3E8FD', text: '#6E2DB8', border: '#D7AEFA', dot: '#9334E6' },
}

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, bg: '#F8F9FA', text: '#3C4043', border: '#E8EAED', dot: '#80868B' }
  return (
    <Chip
      label={cfg.label}
      size="small"
      sx={{
        bgcolor: cfg.bg, color: cfg.text,
        border: `1px solid ${cfg.border}`,
        borderLeft: `3px solid ${cfg.dot}`,
        fontWeight: 700, borderRadius: '8px',
        fontSize: '0.68rem', height: 24,
      }}
    />
  )
}

// ─── Mock data ─────────────────────────────────────────────────────────────────
const MOCK = [
  { id: '1', start_datetime: new Date().toISOString(),                    status: 'confirmed',
    patient:  { id: '1', full_name: 'Alice Johnson' },
    clinician:{ id: '1', full_name: 'Dr Smith' },
    service:  { id: '1', name: 'General Consultation' } },
  { id: '2', start_datetime: new Date(Date.now() + 3600000).toISOString(), status: 'pending',
    patient:  { id: '2', full_name: 'Bob Williams' },
    clinician:{ id: '2', full_name: 'Dr Patel' },
    service:  { id: '2', name: 'Physiotherapy' } },
  { id: '3', start_datetime: new Date(Date.now() + 7200000).toISOString(), status: 'cancelled',
    patient:  { id: '3', full_name: 'Carol Davis' },
    clinician:{ id: '3', full_name: 'Dr Nguyen' },
    service:  { id: '3', name: 'Dental Check-up' } },
  { id: '4', start_datetime: new Date(Date.now() + 10800000).toISOString(), status: 'confirmed',
    patient:  { id: '4', full_name: 'David Martinez' },
    clinician:{ id: '1', full_name: 'Dr Smith' },
    service:  { id: '1', name: 'General Consultation' } },
  { id: '5', start_datetime: new Date(Date.now() + 14400000).toISOString(), status: 'no_show',
    patient:  { id: '5', full_name: 'Emma Wilson' },
    clinician:{ id: '2', full_name: 'Dr Patel' },
    service:  { id: '4', name: 'Cardiology Review' } },
]

// ─── Table ─────────────────────────────────────────────────────────────────────
export default function RecentAppointmentsTable({ appointments }) {
  const navigate = useNavigate()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const isTablet = useMediaQuery(theme.breakpoints.down('md'))

  const rows = (appointments && appointments.length > 0)
    ? appointments.slice(0, 5)
    : MOCK

  return (
    <Box>
      {/* Header with View all link */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="subtitle1" fontWeight={700} sx={{ color: '#202124' }}>
          Upcoming Appointments
        </Typography>
        <Button variant="text" size="small" onClick={() => navigate('/appointments')}
          sx={{ color: '#1A73E8', fontWeight: 700, fontSize: '0.8rem', '&:hover': { bgcolor: '#E8F0FE' } }}>
          View all →
        </Button>
      </Box>

      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem', color: '#9AA0A6', py: 1.25, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Patient</TableCell>
            <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem', color: '#9AA0A6', py: 1.25, textTransform: 'uppercase', letterSpacing: '0.08em', display: { xs: 'none', md: 'table-cell' } }}>Clinician</TableCell>
            <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem', color: '#9AA0A6', py: 1.25, textTransform: 'uppercase', letterSpacing: '0.08em', display: { xs: 'none', sm: 'table-cell' } }}>Service</TableCell>
            <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem', color: '#9AA0A6', py: 1.25, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Date / Time</TableCell>
            <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem', color: '#9AA0A6', py: 1.25, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Status</TableCell>
            <TableCell />
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((appt) => (
            <TableRow
              key={appt.id}
              hover
              onClick={() => navigate(`/appointments/${appt.id}`)}
              sx={{ cursor: 'pointer', '&:last-child td': { border: 0 }, transition: 'background 0.15s' }}
            >
              {/* Patient + Avatar */}
              <TableCell sx={{ fontWeight: 500 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                  <Avatar sx={{
                    width: 28, height: 28, fontSize: '0.68rem', fontWeight: 700,
                    bgcolor: alpha(avatarColor(appt.patient?.full_name), 0.15),
                    color: avatarColor(appt.patient?.full_name),
                    display: { xs: 'none', sm: 'flex' },
                  }}>
                    {initials(appt.patient?.full_name)}
                  </Avatar>
                  <Typography variant="body2" fontWeight={600} sx={{ color: '#202124' }}>
                    {appt.patient?.full_name ?? '—'}
                  </Typography>
                </Box>
              </TableCell>

              {/* Clinician — hidden on mobile */}
              <TableCell sx={{ color: '#5F6368', display: { xs: 'none', md: 'table-cell' } }}>
                {appt.clinician?.full_name ?? '—'}
              </TableCell>

              {/* Service — hidden on xs */}
              <TableCell sx={{ color: '#5F6368', display: { xs: 'none', sm: 'table-cell' } }}>
                {appt.service?.name ?? '—'}
              </TableCell>

              {/* Date — short on mobile */}
              <TableCell sx={{ color: '#5F6368', whiteSpace: 'nowrap' }}>
                {dayjs(appt.start_datetime).format(isMobile ? 'D MMM' : 'D MMM, h:mm A')}
              </TableCell>

              <TableCell>
                <StatusBadge status={appt.status} />
              </TableCell>

              {/* Action icon */}
              <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                <Tooltip title="View appointment">
                  <IconButton size="small" onClick={() => navigate(`/appointments/${appt.id}`)}
                    sx={{ color: '#1A73E8', '&:hover': { bgcolor: '#E8F0FE' } }}>
                    <OpenInNewIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  )
}
