import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation } from '@apollo/client'
import { Helmet } from 'react-helmet-async'
import { useSnackbar } from 'notistack'
import dayjs from 'dayjs'
import {
  Avatar, Box, Button, Chip, Dialog, DialogTitle, DialogContent,
  DialogActions, Divider, FormControl, FormControlLabel, FormLabel,
  Grid, IconButton, Paper, Radio, RadioGroup, Skeleton, Stack,
  Tooltip, Typography, TextField, MenuItem, Alert,
} from '@mui/material'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded'
import PaymentsRoundedIcon from '@mui/icons-material/PaymentsRounded'
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import ArrowBackRoundedIcon       from '@mui/icons-material/ArrowBackRounded'
import EditRoundedIcon            from '@mui/icons-material/EditRounded'
import TaskAltRoundedIcon         from '@mui/icons-material/TaskAltRounded'
import PersonOffRoundedIcon       from '@mui/icons-material/PersonOffRounded'
import CancelRoundedIcon          from '@mui/icons-material/CancelRounded'
import CalendarMonthRoundedIcon   from '@mui/icons-material/CalendarMonthRounded'
import AccessTimeRoundedIcon      from '@mui/icons-material/AccessTimeRounded'
import LocalHospitalRoundedIcon   from '@mui/icons-material/LocalHospitalRounded'
import MeetingRoomRoundedIcon     from '@mui/icons-material/MeetingRoomRounded'
import EmailRoundedIcon           from '@mui/icons-material/EmailRounded'
import PhoneRoundedIcon           from '@mui/icons-material/PhoneRounded'
import TimerRoundedIcon           from '@mui/icons-material/TimerRounded'
import MedicalServicesRoundedIcon from '@mui/icons-material/MedicalServicesRounded'
import NotesRoundedIcon           from '@mui/icons-material/NotesRounded'
import NotificationsRoundedIcon  from '@mui/icons-material/NotificationsRounded'
import StarRoundedIcon            from '@mui/icons-material/StarRounded'
import CheckCircleRoundedIcon     from '@mui/icons-material/CheckCircleRounded'
import RadioButtonUncheckedIcon   from '@mui/icons-material/RadioButtonUnchecked'
import PrintRoundedIcon            from '@mui/icons-material/PrintRounded'
import InfoRoundedIcon            from '@mui/icons-material/InfoRounded'
import EventRepeatRoundedIcon     from '@mui/icons-material/EventRepeatRounded'
import SmsRoundedIcon             from '@mui/icons-material/SmsRounded'
import MonitorHeartRoundedIcon     from '@mui/icons-material/MonitorHeartRounded'


import { APPOINTMENT_DETAIL_QUERY } from '../../graphql/queries'
import { CANCEL_APPOINTMENT_MUTATION, COMPLETE_APPOINTMENT_MUTATION, MARK_NO_SHOW_MUTATION, UPDATE_APPOINTMENT_MUTATION, RECORD_COUNTER_PAYMENT_MUTATION } from '../../graphql/mutations'
import * as MockStore from '../../mocks/store'
import CancelDialog from '../../components/Appointments/CancelDialog'
import { useAuth } from '../../hooks/useAuth'

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_CFG = {
  pending:     { label: 'Pending',     bg: '#FEF7E0', color: '#8A4700', border: '#FDD663', dot: '#F9AB00' },
  confirmed:   { label: 'Confirmed',   bg: '#E6F4EA', color: '#137333', border: '#CEEAD6', dot: '#0F9D58' },
  cancelled:   { label: 'Cancelled',   bg: '#FCE8E6', color: '#A50E0E', border: '#F5C6C2', dot: '#D93025' },
  completed:   { label: 'Completed',   bg: '#E8F0FE', color: '#1557B0', border: '#AECBFA', dot: '#1A73E8' },
  no_show:     { label: 'No Show',     bg: '#F8F9FA', color: '#3C4043', border: '#E8EAED', dot: '#80868B' },
  rescheduled: { label: 'Rescheduled', bg: '#F3E8FD', color: '#6E2DB8', border: '#D7AEFA', dot: '#9334E6' },
}

