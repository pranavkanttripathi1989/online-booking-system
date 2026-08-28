/**
 * AG-2 — Login.jsx
 * Two-column auth screen: Sign In | Register | Forgot Password tabs
 * Wired to LOGIN_MUTATION (GraphQL) + AuthContext.login()
 */
import React, { useState, useEffect } from 'react'
import { useNavigate, Navigate, useSearchParams } from 'react-router-dom'
import {
  Box,
  Grid,
  Paper,
  Stack,
  Typography,
  Tabs,
  Tab,
  TextField,
  Button,
  InputAdornment,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  CircularProgress,
  Link,
  Divider,
  Checkbox,
  FormControlLabel,
  LinearProgress,
  Tooltip,
  Chip,
} from '@mui/material'
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded'
import { alpha, useTheme } from '@mui/material/styles'
import { useMutation } from '@apollo/client'
import { LOGIN_MUTATION, VERIFY_TOTP_LOGIN_MUTATION, REQUEST_OTP_MUTATION, VERIFY_OTP_MUTATION } from '../../graphql/mutations'
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined'
import { useAuth, getPostLoginRedirect } from '../../context/AuthContext'

// REQ012/PLAN021 Slice 1 — "Require MFA for all staff": when the org
// requires it and this account hasn't enrolled yet, land on the 2FA
// enrollment step instead of the normal post-login destination. Login
// itself still succeeds (see the backend's AuthPayload.mfa_setup_required
// field comment for why) -- this is a redirect, not a second auth gate.
function redirectAfterLogin(navigate, user, mfaSetupRequired) {
  if (mfaSetupRequired) {
    navigate('/settings', { state: { tab: 1, mfaSetupRequired: true } })
  } else {
    navigate(getPostLoginRedirect(user))
  }
}
import LocalHospitalIcon from '@mui/icons-material/LocalHospital'
import MedicalServicesIcon from '@mui/icons-material/MedicalServices'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined'
import VisibilityIcon from '@mui/icons-material/Visibility'
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import PersonOutlineIcon from '@mui/icons-material/PersonOutline'
import SendIcon from '@mui/icons-material/Send'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked'
import PhoneAndroidIcon from '@mui/icons-material/PhoneAndroid'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'

// ─── Demo account role descriptions ─────────────────────────────────────────
const DEMO_ACCOUNTS = [
  {
    label: 'Admin',
    email: 'admin@medibook.dev',
    password: 'Admin1234!',
    role: 'admin',
    tooltip: 'Full access to all admin features, staff, finances & analytics',
  },
  {
    label: 'Manager',
    email: 'manager@medibook.dev',
    password: 'Mgr1234!',
    role: 'manager',
    tooltip: 'Manages clinicians, schedules and availability for an organisation',
  },
  {
    label: 'Clinician',
    email: 'clinician@medibook.dev',
    password: 'Cln1234!',
    role: 'clinician',
    tooltip: 'Clinician portal: calendar, patients, availability & consultations',
  },
  {
    label: 'Staff',
    email: 'receptionist@medibook.dev',
    password: 'Rec1234!',
    role: 'staff',
    tooltip: 'Reception / staff dashboard: appointments & patient check-ins',
  },
  {
    label: 'Patient',
    email: 'patient@medibook.dev',
    password: 'Pat1234!',
    role: 'patient',
    tooltip: 'Patient portal: book appointments, view history & messages',
  },
]

// ─── Password strength meter (SUG-AUTH-004) ─────────────────────────────────
function getPasswordStrength(pw) {
  const rules = [
    { key: 'length', label: 'At least 8 characters', met: pw.length >= 8 },
    { key: 'uppercase', label: 'Contains uppercase letter', met: /[A-Z]/.test(pw) },
    { key: 'number', label: 'Contains a number', met: /\d/.test(pw) },
    { key: 'special', label: 'Contains a special character', met: /[^A-Za-z0-9]/.test(pw) },
  ]
  const score = rules.filter((r) => r.met).length
  const strength = score === 0 ? '' : score <= 1 ? 'Weak' : score <= 2 ? 'Fair' : score === 3 ? 'Good' : 'Strong'
  return { rules, score, strength }
}

// BUG047 Phase 2 -- strength tone is a semantic theme colour, not hand-picked hex.
const STRENGTH_TONE = { Weak: 'error', Fair: 'warning', Good: 'info', Strong: 'success' }

function PasswordStrengthMeter({ password }) {
  const theme = useTheme()
  const { rules, score, strength } = getPasswordStrength(password)
  const tone = STRENGTH_TONE[strength]
  const color = tone ? theme.palette[tone].main : theme.palette.divider
  if (!password) return null
  return (
    <Box mt={0.5}>
      <LinearProgress
        variant="determinate"
        value={(score / 4) * 100}
        sx={{
          height: 4,
          borderRadius: 2,
          mb: 1,
          bgcolor: 'divider',
          '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 2, transition: 'all 0.3s' },
        }}
      />
      <Stack spacing={0.4}>
        {rules.map((r) => (
          <Stack key={r.key} direction="row" spacing={0.75} alignItems="center">
            {r.met ? (
              <CheckCircleOutlineIcon sx={{ fontSize: '0.8rem', color: 'success.main', flexShrink: 0 }} />
            ) : (
              <RadioButtonUncheckedIcon sx={{ fontSize: '0.8rem', color: 'divider', flexShrink: 0 }} />
            )}
            <Typography variant="caption" sx={{ color: r.met ? 'success.main' : 'text.disabled', lineHeight: 1.4 }}>
              {r.label}
            </Typography>
          </Stack>
        ))}
      </Stack>
      {strength && (
        <Typography variant="caption" sx={{ color, fontWeight: 700, mt: 0.5, display: 'block' }}>
          Strength: {strength}
        </Typography>
      )}
    </Box>
  )
}

