import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useApolloClient, gql } from '@apollo/client'
import {
  Alert,
  Autocomplete,
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
  MenuItem,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import SwapHorizIcon from '@mui/icons-material/SwapHoriz'
import LogoutIcon from '@mui/icons-material/Logout'
import CancelIcon from '@mui/icons-material/Cancel'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import GavelIcon from '@mui/icons-material/Gavel'
import LocalHospitalIcon from '@mui/icons-material/LocalHospital'
import { CLINICS_QUERY } from '../../graphql/queries'
import { formatDate, formatDateTime } from '../../utils/dateTime'

// REQ179 (IPD slice 1). Page-local gql (this is a brand-new domain, no
// existing contract to match against — ARCH-15 applies once one exists).

const ADMISSION_FIELDS = `
  id
  admission_number
  status
  admission_type
  admitted_at
  expected_discharge_at
  discharge_initiated_at
  discharged_at
  discharge_type
  patient { id full_name phone gender date_of_birth }
  admitting_clinician { id full_name }
  attending_clinician { id full_name }
  clinic_id
  clinic_name
  department_id
  department_name
  current_bed { bed_id bed_number ward_id ward_name ward_type start_at }
  bed_history { bed_id bed_number ward_id ward_name ward_type start_at end_at end_reason }
  provisional_diagnosis
  final_diagnosis
  admission_notes
  billing_mode
  payer_id
  payer_name
  is_mlc
  is_critical
  length_of_stay_days
  created_at
`
const ADMISSIONS_QUERY = gql`
  query IpdAdmissions($filter: AdmissionFilterInput) {
    admissions(filter: $filter) { ${ADMISSION_FIELDS} }
  }
`
const ADMISSION_EVENTS_QUERY = gql`
  query IpdAdmissionEvents($admission_id: ID!) {
    admissionEvents(admission_id: $admission_id) {
      id
      event_type
      occurred_at
      notes
      actor_name
      from_bed_number
      to_bed_number
      from_ward_name
      to_ward_name
      reason
    }
  }
`
const MLC_FOR_ADMISSION_QUERY = gql`
  query IpdMlcRegisters($clinic_id: ID) {
    mlcRegisters(clinic_id: $clinic_id) {
      id
      mlc_number
      admission_id
      mlc_category
      identification_mark_1
      identification_mark_2
      injury_details
      police_intimated_at
      police_intimation_overdue
      recorded_at
    }
  }
`
const WARDS_QUERY = gql`
  query WardsForAdmit($clinic_id: ID) {
    wards(clinic_id: $clinic_id) {
      id
      name
      ward_type
    }
  }
`
const BEDS_QUERY = gql`
  query BedsForAdmit($ward_id: ID, $clinic_id: ID) {
    beds(ward_id: $ward_id, clinic_id: $clinic_id) {
      id
      bed_number
      status
      ward_id
      ward_name
    }
  }
`
const CLINICIANS_LEAN_QUERY = gql`
  query CliniciansForAdmit($clinic_id: ID) {
    clinicians(clinic_id: $clinic_id, is_active: true, first: 100) {
      data { id full_name }
    }
  }
`
const SEARCH_PATIENTS_QUERY = gql`
  query PatientsForAdmit($search: String) {
    patients(search: $search, first: 15) {
      data { id full_name phone }
    }
  }
`
const CREATE_ADMISSION = gql`
  mutation CreateAdmission($input: CreateAdmissionInput!) {
    createAdmission(input: $input) { ${ADMISSION_FIELDS} }
  }
`
const TRANSFER_BED = gql`
  mutation TransferAdmissionBed($input: TransferAdmissionBedInput!) {
    transferAdmissionBed(input: $input) { ${ADMISSION_FIELDS} }
  }
`
const DISCHARGE_ADMISSION = gql`
  mutation DischargeAdmission($input: DischargeAdmissionInput!) {
    dischargeAdmission(input: $input) { ${ADMISSION_FIELDS} }
  }
`
const CANCEL_ADMISSION = gql`
  mutation CancelAdmission($id: ID!, $reason: String!) {
    cancelAdmission(id: $id, reason: $reason) { success userErrors { message } }
  }
`
const RECORD_MLC = gql`
  mutation RecordMlcRegister($input: RecordMlcRegisterInput!) {
    recordMlcRegister(input: $input) { id mlc_number }
  }
`

const ADMISSION_TYPES = ['general', 'insurance', 'corporate', 'emergency', 'day_care', 'maternity']
const DISCHARGE_TYPES = ['routine', 'dama', 'transfer_out', 'expired', 'absconded']
const MLC_CATEGORIES = [
  'road_accident', 'poisoning', 'assault', 'burns', 'sexual_assault', 'child_abuse',
  'unnatural_death', 'industrial_accident', 'attempted_suicide', 'other',
]

const STATUS_COLOR = {
  pending: 'default',
  admitted: 'success',
  discharge_initiated: 'warning',
  discharged: 'default',
  cancelled: 'default',
  lama: 'error',
  absconded: 'error',
  expired: 'error',
}

function StatusChip({ status }) {
  return <Chip size="small" label={status.replace(/_/g, ' ')} color={STATUS_COLOR[status] || 'default'} sx={{ textTransform: 'capitalize' }} />
}

export default function IpdAdmissions() {
  const client = useApolloClient()
  const [searchParams, setSearchParams] = useSearchParams()

  const [clinics, setClinics] = useState([])
  const [clinicId, setClinicId] = useState('')
  const [statusFilter, setStatusFilter] = useState('admitted')
  const [admissions, setAdmissions] = useState([])
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

  const loadAdmissions = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const { data, errors } = await client.query({
        query: ADMISSIONS_QUERY,
        variables: { filter: { clinic_id: clinicId || undefined, status: statusFilter || undefined, limit: 100 } },
        fetchPolicy: 'network-only',
      })
      if (errors?.length) throw new Error(errors[0].message)
      setAdmissions(data?.admissions ?? [])
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
    if (clinicId) loadAdmissions()
  }, [clinicId, statusFilter, loadAdmissions])

  // ── New Admission dialog ─────────────────────────────────────────────
  const [admitOpen, setAdmitOpen] = useState(false)
  const [wards, setWards] = useState([])
  const [beds, setBeds] = useState([])
  const [clinicians, setClinicians] = useState([])
  const [selectedPatient, setSelectedPatient] = useState(null)
  const [patientOptions, setPatientOptions] = useState([])
  const [patientSearching, setPatientSearching] = useState(false)
  const [admitWardId, setAdmitWardId] = useState('')
  const [admitBedId, setAdmitBedId] = useState('')
  const [admitClinicianId, setAdmitClinicianId] = useState('')
  const [admitType, setAdmitType] = useState('general')
  const [admitDiagnosis, setAdmitDiagnosis] = useState('')
  const [admitError, setAdmitError] = useState(null)
  const [admitSubmitting, setAdmitSubmitting] = useState(false)
  const patientSearchTimer = useRef(null)

  const openAdmitDialog = async (preselectBedId) => {
    setSelectedPatient(null)
    setPatientOptions([])
    setAdmitWardId('')
    setAdmitBedId('')
    setAdmitClinicianId('')
    setAdmitType('general')
    setAdmitDiagnosis('')
    setAdmitError(null)
    setAdmitOpen(true)
    try {
      const [{ data: wardData }, { data: clinicianData }] = await Promise.all([
        client.query({ query: WARDS_QUERY, variables: { clinic_id: clinicId }, fetchPolicy: 'network-only' }),
        client.query({ query: CLINICIANS_LEAN_QUERY, variables: { clinic_id: clinicId }, fetchPolicy: 'network-only' }),
      ])
      setWards(wardData?.wards ?? [])
      setClinicians(clinicianData?.clinicians?.data ?? [])
      if (preselectBedId) {
        const { data: bedData } = await client.query({ query: BEDS_QUERY, variables: { clinic_id: clinicId }, fetchPolicy: 'network-only' })
        const bed = (bedData?.beds ?? []).find((b) => b.id === preselectBedId)
        if (bed) {
          setAdmitWardId(bed.ward_id)
          setBeds((bedData?.beds ?? []).filter((b) => b.ward_id === bed.ward_id))
          setAdmitBedId(bed.id)
        }
      }
    } catch (err) {
      setAdmitError(err.message)
    }
  }

  const handleWardChange = async (wardId) => {
    setAdmitWardId(wardId)
    setAdmitBedId('')
    if (!wardId) {
      setBeds([])
      return
    }
    const { data } = await client.query({ query: BEDS_QUERY, variables: { ward_id: wardId }, fetchPolicy: 'network-only' })
    setBeds((data?.beds ?? []).filter((b) => b.status === 'available'))
  }

  const handlePatientSearchInput = (_e, value, reason) => {
    if (patientSearchTimer.current) clearTimeout(patientSearchTimer.current)
    // See PlatformBilling.jsx's own fix for the identical bug: selecting an
    // option re-fires onInputChange with reason='reset' on the option's own
    // display text, which would otherwise waste a search on it.
    if (reason === 'reset' || reason === 'clear') return
    if (!value || value.length < 2) {
      setPatientOptions([])
      return
    }
    patientSearchTimer.current = setTimeout(async () => {
      setPatientSearching(true)
      try {
        const { data } = await client.query({ query: SEARCH_PATIENTS_QUERY, variables: { search: value }, fetchPolicy: 'network-only' })
        setPatientOptions(data?.patients?.data ?? [])
      } finally {
        setPatientSearching(false)
      }
    }, 300)
  }

  const handleAdmitSubmit = async (e) => {
    e.preventDefault()
    if (!selectedPatient || !admitBedId || !admitClinicianId) {
      setAdmitError('Choose a patient, a bed, and an admitting clinician.')
      return
    }
    setAdmitSubmitting(true)
    setAdmitError(null)
    try {
      const { data } = await client.mutate({
        mutation: CREATE_ADMISSION,
        variables: {
          input: {
            clinic_id: clinicId,
            patient_id: selectedPatient.id,
            bed_id: admitBedId,
            admitting_clinician_id: admitClinicianId,
            admission_type: admitType,
            provisional_diagnosis: admitDiagnosis || undefined,
          },
        },
      })
      showSuccess(`${selectedPatient.full_name} admitted — ${data.createAdmission.admission_number}.`)
      setAdmitOpen(false)
      searchParams.delete('bed')
      setSearchParams(searchParams)
      await loadAdmissions()
    } catch (err) {
      setAdmitError(err.message)
    } finally {
      setAdmitSubmitting(false)
    }
  }

  // Preselect from ?bed= (arriving from the bed board's "Admit here").
  useEffect(() => {
    const bedParam = searchParams.get('bed')
    if (bedParam && clinicId) {
      openAdmitDialog(bedParam)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clinicId])

  // ── Detail dialog ─────────────────────────────────────────────────────
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailAdmission, setDetailAdmission] = useState(null)
  const [detailTab, setDetailTab] = useState(0)
  const [events, setEvents] = useState([])
  const [mlcForAdmission, setMlcForAdmission] = useState(null)

  const openDetail = async (admission) => {
    setDetailAdmission(admission)
    setDetailTab(0)
    setDetailOpen(true)
    setEvents([])
    setMlcForAdmission(null)
    try {
      const [{ data: eventData }, { data: mlcData }] = await Promise.all([
        client.query({ query: ADMISSION_EVENTS_QUERY, variables: { admission_id: admission.id }, fetchPolicy: 'network-only' }),
        admission.is_mlc
          ? client.query({ query: MLC_FOR_ADMISSION_QUERY, variables: { clinic_id: admission.clinic_id }, fetchPolicy: 'network-only' })
          : Promise.resolve({ data: null }),
      ])
      setEvents(eventData?.admissionEvents ?? [])
      if (mlcData) setMlcForAdmission((mlcData.mlcRegisters ?? []).find((m) => m.admission_id === admission.id) ?? null)
    } catch (err) {
      setActionError(err.message)
    }
  }

  // Auto-open a detail dialog from ?open= (arriving from the bed board).
  useEffect(() => {
    const openParam = searchParams.get('open')
    if (openParam && admissions.length > 0) {
      const found = admissions.find((a) => a.id === openParam)
      if (found) openDetail(found)
      searchParams.delete('open')
      setSearchParams(searchParams)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [admissions])

  const refreshDetail = async () => {
    await loadAdmissions()
    setDetailOpen(false)
  }

  // ── Transfer ──────────────────────────────────────────────────────────
  const [transferOpen, setTransferOpen] = useState(false)
  const [transferWardId, setTransferWardId] = useState('')
  const [transferBeds, setTransferBeds] = useState([])
  const [transferBedId, setTransferBedId] = useState('')
  const [transferReason, setTransferReason] = useState('')
  const [transferError, setTransferError] = useState(null)
  const [transferSubmitting, setTransferSubmitting] = useState(false)

  const openTransfer = async () => {
    setTransferWardId('')
    setTransferBedId('')
    setTransferReason('')
    setTransferError(null)
    setTransferOpen(true)
    const { data } = await client.query({ query: WARDS_QUERY, variables: { clinic_id: detailAdmission.clinic_id }, fetchPolicy: 'network-only' })
    setWards(data?.wards ?? [])
  }
  const handleTransferWardChange = async (wardId) => {
    setTransferWardId(wardId)
    setTransferBedId('')
    if (!wardId) return setTransferBeds([])
    const { data } = await client.query({ query: BEDS_QUERY, variables: { ward_id: wardId }, fetchPolicy: 'network-only' })
    setTransferBeds((data?.beds ?? []).filter((b) => b.status === 'available'))
  }
  const handleTransferSubmit = async () => {
    if (!transferBedId) {
      setTransferError('Choose a destination bed.')
      return
    }
    setTransferSubmitting(true)
    setTransferError(null)
    try {
      await client.mutate({
        mutation: TRANSFER_BED,
        variables: { input: { admission_id: detailAdmission.id, to_bed_id: transferBedId, reason: transferReason || undefined } },
      })
      showSuccess('Patient transferred.')
      setTransferOpen(false)
      await refreshDetail()
    } catch (err) {
      setTransferError(err.message)
    } finally {
      setTransferSubmitting(false)
    }
  }

  // ── Discharge ─────────────────────────────────────────────────────────
  const [dischargeOpen, setDischargeOpen] = useState(false)
  const [dischargeType, setDischargeType] = useState('routine')
  const [dischargeFinalDx, setDischargeFinalDx] = useState('')
  const [dischargeError, setDischargeError] = useState(null)
  const [dischargeSubmitting, setDischargeSubmitting] = useState(false)

  const handleDischargeSubmit = async () => {
    setDischargeSubmitting(true)
    setDischargeError(null)
    try {
      await client.mutate({
        mutation: DISCHARGE_ADMISSION,
        variables: { input: { admission_id: detailAdmission.id, discharge_type: dischargeType, final_diagnosis: dischargeFinalDx || undefined } },
      })
      showSuccess('Patient discharged.')
      setDischargeOpen(false)
      await refreshDetail()
    } catch (err) {
      setDischargeError(err.message)
    } finally {
      setDischargeSubmitting(false)
    }
  }

  // ── Cancel ────────────────────────────────────────────────────────────
  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelError, setCancelError] = useState(null)
  const [cancelSubmitting, setCancelSubmitting] = useState(false)

  const handleCancelSubmit = async () => {
    if (!cancelReason.trim()) return
    setCancelSubmitting(true)
    setCancelError(null)
    try {
      const { data } = await client.mutate({ mutation: CANCEL_ADMISSION, variables: { id: detailAdmission.id, reason: cancelReason.trim() } })
      if (!data.cancelAdmission.success) throw new Error(data.cancelAdmission.userErrors?.[0]?.message || 'Failed to cancel')
      showSuccess('Admission cancelled.')
      setCancelOpen(false)
      await refreshDetail()
    } catch (err) {
      setCancelError(err.message)
    } finally {
      setCancelSubmitting(false)
    }
  }

  // ── MLC ───────────────────────────────────────────────────────────────
  const [mlcOpen, setMlcOpen] = useState(false)
  const [mlcCategory, setMlcCategory] = useState('road_accident')
  const [mlcMark1, setMlcMark1] = useState('')
  const [mlcMark2, setMlcMark2] = useState('')
  const [mlcExaminedBy, setMlcExaminedBy] = useState('')
  const [mlcInjury, setMlcInjury] = useState('')
  const [mlcCliniciansOptions, setMlcCliniciansOptions] = useState([])
  const [mlcError, setMlcError] = useState(null)
  const [mlcSubmitting, setMlcSubmitting] = useState(false)

  const openMlc = async () => {
    setMlcCategory('road_accident')
    setMlcMark1('')
    setMlcMark2('')
    setMlcExaminedBy('')
    setMlcInjury('')
    setMlcError(null)
    setMlcOpen(true)
    const { data } = await client.query({ query: CLINICIANS_LEAN_QUERY, variables: { clinic_id: detailAdmission.clinic_id }, fetchPolicy: 'network-only' })
    setMlcCliniciansOptions(data?.clinicians?.data ?? [])
  }
  const handleMlcSubmit = async () => {
    if (!mlcMark1.trim() || !mlcMark2.trim() || !mlcExaminedBy) {
      setMlcError('Both identification marks and the examining clinician are required.')
      return
    }
    setMlcSubmitting(true)
    setMlcError(null)
    try {
      await client.mutate({
        mutation: RECORD_MLC,
        variables: {
          input: {
            admission_id: detailAdmission.id,
            mlc_category: mlcCategory,
            identification_mark_1: mlcMark1.trim(),
            identification_mark_2: mlcMark2.trim(),
            examined_by_clinician_id: mlcExaminedBy,
            injury_details: mlcInjury || undefined,
          },
        },
      })
      showSuccess('MLC register filed.')
      setMlcOpen(false)
      await refreshDetail()
    } catch (err) {
      setMlcError(err.message)
    } finally {
      setMlcSubmitting(false)
    }
  }

  if (loading && admissions.length === 0)
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
            Admissions
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Admit, transfer and discharge in-patients
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
          <TextField select size="small" label="Status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} sx={{ minWidth: 160 }}>
            <MenuItem value="">All statuses</MenuItem>
            {['admitted', 'discharge_initiated', 'discharged', 'cancelled', 'lama', 'absconded'].map((s) => (
              <MenuItem key={s} value={s} sx={{ textTransform: 'capitalize' }}>
                {s.replace(/_/g, ' ')}
              </MenuItem>
            ))}
          </TextField>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => openAdmitDialog()} disabled={!clinicId}>
            New Admission
          </Button>
        </Stack>
      </Stack>

      {loadError && (
        <Alert severity="warning" sx={{ mb: 2 }} action={<Button size="small" onClick={loadAdmissions}>Retry</Button>}>
          Failed to load: {loadError}
        </Alert>
      )}
      {successMsg && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {successMsg}
        </Alert>
      )}
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
                {['Admission #', 'Patient', 'Bed', 'Attending', 'Type', 'Status', 'Since', ''].map((h) => (
                  <Box
                    key={h}
                    component="th"
                    sx={{ px: 2, py: 1.5, textAlign: 'left', typography: 'caption', fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid', borderColor: 'divider' }}
                  >
                    {h}
                  </Box>
                ))}
              </Box>
            </Box>
            <Box component="tbody">
              {admissions.length === 0 && (
                <Box component="tr">
                  <Box component="td" colSpan={8} sx={{ textAlign: 'center', py: 6 }}>
                    <LocalHospitalIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1, display: 'block', mx: 'auto' }} />
                    <Typography color="text.secondary">No admissions match this filter</Typography>
                  </Box>
                </Box>
              )}
              {admissions.map((a) => (
                <Box
                  component="tr"
                  key={a.id}
                  onClick={() => openDetail(a)}
                  sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'grey.50' }, borderBottom: '1px solid', borderColor: 'divider' }}
                >
                  <Box component="td" sx={{ px: 2, py: 1.5 }}>
                    <Typography variant="body2" fontWeight={600}>
                      {a.admission_number}
                    </Typography>
                    {a.is_mlc && <Chip size="small" icon={<GavelIcon />} label="MLC" color="error" sx={{ mt: 0.5, height: 18, fontSize: 10 }} />}
                  </Box>
                  <Box component="td" sx={{ px: 2, py: 1.5 }}>{a.patient.full_name}</Box>
                  <Box component="td" sx={{ px: 2, py: 1.5 }}>{a.current_bed ? `${a.current_bed.bed_number} (${a.current_bed.ward_name})` : '—'}</Box>
                  <Box component="td" sx={{ px: 2, py: 1.5 }}>{a.attending_clinician.full_name}</Box>
                  <Box component="td" sx={{ px: 2, py: 1.5, textTransform: 'capitalize' }}>{a.admission_type}</Box>
                  <Box component="td" sx={{ px: 2, py: 1.5 }}><StatusChip status={a.status} /></Box>
                  <Box component="td" sx={{ px: 2, py: 1.5 }}>{formatDate(a.admitted_at)}</Box>
                  <Box component="td" sx={{ px: 2, py: 1.5 }}>Day {a.length_of_stay_days}</Box>
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
      </Card>

      {/* ── New Admission ─────────────────────────────────────────────── */}
      <Dialog open={admitOpen} onClose={() => setAdmitOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle fontWeight={700}>New Admission</DialogTitle>
        <DialogContent dividers>
          {admitError && <Alert severity="error" sx={{ mb: 2 }}>{admitError}</Alert>}
          <Box component="form" id="admit-form" onSubmit={handleAdmitSubmit}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Autocomplete
                  options={patientOptions}
                  getOptionLabel={(o) => `${o.full_name}${o.phone ? ` (${o.phone})` : ''}`}
                  isOptionEqualToValue={(o, v) => o.id === v.id}
                  value={selectedPatient}
                  onChange={(_e, v) => setSelectedPatient(v)}
                  onInputChange={handlePatientSearchInput}
                  loading={patientSearching}
                  noOptionsText="Type at least 2 characters to search"
                  renderInput={(params) => <TextField {...params} label="Patient" required size="small" placeholder="Search by name or phone" />}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField select fullWidth required size="small" label="Ward" value={admitWardId} onChange={(e) => handleWardChange(e.target.value)}>
                  {wards.map((w) => (
                    <MenuItem key={w.id} value={w.id}>
                      {w.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField select fullWidth required size="small" label="Bed" value={admitBedId} onChange={(e) => setAdmitBedId(e.target.value)} disabled={!admitWardId}>
                  {beds.length === 0 && <MenuItem value="" disabled>No available beds</MenuItem>}
                  {beds.map((b) => (
                    <MenuItem key={b.id} value={b.id}>
                      {b.bed_number}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField select fullWidth required size="small" label="Admitting clinician" value={admitClinicianId} onChange={(e) => setAdmitClinicianId(e.target.value)}>
                  {clinicians.map((c) => (
                    <MenuItem key={c.id} value={c.id}>
                      {c.full_name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField select fullWidth required size="small" label="Admission type" value={admitType} onChange={(e) => setAdmitType(e.target.value)}>
                  {ADMISSION_TYPES.map((t) => (
                    <MenuItem key={t} value={t} sx={{ textTransform: 'capitalize' }}>
                      {t.replace(/_/g, ' ')}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth multiline minRows={2} size="small" label="Provisional diagnosis" value={admitDiagnosis} onChange={(e) => setAdmitDiagnosis(e.target.value)} />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setAdmitOpen(false)}>Cancel</Button>
          <Button type="submit" form="admit-form" variant="contained" disabled={admitSubmitting}>
            {admitSubmitting ? 'Admitting…' : 'Admit Patient'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Detail ────────────────────────────────────────────────────── */}
      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle fontWeight={700}>
          {detailAdmission?.admission_number} — {detailAdmission?.patient.full_name}
        </DialogTitle>
        <DialogContent dividers>
          {detailAdmission && (
            <Stack spacing={2}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
                <StatusChip status={detailAdmission.status} />
                {detailAdmission.is_mlc && <Chip size="small" icon={<GavelIcon />} label="MLC filed" color="error" />}
                {detailAdmission.is_critical && <Chip size="small" label="Critical" color="warning" />}
              </Stack>
              <Divider />
              <Grid container spacing={1.5}>
                {[
                  ['Current bed', detailAdmission.current_bed ? `${detailAdmission.current_bed.bed_number} — ${detailAdmission.current_bed.ward_name}` : '—'],
                  ['Attending', detailAdmission.attending_clinician.full_name],
                  ['Admitted', formatDateTime(detailAdmission.admitted_at)],
                  ['Length of stay', `Day ${detailAdmission.length_of_stay_days}`],
                  ['Billing mode', detailAdmission.billing_mode],
                  ['Payer', detailAdmission.payer_name || 'Self-pay'],
                ].map(([label, value]) => (
                  <Grid item xs={6} key={label}>
                    <Typography variant="caption" color="text.secondary" display="block">
                      {label}
                    </Typography>
                    <Typography variant="body2" sx={{ textTransform: label === 'Billing mode' ? 'capitalize' : 'none' }}>
                      {value}
                    </Typography>
                  </Grid>
                ))}
              </Grid>

              <Tabs value={detailTab} onChange={(_e, v) => setDetailTab(v)}>
                <Tab label="Bed history" />
                <Tab label="Timeline" />
                <Tab label="MLC" />
              </Tabs>

              {detailTab === 0 && (
                <Stack spacing={1}>
                  {detailAdmission.bed_history.map((h, i) => (
                    <Stack key={i} direction="row" justifyContent="space-between" sx={{ py: 0.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                      <Typography variant="body2">
                        {h.bed_number} — {h.ward_name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatDateTime(h.start_at)} {h.end_at ? `→ ${formatDateTime(h.end_at)} (${h.end_reason})` : '(current)'}
                      </Typography>
                    </Stack>
                  ))}
                </Stack>
              )}
              {detailTab === 1 && (
                <Stack spacing={1}>
                  {events.length === 0 && (
                    <Typography variant="body2" color="text.secondary">
                      No events yet.
                    </Typography>
                  )}
                  {events.map((ev) => (
                    <Box key={ev.id} sx={{ py: 0.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                      <Typography variant="body2" sx={{ textTransform: 'capitalize' }} fontWeight={600}>
                        {ev.event_type.replace(/_/g, ' ')}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block">
                        {formatDateTime(ev.occurred_at)} {ev.actor_name ? `— ${ev.actor_name}` : ''}
                      </Typography>
                      {(ev.from_bed_number || ev.to_bed_number) && (
                        <Typography variant="caption" display="block">
                          {ev.from_bed_number ? `${ev.from_bed_number} (${ev.from_ward_name}) → ` : ''}
                          {ev.to_bed_number ? `${ev.to_bed_number} (${ev.to_ward_name})` : ''}
                        </Typography>
                      )}
                      {ev.notes && (
                        <Typography variant="caption" display="block">
                          {ev.notes}
                        </Typography>
                      )}
                    </Box>
                  ))}
                </Stack>
              )}
              {detailTab === 2 && (
                <Stack spacing={1.5}>
                  {mlcForAdmission ? (
                    <>
                      <Typography variant="body2" fontWeight={600}>
                        {mlcForAdmission.mlc_number} — {mlcForAdmission.mlc_category.replace(/_/g, ' ')}
                      </Typography>
                      <Typography variant="body2">Marks: {mlcForAdmission.identification_mark_1}, {mlcForAdmission.identification_mark_2}</Typography>
                      <Typography variant="body2">{mlcForAdmission.injury_details}</Typography>
                      {mlcForAdmission.police_intimation_overdue ? (
                        <Alert severity="error" icon={<WarningAmberIcon />}>
                          Police intimation is overdue — the statutory 24h window has passed.
                        </Alert>
                      ) : mlcForAdmission.police_intimated_at ? (
                        <Alert severity="success">Police intimated {formatDateTime(mlcForAdmission.police_intimated_at)}.</Alert>
                      ) : (
                        <Alert severity="warning">Police intimation not yet recorded.</Alert>
                      )}
                    </>
                  ) : (
                    <Stack spacing={1} alignItems="flex-start">
                      <Typography variant="body2" color="text.secondary">
                        No MLC register filed for this admission.
                      </Typography>
                      <Button size="small" startIcon={<GavelIcon />} onClick={openMlc}>
                        File MLC Register
                      </Button>
                    </Stack>
                  )}
                </Stack>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, flexWrap: 'wrap', gap: 1 }}>
          <Button onClick={() => setDetailOpen(false)}>Close</Button>
          {detailAdmission?.status === 'admitted' && (
            <>
              <Button startIcon={<SwapHorizIcon />} onClick={openTransfer}>
                Transfer
              </Button>
              <Button startIcon={<LogoutIcon />} onClick={() => setDischargeOpen(true)}>
                Discharge
              </Button>
              <Button color="error" startIcon={<CancelIcon />} onClick={() => setCancelOpen(true)}>
                Cancel Admission
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      {/* ── Transfer ──────────────────────────────────────────────────── */}
      <Dialog open={transferOpen} onClose={() => setTransferOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle fontWeight={700}>Transfer Bed</DialogTitle>
        <DialogContent dividers>
          {transferError && <Alert severity="error" sx={{ mb: 2 }}>{transferError}</Alert>}
          <Stack spacing={2}>
            <TextField select fullWidth required size="small" label="Ward" value={transferWardId} onChange={(e) => handleTransferWardChange(e.target.value)}>
              {wards.map((w) => (
                <MenuItem key={w.id} value={w.id}>
                  {w.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField select fullWidth required size="small" label="Bed" value={transferBedId} onChange={(e) => setTransferBedId(e.target.value)} disabled={!transferWardId}>
              {transferBeds.length === 0 && <MenuItem value="" disabled>No available beds</MenuItem>}
              {transferBeds.map((b) => (
                <MenuItem key={b.id} value={b.id}>
                  {b.bed_number}
                </MenuItem>
              ))}
            </TextField>
            <TextField fullWidth multiline minRows={2} size="small" label="Reason (optional)" value={transferReason} onChange={(e) => setTransferReason(e.target.value)} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setTransferOpen(false)}>Cancel</Button>
          <Button variant="contained" disabled={transferSubmitting} onClick={handleTransferSubmit}>
            {transferSubmitting ? 'Transferring…' : 'Transfer'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Discharge ─────────────────────────────────────────────────── */}
      <Dialog open={dischargeOpen} onClose={() => setDischargeOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle fontWeight={700}>Discharge Patient</DialogTitle>
        <DialogContent dividers>
          {dischargeError && <Alert severity="error" sx={{ mb: 2 }}>{dischargeError}</Alert>}
          <Stack spacing={2}>
            <TextField select fullWidth size="small" label="Discharge type" value={dischargeType} onChange={(e) => setDischargeType(e.target.value)}>
              {DISCHARGE_TYPES.map((t) => (
                <MenuItem key={t} value={t} sx={{ textTransform: 'uppercase' }}>
                  {t === 'dama' ? 'DAMA (against medical advice)' : t.replace(/_/g, ' ')}
                </MenuItem>
              ))}
            </TextField>
            <TextField fullWidth multiline minRows={2} size="small" label="Final diagnosis (optional)" value={dischargeFinalDx} onChange={(e) => setDischargeFinalDx(e.target.value)} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDischargeOpen(false)}>Back</Button>
          <Button variant="contained" disabled={dischargeSubmitting} onClick={handleDischargeSubmit}>
            {dischargeSubmitting ? 'Discharging…' : 'Confirm Discharge'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Cancel — a destructive action, a typed reason is required
           though not the full SURF-16 org-name confirmation (this is a
           same-org front-desk correction, not a cross-tenant action). ──── */}
      <Dialog open={cancelOpen} onClose={() => setCancelOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningAmberIcon color="warning" />
          Cancel Admission
        </DialogTitle>
        <DialogContent dividers>
          {cancelError && <Alert severity="error" sx={{ mb: 2 }}>{cancelError}</Alert>}
          <Alert severity="warning" variant="outlined" sx={{ mb: 2 }}>
            This voids the bed occupancy entirely — use this only when the patient was admitted in error, not for a real discharge.
          </Alert>
          <TextField fullWidth required multiline minRows={2} size="small" label="Reason" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} />
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setCancelOpen(false)}>Back</Button>
          <Button variant="contained" color="error" disabled={!cancelReason.trim() || cancelSubmitting} onClick={handleCancelSubmit}>
            {cancelSubmitting ? 'Cancelling…' : 'Confirm Cancellation'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── MLC record ────────────────────────────────────────────────── */}
      <Dialog open={mlcOpen} onClose={() => setMlcOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle fontWeight={700}>File MLC Register</DialogTitle>
        <DialogContent dividers>
          {mlcError && <Alert severity="error" sx={{ mb: 2 }}>{mlcError}</Alert>}
          <Alert severity="info" variant="outlined" sx={{ mb: 2 }}>
            This creates a statutory record. Once filed it cannot be edited or deleted — corrections must go through an amendment.
          </Alert>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField select fullWidth size="small" label="Category" value={mlcCategory} onChange={(e) => setMlcCategory(e.target.value)}>
                {MLC_CATEGORIES.map((c) => (
                  <MenuItem key={c} value={c} sx={{ textTransform: 'capitalize' }}>
                    {c.replace(/_/g, ' ')}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth required size="small" label="Identification mark 1" value={mlcMark1} onChange={(e) => setMlcMark1(e.target.value)} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth required size="small" label="Identification mark 2" value={mlcMark2} onChange={(e) => setMlcMark2(e.target.value)} />
            </Grid>
            <Grid item xs={12}>
              <TextField select fullWidth required size="small" label="Examined by" value={mlcExaminedBy} onChange={(e) => setMlcExaminedBy(e.target.value)}>
                {mlcCliniciansOptions.map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.full_name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth multiline minRows={2} size="small" label="Injury details" value={mlcInjury} onChange={(e) => setMlcInjury(e.target.value)} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setMlcOpen(false)}>Cancel</Button>
          <Button variant="contained" disabled={mlcSubmitting} onClick={handleMlcSubmit}>
            {mlcSubmitting ? 'Filing…' : 'File Register'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
