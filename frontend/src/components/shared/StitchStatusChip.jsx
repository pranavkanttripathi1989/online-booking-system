import React from 'react';
import { Chip } from '@mui/material';

/**
 * StitchStatusChip — Soft-background pill chip matching Stitch design.
 * 
 * Props:
 *   label      {string} — Text to show
 *   statusType {string} — One of the STATUS_CONFIG keys below
 *   size       {string} — 'small' (default) | 'medium'
 */

const STATUS_CONFIG = {
  // Appointment statuses
  scheduled:   { bg: '#DBEAFE', color: '#1E40AF' },
  confirmed:   { bg: '#DBEAFE', color: '#1E40AF' },
  completed:   { bg: '#D1FAE5', color: '#065F46' },
  cancelled:   { bg: '#FEE2E2', color: '#B91C1C' },
  pending:     { bg: '#FEF3C7', color: '#92400E' },
  no_show:     { bg: '#F1F5F9', color: '#475569' },

  // User roles
  system_admin:   { bg: '#FEE2E2', color: '#B91C1C' },
  clinic_manager: { bg: '#EDE9FE', color: '#6D28D9' },
  clinician:      { bg: '#D1FAE5', color: '#065F46' },
  receptionist:   { bg: '#DBEAFE', color: '#1E40AF' },
  patient:        { bg: '#FEF3C7', color: '#92400E' },

  // Generic
  active:   { bg: '#D1FAE5', color: '#065F46' },
  inactive: { bg: '#F1F5F9', color: '#94A3B8' },
  verified: { bg: '#D1FAE5', color: '#065F46' },
  new:      { bg: '#EDE9FE', color: '#6D28D9' },

  // Payments
  paid:    { bg: '#D1FAE5', color: '#065F46' },
  refunded:{ bg: '#FEF3C7', color: '#92400E' },
  failed:  { bg: '#FEE2E2', color: '#B91C1C' },

  // Fallback
  default: { bg: '#F1F5F9', color: '#475569' },
};

export default function StitchStatusChip({ label, statusType = 'default', size = 'small', sx = {} }) {
  const config = STATUS_CONFIG[statusType?.toLowerCase()] || STATUS_CONFIG.default;

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
  );
}
