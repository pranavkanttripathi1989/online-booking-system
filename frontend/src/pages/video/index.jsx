import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, gql } from '@apollo/client'
import { useSnackbar } from 'notistack'
import dayjs from 'dayjs'
import {
  Alert,
  AppBar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  FormControlLabel,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material'
import { createTheme, ThemeProvider } from '@mui/material/styles'
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded'
import SecurityRoundedIcon from '@mui/icons-material/SecurityRounded'
import VerifiedRoundedIcon from '@mui/icons-material/VerifiedRounded'
import LocalHospitalRoundedIcon from '@mui/icons-material/LocalHospitalRounded'
import FiberManualRecordRoundedIcon from '@mui/icons-material/FiberManualRecordRounded'
import { useAuth } from '../../hooks/useAuth'
import ErrorBoundary from '../../components/ErrorBoundary'
import { APPOINTMENT_DETAIL_QUERY, AVAILABLE_SLOTS_QUERY } from '../../graphql/queries'

// ─── Dark theme — a video call surface, not a form; matches this app's own
//     established precedent for this one page. ───────────────────────────
const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#006D77' },
    secondary: { main: '#83C5BE' },
    error: { main: '#E63946' },
    background: { default: '#0A1F22', paper: '#0F2D33' },
    text: { primary: '#FFFFFF', secondary: 'rgba(255, 255, 255, 0.7)' },
  },
})

// ─── GraphQL (P1-16, REQ026) ────────────────────────────────────────────
const GET_OR_CREATE_ENCOUNTER = gql`
  mutation GetOrCreateEncounter($appointment_id: ID!) {
    getOrCreateEncounter(appointment_id: $appointment_id) {
      id
      patient_id
      clinician_id
    }
  }
`
const ENCOUNTER_MODE_QUERY = gql`
  query EncounterMode($id: ID!) {
    encounter(id: $id) {
      id
      consultation_mode
      locked
    }
  }
`
const CLINICIAN_REGISTRATION_QUERY = gql`
  query ClinicianRegistration($id: ID!) {
    clinician(id: $id) {
      id
      full_name
      registration_number
    }
  }
`
const JOIN_SESSION = gql`
  mutation JoinTelemedicineSession($encounter_id: ID!) {
    joinTelemedicineSession(encounter_id: $encounter_id) {
      id
      status
      valid_from
      valid_to
      recording_consent_at
      room_url
      token
    }
  }
`
const CONSENT_TO_RECORDING = gql`
  mutation ConsentToTelemedicineRecording($encounter_id: ID!) {
    consentToTelemedicineRecording(encounter_id: $encounter_id) {
      success
      recording_consent_at
    }
  }
`
const CREATE_APPOINTMENT = gql`
  mutation CreateEscalatedAppointment($input: AppointmentInput!) {
    createAppointment(input: $input) {
      id
    }
  }
`

// US-TEL-07 — a compact, self-contained slot picker so a clinician can
// convert a teleconsultation into a real in-person booking without
// leaving the call, reusing the real availableSlots/createAppointment
// path (with its own real conflict checking) rather than an unchecked
// direct insert.
function EscalateDialog({ open, onClose, appointment, encounterId }) {
  const { enqueueSnackbar } = useSnackbar()
  const [date, setDate] = useState(() => dayjs().add(1, 'day').format('YYYY-MM-DD'))
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { data, loading } = useQuery(AVAILABLE_SLOTS_QUERY, {
    variables: { clinician_id: appointment?.clinician?.id, date, service_id: appointment?.service?.id },
    skip: !open || !appointment?.clinician?.id,
    fetchPolicy: 'network-only',
  })
  const [createAppointment] = useMutation(CREATE_APPOINTMENT)
  const slots = (data?.availableSlots ?? []).filter((s) => s.is_available)

  const handleBook = async (slot) => {
    setSubmitting(true)
    try {
      await createAppointment({
        variables: {
          input: {
            clinic_id: appointment.clinic.id,
            clinician_id: appointment.clinician.id,
            patient_id: appointment.patient.id,
            service_id: appointment.service?.id,
            start_datetime: slot.start_datetime,
            type: 'in_person',
            notes: reason || 'Escalated from teleconsultation',
            escalated_from_encounter_id: encounterId,
          },
        },
      })
      enqueueSnackbar('In-person follow-up booked.', { variant: 'success' })
      onClose()
    } catch (err) {
      enqueueSnackbar(err?.graphQLErrors?.[0]?.message || err?.message || 'Failed to book the follow-up', { variant: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Advise In-Person Visit</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 2 }}>
          Books a real in-person follow-up for {appointment?.patient?.full_name}, linked back to this consultation.
        </DialogContentText>
        <Stack spacing={2}>
          <TextField
            fullWidth
            label="Reason (optional)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <TextField
            fullWidth
            type="date"
            label="Date"
            InputLabelProps={{ shrink: true }}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          {loading && <CircularProgress size={24} />}
          {!loading && slots.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              No free slots this day — try another date.
            </Typography>
          )}
          <Stack direction="row" flexWrap="wrap" gap={1}>
            {slots.map((s) => (
              <Button key={s.id} variant="outlined" size="small" disabled={submitting} onClick={() => handleBook(s)}>
                {dayjs(s.start_datetime).format('h:mm A')}
              </Button>
            ))}
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
      </DialogActions>
    </Dialog>
  )
}

