import { useState, useEffect } from 'react'
import { useApolloClient, gql } from '@apollo/client'
import {
  Alert, Box, Button, Card, Chip, CircularProgress,
  Dialog, DialogActions, DialogContent, DialogTitle,
  Grid, IconButton, MenuItem, Stack, Tab, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Tabs, TextField, Tooltip, Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import RemoveIcon from '@mui/icons-material/Remove'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import HistoryIcon from '@mui/icons-material/History'
import MedicationIcon from '@mui/icons-material/Medication'
import InventoryIcon from '@mui/icons-material/Inventory2'
import LocalPharmacyIcon from '@mui/icons-material/LocalPharmacy'
import HourglassBottomRoundedIcon from '@mui/icons-material/HourglassBottomRounded'
import { CLINICS_QUERY, PATIENTS_QUERY } from '../../../graphql/queries'

// REQ022 (pharmacy P0) — real backend from day one, same convention as
// admin/Departments.jsx. Desktop-dense tier (staff-facing operational
// tool, per technical-plans/06's own tiering model) — verify at
// 1280/1440px; truncation is not acceptable, scrolling at 360px is fine.
//
// REQ059 — this page was receive/adjust only; drug catalog CRUD,
// dispensing against a real prescription, and a batch's own movement
// history all had real, tested backend operations with no frontend UI
// at all (project-plans/08-integration-gap-analysis.md A-2/A-3).
const GET_DRUGS = gql`
  query GetDrugsFull {
    drugs { id name composition strength form schedule_class hsn gst_rate manufacturer is_platform_seeded }
  }
`
const CREATE_DRUG = gql`mutation CreateDrug($input: DrugInput!) { createDrug(input: $input) { id } }`
const UPDATE_DRUG = gql`mutation UpdateDrug($id: ID!, $input: DrugInput!) { updateDrug(id: $id, input: $input) { id } }`
const DELETE_DRUG = gql`mutation DeleteDrug($id: ID!) { deleteDrug(id: $id) }`

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
const GET_STOCK_MOVEMENTS = gql`
  query GetStockMovements($batch_id: ID!) {
    stockMovements(batch_id: $batch_id) { id movement_type quantity_delta reference_type reference_id notes created_at }
  }
`
const GET_PATIENT_PRESCRIPTIONS = gql`
  query GetPatientPrescriptionsForDispense($patient_id: ID!) {
    patientPrescriptions(patient_id: $patient_id) {
      id issued_at
      items { id drug_id drug_name dose frequency duration_days qty }
    }
  }
`
const DISPENSE_PRESCRIPTION_ITEM = gql`
  mutation DispensePrescriptionItem($input: DispensePrescriptionItemInput!) {
    dispensePrescriptionItem(input: $input) { id quantity_remaining }
  }
`
// REQ126 (US-RX-09) — org-wide, not scoped to one patient the way the
// Dispense tab's own patient-search flow requires searching first.
const GET_PENDING_DISPENSE = gql`
  query GetPendingDispenseItems {
    pendingDispenseItems {
      prescription_item_id prescription_id issued_at
      patient_id patient_name drug_id drug_name dose frequency
      qty dispensed_qty remaining_qty
    }
  }
`

const EXPIRY_SOON_DAYS = 90
const EMPTY_DRUG_FORM = { name: '', composition: '', strength: '', form: '', schedule_class: '', hsn: '', gst_rate: '', manufacturer: '' }

const MOVEMENT_COLOR = { receipt: 'success', adjustment: 'warning', dispense: 'info' }

export default function PharmacyPage() {
  const client = useApolloClient()
  const [tabIndex, setTabIndex] = useState(0)
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

  // ── Movement History ──────────────────────────────────────────────────
  const [historyBatch, setHistoryBatch] = useState(null)
  const [movements, setMovements] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)

  // ── Drug Catalog ───────────────────────────────────────────────────────
  const [showDrugForm, setShowDrugForm] = useState(false)
  const [editingDrugId, setEditingDrugId] = useState(null)
  const [drugForm, setDrugForm] = useState(EMPTY_DRUG_FORM)

  // ── Dispense ───────────────────────────────────────────────────────────
  const [patientSearch, setPatientSearch] = useState('')
  const [patientResults, setPatientResults] = useState([])
  const [patientSearching, setPatientSearching] = useState(false)
  const [selectedPatient, setSelectedPatient] = useState(null)
  const [prescriptions, setPrescriptions] = useState([])
  const [prescriptionsLoading, setPrescriptionsLoading] = useState(false)
  const [dispensingItem, setDispensingItem] = useState(null)
  const [dispenseBatchId, setDispenseBatchId] = useState('')
  const [dispenseQty, setDispenseQty] = useState('')

  // ── Pending Dispense (REQ126, US-RX-09) ─────────────────────────────────
  const [pendingItems, setPendingItems] = useState([])
  const [pendingLoading, setPendingLoading] = useState(false)

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

  const loadPendingDispenseItems = async () => {
    setPendingLoading(true)
    try {
      const { data } = await client.query({ query: GET_PENDING_DISPENSE, fetchPolicy: 'network-only' })
      setPendingItems(data?.pendingDispenseItems ?? [])
    } catch (err) {
      setFormError(err.message)
    } finally {
      setPendingLoading(false)
    }
  }
  // Loads lazily when the tab is first opened, matching this page's own
  // on-demand convention (e.g. Movement History, patient prescriptions).
  useEffect(() => { if (tabIndex === 3) loadPendingDispenseItems() }, [tabIndex]) // eslint-disable-line

  // Debounced patient search, matching pages/patients/index.jsx's own convention.
  useEffect(() => {
    if (!patientSearch.trim()) { setPatientResults([]); return }
    setPatientSearching(true)
    const t = setTimeout(async () => {
      try {
        const { data } = await client.query({ query: PATIENTS_QUERY, variables: { search: patientSearch, first: 10 }, fetchPolicy: 'network-only' })
        setPatientResults(data?.patients?.data ?? [])
      } catch (err) {
        setFormError(err.message)
      } finally {
        setPatientSearching(false)
      }
    }, 400)
    return () => clearTimeout(t)
  }, [patientSearch, client])

  const showSuccess = (msg) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(null), 3000) }
  const drugName = (id) => drugs.find((d) => d.id === id)?.name ?? id

  // ── Stock: receive / adjust ───────────────────────────────────────────
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

  // ── Movement History ───────────────────────────────────────────────────
  const openHistory = async (batch) => {
    setHistoryBatch(batch)
    setHistoryLoading(true)
    try {
      const { data } = await client.query({ query: GET_STOCK_MOVEMENTS, variables: { batch_id: batch.id }, fetchPolicy: 'network-only' })
      setMovements(data?.stockMovements ?? [])
    } catch (err) {
      setFormError(err.message)
      setMovements([])
    } finally {
      setHistoryLoading(false)
    }
  }

  // ── Drug Catalog ───────────────────────────────────────────────────────
  const openDrugForm = (drug) => {
    if (drug) {
      setEditingDrugId(drug.id)
      setDrugForm({
        name: drug.name, composition: drug.composition ?? '', strength: drug.strength ?? '',
        form: drug.form ?? '', schedule_class: drug.schedule_class ?? '', hsn: drug.hsn ?? '',
        gst_rate: drug.gst_rate != null ? String(drug.gst_rate) : '', manufacturer: drug.manufacturer ?? '',
      })
    } else {
      setEditingDrugId(null)
      setDrugForm(EMPTY_DRUG_FORM)
    }
    setShowDrugForm(true)
  }

  const submitDrug = async (e) => {
    e.preventDefault()
    if (!drugForm.name.trim()) { setFormError('Drug name is required'); return }
    setSubmitting(true)
    setFormError(null)
    const input = {
      name: drugForm.name,
      composition: drugForm.composition || undefined,
      strength: drugForm.strength || undefined,
      form: drugForm.form || undefined,
      schedule_class: drugForm.schedule_class || undefined,
      hsn: drugForm.hsn || undefined,
      gst_rate: drugForm.gst_rate ? parseFloat(drugForm.gst_rate) : undefined,
      manufacturer: drugForm.manufacturer || undefined,
    }
    try {
      if (editingDrugId) {
        await client.mutate({ mutation: UPDATE_DRUG, variables: { id: editingDrugId, input } })
        showSuccess('Drug updated.')
      } else {
        await client.mutate({ mutation: CREATE_DRUG, variables: { input } })
        showSuccess('Drug added to catalog.')
      }
      setShowDrugForm(false)
      setDrugForm(EMPTY_DRUG_FORM)
      setEditingDrugId(null)
      loadRefData()
    } catch (err) {
      setFormError(err?.graphQLErrors?.[0]?.message || err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const deleteDrug = async (drug) => {
    setSubmitting(true)
    setFormError(null)
    try {
      await client.mutate({ mutation: DELETE_DRUG, variables: { id: drug.id } })
      showSuccess('Drug removed.')
      loadRefData()
    } catch (err) {
      setFormError(err?.graphQLErrors?.[0]?.message || err.message)
    } finally {
      setSubmitting(false)
    }
  }

  // ── Dispense ───────────────────────────────────────────────────────────
  const selectPatient = async (patient) => {
    setSelectedPatient(patient)
    setPatientResults([])
    setPatientSearch('')
    setPrescriptionsLoading(true)
    try {
      const { data } = await client.query({ query: GET_PATIENT_PRESCRIPTIONS, variables: { patient_id: patient.id }, fetchPolicy: 'network-only' })
      setPrescriptions(data?.patientPrescriptions ?? [])
    } catch (err) {
      setFormError(err.message)
      setPrescriptions([])
    } finally {
      setPrescriptionsLoading(false)
    }
  }

  const matchingBatches = (item) => (item ? batches.filter((b) => b.drug_id === item.drug_id && b.quantity_remaining > 0) : [])

  const openDispenseForm = (item) => {
    setDispensingItem(item)
    // REQ125 (US-PHR-02) — FEFO default: findBatches() already orders by
    // expiry_date ascending server-side, so matchingBatches(item)[0] is
    // always the earliest-expiring batch with stock. Defaulting to it
    // means expiring stock actually gets used first instead of relying on
    // staff to notice and hand-pick it every time — still fully
    // overridable via the dropdown below.
    setDispenseBatchId(matchingBatches(item)[0]?.id ?? '')
    setDispenseQty(item.qty ? String(item.qty) : '')
  }

  // REQ126 — same dispense dialog the patient-search flow already uses,
  // just pre-filled from a Pending Dispense row directly (no need to
  // search for the patient first). remaining_qty, not the item's original
  // qty, since some of it may already have been dispensed in an earlier visit.
  const openDispenseFromQueue = (row) => {
    openDispenseForm({ id: row.prescription_item_id, drug_id: row.drug_id, drug_name: row.drug_name, qty: row.remaining_qty })
  }

  const submitDispense = async (e) => {
    e.preventDefault()
    const qty = parseInt(dispenseQty, 10)
    if (!dispenseBatchId || !qty || qty <= 0) { setFormError('Select a batch and enter a valid quantity'); return }
    setSubmitting(true)
    setFormError(null)
    try {
      await client.mutate({
        mutation: DISPENSE_PRESCRIPTION_ITEM,
        variables: { input: { prescription_item_id: dispensingItem.id, batch_id: dispenseBatchId, quantity: qty } },
      })
      showSuccess('Dispensed.')
      setDispensingItem(null)
      setDispenseBatchId('')
      setDispenseQty('')
      loadBatches(clinicId)
      // REQ126 — keep the queue honest regardless of which flow triggered
      // this dispense; a cheap no-op refetch if the tab was never opened.
      if (tabIndex === 3) loadPendingDispenseItems()
    } catch (err) {
      setFormError(err?.graphQLErrors?.[0]?.message || err.message)
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
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" gap={1}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Pharmacy</Typography>
          <Typography variant="body2" color="text.secondary">Drug catalog, batch-level stock ledger, and dispensing</Typography>
        </Box>
        {tabIndex === 0 && <Button variant="contained" startIcon={<AddIcon />} onClick={() => setShowReceiveForm((p) => !p)}>Receive Stock</Button>}
        {tabIndex === 1 && <Button variant="contained" startIcon={<AddIcon />} onClick={() => openDrugForm(null)}>Add Drug</Button>}
      </Stack>

      <Tabs value={tabIndex} onChange={(_, v) => setTabIndex(v)} sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
        <Tab label="Stock" icon={<InventoryIcon />} iconPosition="start" />
        <Tab label="Drug Catalog" icon={<MedicationIcon />} iconPosition="start" />
        <Tab label="Dispense" icon={<LocalPharmacyIcon />} iconPosition="start" />
        <Tab label="Pending Dispense" icon={<HourglassBottomRoundedIcon />} iconPosition="start" />
      </Tabs>

      {successMsg && <Alert severity="success" sx={{ mb: 2 }}>{successMsg}</Alert>}
      {formError && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setFormError(null)}>{formError}</Alert>}

      {/* ══ STOCK TAB ══════════════════════════════════════════════════════ */}
      {tabIndex === 0 && (
        <>
          <TextField select size="small" label="Clinic" value={clinicId} onChange={(e) => setClinicId(e.target.value)} sx={{ minWidth: 220, mb: 2 }}>
            <MenuItem value="">All clinics</MenuItem>
            {clinics.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
          </TextField>

          {loadError && <Alert severity="warning" sx={{ mb: 2 }} action={<Button size="small" onClick={() => loadBatches(clinicId)}>Retry</Button>}>Failed to load: {loadError}</Alert>}

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
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'grey.50' }}>
                      {['Drug', 'Batch', 'Received', 'Remaining', 'Expiry', 'MRP', 'Actions'].map((h) => (
                        <TableCell key={h} sx={{ typography: 'caption', fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {batches.length === 0 && (
                      <TableRow><TableCell colSpan={7} sx={{ textAlign: 'center', py: 6 }}>
                        <MedicationIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1, display: 'block', mx: 'auto' }} />
                        <Typography color="text.secondary">No stock batches yet</Typography>
                      </TableCell></TableRow>
                    )}
                    {batches.map((b) => (
                      <TableRow key={b.id} hover>
                        <TableCell>{drugName(b.drug_id)}</TableCell>
                        <TableCell><Typography fontWeight={600}>{b.batch_number}</Typography></TableCell>
                        <TableCell>{b.quantity_received}</TableCell>
                        <TableCell>
                          <Chip size="small" label={b.quantity_remaining} color={b.quantity_remaining === 0 ? 'error' : b.quantity_remaining < b.quantity_received * 0.2 ? 'warning' : 'success'} />
                        </TableCell>
                        <TableCell>
                          <Tooltip title={isExpired(b.expiry_date) ? 'Expired' : isExpiringSoon(b.expiry_date) ? 'Expiring within 90 days' : ''}>
                            <Typography variant="body2" color={isExpired(b.expiry_date) ? 'error.main' : isExpiringSoon(b.expiry_date) ? 'warning.main' : 'text.primary'} fontWeight={isExpired(b.expiry_date) || isExpiringSoon(b.expiry_date) ? 700 : 400}>
                              {new Date(b.expiry_date).toLocaleDateString('en-IN')}
                            </Typography>
                          </Tooltip>
                        </TableCell>
                        <TableCell>{b.mrp != null ? `₹${b.mrp.toFixed(2)}` : '—'}</TableCell>
                        <TableCell>
                          <Stack direction="row">
                            <Tooltip title="Adjust stock">
                              <IconButton size="small" onClick={() => setAdjustingBatch(b)} aria-label={`Adjust ${b.batch_number}`}><RemoveIcon fontSize="small" /></IconButton>
                            </Tooltip>
                            <Tooltip title="Movement history">
                              <IconButton size="small" onClick={() => openHistory(b)} aria-label={`History for ${b.batch_number}`}><HistoryIcon fontSize="small" /></IconButton>
                            </Tooltip>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Card>
          )}
        </>
      )}

      {/* ══ DRUG CATALOG TAB ═══════════════════════════════════════════════ */}
      {tabIndex === 1 && (
        <>
          {showDrugForm && (
            <Card sx={{ mb: 3, p: 2 }}>
              <Typography variant="h6" fontWeight={600} mb={2}>{editingDrugId ? 'Edit Drug' : 'Add Drug'}</Typography>
              <Box component="form" onSubmit={submitDrug}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6} md={3}>
                    <TextField fullWidth required size="small" label="Name" value={drugForm.name} onChange={(e) => setDrugForm((p) => ({ ...p, name: e.target.value }))} />
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <TextField fullWidth size="small" label="Composition" value={drugForm.composition} onChange={(e) => setDrugForm((p) => ({ ...p, composition: e.target.value }))} />
                  </Grid>
                  <Grid item xs={12} sm={6} md={2}>
                    <TextField fullWidth size="small" label="Strength" value={drugForm.strength} onChange={(e) => setDrugForm((p) => ({ ...p, strength: e.target.value }))} />
                  </Grid>
                  <Grid item xs={12} sm={6} md={2}>
                    <TextField fullWidth size="small" label="Form" placeholder="Tablet, Syrup…" value={drugForm.form} onChange={(e) => setDrugForm((p) => ({ ...p, form: e.target.value }))} />
                  </Grid>
                  <Grid item xs={12} sm={6} md={2}>
                    <TextField fullWidth size="small" label="Schedule Class" value={drugForm.schedule_class} onChange={(e) => setDrugForm((p) => ({ ...p, schedule_class: e.target.value }))} />
                  </Grid>
                  <Grid item xs={12} sm={6} md={2}>
                    <TextField fullWidth size="small" label="HSN Code" value={drugForm.hsn} onChange={(e) => setDrugForm((p) => ({ ...p, hsn: e.target.value }))} />
                  </Grid>
                  <Grid item xs={12} sm={6} md={2}>
                    <TextField fullWidth size="small" type="number" label="GST Rate (%)" value={drugForm.gst_rate} onChange={(e) => setDrugForm((p) => ({ ...p, gst_rate: e.target.value }))} inputProps={{ min: 0, max: 100, step: 0.01 }} />
                  </Grid>
                  <Grid item xs={12} sm={6} md={4}>
                    <TextField fullWidth size="small" label="Manufacturer" value={drugForm.manufacturer} onChange={(e) => setDrugForm((p) => ({ ...p, manufacturer: e.target.value }))} />
                  </Grid>
                  <Grid item xs={12}>
                    <Stack direction="row" spacing={1}>
                      <Button type="submit" variant="contained" disabled={submitting}>{editingDrugId ? 'Save Changes' : 'Add Drug'}</Button>
                      <Button variant="outlined" onClick={() => { setShowDrugForm(false); setEditingDrugId(null); setDrugForm(EMPTY_DRUG_FORM) }}>Cancel</Button>
                    </Stack>
                  </Grid>
                </Grid>
              </Box>
            </Card>
          )}

          <Card>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: 'grey.50' }}>
                    {['Name', 'Composition', 'Strength', 'Form', 'Schedule', 'Manufacturer', 'GST %', 'Actions'].map((h) => (
                      <TableCell key={h} sx={{ typography: 'caption', fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {drugs.length === 0 && (
                    <TableRow><TableCell colSpan={8} sx={{ textAlign: 'center', py: 6 }}>
                      <MedicationIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1, display: 'block', mx: 'auto' }} />
                      <Typography color="text.secondary">No drugs in the catalog yet</Typography>
                    </TableCell></TableRow>
                  )}
                  {drugs.map((d) => (
                    <TableRow key={d.id} hover>
                      <TableCell>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Typography fontWeight={600}>{d.name}</Typography>
                          {d.is_platform_seeded && <Chip size="small" label="Platform" variant="outlined" />}
                        </Stack>
                      </TableCell>
                      <TableCell>{d.composition || '—'}</TableCell>
                      <TableCell>{d.strength || '—'}</TableCell>
                      <TableCell>{d.form || '—'}</TableCell>
                      <TableCell>{d.schedule_class || '—'}</TableCell>
                      <TableCell>{d.manufacturer || '—'}</TableCell>
                      <TableCell>{d.gst_rate != null ? d.gst_rate : '—'}</TableCell>
                      <TableCell>
                        {/* Edit/delete hidden (not just disabled) for platform-seeded
                            rows -- drugs.service.ts's assertWritable rejects a
                            tenant's write on these; the backend's own error toast
                            is the fallback, not the primary UX. */}
                        {!d.is_platform_seeded && (
                          <Stack direction="row">
                            <Tooltip title="Edit"><IconButton size="small" onClick={() => openDrugForm(d)} aria-label={`Edit ${d.name}`}><EditIcon fontSize="small" /></IconButton></Tooltip>
                            <Tooltip title="Delete"><IconButton size="small" onClick={() => deleteDrug(d)} aria-label={`Delete ${d.name}`}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                          </Stack>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </>
      )}

      {/* ══ DISPENSE TAB ═══════════════════════════════════════════════════ */}
      {tabIndex === 2 && (
        <Box>
          {!selectedPatient ? (
            <Box maxWidth={480}>
              <TextField
                fullWidth size="small" label="Search patient by name, email, or phone"
                value={patientSearch} onChange={(e) => setPatientSearch(e.target.value)}
                InputProps={{ endAdornment: patientSearching ? <CircularProgress size={16} /> : null }}
              />
              {patientResults.length > 0 && (
                <Card sx={{ mt: 1 }}>
                  {patientResults.map((p) => (
                    <Box key={p.id} sx={{ px: 2, py: 1.25, cursor: 'pointer', '&:hover': { bgcolor: 'grey.50' }, borderBottom: '1px solid', borderColor: 'divider' }} onClick={() => selectPatient(p)}>
                      <Typography fontWeight={600}>{p.full_name}</Typography>
                      <Typography variant="body2" color="text.secondary">{p.phone} · {p.email}</Typography>
                    </Box>
                  ))}
                </Card>
              )}
            </Box>
          ) : (
            <>
              <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
                <Typography variant="h6" fontWeight={600}>{selectedPatient.full_name}'s prescriptions</Typography>
                <Button size="small" onClick={() => { setSelectedPatient(null); setPrescriptions([]) }}>Change patient</Button>
              </Stack>

              {prescriptionsLoading ? (
                <Box display="flex" justifyContent="center" py={4}><CircularProgress /></Box>
              ) : prescriptions.length === 0 ? (
                <Alert severity="info">This patient has no prescriptions on record.</Alert>
              ) : (
                prescriptions.map((rx) => (
                  <Card key={rx.id} sx={{ mb: 2, p: 2 }}>
                    <Typography variant="subtitle2" color="text.secondary" mb={1}>
                      Issued {new Date(rx.issued_at).toLocaleDateString('en-IN')}
                    </Typography>
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            {['Drug', 'Dose', 'Frequency', 'Qty', ''].map((h) => <TableCell key={h}>{h}</TableCell>)}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {rx.items.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell>{item.drug_name}</TableCell>
                              <TableCell>{item.dose}</TableCell>
                              <TableCell>{item.frequency}</TableCell>
                              <TableCell>{item.qty ?? '—'}</TableCell>
                              <TableCell>
                                <Button size="small" variant="outlined" onClick={() => openDispenseForm(item)}>Dispense</Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Card>
                ))
              )}
            </>
          )}
        </Box>
      )}

      {/* ══ PENDING DISPENSE TAB (REQ126, US-RX-09) ═══════════════════════ */}
      {tabIndex === 3 && (
        <Box>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Every prescription item that isn't yet fully dispensed, across the whole pharmacy — oldest first.
          </Typography>
          {pendingLoading ? (
            <Box display="flex" justifyContent="center" py={4}><CircularProgress /></Box>
          ) : pendingItems.length === 0 ? (
            <Alert severity="success">Nothing pending — every issued prescription item has been fully dispensed.</Alert>
          ) : (
            <TableContainer component={Card} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {['Issued', 'Patient', 'Drug', 'Dose', 'Frequency', 'Remaining', ''].map((h) => <TableCell key={h}>{h}</TableCell>)}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pendingItems.map((row) => (
                    <TableRow key={row.prescription_item_id}>
                      <TableCell>{new Date(row.issued_at).toLocaleDateString('en-IN')}</TableCell>
                      <TableCell>{row.patient_name}</TableCell>
                      <TableCell>{row.drug_name}</TableCell>
                      <TableCell>{row.dose}</TableCell>
                      <TableCell>{row.frequency}</TableCell>
                      <TableCell>{row.remaining_qty} / {row.qty}</TableCell>
                      <TableCell>
                        <Button size="small" variant="outlined" onClick={() => openDispenseFromQueue(row)}>Dispense</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      )}

      {/* ── Dispense dialog ─────────────────────────────────────────────── */}
      <Dialog open={!!dispensingItem} onClose={() => setDispensingItem(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Dispense {dispensingItem?.drug_name}</DialogTitle>
        <DialogContent>
          <Box component="form" id="dispense-form" onSubmit={submitDispense} sx={{ pt: 1 }}>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
              Earliest-expiring batch with stock is selected by default — change it below if needed.
            </Typography>
            <TextField
              select fullWidth required size="small" label="Batch" data-testid="dispense-batch-select"
              value={dispenseBatchId} onChange={(e) => setDispenseBatchId(e.target.value)} sx={{ mb: 2 }}
            >
              {matchingBatches(dispensingItem).length === 0 && (
                <MenuItem value="" disabled>No batches in stock for this drug</MenuItem>
              )}
              {matchingBatches(dispensingItem).map((b) => (
                <MenuItem key={b.id} value={b.id}>{b.batch_number} — exp {new Date(b.expiry_date).toLocaleDateString('en-IN')} — {b.quantity_remaining} remaining</MenuItem>
              ))}
            </TextField>
            <TextField fullWidth required size="small" type="number" label="Quantity" value={dispenseQty} onChange={(e) => setDispenseQty(e.target.value)} inputProps={{ min: 1 }} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDispensingItem(null)}>Cancel</Button>
          <Button type="submit" form="dispense-form" variant="contained" disabled={submitting}>Dispense</Button>
        </DialogActions>
      </Dialog>

      {/* ── Movement history dialog ─────────────────────────────────────── */}
      <Dialog open={!!historyBatch} onClose={() => setHistoryBatch(null)} maxWidth="sm" fullWidth>
        <DialogTitle>History — Batch {historyBatch?.batch_number}</DialogTitle>
        <DialogContent>
          {historyLoading ? (
            <Box display="flex" justifyContent="center" py={4}><CircularProgress /></Box>
          ) : movements.length === 0 ? (
            <Typography color="text.secondary" py={2}>No movements recorded yet.</Typography>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {['Type', 'Qty', 'Notes', 'When'].map((h) => <TableCell key={h}>{h}</TableCell>)}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {movements.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell><Chip size="small" label={m.movement_type} color={MOVEMENT_COLOR[m.movement_type] ?? 'default'} /></TableCell>
                      <TableCell>{m.quantity_delta > 0 ? `+${m.quantity_delta}` : m.quantity_delta}</TableCell>
                      <TableCell>{m.notes || (m.reference_type === 'prescription_item' ? 'Prescription dispense' : '—')}</TableCell>
                      <TableCell>{new Date(m.created_at).toLocaleString('en-IN')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHistoryBatch(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