// ─── OTP Input (NEW-AUTH-004 / NEW-AUTH-005) ──────────────────────────────────
// Single MUI TextField styled to look like 6 separated digit boxes.
// Simple & guaranteed to render — avoids per-box ref/hook complexity.
function OtpInputBoxes({ value, onChange, disabled }) {
  const handleChange = (e) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 6)
    onChange(digits)
  }

  // Format "123456" as "1 2 3 4 5 6" for display only in a "preview" — but we
  // keep the actual value as raw digits for logic; letter-spacing does the visual separation
  return (
    <TextField
      fullWidth
      value={value}
      onChange={handleChange}
      disabled={disabled}
      placeholder="••••••"
      inputProps={{
        maxLength: 6,
        inputMode: 'numeric',
        pattern: '[0-9]*',
        'aria-label': 'Enter OTP code',
      }}
      sx={{
        '& .MuiOutlinedInput-input': {
          textAlign: 'center',
          fontSize: '2rem',
          fontWeight: 700,
          letterSpacing: '0.6em',
          fontFamily: 'monospace',
          py: 1.5,
          color: 'primary.main',
        },
        '& .MuiOutlinedInput-root': {
          borderRadius: 2,
          '& fieldset': { borderWidth: 2 },
          '&.Mui-focused fieldset': { borderColor: 'primary.main', boxShadow: (t) => `0 0 0 3px ${alpha(t.palette.primary.main, 0.15)}` },
          bgcolor: value ? (t) => alpha(t.palette.primary.main, 0.05) : undefined,
        },
      }}
    />
  )
}

