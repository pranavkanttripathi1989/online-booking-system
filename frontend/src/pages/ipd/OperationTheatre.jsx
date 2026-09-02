import { useState, useEffect, useCallback } from 'react'
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
  MenuItem,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import LockIcon from '@mui/icons-material/Lock'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom'
import { CLINICS_QUERY } from '../../graphql/queries'
import { formatDateTime } from '../../utils/dateTime'

// REQ179 (IPD slice 3). Page-local gql, no existing contract to match
// (a brand-new domain). Desktop-dense tier (OT scheduling is a front-desk/
// theatre-coordinator surface), verified at 1280/1440.

const THEATRES_QUERY = gql`
  query OtTheatres($clinic_id: ID) {
    operationTheatres(clinic_id: $clinic_id) {
      id
      name
      default_turnaround_minutes
      is_active
    }
  }
`
const CREATE_THEATRE = gql`
  mutation CreateOperationTheatre($input: CreateOperationTheatreInput!) {
    createOperationTheatre(input: $input) {
      id
    }
  }
`
const SCHEDULE_QUERY = gql`
  query OtSchedule($theatre_id: ID, $clinic_id: ID, $from: String!, $to: String!) {
    otSchedule(theatre_id: $theatre_id, clinic_id: $clinic_id, from: $from, to: $to) {
      id
      theatre_id
      theatre_name
      admission_id
      admission_number
      patient_name
      procedure_name
      primary_surgeon_name
      anesthetist_name
      start_at
      end_at
      turnaround_minutes
      status
      cancel_reason
    }
  }
`
const BOOKING_DETAIL_QUERY = gql`
  query OtBookingDetail($id: ID!) {
    otBooking(id: $id) {
      id
      theatre_id
      theatre_name
      admission_id
      admission_number
      patient_name
      procedure_name
      primary_surgeon_clinician_id
      primary_surgeon_name
      anesthetist_clinician_id
      anesthetist_name
      start_at
      end_at
      turnaround_minutes
      status
      cancel_reason
      notes
      staff {
        id
        user_name
        role
      }
      checklists {
        id
        phase
        items {
          key
          label
          checked
        }
        completed_by_name
        completed_at
      }
      consumables {
        id
        drug_name
        quantity
        implant_serial_no
        recorded_by_name
        created_at
      }
    }
    otNote(booking_id: $id) {
      pre_op_diagnosis
      procedure_performed
      findings
      complications
      post_op_diagnosis
      post_op_instructions
      author_name
      signed_at
      locked
    }
  }
`
const LIVE_ADMISSIONS_QUERY = gql`
  query LiveAdmissionsForOt($clinic_id: ID) {
    admissions(filter: { clinic_id: $clinic_id, status: "admitted", limit: 100 }) {
      id
      admission_number
      patient {
        full_name
      }
    }
  }
`
const CLINICIANS_LEAN_QUERY = gql`
  query CliniciansForOt($clinic_id: ID) {
    clinicians(clinic_id: $clinic_id, is_active: true, first: 100) {
      data {
        id
        full_name
      }
    }
  }
`
const CREATE_BOOKING = gql`
  mutation CreateOtBooking($input: CreateOtBookingInput!) {
    createOtBooking(input: $input) {
      id
    }
  }
`
const START_BOOKING = gql`
  mutation StartOtBooking($id: ID!) {
    startOtBooking(id: $id) {
      id
      status
    }
  }
`
const COMPLETE_BOOKING = gql`
  mutation CompleteOtBooking($id: ID!) {
    completeOtBooking(id: $id) {
      id
      status
    }
  }
`
const CANCEL_BOOKING = gql`
  mutation CancelOtBooking($input: CancelOtBookingInput!) {
    cancelOtBooking(input: $input) {
      success
      userErrors {
        message
      }
    }
  }
`
const COMPLETE_CHECKLIST = gql`
  mutation CompleteOtChecklist($input: CompleteOtChecklistInput!) {
    completeOtChecklist(input: $input) {
      id
    }
  }
`
const CREATE_NOTE = gql`
  mutation CreateOtNote($input: CreateOtNoteInput!) {
    createOtNote(input: $input) {
      id
    }
  }
`
const UPDATE_NOTE = gql`
  mutation UpdateOtNote($booking_id: ID!, $input: UpdateOtNoteInput!) {
    updateOtNote(booking_id: $booking_id, input: $input) {
      id
    }
  }
`
const SIGN_NOTE = gql`
  mutation SignOtNote($input: SignOtNoteInput!) {
    signOtNote(input: $input) {
      id
    }
  }
`
const DRUGS_QUERY = gql`
  query OtConsumableDrugs($search: String, $item_type: String) {
    drugs(search: $search, item_type: $item_type) {
      id
      name
      strength
      form
    }
  }
`
const BATCHES_QUERY = gql`
  query OtConsumableBatches($clinic_id: ID) {
    drugBatches(clinic_id: $clinic_id) {
      id
      drug_id
      batch_number
      quantity_remaining
    }
  }
`
const RECORD_CONSUMABLE = gql`
  mutation RecordOtConsumable($input: RecordOtConsumableInput!) {
    recordOtConsumable(input: $input) {
      id
    }
  }
`

