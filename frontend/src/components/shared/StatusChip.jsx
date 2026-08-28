import React from 'react'
import { Chip } from '@mui/material'
import { alpha } from '@mui/material/styles'

const STATUS_CONFIG = {
  scheduled: { label: 'Scheduled', color: 'info' },
  confirmed: { label: 'Confirmed', color: 'primary' },
  // REQ042 — front-desk queue tracking (waiting-room/index.jsx).
  checked_in: { label: 'Checked In', color: 'primary' },
  in_consultation: { label: 'With Clinician', color: 'secondary' },
  completed: { label: 'Completed', color: 'success' },
  cancelled: { label: 'Cancelled', color: 'error' },
  // The backend emits `no_show` (Appointments.status, underscore). The hyphen
  // form is kept for any caller still passing it; without the underscore key
  // the chip fell through to the raw string, rendering a literal "no_show".
  no_show: { label: 'No Show', color: 'warning' },
  'no-show': { label: 'No Show', color: 'warning' },
  blocked: { label: 'Blocked', color: 'default' },
  pending: { label: 'Pending', color: 'warning' },
  paid: { label: 'Paid', color: 'success' },
  failed: { label: 'Failed', color: 'error' },
  active: { label: 'Active', color: 'success' },
  inactive: { label: 'Inactive', color: 'default' },
}

export default function StatusChip({ status, size = 'small' }) {
  const config = STATUS_CONFIG[status?.toLowerCase()] || { label: status, color: 'default' }

  const isBlocked = status?.toLowerCase() === 'blocked'
  return (
    <Chip
      size={size}
      label={config.label}
      color={config.color}
      variant="outlined"
      sx={
        isBlocked
          ? {
              bgcolor: (t) => alpha(t.palette.secondary.main, 0.14),
              color: 'secondary.dark',
              borderColor: (t) => alpha(t.palette.secondary.main, 0.4),
            }
          : undefined
      }
    />
  )
}