// ─── OTP Login Mode (NEW-AUTH-004) ────────────────────────────────────────────
// F-02 fix: this used to accept a hardcoded "123456" client-side with no
// backend call at all — anyone could sign in as any seeded account just by
// knowing its email. Now wired to the real requestOtp/verifyOtp resolvers
// (auth.resolver.ts): OTP is phone-keyed only (RequestOtpInput has no email
// field — matching the real contract, not inventing a "reasonable" one),
// server-generated, Redis-backed with a real TTL, and 3-attempt lockout is
// enforced server-side. requestOtp deliberately returns {success:true}
// whether or not the phone is registered (its own comment: avoids leaking
// account existence over the OTP channel), so the UI always proceeds to the
// verify step uniformly.
function OtpLoginMode({ onBack, rememberMe }) {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [requestOtpMutation] = useMutation(REQUEST_OTP_MUTATION)
  const [verifyOtpMutation] = useMutation(VERIFY_OTP_MUTATION)

  const [step, setStep] = useState('identifier') // 'identifier' | 'verify'
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [hint, setHint] = useState('')
  const [cooldown, setCooldown] = useState(0)

  // Resend countdown
  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  const handleSendOtp = async (e) => {
    e.preventDefault()
    if (!phone) return
    setError('')
    setLoading(true)
    try {
      await requestOtpMutation({ variables: { input: { phone } } })
      setStep('verify')
      setCooldown(60)
      setHint(`If ${phone} is a registered account, a code has been sent.`)
    } catch (err) {
      setError(err?.graphQLErrors?.[0]?.message || err?.message || 'Could not send code. Try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleVerify = async (e) => {
    e?.preventDefault()
    if (otp.length !== 6) return
    setError('')
    setLoading(true)
    try {
      const { data } = await verifyOtpMutation({ variables: { input: { phone, code: otp } } })
      const { user, mfa_setup_required, session_timeout_minutes } = data.verifyOtp
      login(user, rememberMe, session_timeout_minutes)
      navigate(getPostLoginRedirect(user), { state: mfa_setup_required ? { tab: 1, mfaSetupRequired: true } : undefined })
    } catch (err) {
      setOtp('')
      setError(err?.graphQLErrors?.[0]?.message || err?.message || 'Incorrect code.')
    } finally {
      setLoading(false)
    }
  }

  // Auto-submit when all 6 digits entered
  useEffect(() => {
    if (otp.length === 6) handleVerify()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otp])

  return (
    <Stack spacing={2}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Link
          component="button"
          type="button"
          onClick={onBack}
          sx={{ color: 'primary.main', fontWeight: 600, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 0.5 }}
        >
          ← Back to password
        </Link>
        <Chip
          label="Passwordless"
          size="small"
          sx={{ bgcolor: (t) => alpha(t.palette.primary.main, 0.10), color: 'primary.main', fontWeight: 700, fontSize: '0.65rem', height: 20 }}
        />
      </Box>

      <Typography variant="body2" color="text.secondary">
        {step === 'identifier'
          ? 'Enter your registered phone number to receive a one-time code.'
          : `Enter the 6-digit code sent to ${phone}`}
      </Typography>

      {error && (
        <Alert severity="error" onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      {hint && step === 'verify' && (
        <Alert
          severity="info"
          icon={false}
          sx={{ bgcolor: (t) => alpha(t.palette.primary.main, 0.06), color: 'primary.main', border: (t) => `1px solid ${alpha(t.palette.primary.main, 0.20)}`, py: 0.5 }}
        >
          🔑 {hint}
        </Alert>
      )}

      {step === 'identifier' ? (
        <Box component="form" onSubmit={handleSendOtp} noValidate>
          <Stack spacing={2}>
            <TextField
              fullWidth
              autoFocus
              label="Phone Number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              inputProps={{ 'aria-label': 'Phone number for OTP' }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PhoneAndroidIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                  </InputAdornment>
                ),
              }}
            />
            <Button type="submit" variant="contained" fullWidth size="large" disabled={loading || !phone} sx={{ py: 1.5, fontWeight: 700 }}>
              {loading ? <CircularProgress size={20} color="inherit" /> : 'Send One-Time Code'}
            </Button>
          </Stack>
        </Box>
      ) : (
        <Stack spacing={2}>
          <OtpInputBoxes value={otp} onChange={setOtp} disabled={loading} />
          <Button
            variant="contained"
            fullWidth
            size="large"
            onClick={handleVerify}
            disabled={loading || otp.length < 6}
            sx={{ py: 1.5, fontWeight: 700 }}
          >
            {loading ? <CircularProgress size={20} color="inherit" /> : 'Verify & Sign In'}
          </Button>
          {/* Resend */}
          {cooldown > 0 ? (
            <Typography variant="caption" color="text.disabled" textAlign="center">
              Resend code in {cooldown}s
            </Typography>
          ) : (
            <Button size="small" onClick={handleSendOtp} sx={{ alignSelf: 'center' }}>
              Resend Code
            </Button>
          )}
        </Stack>
      )}
    </Stack>
  )
}

// ─── Mobile Signup Mode (NEW-AUTH-005) ────────────────────────────────────────
// Not a login path and never grants a session — handleCreate below only sets
// local `success` state, matching RegisterTab's own already-labeled "Simulate
// registration — replace with real GraphQL mutation when backend ready."
// There is no real phone-based signup endpoint to wire this to yet (the
// backend's `register` mutation is email+password only). This local demo
// code is scoped to this component's own wizard-step progression only —
// distinct from OtpLoginMode above, which is a real authentication path and
// must never accept a fixed code.
const SIGNUP_WIZARD_DEMO_CODE = '123456'

function MobileSignupMode({ onBack }) {
  const [step, setStep] = useState('phone') // 'phone' | 'verify' | 'profile'
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState('patient')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [hint, setHint] = useState('')
  const [success, setSuccess] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  const handleSendSms = async (e) => {
    e.preventDefault()
    if (!phone) return
    setError('')
    setLoading(true)
    await new Promise((r) => setTimeout(r, 1500))
    setLoading(false)
    setStep('verify')
    setCooldown(60)
    setHint(`Demo mode — use code: ${SIGNUP_WIZARD_DEMO_CODE}`)
  }

  const handleVerifyOtp = async (e) => {
    e?.preventDefault()
    if (otp.length < 6) return
    setError('')
    setLoading(true)
    await new Promise((r) => setTimeout(r, 800))
    setLoading(false)
    if (otp === SIGNUP_WIZARD_DEMO_CODE) {
      setStep('profile')
      setHint('')
    } else {
      setError(`Incorrect code. In demo mode use ${SIGNUP_WIZARD_DEMO_CODE}.`)
    }
  }

  useEffect(() => {
    if (step === 'verify' && otp.length === 6) handleVerifyOtp()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otp, step])

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!name) return
    setLoading(true)
    await new Promise((r) => setTimeout(r, 1200))
    setLoading(false)
    setSuccess(true)
  }

  if (success) {
    return (
      <Box sx={{ textAlign: 'center', py: 3 }}>
        <CheckCircleIcon sx={{ fontSize: 52, color: 'success.main', mb: 1 }} />
        <Typography variant="h5" fontWeight={700} sx={{ mb: 1 }}>
          Mobile Account Ready!
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Sign in anytime with your mobile number <strong>{phone}</strong> and an OTP.
        </Typography>
        <Button variant="outlined" onClick={onBack} sx={{ color: 'primary.main', borderColor: 'primary.main' }}>
          Sign In Now
        </Button>
      </Box>
    )
  }

  return (
    <Stack spacing={2}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Link component="button" type="button" onClick={onBack} sx={{ color: 'primary.main', fontWeight: 600, fontSize: '0.8rem' }}>
          ← Back to email signup
        </Link>
        <Chip
          label="Mobile"
          size="small"
          sx={{ bgcolor: (t) => alpha(t.palette.primary.main, 0.10), color: 'primary.main', fontWeight: 700, fontSize: '0.65rem', height: 20 }}
        />
      </Box>

      {/* Step indicator */}
      <Stack direction="row" spacing={1} alignItems="center">
        {['Phone', 'Verify', 'Profile'].map((label, i) => {
          const stepIdx = { phone: 0, verify: 1, profile: 2 }[step]
          const done = i < stepIdx
          const active = i === stepIdx
          return (
            <React.Fragment key={label}>
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.3 }}>
                <Box
                  sx={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: done ? 'success.main' : active ? 'primary.main' : 'divider',
                    fontSize: '0.65rem',
                    fontWeight: 800,
                    color: done || active ? 'common.white' : 'text.disabled',
                  }}
                >
                  {done ? '✓' : i + 1}
                </Box>
                <Typography
                  variant="caption"
                  sx={{ fontSize: '0.6rem', color: active ? 'primary.main' : 'text.disabled', fontWeight: active ? 700 : 400 }}
                >
                  {label}
                </Typography>
              </Box>
              {i < 2 && <Box sx={{ flex: 1, height: 2, bgcolor: done ? 'success.main' : 'divider', borderRadius: 1, mb: 2 }} />}
            </React.Fragment>
          )
        })}
      </Stack>

      {error && (
        <Alert severity="error" onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      {hint && (
        <Alert
          severity="info"
          icon={false}
          sx={{ bgcolor: (t) => alpha(t.palette.primary.main, 0.06), color: 'primary.main', border: (t) => `1px solid ${alpha(t.palette.primary.main, 0.20)}`, py: 0.5 }}
        >
          🔑 {hint}
        </Alert>
      )}

      {step === 'phone' && (
        <Box component="form" onSubmit={handleSendSms} noValidate>
          <Stack spacing={2}>
            <TextField
              fullWidth
              autoFocus
              label="Mobile Number"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98765 43210"
              inputProps={{ 'aria-label': 'Mobile number for signup' }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PhoneAndroidIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                  </InputAdornment>
                ),
              }}
            />
            <Button type="submit" variant="contained" fullWidth size="large" disabled={loading || !phone} sx={{ py: 1.5, fontWeight: 700 }}>
              {loading ? <CircularProgress size={20} color="inherit" /> : 'Send Verification Code'}
            </Button>
          </Stack>
        </Box>
      )}

      {step === 'verify' && (
        <Stack spacing={2}>
          <Typography variant="body2" color="text.secondary">
            Enter the 6-digit code sent to <strong>{phone}</strong>
          </Typography>
          <OtpInputBoxes value={otp} onChange={setOtp} disabled={loading} />
          <Button
            variant="contained"
            fullWidth
            size="large"
            onClick={handleVerifyOtp}
            disabled={loading || otp.length < 6}
            sx={{ py: 1.5, fontWeight: 700 }}
          >
            {loading ? <CircularProgress size={20} color="inherit" /> : 'Verify Number'}
          </Button>
          {cooldown > 0 ? (
            <Typography variant="caption" color="text.disabled" textAlign="center">
              Resend in {cooldown}s
            </Typography>
          ) : (
            <Button size="small" onClick={handleSendSms} sx={{ alignSelf: 'center' }}>
              Resend Code
            </Button>
          )}
        </Stack>
      )}

      {step === 'profile' && (
        <Box component="form" onSubmit={handleCreate} noValidate>
          <Stack spacing={2}>
            <TextField
              fullWidth
              autoFocus
              label="Your Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              inputProps={{ 'aria-label': 'Display name' }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PersonOutlineIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                  </InputAdornment>
                ),
              }}
            />
            <FormControl fullWidth>
              <InputLabel>I am a…</InputLabel>
              <Select value={role} onChange={(e) => setRole(e.target.value)} label="I am a…">
                <MenuItem value="patient">Patient</MenuItem>
                <MenuItem value="clinician">Clinician</MenuItem>
                <MenuItem value="receptionist">Receptionist / Staff</MenuItem>
              </Select>
            </FormControl>
            <Button type="submit" variant="contained" fullWidth size="large" disabled={loading || !name} sx={{ py: 1.5, fontWeight: 700 }}>
              {loading ? <CircularProgress size={20} color="inherit" /> : 'Create Mobile Account'}
            </Button>
          </Stack>
        </Box>
      )}
    </Stack>
  )
}

