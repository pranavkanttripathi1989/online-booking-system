import { useState, useEffect } from 'react'
import { useApolloClient, gql } from '@apollo/client'
import {
  Alert, Box, Button, Card, Chip, CircularProgress,
  Grid, MenuItem, Stack, TextField, Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import LocalHospitalIcon from '@mui/icons-material/LocalHospital'
import { useAuth } from '../../context/AuthContext'
import { CLINICS_QUERY } from '../../graphql/queries'

// REQ031 (US-INS-01) — Payers is global reference data (like Languages),
// createPayer is super_admin-only; PayerEmpanelments is the tenant-scoped
// half, manager+. Same "no mock fallback, real backend from day one"
// convention as admin/Departments.jsx and admin/Plans.jsx.
const GET_PAYERS = gql`query GetPayers { payers { id name payer_type is_active } }`
const GET_EMPANELMENTS = gql`
  query GetEmpanelments { payerEmpanelments { id status start_date end_date payer { id name } clinic { id name } } }
`
const CREATE_PAYER = gql`mutation CreatePayer($input: PayerInput!) { createPayer(input: $input) { id } }`
const CREATE_EMPANELMENT = gql`
  mutation CreateEmpanelment($input: PayerEmpanelmentInput!) { createPayerEmpanelment(input: $input) { id } }
`
const UPDATE_EMPANELMENT_STATUS = gql`
  mutation UpdateEmpanelmentStatus($id: ID!, $input: UpdatePayerEmpanelmentStatusInput!) {
    updatePayerEmpanelmentStatus(id: $id, input: $input) { id status }
  }
`

const PAYER_TYPES = ['insurer', 'tpa', 'corporate', 'government_scheme']
const EMPANELMENT_STATUSES = ['active', 'de_empanelled', 'blacklisted']
const STATUS_COLOR = { active: 'success', de_empanelled: 'default', blacklisted: 'error' }

export default function AdminPayers() {
  const client = useApolloClient()
  const { hasRole } = useAuth()
  const canManagePayers = hasRole('super_admin')

  const [payers, setPayers] = useState([])
  const [empanelments, setEmpanelments] = useState([])
  const [clinics, setClinics] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [showPayerForm, setShowPayerForm] = useState(false)
  const [showEmpForm, setShowEmpForm] = useState(false)
  const [payerForm, setPayerForm] = useState({ name: '', payer_type: 'insurer' })
  const [empForm, setEmpForm] = useState({ payer_id: '', clinic_id: '', start_date: '' })
  const [formError, setFormError] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const load = async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const [{ data: payerData }, { data: empData }, { data: clinicData }] = await Promise.all([
        client.query({ query: GET_PAYERS, fetchPolicy: 'network-only' }),
        client.query({ query: GET_EMPANELMENTS, fetchPolicy: 'network-only' }),
        client.query({ query: CLINICS_QUERY, fetchPolicy: 'network-only' }),
      ])
      setPayers(payerData?.payers ?? [])
      setEmpanelments(empData?.payerEmpanelments ?? [])
      setClinics(clinicData?.clinics ?? [])
    } catch (err) {
      setLoadError(err.message)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, []) // eslint-disable-line

  const showSuccess = (msg) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(null), 3000) }

  const submitPayer = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setFormError(null)
    try {
      await client.mutate({ mutation: CREATE_PAYER, variables: { input: payerForm } })
      showSuccess('Payer created.')
      setPayerForm({ name: '', payer_type: 'insurer' })
      setShowPayerForm(false)
      load()
    } catch (err) {
      setFormError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const submitEmpanelment = async (e) => {
    e.preventDefault()
    if (!empForm.payer_id || !empForm.clinic_id || !empForm.start_date) { setFormError('Payer, clinic, and start date are required'); return }
    setSubmitting(true)
    setFormError(null)
    try {
      await client.mutate({ mutation: CREATE_EMPANELMENT, variables: { input: empForm } })
      showSuccess('Empanelment recorded.')
      setEmpForm({ payer_id: '', clinic_id: '', start_date: '' })
      setShowEmpForm(false)
      load()
    } catch (err) {
      setFormError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const cycleStatus = async (emp) => {
    const next = EMPANELMENT_STATUSES[(EMPANELMENT_STATUSES.indexOf(emp.status) + 1) % EMPANELMENT_STATUSES.length]
    try {
      await client.mutate({ mutation: UPDATE_EMPANELMENT_STATUS, variables: { id: emp.id, input: { status: next } } })
      load()
    } catch (err) {
      setFormError(err.message)
    }
  }

  if (loading) return <Box display="flex" justifyContent="center" py={6}><CircularProgress /></Box>

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1} flexWrap="wrap" gap={1}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Insurance Payers</Typography>
          <Typography variant="body2" color="text.secondary">Payer/TPA master directory and per-branch empanelment</Typography>
        </Box>
      </Stack>

      {loadError && <Alert severity="warning" sx={{ mb: 2 }} action={<Button size="small" onClick={load}>Retry</Button>}>Failed to load: {loadError}</Alert>}
      {successMsg && <Alert severity="success" sx={{ mb: 2 }}>{successMsg}</Alert>}
      {formError && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setFormError(null)}>{formError}</Alert>}

      <Stack direction="row" justifyContent="space-between" alignItems="center" mt={3} mb={1.5}>
        <Typography variant="h6" fontWeight={700}>Payer Directory</Typography>
        {canManagePayers && <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={() => setShowPayerForm((p) => !p)}>Add Payer</Button>}
      </Stack>
      {!canManagePayers && (
        <Alert severity="info" sx={{ mb: 2 }}>Adding a new payer requires <code>super_admin</code> access — this org-level view is read-only for the directory.</Alert>
      )}

      {showPayerForm && (
        <Card sx={{ mb: 2, p: 2 }}>
          <Box component="form" onSubmit={submitPayer}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth required size="small" label="Payer Name" value={payerForm.name} onChange={(e) => setPayerForm((p) => ({ ...p, name: e.target.value }))} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField select fullWidth required size="small" label="Type" value={payerForm.payer_type} onChange={(e) => setPayerForm((p) => ({ ...p, payer_type: e.target.value }))}>
                  {PAYER_TYPES.map((t) => <MenuItem key={t} value={t}>{t.replace('_', ' ')}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={12}>
                <Stack direction="row" spacing={1}>
                  <Button type="submit" variant="contained" disabled={submitting}>Create</Button>
                  <Button variant="outlined" onClick={() => setShowPayerForm(false)}>Cancel</Button>
                </Stack>
              </Grid>
            </Grid>
          </Box>
        </Card>
      )}

      <Card sx={{ mb: 4 }}>
        <Box sx={{ overflowX: 'auto' }}>
          <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse' }}>
            <Box component="thead">
              <Box component="tr" sx={{ bgcolor: 'grey.50' }}>
                {['Name', 'Type', 'Status'].map((h) => (
                  <Box key={h} component="th" sx={{ px: 2, py: 1.5, textAlign: 'left', typography: 'caption', fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid', borderColor: 'divider' }}>{h}</Box>
                ))}
              </Box>
            </Box>
            <Box component="tbody">
              {payers.length === 0 && (
                <Box component="tr"><Box component="td" colSpan={3} sx={{ textAlign: 'center', py: 6 }}>
                  <LocalHospitalIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1, display: 'block', mx: 'auto' }} />
                  <Typography color="text.secondary">No payers yet</Typography>
                </Box></Box>
              )}
              {payers.map((p) => (
                <Box component="tr" key={p.id} sx={{ '&:hover': { bgcolor: 'grey.50' }, borderBottom: '1px solid', borderColor: 'divider' }}>
                  <Box component="td" sx={{ px: 2, py: 1.5 }}><Typography fontWeight={600}>{p.name}</Typography></Box>
                  <Box component="td" sx={{ px: 2, py: 1.5 }}><Chip size="small" label={p.payer_type.replace('_', ' ')} /></Box>
                  <Box component="td" sx={{ px: 2, py: 1.5 }}><Chip size="small" label={p.is_active ? 'Active' : 'Inactive'} color={p.is_active ? 'success' : 'default'} /></Box>
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
      </Card>

      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
        <Typography variant="h6" fontWeight={700}>Branch Empanelment</Typography>
        <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={() => setShowEmpForm((p) => !p)}>Add Empanelment</Button>
      </Stack>

      {showEmpForm && (
        <Card sx={{ mb: 2, p: 2 }}>
          <Box component="form" onSubmit={submitEmpanelment}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <TextField select fullWidth required size="small" label="Payer" value={empForm.payer_id} onChange={(e) => setEmpForm((p) => ({ ...p, payer_id: e.target.value }))}>
                  {payers.map((p) => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField select fullWidth required size="small" label="Clinic" value={empForm.clinic_id} onChange={(e) => setEmpForm((p) => ({ ...p, clinic_id: e.target.value }))}>
                  {clinics.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField fullWidth required size="small" type="date" label="Start Date" InputLabelProps={{ shrink: true }} value={empForm.start_date} onChange={(e) => setEmpForm((p) => ({ ...p, start_date: e.target.value }))} />
              </Grid>
              <Grid item xs={12}>
                <Stack direction="row" spacing={1}>
                  <Button type="submit" variant="contained" disabled={submitting}>Save</Button>
                  <Button variant="outlined" onClick={() => setShowEmpForm(false)}>Cancel</Button>
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
                {['Payer', 'Clinic', 'Start Date', 'Status'].map((h) => (
                  <Box key={h} component="th" sx={{ px: 2, py: 1.5, textAlign: 'left', typography: 'caption', fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid', borderColor: 'divider' }}>{h}</Box>
                ))}
              </Box>
            </Box>
            <Box component="tbody">
              {empanelments.length === 0 && (
                <Box component="tr"><Box component="td" colSpan={4} sx={{ textAlign: 'center', py: 4 }}><Typography color="text.secondary">No empanelments recorded</Typography></Box></Box>
              )}
              {empanelments.map((emp) => (
                <Box component="tr" key={emp.id} sx={{ '&:hover': { bgcolor: 'grey.50' }, borderBottom: '1px solid', borderColor: 'divider' }}>
                  <Box component="td" sx={{ px: 2, py: 1.5 }}>{emp.payer?.name}</Box>
                  <Box component="td" sx={{ px: 2, py: 1.5 }}>{emp.clinic?.name}</Box>
                  <Box component="td" sx={{ px: 2, py: 1.5 }}>{new Date(emp.start_date).toLocaleDateString('en-IN')}</Box>
                  <Box component="td" sx={{ px: 2, py: 1.5 }}>
                    <Chip size="small" clickable label={emp.status.replace('_', ' ')} color={STATUS_COLOR[emp.status]} onClick={() => cycleStatus(emp)} />
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
      </Card>
    </Box>
  )
}
