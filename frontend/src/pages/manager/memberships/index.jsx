import { useState, useEffect } from 'react'
import { useApolloClient, gql } from '@apollo/client'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  FormControl,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
  Tooltip,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import CardMembershipIcon from '@mui/icons-material/CardMembership'
import ConfirmDialog from '../../../components/ConfirmDialog/ConfirmDialog'
import ErrorBoundary from '../../../components/ErrorBoundary'

// ─── GraphQL ─────────────────────────────────────────────────────────────────
// Patient Membership Plans -- built for real 2026-08-30, replacing a page
// that was previously 100% local useState with zero backend at all
// (context/open-questions.md #13). Mirrors manager/packages/index.jsx's own
// structure exactly (REQ054's precedent). price_monthly is already rupees
// at this boundary (converted server-side); never divide/multiply by 100 here.

const GET_MEMBERSHIP_PLANS = gql`
  query GetMembershipPlans {
    membershipPlans {
      id
      clinic_id
      name
      description
      price_monthly
      is_active
    }
  }
`
const GET_MEMBERSHIP_PLAN_CLINICS = gql`
  query GetMembershipPlanClinics {
    clinics {
      id
      name
    }
  }
`
const CREATE_MEMBERSHIP_PLAN = gql`
  mutation CreateMembershipPlan($input: CreateMembershipPlanInput!) {
    createMembershipPlan(input: $input) {
      success
      userErrors {
        message
      }
      membershipPlan {
        id
      }
    }
  }
`
const UPDATE_MEMBERSHIP_PLAN = gql`
  mutation UpdateMembershipPlan($id: ID!, $input: UpdateMembershipPlanInput!) {
    updateMembershipPlan(id: $id, input: $input) {
      success
      userErrors {
        message
      }
      membershipPlan {
        id
      }
    }
  }
`
const DELETE_MEMBERSHIP_PLAN = gql`
  mutation DeleteMembershipPlan($id: ID!) {
    deleteMembershipPlan(id: $id) {
      success
      userErrors {
        message
      }
    }
  }
`

const defaultForm = {
  clinicId: '',
  name: '',
  description: '',
  priceMonthly: 0,
  isActive: true,
}