// ─── Left brand panel ─────────────────────────────────────────────────────────
// BUG047 Phase 2 -- deliberate literal exception: a marketing/brand showcase
// panel with its own fixed teal gradient, independent of the app's own
// light/dark mode -- the same convention as PublicLayout's marketing footer.
function BrandPanel() {
  return (
    <Box
      sx={{
        display: { xs: 'none', md: 'flex' },
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(160deg, #004D55 0%, #006D77 60%, #0A9396 100%)',
        p: 8,
        minHeight: '100vh',
      }}
    >
      {/* Logo mark */}
      <Box
        sx={{
          width: 80,
          height: 80,
          borderRadius: '50%',
          bgcolor: 'rgba(255,255,255,0.12)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mb: 3,
        }}
      >
        <MedicalServicesIcon sx={{ fontSize: 40, color: '#fff' }} />
      </Box>

      <Typography variant="h5" sx={{ color: '#fff', fontWeight: 700, mb: 1, textAlign: 'center' }}>
        Your health,
        <br />
        perfectly scheduled
      </Typography>
      <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)', mb: 5, textAlign: 'center', maxWidth: 260 }}>
        The all-in-one platform for modern healthcare practices
      </Typography>

      {/* Feature list */}
      <Stack spacing={2.5} sx={{ width: '100%', maxWidth: 280 }}>
        {[
          'Book any specialist instantly',
          // BUG030 -- India-market product; was 'GDPR compliant', the wrong
          // jurisdiction's law named on the first page every visitor sees.
          'Secure and private — DPDP compliant',
          'In-person or video consultations',
          'Automated reminders & follow-ups',
        ].map((text) => (
          <Stack key={text} direction="row" alignItems="center" spacing={1.5}>
            <CheckCircleIcon sx={{ color: '#83C5BE', fontSize: 20, flexShrink: 0 }} />
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.85)' }}>
              {text}
            </Typography>
          </Stack>
        ))}
      </Stack>
    </Box>
  )
}

