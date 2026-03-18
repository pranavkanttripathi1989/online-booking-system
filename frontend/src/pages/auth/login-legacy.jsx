import { useState } from 'react'
import { useNavigate, Link as RouterLink } from 'react-router-dom'
import {
  Box, Button, TextField, Typography, Alert, IconButton,
  InputAdornment, Chip, CircularProgress, Stack, Divider, Paper,
} from '@mui/material'
import { Helmet } from 'react-helmet-async'
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded'
import VisibilityOffRoundedIcon from '@mui/icons-material/VisibilityOffRounded'
import MedicalServicesIcon from '@mui/icons-material/MedicalServices'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import ShieldIcon from '@mui/icons-material/Shield'
import VideocamIcon from '@mui/icons-material/Videocam'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'

import { MOCK_USERS, useAuth } from '../../context/AuthContext'

// ─── Demo credentials ─────────────────────────────────────────────────────────
const DEMO_CREDS = [
  { label: 'Admin',      email: 'admin@medibook.dev',        password: 'password' },
  { label: 'Clinician',  email: 'clinician@medibook.dev',    password: 'password' },
  { label: 'Staff',      email: 'receptionist@medibook.dev', password: 'password' },
]

function isMockLogin(email, password) {
  return DEMO_CREDS.some((d) => d.email === email && d.password === password)
}

// ─── Left panel features ──────────────────────────────────────────────────────
const FEATURES = [
  { icon: CalendarMonthIcon, text: 'Book any specialist instantly' },
  { icon: ShieldIcon,        text: 'Secure & HIPAA-compliant' },
  { icon: VideocamIcon,      text: 'In-person or video consultations' },
]

