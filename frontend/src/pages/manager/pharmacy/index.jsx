import { useState, useEffect } from 'react'
import { useApolloClient, gql } from '@apollo/client'
import {
  Alert, Box, Button, Card, Chip, CircularProgress,
  Grid, MenuItem, Stack, TextField, Typography, Tooltip, IconButton,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import RemoveIcon from '@mui/icons-material/Remove'
import MedicationIcon from '@mui/icons-material/Medication'
import { CLINICS_QUERY } from '../../../graphql/queries'

// REQ022 (pharmacy P0) — real backend from day one, same convention as
// admin/Departments.jsx. Desktop-dense tier (staff-facing operational
// tool, per technical-plans/06's own tiering model) — verify at
// 1280/1440px; truncation is not acceptable, scrolling at 360px is fine.
const GET_DRUGS = gql`query GetDrugs { drugs { id name } }`
const GET_BATCHES = gql`
  query GetBatches($clinic_id: ID) {
    drugBatches(clinic_id: $clinic_id) { id drug_id batch_number quantity_received quantity_remaining expiry_date mrp }
  }
`
const RECEIVE_STOCK = gql`
  mutation ReceiveStock($input: ReceiveStockInput!) { receiveStock(input: $input) { id } }
`
const ADJUST_STOCK = gql`
  mutation AdjustStock($input: AdjustStockInput!) { adjustStock(input: $input) { id quantity_remaining } }
`

const EXPIRY_SOON_DAYS = 90

export default function PharmacyPage() {
  const client = useApolloClient()
  const [clinics, setClinics] = useState([])
  const [drugs, setDrugs] = useState([])
  const [batches, setBatches] = useState([])
  const [clinicId, setClinicId] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [showReceiveForm, setShowReceiveForm] = useState(false)
  const [receiveForm, setReceiveForm] = useState({ drug_id: '', batch_number: '', expiry_date: '', quantity: '', mrp: '' })
  const [adjustingBatch, setAdjustingBatch] = useState(null)
  const [adjustAmount, setAdjustAmount] = useState('')
  const [adjustNotes, setAdjustNotes] = useState('')
  const [formError, setFormError] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const loadRefData = async () => {
    const [{ data: clinicData }, { data: drugData }] = await Promise.all([
      client.query({ query: CLINICS_QUERY, fetchPolicy: 'network-only' }),
      client.query({ query: GET_DRUGS, fetchPolicy: 'network-only' }),
    ])
    setClinics(clinicData?.clinics ?? [])
    setDrugs(drugData?.drugs ?? [])
  }

  const loadBatches = async (forClinicId) => {
    setLoading(true)
    setLoadError(null)
    try {
      const { data } = await client.query({ query: GET_BATCHES, variables: { clinic_id: forClinicId || undefined }, fetchPolicy: 'network-only' })
      setBatches(data?.drugBatches ?? [])
    } catch (err) {
      setLoadError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadRefData().catch((e) => setLoadError(e.message)); loadBatches() }, []) // eslint-disable-line
  useEffect(() => { loadBatches(clinicId) }, [clinicId]) // eslint-disable-line

  const showSuccess = (msg) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(null), 3000) }
  const drugName = (id) => drugs.find((d) => d.id === id)?.name ?? id

  const submitReceive = async (e) => {
    e.preventDefault()
    if (!receiveForm.drug_id || !clinicId || !receiveForm.batch_number || !receiveForm.expiry_date || !receiveForm.quantity) {
      setFormError('Drug, clinic (select above), batch number, expiry, and quantity are all required')
      return
    }
    setSubmitting(true)
    setFormError(null)
    try {
      await client.mutate({
        mutation: RECEIVE_STOCK,
        variables: { input: { drug_id: receiveForm.drug_id, clinic_id: clinicId, batch_number: receiveForm.batch_number, expiry_date: receiveForm.expiry_date, quantity: parseInt(receiveForm.quantity, 10), mrp: receiveForm.mrp ? parseFloat(receiveForm.mrp) : undefined } },
      })
      showSuccess('Stock received.')
      setReceiveForm({ drug_id: '', batch_number: '', expiry_date: '', quantity: '', mrp: '' })
      setShowReceiveForm(false)
      loadBatches(clinicId)
    } catch (err) {
      setFormError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const submitAdjust = async (sign) => {
    const amount = parseInt(adjustAmount, 10)
    if (!amount || amount <= 0) { setFormError('Enter a positive quantity to adjust by'); return }
    setSubmitting(true)
    setFormError(null)
    try {
      await client.mutate({ mutation: ADJUST_STOCK, variables: { input: { batch_id: adjustingBatch.id, quantity_delta: sign * amount, notes: adjustNotes || undefined } } })
      showSuccess('Stock adjusted.')
      setAdjustingBatch(null)
      setAdjustAmount('')
      setAdjustNotes('')
      loadBatches(clinicId)
    } catch (err) {
      setFormError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const isExpiringSoon = (dateStr) => {
    const days = (new Date(dateStr).getTime() - Date.now()) / 86400000
    return days >= 0 && days <= EXPIRY_SOON_DAYS
  }
  const isExpired = (dateStr) => new Date(dateStr).getTime() < Date.now()

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={1}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Pharmacy Stock</Typography>
          <Typography variant="body2" color="text.secondary">Batch-level stock ledger — receive, adjust, and track expiry</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setShowReceiveForm((p) => !p)}>Receive Stock</Button>
      </Stack>

      <TextField select size="small" label="Clinic" value={clinicId} onChange={(e) => setClinicId(e.target.value)} sx={{ minWidth: 220, mb: 2 }}>
        <MenuItem value="">All clinics</MenuItem>
        {clinics.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
      </TextField>

      {loadError && <Alert severity="warning" sx={{ mb: 2 }} action={<Button size="small" onClick={() => loadBatches(clinicId)}>Retry</Button>}>Failed to load: {loadError}</Alert>}
      {successMsg && <Alert severity="success" sx={{ mb: 2 }}>{successMsg}</Alert>}
      {formError && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setFormError(null)}>{formError}</Alert>}

      {showReceiveForm && (
        <Card sx={{ mb: 3, p: 2 }}>
          <Typography variant="h6" fontWeight={600} mb={2}>Receive Stock</Typography>
          {!clinicId && <Alert severity="info" sx={{ mb: 2 }}>Select a specific clinic above before receiving stock.</Alert>}
          <Box component="form" onSubmit={submitReceive}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <TextField select fullWidth required size="small" label="Drug" value={receiveForm.drug_id} onChange={(e) => setReceiveForm((p) => ({ ...p, drug_id: e.target.value }))}>
                  {drugs.map((d) => <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField fullWidth required size="small" label="Batch Number" value={receiveForm.batch_number} onChange={(e) => setReceiveForm((p) => ({ ...p, batch_number: e.target.value }))} />
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <TextField fullWidth required size="small" type="date" label="Expiry Date" InputLabelProps={{ shrink: true }} value={receiveForm.expiry_date} onChange={(e) => setReceiveForm((p) => ({ ...p, expiry_date: e.target.value }))} />
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <TextField fullWidth required size="small" type="number" label="Quantity" value={receiveForm.quantity} onChange={(e) => setReceiveForm((p) => ({ ...p, quantity: e.target.value }))} inputProps={{ min: 1 }} />
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <TextField fullWidth size="small" type="number" label="MRP (₹, optional)" value={receiveForm.mrp} onChange={(e) => setReceiveForm((p) => ({ ...p, mrp: e.target.value }))} inputProps={{ min: 0, step: 0.01 }} />
              </Grid>
              <Grid item xs={12}>
                <Stack direction="row" spacing={1}>
                  <Button type="submit" variant="contained" disabled={submitting || !clinicId}>Receive</Button>
                  <Button variant="outlined" onClick={() => setShowReceiveForm(false)}>Cancel</Button>
                </Stack>
              </Grid>
            </Grid>
          </Box>
        </Card>
      )}

      {adjustingBatch && (
        <Card sx={{ mb: 3, p: 2 }}>
          <Typography variant="h6" fontWeight={600} mb={2}>Adjust Batch {adjustingBatch.batch_number}</Typography>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={3}>
              <TextField fullWidth size="small" type="number" label="Quantity" value={adjustAmount} onChange={(e) => setAdjustAmount(e.target.value)} inputProps={{ min: 1 }} />
            </Grid>
            <Grid item xs={12} sm={5}>
              <TextField fullWidth size="small" label="Reason / notes" value={adjustNotes} onChange={(e) => setAdjustNotes(e.target.value)} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <Stack direction="row" spacing={1}>
                <Button variant="contained" color="error" startIcon={<RemoveIcon />} disabled={submitting} onClick={() => submitAdjust(-1)}>Remove</Button>
                <Button variant="outlined" onClick={() => { setAdjustingBatch(null); setAdjustAmount(''); setAdjustNotes('') }}>Cancel</Button>
              </Stack>
            </Grid>
          </Grid>
        </Card>
      )}

      {loading ? (
        <Box display="flex" justifyContent="center" py={6}><CircularProgress /></Box>
      ) : (
        <Card>
          <Box sx={{ overflowX: 'auto' }}>
            <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse' }}>
              <Box component="thead">
                <Box component="tr" sx={{ bgcolor: 'grey.50' }}>
                  {['Drug', 'Batch', 'Received', 'Remaining', 'Expiry', 'MRP', 'Actions'].map((h) => (
                    <Box key={h} component="th" sx={{ px: 2, py: 1.5, textAlign: 'left', typography: 'caption', fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid', borderColor: 'divider' }}>{h}</Box>
                  ))}
                </Box>
              </Box>
              <Box component="tbody">
                {batches.length === 0 && (
                  <Box component="tr"><Box component="td" colSpan={7} sx={{ textAlign: 'center', py: 6 }}>
                    <MedicationIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1, display: 'block', mx: 'auto' }} />
                    <Typography color="text.secondary">No stock batches yet</Typography>
                  </Box></Box>
                )}
                {batches.map((b) => (
                  <Box component="tr" key={b.id} sx={{ '&:hover': { bgcolor: 'grey.50' }, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Box component="td" sx={{ px: 2, py: 1.5 }}>{drugName(b.drug_id)}</Box>
                    <Box component="td" sx={{ px: 2, py: 1.5 }}><Typography fontWeight={600}>{b.batch_number}</Typography></Box>
                    <Box component="td" sx={{ px: 2, py: 1.5 }}>{b.quantity_received}</Box>
                    <Box component="td" sx={{ px: 2, py: 1.5 }}>
                      <Chip size="small" label={b.quantity_remaining} color={b.quantity_remaining === 0 ? 'error' : b.quantity_remaining < b.quantity_received * 0.2 ? 'warning' : 'success'} />
                    </Box>
                    <Box component="td" sx={{ px: 2, py: 1.5 }}>
                      <Tooltip title={isExpired(b.expiry_date) ? 'Expired' : isExpiringSoon(b.expiry_date) ? 'Expiring within 90 days' : ''}>
                        <Typography variant="body2" color={isExpired(b.expiry_date) ? 'error.main' : isExpiringSoon(b.expiry_date) ? 'warning.main' : 'text.primary'} fontWeight={isExpired(b.expiry_date) || isExpiringSoon(b.expiry_date) ? 700 : 400}>
                          {new Date(b.expiry_date).toLocaleDateString('en-IN')}
                        </Typography>
                      </Tooltip>
                    </Box>
                    <Box component="td" sx={{ px: 2, py: 1.5 }}>{b.mrp != null ? `₹${b.mrp.toFixed(2)}` : '—'}</Box>
                    <Box component="td" sx={{ px: 2, py: 1.5 }}>
                      <Tooltip title="Adjust stock">
                        <IconButton size="small" onClick={() => setAdjustingBatch(b)}><RemoveIcon fontSize="small" /></IconButton>
                      </Tooltip>
                    </Box>
                  </Box>
                ))}
              </Box>
            </Box>
          </Box>
        </Card>
      )}
    </Box>
  )
}