// ─── Sign In Tab ──────────────────────────────────────────────────────────────
// ─── TOTP challenge step (PLAN016 Slice C) ─────────────────────────────────
// Rendered after a normal password login returns TotpChallengeType instead
// of tokens. Accepts either a 6-digit authenticator code or a single-use
// backup code — verifyTotpLogin tries both server-side, so this is one
// plain text field rather than two separate flows.
function TotpChallengeStep({ challengeToken, rememberMe, onBack }) {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [verifyTotpLogin] = useMutation(VERIFY_TOTP_LOGIN_MUTATION)

  const handleVerify = async (e) => {
    e?.preventDefault()
    if (!code) return
    setError('')
    setLoading(true)
    try {
      const { data } = await verifyTotpLogin({
        variables: { input: { challenge_token: challengeToken, code } },
      })
      const { user, mfa_setup_required, session_timeout_minutes } = data.verifyTotpLogin
      login(user, rememberMe, session_timeout_minutes)
      redirectAfterLogin(navigate, user, mfa_setup_required)
    } catch (err) {
      setError(err?.graphQLErrors?.[0]?.message || err?.message || 'Incorrect code')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box component="form" onSubmit={handleVerify} noValidate>
      <Stack spacing={2}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Link
            component="button"
            type="button"
            onClick={onBack}
            sx={{ color: 'primary.main', fontWeight: 600, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 0.5 }}
          >
            ← Back to sign in
          </Link>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          <ShieldOutlinedIcon sx={{ color: 'primary.main' }} />
          <Typography variant="subtitle1" fontWeight={700}>
            Two-factor authentication
          </Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary">
          Enter the 6-digit code from your authenticator app, or one of your backup codes.
        </Typography>
        {error && (
          <Alert severity="error" onClose={() => setError('')}>
            {error}
          </Alert>
        )}
        <TextField
          fullWidth
          label="Authenticator code or backup code"
          value={code}
          onChange={(e) => setCode(e.target.value.trim())}
          inputProps={{ 'aria-label': 'Two-factor authentication code' }}
        />
        <Button type="submit" variant="contained" fullWidth size="large" disabled={loading || !code} sx={{ py: 1.5, fontWeight: 700 }}>
          {loading ? <CircularProgress size={20} color="inherit" /> : 'Verify'}
        </Button>
      </Stack>
    </Box>
  )
}

function SignInTab({ onForgot }) {
  // ─── All hooks declared unconditionally (Rules of Hooks) ──────────────────
  // NEW-AUTH-004: OTP passwordless mode toggle
  const [otpMode, setOtpMode] = useState(false)
  const [rememberMeOtp] = useState(true)
  // PLAN016 Slice C — set when login() returns a TotpChallengeType instead of tokens
  const [totpChallengeToken, setTotpChallengeToken] = useState(null)

  const navigate = useNavigate()
  const { login, isAuthenticated } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  // SUG-AUTH-006: Remember Me — checked=localStorage, unchecked=sessionStorage
  const [rememberMe, setRememberMe] = useState(true)
  // NEW-AUTH-002: client-side failed attempt tracking
  const [failedAttempts, setFailedAttempts] = useState(0)
  const [lockoutSecs, setLockoutSecs] = useState(0)
  // NEW-AUTH-007: Caps Lock detection
  const [capsLock, setCapsLock] = useState(false)
  // NEW-AUTH-008: inline email format validation
  const [emailTouched, setEmailTouched] = useState(false)
  const emailInvalid = emailTouched && email.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

  // Lockout countdown
  useEffect(() => {
    if (lockoutSecs <= 0) return
    const t = setTimeout(() => setLockoutSecs((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [lockoutSecs])

  const isLockedOut = lockoutSecs > 0

  const [loginMutation] = useMutation(LOGIN_MUTATION)

  // NEW-AUTH-004: render OTP mode after all hooks
  if (otpMode) {
    return <OtpLoginMode onBack={() => setOtpMode(false)} rememberMe={rememberMeOtp} />
  }

  // PLAN016 Slice C: render the 2FA challenge step after all hooks too
  if (totpChallengeToken) {
    return <TotpChallengeStep challengeToken={totpChallengeToken} rememberMe={rememberMe} onBack={() => setTotpChallengeToken(null)} />
  }

  const handleSignIn = async (e) => {
    e.preventDefault()
    if (!email || !password) return
    if (isLockedOut) return // NEW-AUTH-002: block during lockout
    setError('')
    setLoading(true)

    try {
      // ── Real GraphQL login — the only path now. F-02 fix: this used to
      // fall back, on any failure (including a genuinely wrong password), to
      // a client-side check accepting the known demo password OR the literal
      // strings "password"/"demo" for any seeded account — a full
      // authentication bypass requiring no real credential at all. There is
      // no fallback anymore: every sign-in attempt is decided by the server.
      const { data } = await loginMutation({ variables: { input: { email, password } } })
      if (data.login.__typename === 'TotpChallenge') {
        // PLAN016 Slice C — password verified, but this account has 2FA
        // enabled; hand off to TotpChallengeStep instead of issuing tokens.
        setTotpChallengeToken(data.login.challenge_token)
        return
      }
      const { user, mfa_setup_required, session_timeout_minutes } = data.login
      setFailedAttempts(0)
      login(user, rememberMe, session_timeout_minutes)
      redirectAfterLogin(navigate, user, mfa_setup_required)
    } catch (err) {
      const next = failedAttempts + 1
      setFailedAttempts(next)
      if (next >= 5) {
        setLockoutSecs(60)
        setError('Too many failed attempts. Try again in 60 seconds.')
      } else {
        const message = err?.graphQLErrors?.[0]?.message || err?.message || 'Invalid email or password.'
        setError(`${message} (${next}/5 attempts)`)
      }
    } finally {
      setLoading(false)
    }
  }

  const fillDemo = (account) => {
    setEmail(account.email)
    setPassword(account.password || 'password')
    setError('')
  }

  return (
    <Box component="form" onSubmit={handleSignIn} noValidate>
      <Stack spacing={2}>
        {/* NEW-AUTH-002: lockout banner */}
        {isLockedOut && (
          <Alert severity="error" icon={false}>
            🔒 Account temporarily locked. Try again in <strong>{lockoutSecs}s</strong>.
          </Alert>
        )}
        {/* Failed attempts warning 3+ */}
        {!isLockedOut && failedAttempts >= 3 && failedAttempts < 5 && (
          <Alert severity="warning">{failedAttempts}/5 failed attempts. Account will lock after 5.</Alert>
        )}
        {!isLockedOut && error && (
          <Alert severity="error" onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {/* NEW-AUTH-008: inline email format validation */}
        <TextField
          fullWidth
          label="Email Address"
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value)
            setEmailTouched(true)
          }}
          onBlur={() => setEmailTouched(true)}
          required
          autoComplete="email"
          autoFocus
          error={emailInvalid}
          helperText={emailInvalid ? 'Please enter a valid email address' : ''}
          inputProps={{ 'aria-label': 'Email address' }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <EmailOutlinedIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
              </InputAdornment>
            ),
          }}
        />

        {/* NEW-AUTH-007: Caps Lock warning + password field */}
        <Box>
          <TextField
            fullWidth
            label="Password"
            type={showPw ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyUp={(e) => setCapsLock(e.getModifierState('CapsLock'))}
            required
            autoComplete="current-password"
            inputProps={{ 'aria-label': 'Password' }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <LockOutlinedIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  {/* SUG-AUTH-015: aria-label on icon button */}
                  <IconButton
                    onClick={() => setShowPw((v) => !v)}
                    edge="end"
                    size="small"
                    aria-label={showPw ? 'Hide password' : 'Show password'}
                    tabIndex={0}
                  >
                    {showPw ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          {capsLock && (
            <Stack direction="row" alignItems="center" spacing={0.5} mt={0.5}>
              <WarningAmberRoundedIcon sx={{ fontSize: '0.9rem', color: 'warning.main' }} />
              <Typography variant="caption" sx={{ color: 'warning.main', fontWeight: 600 }}>
                Caps Lock is on
              </Typography>
            </Stack>
          )}
        </Box>

        {/* SUG-AUTH-006: Remember Me + Forgot password row */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: -1 }}>
          <Tooltip title="Uncheck on shared/public devices" placement="bottom-start">
            <FormControlLabel
              control={
                <Checkbox
                  size="small"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  sx={{ color: 'primary.main', '&.Mui-checked': { color: 'primary.main' } }}
                />
              }
              label={
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Remember me
                </Typography>
              }
            />
          </Tooltip>
          <Link component="button" type="button" variant="body2" onClick={onForgot} sx={{ color: 'primary.main', fontWeight: 600 }}>
            Forgot password?
          </Link>
        </Box>

        <Button
          type="submit"
          variant="contained"
          fullWidth
          size="large"
          disabled={loading || !email || !password || isLockedOut}
          sx={{ py: 1.5, fontWeight: 700, fontSize: '1rem' }}
        >
          {isLockedOut ? `Locked — wait ${lockoutSecs}s` : loading ? <CircularProgress size={20} color="inherit" /> : 'Sign In'}
        </Button>

        {/* NEW-AUTH-004: OTP login link */}
        <Box sx={{ textAlign: 'center' }}>
          <Link
            component="button"
            type="button"
            onClick={() => setOtpMode(true)}
            variant="body2"
            sx={{ color: 'primary.main', fontWeight: 600, fontSize: '0.82rem' }}
          >
            Sign in with OTP instead →
          </Link>
        </Box>

        {/* SUG-AUTH-011: demo chips with tooltips.
            F-02 fix: these fill real credentials into the form and still go
            through the real LOGIN_MUTATION above (nothing here bypasses
            auth) — but they list working passwords for every seeded role in
            plain sight, which has no place in a production build. Dev-only,
            same as e2e/helpers.js's loginAs() already assumes about the dev
            server this runs against. */}
        {import.meta.env.DEV && (
          <Box>
            <Divider sx={{ my: 1 }}>
              <Typography variant="caption" color="text.secondary">
                demo accounts
              </Typography>
            </Divider>
            <Stack direction="row" spacing={1} flexWrap="wrap" justifyContent="center" gap={1}>
              {DEMO_ACCOUNTS.map((d) => (
                <Tooltip key={d.email} title={d.tooltip} placement="top" arrow>
                  <Button size="small" variant="outlined" onClick={() => fillDemo(d)} sx={{ fontSize: '0.72rem', px: 1.5 }}>
                    {d.label}
                  </Button>
                </Tooltip>
              ))}
            </Stack>
          </Box>
        )}
      </Stack>
    </Box>
  )
}

// ─── Register Tab ─────────────────────────────────────────────────────────────
function RegisterTab() {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    role: 'patient',
  })
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  // SUG-AUTH-010: T&C checkbox
  const [agreedTos, setAgreedTos] = useState(false)
  // NEW-AUTH-005: mobile signup mode
  const [mobileMode, setMobileMode] = useState(false)

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  // SUG-AUTH-004: block submit if password is Weak
  const { score } = getPasswordStrength(form.password)
  const isWeak = form.password.length > 0 && score <= 1
  const canSubmit = form.firstName && form.email && form.password && !isWeak && agreedTos

  const handleRegister = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    // Simulate registration — replace with real GraphQL mutation when backend ready
    await new Promise((r) => setTimeout(r, 1500))
    setLoading(false)
    setSuccess(true)
  }

  // NEW-AUTH-005: early-return for mobile mode — outside the form element to
  // prevent mobile signup's nested form from triggering the register form submit
  if (mobileMode) {
    return (
      <Box sx={{ p: 0 }}>
        <MobileSignupMode onBack={() => setMobileMode(false)} />
      </Box>
    )
  }

  if (success) {
    return (
      <Box sx={{ textAlign: 'center', py: 3 }}>
        <CheckCircleIcon sx={{ fontSize: 52, color: 'success.main', mb: 1 }} />
        <Typography variant="h5" fontWeight={700} sx={{ mb: 1 }}>
          Account Created!
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Check your email for a confirmation link before signing in.
        </Typography>
      </Box>
    )
  }

  return (
    <Box component="form" onSubmit={handleRegister} noValidate>
      <Stack spacing={2}>
        {error && <Alert severity="error">{error}</Alert>}

        <Grid container spacing={1.5}>
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="First Name"
              value={form.firstName}
              onChange={set('firstName')}
              required
              inputProps={{ 'aria-label': 'First name' }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PersonOutlineIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="Last Name"
              value={form.lastName}
              onChange={set('lastName')}
              required
              inputProps={{ 'aria-label': 'Last name' }}
            />
          </Grid>
        </Grid>

        <TextField
          fullWidth
          label="Email Address"
          type="email"
          value={form.email}
          onChange={set('email')}
          required
          inputProps={{ 'aria-label': 'Email address' }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <EmailOutlinedIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
              </InputAdornment>
            ),
          }}
        />

        {/* SUG-AUTH-010: Phone number field */}
        <TextField
          fullWidth
          label="Phone Number (optional)"
          type="tel"
          value={form.phone}
          onChange={set('phone')}
          inputProps={{ 'aria-label': 'Phone number', pattern: '[0-9+\\-\\s]*' }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <PhoneAndroidIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
              </InputAdornment>
            ),
          }}
          helperText="For appointment reminders and 2FA (optional)"
        />

        {/* SUG-AUTH-004: password field with show/hide + strength meter */}
        <Box>
          <TextField
            fullWidth
            label="Password"
            type={showPw ? 'text' : 'password'}
            value={form.password}
            onChange={set('password')}
            required
            inputProps={{ 'aria-label': 'Password' }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <LockOutlinedIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowPw((v) => !v)}
                    edge="end"
                    size="small"
                    aria-label={showPw ? 'Hide password' : 'Show password'}
                  >
                    {showPw ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
            error={isWeak}
            helperText={isWeak ? 'Password is too weak — see requirements below' : ''}
          />
          <PasswordStrengthMeter password={form.password} />
        </Box>

        <FormControl fullWidth>
          <InputLabel>I am a…</InputLabel>
          <Select value={form.role} onChange={set('role')} label="I am a…">
            <MenuItem value="patient">Patient</MenuItem>
            <MenuItem value="clinician">Clinician</MenuItem>
            <MenuItem value="receptionist">Receptionist / Staff</MenuItem>
          </Select>
        </FormControl>

        {/* SUG-AUTH-010: Terms & Conditions checkbox */}
        <FormControlLabel
          control={
            <Checkbox
              size="small"
              checked={agreedTos}
              onChange={(e) => setAgreedTos(e.target.checked)}
              sx={{ color: 'primary.main', '&.Mui-checked': { color: 'primary.main' } }}
              inputProps={{ 'aria-label': 'Agree to Terms and Conditions' }}
            />
          }
          label={
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              I agree to the{' '}
              <Link href="#" target="_blank" rel="noopener" sx={{ color: 'primary.main', fontWeight: 600 }}>
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link href="#" target="_blank" rel="noopener" sx={{ color: 'primary.main', fontWeight: 600 }}>
                Privacy Policy
              </Link>
            </Typography>
          }
        />

        <Button type="submit" variant="contained" fullWidth size="large" disabled={loading || !canSubmit} sx={{ py: 1.5, fontWeight: 700 }}>
          {loading ? <CircularProgress size={20} color="inherit" /> : 'Create Account'}
        </Button>

        {/* NEW-AUTH-005: Mobile signup link — button only (actual mobile mode rendered above the form) */}
        <Divider sx={{ my: 0.5 }}>
          <Typography variant="caption" color="text.secondary">
            or
          </Typography>
        </Divider>
        <Button
          type="button"
          variant="outlined"
          fullWidth
          startIcon={<PhoneAndroidIcon sx={{ fontSize: '1rem' }} />}
          onClick={() => setMobileMode(true)}
          sx={{
            fontWeight: 600,
            color: 'primary.main',
            borderColor: 'primary.main',
            '&:hover': { bgcolor: (t) => alpha(t.palette.primary.main, 0.06), borderColor: 'primary.dark' },
          }}
        >
          Sign up with mobile number
        </Button>
      </Stack>
    </Box>
  )
}

