import { useState, useEffect, useCallback, lazy, Suspense } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
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
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded'
import AddIcon from '@mui/icons-material/Add'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import LockIcon from '@mui/icons-material/Lock'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import { RichTextEditorSkeleton } from '../../components/shared/Skeletons'
import { formatDateTime } from '../../utils/dateTime'

const RichTextEditor = lazy(() => import('../../components/shared/RichTextEditor'))

// REQ179 (IPD slice 2). Page-local gql, no existing contract to match
// (a brand-new domain — ARCH-15 applies once one exists). Tablet-first
// tier (clinician/nursing charting), verified at 768/1024/1280.

const ADMISSION_HEADER_QUERY = gql`
  query NursingChartAdmission($id: ID!) {
    admission(id: $id) {
      id
      admission_number
      status
      patient { id full_name gender date_of_birth }
      current_bed { bed_id bed_number ward_id ward_name }
      attending_clinician { id full_name }
      is_critical
      is_mlc
    }
  }
`
const VITAL_CODES = ['height_cm', 'weight_kg', 'temperature_c', 'pulse_bpm', 'bp_systolic', 'bp_diastolic', 'spo2_percent']
const VITAL_LABELS = {
  height_cm: 'Height (cm)',
  weight_kg: 'Weight (kg)',
  temperature_c: 'Temp (°C)',
  pulse_bpm: 'Pulse (bpm)',
  bp_systolic: 'BP systolic',
  bp_diastolic: 'BP diastolic',
  spo2_percent: 'SpO2 (%)',
}
const VITALS_QUERY = gql`
  query NursingChartVitals($admission_id: ID!) {
    admissionVitals(admission_id: $admission_id) {
      id
      code
      value
      unit
      recorded_at
      shift
    }
  }
`
const RECORD_VITALS = gql`
  mutation RecordAdmissionVitals($input: RecordAdmissionVitalsInput!) {
    recordAdmissionVitals(input: $input) {
      id
    }
  }
`

const IO_QUERY = gql`
  query NursingChartIo($admission_id: ID!) {
    intakeOutputRecords(admission_id: $admission_id) {
      id
      direction
      category
      volume_ml
      recorded_at
      shift
      notes
      recorded_by_name
    }
    intakeOutputBalance(admission_id: $admission_id, window_hours: 24) {
      total_intake_ml
      total_output_ml
      balance_ml
      window_start
      window_end
    }
  }
`
const RECORD_IO = gql`
  mutation RecordIntakeOutput($input: RecordIntakeOutputInput!) {
    recordIntakeOutput(input: $input) {
      id
    }
  }
`
const IO_INTAKE_CATEGORIES = ['oral', 'iv', 'ryles_tube', 'blood_product', 'other_intake']
const IO_OUTPUT_CATEGORIES = ['urine', 'drain', 'vomitus', 'stool', 'ngt_aspirate', 'blood_loss', 'other_output']

const NOTES_QUERY = gql`
  query NursingChartNotes($admission_id: ID!) {
    admissionNotes(admission_id: $admission_id) {
      id
      note_kind
      content
      subjective
      objective
      assessment
      plan
      shift
      note_datetime
      author_name
      signed_at
      locked
      addenda {
        id
        content
        reason
        created_at
        author_name
      }
    }
  }
`
const CREATE_NOTE = gql`
  mutation CreateAdmissionNote($input: CreateAdmissionNoteInput!) {
    createAdmissionNote(input: $input) {
      id
    }
  }
`
const SIGN_NOTE = gql`
  mutation SignAdmissionNote($input: SignAdmissionNoteInput!) {
    signAdmissionNote(input: $input) {
      id
    }
  }
`
const ADD_ADDENDUM = gql`
  mutation AddAdmissionNoteAddendum($input: AddAdmissionNoteAddendumInput!) {
    addAdmissionNoteAddendum(input: $input) {
      id
    }
  }
`
const NOTE_KINDS = ['nursing_progress', 'doctor_round', 'nursing_assessment', 'incident', 'discharge_planning', 'physio', 'dietitian']

const HANDOVERS_QUERY = gql`
  query NursingChartHandovers($admission_id: ID!) {
    admissionHandovers(admission_id: $admission_id) {
      id
      ward_id
      ward_name
      from_shift
      to_shift
      handover_at
      situation
      background
      assessment
      recommendation
      pending_tasks
      from_user_name
      to_user_name
      acknowledged_at
    }
  }
`
const CREATE_HANDOVER = gql`
  mutation CreateShiftHandover($input: CreateShiftHandoverInput!) {
    createShiftHandover(input: $input) {
      id
    }
  }
`
const ACK_HANDOVER = gql`
  mutation AcknowledgeShiftHandover($input: AcknowledgeShiftHandoverInput!) {
    acknowledgeShiftHandover(input: $input) {
      id
    }
  }
`

const DRUGS_QUERY = gql`
  query NursingChartDrugs($search: String) {
    drugs(search: $search) {
      id
      name
      strength
      form
    }
  }
`
const BATCHES_QUERY = gql`
  query NursingChartBatches($clinic_id: ID) {
    drugBatches(clinic_id: $clinic_id) {
      id
      drug_id
      batch_number
      quantity_remaining
      expiry_date
    }
  }
`
const ORDERS_QUERY = gql`
  query NursingChartOrders($admission_id: ID!) {
    admissionMedicationOrders(admission_id: $admission_id, active_only: false) {
      id
      drug_id
      drug_name
      dose
      dose_unit
      route
      frequency
      schedule_times
      is_prn
      prn_indication
      status
      hold_reason
      is_high_alert
      instructions
      ordered_by_name
      start_at
      stop_at
    }
  }
`
const MAR_QUERY = gql`
  query NursingChartMar($admission_id: ID!) {
    admissionMar(admission_id: $admission_id) {
      id
      order_id
      drug_name
      dose
      route
      is_high_alert
      scheduled_at
      administered_at
      status
      dose_given
      administered_by_name
      witness_name
      notes
    }
  }
`
const CREATE_ORDER = gql`
  mutation CreateIpdMedicationOrder($input: CreateIpdMedicationOrderInput!) {
    createIpdMedicationOrder(input: $input) {
      id
    }
  }
`
const HOLD_ORDER = gql`
  mutation HoldIpdMedicationOrder($input: HoldIpdMedicationOrderInput!) {
    holdIpdMedicationOrder(input: $input) {
      id
    }
  }
`
const RESUME_ORDER = gql`
  mutation ResumeIpdMedicationOrder($order_id: ID!) {
    resumeIpdMedicationOrder(order_id: $order_id) {
      id
    }
  }
`
const STOP_ORDER = gql`
  mutation StopIpdMedicationOrder($input: StopIpdMedicationOrderInput!) {
    stopIpdMedicationOrder(input: $input) {
      id
    }
  }
`
const ADMINISTER = gql`
  mutation AdministerMedication($input: AdministerMedicationInput!) {
    administerMedication(input: $input) {
      id
    }
  }
`
const RECORD_PRN = gql`
  mutation RecordPrnAdministration($input: RecordPrnAdministrationInput!) {
    recordPrnAdministration(input: $input) {
      id
    }
  }
`
const ROUTES = ['po', 'iv', 'im', 'sc', 'sl', 'topical', 'inhaled', 'pr', 'ng']
const FREQUENCIES = ['OD', 'BD', 'TDS', 'QID', 'Q4H', 'Q6H', 'HS', 'STAT', 'SOS']
const MAR_STATUSES = ['given', 'held', 'refused', 'missed', 'not_available', 'self_administered']

