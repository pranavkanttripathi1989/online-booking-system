import React from 'react'
import { Chip } from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'

/**
 * StitchStatusChip — Soft-background pill chip matching Stitch design.
 *
 * Props:
 *   label      {string} — Text to show
 *   statusType {string} — One of the STATUS_TONE keys below
 *   size       {string} — 'small' (default) | 'medium'
 */

// BUG047 Phase 1 -- every status maps to one of the theme's own semantic
// palette groups (or 'neutral') instead of a hand-picked hex pair, so the
// chip re-balances correctly in dark mode (see buildToneColors below).
const STATUS_TONE = {
  // Appointment statuses
  scheduled: 'info',
  confirmed: 'info',
  completed: 'success',
  cancelled: 'error',
  pending: 'warning',
  no_show: 'neutral',

  // User roles
  system_admin: 'error',
  clinic_manager: 'secondary',
  clinician: 'success',
  receptionist: 'info',
  patient: 'warning',

  // Generic
  active: 'success',
  inactive: 'neutral',
  verified: 'success',
  new: 'secondary',

  // Payments
  paid: 'success',
  refunded: 'warning',
  failed: 'error',

  default: 'neutral',
}

function buildToneColors(theme, tone) {
  if (tone === 'neutral') {
    return { bg: theme.palette.action.selected, color: theme.palette.text.secondary }
  }
  const group = theme.palette[tone]
  const isDark = theme.palette.mode === 'dark'
  return {
    bg: alpha(group.main, isDark ? 0.22 : 0.14),
    color: isDark ? group.light : group.dark,
  }
}

export default function StitchStatusChip({ label, statusType = 'default', size = 'small', sx = {} }) {
  const theme = useTheme()
  const tone = STATUS_TONE[statusType?.toLowerCase()] ?? STATUS_TONE.default
  const config = buildToneColors(theme, tone)

  return (
    <Chip
      label={label}
      size={size}
      sx={{
        bgcolor: config.bg,
        color: config.color,
        fontWeight: 700,
        fontSize: size === 'small' ? '0.7rem' : '0.8rem',
        height: size === 'small' ? 22 : 28,
        borderRadius: '6px',
        border: 'none',
        '& .MuiChip-label': { px: 1.25 },
        ...sx,
      }}
    />
  )
}
