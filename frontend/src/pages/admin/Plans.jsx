import { useState, useEffect } from 'react'
import { useApolloClient, gql } from '@apollo/client'
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  FormControlLabel,
  Grid,
  IconButton,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
  Tooltip,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import HistoryIcon from '@mui/icons-material/History'
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium'
import ConfirmDialog from '../../components/ConfirmDialog/ConfirmDialog'

// REQ032 (US-PLAN-01/02) — real backend from day one (super_admin-only,
// platform-level plan catalog), same "no mock fallback" convention as
// admin/Departments.jsx. feature_flags/quotas are fixed known keys rather
// than a free-form key/value editor — matches the PRD's own illustrative
// examples (pharmacy/telemedicine entitlement flags, a clinician-seat
// quota) and keeps the form usable without inventing a generic JSON editor.
const FEATURE_FLAG_KEYS = [
  { key: 'pharmacy', label: 'Pharmacy module' },
  { key: 'telemedicine', label: 'Telemedicine' },
  { key: 'insurance', label: 'Insurance desk' },
  { key: 'whatsapp', label: 'WhatsApp notifications' },
]
const QUOTA_KEYS = [
  { key: 'max_clinician_seats', label: 'Max clinician seats' },
  { key: 'max_clinics', label: 'Max clinics' },
]

const GET_PLANS = gql`
  query GetPlans {
    plans {
      id
      name
      tier
      is_active
      current_version {
        id
        version
        price
        billing_period
        feature_flags {
          key
          enabled
        }
        quotas {
          key
          value
        }
      }
      versions {
        id
        version
        effective_from
        effective_until
      }
    }
  }
`
const CREATE_PLAN = gql`
  mutation CreatePlan($input: PlanInput!) {
    createPlan(input: $input) {
      id
    }
  }
`
const CREATE_PLAN_VERSION = gql`
  mutation CreatePlanVersion($input: CreatePlanVersionInput!) {
    createPlanVersion(input: $input) {
      id
    }
  }
`
const SET_PLAN_ACTIVE = gql`
  mutation SetPlanActive($id: ID!, $is_active: Boolean!) {
    setPlanActive(id: $id, is_active: $is_active) {
      id
      is_active
    }
  }
`

const defaultForm = () => ({
  name: '',
  tier: 'starter',
  billing_period: 'monthly',
  price: '',
  feature_flags: Object.fromEntries(FEATURE_FLAG_KEYS.map((f) => [f.key, false])),
  quotas: Object.fromEntries(QUOTA_KEYS.map((q) => [q.key, ''])),
})