const CHECKLIST_PHASES = [
  { phase: 'sign_in', label: 'Sign In', items: [
    { key: 'identity_confirmed', label: 'Patient identity, site and procedure confirmed' },
    { key: 'consent_confirmed', label: 'Consent confirmed' },
    { key: 'site_marked', label: 'Site marked (if applicable)' },
    { key: 'anesthesia_check', label: 'Anesthesia safety check complete' },
  ] },
  { phase: 'time_out', label: 'Time Out', items: [
    { key: 'team_introduced', label: 'Team members introduced by name and role' },
    { key: 'procedure_confirmed', label: 'Surgeon, anesthesia and nursing team verbally confirm patient, site, procedure' },
    { key: 'antibiotic_given', label: 'Antibiotic prophylaxis given in last 60 minutes (if indicated)' },
  ] },
  { phase: 'sign_out', label: 'Sign Out', items: [
    { key: 'procedure_recorded', label: 'Procedure name recorded' },
    { key: 'counts_correct', label: 'Instrument, sponge and needle counts correct' },
    { key: 'specimen_labelled', label: 'Specimen labelled (if applicable)' },
    { key: 'concerns_reviewed', label: 'Key concerns for recovery reviewed' },
  ] },
]
const ITEM_TYPES = ['consumable', 'implant', 'surgical_item', 'oxygen']

const STATUS_COLOR = {
  scheduled: 'default',
  in_progress: 'warning',
  completed: 'success',
  cancelled: 'default',
}

function StatusChip({ status }) {
  return <Chip size="small" label={status.replace(/_/g, ' ')} color={STATUS_COLOR[status] || 'default'} sx={{ textTransform: 'capitalize' }} />
}

