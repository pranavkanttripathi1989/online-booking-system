import React from 'react'
import { Chip } from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'

// BUG047 Phase 1 -- each role maps to a theme semantic tone instead of a
// hand-picked hex pair, so the badge re-balances correctly in dark mode.
const ROLE_CONFIG = {
  system_admin: { label: 'Admin', tone: 'error' },
  clinic_manager: { label: 'Manager', tone: 'secondary' },
  manager: { label: 'Manager', tone: 'secondary' },
  receptionist: { label: 'Staff', tone: 'info' },
  staff: { label: 'Staff', tone: 'info' },
  clinician: { label: 'Clinician', tone: 'success' },
  patient: { label: 'Patient', tone: 'warning' },
}

function toneColors(theme, tone) {
  if (!tone || !theme.palette[tone]) return { bgcolor: theme.palette.action.selected, color: theme.palette.text.secondary }
  const group = theme.palette[tone]
  const isDark = theme.palette.mode === 'dark'
  return { bgcolor: alpha(group.main, isDark ? 0.22 : 0.14), color: isDark ? group.light : group.dark }
}

export default function RoleBadge({ role, size = 'small' }) {
  const theme = useTheme()
  const key = role?.toLowerCase().replace(' ', '_')
  const config = ROLE_CONFIG[key] ?? { label: role, tone: null }
  const colors = toneColors(theme, config.tone)
  return <Chip size={size} label={config.label} sx={{ ...colors, fontWeight: 700, border: 'none' }} />
}
