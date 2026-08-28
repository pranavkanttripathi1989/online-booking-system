import { Outlet, useLocation } from 'react-router-dom'
import { Box, Typography, Button, Chip, Stack } from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'
import { LockOutlined, ArrowBack, EmailOutlined } from '@mui/icons-material'
import { useAuth } from '../../context/AuthContext'

// ─── Forbidden 403 Component ─────────────────────────────────────────────────
// Also exported as a standalone page (src/pages/Forbidden403.jsx imports this)

// SUG-AUTH-012: Richer 403 page — shows user role + attempted path + contact admin
export function Forbidden403() {
  const { user } = useAuth()
  const location = useLocation()
  const theme = useTheme()
  const roleNames = user?.roles?.map((r) => r.name).join(', ') ?? 'unknown'
  const attempted = location?.pathname ?? 'this page'
  const isDark = theme.palette.mode === 'dark'

  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      minHeight="100vh"
      textAlign="center"
      p={{ xs: 3, sm: 4 }}
      bgcolor="background.default"
    >
      {/* Red lock circle */}
      <Box
        sx={{
          width: 100,
          height: 100,
          borderRadius: '50%',
          bgcolor: alpha(theme.palette.error.main, isDark ? 0.2 : 0.12),
          border: '2px solid',
          borderColor: alpha(theme.palette.error.main, isDark ? 0.4 : 0.28),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mb: 3,
        }}
      >
        <LockOutlined sx={{ fontSize: 50, color: 'error.main' }} />
      </Box>

      {/* 403 gradient text */}
      <Typography
        variant="h1"
        fontWeight={900}
        sx={{
          fontSize: { xs: '5rem', sm: '8rem' },
          lineHeight: 1,
          mb: 2,
          letterSpacing: '-4px',
          background: `linear-gradient(135deg, ${theme.palette.error.main} 30%, ${theme.palette.error.light} 100%)`,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}
      >
        403
      </Typography>

      <Typography variant="h5" fontWeight={700} sx={{ color: 'text.primary' }} mb={1}>
        Access Forbidden
      </Typography>

      {/* SUG-AUTH-012: Role + path context */}
      {user && (
        <Stack direction="row" spacing={1} alignItems="center" mb={1.5}>
          <Typography variant="body2" color="text.secondary">
            Signed in as:
          </Typography>
          <Chip
            label={roleNames}
            size="small"
            sx={{ fontWeight: 700, bgcolor: 'action.selected', color: 'text.primary', textTransform: 'capitalize' }}
          />
        </Stack>
      )}

      <Typography variant="body1" sx={{ color: 'text.secondary', maxWidth: 420 }} mb={0.75}>
        Your role <strong>({roleNames})</strong> does not have access to{' '}
        <Box
          component="code"
          sx={{ bgcolor: 'action.selected', color: 'text.primary', padding: '1px 6px', borderRadius: '4px' }}
        >
          {attempted}
        </Box>
        .
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.disabled', maxWidth: 380 }} mb={4}>
        Contact your administrator if you believe this is a mistake.
      </Typography>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
        <Button
          variant="outlined"
          startIcon={<ArrowBack />}
          onClick={() => window.history.back()}
          sx={{
            borderRadius: 2,
            textTransform: 'none',
            fontWeight: 700,
            borderColor: 'error.main',
            color: 'error.main',
            '&:hover': { bgcolor: (t) => alpha(t.palette.error.main, 0.08), borderColor: 'error.main' },
          }}
        >
          Go Back
        </Button>
        <Button
          variant="outlined"
          startIcon={<EmailOutlined />}
          component="a"
          href={`mailto:admin@medibook.dev?subject=Access Request: ${attempted}&body=Hi Admin, I (${user?.email ?? 'unknown'}) need access to ${attempted}. My role is ${roleNames}.`}
          sx={{
            borderRadius: 2,
            textTransform: 'none',
            fontWeight: 700,
            borderColor: 'primary.main',
            color: 'primary.main',
            '&:hover': { bgcolor: (t) => alpha(t.palette.primary.main, 0.08) },
          }}
        >
          Request Access
        </Button>
      </Stack>
    </Box>
  )
}

// ─── Role Guard ──────────────────────────────────────────────────────────────

/**
 * RoleGuard — wraps routes that require specific user roles.
 *
 * Usage in App.jsx:
 *   <Route element={<RoleGuard roles={['admin', 'super_admin']} />}>
 *     <Route path="/settings" element={<SettingsPage />} />
 *   </Route>
 */
export default function RoleGuard({ roles = [] }) {
  const { user, hasRole } = useAuth()

  // If no roles array provided, allow all authenticated users
  if (!roles.length) return <Outlet />

  const isAuthorised = roles.some((role) => hasRole(role))

  if (!isAuthorised) {
    return <Forbidden403 />
  }

  return <Outlet />
}
