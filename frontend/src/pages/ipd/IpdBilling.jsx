import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useApolloClient, gql } from '@apollo/client'
import {
  Alert,
  Box,
  Button,
  Card,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  Grid,
  IconButton,
  MenuItem,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import LockIcon from '@mui/icons-material/Lock'
import LockOpenIcon from '@mui/icons-material/LockOpen'
import SettingsIcon from '@mui/icons-material/Settings'
import Inventory2Icon from '@mui/icons-material/Inventory2'
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong'
import { CLINICS_QUERY } from '../../graphql/queries'
import { formatDate } from '../../utils/dateTime'

// REQ179 (IPD slice 4). Page-local gql, no existing contract to match.
// Desktop-dense tier (billing is a front-desk/finance surface), verified
// at 1280/1440.

const CHARGE_FIELDS = `
  id charge_type description service_date product_id quantity unit_price total
  gst_rate gst_amount is_reversed is_package_inclusive posted_by_name created_at
`
const PAYMENT_FIELDS = `
  id payment_type amount tenders { tender_type amount reference } receipt_number notes recorded_by_name created_at
`
const BILL_FIELDS = `
  id admission_id admission_number patient_name bill_number status package_id package_name
  gross paid balance finalized_at finalized_by_name created_at
  charges { ${CHARGE_FIELDS} }
  payments { ${PAYMENT_FIELDS} }
`
const BILLS_QUERY = gql`
  query IpdBillsList($clinic_id: ID, $status: String) {
    ipdBills(clinic_id: $clinic_id, status: $status) { ${BILL_FIELDS} }
  }
`
const ADMISSION_BILL_QUERY = gql`
  query IpdAdmissionBill($admission_id: ID!) {
    admissionIpdBill(admission_id: $admission_id) { ${BILL_FIELDS} }
  }
`
const PACKAGES_QUERY = gql`
  query IpdPackagesList($clinic_id: ID) {
    ipdPackages(clinic_id: $clinic_id) {
      id
      clinic_id
      name
      specialty
      price
      is_active
      inclusions {
        id
        product_id
        product_name
        max_quantity
      }
    }
  }
`
const SETTINGS_QUERY = gql`
  query IpdBillingSettingsQuery($clinic_id: ID!) {
    ipdBillingSettings(clinic_id: $clinic_id) {
      day_boundary_mode
      discharge_cutoff_hour
      charge_admission_day
      charge_discharge_day
      transfer_day_rate_policy
      package_excess_policy
      default_deposit
      auto_post_room_charges
      doctor_visit_charge_product_id
    }
  }
`
const PRODUCTS_LEAN_QUERY = gql`
  query ProductsForBilling {
    products {
      id
      name
      clinic_id
      price
      is_active
    }
  }
`
const POST_MANUAL_CHARGE = gql`
  mutation PostManualIpdCharge($input: PostManualIpdChargeInput!) {
    postManualIpdCharge(input: $input) { id }
  }
`
const REVERSE_CHARGE = gql`
  mutation ReverseIpdCharge($input: ReverseIpdChargeInput!) {
    reverseIpdCharge(input: $input) { id }
  }
`
const RECORD_PAYMENT = gql`
  mutation RecordIpdPayment($input: RecordIpdPaymentInput!) {
    recordIpdPayment(input: $input) { id }
  }
`
const SELECT_PACKAGE = gql`
  mutation SelectIpdPackage($input: SelectIpdPackageInput!) {
    selectIpdPackage(input: $input) { id }
  }
`
const FINALIZE_BILL = gql`
  mutation FinalizeIpdBill($id: ID!) {
    finalizeIpdBill(id: $id) { id status bill_number }
  }
`
const UNFINALIZE_BILL = gql`
  mutation UnfinalizeIpdBill($id: ID!) {
    unfinalizeIpdBill(id: $id) { id status }
  }
`
const CREATE_PACKAGE = gql`
  mutation CreateIpdPackage($input: CreateIpdPackageInput!) {
    createIpdPackage(input: $input) { id }
  }
`
const DELETE_PACKAGE = gql`
  mutation DeleteIpdPackage($id: ID!) {
    deleteIpdPackage(id: $id) { success userErrors { message } }
  }
`
const UPDATE_SETTINGS = gql`
  mutation UpdateIpdBillingSettings($clinic_id: ID!, $input: UpdateIpdBillingSettingsInput!) {
    updateIpdBillingSettings(clinic_id: $clinic_id, input: $input) { day_boundary_mode }
  }
`

const TENDER_TYPES = ['cash', 'card', 'upi', 'cheque', 'bank_transfer', 'insurance']
const PAYMENT_TYPES = ['deposit', 'interim', 'final', 'refund', 'payer_settlement']

const STATUS_COLOR = { open: 'default', finalized: 'success' }

function StatusChip({ status }) {
  return <Chip size="small" label={status} color={STATUS_COLOR[status] || 'default'} sx={{ textTransform: 'capitalize' }} />
}
function money(v) {
  return `₹${Number(v ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function IpdBilling() {
  const client = useApolloClient()
  const [searchParams, setSearchParams] = useSearchParams()

  const [clinics, setClinics] = useState([])
  const [clinicId, setClinicId] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [bills, setBills] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)
  const [actionError, setActionError] = useState(null)

  const showSuccess = (msg) => {
    setSuccessMsg(msg)
    setTimeout(() => setSuccessMsg(null), 4000)
  }

  const loadClinics = useCallback(async () => {
    const { data } = await client.query({ query: CLINICS_QUERY, fetchPolicy: 'cache-first' })
    const active = (data?.clinics ?? []).filter((c) => c.is_active)
    setClinics(active)
    if (!clinicId && active.length > 0) setClinicId(active.find((c) => c.is_primary)?.id ?? active[0].id)
  }, [client, clinicId])

  const loadBills = useCallback(async () => {
    if (!clinicId) return
    setLoading(true)
    setLoadError(null)
    try {
      const { data, errors } = await client.query({ query: BILLS_QUERY, variables: { clinic_id: clinicId, status: statusFilter || undefined }, fetchPolicy: 'network-only' })
      if (errors?.length) throw new Error(errors[0].message)
      setBills(data?.ipdBills ?? [])
    } catch (err) {
      setLoadError(err.message)
    } finally {
      setLoading(false)
    }
  }, [client, clinicId, statusFilter])

  useEffect(() => {
    loadClinics()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => {
    if (clinicId) loadBills()
  }, [clinicId, statusFilter, loadBills])

  // ── Detail dialog ─────────────────────────────────────────────────────
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailBill, setDetailBill] = useState(null)
  const [detailTab, setDetailTab] = useState(0)
  const [packages, setPackages] = useState([])
  const [products, setProducts] = useState([])

  const openDetail = async (admissionId) => {
    setDetailOpen(true)
    setDetailTab(0)
    const [{ data: billData }, { data: pkgData }, { data: prodData }] = await Promise.all([
      client.query({ query: ADMISSION_BILL_QUERY, variables: { admission_id: admissionId }, fetchPolicy: 'network-only' }),
      client.query({ query: PACKAGES_QUERY, variables: { clinic_id: clinicId }, fetchPolicy: 'network-only' }),
      client.query({ query: PRODUCTS_LEAN_QUERY, fetchPolicy: 'cache-first' }),
    ])
    setDetailBill(billData?.admissionIpdBill ?? null)
    setPackages(pkgData?.ipdPackages ?? [])
    setProducts((prodData?.products ?? []).filter((p) => p.is_active))
  }
  const refreshDetail = async () => {
    if (detailBill) await openDetail(detailBill.admission_id)
    await loadBills()
  }

  // Deep-link from the admissions detail dialog's own "Billing" action.
  useEffect(() => {
    const admissionParam = searchParams.get('admission')
    if (admissionParam && clinicId) {
      openDetail(admissionParam)
      searchParams.delete('admission')
      setSearchParams(searchParams)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clinicId])

  // ── Manual charge ─────────────────────────────────────────────────────
  const [chargeOpen, setChargeOpen] = useState(false)
  const [chargeDraft, setChargeDraft] = useState({ description: '', product_id: '', quantity: '1', unit_price: '' })
  const [chargeSubmitting, setChargeSubmitting] = useState(false)

  const handlePostCharge = async () => {
    if (!chargeDraft.description.trim() || (!chargeDraft.product_id && !chargeDraft.unit_price)) {
      setActionError('Enter a description and either pick a charge item or enter a unit price.')
      return
    }
    setChargeSubmitting(true)
    try {
      await client.mutate({
        mutation: POST_MANUAL_CHARGE,
        variables: {
          input: {
            admission_id: detailBill.admission_id,
            description: chargeDraft.description.trim(),
            product_id: chargeDraft.product_id || undefined,
            quantity: Number(chargeDraft.quantity) || 1,
            unit_price: chargeDraft.product_id ? undefined : Number(chargeDraft.unit_price),
          },
        },
      })
      showSuccess('Charge posted.')
      setChargeOpen(false)
      setChargeDraft({ description: '', product_id: '', quantity: '1', unit_price: '' })
      await refreshDetail()
    } catch (err) {
      setActionError(err.message)
    } finally {
      setChargeSubmitting(false)
    }
  }

  const handleReverse = async (chargeId) => {
    const reason = window.prompt('Reason for reversing this charge?')
    if (!reason) return
    try {
      await client.mutate({ mutation: REVERSE_CHARGE, variables: { input: { charge_id: chargeId, reason } } })
      showSuccess('Charge reversed.')
      await refreshDetail()
    } catch (err) {
      setActionError(err.message)
    }
  }

  // ── Payment ────────────────────────────────────────────────────────────
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [paymentDraft, setPaymentDraft] = useState({ payment_type: 'deposit', tender_type: 'cash', amount: '', reference: '', notes: '' })
  const [paymentSubmitting, setPaymentSubmitting] = useState(false)

  const handleRecordPayment = async () => {
    if (!paymentDraft.amount || Number(paymentDraft.amount) <= 0) {
      setActionError('Enter a payment amount.')
      return
    }
    setPaymentSubmitting(true)
    try {
      await client.mutate({
        mutation: RECORD_PAYMENT,
        variables: {
          input: {
            admission_id: detailBill.admission_id,
            payment_type: paymentDraft.payment_type,
            tenders: [{ tender_type: paymentDraft.tender_type, amount: Number(paymentDraft.amount), reference: paymentDraft.reference || undefined }],
            notes: paymentDraft.notes || undefined,
          },
        },
      })
      showSuccess('Payment recorded.')
      setPaymentOpen(false)
      setPaymentDraft({ payment_type: 'deposit', tender_type: 'cash', amount: '', reference: '', notes: '' })
      await refreshDetail()
    } catch (err) {
      setActionError(err.message)
    } finally {
      setPaymentSubmitting(false)
    }
  }

  // ── Package selection / finalize ──────────────────────────────────────
  const handleSelectPackage = async (packageId) => {
    try {
      await client.mutate({ mutation: SELECT_PACKAGE, variables: { input: { admission_id: detailBill.admission_id, package_id: packageId } } })
      showSuccess('Package selected.')
      await refreshDetail()
    } catch (err) {
      setActionError(err.message)
    }
  }
  const handleFinalize = async () => {
    if (!window.confirm('Finalize this bill? A package settlement (if any) is applied and a permanent bill number is assigned.')) return
    try {
      const { data } = await client.mutate({ mutation: FINALIZE_BILL, variables: { id: detailBill.id } })
      showSuccess(`Bill finalized — ${data.finalizeIpdBill.bill_number}.`)
      await refreshDetail()
    } catch (err) {
      setActionError(err.message)
    }
  }
  const handleUnfinalize = async () => {
    if (!window.confirm('Re-open this bill for editing? The package settlement (if any) will be reversed.')) return
    try {
      await client.mutate({ mutation: UNFINALIZE_BILL, variables: { id: detailBill.id } })
      showSuccess('Bill re-opened.')
      await refreshDetail()
    } catch (err) {
      setActionError(err.message)
    }
  }

  // ── Packages management ───────────────────────────────────────────────
  const [packagesDialogOpen, setPackagesDialogOpen] = useState(false)
  const [pkgDraft, setPkgDraft] = useState({ name: '', specialty: '', price: '', inclusionIds: [] })
  const [pkgSubmitting, setPkgSubmitting] = useState(false)

  const openPackagesDialog = async () => {
    setPackagesDialogOpen(true)
    const [{ data: pkgData }, { data: prodData }] = await Promise.all([
      client.query({ query: PACKAGES_QUERY, variables: { clinic_id: clinicId }, fetchPolicy: 'network-only' }),
      client.query({ query: PRODUCTS_LEAN_QUERY, fetchPolicy: 'cache-first' }),
    ])
    setPackages(pkgData?.ipdPackages ?? [])
    setProducts((prodData?.products ?? []).filter((p) => p.is_active))
  }
  const handleCreatePackage = async () => {
    if (!pkgDraft.name.trim() || !pkgDraft.price || pkgDraft.inclusionIds.length === 0) {
      setActionError('Enter a name, a price, and at least one inclusion.')
      return
    }
    setPkgSubmitting(true)
    try {
      await client.mutate({
        mutation: CREATE_PACKAGE,
        variables: {
          input: {
            clinic_id: clinicId,
            name: pkgDraft.name.trim(),
            specialty: pkgDraft.specialty || undefined,
            price: Number(pkgDraft.price),
            inclusions: pkgDraft.inclusionIds.map((product_id) => ({ product_id })),
          },
        },
      })
      showSuccess('Package created.')
      setPkgDraft({ name: '', specialty: '', price: '', inclusionIds: [] })
      await openPackagesDialog()
    } catch (err) {
      setActionError(err.message)
    } finally {
      setPkgSubmitting(false)
    }
  }
  const handleDeletePackage = async (id) => {
    try {
      const { data } = await client.mutate({ mutation: DELETE_PACKAGE, variables: { id } })
      if (!data.deleteIpdPackage.success) throw new Error(data.deleteIpdPackage.userErrors?.[0]?.message || 'Failed to delete')
      showSuccess('Package deleted.')
      await openPackagesDialog()
    } catch (err) {
      setActionError(err.message)
    }
  }
  const toggleInclusion = (productId) => {
    setPkgDraft((d) => ({
      ...d,
      inclusionIds: d.inclusionIds.includes(productId) ? d.inclusionIds.filter((id) => id !== productId) : [...d.inclusionIds, productId],
    }))
  }

  // ── Settings ───────────────────────────────────────────────────────────
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settingsDraft, setSettingsDraft] = useState(null)
  const [settingsSubmitting, setSettingsSubmitting] = useState(false)

  const openSettings = async () => {
    setSettingsOpen(true)
    const { data } = await client.query({ query: SETTINGS_QUERY, variables: { clinic_id: clinicId }, fetchPolicy: 'network-only' })
    setSettingsDraft(data?.ipdBillingSettings ?? null)
  }
  const handleSaveSettings = async () => {
    setSettingsSubmitting(true)
    try {
      await client.mutate({
        mutation: UPDATE_SETTINGS,
        variables: {
          clinic_id: clinicId,
          input: {
            day_boundary_mode: settingsDraft.day_boundary_mode,
            discharge_cutoff_hour: Number(settingsDraft.discharge_cutoff_hour),
            charge_admission_day: settingsDraft.charge_admission_day,
            charge_discharge_day: settingsDraft.charge_discharge_day,
            transfer_day_rate_policy: settingsDraft.transfer_day_rate_policy,
            package_excess_policy: settingsDraft.package_excess_policy,
            default_deposit: Number(settingsDraft.default_deposit) || 0,
            auto_post_room_charges: settingsDraft.auto_post_room_charges,
            doctor_visit_charge_product_id: settingsDraft.doctor_visit_charge_product_id || undefined,
          },
        },
      })
      showSuccess('Billing settings saved.')
      setSettingsOpen(false)
    } catch (err) {
      setActionError(err.message)
    } finally {
      setSettingsSubmitting(false)
    }
  }

  if (loading && bills.length === 0)
    return (
      <Box display="flex" justifyContent="center" py={6}>
        <CircularProgress />
      </Box>
    )

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={1}>
        <Box>
          <Typography variant="h5" fontWeight={700}>
            IPD Billing
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Ledger, payments and package settlement
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} flexWrap="wrap">
          <TextField select size="small" label="Clinic" value={clinicId} onChange={(e) => setClinicId(e.target.value)} sx={{ minWidth: 180 }}>
            {clinics.map((c) => (
              <MenuItem key={c.id} value={c.id}>
                {c.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField select size="small" label="Status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} sx={{ minWidth: 140 }}>
            <MenuItem value="">All</MenuItem>
            <MenuItem value="open">Open</MenuItem>
            <MenuItem value="finalized">Finalized</MenuItem>
          </TextField>
          <Button variant="outlined" startIcon={<Inventory2Icon />} onClick={openPackagesDialog}>
            Packages
          </Button>
          <Button variant="outlined" startIcon={<SettingsIcon />} onClick={openSettings}>
            Settings
          </Button>
        </Stack>
      </Stack>

      {loadError && (
        <Alert severity="warning" sx={{ mb: 2 }} action={<Button size="small" onClick={loadBills}>Retry</Button>}>
          Failed to load: {loadError}
        </Alert>
      )}
      {successMsg && <Alert severity="success" sx={{ mb: 2 }}>{successMsg}</Alert>}
      {actionError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setActionError(null)}>
          {actionError}
        </Alert>
      )}

      <Card>
        <Box sx={{ overflowX: 'auto' }}>
          <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
            <Box component="thead">
              <Box component="tr" sx={{ bgcolor: 'grey.50' }}>
                {['Patient', 'Admission #', 'Bill #', 'Status', 'Gross', 'Paid', 'Balance', ''].map((h) => (
                  <Box key={h} component="th" sx={{ px: 2, py: 1.5, textAlign: 'left', typography: 'caption', fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid', borderColor: 'divider' }}>
                    {h}
                  </Box>
                ))}
              </Box>
            </Box>
            <Box component="tbody">
              {bills.length === 0 && (
                <Box component="tr">
                  <Box component="td" colSpan={8} sx={{ textAlign: 'center', py: 6 }}>
                    <ReceiptLongIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1, display: 'block', mx: 'auto' }} />
                    <Typography color="text.secondary">No bills match this filter</Typography>
                  </Box>
                </Box>
              )}
              {bills.map((b) => (
                <Box component="tr" key={b.id} onClick={() => openDetail(b.admission_id)} sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'grey.50' }, borderBottom: '1px solid', borderColor: 'divider' }}>
                  <Box component="td" sx={{ px: 2, py: 1.5 }}>{b.patient_name}</Box>
                  <Box component="td" sx={{ px: 2, py: 1.5 }}>{b.admission_number}</Box>
                  <Box component="td" sx={{ px: 2, py: 1.5 }}>{b.bill_number || '—'}</Box>
                  <Box component="td" sx={{ px: 2, py: 1.5 }}><StatusChip status={b.status} /></Box>
                  <Box component="td" sx={{ px: 2, py: 1.5, fontVariantNumeric: 'tabular-nums' }}>{money(b.gross)}</Box>
                  <Box component="td" sx={{ px: 2, py: 1.5, fontVariantNumeric: 'tabular-nums' }}>{money(b.paid)}</Box>
                  <Box component="td" sx={{ px: 2, py: 1.5, fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: b.balance > 0 ? 'error.main' : 'success.main' }}>{money(b.balance)}</Box>
                  <Box component="td" sx={{ px: 2, py: 1.5 }} />
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
      </Card>

      {/* ── Detail ────────────────────────────────────────────────────── */}
      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle fontWeight={700}>
          {detailBill?.patient_name} — {detailBill?.admission_number}
        </DialogTitle>
        <DialogContent dividers>
          {detailBill && (
            <Stack spacing={2}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
                <StatusChip status={detailBill.status} />
                {detailBill.bill_number && <Typography variant="body2">{detailBill.bill_number}</Typography>}
              </Stack>
              <Grid container spacing={1.5}>
                {[
                  ['Gross', money(detailBill.gross)],
                  ['Paid', money(detailBill.paid)],
                  ['Balance', money(detailBill.balance)],
                  ['Package', detailBill.package_name || 'None (itemized)'],
                ].map(([label, value]) => (
                  <Grid item xs={6} sm={3} key={label}>
                    <Typography variant="caption" color="text.secondary" display="block">{label}</Typography>
                    <Typography variant="body2" fontWeight={600}>{value}</Typography>
                  </Grid>
                ))}
              </Grid>
              <Divider />

              <Tabs value={detailTab} onChange={(_e, v) => setDetailTab(v)} variant="scrollable" scrollButtons="auto">
                <Tab label="Charges" />
                <Tab label="Payments" />
                <Tab label="Package" />
              </Tabs>

              {detailTab === 0 && (
                <Stack spacing={1.5}>
                  {detailBill.status === 'open' && (
                    <Button size="small" startIcon={<AddIcon />} onClick={() => setChargeOpen(true)} sx={{ alignSelf: 'flex-start' }}>
                      Add Manual Charge
                    </Button>
                  )}
                  <Box sx={{ overflowX: 'auto' }}>
                    <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
                      <Box component="thead">
                        <Box component="tr">
                          {['Date', 'Type', 'Description', 'Qty', 'Total', ''].map((h) => (
                            <Box key={h} component="th" sx={{ px: 1.5, py: 1, textAlign: 'left', typography: 'caption', fontWeight: 700, color: 'text.secondary', borderBottom: '1px solid', borderColor: 'divider' }}>
                              {h}
                            </Box>
                          ))}
                        </Box>
                      </Box>
                      <Box component="tbody">
                        {detailBill.charges.map((c) => (
                          <Box component="tr" key={c.id} sx={{ borderBottom: '1px solid', borderColor: 'divider', opacity: c.is_reversed ? 0.5 : 1 }}>
                            <Box component="td" sx={{ px: 1.5, py: 1 }}>{formatDate(c.service_date)}</Box>
                            <Box component="td" sx={{ px: 1.5, py: 1, textTransform: 'capitalize' }}>{c.charge_type.replace(/_/g, ' ')}</Box>
                            <Box component="td" sx={{ px: 1.5, py: 1 }}>
                              {c.description}
                              {c.is_reversed && <Chip size="small" label="Reversed" sx={{ ml: 1, height: 18 }} />}
                              {c.is_package_inclusive && <Chip size="small" color="info" label="In package" sx={{ ml: 1, height: 18 }} />}
                            </Box>
                            <Box component="td" sx={{ px: 1.5, py: 1 }}>{c.quantity}</Box>
                            <Box component="td" sx={{ px: 1.5, py: 1, fontVariantNumeric: 'tabular-nums' }}>{money(c.total)}</Box>
                            <Box component="td" sx={{ px: 1.5, py: 1 }}>
                              {!c.is_reversed && detailBill.status === 'open' && (
                                <IconButton size="small" aria-label="Reverse charge" onClick={() => handleReverse(c.id)}>
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              )}
                            </Box>
                          </Box>
                        ))}
                      </Box>
                    </Box>
                  </Box>
                </Stack>
              )}

              {detailTab === 1 && (
                <Stack spacing={1.5}>
                  <Button size="small" startIcon={<AddIcon />} onClick={() => setPaymentOpen(true)} sx={{ alignSelf: 'flex-start' }}>
                    Record Payment
                  </Button>
                  {detailBill.payments.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">No payments recorded yet.</Typography>
                  ) : (
                    detailBill.payments.map((p) => (
                      <Stack key={p.id} direction="row" justifyContent="space-between" sx={{ py: 0.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                        <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                          {p.payment_type} — {p.receipt_number}
                        </Typography>
                        <Typography variant="body2" fontWeight={600} sx={{ fontVariantNumeric: 'tabular-nums' }}>{money(p.amount)}</Typography>
                      </Stack>
                    ))
                  )}
                </Stack>
              )}

              {detailTab === 2 && (
                <Stack spacing={2}>
                  {detailBill.status === 'open' ? (
                    <TextField select fullWidth size="small" label="Package (optional)" value={detailBill.package_id || ''} onChange={(e) => handleSelectPackage(e.target.value)}>
                      <MenuItem value="">Itemized (no package)</MenuItem>
                      {packages.map((p) => (
                        <MenuItem key={p.id} value={p.id}>
                          {p.name} — {money(p.price)}
                        </MenuItem>
                      ))}
                    </TextField>
                  ) : (
                    <Typography variant="body2">{detailBill.package_name || 'Itemized (no package)'}</Typography>
                  )}
                </Stack>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDetailOpen(false)}>Close</Button>
          {detailBill?.status === 'open' && (
            <Button variant="contained" startIcon={<LockIcon />} onClick={handleFinalize}>
              Finalize Bill
            </Button>
          )}
          {detailBill?.status === 'finalized' && (
            <Button startIcon={<LockOpenIcon />} onClick={handleUnfinalize}>
              Re-open
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* ── Manual charge ─────────────────────────────────────────────── */}
      <Dialog open={chargeOpen} onClose={() => setChargeOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle fontWeight={700}>Add Manual Charge</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <TextField fullWidth required size="small" label="Description" value={chargeDraft.description} onChange={(e) => setChargeDraft((d) => ({ ...d, description: e.target.value }))} />
            <TextField select fullWidth size="small" label="Charge item (optional)" value={chargeDraft.product_id} onChange={(e) => setChargeDraft((d) => ({ ...d, product_id: e.target.value }))}>
              <MenuItem value="">None — enter a price manually</MenuItem>
              {products.map((p) => (
                <MenuItem key={p.id} value={p.id}>
                  {p.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField fullWidth size="small" type="number" label="Quantity" value={chargeDraft.quantity} onChange={(e) => setChargeDraft((d) => ({ ...d, quantity: e.target.value }))} />
            {!chargeDraft.product_id && (
              <TextField fullWidth size="small" type="number" label="Unit price (₹)" value={chargeDraft.unit_price} onChange={(e) => setChargeDraft((d) => ({ ...d, unit_price: e.target.value }))} />
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setChargeOpen(false)}>Cancel</Button>
          <Button variant="contained" disabled={chargeSubmitting} onClick={handlePostCharge}>
            {chargeSubmitting ? 'Posting…' : 'Post Charge'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Payment ───────────────────────────────────────────────────── */}
      <Dialog open={paymentOpen} onClose={() => setPaymentOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle fontWeight={700}>Record Payment</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <TextField select fullWidth size="small" label="Payment type" value={paymentDraft.payment_type} onChange={(e) => setPaymentDraft((d) => ({ ...d, payment_type: e.target.value }))}>
              {PAYMENT_TYPES.map((t) => (
                <MenuItem key={t} value={t} sx={{ textTransform: 'capitalize' }}>{t.replace(/_/g, ' ')}</MenuItem>
              ))}
            </TextField>
            <TextField select fullWidth size="small" label="Tender" value={paymentDraft.tender_type} onChange={(e) => setPaymentDraft((d) => ({ ...d, tender_type: e.target.value }))}>
              {TENDER_TYPES.map((t) => (
                <MenuItem key={t} value={t} sx={{ textTransform: 'capitalize' }}>{t.replace(/_/g, ' ')}</MenuItem>
              ))}
            </TextField>
            <TextField fullWidth required size="small" type="number" label="Amount (₹)" value={paymentDraft.amount} onChange={(e) => setPaymentDraft((d) => ({ ...d, amount: e.target.value }))} />
            <TextField fullWidth size="small" label="Reference (optional)" value={paymentDraft.reference} onChange={(e) => setPaymentDraft((d) => ({ ...d, reference: e.target.value }))} />
            <TextField fullWidth size="small" label="Notes (optional)" value={paymentDraft.notes} onChange={(e) => setPaymentDraft((d) => ({ ...d, notes: e.target.value }))} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setPaymentOpen(false)}>Cancel</Button>
          <Button variant="contained" disabled={paymentSubmitting} onClick={handleRecordPayment}>
            {paymentSubmitting ? 'Recording…' : 'Record Payment'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Packages management ──────────────────────────────────────── */}
      <Dialog open={packagesDialogOpen} onClose={() => setPackagesDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle fontWeight={700}>IPD Packages</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={1} mb={2}>
            {packages.map((p) => (
              <Stack key={p.id} direction="row" justifyContent="space-between" alignItems="center" sx={{ py: 0.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                <Box>
                  <Typography variant="body2" fontWeight={600}>{p.name}</Typography>
                  <Typography variant="caption" color="text.secondary">{money(p.price)} · {p.inclusions.length} inclusion(s)</Typography>
                </Box>
                <IconButton size="small" aria-label="Delete package" onClick={() => handleDeletePackage(p.id)}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Stack>
            ))}
            {packages.length === 0 && <Typography variant="body2" color="text.secondary">No packages yet.</Typography>}
          </Stack>
          <Divider sx={{ mb: 2 }} />
          <Stack spacing={2}>
            <Typography variant="subtitle2">New package</Typography>
            <TextField fullWidth size="small" label="Name" value={pkgDraft.name} onChange={(e) => setPkgDraft((d) => ({ ...d, name: e.target.value }))} />
            <TextField fullWidth size="small" label="Specialty (optional)" value={pkgDraft.specialty} onChange={(e) => setPkgDraft((d) => ({ ...d, specialty: e.target.value }))} />
            <TextField fullWidth size="small" type="number" label="Package price (₹)" value={pkgDraft.price} onChange={(e) => setPkgDraft((d) => ({ ...d, price: e.target.value }))} />
            <Box>
              <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>Inclusions</Typography>
              <Stack sx={{ maxHeight: 160, overflowY: 'auto' }}>
                {products.map((p) => (
                  <FormControlLabel
                    key={p.id}
                    control={<Checkbox checked={pkgDraft.inclusionIds.includes(p.id)} onChange={() => toggleInclusion(p.id)} />}
                    label={p.name}
                  />
                ))}
              </Stack>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setPackagesDialogOpen(false)}>Close</Button>
          <Button variant="contained" disabled={pkgSubmitting} onClick={handleCreatePackage}>
            {pkgSubmitting ? 'Creating…' : 'Create Package'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Settings ──────────────────────────────────────────────────── */}
      <Dialog open={settingsOpen} onClose={() => setSettingsOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle fontWeight={700}>Billing Settings</DialogTitle>
        <DialogContent dividers>
          {settingsDraft && (
            <Stack spacing={2}>
              <TextField select fullWidth size="small" label="Day boundary" value={settingsDraft.day_boundary_mode} onChange={(e) => setSettingsDraft((d) => ({ ...d, day_boundary_mode: e.target.value }))}>
                <MenuItem value="calendar_day">Calendar day (rolls at cutoff hour)</MenuItem>
                <MenuItem value="rolling_24h">Rolling 24h from admission</MenuItem>
              </TextField>
              <TextField fullWidth size="small" type="number" label="Discharge cutoff hour" value={settingsDraft.discharge_cutoff_hour} onChange={(e) => setSettingsDraft((d) => ({ ...d, discharge_cutoff_hour: e.target.value }))} />
              <FormControlLabel
                control={<Checkbox checked={settingsDraft.charge_admission_day} onChange={(e) => setSettingsDraft((d) => ({ ...d, charge_admission_day: e.target.checked }))} />}
                label="Charge the admission day"
              />
              <FormControlLabel
                control={<Checkbox checked={settingsDraft.charge_discharge_day} onChange={(e) => setSettingsDraft((d) => ({ ...d, charge_discharge_day: e.target.checked }))} />}
                label="Charge the discharge day"
              />
              <TextField select fullWidth size="small" label="Transfer-day rate policy" value={settingsDraft.transfer_day_rate_policy} onChange={(e) => setSettingsDraft((d) => ({ ...d, transfer_day_rate_policy: e.target.value }))}>
                <MenuItem value="higher_of">Higher of the two wards</MenuItem>
                <MenuItem value="new_ward">New ward</MenuItem>
                <MenuItem value="old_ward">Old ward</MenuItem>
              </TextField>
              <TextField select fullWidth size="small" label="Package excess policy" value={settingsDraft.package_excess_policy} onChange={(e) => setSettingsDraft((d) => ({ ...d, package_excess_policy: e.target.value }))}>
                <MenuItem value="bill_extra">Bill extras separately</MenuItem>
                <MenuItem value="absorb">Absorb into package</MenuItem>
              </TextField>
              <TextField fullWidth size="small" type="number" label="Default deposit (₹)" value={settingsDraft.default_deposit} onChange={(e) => setSettingsDraft((d) => ({ ...d, default_deposit: e.target.value }))} />
              <FormControlLabel
                control={<Checkbox checked={settingsDraft.auto_post_room_charges} onChange={(e) => setSettingsDraft((d) => ({ ...d, auto_post_room_charges: e.target.checked }))} />}
                label="Auto-post room/nursing charges"
              />
              <TextField select fullWidth size="small" label="Doctor visit charge item" value={settingsDraft.doctor_visit_charge_product_id || ''} onChange={(e) => setSettingsDraft((d) => ({ ...d, doctor_visit_charge_product_id: e.target.value }))}>
                <MenuItem value="">Not configured — no doctor-visit charges posted</MenuItem>
                {products.map((p) => (
                  <MenuItem key={p.id} value={p.id}>
                    {p.name}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setSettingsOpen(false)}>Cancel</Button>
          <Button variant="contained" disabled={settingsSubmitting || !settingsDraft} onClick={handleSaveSettings}>
            {settingsSubmitting ? 'Saving…' : 'Save Settings'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
