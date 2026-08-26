import React from 'react'
import { Chip } from '@mui/material'

const ROLE_CONFIG = {
  system_admin: { label: 'Admin', bgcolor: '#FFE4E6', color: '#9F1239' },
  clinic_manager: { label: 'Manager', bgcolor: '#EDE9FE', color: '#4C1D95' },
  manager: { label: 'Manager', bgcolor: '#EDE9FE', color: '#4C1D95' },
  receptionist: { label: 'Staff', bgcolor: '#DBEAFE', color: '#1E40AF' },
  staff: { label: 'Staff', bgcolor: '#DBEAFE', color: '#1E40AF' },
  clinician: { label: 'Clinician', bgcolor: '#D1FAE5', color: '#065F46' },
  patient: { label: 'Patient', bgcolor: '#FEF3C7', color: '#92400E' },
}

export default function RoleBadge({ role, size = 'small' }) {
  const key = role?.toLowerCase().replace(' ', '_')
  const config = ROLE_CONFIG[key] || { label: role, bgcolor: '#F3F4F6', color: '#374151' }
  return <Chip size={size} label={config.label} sx={{ bgcolor: config.bgcolor, color: config.color, fontWeight: 700, border: 'none' }} />
}
