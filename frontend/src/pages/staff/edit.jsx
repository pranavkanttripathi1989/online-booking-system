import { useState, useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import { useNavigate, useParams } from 'react-router-dom'
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
  IconButton,
  Tooltip,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  alpha,
  Autocomplete,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded'
import PersonRoundedIcon from '@mui/icons-material/PersonRounded'
import EmailRoundedIcon from '@mui/icons-material/EmailRounded'
import PhoneRoundedIcon from '@mui/icons-material/PhoneRounded'
import WorkRoundedIcon from '@mui/icons-material/WorkRounded'
import LocationOnRoundedIcon from '@mui/icons-material/LocationOnRounded'
import SaveRoundedIcon from '@mui/icons-material/SaveRounded'
import LockRoundedIcon from '@mui/icons-material/LockRounded'
import BadgeRoundedIcon from '@mui/icons-material/BadgeRounded'
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded'
import PersonOffRoundedIcon from '@mui/icons-material/PersonOffRounded'
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded'
import InfoRoundedIcon from '@mui/icons-material/InfoRounded'
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded'
import VisibilityOffRoundedIcon from '@mui/icons-material/VisibilityOffRounded'
import { useSnackbar } from 'notistack'
import { useQuery, useMutation, gql } from '@apollo/client'

const GET_STAFF_MEMBER = gql`
  query GetStaffMember($id: ID!) {
    staffMember(id: $id) {
      id
      name
      email
      phone
      role
      department
      status
      since
      address
      notes
      departmentId
    }
  }
`
// context/open-questions.md #3, resolved: UpdateStaffInput now has a real
// password field (admin sets a specific password directly).
const UPDATE_STAFF = gql`
  mutation UpdateStaff($id: ID!, $input: UpdateStaffInput!) {
    updateStaff(id: $id, input: $input) {
      id
      name
      email
      phone
      role
      department
      status
      since
      address
      notes
      departmentId
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
const DEACTIVATE_STAFF = gql`
  mutation DeactivateStaff($id: ID!) {
    deactivateStaff(id: $id) {
      id
      status
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
// Theme-derived, not a hand-picked hex map -- see calendar/index.jsx,
// finances/index.jsx, messages/index.jsx, admin/users/index.jsx for the
// same conversion.
function statusStyleFor(theme) {
  const p = theme.palette
  const dark = theme.palette.mode === 'dark'
  const tone = (main, darkText) => ({ color: dark ? main : darkText, bg: alpha(main, dark ? 0.18 : 0.12), dot: main })
  return [
    { value: 'active', label: 'Active', ...tone(p.success.main, p.success.dark) },
    { value: 'on_leave', label: 'On Leave', ...tone(p.warning.main, p.warning.dark) },
    { value: 'inactive', label: 'Inactive', color: p.text.secondary, bg: p.action.hover, dot: p.text.disabled },
  ]
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

// ─── Edit Staff Page ───────────────────────────────────────────────────────────
export default function EditStaffPage() {
  const theme = useTheme()
  // TEAL/TEAL_LIGHT kept as the same names every existing call site in this
  // file already uses -- now resolved from the real theme instead of a
  // hardcoded hex pair, so sx props, template literals, and gradients all
  // pick up dark mode with no other change needed.
  const TEAL = theme.palette.primary.main
  const TEAL_LIGHT = theme.palette.primary.light
  const { id } = useParams()
  const navigate = useNavigate()
  const { enqueueSnackbar } = useSnackbar()

  const [form, setForm] = useState(null)
  const [original, setOriginal] = useState(null)
  const [errors, setErrors] = useState({})
  const [deactivateOpen, setDeactivateOpen] = useState(false)
  // context/open-questions.md #3, resolved: admin-set password reset —
  // local-only, never part of `form`/`hasChanges` (a typed-then-cleared
  // password shouldn't count as "unsaved changes" on its own next to real
  // profile fields, and must never be sent unless non-empty).
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)

  const { data, error: loadError } = useQuery(GET_STAFF_MEMBER, { variables: { id } })
  const [saveStaffMutation, { loading: saving }] = useMutation(UPDATE_STAFF)
  const [deactivateStaffMutation] = useMutation(DEACTIVATE_STAFF)
  const staffRecord = data?.staffMember
  const { data: realDeptData } = useQuery(GET_REAL_DEPARTMENTS)
  const realDepartments = realDeptData?.departments ?? []

  useEffect(() => {
    // Wait for both queries — resolving the form before realDeptData
    // arrives would permanently null out clinicalDepartment (setForm only
    // ever initializes once, via the `prev ??` guard below).
    if (staffRecord && realDeptData) {
      const clinicalDepartment = realDepartments.find((d) => d.id === staffRecord.departmentId) || null
      const normalized = { ...staffRecord, since: staffRecord.since ? staffRecord.since.split('T')[0] : '', clinicalDepartment }
      setForm((prev) => prev ?? normalized)
      setOriginal((prev) => prev ?? normalized)
    } else if (loadError) {
      enqueueSnackbar('Staff member not found', { variant: 'error' })
      navigate('/staff')
    }
  }, [id, staffRecord, loadError, realDeptData]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!form)
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
        <LinearProgress sx={{ width: 200, borderRadius: 2, '& .MuiLinearProgress-bar': { bgcolor: TEAL } }} />
      </Box>
    )

  const set = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }))
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }))
  }

  const hasChanges = JSON.stringify(form) !== JSON.stringify(original) || newPassword.length > 0

  const validate = () => {
    const e = {}
    if (!form.name.trim()) e.name = 'Full name is required'
    if (!form.email.trim()) e.email = 'Email is required'
    else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) e.email = 'Invalid email address'
    if (!form.phone.trim()) e.phone = 'Phone number is required'
    if (!form.role) e.role = 'Select a role'
    if (!form.department) e.department = 'Select a department'
    if (newPassword && newPassword.length < 8) e.newPassword = 'Minimum 8 characters'
    if (newPassword && newPassword !== confirmPassword) e.confirmPassword = 'Passwords do not match'
    return e
  }

  const handleSave = async () => {
    const e = validate()
    if (Object.keys(e).length) {
      setErrors(e)
      return
    }
    try {
      await saveStaffMutation({
        variables: {
          id,
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
            password: newPassword || undefined,
            // Explicit null (not undefined) when cleared — an omitted field
            // means "leave unchanged" under this backend's partial-update
            // convention, which would silently no-op a real clear action.
            departmentId: form.clinicalDepartment?.id ?? null,
          },
        },
      })
      enqueueSnackbar(
        newPassword ? `${form.name}'s profile and password updated successfully!` : `${form.name}'s profile updated successfully!`,
        { variant: 'success' },
      )
      navigate('/staff')
    } catch (err) {
      enqueueSnackbar(err.message || 'Failed to update staff member', { variant: 'error' })
    }
  }

  const handleDeactivate = async () => {
    setDeactivateOpen(false)
    await deactivateStaffMutation({ variables: { id } })
    enqueueSnackbar(`${form.name} has been deactivated`, { variant: 'warning' })
    navigate('/staff')
  }

  const initials = getInitials(form.name)
  const avatarBg = avatarColor(theme, form.name)
  const STATUSES = statusStyleFor(theme)
  const statusCfg = STATUSES.find((s) => s.value === form.status) || STATUSES[2]

  return (
    <Box className="page-enter" sx={{ pb: 5, maxWidth: 900, mx: 'auto' }}>
      <Helmet>
        <title>Edit Staff — {form.name}</title>
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
            Edit Staff Member
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.3 }}>
            Update profile for <strong>{form.name}</strong>
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.5} alignItems="center">
          {hasChanges && (
            <Chip
              label="Unsaved changes"
              size="small"
              sx={{ bgcolor: (t) => alpha(t.palette.warning.main, 0.18), color: 'warning.dark', fontWeight: 700, fontSize: '0.72rem', height: 26 }}
            />
          )}
          <Button
            variant="contained"
            startIcon={<SaveRoundedIcon />}
            onClick={handleSave}
            disabled={saving || !hasChanges}
            sx={{
              borderRadius: 2.5,
              textTransform: 'none',
              fontWeight: 700,
              px: 3,
              background: `linear-gradient(135deg, ${TEAL_LIGHT} 0%, ${TEAL} 100%)`,
              boxShadow: `0 4px 14px ${TEAL}40`,
              '&:hover': { boxShadow: `0 6px 20px ${TEAL}55`, transform: 'translateY(-1px)' },
              '&:disabled': { opacity: 0.6 },
              transition: 'all 0.2s ease',
            }}
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </Button>
        </Stack>
      </Box>

      {saving && (
        <LinearProgress sx={{ borderRadius: 2, height: 3, mb: 3, bgcolor: `${TEAL}20`, '& .MuiLinearProgress-bar': { bgcolor: TEAL } }} />
      )}

      <Grid container spacing={3}>
        {/* ── Left: Profile card ───────────────────────────────────────── */}
        <Grid item xs={12} md={3.5}>
          <Card sx={{ borderRadius: 3, border: '1px solid #E2E8F0', boxShadow: 'none', mb: 2.5, position: 'sticky', top: 20 }}>
            {/* Cover */}
            <Box
              sx={{
                height: 70,
                background: `linear-gradient(135deg, ${TEAL} 0%, ${TEAL_LIGHT} 100%)`,
                borderRadius: '12px 12px 0 0',
                position: 'relative',
              }}
            >
              <Box
                sx={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  bgcolor: statusCfg.bg,
                  color: statusCfg.color,
                  border: `1px solid ${statusCfg.dot}40`,
                  borderRadius: '20px',
                  px: 1,
                  py: 0.2,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                }}
              >
                <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: statusCfg.dot }} />
                <Typography variant="caption" fontWeight={700} sx={{ fontSize: '0.65rem' }}>
                  {statusCfg.label}
                </Typography>
              </Box>
            </Box>

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
                {form.name}
              </Typography>
              <Chip
                label={form.role}
                size="small"
                sx={{ mt: 1, bgcolor: alpha(TEAL, 0.08), color: TEAL, fontWeight: 700, fontSize: '0.72rem', borderRadius: 1.5 }}
              />
              <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', mt: 0.75 }}>
                {form.department}
              </Typography>
              <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', mt: 0.25 }}>
                {form.email}
              </Typography>
              <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                Since {form.since}
              </Typography>
            </CardContent>

            <Divider />

            {/* Status selector */}
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
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: s.dot, flexShrink: 0 }} />
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

            <Divider />

            {/* Danger zone */}
            <CardContent sx={{ px: 2, pb: '16px !important' }}>
              <Button
                variant="outlined"
                fullWidth
                startIcon={<PersonOffRoundedIcon fontSize="small" />}
                onClick={() => setDeactivateOpen(true)}
                sx={{
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  borderColor: 'error.light',
                  color: 'error.main',
                  '&:hover': { bgcolor: (t) => alpha(t.palette.error.main, 0.08), borderColor: 'error.main' },
                }}
              >
                Deactivate Member
              </Button>
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
                      sx={{
                        '& .MuiOutlinedInput-root': { borderRadius: 2, '&.Mui-focused fieldset': { borderColor: TEAL } },
                        '& label.Mui-focused': { color: TEAL },
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Start Date"
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

              {/* context/open-questions.md #3, resolved: admin sets a specific
                  password directly via UpdateStaffInput.password. */}
              <FieldSection icon={LockRoundedIcon} title="Reset Password">
                <Box sx={{ bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 1.5, mb: 2, display: 'flex', gap: 1 }}>
                  <InfoRoundedIcon sx={{ fontSize: '1rem', color: 'text.disabled', mt: 0.1, flexShrink: 0 }} />
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    Leave blank to keep the current password. Setting a new one takes effect immediately.
                  </Typography>
                </Box>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="New Password"
                      fullWidth
                      size="small"
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value)
                        if (errors.newPassword) setErrors((prev) => ({ ...prev, newPassword: '' }))
                      }}
                      error={!!errors.newPassword}
                      helperText={errors.newPassword}
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton size="small" onClick={() => setShowNewPassword((v) => !v)} edge="end">
                              {showNewPassword ? <VisibilityOffRoundedIcon fontSize="small" /> : <VisibilityRoundedIcon fontSize="small" />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Confirm New Password"
                      fullWidth
                      size="small"
                      type={showNewPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value)
                        if (errors.confirmPassword) setErrors((prev) => ({ ...prev, confirmPassword: '' }))
                      }}
                      error={!!errors.confirmPassword}
                      helperText={errors.confirmPassword}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />
                  </Grid>
                </Grid>
              </FieldSection>

              <Divider sx={{ my: 2.5 }} />

              {/* Notes */}
              <FieldSection icon={BadgeRoundedIcon} title="Notes">
                <TextField
                  label="Notes (optional)"
                  fullWidth
                  size="small"
                  multiline
                  rows={3}
                  value={form.notes}
                  onChange={set('notes')}
                  sx={{
                    '& .MuiOutlinedInput-root': { borderRadius: 2, '&.Mui-focused fieldset': { borderColor: TEAL } },
                    '& label.Mui-focused': { color: TEAL },
                  }}
                />
              </FieldSection>
            </CardContent>
          </Card>

          {/* Bottom actions */}
          <Stack direction="row" spacing={2} justifyContent="space-between" sx={{ mt: 2.5 }}>
            <Button
              variant="outlined"
              startIcon={<DeleteRoundedIcon fontSize="small" />}
              onClick={() => setDeactivateOpen(true)}
              sx={{
                borderRadius: 2.5,
                textTransform: 'none',
                fontWeight: 700,
                borderColor: 'error.light',
                color: 'error.main',
                '&:hover': { bgcolor: (t) => alpha(t.palette.error.main, 0.08), borderColor: 'error.main' },
              }}
            >
              Deactivate
            </Button>
            <Stack direction="row" spacing={1.5}>
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
                disabled={saving || !hasChanges}
                sx={{
                  borderRadius: 2.5,
                  textTransform: 'none',
                  fontWeight: 700,
                  px: 3,
                  background: `linear-gradient(135deg, ${TEAL_LIGHT} 0%, ${TEAL} 100%)`,
                  boxShadow: `0 4px 14px ${TEAL}40`,
                  '&:hover': { boxShadow: `0 6px 20px ${TEAL}55`, transform: 'translateY(-1px)' },
                  '&:disabled': { opacity: 0.6 },
                  transition: 'all 0.2s ease',
                }}
              >
                {saving ? 'Saving…' : 'Save Changes'}
              </Button>
            </Stack>
          </Stack>
        </Grid>
      </Grid>

      {/* ── Deactivate Confirm Dialog ──────────────────────────────────────── */}
      <Dialog
        open={deactivateOpen}
        onClose={() => setDeactivateOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ fontWeight: 800, pb: 1 }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Box
              sx={{
                width: 38,
                height: 38,
                borderRadius: '50%',
                bgcolor: (t) => alpha(t.palette.error.main, 0.12),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <PersonOffRoundedIcon sx={{ color: 'error.main', fontSize: '1.2rem' }} />
            </Box>
            Deactivate Staff Member?
          </Stack>
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
            <strong>{form.name}</strong> will be marked as <strong>inactive</strong> and will no longer have access to the system. This
            action can be reversed by an admin.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button
            onClick={() => setDeactivateOpen(false)}
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700, color: 'text.secondary' }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleDeactivate}
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700, bgcolor: 'error.main', '&:hover': { bgcolor: 'error.dark' } }}
          >
            Yes, Deactivate
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