const DISCHARGE_SUMMARY_QUERY = gql`
  query NursingChartDischargeSummary($admission_id: ID!) {
    dischargeSummary(admission_id: $admission_id) {
      id
      chief_complaint
      history
      examination_findings
      final_diagnosis
      course_in_hospital
      procedures_performed
      investigations_summary
      condition_at_discharge
      discharge_medications
      diet_advice
      follow_up_advice
      emergency_instructions
      prepared_by_name
      signed_by_name
      signed_at
      locked
    }
  }
`
const CREATE_DISCHARGE_SUMMARY = gql`
  mutation CreateDischargeSummary($input: CreateDischargeSummaryInput!) {
    createDischargeSummary(input: $input) {
      id
    }
  }
`
const UPDATE_DISCHARGE_SUMMARY = gql`
  mutation UpdateDischargeSummary($id: ID!, $input: UpdateDischargeSummaryInput!) {
    updateDischargeSummary(id: $id, input: $input) {
      id
    }
  }
`
const SIGN_DISCHARGE_SUMMARY = gql`
  mutation SignDischargeSummary($input: SignDischargeSummaryInput!) {
    signDischargeSummary(input: $input) {
      id
    }
  }
`

const SHIFTS = ['morning', 'evening', 'night']

function SectionCard({ title, action, children }) {
  return (
    <Card sx={{ p: 2.5, mb: 2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5} flexWrap="wrap" gap={1}>
        <Typography variant="subtitle1" fontWeight={700}>
          {title}
        </Typography>
        {action}
      </Stack>
      {children}
    </Card>
  )
}

export default function NursingChart() {
  const { admissionId } = useParams()
  const navigate = useNavigate()
  const client = useApolloClient()

  const [tab, setTab] = useState(0)
  const [admission, setAdmission] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)
  const [actionError, setActionError] = useState(null)

  const showSuccess = (msg) => {
    setSuccessMsg(msg)
    setTimeout(() => setSuccessMsg(null), 4000)
  }

  const loadHeader = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const { data, errors } = await client.query({ query: ADMISSION_HEADER_QUERY, variables: { id: admissionId }, fetchPolicy: 'network-only' })
      if (errors?.length) throw new Error(errors[0].message)
      if (!data?.admission) throw new Error('Admission not found')
      setAdmission(data.admission)
    } catch (err) {
      setLoadError(err.message)
    } finally {
      setLoading(false)
    }
  }, [client, admissionId])

  useEffect(() => {
    loadHeader()
  }, [loadHeader])

  // ── Vitals ────────────────────────────────────────────────────────────
  const [vitals, setVitals] = useState([])
  const [vitalsLoading, setVitalsLoading] = useState(false)
  const [vitalDraft, setVitalDraft] = useState({})
  const [vitalShift, setVitalShift] = useState('morning')
  const [vitalSubmitting, setVitalSubmitting] = useState(false)

  const loadVitals = useCallback(async () => {
    setVitalsLoading(true)
    try {
      const { data } = await client.query({ query: VITALS_QUERY, variables: { admission_id: admissionId }, fetchPolicy: 'network-only' })
      setVitals(data?.admissionVitals ?? [])
    } catch (err) {
      setActionError(err.message)
    } finally {
      setVitalsLoading(false)
    }
  }, [client, admissionId])

  const handleRecordVitals = async () => {
    const readings = VITAL_CODES.filter((c) => vitalDraft[c] !== undefined && vitalDraft[c] !== '').map((c) => ({
      code: c,
      value: Number(vitalDraft[c]),
    }))
    if (readings.length === 0) {
      setActionError('Enter at least one reading.')
      return
    }
    setVitalSubmitting(true)
    try {
      await client.mutate({ mutation: RECORD_VITALS, variables: { input: { admission_id: admissionId, shift: vitalShift, readings } } })
      showSuccess('Vitals recorded.')
      setVitalDraft({})
      await loadVitals()
    } catch (err) {
      setActionError(err.message)
    } finally {
      setVitalSubmitting(false)
    }
  }

  // Latest reading per code, for the summary strip.
  const latestVitals = VITAL_CODES.reduce((acc, code) => {
    const rows = vitals.filter((v) => v.code === code)
    if (rows.length > 0) acc[code] = rows[rows.length - 1]
    return acc
  }, {})

  // ── Intake / output ───────────────────────────────────────────────────
  const [ioRecords, setIoRecords] = useState([])
  const [ioBalance, setIoBalance] = useState(null)
  const [ioLoading, setIoLoading] = useState(false)
  const [ioDirection, setIoDirection] = useState('intake')
  const [ioCategory, setIoCategory] = useState('oral')
  const [ioVolume, setIoVolume] = useState('')
  const [ioShift, setIoShift] = useState('morning')
  const [ioNotes, setIoNotes] = useState('')
  const [ioSubmitting, setIoSubmitting] = useState(false)

  const loadIo = useCallback(async () => {
    setIoLoading(true)
    try {
      const { data } = await client.query({ query: IO_QUERY, variables: { admission_id: admissionId }, fetchPolicy: 'network-only' })
      setIoRecords(data?.intakeOutputRecords ?? [])
      setIoBalance(data?.intakeOutputBalance ?? null)
    } catch (err) {
      setActionError(err.message)
    } finally {
      setIoLoading(false)
    }
  }, [client, admissionId])

  useEffect(() => {
    setIoCategory(ioDirection === 'intake' ? 'oral' : 'urine')
  }, [ioDirection])

  const handleRecordIo = async () => {
    if (!ioVolume || Number(ioVolume) < 0) {
      setActionError('Enter a volume in mL.')
      return
    }
    setIoSubmitting(true)
    try {
      await client.mutate({
        mutation: RECORD_IO,
        variables: { input: { admission_id: admissionId, direction: ioDirection, category: ioCategory, volume_ml: Number(ioVolume), shift: ioShift, notes: ioNotes || undefined } },
      })
      showSuccess('Intake/output recorded.')
      setIoVolume('')
      setIoNotes('')
      await loadIo()
    } catch (err) {
      setActionError(err.message)
    } finally {
      setIoSubmitting(false)
    }
  }

  // ── Admission notes ───────────────────────────────────────────────────
  const [notes, setNotes] = useState([])
  const [notesLoading, setNotesLoading] = useState(false)
  const [noteOpen, setNoteOpen] = useState(false)
  const [noteKind, setNoteKind] = useState('nursing_progress')
  const [noteShift, setNoteShift] = useState('morning')
  const [noteContent, setNoteContent] = useState('')
  const [noteSoap, setNoteSoap] = useState({ subjective: '', objective: '', assessment: '', plan: '' })
  const [noteSubmitting, setNoteSubmitting] = useState(false)
  const [addendumOpen, setAddendumOpen] = useState(false)
  const [addendumTarget, setAddendumTarget] = useState(null)
  const [addendumContent, setAddendumContent] = useState('')
  const [addendumReason, setAddendumReason] = useState('')
  const [addendumSubmitting, setAddendumSubmitting] = useState(false)

  const loadNotes = useCallback(async () => {
    setNotesLoading(true)
    try {
      const { data } = await client.query({ query: NOTES_QUERY, variables: { admission_id: admissionId }, fetchPolicy: 'network-only' })
      setNotes(data?.admissionNotes ?? [])
    } catch (err) {
      setActionError(err.message)
    } finally {
      setNotesLoading(false)
    }
  }, [client, admissionId])

  const openNoteDialog = () => {
    setNoteKind('nursing_progress')
    setNoteShift('morning')
    setNoteContent('')
    setNoteSoap({ subjective: '', objective: '', assessment: '', plan: '' })
    setNoteOpen(true)
  }
  const isSoapKind = noteKind === 'doctor_round'
  const handleCreateNote = async () => {
    setNoteSubmitting(true)
    try {
      await client.mutate({
        mutation: CREATE_NOTE,
        variables: {
          input: {
            admission_id: admissionId,
            note_kind: noteKind,
            shift: noteShift,
            ...(isSoapKind ? noteSoap : { content: noteContent }),
          },
        },
      })
      showSuccess('Note saved.')
      setNoteOpen(false)
      await loadNotes()
    } catch (err) {
      setActionError(err.message)
    } finally {
      setNoteSubmitting(false)
    }
  }
  const handleSignNote = async (noteId) => {
    try {
      await client.mutate({ mutation: SIGN_NOTE, variables: { input: { note_id: noteId } } })
      showSuccess('Note signed and locked.')
      await loadNotes()
    } catch (err) {
      setActionError(err.message)
    }
  }
  const openAddendum = (note) => {
    setAddendumTarget(note)
    setAddendumContent('')
    setAddendumReason('')
    setAddendumOpen(true)
  }
  const handleAddendum = async () => {
    if (!addendumContent.trim()) return
    setAddendumSubmitting(true)
    try {
      await client.mutate({
        mutation: ADD_ADDENDUM,
        variables: { input: { note_id: addendumTarget.id, content: addendumContent.trim(), reason: addendumReason || undefined } },
      })
      showSuccess('Addendum added.')
      setAddendumOpen(false)
      await loadNotes()
    } catch (err) {
      setActionError(err.message)
    } finally {
      setAddendumSubmitting(false)
    }
  }

  // ── Shift handover (SBAR) ─────────────────────────────────────────────
  const [handovers, setHandovers] = useState([])
  const [handoversLoading, setHandoversLoading] = useState(false)
  const [handoverOpen, setHandoverOpen] = useState(false)
  const [handoverDraft, setHandoverDraft] = useState({ from_shift: 'morning', to_shift: 'evening', situation: '', background: '', assessment: '', recommendation: '', pending_tasks: '' })
  const [handoverSubmitting, setHandoverSubmitting] = useState(false)

  const loadHandovers = useCallback(async () => {
    setHandoversLoading(true)
    try {
      const { data } = await client.query({ query: HANDOVERS_QUERY, variables: { admission_id: admissionId }, fetchPolicy: 'network-only' })
      setHandovers(data?.admissionHandovers ?? [])
    } catch (err) {
      setActionError(err.message)
    } finally {
      setHandoversLoading(false)
    }
  }, [client, admissionId])

  const handleCreateHandover = async () => {
    if (!admission?.current_bed?.ward_id) {
      setActionError('No current ward on this admission.')
      return
    }
    setHandoverSubmitting(true)
    try {
      await client.mutate({
        mutation: CREATE_HANDOVER,
        variables: { input: { admission_id: admissionId, ward_id: admission.current_bed.ward_id, ...handoverDraft } },
      })
      showSuccess('Handover recorded.')
      setHandoverOpen(false)
      setHandoverDraft({ from_shift: 'morning', to_shift: 'evening', situation: '', background: '', assessment: '', recommendation: '', pending_tasks: '' })
      await loadHandovers()
    } catch (err) {
      setActionError(err.message)
    } finally {
      setHandoverSubmitting(false)
    }
  }
  const handleAckHandover = async (id) => {
    try {
      await client.mutate({ mutation: ACK_HANDOVER, variables: { input: { handover_id: id } } })
      showSuccess('Handover acknowledged.')
      await loadHandovers()
    } catch (err) {
      setActionError(err.message)
    }
  }

  // ── Medication orders + MAR ───────────────────────────────────────────
  const [orders, setOrders] = useState([])
  const [mar, setMar] = useState([])
  const [medsLoading, setMedsLoading] = useState(false)
  const [orderOpen, setOrderOpen] = useState(false)
  const [drugOptions, setDrugOptions] = useState([])
  const [drugSearch, setDrugSearch] = useState('')
  const [orderDraft, setOrderDraft] = useState({ drug_id: '', dose: '', dose_unit: '', route: 'po', frequency: 'BD', schedule_times: '08:00,20:00', is_prn: false, prn_indication: '', is_high_alert: false, instructions: '' })
  const [orderSubmitting, setOrderSubmitting] = useState(false)
  const [administerTarget, setAdministerTarget] = useState(null)
  const [administerDraft, setAdministerDraft] = useState({ status: 'given', dose_given: '', route: '', witness_user_id: '', batch_id: '', notes: '' })
  const [administerSubmitting, setAdministerSubmitting] = useState(false)
  const [batches, setBatches] = useState([])

  const loadMeds = useCallback(async () => {
    setMedsLoading(true)
    try {
      const [{ data: orderData }, { data: marData }] = await Promise.all([
        client.query({ query: ORDERS_QUERY, variables: { admission_id: admissionId }, fetchPolicy: 'network-only' }),
        client.query({ query: MAR_QUERY, variables: { admission_id: admissionId }, fetchPolicy: 'network-only' }),
      ])
      setOrders(orderData?.admissionMedicationOrders ?? [])
      setMar(marData?.admissionMar ?? [])
    } catch (err) {
      setActionError(err.message)
    } finally {
      setMedsLoading(false)
    }
  }, [client, admissionId])

  const openOrderDialog = () => {
    setOrderDraft({ drug_id: '', dose: '', dose_unit: '', route: 'po', frequency: 'BD', schedule_times: '08:00,20:00', is_prn: false, prn_indication: '', is_high_alert: false, instructions: '' })
    setDrugSearch('')
    setDrugOptions([])
    setOrderOpen(true)
  }
  useEffect(() => {
    if (!orderOpen || drugSearch.length < 2) return
    const t = setTimeout(async () => {
      const { data } = await client.query({ query: DRUGS_QUERY, variables: { search: drugSearch }, fetchPolicy: 'network-only' })
      setDrugOptions(data?.drugs ?? [])
    }, 300)
    return () => clearTimeout(t)
  }, [drugSearch, orderOpen, client])

  const handleCreateOrder = async () => {
    if (!orderDraft.drug_id || !orderDraft.dose) {
      setActionError('Choose a drug and dose.')
      return
    }
    setOrderSubmitting(true)
    try {
      await client.mutate({
        mutation: CREATE_ORDER,
        variables: {
          input: {
            admission_id: admissionId,
            drug_id: orderDraft.drug_id,
            dose: orderDraft.dose,
            dose_unit: orderDraft.dose_unit || undefined,
            route: orderDraft.route,
            frequency: orderDraft.frequency,
            schedule_times: orderDraft.is_prn ? undefined : orderDraft.schedule_times.split(',').map((t) => t.trim()).filter(Boolean),
            is_prn: orderDraft.is_prn,
            prn_indication: orderDraft.is_prn ? orderDraft.prn_indication || undefined : undefined,
            is_high_alert: orderDraft.is_high_alert,
            instructions: orderDraft.instructions || undefined,
          },
        },
      })
      showSuccess('Medication order created.')
      setOrderOpen(false)
      await loadMeds()
    } catch (err) {
      setActionError(err.message)
    } finally {
      setOrderSubmitting(false)
    }
  }
  const handleHoldOrder = async (orderId) => {
    const reason = window.prompt('Reason for holding this order?')
    if (!reason) return
    try {
      await client.mutate({ mutation: HOLD_ORDER, variables: { input: { order_id: orderId, reason } } })
      showSuccess('Order held.')
      await loadMeds()
    } catch (err) {
      setActionError(err.message)
    }
  }
  const handleResumeOrder = async (orderId) => {
    try {
      await client.mutate({ mutation: RESUME_ORDER, variables: { order_id: orderId } })
      showSuccess('Order resumed.')
      await loadMeds()
    } catch (err) {
      setActionError(err.message)
    }
  }
  const handleStopOrder = async (orderId) => {
    if (!window.confirm('Stop this order? Future scheduled doses will be cancelled.')) return
    try {
      await client.mutate({ mutation: STOP_ORDER, variables: { input: { order_id: orderId } } })
      showSuccess('Order stopped.')
      await loadMeds()
    } catch (err) {
      setActionError(err.message)
    }
  }

  const openAdminister = async (marRow) => {
    setAdministerTarget(marRow)
    setAdministerDraft({ status: 'given', dose_given: marRow.dose || '', route: marRow.route || '', witness_user_id: '', batch_id: '', notes: '' })
    try {
      const { data: batchData } = await client.query({ query: BATCHES_QUERY, variables: {}, fetchPolicy: 'network-only' })
      setBatches((batchData?.drugBatches ?? []).filter((b) => b.drug_id === orders.find((o) => o.id === marRow.order_id)?.drug_id && b.quantity_remaining > 0))
    } catch {
      setBatches([])
    }
  }
  const handleAdminister = async () => {
    if (administerTarget.is_high_alert && administerDraft.status === 'given' && !administerDraft.witness_user_id) {
      setActionError('A witness is required for a high-alert medication.')
      return
    }
    setAdministerSubmitting(true)
    try {
      await client.mutate({
        mutation: ADMINISTER,
        variables: {
          input: {
            mar_id: administerTarget.id,
            status: administerDraft.status,
            dose_given: administerDraft.status === 'given' ? administerDraft.dose_given || undefined : undefined,
            route: administerDraft.route || undefined,
            hold_reason: administerDraft.status !== 'given' ? administerDraft.notes || undefined : undefined,
            witness_user_id: administerDraft.witness_user_id || undefined,
            batch_id: administerDraft.batch_id || undefined,
            notes: administerDraft.notes || undefined,
          },
        },
      })
      showSuccess('Dose recorded.')
      setAdministerTarget(null)
      await loadMeds()
    } catch (err) {
      setActionError(err.message)
    } finally {
      setAdministerSubmitting(false)
    }
  }
  const handlePrn = async (order) => {
    const doseGiven = window.prompt(`Dose given for ${order.drug_name} (PRN)?`, order.dose)
    if (!doseGiven) return
    try {
      await client.mutate({ mutation: RECORD_PRN, variables: { input: { order_id: order.id, status: 'given', dose_given: doseGiven, route: order.route } } })
      showSuccess('PRN dose recorded.')
      await loadMeds()
    } catch (err) {
      setActionError(err.message)
    }
  }

  // ── Discharge summary ─────────────────────────────────────────────────
  const [dischargeSummary, setDischargeSummary] = useState(null)
  const [dsLoading, setDsLoading] = useState(false)
  const [dsDraft, setDsDraft] = useState({})
  const [dsSaving, setDsSaving] = useState(false)

  const loadDischargeSummary = useCallback(async () => {
    setDsLoading(true)
    try {
      const { data } = await client.query({ query: DISCHARGE_SUMMARY_QUERY, variables: { admission_id: admissionId }, fetchPolicy: 'network-only' })
      setDischargeSummary(data?.dischargeSummary ?? null)
      setDsDraft(data?.dischargeSummary ?? {})
    } catch (err) {
      setActionError(err.message)
    } finally {
      setDsLoading(false)
    }
  }, [client, admissionId])

  const handleCreateDischargeSummary = async () => {
    setDsSaving(true)
    try {
      await client.mutate({ mutation: CREATE_DISCHARGE_SUMMARY, variables: { input: { admission_id: admissionId } } })
      showSuccess('Discharge summary created and pre-filled.')
      await loadDischargeSummary()
    } catch (err) {
      setActionError(err.message)
    } finally {
      setDsSaving(false)
    }
  }
  // Only the fields UpdateDischargeSummaryInput actually accepts — dsDraft
  // also carries read-only fields (id, locked, signed_by_name, ...) spread
  // in from the query response, which the mutation would reject outright
  // (the global ValidationPipe's forbidNonWhitelisted).
  const DISCHARGE_SUMMARY_EDITABLE_FIELDS = [
    'chief_complaint', 'history', 'examination_findings', 'final_diagnosis',
    'course_in_hospital', 'procedures_performed', 'investigations_summary',
    'condition_at_discharge', 'discharge_medications', 'diet_advice',
    'follow_up_advice', 'emergency_instructions',
  ]
  const handleSaveDischargeSummary = async () => {
    setDsSaving(true)
    try {
      const editable = Object.fromEntries(DISCHARGE_SUMMARY_EDITABLE_FIELDS.map((k) => [k, dsDraft[k] ?? '']))
      await client.mutate({ mutation: UPDATE_DISCHARGE_SUMMARY, variables: { id: dischargeSummary.id, input: editable } })
      showSuccess('Discharge summary saved.')
      await loadDischargeSummary()
    } catch (err) {
      setActionError(err.message)
    } finally {
      setDsSaving(false)
    }
  }
  const handleSignDischargeSummary = async () => {
    if (!window.confirm('Sign this discharge summary? Once signed it cannot be edited further.')) return
    setDsSaving(true)
    try {
      await client.mutate({ mutation: SIGN_DISCHARGE_SUMMARY, variables: { input: { discharge_summary_id: dischargeSummary.id } } })
      showSuccess('Discharge summary signed and locked.')
      await loadDischargeSummary()
    } catch (err) {
      setActionError(err.message)
    } finally {
      setDsSaving(false)
    }
  }

  // Load each tab's data lazily, once, when first visited.
  const [loadedTabs, setLoadedTabs] = useState({})
  useEffect(() => {
    if (!admission || loadedTabs[tab]) return
    const loaders = [loadVitals, loadMeds, loadIo, loadNotes, loadHandovers, loadDischargeSummary]
    loaders[tab]?.()
    setLoadedTabs((prev) => ({ ...prev, [tab]: true }))
  }, [tab, admission, loadedTabs, loadVitals, loadMeds, loadIo, loadNotes, loadHandovers, loadDischargeSummary])

  if (loading)
    return (
      <Box display="flex" justifyContent="center" py={6}>
        <CircularProgress />
      </Box>
    )
  if (loadError)
    return (
      <Alert severity="error" action={<Button size="small" onClick={loadHeader}>Retry</Button>}>
        Failed to load: {loadError}
      </Alert>
    )

  return (
    <Box>
      <Stack direction="row" alignItems="center" gap={1} mb={2}>
        <IconButton onClick={() => navigate('/ipd/admissions')} aria-label="Back to admissions">
          <ArrowBackRoundedIcon />
        </IconButton>
        <Box>
          <Typography variant="h5" fontWeight={700}>
            {admission.patient.full_name}
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            <Typography variant="body2" color="text.secondary">
              {admission.admission_number} · {admission.current_bed ? `${admission.current_bed.bed_number} (${admission.current_bed.ward_name})` : 'No bed'} · {admission.attending_clinician.full_name}
            </Typography>
            {admission.is_critical && <Chip size="small" label="Critical" color="warning" />}
          </Stack>
        </Box>
      </Stack>

      {successMsg && <Alert severity="success" sx={{ mb: 2 }}>{successMsg}</Alert>}
      {actionError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setActionError(null)}>
          {actionError}
        </Alert>
      )}

      <Tabs value={tab} onChange={(_e, v) => setTab(v)} variant="scrollable" scrollButtons="auto" sx={{ mb: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Tab label="Vitals" />
        <Tab label="Medications" />
        <Tab label="Intake / Output" />
        <Tab label="Notes" />
        <Tab label="Handover" />
        <Tab label="Discharge Summary" />
      </Tabs>

      {/* ── Vitals ────────────────────────────────────────────────────── */}
      {tab === 0 && (
        <Box>
          <SectionCard title="Latest readings">
            <Grid container spacing={1.5}>
              {VITAL_CODES.map((code) => (
                <Grid item xs={6} sm={4} md={3} key={code}>
                  <Typography variant="caption" color="text.secondary" display="block">
                    {VITAL_LABELS[code]}
                  </Typography>
                  <Typography variant="h6">{latestVitals[code] ? latestVitals[code].value : '—'}</Typography>
                </Grid>
              ))}
            </Grid>
          </SectionCard>
          <SectionCard title="Record vitals">
            <Grid container spacing={2}>
              <Grid item xs={12} sm={4} md={3}>
                <TextField select fullWidth size="small" label="Shift" value={vitalShift} onChange={(e) => setVitalShift(e.target.value)}>
                  {SHIFTS.map((s) => (
                    <MenuItem key={s} value={s} sx={{ textTransform: 'capitalize' }}>
                      {s}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              {VITAL_CODES.map((code) => (
                <Grid item xs={6} sm={4} md={3} key={code}>
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    label={VITAL_LABELS[code]}
                    value={vitalDraft[code] ?? ''}
                    onChange={(e) => setVitalDraft((d) => ({ ...d, [code]: e.target.value }))}
                  />
                </Grid>
              ))}
            </Grid>
            <Button sx={{ mt: 2 }} variant="contained" disabled={vitalSubmitting} onClick={handleRecordVitals}>
              {vitalSubmitting ? 'Saving…' : 'Save Readings'}
            </Button>
          </SectionCard>
          <SectionCard title="History">
            {vitalsLoading ? (
              <CircularProgress size={24} />
            ) : vitals.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No vitals recorded yet.
              </Typography>
            ) : (
              <Box sx={{ overflowX: 'auto' }}>
                <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
                  <Box component="thead">
                    <Box component="tr">
                      {['When', 'Shift', 'Code', 'Value', 'Unit'].map((h) => (
                        <Box key={h} component="th" sx={{ px: 1.5, py: 1, textAlign: 'left', typography: 'caption', fontWeight: 700, color: 'text.secondary', borderBottom: '1px solid', borderColor: 'divider' }}>
                          {h}
                        </Box>
                      ))}
                    </Box>
                  </Box>
                  <Box component="tbody">
                    {[...vitals].reverse().map((v) => (
                      <Box component="tr" key={v.id} sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
                        <Box component="td" sx={{ px: 1.5, py: 1 }}>{formatDateTime(v.recorded_at)}</Box>
                        <Box component="td" sx={{ px: 1.5, py: 1, textTransform: 'capitalize' }}>{v.shift || '—'}</Box>
                        <Box component="td" sx={{ px: 1.5, py: 1 }}>{VITAL_LABELS[v.code] || v.code}</Box>
                        <Box component="td" sx={{ px: 1.5, py: 1 }}>{v.value}</Box>
                        <Box component="td" sx={{ px: 1.5, py: 1 }}>{v.unit}</Box>
                      </Box>
                    ))}
                  </Box>
                </Box>
              </Box>
            )}
          </SectionCard>
        </Box>
      )}

      {/* ── Medications ───────────────────────────────────────────────── */}
      {tab === 1 && (
        <Box>
          <SectionCard title="Standing orders" action={<Button size="small" startIcon={<AddIcon />} onClick={openOrderDialog}>New Order</Button>}>
            {medsLoading ? (
              <CircularProgress size={24} />
            ) : orders.length === 0 ? (
              <Typography variant="body2" color="text.secondary">No medication orders yet.</Typography>
            ) : (
              <Stack spacing={1}>
                {orders.map((o) => (
                  <Box key={o.id} sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={1}>
                      <Box>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography variant="body2" fontWeight={600}>
                            {o.drug_name} — {o.dose}{o.dose_unit} {o.route.toUpperCase()} {o.frequency}
                          </Typography>
                          {o.is_high_alert && <Chip size="small" color="error" icon={<WarningAmberIcon />} label="High alert" />}
                          {o.is_prn && <Chip size="small" label="PRN" />}
                        </Stack>
                        <Typography variant="caption" color="text.secondary" display="block">
                          Ordered by {o.ordered_by_name} · {formatDateTime(o.start_at)}
                          {o.schedule_times?.length ? ` · ${o.schedule_times.join(', ')}` : ''}
                          {o.prn_indication ? ` · ${o.prn_indication}` : ''}
                        </Typography>
                        <Chip size="small" label={o.status.replace(/_/g, ' ')} sx={{ mt: 0.5, textTransform: 'capitalize' }} color={o.status === 'active' ? 'success' : o.status === 'held' ? 'warning' : 'default'} />
                      </Box>
                      <Stack direction="row" spacing={1}>
                        {o.is_prn && o.status === 'active' && (
                          <Button size="small" onClick={() => handlePrn(o)}>Give PRN</Button>
                        )}
                        {o.status === 'active' && <Button size="small" onClick={() => handleHoldOrder(o.id)}>Hold</Button>}
                        {o.status === 'held' && <Button size="small" onClick={() => handleResumeOrder(o.id)}>Resume</Button>}
                        {['active', 'held'].includes(o.status) && <Button size="small" color="error" onClick={() => handleStopOrder(o.id)}>Stop</Button>}
                      </Stack>
                    </Stack>
                  </Box>
                ))}
              </Stack>
            )}
          </SectionCard>
          <SectionCard title="MAR — administration record">
            {mar.length === 0 ? (
              <Typography variant="body2" color="text.secondary">No scheduled doses yet — the sweep materialises them ahead of time.</Typography>
            ) : (
              <Box sx={{ overflowX: 'auto' }}>
                <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
                  <Box component="thead">
                    <Box component="tr">
                      {['Scheduled', 'Drug', 'Status', ''].map((h) => (
                        <Box key={h} component="th" sx={{ px: 1.5, py: 1, textAlign: 'left', typography: 'caption', fontWeight: 700, color: 'text.secondary', borderBottom: '1px solid', borderColor: 'divider' }}>
                          {h}
                        </Box>
                      ))}
                    </Box>
                  </Box>
                  <Box component="tbody">
                    {mar.map((m) => (
                      <Box component="tr" key={m.id} sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
                        <Box component="td" sx={{ px: 1.5, py: 1 }}>{formatDateTime(m.scheduled_at)}</Box>
                        <Box component="td" sx={{ px: 1.5, py: 1 }}>
                          {m.drug_name} {m.dose} {m.route}
                          {m.is_high_alert && <Chip size="small" color="error" label="HA" sx={{ ml: 0.5, height: 18 }} />}
                        </Box>
                        <Box component="td" sx={{ px: 1.5, py: 1, textTransform: 'capitalize' }}>{m.status.replace(/_/g, ' ')}</Box>
                        <Box component="td" sx={{ px: 1.5, py: 1 }}>
                          {m.status === 'scheduled' && (
                            <Button size="small" onClick={() => openAdminister(m)}>Record</Button>
                          )}
                        </Box>
                      </Box>
                    ))}
                  </Box>
                </Box>
              </Box>
            )}
          </SectionCard>
        </Box>
      )}

      {/* ── Intake / Output ───────────────────────────────────────────── */}
      {tab === 2 && (
        <Box>
          {ioBalance && (
            <SectionCard title="24h balance">
              <Grid container spacing={2}>
                <Grid item xs={4}>
                  <Typography variant="caption" color="text.secondary" display="block">Intake</Typography>
                  <Typography variant="h6">{ioBalance.total_intake_ml} mL</Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="caption" color="text.secondary" display="block">Output</Typography>
                  <Typography variant="h6">{ioBalance.total_output_ml} mL</Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="caption" color="text.secondary" display="block">Balance</Typography>
                  <Typography variant="h6" color={ioBalance.balance_ml < 0 ? 'error.main' : 'text.primary'}>
                    {ioBalance.balance_ml > 0 ? '+' : ''}{ioBalance.balance_ml} mL
                  </Typography>
                </Grid>
              </Grid>
            </SectionCard>
          )}
          <SectionCard title="Record">
            <Grid container spacing={2}>
              <Grid item xs={6} sm={3}>
                <TextField select fullWidth size="small" label="Direction" value={ioDirection} onChange={(e) => setIoDirection(e.target.value)}>
                  <MenuItem value="intake">Intake</MenuItem>
                  <MenuItem value="output">Output</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={6} sm={3}>
                <TextField select fullWidth size="small" label="Category" value={ioCategory} onChange={(e) => setIoCategory(e.target.value)}>
                  {(ioDirection === 'intake' ? IO_INTAKE_CATEGORIES : IO_OUTPUT_CATEGORIES).map((c) => (
                    <MenuItem key={c} value={c} sx={{ textTransform: 'capitalize' }}>
                      {c.replace(/_/g, ' ')}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={6} sm={2}>
                <TextField fullWidth size="small" type="number" label="Volume (mL)" value={ioVolume} onChange={(e) => setIoVolume(e.target.value)} />
              </Grid>
              <Grid item xs={6} sm={2}>
                <TextField select fullWidth size="small" label="Shift" value={ioShift} onChange={(e) => setIoShift(e.target.value)}>
                  {SHIFTS.map((s) => (
                    <MenuItem key={s} value={s} sx={{ textTransform: 'capitalize' }}>
                      {s}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={2}>
                <TextField fullWidth size="small" label="Notes" value={ioNotes} onChange={(e) => setIoNotes(e.target.value)} />
              </Grid>
            </Grid>
            <Button sx={{ mt: 2 }} variant="contained" disabled={ioSubmitting} onClick={handleRecordIo}>
              {ioSubmitting ? 'Saving…' : 'Add Record'}
            </Button>
          </SectionCard>
          <SectionCard title="History">
            {ioLoading ? (
              <CircularProgress size={24} />
            ) : ioRecords.length === 0 ? (
              <Typography variant="body2" color="text.secondary">No records yet.</Typography>
            ) : (
              <Stack spacing={1}>
                {ioRecords.map((r) => (
                  <Stack key={r.id} direction="row" justifyContent="space-between" sx={{ py: 0.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                      {r.direction} — {r.category.replace(/_/g, ' ')} — {r.volume_ml} mL
                    </Typography>
                    <Typography variant="caption" color="text.secondary">{formatDateTime(r.recorded_at)} · {r.recorded_by_name}</Typography>
                  </Stack>
                ))}
              </Stack>
            )}
          </SectionCard>
        </Box>
      )}

      {/* ── Notes ─────────────────────────────────────────────────────── */}
      {tab === 3 && (
        <Box>
          <SectionCard title="Admission notes" action={<Button size="small" startIcon={<AddIcon />} onClick={openNoteDialog}>New Note</Button>}>
            {notesLoading ? (
              <CircularProgress size={24} />
            ) : notes.length === 0 ? (
              <Typography variant="body2" color="text.secondary">No notes yet.</Typography>
            ) : (
              <Stack spacing={1.5}>
                {notes.map((n) => (
                  <Box key={n.id} sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="body2" fontWeight={600} sx={{ textTransform: 'capitalize' }}>
                          {n.note_kind.replace(/_/g, ' ')}
                        </Typography>
                        {n.locked && <Chip size="small" icon={<LockIcon />} label="Signed" color="success" />}
                      </Stack>
                      <Typography variant="caption" color="text.secondary">{formatDateTime(n.note_datetime)} · {n.author_name}</Typography>
                    </Stack>
                    {n.note_kind === 'doctor_round' ? (
                      <Stack spacing={0.5} mt={1}>
                        {[['S', n.subjective], ['O', n.objective], ['A', n.assessment], ['P', n.plan]].map(([k, v]) =>
                          v ? <Typography key={k} variant="body2"><b>{k}:</b> {v}</Typography> : null,
                        )}
                      </Stack>
                    ) : (
                      <Typography variant="body2" mt={1}>{n.content}</Typography>
                    )}
                    {n.addenda?.length > 0 && (
                      <Stack spacing={0.5} mt={1} pl={1.5} sx={{ borderLeft: '2px solid', borderColor: 'divider' }}>
                        {n.addenda.map((a) => (
                          <Box key={a.id}>
                            <Typography variant="caption" color="text.secondary">Addendum · {formatDateTime(a.created_at)} · {a.author_name}</Typography>
                            <Typography variant="body2">{a.content}</Typography>
                          </Box>
                        ))}
                      </Stack>
                    )}
                    <Stack direction="row" spacing={1} mt={1}>
                      {!n.locked && <Button size="small" onClick={() => handleSignNote(n.id)}>Sign</Button>}
                      <Button size="small" onClick={() => openAddendum(n)}>Add Addendum</Button>
                    </Stack>
                  </Box>
                ))}
              </Stack>
            )}
          </SectionCard>
        </Box>
      )}

      {/* ── Handover ──────────────────────────────────────────────────── */}
      {tab === 4 && (
        <Box>
          <SectionCard title="Shift handovers (SBAR)" action={<Button size="small" startIcon={<AddIcon />} onClick={() => setHandoverOpen(true)}>New Handover</Button>}>
            {handoversLoading ? (
              <CircularProgress size={24} />
            ) : handovers.length === 0 ? (
              <Typography variant="body2" color="text.secondary">No handovers recorded yet.</Typography>
            ) : (
              <Stack spacing={1.5}>
                {handovers.map((h) => (
                  <Box key={h.id} sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
                      <Typography variant="body2" fontWeight={600} sx={{ textTransform: 'capitalize' }}>
                        {h.from_shift} → {h.to_shift}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">{formatDateTime(h.handover_at)} · {h.from_user_name}</Typography>
                    </Stack>
                    <Stack spacing={0.5} mt={1}>
                      {[['S', h.situation], ['B', h.background], ['A', h.assessment], ['R', h.recommendation]].map(([k, v]) =>
                        v ? <Typography key={k} variant="body2"><b>{k}:</b> {v}</Typography> : null,
                      )}
                      {h.pending_tasks && <Typography variant="body2"><b>Pending:</b> {h.pending_tasks}</Typography>}
                    </Stack>
                    {h.acknowledged_at ? (
                      <Chip size="small" icon={<CheckCircleIcon />} label={`Acknowledged by ${h.to_user_name || 'incoming staff'}`} color="success" sx={{ mt: 1 }} />
                    ) : (
                      <Button size="small" sx={{ mt: 1 }} onClick={() => handleAckHandover(h.id)}>Acknowledge</Button>
                    )}
                  </Box>
                ))}
              </Stack>
            )}
          </SectionCard>
        </Box>
      )}

      {/* ── Discharge Summary ─────────────────────────────────────────── */}
      {tab === 5 && (
        <Box>
          {dsLoading ? (
            <CircularProgress size={24} />
          ) : !dischargeSummary ? (
            <SectionCard title="Discharge summary">
              <Typography variant="body2" color="text.secondary" mb={2}>
                No discharge summary yet. Creating one pre-fills the course-in-hospital and medication list from this stay's real events.
              </Typography>
              <Button variant="contained" disabled={dsSaving} onClick={handleCreateDischargeSummary}>
                {dsSaving ? 'Creating…' : 'Create Discharge Summary'}
              </Button>
            </SectionCard>
          ) : (
            <SectionCard
              title="Discharge summary"
              action={
                dischargeSummary.locked ? (
                  <Chip size="small" icon={<LockIcon />} label={`Signed by ${dischargeSummary.signed_by_name}`} color="success" />
                ) : (
                  <Stack direction="row" spacing={1}>
                    <Button size="small" disabled={dsSaving} onClick={handleSaveDischargeSummary}>Save</Button>
                    <Button size="small" variant="contained" disabled={dsSaving} onClick={handleSignDischargeSummary}>Sign</Button>
                  </Stack>
                )
              }
            >
              <Stack spacing={2}>
                {[
                  ['chief_complaint', 'Chief complaint'],
                  ['history', 'History'],
                  ['examination_findings', 'Examination findings'],
                  ['final_diagnosis', 'Final diagnosis'],
                  ['course_in_hospital', 'Course in hospital'],
                  ['procedures_performed', 'Procedures performed'],
                  ['condition_at_discharge', 'Condition at discharge'],
                  ['discharge_medications', 'Discharge medications'],
                  ['diet_advice', 'Diet advice'],
                  ['follow_up_advice', 'Follow-up advice'],
                  ['emergency_instructions', 'Emergency instructions'],
                ].map(([key, label]) => (
                  <Box key={key}>
                    <Typography variant="caption" color="text.secondary" display="block" mb={0.5} id={`ds-label-${key}`}>
                      {label}
                    </Typography>
                    {dischargeSummary.locked ? (
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{dsDraft[key] || '—'}</Typography>
                    ) : (
                      <Suspense fallback={<RichTextEditorSkeleton />}>
                        <RichTextEditor
                          ariaLabelledBy={`ds-label-${key}`}
                          value={dsDraft[key] || ''}
                          onChange={(html) => setDsDraft((d) => ({ ...d, [key]: html }))}
                        />
                      </Suspense>
                    )}
                  </Box>
                ))}
              </Stack>
            </SectionCard>
          )}
        </Box>
      )}

      {/* ── Dialogs ───────────────────────────────────────────────────── */}
      <Dialog open={noteOpen} onClose={() => setNoteOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle fontWeight={700}>New Admission Note</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <TextField select fullWidth size="small" label="Note kind" value={noteKind} onChange={(e) => setNoteKind(e.target.value)}>
              {NOTE_KINDS.map((k) => (
                <MenuItem key={k} value={k} sx={{ textTransform: 'capitalize' }}>
                  {k.replace(/_/g, ' ')}
                </MenuItem>
              ))}
            </TextField>
            <TextField select fullWidth size="small" label="Shift" value={noteShift} onChange={(e) => setNoteShift(e.target.value)}>
              {SHIFTS.map((s) => (
                <MenuItem key={s} value={s} sx={{ textTransform: 'capitalize' }}>
                  {s}
                </MenuItem>
              ))}
            </TextField>
            {isSoapKind ? (
              ['subjective', 'objective', 'assessment', 'plan'].map((k) => (
                <TextField
                  key={k}
                  fullWidth
                  multiline
                  minRows={2}
                  size="small"
                  label={k.charAt(0).toUpperCase() + k.slice(1)}
                  value={noteSoap[k]}
                  onChange={(e) => setNoteSoap((d) => ({ ...d, [k]: e.target.value }))}
                />
              ))
            ) : (
              <TextField fullWidth multiline minRows={4} size="small" label="Note content" value={noteContent} onChange={(e) => setNoteContent(e.target.value)} />
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setNoteOpen(false)}>Cancel</Button>
          <Button variant="contained" disabled={noteSubmitting} onClick={handleCreateNote}>
            {noteSubmitting ? 'Saving…' : 'Save Note'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={addendumOpen} onClose={() => setAddendumOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle fontWeight={700}>Add Addendum</DialogTitle>
        <DialogContent dividers>
          <Alert severity="info" variant="outlined" sx={{ mb: 2 }}>
            An addendum appends new information — it never edits the original note.
          </Alert>
          <Stack spacing={2}>
            <TextField fullWidth required multiline minRows={3} size="small" label="Addendum" value={addendumContent} onChange={(e) => setAddendumContent(e.target.value)} />
            <TextField fullWidth size="small" label="Reason (optional)" value={addendumReason} onChange={(e) => setAddendumReason(e.target.value)} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setAddendumOpen(false)}>Cancel</Button>
          <Button variant="contained" disabled={!addendumContent.trim() || addendumSubmitting} onClick={handleAddendum}>
            {addendumSubmitting ? 'Saving…' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={handoverOpen} onClose={() => setHandoverOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle fontWeight={700}>New Shift Handover</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField select fullWidth size="small" label="From shift" value={handoverDraft.from_shift} onChange={(e) => setHandoverDraft((d) => ({ ...d, from_shift: e.target.value }))}>
                  {SHIFTS.map((s) => (
                    <MenuItem key={s} value={s} sx={{ textTransform: 'capitalize' }}>{s}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={6}>
                <TextField select fullWidth size="small" label="To shift" value={handoverDraft.to_shift} onChange={(e) => setHandoverDraft((d) => ({ ...d, to_shift: e.target.value }))}>
                  {SHIFTS.map((s) => (
                    <MenuItem key={s} value={s} sx={{ textTransform: 'capitalize' }}>{s}</MenuItem>
                  ))}
                </TextField>
              </Grid>
            </Grid>
            {[
              ['situation', 'Situation'],
              ['background', 'Background'],
              ['assessment', 'Assessment'],
              ['recommendation', 'Recommendation'],
              ['pending_tasks', 'Pending tasks'],
            ].map(([key, label]) => (
              <TextField
                key={key}
                fullWidth
                multiline
                minRows={2}
                size="small"
                label={label}
                value={handoverDraft[key]}
                onChange={(e) => setHandoverDraft((d) => ({ ...d, [key]: e.target.value }))}
              />
            ))}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setHandoverOpen(false)}>Cancel</Button>
          <Button variant="contained" disabled={handoverSubmitting} onClick={handleCreateHandover}>
            {handoverSubmitting ? 'Saving…' : 'Save Handover'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={orderOpen} onClose={() => setOrderOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle fontWeight={700}>New Medication Order</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                required
                size="small"
                label="Search drug"
                value={drugSearch}
                onChange={(e) => setDrugSearch(e.target.value)}
                placeholder="Type at least 2 characters"
                helperText={
                  orderDraft.drug_id
                    ? `Selected: ${drugOptions.find((d) => d.id === orderDraft.drug_id)?.name || ''}`
                    : 'Search, then pick a drug below'
                }
              />
              <Stack spacing={0.5} sx={{ mt: 1, maxHeight: 140, overflowY: 'auto' }}>
                {drugOptions.map((d) => (
                  <Button
                    key={d.id}
                    size="small"
                    variant={orderDraft.drug_id === d.id ? 'contained' : 'outlined'}
                    onClick={() => setOrderDraft((prev) => ({ ...prev, drug_id: d.id }))}
                    sx={{ justifyContent: 'flex-start' }}
                  >
                    {d.name} {d.strength} ({d.form})
                  </Button>
                ))}
              </Stack>
            </Grid>
            <Grid item xs={6} sm={4}>
              <TextField fullWidth required size="small" label="Dose" value={orderDraft.dose} onChange={(e) => setOrderDraft((d) => ({ ...d, dose: e.target.value }))} />
            </Grid>
            <Grid item xs={6} sm={4}>
              <TextField select fullWidth size="small" label="Route" value={orderDraft.route} onChange={(e) => setOrderDraft((d) => ({ ...d, route: e.target.value }))}>
                {ROUTES.map((r) => (
                  <MenuItem key={r} value={r}>{r.toUpperCase()}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={6} sm={4}>
              <TextField select fullWidth size="small" label="Frequency" value={orderDraft.frequency} onChange={(e) => setOrderDraft((d) => ({ ...d, frequency: e.target.value }))}>
                {FREQUENCIES.map((f) => (
                  <MenuItem key={f} value={f}>{f}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={<Checkbox checked={orderDraft.is_prn} onChange={(e) => setOrderDraft((d) => ({ ...d, is_prn: e.target.checked }))} />}
                label="PRN (as needed)"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={<Checkbox checked={orderDraft.is_high_alert} onChange={(e) => setOrderDraft((d) => ({ ...d, is_high_alert: e.target.checked }))} />}
                label="High-alert medication"
              />
            </Grid>
            {orderDraft.is_prn ? (
              <Grid item xs={12}>
                <TextField fullWidth size="small" label="PRN indication" value={orderDraft.prn_indication} onChange={(e) => setOrderDraft((d) => ({ ...d, prn_indication: e.target.value }))} />
              </Grid>
            ) : (
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  size="small"
                  label="Schedule times (comma-separated, HH:mm)"
                  value={orderDraft.schedule_times}
                  onChange={(e) => setOrderDraft((d) => ({ ...d, schedule_times: e.target.value }))}
                />
              </Grid>
            )}
            <Grid item xs={12}>
              <TextField fullWidth multiline minRows={2} size="small" label="Instructions (optional)" value={orderDraft.instructions} onChange={(e) => setOrderDraft((d) => ({ ...d, instructions: e.target.value }))} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setOrderOpen(false)}>Cancel</Button>
          <Button variant="contained" disabled={orderSubmitting} onClick={handleCreateOrder}>
            {orderSubmitting ? 'Saving…' : 'Create Order'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!administerTarget} onClose={() => setAdministerTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle fontWeight={700}>Record Dose</DialogTitle>
        <DialogContent dividers>
          {administerTarget && (
            <Stack spacing={2}>
              <Typography variant="body2" fontWeight={600}>{administerTarget.drug_name} — {administerTarget.dose}</Typography>
              {administerTarget.is_high_alert && (
                <Alert severity="warning" icon={<WarningAmberIcon />}>
                  High-alert medication — a witness is required to mark this given.
                </Alert>
              )}
              <TextField select fullWidth size="small" label="Status" value={administerDraft.status} onChange={(e) => setAdministerDraft((d) => ({ ...d, status: e.target.value }))}>
                {MAR_STATUSES.map((s) => (
                  <MenuItem key={s} value={s} sx={{ textTransform: 'capitalize' }}>{s.replace(/_/g, ' ')}</MenuItem>
                ))}
              </TextField>
              {administerDraft.status === 'given' && (
                <>
                  <TextField fullWidth size="small" label="Dose given" value={administerDraft.dose_given} onChange={(e) => setAdministerDraft((d) => ({ ...d, dose_given: e.target.value }))} />
                  {batches.length > 0 && (
                    <TextField select fullWidth size="small" label="Stock batch" value={administerDraft.batch_id} onChange={(e) => setAdministerDraft((d) => ({ ...d, batch_id: e.target.value }))}>
                      <MenuItem value="">Not tracked</MenuItem>
                      {batches.map((b) => (
                        <MenuItem key={b.id} value={b.id}>{b.batch_number} ({b.quantity_remaining} left)</MenuItem>
                      ))}
                    </TextField>
                  )}
                  {administerTarget.is_high_alert && (
                    <TextField
                      fullWidth
                      required
                      size="small"
                      label="Witness user ID"
                      value={administerDraft.witness_user_id}
                      onChange={(e) => setAdministerDraft((d) => ({ ...d, witness_user_id: e.target.value }))}
                      helperText="A second staff member's account ID confirming this administration"
                    />
                  )}
                </>
              )}
              <TextField fullWidth multiline minRows={2} size="small" label="Notes" value={administerDraft.notes} onChange={(e) => setAdministerDraft((d) => ({ ...d, notes: e.target.value }))} />
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setAdministerTarget(null)}>Cancel</Button>
          <Button variant="contained" disabled={administerSubmitting} onClick={handleAdminister}>
            {administerSubmitting ? 'Saving…' : 'Record'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