// ─── Forgot Password Tab (SUG-AUTH-009 + TC-AUTH-013 fix) ────────────────────
function ForgotPasswordTab() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  // SUG-AUTH-009: 60-second cooldown after submission
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  const handleSend = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    await new Promise((r) => setTimeout(r, 1200))
    setLoading(false)

    // TC-AUTH-013: Detect unknown emails in mock mode
    const knownEmails = [
      'admin@medibook.dev',
      'manager@medibook.dev',
      'clinician@medibook.dev',
      'receptionist@medibook.dev',
      'patient@medibook.dev',
      'dr.okafor@medibook.dev',
      'manager2@medibook.dev',
    ]
    if (!knownEmails.includes(email.toLowerCase())) {
      setError(`No account found for "${email}". Check the address or register.`)
      return
    }

    setSent(true)
    setCooldown(60) // 60-second resend cooldown
  }

  if (sent) {
    // NEW-AUTH-003: detect email provider for quick-link
    const domain = email.split('@')[1]?.toLowerCase() ?? ''
    const providerLink =
      domain === 'gmail.com'
        ? { url: 'https://mail.google.com', label: 'Open Gmail' }
        : domain === 'outlook.com'
          ? { url: 'https://outlook.live.com', label: 'Open Outlook' }
          : domain === 'hotmail.com'
            ? { url: 'https://outlook.live.com', label: 'Open Outlook' }
            : domain === 'yahoo.com'
              ? { url: 'https://mail.yahoo.com', label: 'Open Yahoo Mail' }
              : domain === 'icloud.com'
                ? { url: 'https://www.icloud.com/mail', label: 'Open iCloud Mail' }
                : null

    return (
      <Box sx={{ textAlign: 'center', py: 2 }}>
        <CheckCircleIcon sx={{ fontSize: 48, color: 'success.main', mb: 1 }} />
        <Typography variant="h5" fontWeight={700}>
          Check your inbox
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          A reset link has been sent to <strong>{email}</strong>
        </Typography>
        {/* NEW-AUTH-003: email provider quick-link */}
        {providerLink && (
          <Button
            component="a"
            href={providerLink.url}
            target="_blank"
            rel="noopener"
            size="small"
            variant="outlined"
            endIcon={<OpenInNewIcon sx={{ fontSize: '0.85rem' }} />}
            sx={{
              mt: 1.5,
              textTransform: 'none',
              borderColor: 'primary.main',
              color: 'primary.main',
              '&:hover': { bgcolor: (t) => alpha(t.palette.primary.main, 0.06) },
            }}
          >
            {providerLink.label}
          </Button>
        )}
        {/* SUG-AUTH-009: Resend with countdown */}
        {cooldown > 0 ? (
          <Typography variant="caption" color="text.disabled" sx={{ mt: 2, display: 'block' }}>
            Didn't receive it? Resend in {cooldown}s
          </Typography>
        ) : (
          <Button
            size="small"
            sx={{ mt: 2 }}
            onClick={() => {
              setSent(false)
              setCooldown(0)
            }}
          >
            Resend Email
          </Button>
        )}
      </Box>
    )
  }

  return (
    <Box component="form" onSubmit={handleSend} noValidate>
      <Stack spacing={2}>
        <Typography variant="body2" color="text.secondary">
          Enter your registered email and we'll send a secure reset link.
        </Typography>
        {error && (
          <Alert severity="error" onClose={() => setError('')}>
            {error}
          </Alert>
        )}
        <TextField
          fullWidth
          label="Email Address"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          inputProps={{ 'aria-label': 'Email address for password reset' }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <EmailOutlinedIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
              </InputAdornment>
            ),
          }}
        />
        <Button
          type="submit"
          variant="contained"
          fullWidth
          size="large"
          disabled={loading || !email}
          startIcon={loading ? null : <SendIcon />}
          sx={{ py: 1.5, fontWeight: 700 }}
        >
          {loading ? <CircularProgress size={20} color="inherit" /> : 'Send Reset Link'}
        </Button>
      </Stack>
    </Box>
  )
}

