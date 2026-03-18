import { Outlet, useLocation } from 'react-router-dom'
import { Box, Typography, Button, Chip, Stack } from '@mui/material'
import { LockOutlined, ArrowBack, EmailOutlined } from '@mui/icons-material'
import { useAuth } from '../../context/AuthContext'

// ─── Forbidden 403 Component ─────────────────────────────────────────────────
// Also exported as a standalone page (src/pages/Forbidden403.jsx imports this)

// SUG-AUTH-012: Richer 403 page — shows user role + attempted path + contact admin
export function Forbidden403() {
  const { user } = useAuth()
  const location  = useLocation()
  const roleNames = user?.roles?.map(r => r.name).join(', ') ?? 'unknown'
  const attempted = location?.pathname ?? 'this page'

  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      minHeight="100vh"
      textAlign="center"
      p={{ xs: 3, sm: 4 }}
      bgcolor="#F8F9FA"
    >
      {/* Red lock circle */}
      <Box sx={{
        width: 100, height: 100, borderRadius: '50%',
        bgcolor: '#FCE8E6', border: '2px solid #F5C6C2',
        display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 3,
      }}>
        <LockOutlined sx={{ fontSize: 50, color: '#D93025' }} />
      </Box>

      {/* 403 gradient text */}
      <Typography
        variant="h1"
        fontWeight={900}
        sx={{
          fontSize: { xs: '5rem', sm: '8rem' },
          lineHeight: 1, mb: 2, letterSpacing: '-4px',
          background: 'linear-gradient(135deg, #D93025 30%, #EA4335 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}
      >
        403
      </Typography>

      <Typography variant="h5" fontWeight={700} sx={{ color: '#202124' }} mb={1}>
        Access Forbidden
      </Typography>

      {/* SUG-AUTH-012: Role + path context */}
      {user && (
        <Stack direction="row" spacing={1} alignItems="center" mb={1.5}>
          <Typography variant="body2" color="text.secondary">Signed in as:</Typography>
          <Chip
            label={roleNames}
            size="small"
            sx={{ fontWeight: 700, bgcolor: '#F1F3F4', color: '#3C4043', textTransform: 'capitalize' }}
          />
        </Stack>
      )}

      <Typography variant="body1" sx={{ color: '#5F6368', maxWidth: 420 }} mb={0.75}>
        Your role <strong>({roleNames})</strong> does not have access to <code style={{ background: '#F1F3F4', padding: '1px 6px', borderRadius: 4 }}>{attempted}</code>.
      </Typography>
      <Typography variant="body2" sx={{ color: '#80868B', maxWidth: 380 }} mb={4}>
        Contact your administrator if you believe this is a mistake.
      </Typography>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
        <Button
          variant="outlined"
          startIcon={<ArrowBack />}
          onClick={() => window.history.back()}
          sx={{
            borderRadius: 2, textTransform: 'none', fontWeight: 700,
            borderColor: '#D93025', color: '#D93025',
            '&:hover': { bgcolor: '#FCE8E6', borderColor: '#D93025' },
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
            borderRadius: 2, textTransform: 'none', fontWeight: 700,
            borderColor: '#1A73E8', color: '#1A73E8',
            '&:hover': { bgcolor: 'rgba(26,115,232,0.06)' },
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