function ManagerMemberships() {
  const client = useApolloClient()

  const [clinics, setClinics] = useState([])
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [editingPlan, setEditingPlan] = useState(null)
  const [form, setForm] = useState(defaultForm)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [formError, setFormError] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const loadPlans = async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const { data } = await client.query({ query: GET_MEMBERSHIP_PLANS, fetchPolicy: 'network-only' })
      setPlans(data?.membershipPlans || [])
    } catch (err) {
      setLoadError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    client
      .query({ query: GET_MEMBERSHIP_PLAN_CLINICS })
      .then(({ data }) => {
        setClinics(data?.clinics || [])
        setForm((prev) => ({ ...prev, clinicId: prev.clinicId || data?.clinics?.[0]?.id || '' }))
      })
      .catch(() => {})
    loadPlans()
  }, []) // eslint-disable-line

  const showSuccess = (msg) => {
    setSuccessMsg(msg)
    setTimeout(() => setSuccessMsg(null), 3000)
  }
  const setField = (k, v) => setForm((p) => ({ ...p, [k]: v }))

  const resetForm = () => {
    setForm({ ...defaultForm, clinicId: clinics[0]?.id || '' })
    setEditingPlan(null)
    setShowForm(false)
    setFormError(null)
  }

  const handleEdit = (plan) => {
    setEditingPlan(plan)
    setForm({
      clinicId: plan.clinic_id || '',
      name: plan.name || '',
      description: plan.description || '',
      priceMonthly: plan.price_monthly,
      isActive: plan.is_active,
    })
    setShowForm(true)
    setFormError(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setFormError(null)
    try {
      if (editingPlan) {
        const input = {
          name: form.name,
          description: form.description || undefined,
          price_monthly: parseFloat(form.priceMonthly),
          is_active: form.isActive,
        }
        const { data: r } = await client.mutate({ mutation: UPDATE_MEMBERSHIP_PLAN, variables: { id: editingPlan.id, input } })
        if (!r?.updateMembershipPlan?.success) throw new Error(r?.updateMembershipPlan?.userErrors?.[0]?.message || 'Update failed')
        showSuccess('Membership plan updated.')
      } else {
        const input = {
          clinic_id: form.clinicId,
          name: form.name,
          description: form.description || undefined,
          price_monthly: parseFloat(form.priceMonthly),
        }
        const { data: r } = await client.mutate({ mutation: CREATE_MEMBERSHIP_PLAN, variables: { input } })
        if (!r?.createMembershipPlan?.success) throw new Error(r?.createMembershipPlan?.userErrors?.[0]?.message || 'Create failed')
        showSuccess('Membership plan created.')
      }
      resetForm()
      loadPlans()
    } catch (err) {
      setFormError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = (id) => {
    setDeletingId(id)
    setConfirmOpen(true)
  }
  const confirmDelete = async () => {
    setConfirmOpen(false)
    try {
      const { data: r } = await client.mutate({ mutation: DELETE_MEMBERSHIP_PLAN, variables: { id: deletingId } })
      if (!r?.deleteMembershipPlan?.success) {
        setFormError(r?.deleteMembershipPlan?.userErrors?.[0]?.message || 'Delete failed')
        return
      }
      showSuccess('Membership plan deleted.')
      loadPlans()
    } catch (err) {
      setFormError(err.message)
    }
    setDeletingId(null)
  }

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={1.5}>
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Membership Plans
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Recurring monthly plans a patient can be enrolled in from their own detail page
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
            resetForm()
            setShowForm((p) => !p)
          }}
        >
          New Plan
        </Button>
      </Stack>

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
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" fontWeight={600} mb={2}>
              {editingPlan ? 'Edit Membership Plan' : 'New Membership Plan'}
            </Typography>
            <Box component="form" onSubmit={handleSubmit}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth required size="small" disabled={!!editingPlan}>
                    <InputLabel>Clinic</InputLabel>
                    <Select
                      label="Clinic"
                      value={form.clinicId}
                      onChange={(e) => setField('clinicId', e.target.value)}
                      data-testid="clinic-select"
                    >
                      <MenuItem value="">Select clinic</MenuItem>
                      {clinics.map((c) => (
                        <MenuItem key={c.id} value={c.id}>
                          {c.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    required
                    size="small"
                    label="Plan Name"
                    placeholder="e.g. Wellness Basic"
                    value={form.name}
                    onChange={(e) => setField('name', e.target.value)}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    required
                    size="small"
                    type="number"
                    label="Monthly Price"
                    InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
                    inputProps={{ min: 0, step: 0.01 }}
                    value={form.priceMonthly}
                    onChange={(e) => setField('priceMonthly', e.target.value)}
                  />
                </Grid>

                {editingPlan && (
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Status</InputLabel>
                      <Select
                        label="Status"
                        value={form.isActive ? 'yes' : 'no'}
                        onChange={(e) => setField('isActive', e.target.value === 'yes')}
                      >
                        <MenuItem value="yes">Active — patients can be enrolled</MenuItem>
                        <MenuItem value="no">Inactive — hidden from enrollment</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                )}

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Description"
                    multiline
                    rows={2}
                    value={form.description}
                    onChange={(e) => setField('description', e.target.value)}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Stack direction="row" spacing={1}>
                    <Button type="submit" variant="contained" disabled={submitting}>
                      {submitting ? 'Saving…' : editingPlan ? 'Update' : 'Create'}
                    </Button>
                    <Button variant="outlined" onClick={resetForm}>
                      Cancel
                    </Button>
                  </Stack>
                </Grid>
              </Grid>
            </Box>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <Box display="flex" justifyContent="center" py={6}>
          <CircularProgress />
        </Box>
      ) : loadError ? (
        <Alert severity="error">Couldn't load membership plans: {loadError}</Alert>
      ) : (
        <Grid container spacing={2} mt={0.5}>
          {plans.length === 0 && (
            <Grid item xs={12}>
              <Card>
                <CardContent sx={{ textAlign: 'center', py: 6 }}>
                  <CardMembershipIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                  <Typography color="text.secondary">No membership plans yet. Create one patients can be enrolled in.</Typography>
                </CardContent>
              </Card>
            </Grid>
          )}
          {plans.map((plan) => {
            const clinicName = clinics.find((c) => c.id === plan.clinic_id)?.name
            return (
              <Grid item xs={12} sm={6} md={4} lg={3} key={plan.id}>
                <Card sx={{ height: '100%', '&:hover': { boxShadow: 4 }, transition: 'box-shadow 0.2s' }}>
                  <CardContent>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1}>
                      <Box sx={{ bgcolor: 'info.50', borderRadius: 1, p: 1 }}>
                        <CardMembershipIcon color="info" />
                      </Box>
                      <Stack direction="row" spacing={0.5}>
                        <Tooltip title="Edit">
                          <IconButton size="small" aria-label={`Edit membership plan ${plan.name}`} onClick={() => handleEdit(plan)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton
                            size="small"
                            color="error"
                            aria-label={`Delete membership plan ${plan.name}`}
                            onClick={() => handleDelete(plan.id)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </Stack>

                    <Typography variant="h6" fontWeight={700} noWrap sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {plan.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {clinicName}
                    </Typography>
                    <Typography variant="h6" color="success.main" mt={1}>
                      ₹{Number(plan.price_monthly).toFixed(2)}/mo
                    </Typography>
                    {plan.description && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', mt: 0.5 }}
                      >
                        {plan.description}
                      </Typography>
                    )}

                    <Box mt={1.5}>
                      <Chip label={plan.is_active ? 'Active' : 'Inactive'} size="small" color={plan.is_active ? 'success' : 'default'} />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            )
          })}
        </Grid>
      )}

      <ConfirmDialog
        isOpen={confirmOpen}
        title="Delete Membership Plan"
        message="Delete this membership plan permanently? This cannot be undone. Any already-enrolled patients keep their own recorded price and are unaffected."
        onConfirm={confirmDelete}
        onCancel={() => {
          setConfirmOpen(false)
          setDeletingId(null)
        }}
      />
    </Box>
  )
}

export default function ManagerMembershipsWithBoundary() {
  return (
    <ErrorBoundary>
      <ManagerMemberships />
    </ErrorBoundary>
  )
}