// ─── LoginPage ────────────────────────────────────────────────────────────────
export default function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    // ── Mock fast path ────────────────────────────────────────────────────────
    if (isMockLogin(email, password)) {
      const mockUser  = MOCK_USERS[email]
      const mockToken = `mock_${btoa(email)}_${Date.now()}`
      login(mockToken, mockUser)
      navigate('/dashboard', { replace: true })
      return
    }

    // ── Real API ──────────────────────────────────────────────────────────────
    try {
      const res = await fetch('http://localhost:8000/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          query: `mutation Login($email: String!, $password: String!) { login(input: { email: $email, password: $password }) { access_token user { id name email roles { name } clinician { clinician_type { name } } } } }`,
          variables: { email, password },
        }),
      })
      const json = await res.json()
      const payload = json?.data?.login
      if (!payload?.access_token) throw new Error(json.errors?.[0]?.message ?? 'Invalid credentials')
      login(payload.access_token, payload.user)
      navigate('/dashboard', { replace: true })
    } catch (e) {
      setError(e.message ?? 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex' }}>
      <Helmet>
        <title>Sign In — HealthSync</title>
        <meta name="description" content="Sign in to HealthSync – your medical booking platform." />
      </Helmet>

      {/* ── Left Brand Panel (desktop only) ──────────────────────────────────── */}
      <Box sx={{
        display: { xs: 'none', md: 'flex' },
        flexDirection: 'column',
        justifyContent: 'space-between',
        width: '55%',
        minHeight: '100vh',
        background: 'linear-gradient(160deg, #003B42 0%, #006D77 55%, #0A9396 100%)',
        px: 7, py: 6,
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Decorative circles */}
        <Box sx={{ position: 'absolute', top: -100, right: -100, width: 380, height: 380, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />
        <Box sx={{ position: 'absolute', bottom: -80, left: -60, width: 300, height: 300, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.05)', pointerEvents: 'none' }} />

        {/* Logo */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, position: 'relative', zIndex: 1 }}>
          <Box sx={{ width: 40, height: 40, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <MedicalServicesIcon sx={{ color: '#83C5BE', fontSize: '1.2rem' }} />
          </Box>
          <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: '1.2rem', letterSpacing: '-0.3px' }}>
            HealthSync
          </Typography>
        </Box>

        {/* Center Content */}
        <Box sx={{ position: 'relative', zIndex: 1 }}>
          {/* Floating appointment card */}
          <Paper sx={{
            bgcolor: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: 3, p: 2, mb: 4, backdropFilter: 'blur(10px)',
          }}>
            <Typography sx={{ color: '#C8EFF0', fontSize: '0.75rem', fontWeight: 700, mb: 0.5 }}>
              📅 NEXT APPOINTMENT
            </Typography>
            <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: '0.95rem' }}>
              Dr. Sarah Johnson — Cardiology
            </Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.85rem' }}>
              Tomorrow at 10:00 AM
            </Typography>
          </Paper>

          <Typography variant="h1" sx={{ color: '#fff', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-1px', mb: 1.5 }}>
            Your health,<br />
            <Box component="span" sx={{ color: '#83C5BE' }}>perfectly scheduled</Box>
          </Typography>
          <Typography sx={{ color: 'rgba(255,255,255,0.65)', fontSize: '1rem', lineHeight: 1.75, mb: 4 }}>
            Search 2,000+ verified specialists across 120+ clinics. Book in seconds.
          </Typography>

          {/* Feature pills */}
          <Stack spacing={1.5}>
            {FEATURES.map(({ icon: Icon, text }) => (
              <Box key={text} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ width: 32, height: 32, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon sx={{ color: '#83C5BE', fontSize: '1rem' }} />
                </Box>
                <Typography sx={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.9rem' }}>
                  {text}
                </Typography>
              </Box>
            ))}
          </Stack>
        </Box>

        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.3)', position: 'relative', zIndex: 1 }}>
          © 2026 HealthSync · HIPAA Compliant · Trusted by 500+ clinics
        </Typography>
      </Box>

      {/* ── Right Form Panel ──────────────────────────────────────────────────── */}
      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', px: { xs: 2, sm: 4, md: 6 }, py: 6, bgcolor: '#F0F7F8' }}>
        <Box sx={{ width: '100%', maxWidth: 420 }}>

          {/* Mobile logo */}
          <Box sx={{ display: { xs: 'flex', md: 'none' }, mb: 3, alignItems: 'center', gap: 1 }}>
            <MedicalServicesIcon sx={{ color: '#006D77', fontSize: '1.6rem' }} />
            <Typography variant="h5" fontWeight={800} sx={{ color: '#006D77' }}>HealthSync</Typography>
          </Box>

          <Typography variant="h3" fontWeight={800} sx={{ color: '#1A2B3C', mb: 0.5 }}>
            Welcome back
          </Typography>
          <Typography variant="body2" sx={{ color: '#5A7184', mb: 3 }}>
            Sign in to access your HealthSync dashboard
          </Typography>

          {/* Demo login chips */}
          <Box sx={{ display: 'flex', gap: 1, mb: 3, flexWrap: 'wrap' }}>
            {DEMO_CREDS.map((cred) => (
              <Chip
                key={cred.label}
                label={`Try ${cred.label}`}
                onClick={() => { setEmail(cred.email); setPassword(cred.password); }}
                size="small"
                variant="outlined"
                icon={<CheckCircleIcon sx={{ fontSize: '14px !important', color: '#006D77' }} />}
                sx={{ cursor: 'pointer', fontWeight: 600, borderColor: '#83C5BE', color: '#006D77', '&:hover': { bgcolor: '#E8F8F9' } }}
              />
            ))}
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2.5 }}>{error}</Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} noValidate sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              type="email"
              label="Email Address"
              placeholder="you@clinic.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />

            <Box>
              <TextField
                fullWidth
                type={showPass ? 'text' : 'password'}
                label="Password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setShowPass(!showPass)} edge="end">
                        {showPass ? <VisibilityOffRoundedIcon fontSize="small" /> : <VisibilityRoundedIcon fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 0.5 }}>
                <Typography
                  component={RouterLink}
                  to="/forgot-password"
                  variant="caption"
                  sx={{ color: '#006D77', fontWeight: 600, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                >
                  Forgot password?
                </Typography>
              </Box>
            </Box>

            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              disabled={loading || !email || !password}
              sx={{ mt: 1, py: 1.5, fontWeight: 700, fontSize: '1rem' }}
            >
              {loading
                ? <CircularProgress size={22} color="inherit" />
                : 'Sign in to HealthSync'}
            </Button>
          </Box>

          <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', color: '#B0C4CE', mt: 4 }}>
            🔒 256-bit SSL · HIPAA compliant environment
          </Typography>
        </Box>
      </Box>
    </Box>
  )
}
