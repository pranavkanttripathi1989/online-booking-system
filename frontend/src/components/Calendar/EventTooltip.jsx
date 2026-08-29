import dayjs from 'dayjs'
import { Box, Chip, ClickAwayListener, Paper, Popper, Stack, Typography } from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'
import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded'
import MedicalServicesRoundedIcon from '@mui/icons-material/MedicalServicesRounded'
import MeetingRoomRoundedIcon from '@mui/icons-material/MeetingRoomRounded'
import PersonRoundedIcon from '@mui/icons-material/PersonRounded'
import LocalHospitalRoundedIcon from '@mui/icons-material/LocalHospitalRounded'
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded'

// BUG047 Phase 1 -- status colour comes from theme.palette.appointmentStatus
// (theme/index.js), the one shared source, instead of this file's own hex map.
const STATUS_LABELS = {
  scheduled: 'Scheduled',
  pending: 'Pending',
  confirmed: 'Confirmed',
  cancelled: 'Cancelled',
  completed: 'Completed',
  no_show: 'No Show',
  rescheduled: 'Reschedule',
}

// ─── A single detail row ──────────────────────────────────────────────────────
function TooltipRow({ icon, text, color }) {
  if (!text) return null
  return (
    <Stack direction="row" spacing={1} alignItems="flex-start">
      <Box sx={{ color: color ?? 'text.disabled', display: 'flex', flexShrink: 0, mt: '1px' }}>{icon}</Box>
      <Typography variant="caption" sx={{ color: 'text.primary', fontWeight: 600, fontSize: '0.78rem', lineHeight: 1.4 }}>
        {text}
      </Typography>
    </Stack>
  )
}

// ─── EventTooltip ─────────────────────────────────────────────────────────────
/**
 * Props:
 *   open   : boolean
 *   anchor : HTMLElement | null
 *   data   : { patient, clinician, service, room, start, end, status }
 *   onClose: () => void
 */
export default function EventTooltip({ open, anchor, data, onClose }) {
  const theme = useTheme()
  if (!data) return null

  const meta = theme.palette.appointmentStatus[data.status] ?? theme.palette.appointmentStatus.no_show
  const label = STATUS_LABELS[data.status] ?? data.status
  const timeRange = data.start && data.end ? `${dayjs(data.start).format('h:mm A')} – ${dayjs(data.end).format('h:mm A')}` : ''

  return (
    <Popper
      open={open}
      anchorEl={anchor}
      placement="top"
      modifiers={[
        { name: 'offset', options: { offset: [0, 10] } },
        { name: 'preventOverflow', options: { boundary: 'viewport', padding: 12 } },
        { name: 'flip', options: { fallbackPlacements: ['bottom', 'right', 'left'] } },
      ]}
      sx={{ zIndex: 1400 }}
    >
      <ClickAwayListener onClickAway={onClose}>
        <Paper
          elevation={0}
          sx={{
            p: 2,
            minWidth: 230,
            maxWidth: 290,
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'divider',
            boxShadow: '0 8px 32px rgba(32,33,36,0.20), 0 2px 8px rgba(32,33,36,0.08)',
            backdropFilter: 'blur(12px)',
            bgcolor: (t) => alpha(t.palette.background.paper, 0.98),
            pointerEvents: 'none',
          }}
        >
          {/* ── Header: status + time ─────────────────────────────── */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
            <Chip
              label={label}
              size="small"
              sx={{
                bgcolor: meta.bg,
                color: meta.text,
                fontWeight: 800,
                fontSize: '0.68rem',
                textTransform: 'capitalize',
                borderRadius: '6px',
                height: 22,
                border: `1px solid ${meta.border}`,
                letterSpacing: '0.01em',
              }}
            />
            {timeRange && (
              <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 600, fontSize: '0.72rem' }}>
                {timeRange}
              </Typography>
            )}
          </Box>

          {/* ── Patient name ──────────────────────────────────────── */}
          <Typography variant="body2" fontWeight={800} sx={{ color: 'text.primary', fontSize: '0.88rem', mb: 1.25, lineHeight: 1.3 }}>
            {data.patient ?? 'Unknown patient'}
          </Typography>

          {/* ── Detail rows ───────────────────────────────────────── */}
          <Stack spacing={0.75}>
            <TooltipRow icon={<LocalHospitalRoundedIcon sx={{ fontSize: 14 }} />} text={data.clinician} color="primary.main" />
            <TooltipRow icon={<MedicalServicesRoundedIcon sx={{ fontSize: 14 }} />} text={data.service} color="success.main" />
            <TooltipRow icon={<AccessTimeRoundedIcon sx={{ fontSize: 14 }} />} text={timeRange} color="warning.main" />
            {data.room && (
              <TooltipRow icon={<MeetingRoomRoundedIcon sx={{ fontSize: 14 }} />} text={`Room: ${data.room}`} color="text.disabled" />
            )}
          </Stack>

          {/* ── Click hint ────────────────────────────────────────── */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1.5, pt: 1.25, borderTop: '1px solid', borderTopColor: 'divider' }}>
            <OpenInNewRoundedIcon sx={{ fontSize: '0.75rem', color: 'primary.main' }} />
            <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 700, fontSize: '0.72rem' }}>
              Click to view full details
            </Typography>
          </Box>
        </Paper>
      </ClickAwayListener>
    </Popper>
  )
}
