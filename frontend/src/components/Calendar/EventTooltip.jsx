import dayjs from 'dayjs'
import {
  Box,
  Chip,
  ClickAwayListener,
  Paper,
  Popper,
  Stack,
  Typography,
} from '@mui/material'
import AccessTimeRoundedIcon      from '@mui/icons-material/AccessTimeRounded'
import MedicalServicesRoundedIcon from '@mui/icons-material/MedicalServicesRounded'
import MeetingRoomRoundedIcon     from '@mui/icons-material/MeetingRoomRounded'
import PersonRoundedIcon          from '@mui/icons-material/PersonRounded'
import LocalHospitalRoundedIcon   from '@mui/icons-material/LocalHospitalRounded'
import OpenInNewRoundedIcon       from '@mui/icons-material/OpenInNewRounded'

// ─── Status meta ─────────────────────────────────────────────────────────────
const STATUS_META = {
  pending:     { label: 'Pending',   color: '#F9AB00', bg: '#FEF7E0', border: 'rgba(249,171,0,0.25)' },
  confirmed:   { label: 'Confirmed', color: '#0F9D58', bg: '#E6F4EA', border: 'rgba(15,157,88,0.25)' },
  cancelled:   { label: 'Cancelled', color: '#D93025', bg: '#FCE8E6', border: 'rgba(217,48,37,0.25)' },
  completed:   { label: 'Completed', color: '#006D77', bg: '#E8F0FE', border: 'rgba(26,115,232,0.25)' },
  no_show:     { label: 'No Show',   color: '#80868B', bg: '#F1F3F4', border: 'rgba(128,134,139,0.25)' },
  rescheduled: { label: 'Reschedule',color: '#9334E6', bg: '#F3E8FD', border: 'rgba(147,52,230,0.25)' },
}

// ─── A single detail row ──────────────────────────────────────────────────────
function TooltipRow({ icon, text, color }) {
  if (!text) return null
  return (
    <Stack direction="row" spacing={1} alignItems="flex-start">
      <Box sx={{ color: color ?? '#9AA0A6', display: 'flex', flexShrink: 0, mt: '1px' }}>
        {icon}
      </Box>
      <Typography
        variant="caption"
        sx={{ color: '#3C4043', fontWeight: 600, fontSize: '0.78rem', lineHeight: 1.4 }}
      >
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
  if (!data) return null

  const meta = STATUS_META[data.status] ?? { label: data.status, color: '#9AA0A6', bg: '#F1F3F4', border: '#E8EAED' }
  const timeRange = data.start && data.end
    ? `${dayjs(data.start).format('h:mm A')} – ${dayjs(data.end).format('h:mm A')}`
    : ''

  return (
    <Popper
      open={open}
      anchorEl={anchor}
      placement="top"
      modifiers={[
        { name: 'offset',      options: { offset: [0, 10] } },
        { name: 'preventOverflow', options: { boundary: 'viewport', padding: 12 } },
        { name: 'flip',        options: { fallbackPlacements: ['bottom', 'right', 'left'] } },
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
            border: '1px solid rgba(232,234,237,0.9)',
            boxShadow: '0 8px 32px rgba(32,33,36,0.20), 0 2px 8px rgba(32,33,36,0.08)',
            backdropFilter: 'blur(12px)',
            bgcolor: 'rgba(255,255,255,0.98)',
            pointerEvents: 'none',
          }}
        >
          {/* ── Header: status + time ─────────────────────────────── */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
            <Chip
              label={meta.label}
              size="small"
              sx={{
                bgcolor: meta.bg,
                color: meta.color,
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
              <Typography variant="caption" sx={{ color: '#9AA0A6', fontWeight: 600, fontSize: '0.72rem' }}>
                {timeRange}
              </Typography>
            )}
          </Box>

          {/* ── Patient name ──────────────────────────────────────── */}
          <Typography
            variant="body2"
            fontWeight={800}
            sx={{ color: '#202124', fontSize: '0.88rem', mb: 1.25, lineHeight: 1.3 }}
          >
            {data.patient ?? 'Unknown patient'}
          </Typography>

          {/* ── Detail rows ───────────────────────────────────────── */}
          <Stack spacing={0.75}>
            <TooltipRow
              icon={<LocalHospitalRoundedIcon sx={{ fontSize: 14 }} />}
              text={data.clinician}
              color="#006D77"
            />
            <TooltipRow
              icon={<MedicalServicesRoundedIcon sx={{ fontSize: 14 }} />}
              text={data.service}
              color="#0F9D58"
            />
            <TooltipRow
              icon={<AccessTimeRoundedIcon sx={{ fontSize: 14 }} />}
              text={timeRange}
              color="#F9AB00"
            />
            {data.room && (
              <TooltipRow
                icon={<MeetingRoomRoundedIcon sx={{ fontSize: 14 }} />}
                text={`Room: ${data.room}`}
                color="#80868B"
              />
            )}
          </Stack>

          {/* ── Click hint ────────────────────────────────────────── */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1.5, pt: 1.25, borderTop: '1px solid #F1F3F4' }}>
            <OpenInNewRoundedIcon sx={{ fontSize: '0.75rem', color: '#006D77' }} />
            <Typography variant="caption" sx={{ color: '#006D77', fontWeight: 700, fontSize: '0.72rem' }}>
              Click to view full details
            </Typography>
          </Box>
        </Paper>
      </ClickAwayListener>
    </Popper>
  )
}