export default function AdminPlans() {
  const client = useApolloClient()
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [editingPlanId, setEditingPlanId] = useState(null) // set => "new version" mode, not "new plan"
  const [form, setForm] = useState(defaultForm())
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [togglingId, setTogglingId] = useState(null)
  const [formError, setFormError] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const load = async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const { data } = await client.query({ query: GET_PLANS, fetchPolicy: 'network-only' })
      setPlans(data?.plans ?? [])
    } catch (err) {
      setLoadError(err.message)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    load()
  }, []) // eslint-disable-line

  const showSuccess = (msg) => {
    setSuccessMsg(msg)
    setTimeout(() => setSuccessMsg(null), 3000)
  }
  const reset = () => {
    setForm(defaultForm())
    setEditingPlanId(null)
    setShowForm(false)
    setFormError(null)
  }

  const buildInput = () => ({
    billing_period: form.billing_period,
    price: form.price ? parseFloat(form.price) : 0,
    feature_flags: FEATURE_FLAG_KEYS.map((f) => ({ key: f.key, enabled: !!form.feature_flags[f.key] })),
    quotas: QUOTA_KEYS.filter((q) => form.quotas[q.key] !== '').map((q) => ({ key: q.key, value: parseInt(form.quotas[q.key], 10) || 0 })),
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setFormError(null)
    try {
      if (editingPlanId) {
        await client.mutate({ mutation: CREATE_PLAN_VERSION, variables: { input: { plan_id: editingPlanId, ...buildInput() } } })
        showSuccess('New version created — existing subscribers stay on their prior version until migrated.')
      } else {
        if (!form.name.trim()) throw new Error('Name is required')
        await client.mutate({ mutation: CREATE_PLAN, variables: { input: { name: form.name, tier: form.tier, ...buildInput() } } })
        showSuccess('Plan created.')
      }
      reset()
      load()
    } catch (err) {
      setFormError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const openNewVersionForm = (plan) => {
    const cv = plan.current_version
    setForm({
      name: plan.name,
      tier: plan.tier,
      billing_period: cv?.billing_period ?? 'monthly',
      price: cv?.price != null ? String(cv.price) : '',
      feature_flags: Object.fromEntries(
        FEATURE_FLAG_KEYS.map((f) => [f.key, !!cv?.feature_flags?.find((ff) => ff.key === f.key)?.enabled]),
      ),
      quotas: Object.fromEntries(QUOTA_KEYS.map((q) => [q.key, String(cv?.quotas?.find((qq) => qq.key === q.key)?.value ?? '')])),
    })
    setEditingPlanId(plan.id)
    setShowForm(true)
  }

  const confirmToggle = async () => {
    const plan = plans.find((p) => p.id === togglingId)
    setConfirmOpen(false)
    try {
      await client.mutate({ mutation: SET_PLAN_ACTIVE, variables: { id: togglingId, is_active: !plan.is_active } })
      showSuccess(plan.is_active ? 'Plan deactivated.' : 'Plan activated.')
      load()
    } catch (err) {
      setFormError(err.message)
    }
    setTogglingId(null)
  }

  if (loading)
    return (
      <Box display="flex" justifyContent="center" py={6}>
        <CircularProgress />
      </Box>
    )

  const insufficientPermission = loadError && /permission/i.test(loadError)

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={1}>
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Subscription Plans
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Platform-wide plan catalog — super_admin only
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
            reset()
            setShowForm((p) => !p)
          }}
        >
          New Plan
        </Button>
      </Stack>

      {insufficientPermission && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Your account doesn't have <code>super_admin</code> access — plan management is restricted to the platform's own super-admin role,
          not org-level admins.
        </Alert>
      )}
      {loadError && !insufficientPermission && (
        <Alert
          severity="warning"
          sx={{ mb: 2 }}
          action={
            <Button size="small" onClick={load}>
              Retry
            </Button>
          }
        >
          Failed to load: {loadError}
        </Alert>
      )}
      {successMsg && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {successMsg}
        </Alert>
      )}
      {formError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setFormError(null)}>
          {formError}
        </Alert>
      )}

      {showForm && (
        <Card sx={{ mb: 3, p: 2 }}>
          <Typography variant="h6" fontWeight={600} mb={2}>
            {editingPlanId ? `New version for "${form.name}"` : 'New Plan'}
          </Typography>
          {editingPlanId && (
            <Alert severity="info" sx={{ mb: 2 }}>
              This creates a new version. Existing subscribers on the current version are unaffected until explicitly migrated.
            </Alert>
          )}
          <Box component="form" onSubmit={handleSubmit}>
            <Grid container spacing={2}>
              {!editingPlanId && (
                <>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      required
                      size="small"
                      label="Plan Name"
                      value={form.name}
                      onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      select
                      fullWidth
                      required
                      size="small"
                      label="Tier"
                      value={form.tier}
                      onChange={(e) => setForm((p) => ({ ...p, tier: e.target.value }))}
                    >
                      <MenuItem value="starter">Starter</MenuItem>
                      <MenuItem value="pro">Pro</MenuItem>
                      <MenuItem value="enterprise">Enterprise</MenuItem>
                    </TextField>
                  </Grid>
                </>
              )}
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  fullWidth
                  required
                  size="small"
                  label="Billing Period"
                  value={form.billing_period}
                  onChange={(e) => setForm((p) => ({ ...p, billing_period: e.target.value }))}
                >
                  <MenuItem value="monthly">Monthly</MenuItem>
                  <MenuItem value="annual">Annual</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  required
                  size="small"
                  type="number"
                  label="Price (₹)"
                  value={form.price}
                  onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))}
                  inputProps={{ min: 0, step: 0.01 }}
                />
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" fontWeight={700} mb={1}>
                  Feature flags
                </Typography>
                <Stack direction="row" flexWrap="wrap" gap={1}>
                  {FEATURE_FLAG_KEYS.map((f) => (
                    <FormControlLabel
                      key={f.key}
                      control={
                        <Switch
                          checked={!!form.feature_flags[f.key]}
                          onChange={(e) => setForm((p) => ({ ...p, feature_flags: { ...p.feature_flags, [f.key]: e.target.checked } }))}
                        />
                      }
                      label={f.label}
                    />
                  ))}
                </Stack>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" fontWeight={700} mb={1}>
                  Quotas
                </Typography>
                <Grid container spacing={2}>
                  {QUOTA_KEYS.map((q) => (
                    <Grid item xs={12} sm={6} key={q.key}>
                      <TextField
                        fullWidth
                        size="small"
                        type="number"
                        label={q.label}
                        value={form.quotas[q.key]}
                        onChange={(e) => setForm((p) => ({ ...p, quotas: { ...p.quotas, [q.key]: e.target.value } }))}
                        inputProps={{ min: 0 }}
                      />
                    </Grid>
                  ))}
                </Grid>
              </Grid>
              <Grid item xs={12}>
                <Stack direction="row" spacing={1}>
                  <Button type="submit" variant="contained" disabled={submitting}>
                    {editingPlanId ? 'Create Version' : 'Create Plan'}
                  </Button>
                  <Button variant="outlined" onClick={reset}>
                    Cancel
                  </Button>
                </Stack>
              </Grid>
            </Grid>
          </Box>
        </Card>
      )}

      <Card>
        <Box sx={{ overflowX: 'auto' }}>
          <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse' }}>
            <Box component="thead">
              <Box component="tr" sx={{ bgcolor: 'grey.50' }}>
                {['Name', 'Tier', 'Current Version', 'Price', 'Status', 'Actions'].map((h) => (
                  <Box
                    key={h}
                    component="th"
                    sx={{
                      px: 2,
                      py: 1.5,
                      textAlign: 'left',
                      typography: 'caption',
                      fontWeight: 700,
                      color: 'text.secondary',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                    }}
                  >
                    {h}
                  </Box>
                ))}
              </Box>
            </Box>
            <Box component="tbody">
              {plans.length === 0 && (
                <Box component="tr">
                  <Box component="td" colSpan={6} sx={{ textAlign: 'center', py: 6 }}>
                    <WorkspacePremiumIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1, display: 'block', mx: 'auto' }} />
                    <Typography color="text.secondary">No plans yet</Typography>
                  </Box>
                </Box>
              )}
              {plans.map((plan) => (
                <Box
                  component="tr"
                  key={plan.id}
                  sx={{ '&:hover': { bgcolor: 'grey.50' }, borderBottom: '1px solid', borderColor: 'divider' }}
                >
                  <Box component="td" sx={{ px: 2, py: 1.5 }}>
                    <Typography fontWeight={600}>{plan.name}</Typography>
                  </Box>
                  <Box component="td" sx={{ px: 2, py: 1.5 }}>
                    <Chip size="small" label={plan.tier} />
                  </Box>
                  <Box component="td" sx={{ px: 2, py: 1.5 }}>
                    <Chip size="small" icon={<HistoryIcon />} label={`v${plan.current_version?.version ?? '—'}`} variant="outlined" />
                  </Box>
                  <Box component="td" sx={{ px: 2, py: 1.5 }}>
                    <Typography variant="body2">
                      ₹{plan.current_version?.price?.toFixed(2) ?? '—'} / {plan.current_version?.billing_period ?? '—'}
                    </Typography>
                  </Box>
                  <Box component="td" sx={{ px: 2, py: 1.5 }}>
                    <Chip size="small" label={plan.is_active ? 'Active' : 'Inactive'} color={plan.is_active ? 'success' : 'default'} />
                  </Box>
                  <Box component="td" sx={{ px: 2, py: 1.5 }}>
                    <Stack direction="row" spacing={0.5}>
                      <Tooltip title="New version">
                        <IconButton size="small" onClick={() => openNewVersionForm(plan)}>
                          <AddIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={plan.is_active ? 'Deactivate' : 'Activate'}>
                        <Switch
                          size="small"
                          checked={plan.is_active}
                          onChange={() => {
                            setTogglingId(plan.id)
                            setConfirmOpen(true)
                          }}
                        />
                      </Tooltip>
                    </Stack>
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
      </Card>

      <ConfirmDialog
        isOpen={confirmOpen}
        title="Change plan status"
        message="This changes whether the plan can be newly assigned to a tenant. Existing subscribers are unaffected."
        onConfirm={confirmToggle}
        onCancel={() => {
          setConfirmOpen(false)
          setTogglingId(null)
        }}
      />
    </Box>
  )
}
