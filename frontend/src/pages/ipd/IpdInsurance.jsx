import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useApolloClient, gql } from '@apollo/client'
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  MenuItem,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material'
import Autocomplete from '@mui/material/Autocomplete'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CancelIcon from '@mui/icons-material/Cancel'
import LinkIcon from '@mui/icons-material/Link'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import PaymentsIcon from '@mui/icons-material/Payments'
import SendIcon from '@mui/icons-material/Send'
import { CLINICS_QUERY } from '../../graphql/queries'

// REQ179 (IPD slice 5) — TPA cashless: pre-authorization, mid-stay
// enhancement, claim reconciliation with line-level disallowance.
// Page-local gql, no existing contract to match. Desktop-dense tier
// (insurance-desk/front-desk surface, the IpdBilling.jsx precedent),
// verified at 1280/1440.

const ENHANCEMENT_FIELDS = `
  id sequence_no requested_amount approved_amount status bill_amount_at_request
  reason rejection_reason requested_by_name requested_at decided_at
`
const PREAUTH_FIELDS = `
  id clinic_id patient_id patient_name payer_id payer_name policy_id
  admission_id admission_number status requested_amount approved_amount
  authorized_total preauth_number valid_until rejection_reason notes
  requested_by_name requested_at decided_at
  diagnosis_codes { code description } procedure_codes { code description }
  enhancements { ${ENHANCEMENT_FIELDS} }
  created_at
`
const DEDUCTION_FIELDS = `id charge_id charge_description description deducted_amount created_at`
const CLAIM_FIELDS = `
  id clinic_id admission_id admission_number patient_name preauth_id
  payer_id payer_name policy_id status claimed_amount approved_amount
  total_deductions claim_number rejection_reason notes submitted_by_name
  submitted_at decided_at settled_at
  deductions { ${DEDUCTION_FIELDS} }
  created_at
`

const PREAUTHS_QUERY = gql`
  query IpdPreAuthsList($clinic_id: ID, $status: String) {
    preAuthorizations(clinic_id: $clinic_id, status: $status) { ${PREAUTH_FIELDS} }
  }
`
const CLAIMS_QUERY = gql`
  query IpdClaimsList($clinic_id: ID, $status: String) {
    ipdClaims(clinic_id: $clinic_id, status: $status) { ${CLAIM_FIELDS} }
  }
`
const PREAUTH_FOR_ADMISSION_QUERY = gql`
  query AdmissionPreAuth($admission_id: ID!) {
    admissionPreAuthorization(admission_id: $admission_id) { ${PREAUTH_FIELDS} }
  }
`
const PAYERS_QUERY = gql`
  query PayersForInsurance {
    payers(is_active: true) { id name payer_type }
  }
`
const SEARCH_PATIENTS_QUERY = gql`
  query PatientsForInsurance($search: String) {
    patients(search: $search, first: 15) { data { id full_name phone } }
  }
`
const CLINIC_ADMISSIONS_QUERY = gql`
  query AdmissionsForInsurance($clinic_id: ID) {
    admissions(filter: { clinic_id: $clinic_id, limit: 100 }) {
      id admission_number status patient { id full_name }
    }
  }
`

const CREATE_PREAUTH = gql`mutation CreatePreAuthorization($input: CreatePreAuthorizationInput!) { createPreAuthorization(input: $input) { id } }`
const UPDATE_PREAUTH_STATUS = gql`mutation UpdatePreAuthorizationStatus($id: ID!, $input: UpdatePreAuthorizationStatusInput!) { updatePreAuthorizationStatus(id: $id, input: $input) { id } }`
const BIND_PREAUTH = gql`mutation BindPreAuthorizationToAdmission($input: BindPreAuthorizationToAdmissionInput!) { bindPreAuthorizationToAdmission(input: $input) { id } }`
const REQUEST_ENHANCEMENT = gql`mutation RequestPreAuthEnhancement($input: RequestPreAuthEnhancementInput!) { requestPreAuthEnhancement(input: $input) { id } }`
const DECIDE_ENHANCEMENT = gql`mutation DecidePreAuthEnhancement($id: ID!, $input: DecidePreAuthEnhancementInput!) { decidePreAuthEnhancement(id: $id, input: $input) { id } }`
const CREATE_CLAIM = gql`mutation CreateIpdClaim($input: CreateIpdClaimInput!) { createIpdClaim(input: $input) { id } }`
const SUBMIT_CLAIM = gql`mutation SubmitIpdClaim($id: ID!) { submitIpdClaim(id: $id) { id } }`
const UPDATE_CLAIM_STATUS = gql`mutation UpdateIpdClaimStatus($id: ID!, $input: UpdateIpdClaimStatusInput!) { updateIpdClaimStatus(id: $id, input: $input) { id } }`
const SETTLE_CLAIM = gql`mutation SettleIpdClaim($id: ID!, $input: SettleIpdClaimInput!) { settleIpdClaim(id: $id, input: $input) { id status } }`
const ADD_DEDUCTION = gql`mutation AddIpdClaimDeduction($input: AddIpdClaimDeductionInput!) { addIpdClaimDeduction(input: $input) { id } }`
const REMOVE_DEDUCTION = gql`mutation RemoveIpdClaimDeduction($id: ID!) { removeIpdClaimDeduction(id: $id) { success userErrors { message } } }`
const CREATE_DOCUMENT = gql`mutation CreateIpdInsuranceDocument($input: CreateIpdInsuranceDocumentInput!) { createIpdInsuranceDocument(input: $input) { id document_type file_ref } }`

