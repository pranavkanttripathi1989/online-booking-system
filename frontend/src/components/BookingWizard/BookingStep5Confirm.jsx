import { useState, useEffect } from 'react'
import { useMutation } from '@apollo/client'
import dayjs from 'dayjs'
import { Alert, Avatar, Box, Button, CircularProgress, Divider, Paper, Stack, Typography } from '@mui/material'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import LocalHospitalIcon from '@mui/icons-material/LocalHospital'
import MedicalServicesIcon from '@mui/icons-material/MedicalServices'
import PersonIcon from '@mui/icons-material/Person'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import EventIcon from '@mui/icons-material/Event'
import ConfettiExplosion from '../ConfettiExplosion'
import { QRCodeSVG } from 'qrcode.react'

import { CREATE_APPOINTMENT_MUTATION, CREATE_PATIENT_MUTATION } from '../../graphql/mutations'

// ─── Summary Row ──────────────────────────────────────────────────────────────
function SummaryRow({ icon, label, value }) {
  if (!value) return null
  return (
    <Stack direction="row" spacing={2} alignItems="center" py={1}>
      <Box color="primary.main" display="flex" alignItems="center">
        {icon}
      </Box>
      <Box flex={1}>
        <Typography variant="caption" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="body2" fontWeight={600}>
          {value}
        </Typography>
      </Box>
    </Stack>
  )
}

// ─── Success Screen ───────────────────────────────────────────────────────────
function SuccessScreen({ appointment, navigate, onBookAnother }) {
  return (
    <Box textAlign="center" py={4}>
      <ConfettiExplosion />
      <Box
        sx={{
          width: 80,
          height: 80,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mx: 'auto',
          mb: 3,
          boxShadow: '0 16px 40px rgba(99,102,241,0.4)',
        }}
      >
        <CheckCircleIcon sx={{ fontSize: 44, color: 'white' }} />
      </Box>
      <Typography variant="h5" fontWeight={800} mb={1}>
        Appointment Booked! 🎉
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={0.5}>
        Reference ID
      </Typography>
      <Typography
        variant="h6"
        fontWeight={700}
        color="primary"
        sx={{
          fontFamily: 'monospace',
          letterSpacing: 2,
          mb: 3,
          px: 2,
          py: 0.75,
          border: '1px solid',
          borderColor: 'primary.light',
          borderRadius: 2,
          display: 'inline-block',
        }}
      >
        #{appointment?.id ?? '—'}
      </Typography>
      <Box>
        <Typography variant="body2" color="text.secondary">
          {appointment?.patient?.full_name} • {appointment?.service?.name}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {appointment?.start_datetime ? dayjs(appointment.start_datetime).format('dddd, DD MMM YYYY at h:mm A') : ''}
        </Typography>
      </Box>
      {/* REQ107 — checkin_token is populated ONLY in this exact mutation
          response (never re-derivable on a later read — only its hash is
          persisted). Rendered here, once, while it's the only copy the
          frontend will ever have. */}
      {appointment?.checkin_token && (
        <Box sx={{ mt: 3, display: 'inline-block', p: 2, bgcolor: 'white', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
          <QRCodeSVG value={`${window.location.origin}/checkin/${appointment.checkin_token}`} size={160} />
          <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 1 }}>
            Scan at reception to check in
          </Typography>
        </Box>
      )}
      <Stack direction="row" spacing={2} justifyContent="center" mt={4}>
        <Button variant="contained" onClick={() => navigate('/appointments')}>
          View Appointment
        </Button>
        <Button variant="outlined" onClick={onBookAnother}>
          Book Another
        </Button>
      </Stack>
    </Box>
  )
}