// ─── Main Login Component ─────────────────────────────────────────────────────
export default function Login() {
  const { isAuthenticated, user } = useAuth()
  const [activeTab, setActiveTab] = useState(0)
  // NEW-AUTH-006: session-expired banner via query param
  const [searchParams] = useSearchParams()
  const sessionExpired = searchParams.get('reason') === 'session_expired'

  // Already logged in — redirect to the role-appropriate dashboard, not
  // always the admin-only /dashboard (BUG found via live Chrome MCP
  // verification: a patient/clinician/staff account revisiting /login was
  // silently dropped onto the manager-oriented /dashboard, which ProtectedRoute
  // alone doesn't block since it has no role restriction — see App.jsx fix
  // in the same commit).
  if (isAuthenticated) return <Navigate to={getPostLoginRedirect(user)} replace />

  return (
    <Grid container sx={{ minHeight: '100vh' }}>
      {/* ── Left brand panel ─────────────────────────────────────────────────── */}
      <Grid item md={5} sx={{ display: { xs: 'none', md: 'block' } }}>
        <BrandPanel />
      </Grid>

      {/* ── Right auth panel ─────────────────────────────────────────────────── */}
      <Grid
        item
        xs={12}
        md={7}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: { xs: 2, sm: 4, md: 6 },
          bgcolor: 'background.default',
        }}
      >
        <Paper
          elevation={0}
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 3,
            p: { xs: 3, sm: 4 },
            width: '100%',
            maxWidth: 420,
          }}
        >
          <Stack spacing={3}>
            {/* NEW-AUTH-006: session expired banner */}
            {sessionExpired && (
              <Alert
                severity="warning"
                icon={<WarningAmberRoundedIcon fontSize="inherit" />}
                onClose={() => searchParams.delete('reason')}
                sx={{ borderRadius: 2 }}
              >
                Your session expired due to inactivity. Please sign in again.
              </Alert>
            )}
            {/* HealthSync logo */}
            <Stack direction="row" alignItems="center" spacing={1}>
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  bgcolor: 'primary.main',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <LocalHospitalIcon sx={{ color: 'primary.contrastText', fontSize: 18 }} />
              </Box>
              <Typography variant="h5" fontWeight={800} sx={{ color: 'primary.main' }}>
                HealthSync
              </Typography>
            </Stack>

            {/* Tabs: Sign In | Register | Forgot Password */}
            <Tabs
              value={activeTab}
              onChange={(_, v) => setActiveTab(v)}
              sx={{ borderBottom: '1px solid', borderColor: 'divider', mb: -1 }}
              aria-label="Authentication options"
            >
              <Tab label="Sign In" id="auth-tab-0" aria-controls="auth-panel-0" />
              <Tab label="Register" id="auth-tab-1" aria-controls="auth-panel-1" />
              <Tab label="Forgot Password" id="auth-tab-2" aria-controls="auth-panel-2" />
            </Tabs>

            {/* Tab Panels */}
            <Box role="tabpanel" id="auth-panel-0" aria-labelledby="auth-tab-0" hidden={activeTab !== 0}>
              {activeTab === 0 && <SignInTab onForgot={() => setActiveTab(2)} />}
            </Box>
            <Box role="tabpanel" id="auth-panel-1" aria-labelledby="auth-tab-1" hidden={activeTab !== 1}>
              {activeTab === 1 && <RegisterTab />}
            </Box>
            <Box role="tabpanel" id="auth-panel-2" aria-labelledby="auth-tab-2" hidden={activeTab !== 2}>
              {activeTab === 2 && <ForgotPasswordTab />}
            </Box>
          </Stack>
        </Paper>
      </Grid>
    </Grid>
  )
}