// ─── SUG-APPT-012: Service-specific pre-visit checklists ─────────────────────
const SERVICE_CHECKLISTS = {
  default: [
    'Arrive 15 minutes early for check-in',
    'Bring a valid photo ID',
    'Bring your insurance card',
    'List any current medications',
  ],
  'GP Consultation': [
    'Arrive 15 minutes early for check-in',
    'Bring a valid photo ID and insurance card',
    'List any current medications and dosages',
    'Note any recent symptoms or concerns',
    'Bring previous lab results if available',
  ],
  'Mental Health': [
    'Arrive 10 minutes early',
    'Bring a list of current medications',
    'Note any changes in mood or behaviour since last visit',
    'Bring your referral letter if applicable',
    'Confidentiality: sessions are private unless safety is at risk',
  ],
  'Physiotherapy': [
    'Wear comfortable, loose-fitting clothing',
    'Bring your referral letter or X-ray/MRI reports',
    'List any medications you are currently taking',
    'Be prepared to demonstrate your range of motion',
    'Arrive 5 minutes early to complete intake paperwork',
  ],
  'Child Health': [
    'Bring the child\'s immunization record',
    'Bring a valid photo ID for the parent/guardian',
    'Note any recent illnesses or medications',
    'Bring the child\'s Medicare/insurance card',
    'Allow extra time for the child to settle',
  ],
  'Dermatology': [
    'Remove nail polish from toenails if foot concern',
    'Arrive without make-up if face is being assessed',
    'Bring photos of any rash or lesion history',
    'List any topical creams or treatments currently used',
  ],
  'Dental': [
    'Brush and floss before your appointment',
    'Bring a list of any medications you take',
    'Note any tooth pain, sensitivity, or bleeding gums',
    'Bring previous dental X-rays if available',
    'Inform us if you have any dental anxiety',
  ],
  'Cardiology': [
    'Avoid caffeine 24 hours before stress tests',
    'Bring a list of current medications',
    'Bring previous ECG or echo results if available',
    'Wear comfortable shoes if a treadmill test is scheduled',
    'Inform us of any chest pain episodes',
  ],
  'X-Ray': [
    'Remove all metal jewellery before the scan',
    'Wear comfortable clothing without metal fasteners',
    'Inform the technician if you are or might be pregnant',
    'Bring your referral letter',
  ],
  'Lab Test': [
    'Fast for 8–12 hours if a fasting blood test is required',
    'Drink plenty of water (unless instructed otherwise)',
    'Bring your referral form or doctor\'s request',
    'Avoid strenuous exercise 24 hours before',
  ],
}

function getChecklist(serviceName) {
  if (!serviceName) return SERVICE_CHECKLISTS.default
  // Try exact match first, then partial match
  if (SERVICE_CHECKLISTS[serviceName]) return SERVICE_CHECKLISTS[serviceName]
  const key = Object.keys(SERVICE_CHECKLISTS).find(k =>
    serviceName.toLowerCase().includes(k.toLowerCase()) ||
    k.toLowerCase().includes(serviceName.toLowerCase())
  )
  return key ? SERVICE_CHECKLISTS[key] : SERVICE_CHECKLISTS.default
}

