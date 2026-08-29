import { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Button,
  Typography,
  TextField,
  Grid,
  Card,
  CardContent,
  Stack,
  Divider,
  Chip,
  Avatar,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  FormHelperText,
  LinearProgress,
  Tooltip,
  IconButton,
  Paper,
  InputAdornment,
  alpha,
  Autocomplete,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded'
import PersonRoundedIcon from '@mui/icons-material/PersonRounded'
import EmailRoundedIcon from '@mui/icons-material/EmailRounded'
import PhoneRoundedIcon from '@mui/icons-material/PhoneRounded'
import WorkRoundedIcon from '@mui/icons-material/WorkRounded'
import AdminPanelSettingsRoundedIcon from '@mui/icons-material/AdminPanelSettingsRounded'
import BadgeRoundedIcon from '@mui/icons-material/BadgeRounded'
import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded'
import LocationOnRoundedIcon from '@mui/icons-material/LocationOnRounded'
import LockRoundedIcon from '@mui/icons-material/LockRounded'
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded'
import VisibilityOffRoundedIcon from '@mui/icons-material/VisibilityOffRounded'
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded'
import SaveRoundedIcon from '@mui/icons-material/SaveRounded'
import { useSnackbar } from 'notistack'
import { useMutation, useQuery, gql } from '@apollo/client'

// context/open-questions.md #3, resolved: status/since are now real fields
// on CreateStaffInput (backend/src/staff/dto/staff.input.ts).
const CREATE_STAFF = gql`
  mutation CreateStaff($input: CreateStaffInput!) {
    createStaff(input: $input) {
      id
    }
  }
`
// REQ102 — real org departments, distinct from the DEPARTMENTS constant
// below (an administrative label, not a clinical department).
const GET_REAL_DEPARTMENTS = gql`
  query GetRealDepartments {
    departments {
      id
      name
    }
  }
`

const ROLES = [
  'Receptionist',
  'Admin',
  'Nurse',
  'Lab Technician',
  'IT Administrator',
  'Billing Specialist',
  'Security Officer',
  'Pharmacist',
  'Coordinator',
]
const DEPARTMENTS = [
  'Front Desk',
  'Management',
  'General Practice',
  'Laboratory',
  'Finance',
  'IT & Systems',
  'Security',
  'Pharmacy',
  'Radiology',
]
// Theme-derived, not a hand-picked hex map -- see staff/edit.jsx for the
// same conversion.
function statusStyleFor(theme) {
  const p = theme.palette
  const dark = theme.palette.mode === 'dark'
  const tone = (main, darkText) => ({ color: dark ? main : darkText, bg: alpha(main, dark ? 0.18 : 0.12) })
  return [
    { value: 'active', label: 'Active', ...tone(p.success.main, p.success.dark) },
    { value: 'on_leave', label: 'On Leave', ...tone(p.warning.main, p.warning.dark) },
    { value: 'inactive', label: 'Inactive', color: p.text.secondary, bg: p.action.hover },
  ]
}

const EMPTY = {
  name: '',
  email: '',
  phone: '',
  role: '',
  department: '',
  status: 'active',
  since: new Date().toISOString().split('T')[0],
  address: '',
  notes: '',
  password: '',
  confirmPassword: '',
  clinicalDepartment: null,
}

function getInitials(name) {
  return (
    name
      .trim()
      .split(' ')
      .map((p) => p[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || '?'
  )
}

// Deterministic per-user colour, still varying across users -- pulled from
// the real theme (not a fixed hex ramp) so it stays legible in dark mode.
function avatarColor(theme, name) {
  const p = theme.palette
  const colors = [p.primary.main, p.secondary.main, p.success.main, p.warning.dark, p.error.main, p.info.main]
  let h = 0
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % colors.length
  return colors[h]
}

// ─── Field Row ────────────────────────────────────────────────────────────────
function FieldSection({ icon: Icon, title, children }) {
  const theme = useTheme()
  const TEAL = theme.palette.primary.main
  return (
    <Box sx={{ mb: 3.5 }}>
      <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mb: 2 }}>
        <Box
          sx={{
            width: 32,
            height: 32,
            borderRadius: 1.5,
            bgcolor: alpha(TEAL, 0.08),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon sx={{ fontSize: '1rem', color: TEAL }} />
        </Box>
        <Typography variant="subtitle2" fontWeight={700} sx={{ color: 'text.primary' }}>
          {title}
        </Typography>
      </Stack>
      {children}
    </Box>
  )
}

// ─── Add Staff Page ────────────────────────────────────────────────────────────
export default function AddStaffPage() {
  const theme = useTheme()
  // TEAL/TEAL_LIGHT kept as the same names every existing call site in this
  // file already uses -- now resolved from the real theme instead of a
  // hardcoded hex pair, matching staff/edit.jsx's identical conversion.
  const TEAL = theme.palette.primary.main
  const TEAL_LIGHT = theme.palette.primary.light
  const STATUSES = statusStyleFor(theme)
  const navigate = useNavigate()
  const { enqueueSnackbar } = useSnackbar()
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [showPwd, setShowPwd] = useState(false)
  const [showPwd2, setShowPwd2] = useState(false)
  const [createStaffMutation, { loading: saving }] = useMutation(CREATE_STAFF)
  const { data: realDeptData } = useQuery(GET_REAL_DEPARTMENTS)
  const realDepartments = realDeptData?.departments ?? []

  const set = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }))
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }))
  }

  const validate = () => {
    const e = {}
    if (!form.name.trim()) e.name = 'Full name is required'
    if (!form.email.trim()) e.email = 'Email is required'
    else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) e.email = 'Invalid email address'
    if (!form.phone.trim()) e.phone = 'Phone number is required'
    if (!form.role) e.role = 'Select a role'
    if (!form.department) e.department = 'Select a department'
    if (!form.password.trim()) e.password = 'Password is required'
    else if (form.password.length < 8) e.password = 'Minimum 8 characters'
    if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match'
    return e
  }

  const handleSave = async () => {
    const e = validate()
    if (Object.keys(e).length) {
      setErrors(e)
      return
    }
    try {
      await createStaffMutation({
        variables: {
          input: {
            name: form.name,
            email: form.email,
            phone: form.phone,
            role: form.role,
            department: form.department,
            status: form.status,
            since: form.since,
            address: form.address,
            notes: form.notes,
            password: form.password,
            departmentId: form.clinicalDepartment?.id || undefined,
          },
        },
      })
      enqueueSnackbar(`${form.name} added to staff successfully!`, { variant: 'success' })
      navigate('/staff')
    } catch (err) {
      enqueueSnackbar(err.message || 'Failed to add staff member', { variant: 'error' })
    }
  }

  const initials = form.name ? getInitials(form.name) : '?'
  const avatarBg = form.name ? avatarColor(theme, form.name) : theme.palette.text.disabled

  // Password strength — BUG-STAFF-004 fix: evaluate complexity FIRST, then length fallbacks
  const pwdStrength = !form.password
    ? 0
    : /[A-Z]/.test(form.password) && /[0-9]/.test(form.password) && /[^A-Za-z0-9]/.test(form.password) && form.password.length >= 8
      ? 4
      : form.password.length >= 10 || (/[A-Z]/.test(form.password) && /[0-9]/.test(form.password))
        ? 3
        : form.password.length >= 6
          ? 2
          : 1

  const pwdColors = ['', theme.palette.error.main, theme.palette.warning.main, theme.palette.success.main, theme.palette.primary.main]
  const pwdLabels = ['', 'Weak', 'Fair', 'Good', 'Strong']

  return (
    <Box className="page-enter" sx={{ pb: 5, maxWidth: 900, mx: 'auto' }}>
      <Helmet>
        <title>Add Staff — HealthSync</title>
      </Helmet>

      {/* ── Page header ─────────────────────────────────────────────────── */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <IconButton
          onClick={() => navigate('/staff')}
          sx={{
            bgcolor: 'action.hover',
            border: '1px solid', borderColor: 'divider',
            borderRadius: 2,
            '&:hover': { bgcolor: alpha(TEAL, 0.06), borderColor: TEAL, color: TEAL },
          }}
        >
          <ArrowBackRoundedIcon fontSize="small" />
        </IconButton>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h5" fontWeight={800} sx={{ color: 'text.primary', lineHeight: 1.2 }}>
            Add New Staff Member
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.3 }}>
            Fill in the details to onboard a new staff member
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<SaveRoundedIcon />}
          onClick={handleSave}
          disabled={saving}
          sx={{
            borderRadius: 2.5,
            textTransform: 'none',
            fontWeight: 700,
            px: 3,
            background: `linear-gradient(135deg, ${TEAL_LIGHT} 0%, ${TEAL} 100%)`,
            boxShadow: `0 4px 14px ${TEAL}40`,
            '&:hover': { boxShadow: `0 6px 20px ${TEAL}55`, transform: 'translateY(-1px)' },
            '&:disabled': { opacity: 0.7 },
            transition: 'all 0.2s ease',
          }}
        >
          {saving ? 'Saving…' : 'Add Staff Member'}
        </Button>
      </Box>

      {saving && (
        <LinearProgress sx={{ borderRadius: 2, height: 3, mb: 3, bgcolor: `${TEAL}20`, '& .MuiLinearProgress-bar': { bgcolor: TEAL } }} />
      )}

      <Grid container spacing={3}>
        {/* ── Left: Preview card + status ──────────────────────────────── */}
        <Grid item xs={12} md={3.5}>
          {/* Preview card */}
          <Card sx={{ borderRadius: 3, border: '1px solid #E2E8F0', boxShadow: 'none', mb: 2.5, position: 'sticky', top: 20 }}>
            <Box
              sx={{ height: 70, background: `linear-gradient(135deg, ${TEAL} 0%, ${TEAL_LIGHT} 100%)`, borderRadius: '12px 12px 0 0' }}
            />
            <CardContent sx={{ textAlign: 'center', pt: 0, mt: -4.5 }}>
              <Avatar
                sx={{
                  width: 72,
                  height: 72,
                  mx: 'auto',
                  mb: 1.5,
                  bgcolor: avatarBg,
                  fontSize: '1.5rem',
                  fontWeight: 800,
                  border: '3px solid #fff',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                }}
              >
                {initials}
              </Avatar>
              <Typography variant="h6" fontWeight={800} sx={{ color: 'text.primary', lineHeight: 1.2 }}>
                {form.name || 'New Staff Member'}
              </Typography>
              {form.role && (
                <Chip
                  label={form.role}
                  size="small"
                  sx={{ mt: 1, bgcolor: alpha(TEAL, 0.08), color: TEAL, fontWeight: 700, fontSize: '0.72rem', borderRadius: 1.5 }}
                />
              )}
              {form.department && (
                <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', mt: 0.75 }}>
                  {form.department}
                </Typography>
              )}
              {form.email && (
                <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', mt: 0.25 }}>
                  {form.email}
                </Typography>
              )}
            </CardContent>

            <Divider />

            <CardContent sx={{ px: 2 }}>
              <Typography
                variant="caption"
                sx={{ color: 'text.disabled', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.62rem' }}
              >
                Status
              </Typography>
              <Stack direction="column" spacing={1} sx={{ mt: 1.25 }}>
                {STATUSES.map((s) => (
                  <Box
                    key={s.value}
                    onClick={() => set('status')({ target: { value: s.value } })}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.25,
                      p: 1,
                      borderRadius: 2,
                      border: `1.5px solid ${form.status === s.value ? TEAL : theme.palette.divider}`,
                      bgcolor: form.status === s.value ? alpha(TEAL, 0.06) : 'transparent',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      '&:hover': { borderColor: TEAL, bgcolor: alpha(TEAL, 0.04) },
                    }}
                  >
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: s.color, flexShrink: 0 }} />
                    <Typography
                      variant="caption"
                      fontWeight={form.status === s.value ? 700 : 500}
                      sx={{ color: form.status === s.value ? TEAL : 'text.secondary' }}
                    >
                      {s.label}
                    </Typography>
                    {form.status === s.value && <CheckCircleRoundedIcon sx={{ fontSize: '0.9rem', color: TEAL, ml: 'auto' }} />}
                  </Box>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* ── Right: Form ──────────────────────────────────────────────── */}
        <Grid item xs={12} md={8.5}>
          <Card sx={{ borderRadius: 3, border: '1px solid #E2E8F0', boxShadow: 'none' }}>
            <CardContent sx={{ p: 3 }}>
              {/* Personal info */}
              <FieldSection icon={PersonRoundedIcon} title="Personal Information">
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Full Name *"
                      fullWidth
                      size="small"
                      value={form.name}
                      onChange={set('name')}
                      error={!!errors.name}
                      helperText={errors.name}
                      placeholder="e.g. Sara Johnson"
                      sx={{
                        '& .MuiOutlinedInput-root': { borderRadius: 2, '&.Mui-focused fieldset': { borderColor: TEAL } },
                        '& label.Mui-focused': { color: TEAL },
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Start Date *"
                      fullWidth
                      size="small"
                      type="date"
                      value={form.since}
                      onChange={set('since')}
                      InputLabelProps={{ shrink: true }}
                      sx={{
                        '& .MuiOutlinedInput-root': { borderRadius: 2, '&.Mui-focused fieldset': { borderColor: TEAL } },
                        '& label.Mui-focused': { color: TEAL },
                      }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      label="Address"
                      fullWidth
                      size="small"
                      value={form.address}
                      onChange={set('address')}
                      placeholder="123 Main St, City, State"
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <LocationOnRoundedIcon sx={{ fontSize: '1rem', color: 'text.disabled' }} />
                          </InputAdornment>
                        ),
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': { borderRadius: 2, '&.Mui-focused fieldset': { borderColor: TEAL } },
                        '& label.Mui-focused': { color: TEAL },
                      }}
                    />
                  </Grid>
                </Grid>
              </FieldSection>

              <Divider sx={{ my: 2.5 }} />

              {/* Contact */}
              <FieldSection icon={EmailRoundedIcon} title="Contact Details">
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Email Address *"
                      fullWidth
                      size="small"
                      type="email"
                      value={form.email}
                      onChange={set('email')}
                      error={!!errors.email}
                      helperText={errors.email}
                      placeholder="sara@healthsync.com"
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <EmailRoundedIcon sx={{ fontSize: '1rem', color: 'text.disabled' }} />
                          </InputAdornment>
                        ),
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': { borderRadius: 2, '&.Mui-focused fieldset': { borderColor: TEAL } },
                        '& label.Mui-focused': { color: TEAL },
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Phone Number *"
                      fullWidth
                      size="small"
                      value={form.phone}
                      onChange={set('phone')}
                      error={!!errors.phone}
                      helperText={errors.phone}
                      placeholder="+1 555-0101"
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <PhoneRoundedIcon sx={{ fontSize: '1rem', color: 'text.disabled' }} />
                          </InputAdornment>
                        ),
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': { borderRadius: 2, '&.Mui-focused fieldset': { borderColor: TEAL } },
                        '& label.Mui-focused': { color: TEAL },
                      }}
                    />
                  </Grid>
                </Grid>
              </FieldSection>

              <Divider sx={{ my: 2.5 }} />

              {/* Role & Department */}
              <FieldSection icon={WorkRoundedIcon} title="Role & Department">
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth size="small" error={!!errors.role}>
                      <InputLabel sx={{ '&.Mui-focused': { color: TEAL } }}>Role *</InputLabel>
                      <Select
                        value={form.role}
                        onChange={set('role')}
                        label="Role *"
                        sx={{ borderRadius: 2, '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: TEAL } }}
                      >
                        {ROLES.map((r) => (
                          <MenuItem key={r} value={r}>
                            {r}
                          </MenuItem>
                        ))}
                      </Select>
                      {errors.role && <FormHelperText>{errors.role}</FormHelperText>}
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth size="small" error={!!errors.department}>
                      <InputLabel sx={{ '&.Mui-focused': { color: TEAL } }}>Department *</InputLabel>
                      <Select
                        value={form.department}
                        onChange={set('department')}
                        label="Department *"
                        sx={{ borderRadius: 2, '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: TEAL } }}
                      >
                        {DEPARTMENTS.map((d) => (
                          <MenuItem key={d} value={d}>
                            {d}
                          </MenuItem>
                        ))}
                      </Select>
                      {errors.department && <FormHelperText>{errors.department}</FormHelperText>}
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Autocomplete
                      options={realDepartments}
                      getOptionLabel={(o) => o.name}
                      value={form.clinicalDepartment}
                      onChange={(e, val) => setForm((prev) => ({ ...prev, clinicalDepartment: val }))}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          size="small"
                          label="Clinical Department"
                          helperText="Used to auto-include this staff member in that department's message threads"
                          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                        />
                      )}
                    />
                  </Grid>
                </Grid>
              </FieldSection>

              <Divider sx={{ my: 2.5 }} />

              {/* Credentials */}
              <FieldSection icon={LockRoundedIcon} title="Login Credentials">
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Password *"
                      fullWidth
                      size="small"
                      type={showPwd ? 'text' : 'password'}
                      value={form.password}
                      onChange={set('password')}
                      error={!!errors.password}
                      helperText={errors.password}
                      placeholder="Min 8 characters"
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton size="small" onClick={() => setShowPwd((v) => !v)} edge="end">
                              {showPwd ? <VisibilityOffRoundedIcon fontSize="small" /> : <VisibilityRoundedIcon fontSize="small" />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': { borderRadius: 2, '&.Mui-focused fieldset': { borderColor: TEAL } },
                        '& label.Mui-focused': { color: TEAL },
                      }}
                    />
                    {form.password && (
                      <Box sx={{ mt: 1 }}>
                        <LinearProgress
                          variant="determinate"
                          value={pwdStrength * 25}
                          sx={{
                            height: 4,
                            borderRadius: 2,
                            bgcolor: 'divider',
                            '& .MuiLinearProgress-bar': { bgcolor: pwdColors[pwdStrength], borderRadius: 2 },
                          }}
                        />
                        <Typography
                          variant="caption"
                          sx={{ color: pwdColors[pwdStrength], fontWeight: 700, fontSize: '0.7rem', mt: 0.5, display: 'block' }}
                        >
                          {pwdLabels[pwdStrength]}
                        </Typography>
                      </Box>
                    )}
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Confirm Password *"
                      fullWidth
                      size="small"
                      type={showPwd2 ? 'text' : 'password'}
                      value={form.confirmPassword}
                      onChange={set('confirmPassword')}
                      error={!!errors.confirmPassword}
                      helperText={errors.confirmPassword}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton size="small" onClick={() => setShowPwd2((v) => !v)} edge="end">
                              {showPwd2 ? <VisibilityOffRoundedIcon fontSize="small" /> : <VisibilityRoundedIcon fontSize="small" />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': { borderRadius: 2, '&.Mui-focused fieldset': { borderColor: TEAL } },
                        '& label.Mui-focused': { color: TEAL },
                      }}
                    />
                  </Grid>
                </Grid>
              </FieldSection>

              <Divider sx={{ my: 2.5 }} />

              {/* Notes */}
              <FieldSection icon={BadgeRoundedIcon} title="Additional Notes">
                <TextField
                  label="Notes (optional)"
                  fullWidth
                  size="small"
                  multiline
                  rows={3}
                  value={form.notes}
                  onChange={set('notes')}
                  placeholder="Any additional info about this staff member…"
                  sx={{
                    '& .MuiOutlinedInput-root': { borderRadius: 2, '&.Mui-focused fieldset': { borderColor: TEAL } },
                    '& label.Mui-focused': { color: TEAL },
                  }}
                />
              </FieldSection>
            </CardContent>
          </Card>

          {/* Bottom actions */}
          <Stack direction="row" spacing={2} justifyContent="flex-end" sx={{ mt: 2.5 }}>
            <Button
              variant="outlined"
              onClick={() => navigate('/staff')}
              sx={{
                borderRadius: 2.5,
                textTransform: 'none',
                fontWeight: 700,
                borderColor: 'divider',
                color: 'text.secondary',
                '&:hover': { borderColor: 'text.disabled', bgcolor: 'action.hover' },
              }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              startIcon={<SaveRoundedIcon />}
              onClick={handleSave}
              disabled={saving}
              sx={{
                borderRadius: 2.5,
                textTransform: 'none',
                fontWeight: 700,
                px: 3,
                background: `linear-gradient(135deg, ${TEAL_LIGHT} 0%, ${TEAL} 100%)`,
                boxShadow: `0 4px 14px ${TEAL}40`,
                '&:hover': { boxShadow: `0 6px 20px ${TEAL}55`, transform: 'translateY(-1px)' },
                '&:disabled': { opacity: 0.7 },
                transition: 'all 0.2s ease',
              }}
            >
              {saving ? 'Saving…' : 'Add Staff Member'}
            </Button>
          </Stack>
        </Grid>
      </Grid>
    </Box>
  )
}
