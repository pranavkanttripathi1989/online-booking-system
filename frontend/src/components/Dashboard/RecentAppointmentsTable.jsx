import {
  Table,
  TableContainer,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Chip,
  IconButton,
  Typography,
  Box,
  Tooltip,
  Avatar,
  Button,
} from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'
import { useMediaQuery } from '@mui/material'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'

// ─── Helpers ────────────────────────────────────────────────────────────────────
// Deliberate literal exception (medibook-design-system skill's own stated
// carve-out): a fixed, curated set of distinguishable avatar-identity hues,
// always used as `alpha(color, 0.15)` backgrounds -- the transparency blends
// with whichever theme background is active, so this reads fine in both modes
// without needing its own light/dark variant.
const AVATAR_PALETTE = ['#1A73E8', '#0F9D58', '#9334E6', '#FA7B17', '#D93025', '#009688', '#F9AB00', '#EA4335']
const avatarColor = (name) => AVATAR_PALETTE[(name?.charCodeAt(0) ?? 0) % AVATAR_PALETTE.length]
const initials = (name) =>
  (name ?? '')
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()

// BUG047 Phase 1 -- status colour now comes from theme.palette.appointmentStatus
// (theme/index.js), the one shared source, so it re-balances correctly in
// dark mode instead of this file hand-picking its own light-only pastel hex.
const STATUS_LABELS = {
  scheduled: 'Scheduled',
  confirmed: 'Confirmed',
  pending: 'Pending',
  cancelled: 'Cancelled',
  no_show: 'No Show',
  completed: 'Completed',
  rescheduled: 'Rescheduled',
}

function StatusBadge({ status }) {
  const theme = useTheme()
  const cfg = theme.palette.appointmentStatus[status] ?? theme.palette.appointmentStatus.no_show
  const label = STATUS_LABELS[status] ?? status
  return (
    <Chip
      label={label}
      size="small"
      sx={{
        bgcolor: cfg.bg,
        color: cfg.text,
        border: `1px solid ${cfg.border}`,
        borderLeft: `3px solid ${cfg.dot}`,
        fontWeight: 700,
        borderRadius: '8px',
        fontSize: '0.68rem',
        height: 24,
      }}
    />
  )
}

// ─── Table ─────────────────────────────────────────────────────────────────────
export default function RecentAppointmentsTable({ appointments }) {
  const navigate = useNavigate()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const isTablet = useMediaQuery(theme.breakpoints.down('md'))

  // P2.7/F-15-adjacent fix: this used to fall back to 5 fabricated rows
  // ("Emma Wilson"/"Dr Smith"/...) whenever `appointments` was a real but
  // empty array -- an empty result, not an error, treated as "no backend"
  // (the same defect class BUG009 already fixed in appointments/index.jsx
  // and calendar/index.jsx). A dashboard with genuinely zero upcoming
  // appointments now shows a real empty state instead of fake ones.
  const rows = (appointments ?? []).slice(0, 5)

  return (
    <Box>
      {/* Header with View all link */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="subtitle1" fontWeight={700} sx={{ color: 'text.primary' }}>
          Upcoming Appointments
        </Typography>
        <Button
          variant="text"
          size="small"
          onClick={() => navigate('/appointments')}
          sx={{ color: 'primary.main', fontWeight: 700, fontSize: '0.8rem', '&:hover': { bgcolor: (t) => alpha(t.palette.primary.main, 0.08) } }}
        >
          View all →
        </Button>
      </Box>

      {rows.length === 0 ? (
        <Box sx={{ py: 5, textAlign: 'center', color: 'text.secondary' }}>
          <Typography variant="body2">No upcoming appointments.</Typography>
        </Box>
      ) : (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell
                  sx={{
                    fontWeight: 700,
                    fontSize: '0.7rem',
                    color: 'text.disabled',
                    py: 1.25,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                  }}
                >
                  Patient
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: 700,
                    fontSize: '0.7rem',
                    color: 'text.disabled',
                    py: 1.25,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    display: { xs: 'none', md: 'table-cell' },
                  }}
                >
                  Clinician
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: 700,
                    fontSize: '0.7rem',
                    color: 'text.disabled',
                    py: 1.25,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    display: { xs: 'none', sm: 'table-cell' },
                  }}
                >
                  Service
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: 700,
                    fontSize: '0.7rem',
                    color: 'text.disabled',
                    py: 1.25,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                  }}
                >
                  Date / Time
                </TableCell>
                <TableCell
                  sx={{
                    fontWeight: 700,
                    fontSize: '0.7rem',
                    color: 'text.disabled',
                    py: 1.25,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                  }}
                >
                  Status
                </TableCell>
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
                      <Avatar
                        sx={{
                          width: 28,
                          height: 28,
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          bgcolor: alpha(avatarColor(appt.patient?.full_name), 0.15),
                          color: avatarColor(appt.patient?.full_name),
                          display: { xs: 'none', sm: 'flex' },
                        }}
                      >
                        {initials(appt.patient?.full_name)}
                      </Avatar>
                      <Typography variant="body2" fontWeight={600} sx={{ color: 'text.primary' }}>
                        {appt.patient?.full_name ?? '—'}
                      </Typography>
                    </Box>
                  </TableCell>

                  {/* Clinician — hidden on mobile */}
                  <TableCell sx={{ color: 'text.secondary', display: { xs: 'none', md: 'table-cell' } }}>
                    {appt.clinician?.full_name ?? '—'}
                  </TableCell>

                  {/* Service — hidden on xs */}
                  <TableCell sx={{ color: 'text.secondary', display: { xs: 'none', sm: 'table-cell' } }}>{appt.service?.name ?? '—'}</TableCell>

                  {/* Date — short on mobile */}
                  <TableCell sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}>
                    {dayjs(appt.start_datetime).format(isMobile ? 'D MMM' : 'D MMM, h:mm A')}
                  </TableCell>

                  <TableCell>
                    <StatusBadge status={appt.status} />
                  </TableCell>

                  {/* Action icon */}
                  <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                    <Tooltip title="View appointment">
                      <IconButton
                        size="small"
                        onClick={() => navigate(`/appointments/${appt.id}`)}
                        sx={{ color: 'primary.main', '&:hover': { bgcolor: (t) => alpha(t.palette.primary.main, 0.08) } }}
                      >
                        <OpenInNewIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  )
}