function VideoConsultation() {
  // App.jsx's route is /video/:id (pre-existing param name, not renamed
  // here to avoid touching the route itself for a page-local variable).
  const { id: appointmentId } = useParams()
  const navigate = useNavigate()
  const { hasRole } = useAuth()
  const { enqueueSnackbar } = useSnackbar()
  const isClinician = hasRole('clinician')

  const [encounterId, setEncounterId] = useState(null)
  const [initError, setInitError] = useState(null)
  const [session, setSession] = useState(null)
  const [joinError, setJoinError] = useState(null)
  const [joining, setJoining] = useState(false)
  const [escalateOpen, setEscalateOpen] = useState(false)

  const [getOrCreateEncounter] = useMutation(GET_OR_CREATE_ENCOUNTER)
  const [joinSession] = useMutation(JOIN_SESSION)
  const [consentToRecording, { loading: consenting }] = useMutation(CONSENT_TO_RECORDING)

  useEffect(() => {
    let cancelled = false
    getOrCreateEncounter({ variables: { appointment_id: appointmentId } })
      .then(({ data }) => {
        if (!cancelled) setEncounterId(data?.getOrCreateEncounter?.id ?? null)
      })
      .catch((err) => {
        if (!cancelled) setInitError(err?.graphQLErrors?.[0]?.message || err.message)
      })
    return () => {
      cancelled = true
    }
  }, [appointmentId, getOrCreateEncounter])

  const { data: modeData, loading: modeLoading } = useQuery(ENCOUNTER_MODE_QUERY, {
    variables: { id: encounterId },
    skip: !encounterId,
    fetchPolicy: 'network-only',
  })
  const { data: apptData } = useQuery(APPOINTMENT_DETAIL_QUERY, { variables: { id: appointmentId } })
  const appointment = apptData?.appointment
  const { data: clinicianData } = useQuery(CLINICIAN_REGISTRATION_QUERY, {
    variables: { id: appointment?.clinician?.id },
    skip: !appointment?.clinician?.id,
  })

  const consultationMode = modeData?.encounter?.consultation_mode
  const isVideoAppointment = consultationMode === 'video'

  const attemptJoin = useCallback(async () => {
    if (!encounterId) return
    setJoining(true)
    setJoinError(null)
    try {
      const { data } = await joinSession({ variables: { encounter_id: encounterId } })
      setSession(data?.joinTelemedicineSession ?? null)
    } catch (err) {
      setJoinError(err?.graphQLErrors?.[0]?.message || err?.message || 'Could not join the consultation')
    } finally {
      setJoining(false)
    }
  }, [encounterId, joinSession])

  useEffect(() => {
    if (encounterId && isVideoAppointment) attemptJoin()
  }, [encounterId, isVideoAppointment, attemptJoin])

  const handleConsent = async () => {
    try {
      await consentToRecording({ variables: { encounter_id: encounterId } })
      setSession((s) => (s ? { ...s, recording_consent_at: new Date().toISOString() } : s))
      enqueueSnackbar('Recording consent recorded. Start recording from the call controls once ready.', { variant: 'success' })
    } catch (err) {
      enqueueSnackbar(err?.graphQLErrors?.[0]?.message || err?.message || 'Failed to record consent', { variant: 'error' })
    }
  }

  const embedUrl = useMemo(() => {
    if (!session?.room_url || !session?.token) return null
    return `${session.room_url}?t=${encodeURIComponent(session.token)}`
  }, [session])

  if (initError) {
    return (
      <Box p={3}>
        <Button startIcon={<ArrowBackRoundedIcon />} onClick={() => navigate(-1)}>
          Back
        </Button>
        <Alert severity="error" sx={{ mt: 2 }}>
          {initError}
        </Alert>
      </Box>
    )
  }

  if (modeLoading || !modeData) {
    return (
      <Box p={6} display="flex" justifyContent="center">
        <CircularProgress />
      </Box>
    )
  }

  if (!isVideoAppointment) {
    return (
      <Box p={3}>
        <Button startIcon={<ArrowBackRoundedIcon />} onClick={() => navigate(-1)}>
          Back
        </Button>
        <Alert severity="warning" sx={{ mt: 2 }}>
          This appointment is not a video consultation.
        </Alert>
      </Box>
    )
  }

  const clinicianName = appointment?.clinician?.full_name || clinicianData?.clinician?.full_name || 'the clinician'
  const registrationNumber = clinicianData?.clinician?.registration_number

  return (
    <ThemeProvider theme={darkTheme}>
      <Box sx={{ bgcolor: 'background.default', height: '100vh', display: 'flex', flexDirection: 'column', color: 'text.primary', overflow: 'hidden' }}>
        <AppBar position="static" sx={{ bgcolor: 'background.paper', borderBottom: '1px solid #1E4A52', boxShadow: 'none' }}>
          <Stack direction="row" alignItems="center" px={2} py={1.5} gap={2} flexWrap="wrap">
            <Button startIcon={<ArrowBackRoundedIcon />} onClick={() => navigate(-1)} sx={{ color: 'white' }}>
              Back
            </Button>
            <Stack direction="row" alignItems="center" gap={1}>
              <LocalHospitalRoundedIcon color="primary" />
              <Typography variant="body1" fontWeight={700} color="white">
                HealthSync
              </Typography>
            </Stack>
            <Divider orientation="vertical" flexItem sx={{ borderColor: 'rgba(255,255,255,0.2)' }} />
            <Typography variant="body2" color="text.secondary" fontWeight={500}>
              Consultation with {clinicianName}
            </Typography>
            {/* US-TEL-04 — SEC-14: registration number visible for the
                duration of the call, a real trust signal, not decorative. */}
            {registrationNumber && (
              <Chip
                icon={<VerifiedRoundedIcon sx={{ fontSize: 16 }} />}
                label={`Reg. No. ${registrationNumber}`}
                size="small"
                variant="outlined"
                sx={{ color: 'primary.light', borderColor: 'primary.light' }}
              />
            )}
            <Box flexGrow={1} />
            {session?.recording_consent_at && (
              <Chip icon={<FiberManualRecordRoundedIcon sx={{ fontSize: 14 }} />} label="Recording consented" size="small" color="error" />
            )}
            <Chip icon={<SecurityRoundedIcon sx={{ fontSize: 16 }} />} label="Secure" size="small" color="primary" variant="outlined" />
          </Stack>
        </AppBar>

        <Box flexGrow={1} display="flex" p={2} gap={2} overflow="auto">
          <Box flexGrow={1} display="flex" flexDirection="column" position="relative" bgcolor="#000" borderRadius={3} overflow="hidden" minHeight={360}>
            {joining && (
              <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" height="100%" gap={2}>
                <CircularProgress />
                <Typography variant="body2">Connecting…</Typography>
              </Box>
            )}
            {!joining && joinError && (
              <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" height="100%" gap={2} p={3}>
                <Alert severity="error" sx={{ maxWidth: 480 }}>
                  {joinError}
                </Alert>
                <Button variant="outlined" onClick={attemptJoin}>
                  Try Again
                </Button>
              </Box>
            )}
            {!joining && !joinError && embedUrl && (
              // A real Daily.co "Prebuilt" embed -- camera/mic controls,
              // screen share, and network-adaptive quality all come from
              // the vendor's own iframe, matching PRD v2 D5's "vendor SDK,
              // not a simulated stub" decision. Never rendered without a
              // real per-participant token.
              <iframe
                title="Video consultation"
                src={embedUrl}
                allow="camera; microphone; fullscreen; display-capture; autoplay"
                style={{ width: '100%', height: '100%', border: 'none' }}
              />
            )}
          </Box>

          <Box width={{ xs: 0, md: 320 }} display={{ xs: 'none', md: 'flex' }} flexDirection="column" gap={2}>
            <Box bgcolor="background.paper" borderRadius={3} border="1px solid #1E4A52" p={2}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Consultation Details
              </Typography>
              <Typography variant="body2" fontWeight={600} color="primary.light">
                Patient
              </Typography>
              <Typography variant="body1" mb={1}>
                {appointment?.patient?.full_name}
              </Typography>
              <Typography variant="body2" fontWeight={600} color="primary.light">
                Clinician
              </Typography>
              <Typography variant="body1" mb={1}>
                {clinicianName}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                Ensure you are in a quiet, well-lit environment.
              </Typography>
            </Box>

            {isClinician && (
              <Box bgcolor="background.paper" borderRadius={3} border="1px solid #1E4A52" p={2}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Clinician Actions
                </Typography>
                <FormControlLabel
                  control={<Switch checked={!!session?.recording_consent_at} disabled={!!session?.recording_consent_at || consenting} onChange={handleConsent} />}
                  label="Patient consents to recording"
                />
                <Button fullWidth variant="outlined" sx={{ mt: 1 }} onClick={() => setEscalateOpen(true)}>
                  Advise In-Person Visit
                </Button>
              </Box>
            )}
          </Box>
        </Box>
      </Box>

      {appointment && (
        <EscalateDialog open={escalateOpen} onClose={() => setEscalateOpen(false)} appointment={appointment} encounterId={encounterId} />
      )}
    </ThemeProvider>
  )
}

export default function VideoConsultationPage() {
  return (
    <ErrorBoundary>
      <VideoConsultation />
    </ErrorBoundary>
  )
}