// ─── BookingStep5Confirm ──────────────────────────────────────────────────────
export default function BookingStep5Confirm({ wizardData, navigate }) {
  const [createdAppointment, setCreatedAppointment] = useState(null)
  const [error, setError] = useState(null)

  const { clinic, clinician, service, slot, patient, newPatient, patientMode, notes } = wizardData

  // Mutations
  const [createPatient, { loading: creatingPatient }] = useMutation(CREATE_PATIENT_MUTATION)
  const [createAppointment, { loading: creatingAppointment }] = useMutation(CREATE_APPOINTMENT_MUTATION, {
    onCompleted: (data) => {
      setCreatedAppointment(data.createAppointment)
    },
    onError: (err) => {
      setError(err.message)
    },
  })

  const isLoading = creatingPatient || creatingAppointment

  const handleBook = async () => {
    setError(null)
    try {
      let patientId = patient?.id

      // Create new patient first, if needed
      if (patientMode === 'new' && newPatient) {
        const { data } = await createPatient({
          variables: {
            input: {
              first_name: newPatient.first_name,
              last_name: newPatient.last_name,
              email: newPatient.email || undefined,
              phone: newPatient.phone || undefined,
              date_of_birth: newPatient.date_of_birth ? dayjs(newPatient.date_of_birth).format('YYYY-MM-DD') : undefined,
              gender: newPatient.gender || undefined,
            },
          },
        })
        patientId = data?.createPatient?.id
      }

      if (!patientId) {
        setError('Patient information is missing. Please go back and select or enter patient details.')
        return
      }

      await createAppointment({
        variables: {
          input: {
            patient_id: patientId,
            clinician_id: clinician?.id,
            service_id: service?.id,
            clinic_id: clinic?.id,
            slot_id: slot?.id,
            start_datetime: slot?.start_datetime,
            notes: notes || undefined,
            // REQ052 (US-BOOK-06)
            intake_responses: wizardData.intake_responses ?? [],
          },
        },
      })
    } catch (err) {
      setError(err.message)
    }
  }

  const handleBookAnother = () => {
    window.location.reload()
  }

  if (createdAppointment) {
    return <SuccessScreen appointment={createdAppointment} navigate={navigate} onBookAnother={handleBookAnother} />
  }

  const patientDisplay =
    patientMode === 'existing' ? patient?.full_name : newPatient ? `${newPatient.first_name} ${newPatient.last_name} (New)` : '—'

  const estimatedFee = service?.price
    ? `₹${Number(service.price).toFixed(2)}`
    : clinician?.consultation_fee
      ? `₹${Number(clinician.consultation_fee).toFixed(2)}`
      : 'To be confirmed'

  return (
    <Box>
      <Typography variant="h6" fontWeight={700} mb={0.5}>
        Confirm & Book
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Please review all details before confirming the appointment.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Summary Card */}
      <Paper
        elevation={0}
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 3,
          overflow: 'hidden',
          mb: 3,
        }}
      >
        {/* Gradient header */}
        <Box
          sx={{
            p: 2.5,
            background: 'linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(139,92,246,0.06) 100%)',
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Typography variant="subtitle1" fontWeight={800}>
            Booking Summary
          </Typography>
        </Box>

        <Box px={2.5} py={1}>
          <SummaryRow icon={<LocalHospitalIcon fontSize="small" />} label="Clinic" value={clinic?.name} />
          <Divider />
          <SummaryRow icon={<MedicalServicesIcon fontSize="small" />} label="Clinician" value={clinician?.full_name} />
          <Divider />
          <SummaryRow
            icon={<CheckCircleIcon fontSize="small" />}
            label="Service"
            value={service ? `${service.name} — ${service.duration_minutes} min` : '—'}
          />
          <Divider />
          <SummaryRow
            icon={<EventIcon fontSize="small" />}
            label="Date"
            value={slot?.start_datetime ? dayjs(slot.start_datetime).format('dddd, DD MMM YYYY') : '—'}
          />
          <Divider />
          <SummaryRow
            icon={<AccessTimeIcon fontSize="small" />}
            label="Time"
            value={
              slot?.start_datetime ? `${dayjs(slot.start_datetime).format('h:mm A')} — ${dayjs(slot.end_datetime).format('h:mm A')}` : '—'
            }
          />
          <Divider />
          <SummaryRow icon={<PersonIcon fontSize="small" />} label="Patient" value={patientDisplay} />
        </Box>

        {/* Fee */}
        <Box
          sx={{
            px: 2.5,
            py: 1.5,
            background: (t) => (t.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'),
            borderTop: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="body2" color="text.secondary">
              Estimated Fee
            </Typography>
            <Typography variant="h6" fontWeight={800} color="primary">
              {estimatedFee}
            </Typography>
          </Stack>
        </Box>
      </Paper>

      {/* Action */}
      <Stack direction="row" spacing={2} justifyContent="flex-end">
        <Button
          variant="contained"
          size="large"
          onClick={handleBook}
          disabled={isLoading}
          startIcon={isLoading ? <CircularProgress size={18} color="inherit" /> : <CheckCircleIcon />}
          sx={{
            px: 4,
            py: 1.5,
            fontWeight: 700,
            fontSize: '1rem',
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            boxShadow: '0 8px 24px rgba(99,102,241,0.4)',
            '&:hover': {
              boxShadow: '0 12px 32px rgba(99,102,241,0.5)',
            },
          }}
        >
          {isLoading ? 'Booking…' : 'Book Appointment'}
        </Button>
      </Stack>
    </Box>
  )
}
