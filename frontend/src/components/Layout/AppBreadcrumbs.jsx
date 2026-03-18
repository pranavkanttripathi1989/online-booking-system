import { useLocation, Link as RouterLink } from 'react-router-dom'
import {
  Breadcrumbs,
  Link,
  Typography,
  Box,
} from '@mui/material'
import { NavigateNextRounded, HomeRounded } from '@mui/icons-material'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SEGMENT_LABELS = {
  dashboard:    'Dashboard',
  appointments: 'Appointments',
  new:          'New Booking',
  calendar:     'Calendar',
  clinicians:   'Clinicians',
  patients:     'Patients',
  settings:     'Settings',
  profile:      'Profile',
}

function toLabel(segment) {
  return (
    SEGMENT_LABELS[segment.toLowerCase()] ??
    segment.charAt(0).toUpperCase() + segment.slice(1)
  )
}

// ─── Breadcrumbs ─────────────────────────────────────────────────────────────

export default function AppBreadcrumbs() {
  const { pathname } = useLocation()

  // Split into non-empty segments
  const segments = pathname.split('/').filter(Boolean)

  // No breadcrumb needed on root
  if (segments.length <= 1) return null

  // Build path accumulator
  const crumbs = segments.map((seg, i) => ({
    label: toLabel(seg),
    path: '/' + segments.slice(0, i + 1).join('/'),
    isLast: i === segments.length - 1,
  }))

  return (
    <Box sx={{ mb: { sm: 1.5, md: 2 }, display: { xs: 'none', sm: 'block' } }}>
      <Breadcrumbs
        separator={<NavigateNextRounded sx={{ fontSize: 16, color: '#9AA0A6' }} />}
        aria-label="breadcrumb"
        sx={{ fontSize: '0.8125rem' }}
      >
        {/* Home */}
        <Link
          component={RouterLink}
          to="/dashboard"
          underline="hover"
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.4,
            color: '#1A73E8',
            fontWeight: 500,
            fontSize: '0.8125rem',
            '&:hover': { textDecoration: 'underline' },
          }}
        >
          <HomeRounded sx={{ fontSize: 15, mb: '1px' }} />
          Home
        </Link>

        {crumbs.map((crumb) =>
          crumb.isLast ? (
            <Typography
              key={crumb.path}
              variant="body2"
              fontWeight={600}
              sx={{ color: '#202124', fontSize: '0.8125rem' }}
            >
              {crumb.label}
            </Typography>
          ) : (
            <Link
              key={crumb.path}
              component={RouterLink}
              to={crumb.path}
              underline="hover"
              sx={{
                color: '#1A73E8',
                fontWeight: 500,
                fontSize: '0.8125rem',
                '&:hover': { textDecoration: 'underline' },
              }}
            >
              {crumb.label}
            </Link>
          )
        )}
      </Breadcrumbs>
    </Box>
  )
}