export default function OperationTheatre() {
  const client = useApolloClient()

  const [clinics, setClinics] = useState([])
  const [clinicId, setClinicId] = useState('')
  const [theatres, setTheatres] = useState([])
  const [theatreFilter, setTheatreFilter] = useState('')
  const [rangeDays, setRangeDays] = useState(3)
  const [bookings, setBookings] = useState([])
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

  const loadTheatres = useCallback(async () => {
    if (!clinicId) return
    const { data } = await client.query({ query: THEATRES_QUERY, variables: { clinic_id: clinicId }, fetchPolicy: 'network-only' })
    setTheatres(data?.operationTheatres ?? [])
  }, [client, clinicId])

  const loadSchedule = useCallback(async () => {
    if (!clinicId) return
    setLoading(true)
    setLoadError(null)
    try {
      const from = new Date()
      from.setHours(0, 0, 0, 0)
      const to = new Date(from.getTime() + rangeDays * 86_400_000)
      const { data, errors } = await client.query({
        query: SCHEDULE_QUERY,
        variables: { theatre_id: theatreFilter || undefined, clinic_id: clinicId, from: from.toISOString(), to: to.toISOString() },
        fetchPolicy: 'network-only',
      })
      if (errors?.length) throw new Error(errors[0].message)
      setBookings(data?.otSchedule ?? [])
    } catch (err) {
      setLoadError(err.message)
    } finally {
      setLoading(false)
    }
  }, [client, clinicId, theatreFilter, rangeDays])

  useEffect(() => {
    loadClinics()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => {
    if (clinicId) {
      loadTheatres()
      loadSchedule()
    }
  }, [clinicId, loadTheatres, loadSchedule])

  // ── Theatre management ───────────────────────────────────────────────
  const [theatreDialogOpen, setTheatreDialogOpen] = useState(false)
  const [newTheatreName, setNewTheatreName] = useState('')
  const [newTheatreTurnaround, setNewTheatreTurnaround] = useState('30')
  const [theatreSubmitting, setTheatreSubmitting] = useState(false)

  const handleCreateTheatre = async () => {
    if (!newTheatreName.trim()) return
    setTheatreSubmitting(true)
    try {
      await client.mutate({
        mutation: CREATE_THEATRE,
        variables: { input: { clinic_id: clinicId, name: newTheatreName.trim(), default_turnaround_minutes: Number(newTheatreTurnaround) || 30 } },
      })
      showSuccess('Theatre added.')
      setNewTheatreName('')
      await loadTheatres()
    } catch (err) {
      setActionError(err.message)
    } finally {
      setTheatreSubmitting(false)
    }
  }

  // ── New booking ───────────────────────────────────────────────────────
  const [bookOpen, setBookOpen] = useState(false)
  const [liveAdmissions, setLiveAdmissions] = useState([])
  const [clinicians, setClinicians] = useState([])
  const [bookDraft, setBookDraft] = useState({ admission_id: '', theatre_id: '', procedure_name: '', primary_surgeon_clinician_id: '', anesthetist_clinician_id: '', start_at: '', end_at: '' })
  const [bookSubmitting, setBookSubmitting] = useState(false)

  const openBookDialog = async () => {
    setBookDraft({ admission_id: '', theatre_id: '', procedure_name: '', primary_surgeon_clinician_id: '', anesthetist_clinician_id: '', start_at: '', end_at: '' })
    setBookOpen(true)
    const [{ data: admData }, { data: clinData }] = await Promise.all([
      client.query({ query: LIVE_ADMISSIONS_QUERY, variables: { clinic_id: clinicId }, fetchPolicy: 'network-only' }),
      client.query({ query: CLINICIANS_LEAN_QUERY, variables: { clinic_id: clinicId }, fetchPolicy: 'network-only' }),
    ])
    setLiveAdmissions(admData?.admissions ?? [])
    setClinicians(clinData?.clinicians?.data ?? [])
  }

  const handleCreateBooking = async () => {
    if (!bookDraft.admission_id || !bookDraft.theatre_id || !bookDraft.procedure_name || !bookDraft.primary_surgeon_clinician_id || !bookDraft.start_at || !bookDraft.end_at) {
      setActionError('Fill in every required field.')
      return
    }
    setBookSubmitting(true)
    try {
      await client.mutate({
        mutation: CREATE_BOOKING,
        variables: {
          input: {
            admission_id: bookDraft.admission_id,
            theatre_id: bookDraft.theatre_id,
            procedure_name: bookDraft.procedure_name,
            primary_surgeon_clinician_id: bookDraft.primary_surgeon_clinician_id,
            anesthetist_clinician_id: bookDraft.anesthetist_clinician_id || undefined,
            start_at: new Date(bookDraft.start_at).toISOString(),
            end_at: new Date(bookDraft.end_at).toISOString(),
          },
        },
      })
      showSuccess('OT booking created.')
      setBookOpen(false)
      await loadSchedule()
    } catch (err) {
      setActionError(err.message)
    } finally {
      setBookSubmitting(false)
    }
  }

  // ── Detail dialog ─────────────────────────────────────────────────────
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailBooking, setDetailBooking] = useState(null)
  const [detailNote, setDetailNote] = useState(null)
  const [detailTab, setDetailTab] = useState(0)
  const [noteDraft, setNoteDraft] = useState({})

  const openDetail = async (bookingId) => {
    setDetailOpen(true)
    setDetailTab(0)
    const { data } = await client.query({ query: BOOKING_DETAIL_QUERY, variables: { id: bookingId }, fetchPolicy: 'network-only' })
    setDetailBooking(data?.otBooking ?? null)
    setDetailNote(data?.otNote ?? null)
    setNoteDraft(data?.otNote ?? {})
  }
  const refreshDetail = async () => {
    if (detailBooking) await openDetail(detailBooking.id)
    await loadSchedule()
  }

  const handleStart = async () => {
    try {
      await client.mutate({ mutation: START_BOOKING, variables: { id: detailBooking.id } })
      showSuccess('Case started.')
      await refreshDetail()
    } catch (err) {
      setActionError(err.message)
    }
  }
  const handleComplete = async () => {
    try {
      await client.mutate({ mutation: COMPLETE_BOOKING, variables: { id: detailBooking.id } })
      showSuccess('Case completed.')
      await refreshDetail()
    } catch (err) {
      setActionError(err.message)
    }
  }
  const [cancelReason, setCancelReason] = useState('')
  const [cancelOpen, setCancelOpen] = useState(false)
  const handleCancel = async () => {
    if (!cancelReason.trim()) return
    try {
      const { data } = await client.mutate({ mutation: CANCEL_BOOKING, variables: { input: { booking_id: detailBooking.id, reason: cancelReason.trim() } } })
      if (!data.cancelOtBooking.success) throw new Error(data.cancelOtBooking.userErrors?.[0]?.message || 'Failed to cancel')
      showSuccess('Booking cancelled.')
      setCancelOpen(false)
      setCancelReason('')
      setDetailOpen(false)
      await loadSchedule()
    } catch (err) {
      setActionError(err.message)
    }
  }

  // ── Checklist ─────────────────────────────────────────────────────────
  const [checklistDraft, setChecklistDraft] = useState({})
  const openChecklistPhase = (phase) => {
    const template = CHECKLIST_PHASES.find((p) => p.phase === phase)
    setChecklistDraft({ phase, items: template.items.map((i) => ({ ...i, checked: false })) })
  }
  const handleSubmitChecklist = async () => {
    try {
      await client.mutate({
        mutation: COMPLETE_CHECKLIST,
        variables: { input: { booking_id: detailBooking.id, phase: checklistDraft.phase, items: checklistDraft.items.map(({ key, label, checked }) => ({ key, label, checked })) } },
      })
      showSuccess('Checklist phase recorded.')
      setChecklistDraft({})
      await refreshDetail()
    } catch (err) {
      setActionError(err.message)
    }
  }

  // ── Operative note ────────────────────────────────────────────────────
  const handleSaveNote = async () => {
    try {
      if (detailNote) {
        await client.mutate({ mutation: UPDATE_NOTE, variables: { booking_id: detailBooking.id, input: noteDraft } })
      } else {
        await client.mutate({ mutation: CREATE_NOTE, variables: { input: { booking_id: detailBooking.id, ...noteDraft } } })
      }
      showSuccess('Operative note saved.')
      await refreshDetail()
    } catch (err) {
      setActionError(err.message)
    }
  }
  const handleSignNote = async () => {
    try {
      await client.mutate({ mutation: SIGN_NOTE, variables: { input: { booking_id: detailBooking.id } } })
      showSuccess('Operative note signed.')
      await refreshDetail()
    } catch (err) {
      setActionError(err.message)
    }
  }

  // ── Consumables ───────────────────────────────────────────────────────
  const [consumableOpen, setConsumableOpen] = useState(false)
  const [consumableSearch, setConsumableSearch] = useState('')
  const [consumableItemType, setConsumableItemType] = useState('consumable')
  const [consumableOptions, setConsumableOptions] = useState([])
  const [consumableDraft, setConsumableDraft] = useState({ drug_id: '', quantity: '1', implant_serial_no: '', batch_id: '' })
  const [batches, setBatches] = useState([])
  const [consumableSubmitting, setConsumableSubmitting] = useState(false)

  useEffect(() => {
    if (!consumableOpen || consumableSearch.length < 2) return
    const t = setTimeout(async () => {
      const { data } = await client.query({ query: DRUGS_QUERY, variables: { search: consumableSearch, item_type: consumableItemType }, fetchPolicy: 'network-only' })
      setConsumableOptions(data?.drugs ?? [])
    }, 300)
    return () => clearTimeout(t)
  }, [consumableSearch, consumableItemType, consumableOpen, client])

  const selectConsumableDrug = async (drugId) => {
    setConsumableDraft((d) => ({ ...d, drug_id: drugId, batch_id: '' }))
    const { data } = await client.query({ query: BATCHES_QUERY, variables: { clinic_id: clinicId }, fetchPolicy: 'network-only' })
    setBatches((data?.drugBatches ?? []).filter((b) => b.drug_id === drugId && b.quantity_remaining > 0))
  }
  const handleRecordConsumable = async () => {
    if (!consumableDraft.drug_id || !consumableDraft.quantity) {
      setActionError('Choose an item and quantity.')
      return
    }
    setConsumableSubmitting(true)
    try {
      await client.mutate({
        mutation: RECORD_CONSUMABLE,
        variables: {
          input: {
            booking_id: detailBooking.id,
            drug_id: consumableDraft.drug_id,
            quantity: Number(consumableDraft.quantity),
            implant_serial_no: consumableDraft.implant_serial_no || undefined,
            batch_id: consumableDraft.batch_id || undefined,
          },
        },
      })
      showSuccess('Consumable recorded.')
      setConsumableOpen(false)
      setConsumableSearch('')
      setConsumableOptions([])
      setConsumableDraft({ drug_id: '', quantity: '1', implant_serial_no: '', batch_id: '' })
      await refreshDetail()
    } catch (err) {
      setActionError(err.message)
    } finally {
      setConsumableSubmitting(false)
    }
  }

  if (loading && bookings.length === 0)
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
            Operation Theatre
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Schedule, checklist and operative notes
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
          <TextField select size="small" label="Theatre" value={theatreFilter} onChange={(e) => setTheatreFilter(e.target.value)} sx={{ minWidth: 160 }}>
            <MenuItem value="">All theatres</MenuItem>
            {theatres.map((t) => (
              <MenuItem key={t.id} value={t.id}>
                {t.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField select size="small" label="Window" value={rangeDays} onChange={(e) => setRangeDays(Number(e.target.value))} sx={{ minWidth: 130 }}>
            <MenuItem value={1}>Today</MenuItem>
            <MenuItem value={3}>Next 3 days</MenuItem>
            <MenuItem value={7}>Next 7 days</MenuItem>
          </TextField>
          <Button variant="outlined" startIcon={<MeetingRoomIcon />} onClick={() => setTheatreDialogOpen(true)}>
            Theatres
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openBookDialog} disabled={!clinicId || theatres.length === 0}>
            New Booking
          </Button>
        </Stack>
      </Stack>

      {loadError && (
        <Alert severity="warning" sx={{ mb: 2 }} action={<Button size="small" onClick={loadSchedule}>Retry</Button>}>
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
                {['Theatre', 'Patient', 'Procedure', 'Surgeon', 'Start', 'End', 'Status', ''].map((h) => (
                  <Box key={h} component="th" sx={{ px: 2, py: 1.5, textAlign: 'left', typography: 'caption', fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid', borderColor: 'divider' }}>
                    {h}
                  </Box>
                ))}
              </Box>
            </Box>
            <Box component="tbody">
              {bookings.length === 0 && (
                <Box component="tr">
                  <Box component="td" colSpan={8} sx={{ textAlign: 'center', py: 6 }}>
                    <MeetingRoomIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1, display: 'block', mx: 'auto' }} />
                    <Typography color="text.secondary">No bookings in this window</Typography>
                  </Box>
                </Box>
              )}
              {bookings.map((b) => (
                <Box component="tr" key={b.id} onClick={() => openDetail(b.id)} sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'grey.50' }, borderBottom: '1px solid', borderColor: 'divider' }}>
                  <Box component="td" sx={{ px: 2, py: 1.5 }}>{b.theatre_name}</Box>
                  <Box component="td" sx={{ px: 2, py: 1.5 }}>{b.patient_name}</Box>
                  <Box component="td" sx={{ px: 2, py: 1.5 }}>{b.procedure_name}</Box>
                  <Box component="td" sx={{ px: 2, py: 1.5 }}>{b.primary_surgeon_name}</Box>
                  <Box component="td" sx={{ px: 2, py: 1.5 }}>{formatDateTime(b.start_at)}</Box>
                  <Box component="td" sx={{ px: 2, py: 1.5 }}>{formatDateTime(b.end_at)}</Box>
                  <Box component="td" sx={{ px: 2, py: 1.5 }}><StatusChip status={b.status} /></Box>
                  <Box component="td" sx={{ px: 2, py: 1.5 }} />
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
      </Card>

      {/* ── Theatre management ────────────────────────────────────────── */}
      <Dialog open={theatreDialogOpen} onClose={() => setTheatreDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle fontWeight={700}>Theatres</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={1} mb={2}>
            {theatres.map((t) => (
              <Stack key={t.id} direction="row" justifyContent="space-between" sx={{ py: 0.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                <Typography variant="body2">{t.name}</Typography>
                <Typography variant="caption" color="text.secondary">{t.default_turnaround_minutes}min turnaround</Typography>
              </Stack>
            ))}
            {theatres.length === 0 && <Typography variant="body2" color="text.secondary">No theatres yet.</Typography>}
          </Stack>
          <Divider sx={{ mb: 2 }} />
          <Stack spacing={2}>
            <TextField fullWidth size="small" label="New theatre name" value={newTheatreName} onChange={(e) => setNewTheatreName(e.target.value)} />
            <TextField fullWidth size="small" type="number" label="Default turnaround (minutes)" value={newTheatreTurnaround} onChange={(e) => setNewTheatreTurnaround(e.target.value)} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setTheatreDialogOpen(false)}>Close</Button>
          <Button variant="contained" disabled={!newTheatreName.trim() || theatreSubmitting} onClick={handleCreateTheatre}>
            {theatreSubmitting ? 'Adding…' : 'Add Theatre'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── New booking ───────────────────────────────────────────────── */}
      <Dialog open={bookOpen} onClose={() => setBookOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle fontWeight={700}>New OT Booking</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField select fullWidth required size="small" label="Patient (live admission)" value={bookDraft.admission_id} onChange={(e) => setBookDraft((d) => ({ ...d, admission_id: e.target.value }))}>
                {liveAdmissions.map((a) => (
                  <MenuItem key={a.id} value={a.id}>
                    {a.patient.full_name} — {a.admission_number}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField select fullWidth required size="small" label="Theatre" value={bookDraft.theatre_id} onChange={(e) => setBookDraft((d) => ({ ...d, theatre_id: e.target.value }))}>
                {theatres.map((t) => (
                  <MenuItem key={t.id} value={t.id}>
                    {t.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth required size="small" label="Procedure" value={bookDraft.procedure_name} onChange={(e) => setBookDraft((d) => ({ ...d, procedure_name: e.target.value }))} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField select fullWidth required size="small" label="Primary surgeon" value={bookDraft.primary_surgeon_clinician_id} onChange={(e) => setBookDraft((d) => ({ ...d, primary_surgeon_clinician_id: e.target.value }))}>
                {clinicians.map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.full_name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField select fullWidth size="small" label="Anesthetist (optional)" value={bookDraft.anesthetist_clinician_id} onChange={(e) => setBookDraft((d) => ({ ...d, anesthetist_clinician_id: e.target.value }))}>
                <MenuItem value="">None</MenuItem>
                {clinicians.map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.full_name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth required size="small" type="datetime-local" label="Start" InputLabelProps={{ shrink: true }} value={bookDraft.start_at} onChange={(e) => setBookDraft((d) => ({ ...d, start_at: e.target.value }))} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth required size="small" type="datetime-local" label="End" InputLabelProps={{ shrink: true }} value={bookDraft.end_at} onChange={(e) => setBookDraft((d) => ({ ...d, end_at: e.target.value }))} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setBookOpen(false)}>Cancel</Button>
          <Button variant="contained" disabled={bookSubmitting} onClick={handleCreateBooking}>
            {bookSubmitting ? 'Booking…' : 'Create Booking'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Detail ────────────────────────────────────────────────────── */}
      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle fontWeight={700}>
          {detailBooking?.procedure_name} — {detailBooking?.patient_name}
        </DialogTitle>
        <DialogContent dividers>
          {detailBooking && (
            <Stack spacing={2}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
                <StatusChip status={detailBooking.status} />
                <Typography variant="caption" color="text.secondary">
                  {detailBooking.theatre_name} · {formatDateTime(detailBooking.start_at)} → {formatDateTime(detailBooking.end_at)}
                </Typography>
              </Stack>
              <Divider />

              <Tabs value={detailTab} onChange={(_e, v) => setDetailTab(v)} variant="scrollable" scrollButtons="auto">
                <Tab label="Overview" />
                <Tab label="WHO Checklist" />
                <Tab label="Operative Note" />
                <Tab label="Consumables" />
              </Tabs>

              {detailTab === 0 && (
                <Grid container spacing={1.5}>
                  {[
                    ['Surgeon', detailBooking.primary_surgeon_name],
                    ['Anesthetist', detailBooking.anesthetist_name || '—'],
                    ['Admission', detailBooking.admission_number],
                    ['Turnaround', `${detailBooking.turnaround_minutes} min`],
                  ].map(([label, value]) => (
                    <Grid item xs={6} key={label}>
                      <Typography variant="caption" color="text.secondary" display="block">{label}</Typography>
                      <Typography variant="body2">{value}</Typography>
                    </Grid>
                  ))}
                  {detailBooking.staff.length > 0 && (
                    <Grid item xs={12}>
                      <Typography variant="caption" color="text.secondary" display="block">Team</Typography>
                      <Stack direction="row" spacing={1} flexWrap="wrap" mt={0.5}>
                        {detailBooking.staff.map((s) => (
                          <Chip key={s.id} size="small" label={`${s.user_name} — ${s.role.replace(/_/g, ' ')}`} />
                        ))}
                      </Stack>
                    </Grid>
                  )}
                </Grid>
              )}

              {detailTab === 1 && (
                <Stack spacing={2}>
                  {CHECKLIST_PHASES.map((p) => {
                    const existing = detailBooking.checklists.find((c) => c.phase === p.phase)
                    return (
                      <Box key={p.phase} sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Typography variant="body2" fontWeight={600}>{p.label}</Typography>
                          {existing?.completed_at ? (
                            <Chip size="small" icon={<CheckCircleIcon />} label={`Done · ${existing.completed_by_name}`} color="success" />
                          ) : (
                            <Button size="small" onClick={() => openChecklistPhase(p.phase)}>Complete</Button>
                          )}
                        </Stack>
                      </Box>
                    )
                  })}
                  {checklistDraft.phase && (
                    <Box sx={{ p: 1.5, border: '1px solid', borderColor: 'primary.main', borderRadius: 1 }}>
                      <Typography variant="body2" fontWeight={600} mb={1}>
                        {CHECKLIST_PHASES.find((p) => p.phase === checklistDraft.phase).label}
                      </Typography>
                      <Stack spacing={0.5}>
                        {checklistDraft.items.map((item, i) => (
                          <FormControlLabel
                            key={item.key}
                            control={
                              <Checkbox
                                checked={item.checked}
                                onChange={(e) =>
                                  setChecklistDraft((d) => ({ ...d, items: d.items.map((it, idx) => (idx === i ? { ...it, checked: e.target.checked } : it)) }))
                                }
                              />
                            }
                            label={item.label}
                          />
                        ))}
                      </Stack>
                      <Stack direction="row" spacing={1} mt={1}>
                        <Button size="small" onClick={() => setChecklistDraft({})}>Cancel</Button>
                        <Button size="small" variant="contained" onClick={handleSubmitChecklist}>Save Phase</Button>
                      </Stack>
                    </Box>
                  )}
                </Stack>
              )}

              {detailTab === 2 && (
                <Stack spacing={2}>
                  {detailNote?.locked ? (
                    <Alert severity="success" icon={<LockIcon />}>
                      Signed by {detailNote.author_name} — {formatDateTime(detailNote.signed_at)}
                    </Alert>
                  ) : null}
                  {[
                    ['pre_op_diagnosis', 'Pre-op diagnosis'],
                    ['procedure_performed', 'Procedure performed'],
                    ['findings', 'Findings'],
                    ['complications', 'Complications'],
                    ['post_op_diagnosis', 'Post-op diagnosis'],
                    ['post_op_instructions', 'Post-op instructions'],
                  ].map(([key, label]) => (
                    <TextField
                      key={key}
                      fullWidth
                      multiline
                      minRows={2}
                      size="small"
                      label={label}
                      value={noteDraft[key] || ''}
                      disabled={!!detailNote?.locked}
                      onChange={(e) => setNoteDraft((d) => ({ ...d, [key]: e.target.value }))}
                    />
                  ))}
                  {!detailNote?.locked && (
                    <Stack direction="row" spacing={1}>
                      <Button size="small" onClick={handleSaveNote}>Save</Button>
                      <Button size="small" variant="contained" onClick={handleSignNote}>Sign</Button>
                    </Stack>
                  )}
                </Stack>
              )}

              {detailTab === 3 && (
                <Stack spacing={1.5}>
                  <Button size="small" startIcon={<AddIcon />} onClick={() => setConsumableOpen(true)} sx={{ alignSelf: 'flex-start' }}>
                    Record Consumable
                  </Button>
                  {detailBooking.consumables.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">No consumables recorded yet.</Typography>
                  ) : (
                    detailBooking.consumables.map((c) => (
                      <Stack key={c.id} direction="row" justifyContent="space-between" sx={{ py: 0.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                        <Typography variant="body2">
                          {c.drug_name} × {c.quantity}
                          {c.implant_serial_no ? ` (SN: ${c.implant_serial_no})` : ''}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">{formatDateTime(c.created_at)} · {c.recorded_by_name}</Typography>
                      </Stack>
                    ))
                  )}
                </Stack>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, flexWrap: 'wrap', gap: 1 }}>
          <Button onClick={() => setDetailOpen(false)}>Close</Button>
          {detailBooking?.status === 'scheduled' && (
            <>
              <Button onClick={handleStart}>Start Case</Button>
              <Button color="error" startIcon={<WarningAmberIcon />} onClick={() => setCancelOpen(true)}>Cancel</Button>
            </>
          )}
          {detailBooking?.status === 'in_progress' && <Button variant="contained" onClick={handleComplete}>Complete Case</Button>}
        </DialogActions>
      </Dialog>

      {/* ── Cancel ────────────────────────────────────────────────────── */}
      <Dialog open={cancelOpen} onClose={() => setCancelOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningAmberIcon color="warning" />
          Cancel Booking
        </DialogTitle>
        <DialogContent dividers>
          <TextField fullWidth required multiline minRows={2} size="small" label="Reason" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} />
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setCancelOpen(false)}>Back</Button>
          <Button variant="contained" color="error" disabled={!cancelReason.trim()} onClick={handleCancel}>
            Confirm Cancellation
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Record consumable ────────────────────────────────────────── */}
      <Dialog open={consumableOpen} onClose={() => setConsumableOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle fontWeight={700}>Record Consumable</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <TextField select fullWidth size="small" label="Item type" value={consumableItemType} onChange={(e) => { setConsumableItemType(e.target.value); setConsumableOptions([]) }}>
              {ITEM_TYPES.map((t) => (
                <MenuItem key={t} value={t} sx={{ textTransform: 'capitalize' }}>{t.replace(/_/g, ' ')}</MenuItem>
              ))}
            </TextField>
            <TextField
              fullWidth
              size="small"
              label="Search item"
              value={consumableSearch}
              onChange={(e) => setConsumableSearch(e.target.value)}
              placeholder="Type at least 2 characters"
              helperText={consumableDraft.drug_id ? `Selected: ${consumableOptions.find((d) => d.id === consumableDraft.drug_id)?.name || ''}` : undefined}
            />
            <Stack spacing={0.5} sx={{ maxHeight: 120, overflowY: 'auto' }}>
              {consumableOptions.map((d) => (
                <Button key={d.id} size="small" variant={consumableDraft.drug_id === d.id ? 'contained' : 'outlined'} onClick={() => selectConsumableDrug(d.id)} sx={{ justifyContent: 'flex-start' }}>
                  {d.name} {d.strength} ({d.form})
                </Button>
              ))}
            </Stack>
            <TextField fullWidth size="small" type="number" label="Quantity" value={consumableDraft.quantity} onChange={(e) => setConsumableDraft((d) => ({ ...d, quantity: e.target.value }))} />
            {batches.length > 0 && (
              <TextField select fullWidth size="small" label="Stock batch" value={consumableDraft.batch_id} onChange={(e) => setConsumableDraft((d) => ({ ...d, batch_id: e.target.value }))}>
                <MenuItem value="">Not tracked</MenuItem>
                {batches.map((b) => (
                  <MenuItem key={b.id} value={b.id}>{b.batch_number} ({b.quantity_remaining} left)</MenuItem>
                ))}
              </TextField>
            )}
            {consumableItemType === 'implant' && (
              <TextField fullWidth size="small" label="Implant serial number" value={consumableDraft.implant_serial_no} onChange={(e) => setConsumableDraft((d) => ({ ...d, implant_serial_no: e.target.value }))} />
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setConsumableOpen(false)}>Cancel</Button>
          <Button variant="contained" disabled={consumableSubmitting} onClick={handleRecordConsumable}>
            {consumableSubmitting ? 'Saving…' : 'Record'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