const TENDER_TYPES = ['cash', 'card', 'upi', 'cheque', 'bank_transfer', 'insurance']
const DOCUMENT_TYPES = ['preauth_form', 'discharge_summary', 'bill', 'payer_correspondence', 'id_proof', 'policy_copy', 'other']

const PREAUTH_STATUS_COLOR = { requested: 'warning', approved: 'success', rejected: 'error', expired: 'default', cancelled: 'default' }
const CLAIM_STATUS_COLOR = { draft: 'default', submitted: 'info', under_review: 'warning', approved: 'success', partially_approved: 'success', rejected: 'error', settled: 'success' }

function StatusChip({ status, colors }) {
  return <Chip size="small" label={status.replace(/_/g, ' ')} color={colors[status] || 'default'} sx={{ textTransform: 'capitalize' }} />
}
function money(v) {
  return `₹${Number(v ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function IpdInsurance() {
  const client = useApolloClient()
  const [searchParams, setSearchParams] = useSearchParams()

  const [clinics, setClinics] = useState([])
  const [clinicId, setClinicId] = useState('')
  const [tab, setTab] = useState(0)
  const [statusFilter, setStatusFilter] = useState('')
  const [preauths, setPreauths] = useState([])
  const [claims, setClaims] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)
  const [actionError, setActionError] = useState(null)
  const [payers, setPayers] = useState([])

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

  const loadPayers = useCallback(async () => {
    const { data } = await client.query({ query: PAYERS_QUERY, fetchPolicy: 'cache-first' })
    setPayers(data?.payers ?? [])
  }, [client])

  const loadList = useCallback(async () => {
    if (!clinicId) return
    setLoading(true)
    setLoadError(null)
    try {
      if (tab === 0) {
        const { data, errors } = await client.query({ query: PREAUTHS_QUERY, variables: { clinic_id: clinicId, status: statusFilter || undefined }, fetchPolicy: 'network-only' })
        if (errors?.length) throw new Error(errors[0].message)
        setPreauths(data?.preAuthorizations ?? [])
      } else {
        const { data, errors } = await client.query({ query: CLAIMS_QUERY, variables: { clinic_id: clinicId, status: statusFilter || undefined }, fetchPolicy: 'network-only' })
        if (errors?.length) throw new Error(errors[0].message)
        setClaims(data?.ipdClaims ?? [])
      }
    } catch (err) {
      setLoadError(err.message)
    } finally {
      setLoading(false)
    }
  }, [client, clinicId, tab, statusFilter])

  useEffect(() => {
    loadClinics()
    loadPayers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => {
    if (clinicId) loadList()
  }, [clinicId, tab, statusFilter, loadList])

  // ── Pre-auth detail ──────────────────────────────────────────────────
  const [preauthDetailOpen, setPreauthDetailOpen] = useState(false)
  const [preauthDetail, setPreauthDetail] = useState(null)

  const openPreauthDetail = async (id) => {
    setPreauthDetailOpen(true)
    const found = preauths.find((p) => p.id === id)
    setPreauthDetail(found ?? null)
  }
  const refreshPreauthDetail = async () => {
    await loadList()
  }
  useEffect(() => {
    if (preauthDetailOpen && preauthDetail) {
      const updated = preauths.find((p) => p.id === preauthDetail.id)
      if (updated) setPreauthDetail(updated)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preauths])

  // Deep-link from the admissions detail dialog's own "Insurance" action.
  useEffect(() => {
    const admissionParam = searchParams.get('admission')
    if (admissionParam && clinicId) {
      client
        .query({ query: PREAUTH_FOR_ADMISSION_QUERY, variables: { admission_id: admissionParam }, fetchPolicy: 'network-only' })
        .then(({ data }) => {
          if (data?.admissionPreAuthorization) {
            setTab(0)
            setPreauthDetailOpen(true)
            setPreauthDetail(data.admissionPreAuthorization)
          }
        })
        .catch(() => {})
      searchParams.delete('admission')
      setSearchParams(searchParams)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clinicId])

  // ── New pre-auth ─────────────────────────────────────────────────────
  const [newPreauthOpen, setNewPreauthOpen] = useState(false)
  const [preauthDraft, setPreauthDraft] = useState({ patient: null, payer_id: '', requested_amount: '', notes: '' })
  const [patientOptions, setPatientOptions] = useState([])
  const [patientSearching, setPatientSearching] = useState(false)
  const [preauthSubmitting, setPreauthSubmitting] = useState(false)

  const searchPatients = async (search) => {
    if (!search || search.length < 2) return
    setPatientSearching(true)
    try {
      const { data } = await client.query({ query: SEARCH_PATIENTS_QUERY, variables: { search }, fetchPolicy: 'network-only' })
      setPatientOptions(data?.patients?.data ?? [])
    } finally {
      setPatientSearching(false)
    }
  }

  const handleCreatePreauth = async () => {
    if (!preauthDraft.patient || !preauthDraft.payer_id || !preauthDraft.requested_amount) {
      setActionError('Select a patient, a payer, and enter the requested amount.')
      return
    }
    setPreauthSubmitting(true)
    try {
      await client.mutate({
        mutation: CREATE_PREAUTH,
        variables: { input: { patient_id: preauthDraft.patient.id, clinic_id: clinicId, payer_id: preauthDraft.payer_id, requested_amount: Number(preauthDraft.requested_amount), notes: preauthDraft.notes || undefined } },
      })
      showSuccess('Pre-authorization requested.')
      setNewPreauthOpen(false)
      setPreauthDraft({ patient: null, payer_id: '', requested_amount: '', notes: '' })
      await loadList()
    } catch (err) {
      setActionError(err.message)
    } finally {
      setPreauthSubmitting(false)
    }
  }

  // ── Pre-auth decisions ───────────────────────────────────────────────
  const handleDecidePreauth = async (status) => {
    if (status === 'approved') {
      const amount = window.prompt('Approved amount (₹)?')
      if (!amount) return
      try {
        await client.mutate({ mutation: UPDATE_PREAUTH_STATUS, variables: { id: preauthDetail.id, input: { status: 'approved', approved_amount: Number(amount) } } })
        showSuccess('Pre-authorization approved.')
        await refreshPreauthDetail()
      } catch (err) {
        setActionError(err.message)
      }
    } else {
      const reason = window.prompt('Reason for rejecting this pre-authorization?')
      if (!reason) return
      try {
        await client.mutate({ mutation: UPDATE_PREAUTH_STATUS, variables: { id: preauthDetail.id, input: { status: 'rejected', rejection_reason: reason } } })
        showSuccess('Pre-authorization rejected.')
        await refreshPreauthDetail()
      } catch (err) {
        setActionError(err.message)
      }
    }
  }

  // ── Bind to admission ────────────────────────────────────────────────
  const [bindOpen, setBindOpen] = useState(false)
  const [bindAdmissions, setBindAdmissions] = useState([])
  const [bindAdmissionId, setBindAdmissionId] = useState('')
  const [bindSubmitting, setBindSubmitting] = useState(false)

  const openBindDialog = async () => {
    const { data } = await client.query({ query: CLINIC_ADMISSIONS_QUERY, variables: { clinic_id: clinicId }, fetchPolicy: 'network-only' })
    setBindAdmissions((data?.admissions ?? []).filter((a) => a.patient?.id === preauthDetail.patient_id))
    setBindAdmissionId('')
    setBindOpen(true)
  }
  const handleBind = async () => {
    if (!bindAdmissionId) return
    setBindSubmitting(true)
    try {
      await client.mutate({ mutation: BIND_PREAUTH, variables: { input: { preauth_id: preauthDetail.id, admission_id: bindAdmissionId } } })
      showSuccess('Pre-authorization bound to the admission.')
      setBindOpen(false)
      await refreshPreauthDetail()
    } catch (err) {
      setActionError(err.message)
    } finally {
      setBindSubmitting(false)
    }
  }

  // ── Enhancements ──────────────────────────────────────────────────────
  const [enhanceOpen, setEnhanceOpen] = useState(false)
  const [enhanceDraft, setEnhanceDraft] = useState({ requested_amount: '', reason: '' })
  const [enhanceSubmitting, setEnhanceSubmitting] = useState(false)

  const handleRequestEnhancement = async () => {
    if (!enhanceDraft.requested_amount || !enhanceDraft.reason.trim()) {
      setActionError('Enter a requested amount and a reason.')
      return
    }
    setEnhanceSubmitting(true)
    try {
      await client.mutate({ mutation: REQUEST_ENHANCEMENT, variables: { input: { preauth_id: preauthDetail.id, requested_amount: Number(enhanceDraft.requested_amount), reason: enhanceDraft.reason.trim() } } })
      showSuccess('Enhancement requested.')
      setEnhanceOpen(false)
      setEnhanceDraft({ requested_amount: '', reason: '' })
      await refreshPreauthDetail()
    } catch (err) {
      setActionError(err.message)
    } finally {
      setEnhanceSubmitting(false)
    }
  }
  const handleDecideEnhancement = async (id, status) => {
    if (status === 'approved') {
      const amount = window.prompt('Approved amount (₹)?')
      if (!amount) return
      try {
        await client.mutate({ mutation: DECIDE_ENHANCEMENT, variables: { id, input: { status: 'approved', approved_amount: Number(amount) } } })
        showSuccess('Enhancement approved.')
        await refreshPreauthDetail()
      } catch (err) {
        setActionError(err.message)
      }
    } else {
      const reason = window.prompt('Reason for rejecting this enhancement?')
      if (!reason) return
      try {
        await client.mutate({ mutation: DECIDE_ENHANCEMENT, variables: { id, input: { status: 'rejected', rejection_reason: reason } } })
        showSuccess('Enhancement rejected.')
        await refreshPreauthDetail()
      } catch (err) {
        setActionError(err.message)
      }
    }
  }

  // ── Claim detail ──────────────────────────────────────────────────────
  const [claimDetailOpen, setClaimDetailOpen] = useState(false)
  const [claimDetail, setClaimDetail] = useState(null)
  const openClaimDetail = (id) => {
    setClaimDetailOpen(true)
    setClaimDetail(claims.find((c) => c.id === id) ?? null)
  }
  const refreshClaimDetail = async () => {
    await loadList()
  }
  useEffect(() => {
    if (claimDetailOpen && claimDetail) {
      const updated = claims.find((c) => c.id === claimDetail.id)
      if (updated) setClaimDetail(updated)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claims])

  // ── New claim ─────────────────────────────────────────────────────────
  const [newClaimOpen, setNewClaimOpen] = useState(false)
  const [claimAdmissions, setClaimAdmissions] = useState([])
  const [claimDraft, setClaimDraft] = useState({ admission_id: '', payer_id: '', claimed_amount: '' })
  const [claimSubmitting, setClaimSubmitting] = useState(false)

  const openNewClaim = async () => {
    const { data } = await client.query({ query: CLINIC_ADMISSIONS_QUERY, variables: { clinic_id: clinicId }, fetchPolicy: 'network-only' })
    setClaimAdmissions(data?.admissions ?? [])
    setClaimDraft({ admission_id: '', payer_id: '', claimed_amount: '' })
    setNewClaimOpen(true)
  }
  const handleCreateClaim = async () => {
    if (!claimDraft.admission_id || !claimDraft.claimed_amount) {
      setActionError('Select an admission and enter the claimed amount.')
      return
    }
    setClaimSubmitting(true)
    try {
      await client.mutate({
        mutation: CREATE_CLAIM,
        variables: { input: { admission_id: claimDraft.admission_id, payer_id: claimDraft.payer_id || undefined, claimed_amount: Number(claimDraft.claimed_amount) } },
      })
      showSuccess('Claim created.')
      setNewClaimOpen(false)
      await loadList()
    } catch (err) {
      setActionError(err.message)
    } finally {
      setClaimSubmitting(false)
    }
  }

  const handleSubmitClaim = async () => {
    try {
      await client.mutate({ mutation: SUBMIT_CLAIM, variables: { id: claimDetail.id } })
      showSuccess('Claim submitted.')
      await refreshClaimDetail()
    } catch (err) {
      setActionError(err.message)
    }
  }
  const handleClaimStatus = async (status) => {
    if (status === 'rejected') {
      const reason = window.prompt('Reason for rejecting this claim?')
      if (!reason) return
      try {
        await client.mutate({ mutation: UPDATE_CLAIM_STATUS, variables: { id: claimDetail.id, input: { status: 'rejected', rejection_reason: reason } } })
        showSuccess('Claim rejected.')
        await refreshClaimDetail()
      } catch (err) {
        setActionError(err.message)
      }
      return
    }
    const label = status === 'approved' ? 'Approved' : status === 'partially_approved' ? 'Partially approved' : 'Under-review'
    if (status === 'under_review') {
      try {
        await client.mutate({ mutation: UPDATE_CLAIM_STATUS, variables: { id: claimDetail.id, input: { status: 'under_review' } } })
        showSuccess('Claim moved to under review.')
        await refreshClaimDetail()
      } catch (err) {
        setActionError(err.message)
      }
      return
    }
    const amount = window.prompt(`${label} amount (₹)?`)
    if (!amount) return
    try {
      await client.mutate({ mutation: UPDATE_CLAIM_STATUS, variables: { id: claimDetail.id, input: { status, approved_amount: Number(amount) } } })
      showSuccess(`Claim ${label.toLowerCase()}.`)
      await refreshClaimDetail()
    } catch (err) {
      setActionError(err.message)
    }
  }

  // ── Deductions ────────────────────────────────────────────────────────
  const [deductionOpen, setDeductionOpen] = useState(false)
  const [deductionDraft, setDeductionDraft] = useState({ description: '', deducted_amount: '' })
  const [deductionSubmitting, setDeductionSubmitting] = useState(false)

  const handleAddDeduction = async () => {
    if (!deductionDraft.description.trim() || !deductionDraft.deducted_amount) {
      setActionError('Enter a description and an amount.')
      return
    }
    setDeductionSubmitting(true)
    try {
      await client.mutate({ mutation: ADD_DEDUCTION, variables: { input: { claim_id: claimDetail.id, description: deductionDraft.description.trim(), deducted_amount: Number(deductionDraft.deducted_amount) } } })
      showSuccess('Deduction added.')
      setDeductionOpen(false)
      setDeductionDraft({ description: '', deducted_amount: '' })
      await refreshClaimDetail()
    } catch (err) {
      setActionError(err.message)
    } finally {
      setDeductionSubmitting(false)
    }
  }
  const handleRemoveDeduction = async (id) => {
    try {
      const { data } = await client.mutate({ mutation: REMOVE_DEDUCTION, variables: { id } })
      if (!data.removeIpdClaimDeduction.success) throw new Error(data.removeIpdClaimDeduction.userErrors?.[0]?.message || 'Failed to remove')
      showSuccess('Deduction removed.')
      await refreshClaimDetail()
    } catch (err) {
      setActionError(err.message)
    }
  }

  // ── Settle claim ──────────────────────────────────────────────────────
  const [settleOpen, setSettleOpen] = useState(false)
  const [settleDraft, setSettleDraft] = useState({ tender_type: 'bank_transfer', amount: '', reference: '', notes: '' })
  const [settleSubmitting, setSettleSubmitting] = useState(false)

  const handleSettle = async () => {
    if (!settleDraft.amount) {
      setActionError('Enter the settlement amount.')
      return
    }
    setSettleSubmitting(true)
    try {
      await client.mutate({
        mutation: SETTLE_CLAIM,
        variables: {
          id: claimDetail.id,
          input: { tenders: [{ tender_type: settleDraft.tender_type, amount: Number(settleDraft.amount), reference: settleDraft.reference || undefined }], notes: settleDraft.notes || undefined },
        },
      })
      showSuccess('Claim settled.')
      setSettleOpen(false)
      setSettleDraft({ tender_type: 'bank_transfer', amount: '', reference: '', notes: '' })
      await refreshClaimDetail()
    } catch (err) {
      setActionError(err.message)
    } finally {
      setSettleSubmitting(false)
    }
  }

  // ── Documents (shared by pre-auth and claim detail dialogs) ───────────
  const uploadDocument = async ({ preauthId, claimId, documentType }) => {
    return new Promise((resolve) => {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = 'image/png,image/jpeg,application/pdf'
      input.onchange = async () => {
        const file = input.files?.[0]
        if (!file) return resolve(false)
        try {
          // Matches messages/index.jsx's own uploadStagedAttachment --
          // the httpOnly session cookie (credentials: 'include') is the
          // real auth here, not a header; see
          // ipd-insurance-attachments.controller.ts's own bearer-fallback
          // note.
          const apiBase = (import.meta.env.VITE_GRAPHQL_URL || 'http://localhost:4000/graphql').replace(/\/graphql$/, '')
          const form = new FormData()
          form.append('file', file)
          const uploadRes = await fetch(`${apiBase}/ipd-insurance-documents/upload`, {
            method: 'POST',
            credentials: 'include',
            body: form,
          })
          const uploaded = await uploadRes.json()
          if (!uploadRes.ok || !uploaded.file_ref) throw new Error(uploaded.message || 'Failed to upload document')
          await client.mutate({
            mutation: CREATE_DOCUMENT,
            variables: { input: { preauth_id: preauthId, claim_id: claimId, document_type: documentType, file_ref: uploaded.file_ref, mime_type: uploaded.mime_type } },
          })
          showSuccess('Document uploaded.')
          resolve(true)
        } catch (err) {
          setActionError(err.message)
          resolve(false)
        }
      }
      input.click()
    })
  }
  const [docType, setDocType] = useState('other')

  if (loading && preauths.length === 0 && claims.length === 0)
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
            IPD Insurance
          </Typography>
          <Typography variant="body2" color="text.secondary">
            TPA cashless — pre-authorization, enhancement, claim reconciliation
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
          <TextField select size="small" label="Status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} sx={{ minWidth: 150 }}>
            <MenuItem value="">All</MenuItem>
            {(tab === 0 ? ['requested', 'approved', 'rejected', 'expired', 'cancelled'] : ['draft', 'submitted', 'under_review', 'approved', 'partially_approved', 'rejected', 'settled']).map((s) => (
              <MenuItem key={s} value={s} sx={{ textTransform: 'capitalize' }}>
                {s.replace(/_/g, ' ')}
              </MenuItem>
            ))}
          </TextField>
          {tab === 0 ? (
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setNewPreauthOpen(true)}>
              New Pre-Auth
            </Button>
          ) : (
            <Button variant="contained" startIcon={<AddIcon />} onClick={openNewClaim}>
              New Claim
            </Button>
          )}
        </Stack>
      </Stack>

      <Tabs value={tab} onChange={(_e, v) => { setTab(v); setStatusFilter('') }} sx={{ mb: 2 }}>
        <Tab label="Pre-Authorizations" />
        <Tab label="Claims" />
      </Tabs>

      {loadError && (
        <Alert severity="warning" sx={{ mb: 2 }} action={<Button size="small" onClick={loadList}>Retry</Button>}>
          Failed to load: {loadError}
        </Alert>
      )}
      {successMsg && <Alert severity="success" sx={{ mb: 2 }}>{successMsg}</Alert>}
      {actionError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setActionError(null)}>
          {actionError}
        </Alert>
      )}

      {tab === 0 ? (
        <Card>
          <Box sx={{ overflowX: 'auto' }}>
            <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
              <Box component="thead">
                <Box component="tr" sx={{ bgcolor: 'grey.50' }}>
                  {['Patient', 'Payer', 'Status', 'Requested', 'Approved', 'Authorized', 'Admission #'].map((h) => (
                    <Box key={h} component="th" sx={{ px: 2, py: 1.5, textAlign: 'left', typography: 'caption', fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid', borderColor: 'divider' }}>
                      {h}
                    </Box>
                  ))}
                </Box>
              </Box>
              <Box component="tbody">
                {preauths.length === 0 && (
                  <Box component="tr">
                    <Box component="td" colSpan={7} sx={{ textAlign: 'center', py: 6 }}>
                      <Typography color="text.secondary">No pre-authorizations match this filter</Typography>
                    </Box>
                  </Box>
                )}
                {preauths.map((p) => (
                  <Box component="tr" key={p.id} onClick={() => openPreauthDetail(p.id)} sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'grey.50' }, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Box component="td" sx={{ px: 2, py: 1.5 }}>{p.patient_name}</Box>
                    <Box component="td" sx={{ px: 2, py: 1.5 }}>{p.payer_name}</Box>
                    <Box component="td" sx={{ px: 2, py: 1.5 }}><StatusChip status={p.status} colors={PREAUTH_STATUS_COLOR} /></Box>
                    <Box component="td" sx={{ px: 2, py: 1.5, fontVariantNumeric: 'tabular-nums' }}>{money(p.requested_amount)}</Box>
                    <Box component="td" sx={{ px: 2, py: 1.5, fontVariantNumeric: 'tabular-nums' }}>{p.approved_amount != null ? money(p.approved_amount) : '—'}</Box>
                    <Box component="td" sx={{ px: 2, py: 1.5, fontVariantNumeric: 'tabular-nums' }}>{money(p.authorized_total)}</Box>
                    <Box component="td" sx={{ px: 2, py: 1.5 }}>{p.admission_number || '—'}</Box>
                  </Box>
                ))}
              </Box>
            </Box>
          </Box>
        </Card>
      ) : (
        <Card>
          <Box sx={{ overflowX: 'auto' }}>
            <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
              <Box component="thead">
                <Box component="tr" sx={{ bgcolor: 'grey.50' }}>
                  {['Patient', 'Admission #', 'Payer', 'Status', 'Claimed', 'Approved', 'Deductions'].map((h) => (
                    <Box key={h} component="th" sx={{ px: 2, py: 1.5, textAlign: 'left', typography: 'caption', fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid', borderColor: 'divider' }}>
                      {h}
                    </Box>
                  ))}
                </Box>
              </Box>
              <Box component="tbody">
                {claims.length === 0 && (
                  <Box component="tr">
                    <Box component="td" colSpan={7} sx={{ textAlign: 'center', py: 6 }}>
                      <Typography color="text.secondary">No claims match this filter</Typography>
                    </Box>
                  </Box>
                )}
                {claims.map((c) => (
                  <Box component="tr" key={c.id} onClick={() => openClaimDetail(c.id)} sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'grey.50' }, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Box component="td" sx={{ px: 2, py: 1.5 }}>{c.patient_name}</Box>
                    <Box component="td" sx={{ px: 2, py: 1.5 }}>{c.admission_number}</Box>
                    <Box component="td" sx={{ px: 2, py: 1.5 }}>{c.payer_name}</Box>
                    <Box component="td" sx={{ px: 2, py: 1.5 }}><StatusChip status={c.status} colors={CLAIM_STATUS_COLOR} /></Box>
                    <Box component="td" sx={{ px: 2, py: 1.5, fontVariantNumeric: 'tabular-nums' }}>{money(c.claimed_amount)}</Box>
                    <Box component="td" sx={{ px: 2, py: 1.5, fontVariantNumeric: 'tabular-nums' }}>{c.approved_amount != null ? money(c.approved_amount) : '—'}</Box>
                    <Box component="td" sx={{ px: 2, py: 1.5, fontVariantNumeric: 'tabular-nums' }}>{money(c.total_deductions)}</Box>
                  </Box>
                ))}
              </Box>
            </Box>
          </Box>
        </Card>
      )}

      {/* ── New pre-auth ──────────────────────────────────────────────── */}
      <Dialog open={newPreauthOpen} onClose={() => setNewPreauthOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle fontWeight={700}>New Pre-Authorization</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Autocomplete
              options={patientOptions}
              getOptionLabel={(o) => `${o.full_name}${o.phone ? ` (${o.phone})` : ''}`}
              loading={patientSearching}
              value={preauthDraft.patient}
              onChange={(_e, v) => setPreauthDraft((d) => ({ ...d, patient: v }))}
              onInputChange={(_e, v) => searchPatients(v)}
              renderInput={(params) => <TextField {...params} label="Patient" required size="small" />}
            />
            <TextField select fullWidth required size="small" label="Payer" value={preauthDraft.payer_id} onChange={(e) => setPreauthDraft((d) => ({ ...d, payer_id: e.target.value }))}>
              {payers.map((p) => (
                <MenuItem key={p.id} value={p.id}>
                  {p.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField fullWidth required size="small" type="number" label="Requested amount (₹)" value={preauthDraft.requested_amount} onChange={(e) => setPreauthDraft((d) => ({ ...d, requested_amount: e.target.value }))} />
            <TextField fullWidth size="small" label="Notes (optional)" value={preauthDraft.notes} onChange={(e) => setPreauthDraft((d) => ({ ...d, notes: e.target.value }))} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setNewPreauthOpen(false)}>Cancel</Button>
          <Button variant="contained" disabled={preauthSubmitting} onClick={handleCreatePreauth}>
            {preauthSubmitting ? 'Requesting…' : 'Request Pre-Auth'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Pre-auth detail ───────────────────────────────────────────── */}
      <Dialog open={preauthDetailOpen} onClose={() => setPreauthDetailOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle fontWeight={700}>
          {preauthDetail?.patient_name} — {preauthDetail?.payer_name}
        </DialogTitle>
        <DialogContent dividers>
          {preauthDetail && (
            <Stack spacing={2}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
                <StatusChip status={preauthDetail.status} colors={PREAUTH_STATUS_COLOR} />
                {preauthDetail.preauth_number && <Typography variant="body2">{preauthDetail.preauth_number}</Typography>}
              </Stack>
              <Grid container spacing={1.5}>
                {[
                  ['Requested', money(preauthDetail.requested_amount)],
                  ['Approved', preauthDetail.approved_amount != null ? money(preauthDetail.approved_amount) : '—'],
                  ['Authorized total', money(preauthDetail.authorized_total)],
                  ['Admission', preauthDetail.admission_number || 'Not yet bound'],
                ].map(([label, value]) => (
                  <Grid item xs={6} sm={3} key={label}>
                    <Typography variant="caption" color="text.secondary" display="block">{label}</Typography>
                    <Typography variant="body2" fontWeight={600}>{value}</Typography>
                  </Grid>
                ))}
              </Grid>
              {preauthDetail.rejection_reason && <Alert severity="error">{preauthDetail.rejection_reason}</Alert>}
              <Divider />

              {preauthDetail.status === 'requested' && (
                <Stack direction="row" spacing={1}>
                  <Button size="small" color="success" startIcon={<CheckCircleIcon />} onClick={() => handleDecidePreauth('approved')}>
                    Approve
                  </Button>
                  <Button size="small" color="error" startIcon={<CancelIcon />} onClick={() => handleDecidePreauth('rejected')}>
                    Reject
                  </Button>
                </Stack>
              )}
              {preauthDetail.status === 'approved' && !preauthDetail.admission_id && (
                <Button size="small" startIcon={<LinkIcon />} onClick={openBindDialog} sx={{ alignSelf: 'flex-start' }}>
                  Bind to Admission
                </Button>
              )}

              <Typography variant="subtitle2">Enhancements</Typography>
              {preauthDetail.status === 'approved' && preauthDetail.admission_id && (
                <Button size="small" startIcon={<AddIcon />} onClick={() => setEnhanceOpen(true)} sx={{ alignSelf: 'flex-start' }}>
                  Request Enhancement
                </Button>
              )}
              {(preauthDetail.enhancements ?? []).length === 0 ? (
                <Typography variant="body2" color="text.secondary">No enhancements requested yet.</Typography>
              ) : (
                <Stack spacing={1}>
                  {preauthDetail.enhancements.map((e) => (
                    <Stack key={e.id} direction="row" justifyContent="space-between" alignItems="center" sx={{ py: 0.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                      <Box>
                        <Typography variant="body2">
                          #{e.sequence_no} — {money(e.requested_amount)} ({e.reason})
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Bill at request: {money(e.bill_amount_at_request)} · <StatusChip status={e.status} colors={PREAUTH_STATUS_COLOR} />
                        </Typography>
                      </Box>
                      {e.status === 'requested' && (
                        <Stack direction="row" spacing={0.5}>
                          <IconButton size="small" color="success" aria-label="Approve enhancement" onClick={() => handleDecideEnhancement(e.id, 'approved')}>
                            <CheckCircleIcon fontSize="small" />
                          </IconButton>
                          <IconButton size="small" color="error" aria-label="Reject enhancement" onClick={() => handleDecideEnhancement(e.id, 'rejected')}>
                            <CancelIcon fontSize="small" />
                          </IconButton>
                        </Stack>
                      )}
                    </Stack>
                  ))}
                </Stack>
              )}

              <Divider />
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="subtitle2">Documents</Typography>
                <Stack direction="row" spacing={1} alignItems="center">
                  <TextField select size="small" value={docType} onChange={(e) => setDocType(e.target.value)} sx={{ minWidth: 160 }}>
                    {DOCUMENT_TYPES.map((t) => (
                      <MenuItem key={t} value={t} sx={{ textTransform: 'capitalize' }}>{t.replace(/_/g, ' ')}</MenuItem>
                    ))}
                  </TextField>
                  <Button size="small" startIcon={<UploadFileIcon />} onClick={() => uploadDocument({ preauthId: preauthDetail.id, documentType: docType })}>
                    Upload
                  </Button>
                </Stack>
              </Stack>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setPreauthDetailOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* ── Bind dialog ───────────────────────────────────────────────── */}
      <Dialog open={bindOpen} onClose={() => setBindOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle fontWeight={700}>Bind to Admission</DialogTitle>
        <DialogContent dividers>
          <TextField select fullWidth size="small" label="Admission" value={bindAdmissionId} onChange={(e) => setBindAdmissionId(e.target.value)}>
            {bindAdmissions.length === 0 && <MenuItem value="" disabled>No admissions found for this patient</MenuItem>}
            {bindAdmissions.map((a) => (
              <MenuItem key={a.id} value={a.id}>
                {a.admission_number} ({a.status})
              </MenuItem>
            ))}
          </TextField>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setBindOpen(false)}>Cancel</Button>
          <Button variant="contained" disabled={bindSubmitting || !bindAdmissionId} onClick={handleBind}>
            {bindSubmitting ? 'Binding…' : 'Bind'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Enhancement dialog ────────────────────────────────────────── */}
      <Dialog open={enhanceOpen} onClose={() => setEnhanceOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle fontWeight={700}>Request Enhancement</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <TextField fullWidth required size="small" type="number" label="Requested amount (₹)" value={enhanceDraft.requested_amount} onChange={(e) => setEnhanceDraft((d) => ({ ...d, requested_amount: e.target.value }))} />
            <TextField fullWidth required size="small" label="Reason" value={enhanceDraft.reason} onChange={(e) => setEnhanceDraft((d) => ({ ...d, reason: e.target.value }))} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setEnhanceOpen(false)}>Cancel</Button>
          <Button variant="contained" disabled={enhanceSubmitting} onClick={handleRequestEnhancement}>
            {enhanceSubmitting ? 'Requesting…' : 'Request'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── New claim ─────────────────────────────────────────────────── */}
      <Dialog open={newClaimOpen} onClose={() => setNewClaimOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle fontWeight={700}>New Claim</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <TextField select fullWidth required size="small" label="Admission" value={claimDraft.admission_id} onChange={(e) => setClaimDraft((d) => ({ ...d, admission_id: e.target.value }))}>
              {claimAdmissions.map((a) => (
                <MenuItem key={a.id} value={a.id}>
                  {a.admission_number} — {a.patient?.full_name}
                </MenuItem>
              ))}
            </TextField>
            <TextField select fullWidth size="small" label="Payer (optional override)" value={claimDraft.payer_id} onChange={(e) => setClaimDraft((d) => ({ ...d, payer_id: e.target.value }))}>
              <MenuItem value="">Use the admission's own payer</MenuItem>
              {payers.map((p) => (
                <MenuItem key={p.id} value={p.id}>
                  {p.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField fullWidth required size="small" type="number" label="Claimed amount (₹)" value={claimDraft.claimed_amount} onChange={(e) => setClaimDraft((d) => ({ ...d, claimed_amount: e.target.value }))} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setNewClaimOpen(false)}>Cancel</Button>
          <Button variant="contained" disabled={claimSubmitting} onClick={handleCreateClaim}>
            {claimSubmitting ? 'Creating…' : 'Create Claim'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Claim detail ──────────────────────────────────────────────── */}
      <Dialog open={claimDetailOpen} onClose={() => setClaimDetailOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle fontWeight={700}>
          {claimDetail?.patient_name} — {claimDetail?.admission_number}
        </DialogTitle>
        <DialogContent dividers>
          {claimDetail && (
            <Stack spacing={2}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
                <StatusChip status={claimDetail.status} colors={CLAIM_STATUS_COLOR} />
                {claimDetail.claim_number && <Typography variant="body2">{claimDetail.claim_number}</Typography>}
              </Stack>
              <Grid container spacing={1.5}>
                {[
                  ['Claimed', money(claimDetail.claimed_amount)],
                  ['Approved', claimDetail.approved_amount != null ? money(claimDetail.approved_amount) : '—'],
                  ['Deductions', money(claimDetail.total_deductions)],
                  ['Payer', claimDetail.payer_name],
                ].map(([label, value]) => (
                  <Grid item xs={6} sm={3} key={label}>
                    <Typography variant="caption" color="text.secondary" display="block">{label}</Typography>
                    <Typography variant="body2" fontWeight={600}>{value}</Typography>
                  </Grid>
                ))}
              </Grid>
              {claimDetail.rejection_reason && <Alert severity="error">{claimDetail.rejection_reason}</Alert>}
              <Divider />

              <Stack direction="row" spacing={1} flexWrap="wrap">
                {claimDetail.status === 'draft' && (
                  <Button size="small" startIcon={<SendIcon />} onClick={handleSubmitClaim}>
                    Submit
                  </Button>
                )}
                {claimDetail.status === 'submitted' && (
                  <Button size="small" onClick={() => handleClaimStatus('under_review')}>
                    Move to Under Review
                  </Button>
                )}
                {claimDetail.status === 'under_review' && (
                  <>
                    <Button size="small" color="success" startIcon={<CheckCircleIcon />} onClick={() => handleClaimStatus('approved')}>
                      Approve
                    </Button>
                    <Button size="small" color="success" onClick={() => handleClaimStatus('partially_approved')}>
                      Partially Approve
                    </Button>
                    <Button size="small" color="error" startIcon={<CancelIcon />} onClick={() => handleClaimStatus('rejected')}>
                      Reject
                    </Button>
                  </>
                )}
                {(claimDetail.status === 'approved' || claimDetail.status === 'partially_approved') && (
                  <Button size="small" startIcon={<PaymentsIcon />} onClick={() => setSettleOpen(true)}>
                    Settle
                  </Button>
                )}
              </Stack>

              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="subtitle2">Deductions</Typography>
                {claimDetail.status !== 'settled' && (
                  <Button size="small" startIcon={<AddIcon />} onClick={() => setDeductionOpen(true)}>
                    Add Deduction
                  </Button>
                )}
              </Stack>
              {(claimDetail.deductions ?? []).length === 0 ? (
                <Typography variant="body2" color="text.secondary">No deductions recorded.</Typography>
              ) : (
                <Stack spacing={1}>
                  {claimDetail.deductions.map((d) => (
                    <Stack key={d.id} direction="row" justifyContent="space-between" alignItems="center" sx={{ py: 0.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                      <Box>
                        <Typography variant="body2">{d.description}</Typography>
                        {d.charge_description && <Typography variant="caption" color="text.secondary">Against: {d.charge_description}</Typography>}
                      </Box>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="body2" fontWeight={600}>{money(d.deducted_amount)}</Typography>
                        {claimDetail.status !== 'settled' && (
                          <IconButton size="small" aria-label="Remove deduction" onClick={() => handleRemoveDeduction(d.id)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        )}
                      </Stack>
                    </Stack>
                  ))}
                </Stack>
              )}

              <Divider />
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="subtitle2">Documents</Typography>
                <Stack direction="row" spacing={1} alignItems="center">
                  <TextField select size="small" value={docType} onChange={(e) => setDocType(e.target.value)} sx={{ minWidth: 160 }}>
                    {DOCUMENT_TYPES.map((t) => (
                      <MenuItem key={t} value={t} sx={{ textTransform: 'capitalize' }}>{t.replace(/_/g, ' ')}</MenuItem>
                    ))}
                  </TextField>
                  <Button size="small" startIcon={<UploadFileIcon />} onClick={() => uploadDocument({ claimId: claimDetail.id, documentType: docType })}>
                    Upload
                  </Button>
                </Stack>
              </Stack>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setClaimDetailOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* ── Add deduction ─────────────────────────────────────────────── */}
      <Dialog open={deductionOpen} onClose={() => setDeductionOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle fontWeight={700}>Add Deduction</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <TextField fullWidth required size="small" label="Description" value={deductionDraft.description} onChange={(e) => setDeductionDraft((d) => ({ ...d, description: e.target.value }))} />
            <TextField fullWidth required size="small" type="number" label="Deducted amount (₹)" value={deductionDraft.deducted_amount} onChange={(e) => setDeductionDraft((d) => ({ ...d, deducted_amount: e.target.value }))} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDeductionOpen(false)}>Cancel</Button>
          <Button variant="contained" disabled={deductionSubmitting} onClick={handleAddDeduction}>
            {deductionSubmitting ? 'Adding…' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Settle claim ──────────────────────────────────────────────── */}
      <Dialog open={settleOpen} onClose={() => setSettleOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle fontWeight={700}>Settle Claim</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <TextField select fullWidth size="small" label="Tender" value={settleDraft.tender_type} onChange={(e) => setSettleDraft((d) => ({ ...d, tender_type: e.target.value }))}>
              {TENDER_TYPES.map((t) => (
                <MenuItem key={t} value={t} sx={{ textTransform: 'capitalize' }}>{t.replace(/_/g, ' ')}</MenuItem>
              ))}
            </TextField>
            <TextField fullWidth required size="small" type="number" label="Amount (₹)" value={settleDraft.amount} onChange={(e) => setSettleDraft((d) => ({ ...d, amount: e.target.value }))} />
            <TextField fullWidth size="small" label="Reference (optional)" value={settleDraft.reference} onChange={(e) => setSettleDraft((d) => ({ ...d, reference: e.target.value }))} />
            <TextField fullWidth size="small" label="Notes (optional)" value={settleDraft.notes} onChange={(e) => setSettleDraft((d) => ({ ...d, notes: e.target.value }))} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setSettleOpen(false)}>Cancel</Button>
          <Button variant="contained" disabled={settleSubmitting} onClick={handleSettle}>
            {settleSubmitting ? 'Settling…' : 'Settle'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