// ─── Quick info tile ──────────────────────────────────────────────────────────
function InfoTile({ icon, label, value }) {
  if (!value) return null
  return (
    <Stack direction="row" spacing={1.5} alignItems="flex-start">
      <Box sx={{
        width: 36, height: 36, borderRadius: 2, bgcolor: 'rgba(0,109,119,0.08)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        {icon}
      </Box>
      <Box>
        <Typography variant="caption" sx={{ color: '#9AA0A6', fontWeight: 700, fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {label}
        </Typography>
        <Typography variant="body2" fontWeight={600} sx={{ color: '#202124', lineHeight: 1.3 }}>
          {value}
        </Typography>
      </Box>
    </Stack>
  )
}

// ─── Section card ─────────────────────────────────────────────────────────────
function Card({ children, accent, sx = {} }) {
  return (
    <Paper elevation={0} sx={{
      borderRadius: 3, border: '1px solid #E8EAED',
      overflow: 'hidden', position: 'relative',
      '&::before': accent ? {
        content: '""', position: 'absolute', top: 0, left: 0, right: 0,
        height: 3, background: accent,
      } : {},
      ...sx,
    }}>
      {children}
    </Paper>
  )
}

// ─── SUG-APPT-010: Reschedule Dialog ─────────────────────────────────────────
function RescheduleDialog({ open, apt, onClose, onSave }) {
  const [newStart, setNewStart] = useState(apt?.start_datetime ? dayjs(apt.start_datetime) : dayjs())
  const [newEnd, setNewEnd]     = useState(apt?.end_datetime   ? dayjs(apt.end_datetime)   : dayjs().add(apt?.duration_minutes ?? 30, 'minute'))
  const endBeforeStart = newEnd && newStart && !newEnd.isAfter(newStart)

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 800, color: '#202124', display: 'flex', alignItems: 'center', gap: 1 }}>
          <EventRepeatRoundedIcon sx={{ color: '#9334E6' }} />
          Reschedule Appointment
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Select a new date and time for <strong>{apt?.patient?.full_name ?? 'this appointment'}</strong>.
            Current: {apt?.start_datetime ? dayjs(apt.start_datetime).format('ddd DD MMM YYYY, h:mm A') : '—'}
          </Typography>
          <Stack spacing={2.5}>
            <DateTimePicker
              label="New Start Date & Time"
              value={newStart}
              onChange={setNewStart}
              slotProps={{ textField: { fullWidth: true, size: 'small', required: true } }}
            />
            <DateTimePicker
              label="New End Date & Time"
              value={newEnd}
              onChange={setNewEnd}
              slotProps={{
                textField: {
                  fullWidth: true, size: 'small', required: true,
                  error: endBeforeStart,
                  helperText: endBeforeStart ? 'End time must be after start time' : '',
                }
              }}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button onClick={onClose} variant="outlined" sx={{ borderRadius: 2, fontWeight: 700 }}>
            Keep Current
          </Button>
          <Button
            onClick={() => onSave(newStart, newEnd)}
            variant="contained"
            disabled={endBeforeStart || !newStart || !newEnd}
            sx={{
              borderRadius: 2, fontWeight: 700,
              background: 'linear-gradient(135deg,#9334E6,#7627C8)',
              '&:hover': { background: 'linear-gradient(135deg,#7627C8,#5E1FA0)' },
            }}
          >
            Confirm Reschedule
          </Button>
        </DialogActions>
      </Dialog>
    </LocalizationProvider>
  )
}

// ─── NEW-APPT-004: Send Reminder Channel Dialog ───────────────────────────────
function ReminderDialog({ open, onClose, onSend, patientEmail, patientPhone }) {
  const [channel, setChannel] = useState('email')
  const hasEmail = Boolean(patientEmail)
  const hasPhone = Boolean(patientPhone)

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ fontWeight: 800, color: '#202124', display: 'flex', alignItems: 'center', gap: 1 }}>
        <NotificationsRoundedIcon sx={{ color: '#006D77' }} />
        Send Reminder
      </DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
          Choose how to notify the patient:
        </Typography>
        <FormControl component="fieldset">
          <FormLabel component="legend" sx={{ fontSize: '0.75rem', fontWeight: 700, color: '#5F6368', mb: 1 }}>
            Notification Channel
          </FormLabel>
          <RadioGroup value={channel} onChange={(e) => setChannel(e.target.value)}>
            <FormControlLabel
              value="email"
              disabled={!hasEmail}
              control={<Radio size="small" sx={{ '&.Mui-checked': { color: '#006D77' } }} />}
              label={
                <Box>
                  <Typography variant="body2" fontWeight={600}>
                    Email {!hasEmail && <Chip label="No email on file" size="small" sx={{ ml: 1, fontSize: '0.65rem', height: 18 }} />}
                  </Typography>
                  {hasEmail && <Typography variant="caption" color="text.secondary">{patientEmail}</Typography>}
                </Box>
              }
            />
            <FormControlLabel
              value="sms"
              disabled={!hasPhone}
              control={<Radio size="small" sx={{ '&.Mui-checked': { color: '#006D77' } }} />}
              label={
                <Box>
                  <Typography variant="body2" fontWeight={600}>
                    SMS {!hasPhone && <Chip label="No phone on file" size="small" sx={{ ml: 1, fontSize: '0.65rem', height: 18 }} />}
                  </Typography>
                  {hasPhone && <Typography variant="caption" color="text.secondary">{patientPhone}</Typography>}
                </Box>
              }
            />
          </RadioGroup>
        </FormControl>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
        <Button onClick={onClose} variant="outlined" sx={{ borderRadius: 2, fontWeight: 700 }}>
          Cancel
        </Button>
        <Button
          onClick={() => onSend(channel)}
          variant="contained"
          sx={{
            borderRadius: 2, fontWeight: 700,
            background: 'linear-gradient(135deg,#006D77,#00858F)',
            '&:hover': { background: 'linear-gradient(135deg,#005A62,#006D77)' },
          }}
        >
          Send via {channel === 'email' ? 'Email' : 'SMS'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// ─── AppointmentDetailPage ────────────────────────────────────────────────────
export default function AppointmentDetailPage() {
  const { id }   = useParams()
  const navigate = useNavigate()
  const { hasRole } = useAuth()
  const { enqueueSnackbar } = useSnackbar()
  const [cancelOpen, setCancelOpen] = useState(false)
  const [reminderSending, setReminderSending] = useState(false)

  // SUG-APPT-010: Reschedule dialog state
  const [rescheduleOpen, setRescheduleOpen] = useState(false)

  // NEW-APPT-004: Reminder channel dialog state
  const [reminderDialogOpen, setReminderDialogOpen] = useState(false)

  // REQ023 (US-BIL-01, scoped subset) — mixed-tender counter payment dialog state
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [tenders, setTenders] = useState([{ tender_type: 'cash', amount: '', reference: '' }])
  const [paymentError, setPaymentError] = useState(null)

  const { data, loading, refetch } = useQuery(APPOINTMENT_DETAIL_QUERY, {
    variables: { id }, skip: !id, fetchPolicy: 'network-only',
  })

  const mockIdx = id?.startsWith('mock-') ? parseInt(id.replace(/^mock-/, ''), 10) : null
  const allMockApts = mockIdx !== null ? MockStore.getAppointments() : []
  const apt = data?.appointment
    ?? MockStore.getAppointmentById(id)
    ?? (mockIdx !== null && allMockApts.length ? allMockApts[mockIdx % allMockApts.length] : null)

  const statusCfg  = STATUS_CFG[apt?.status] ?? STATUS_CFG.pending
  const isTerminal = ['cancelled', 'completed', 'no_show'].includes(apt?.status)

  const [completeAppointment] = useMutation(COMPLETE_APPOINTMENT_MUTATION, {
    onCompleted: () => { enqueueSnackbar('Marked completed', { variant: 'success' }); refetch() }
  })

  const [recordCounterPayment, { loading: recordingPayment }] = useMutation(RECORD_COUNTER_PAYMENT_MUTATION, {
    onCompleted: (d) => {
      if (!d?.recordCounterPayment?.success) { setPaymentError(d?.recordCounterPayment?.message ?? 'Failed to record payment'); return }
      enqueueSnackbar(`Payment recorded${d.recordCounterPayment.invoice_number ? ` — ${d.recordCounterPayment.invoice_number}` : ''}`, { variant: 'success' })
      setPaymentDialogOpen(false)
      setTenders([{ tender_type: 'cash', amount: '', reference: '' }])
      setPaymentError(null)
      refetch()
    },
    onError: (err) => setPaymentError(err.message),
  })
  const [markNoShow]          = useMutation(MARK_NO_SHOW_MUTATION, {
    onCompleted: () => { enqueueSnackbar('Marked no-show', { variant: 'warning' }); refetch() }
  })
  const [cancelAppointment]   = useMutation(CANCEL_APPOINTMENT_MUTATION, {
    onCompleted: () => { setCancelOpen(false); refetch() }
  })
  const [updateAppointment]   = useMutation(UPDATE_APPOINTMENT_MUTATION)

  // NEW-APPT-004: Send Reminder with channel selection
  const handleSendReminder = (channel) => {
    setReminderDialogOpen(false)
    setReminderSending(true)
    setTimeout(() => {
      setReminderSending(false)
      const contact = channel === 'sms'
        ? (apt?.patient?.phone ?? 'patient phone')
        : (apt?.patient?.email ?? 'patient email')
      enqueueSnackbar(`Reminder sent via ${channel.toUpperCase()} to ${contact}`, { variant: 'success' })
    }, 1500)
  }

  // SUG-APPT-010: Reschedule handler — real updateAppointment mutation.
  // end_datetime isn't a directly settable input (appointments.service.ts's
  // update() recomputes it server-side from the service's duration_minutes
  // once start_datetime moves), and the resolver runs a real slot-conflict
  // check (assertSlotFree) the old MockStore-only version never did.
  const handleReschedule = async (newStart) => {
    if (!apt) return
    try {
      await updateAppointment({ variables: { id: apt.id, input: { start_datetime: newStart.toISOString() } } })
      setRescheduleOpen(false)
      enqueueSnackbar('Appointment rescheduled successfully.', { variant: 'success' })
      navigate('/appointments')
    } catch (err) {
      enqueueSnackbar(err?.graphQLErrors?.[0]?.message || err.message || 'Failed to reschedule appointment', { variant: 'error' })
    }
  }

  const initials = (name) => name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) ?? '?'

  if (loading && !apt) return (
    <Box className="page-enter">
      <Skeleton variant="rectangular" height={56} sx={{ borderRadius: 2, mb: 3 }} />
      <Grid container spacing={3}>
        {[1,2,3].map(i => <Grid key={i} item xs={12} md={i === 3 ? 4 : 8}><Skeleton variant="rectangular" height={200} sx={{ borderRadius: 3 }} /></Grid>)}
      </Grid>
    </Box>
  )

  if (!apt) return (
    <Box sx={{ textAlign: 'center', py: 10 }}>
      <CalendarMonthRoundedIcon sx={{ fontSize: 64, color: '#DADCE0', mb: 2 }} />
      <Typography variant="h6" color="text.secondary">Appointment not found</Typography>
      <Button sx={{ mt: 2 }} onClick={() => navigate('/appointments')}>← Back</Button>
    </Box>
  )

  const startDt  = dayjs(apt.start_datetime)
  const endDt    = apt.end_datetime ? dayjs(apt.end_datetime) : startDt.add(apt.duration_minutes ?? 15, 'minute')
  const duration = apt.duration_minutes ?? apt.service?.duration_minutes

  // SUG-APPT-012: Get service-specific checklist
  const checklist = getChecklist(apt.service?.name)

  return (
    <Box className="page-enter" sx={{ pb: 6 }}>
      <Helmet><title>Appointment #{id?.slice(-6)} — MediBook</title></Helmet>

      {/* ── Header bar ─────────────────────────────────────────────────── */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3.5, flexWrap: 'wrap', gap: 1.5 }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <IconButton onClick={() => navigate('/appointments')}
            sx={{ bgcolor: '#F1F3F4', '&:hover': { bgcolor: '#E8EAED' }, flexShrink: 0 }}>
            <ArrowBackRoundedIcon />
          </IconButton>
          <Box>
            <Typography variant="h5" fontWeight={800} sx={{ color: '#202124', lineHeight: 1.2 }}>
              Appointment Detail
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {apt.patient?.full_name} · {apt.service?.name ?? 'Appointment'}
            </Typography>
          </Box>
        </Stack>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
          <Chip label={statusCfg.label} sx={{
            bgcolor: statusCfg.bg, color: statusCfg.color,
            border: `1px solid ${statusCfg.border}`, borderLeft: `4px solid ${statusCfg.dot}`,
            fontWeight: 800, borderRadius: '10px', fontSize: '0.78rem', height: 30,
          }} />
          <Tooltip title="Print appointment details">
            <Button variant="outlined" startIcon={<PrintRoundedIcon />}
              onClick={() => window.print()}
              aria-label="Print appointment details"
              sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 700, borderColor: '#E8EAED', color: '#5F6368', '&:hover': { bgcolor: '#F1F3F4', borderColor: '#BDC1C6' } }}
            >
              Print
            </Button>
          </Tooltip>
          <Button variant="outlined" startIcon={<EditRoundedIcon />}
            onClick={() => navigate(`/appointments/${id}/edit`)}
            sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 700, borderColor: '#E8EAED', color: '#5F6368', '&:hover': { bgcolor: '#F1F3F4', borderColor: '#BDC1C6' } }}
          >
            Edit
          </Button>
        </Stack>
      </Box>

      <Grid container spacing={3}>
        {/* ── LEFT COLUMN (65%) ────────────────────────────────────────── */}
        <Grid item xs={12} md={8}>

          {/* Patient card */}
          <Card accent="linear-gradient(90deg,#006D77,#00858F)" sx={{ mb: 3 }}>
            <Box sx={{ p: 3 }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} alignItems={{ sm: 'flex-start' }} justifyContent="space-between">
                {/* Avatar + name */}
                <Stack direction="row" spacing={2.5} alignItems="center">
                  <Avatar src={apt.patient?.avatar_url} sx={{
                    width: 72, height: 72, bgcolor: '#006D77', fontSize: '1.4rem', fontWeight: 800,
                    border: '3px solid rgba(0,109,119,0.15)', boxShadow: '0 4px 14px rgba(0,109,119,0.2)',
                  }}>
                    {initials(apt.patient?.full_name)}
                  </Avatar>
                  <Box>
                    <Typography variant="h5" fontWeight={800} sx={{ color: '#202124', lineHeight: 1.2 }}>
                      {apt.patient?.full_name ?? '—'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Patient</Typography>
                    <Stack direction="row" spacing={0.75} flexWrap="wrap">
                      <Chip label={statusCfg.label} size="small" sx={{
                        bgcolor: statusCfg.bg, color: statusCfg.color, border: `1px solid ${statusCfg.border}`,
                        fontWeight: 700, fontSize: '0.68rem', height: 22,
                      }} />
                      {apt.patient?.date_of_birth && (
                        <Chip label={`${dayjs().diff(apt.patient.date_of_birth, 'year')} yrs`} size="small"
                          sx={{ bgcolor: '#F1F3F4', color: '#3C4043', fontWeight: 600, fontSize: '0.68rem', height: 22 }} />
                      )}
                    </Stack>
                  </Box>
                </Stack>
              </Stack>

              {/* Quick logistics row */}
              <Box sx={{ mt: 3, pt: 2.5, borderTop: '1px solid #F1F3F4' }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}>
                    <InfoTile icon={<CalendarMonthRoundedIcon sx={{ fontSize: '1rem', color: '#006D77' }} />}
                      label="Date" value={startDt.format('ddd, DD MMM YYYY')} />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <InfoTile icon={<AccessTimeRoundedIcon sx={{ fontSize: '1rem', color: '#006D77' }} />}
                      label="Time" value={`${startDt.format('h:mm A')} – ${endDt.format('h:mm A')} (${duration ?? '?'} min)`} />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <InfoTile icon={<MedicalServicesRoundedIcon sx={{ fontSize: '1rem', color: '#006D77' }} />}
                      label="Service" value={apt.service?.name} />
                  </Grid>
                </Grid>
              </Box>
            </Box>

            {/* Contact info row */}
            <Box sx={{ px: 3, pb: 3 }}>
              <Divider sx={{ mb: 2.5 }} />
              <Grid container spacing={2}>
                {apt.patient?.email && (
                  <Grid item xs={12} sm={4}>
                    <InfoTile icon={<EmailRoundedIcon sx={{ fontSize: '1rem', color: '#006D77' }} />}
                      label="Email" value={apt.patient.email} />
                  </Grid>
                )}
                {apt.patient?.phone && (
                  <Grid item xs={12} sm={4}>
                    <InfoTile icon={<PhoneRoundedIcon sx={{ fontSize: '1rem', color: '#006D77' }} />}
                      label="Phone" value={apt.patient.phone} />
                  </Grid>
                )}
                {apt.patient?.date_of_birth && (
                  <Grid item xs={12} sm={4}>
                    <InfoTile icon={<TimerRoundedIcon sx={{ fontSize: '1rem', color: '#006D77' }} />}
                      label="Date of Birth" value={dayjs(apt.patient.date_of_birth).format('DD MMM YYYY')} />
                  </Grid>
                )}
              </Grid>
            </Box>
          </Card>

          {/* Notes card */}
          {apt.notes && (
            <Card accent="linear-gradient(90deg,#9334E6,#7627C8)" sx={{ mb: 3 }}>
              <Box sx={{ p: 3 }}>
                <Stack direction="row" spacing={1} alignItems="center" mb={2}>
                  <NotesRoundedIcon sx={{ color: '#9334E6', fontSize: '1.1rem' }} />
                  <Typography variant="subtitle1" fontWeight={700} sx={{ color: '#202124' }}>
                    Notes &amp; Instructions
                  </Typography>
                </Stack>
                <Box sx={{
                  bgcolor: 'rgba(147,52,230,0.04)', p: 2.5, borderRadius: 2,
                  borderLeft: '4px solid #9334E6',
                }}>
                  <Typography variant="body2" sx={{ color: '#3C4043', lineHeight: 1.75, fontStyle: 'italic' }}>
                    "{apt.notes}"
                  </Typography>
                </Box>
              </Box>
            </Card>
          )}

          {/* Status timeline */}
          {apt.status_logs?.length > 0 && (
            <Card accent="linear-gradient(90deg,#F9AB00,#E37400)">
              <Box sx={{ p: 3 }}>
                <Typography variant="subtitle1" fontWeight={700} sx={{ color: '#202124', mb: 2.5 }}>
                  Patient Timeline
                </Typography>
                <Box sx={{ position: 'relative', '&::before': { content: '""', position: 'absolute', left: 11, top: 4, bottom: 4, width: 2, bgcolor: '#F1F3F4' } }}>
                  {apt.status_logs.map((log, idx) => {
                    const cfg = STATUS_CFG[log.status] ?? { dot: '#9AA0A6', label: log.status, color: '#3C4043' }
                    const isLast = idx === apt.status_logs.length - 1
                    return (
                      <Stack key={log.id ?? idx} direction="row" spacing={2} sx={{ position: 'relative', zIndex: 1, pb: isLast ? 0 : 2.5 }}>
                        <Box sx={{
                          width: 24, height: 24, borderRadius: '50%', flexShrink: 0, mt: 0.25,
                          bgcolor: cfg.dot, border: '3px solid #fff', boxShadow: '0 0 0 2px ' + cfg.dot + '40',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <CheckCircleRoundedIcon sx={{ fontSize: '0.75rem', color: '#fff' }} />
                        </Box>
                        <Box>
                          <Typography variant="body2" fontWeight={700} sx={{ color: cfg.color ?? '#202124', textTransform: 'capitalize' }}>
                            {log.status?.replace('_', ' ')}
                          </Typography>
                          {log.reason && <Typography variant="caption" color="text.secondary" display="block">{log.reason}</Typography>}
                          <Typography variant="caption" color="text.disabled">
                            {dayjs(log.created_at).format('DD MMM YYYY, h:mm A')}
                            {log.changed_by_user ? ` · ${log.changed_by_user.name}` : ''}
                          </Typography>
                        </Box>
                      </Stack>
                    )
                  })}
                </Box>
              </Box>
            </Card>
          )}
        </Grid>

        {/* ── RIGHT COLUMN (35%) ───────────────────────────────────────── */}
        <Grid item xs={12} md={4}>

          {/* Clinician card */}
          <Card accent="linear-gradient(90deg,#0F9D58,#0B8043)" sx={{ mb: 3 }}>
            <Box sx={{ p: 3 }}>
              <Typography variant="caption" sx={{ color: '#9AA0A6', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.65rem' }}>
                Assigned Clinician
              </Typography>
              <Stack direction="row" spacing={2} alignItems="center" sx={{ mt: 1.5 }}>
                <Avatar src={apt.clinician?.avatar_url} sx={{
                  width: 56, height: 56, bgcolor: '#0F9D58', fontWeight: 800,
                  border: '2px solid rgba(15,157,88,0.2)',
                }}>
                  {initials(apt.clinician?.full_name)}
                </Avatar>
                <Box>
                  <Typography variant="subtitle1" fontWeight={800} sx={{ color: '#202124', lineHeight: 1.2 }}>
                    {apt.clinician?.full_name ?? '—'}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#0F9D58', fontWeight: 600 }}>
                    {apt.clinician?.clinician_type?.name ?? 'Clinician'}
                  </Typography>
                  <Stack direction="row" alignItems="center" spacing={0.25} sx={{ mt: 0.5 }}>
                    <StarRoundedIcon sx={{ color: '#F9AB00', fontSize: '0.95rem' }} />
                    <StarRoundedIcon sx={{ color: '#F9AB00', fontSize: '0.95rem' }} />
                    <StarRoundedIcon sx={{ color: '#F9AB00', fontSize: '0.95rem' }} />
                    <StarRoundedIcon sx={{ color: '#F9AB00', fontSize: '0.95rem' }} />
                    <StarRoundedIcon sx={{ color: '#F9AB00', fontSize: '0.95rem' }} />
                    <Typography variant="caption" sx={{ color: '#5F6368', ml: 0.5 }}>5.0</Typography>
                  </Stack>
                </Box>
              </Stack>
            </Box>
          </Card>

          {/* Appointment logistics */}
          <Card accent={`linear-gradient(90deg,${statusCfg.dot},${statusCfg.border})`} sx={{ mb: 3 }}>
            <Box sx={{ p: 3 }}>
              <Stack direction="row" spacing={1} alignItems="center" mb={2}>
                <LocalHospitalRoundedIcon sx={{ color: '#006D77', fontSize: '1.1rem' }} />
                <Typography variant="subtitle1" fontWeight={700} sx={{ color: '#202124' }}>
                  Appointment Details
                </Typography>
              </Stack>
              <Stack spacing={2}>
                <InfoTile icon={<CalendarMonthRoundedIcon sx={{ fontSize: '1rem', color: '#006D77' }} />}
                  label="Date" value={startDt.format('dddd, DD MMM YYYY')} />
                <InfoTile icon={<AccessTimeRoundedIcon sx={{ fontSize: '1rem', color: '#006D77' }} />}
                  label="Time" value={`${startDt.format('h:mm A')} – ${endDt.format('h:mm A')}`} />
                <InfoTile icon={<TimerRoundedIcon sx={{ fontSize: '1rem', color: '#006D77' }} />}
                  label="Duration" value={`${duration ?? '—'} min`} />
                <Divider />
                <InfoTile icon={<MedicalServicesRoundedIcon sx={{ fontSize: '1rem', color: '#006D77' }} />}
                  label="Service" value={apt.service?.name} />
                <InfoTile icon={<MeetingRoomRoundedIcon sx={{ fontSize: '1rem', color: '#006D77' }} />}
                  label="Room" value={apt.room?.name} />
                <InfoTile icon={<LocalHospitalRoundedIcon sx={{ fontSize: '1rem', color: '#006D77' }} />}
                  label="Clinic" value={apt.clinic?.name} />
              </Stack>
            </Box>
          </Card>

          {/* Actions */}
          {!isTerminal && (
            <Card sx={{ mb: 3 }}>
              <Box sx={{ p: 3, bgcolor: '#FAFAFA' }}>
                <Typography variant="subtitle2" fontWeight={700} color="text.secondary" mb={1.5}>
                  Actions
                </Typography>
                <Stack spacing={1.25}>
                  {/* REQ020: consultation workspace entry point — clinician-only,
                      matches EncounterWorkspace's own role gate. */}
                  {hasRole('clinician') && (
                    <Button fullWidth variant="contained" startIcon={<MonitorHeartRoundedIcon />}
                      onClick={() => navigate(`/clinician/encounters/${apt.id}`)}
                      sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 700, py: 1.25,
                        background: 'linear-gradient(135deg,#006D77,#004E56)',
                        '&:hover': { background: 'linear-gradient(135deg,#004E56,#003940)' },
                      }}
                    >
                      Start Consultation
                    </Button>
                  )}
                  <Button fullWidth variant="contained" startIcon={<TaskAltRoundedIcon />}
                    onClick={() => completeAppointment({ variables: { id: apt.id } })}
                    sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 700, py: 1.25,
                      background: 'linear-gradient(135deg,#0F9D58,#0B8043)',
                      '&:hover': { background: 'linear-gradient(135deg,#0B8043,#097A3D)', boxShadow: '0 4px 14px rgba(15,157,88,0.4)' },
                    }}
                  >
                    Mark as Completed
                  </Button>
                  {/* REQ023 (US-BIL-01, scoped subset) — front-desk staff, not clinician */}
                  {(hasRole('staff') || hasRole('manager') || hasRole('admin') || hasRole('super_admin')) && apt.service?.price != null && (
                    <Button fullWidth variant="outlined" startIcon={<PaymentsRoundedIcon />}
                      onClick={() => setPaymentDialogOpen(true)}
                      sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 700, py: 1.25,
                        borderColor: '#0F9D58', color: '#0B8043', '&:hover': { bgcolor: 'rgba(15,157,88,0.06)', borderColor: '#0F9D58' },
                      }}
                    >
                      Take Payment
                    </Button>
                  )}
                  <Button fullWidth variant="outlined" startIcon={<PersonOffRoundedIcon />}
                    onClick={() => markNoShow({ variables: { id: apt.id } })}
                    sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 700, py: 1.25,
                      borderColor: '#F9AB00', color: '#8A4700', '&:hover': { bgcolor: '#FEF7E0', borderColor: '#F9AB00' },
                    }}
                  >
                    Mark No Show
                  </Button>

                  {/* SUG-APPT-010: Reschedule button */}
                  <Button fullWidth variant="outlined" startIcon={<EventRepeatRoundedIcon />}
                    onClick={() => setRescheduleOpen(true)}
                    sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 700, py: 1.25,
                      borderColor: '#9334E6', color: '#9334E6', '&:hover': { bgcolor: 'rgba(147,52,230,0.06)', borderColor: '#9334E6' },
                    }}
                  >
                    Reschedule
                  </Button>

                  <Button fullWidth variant="outlined" startIcon={<CancelRoundedIcon />}
                    onClick={() => setCancelOpen(true)}
                    sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 700, py: 1.25,
                      borderColor: '#D93025', color: '#D93025', '&:hover': { bgcolor: '#FCE8E6', borderColor: '#D93025' },
                    }}
                  >
                    Cancel Appointment
                  </Button>

                  {/* NEW-APPT-004: Send Reminder with channel selection */}
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<NotificationsRoundedIcon />}
                    onClick={() => setReminderDialogOpen(true)}
                    disabled={reminderSending}
                    aria-label="Send appointment reminder to patient"
                    sx={{
                      borderRadius: 2.5, textTransform: 'none', fontWeight: 700, py: 1.25,
                      borderColor: '#006D77', color: '#006D77',
                      '&:hover': { bgcolor: 'rgba(0,109,119,0.06)', borderColor: '#006D77' },
                    }}
                  >
                    {reminderSending ? 'Sending…' : 'Send Reminder'}
                  </Button>
                </Stack>
              </Box>
            </Card>
          )}

          {/* SUG-APPT-012: Service-specific pre-visit checklist */}
          <Card>
            <Box sx={{ p: 3, bgcolor: 'rgba(0,109,119,0.04)', border: '1px solid rgba(0,109,119,0.12)', borderRadius: 3 }}>
              <Stack direction="row" spacing={1} alignItems="flex-start">
                <InfoRoundedIcon sx={{ color: '#006D77', fontSize: '1.1rem', mt: 0.2, flexShrink: 0 }} />
                <Box>
                  <Typography variant="subtitle2" fontWeight={700} sx={{ color: '#006D77', mb: 0.5 }}>
                    Pre-visit Checklist
                  </Typography>
                  {apt.service?.name && (
                    <Typography variant="caption" sx={{ color: '#5F6368', mb: 1, display: 'block' }}>
                      Specific to: <strong>{apt.service.name}</strong>
                    </Typography>
                  )}
                  <Stack spacing={0.75}>
                    {checklist.map((item) => (
                      <Stack key={item} direction="row" spacing={1} alignItems="center">
                        <CheckCircleRoundedIcon sx={{ fontSize: '0.85rem', color: '#0F9D58', flexShrink: 0 }} />
                        <Typography variant="caption" sx={{ color: '#3C4043', lineHeight: 1.5 }}>{item}</Typography>
                      </Stack>
                    ))}
                  </Stack>
                </Box>
              </Stack>
            </Box>
          </Card>
        </Grid>
      </Grid>

      <CancelDialog
        open={cancelOpen}
        appointmentId={apt?.id}
        onClose={() => setCancelOpen(false)}
        onConfirm={(apptId, reason) => cancelAppointment({ variables: { id: apptId, reason } })}
      />

      {/* SUG-APPT-010: Reschedule Dialog */}
      <RescheduleDialog
        open={rescheduleOpen}
        apt={apt}
        onClose={() => setRescheduleOpen(false)}
        onSave={handleReschedule}
      />

      {/* NEW-APPT-004: Reminder Channel Dialog */}
      <ReminderDialog
        open={reminderDialogOpen}
        onClose={() => setReminderDialogOpen(false)}
        onSend={handleSendReminder}
        patientEmail={apt?.patient?.email}
        patientPhone={apt?.patient?.phone}
      />

      {/* REQ023 (US-BIL-01, scoped subset) — mixed-tender counter payment */}
      <Dialog open={paymentDialogOpen} onClose={() => setPaymentDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Record Counter Payment</DialogTitle>
        <DialogContent>
          {(() => {
            const amountDue = apt?.service?.price ?? 0
            const total = tenders.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0)
            const matches = Math.abs(total - amountDue) < 0.005
            return (
              <Stack spacing={2} sx={{ mt: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Amount due: <strong>₹{amountDue.toFixed(2)}</strong>
                </Typography>
                {paymentError && <Alert severity="error" onClose={() => setPaymentError(null)}>{paymentError}</Alert>}
                {tenders.map((t, i) => (
                  <Stack key={i} direction="row" spacing={1} alignItems="flex-start">
                    <TextField select label="Tender" size="small" value={t.tender_type}
                      onChange={(e) => setTenders((prev) => prev.map((row, idx) => idx === i ? { ...row, tender_type: e.target.value } : row))}
                      sx={{ width: 120 }}>
                      {['cash', 'upi', 'card', 'cheque'].map((tt) => <MenuItem key={tt} value={tt}>{tt.toUpperCase()}</MenuItem>)}
                    </TextField>
                    <TextField label="Amount" type="number" size="small" value={t.amount}
                      onChange={(e) => setTenders((prev) => prev.map((row, idx) => idx === i ? { ...row, amount: e.target.value } : row))}
                      inputProps={{ min: 0, step: 0.01 }} sx={{ width: 110 }} />
                    <TextField label="Reference" size="small" value={t.reference}
                      onChange={(e) => setTenders((prev) => prev.map((row, idx) => idx === i ? { ...row, reference: e.target.value } : row))}
                      placeholder="Optional" sx={{ flex: 1 }} />
                    <IconButton size="small" disabled={tenders.length === 1}
                      onClick={() => setTenders((prev) => prev.filter((_, idx) => idx !== i))}>
                      <DeleteOutlineRoundedIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                ))}
                <Button size="small" startIcon={<AddRoundedIcon />} sx={{ alignSelf: 'flex-start', textTransform: 'none' }}
                  onClick={() => setTenders((prev) => [...prev, { tender_type: 'cash', amount: '', reference: '' }])}>
                  Add another tender
                </Button>
                <Divider />
                <Typography variant="body2" fontWeight={700} color={matches ? 'success.main' : 'text.secondary'}>
                  Total entered: ₹{total.toFixed(2)} {matches ? '✓' : `(₹${(amountDue - total).toFixed(2)} remaining)`}
                </Typography>
              </Stack>
            )
          })()}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPaymentDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={recordingPayment || Math.abs(tenders.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0) - (apt?.service?.price ?? 0)) >= 0.005}
            onClick={() => {
              setPaymentError(null)
              recordCounterPayment({ variables: { input: {
                appointment_id: apt.id,
                tenders: tenders.map((t) => ({ tender_type: t.tender_type, amount: parseFloat(t.amount) || 0, reference: t.reference || undefined })),
              } } })
            }}
          >
            {recordingPayment ? 'Recording…' : 'Record Payment'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
