import React, { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useMutation, gql } from '@apollo/client'
import { Box, Paper, Typography, CircularProgress, Button, Stack, Grid, Alert } from '@mui/material'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar'
import EventAvailableRoundedIcon from '@mui/icons-material/EventAvailableRounded'
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded'
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded'
import dayjs from 'dayjs'
import { formatCurrency } from '../../utils/dateTime'

// P2-16 — @Public(), same "opaque token is the sole authority" shape as
// checkin.jsx's own CHECK_IN_WITH_QR_TOKEN. Read-only, called on mount so
// the page can render a specific valid/expired/used/not-found state before
// the patient ever picks a new time.
const GET_RESCHEDULE_CONTEXT = gql`
  query GetRescheduleContext($token: String!) {
    getRescheduleContext(token: $token) {
      clinician_id
      clinician_name
      service_name
      current_start_datetime
      duration_minutes
      booking_mode
    }
  }
`

// Re-declared to match booking/index.jsx's own gql documents verbatim
// (public dialect, camelCase) — this reuses that page's exact two
// primitives (the clinician's weekly working-hours grid, and the day's
// already-booked times) rather than a parallel slot-picking mechanism.
const GET_CLINICIAN_AVAILABILITY = gql`
  query GetClinicianAvailabilityForReschedule($id: ID!) {
    getClinicianAvailability(clinicianId: $id) {
      id
      dayOfWeek
      startTime
      endTime
      recurrenceType
      mode
    }
  }
`

const GET_APPOINTMENTS = gql`
  query GetAppointmentsForReschedule($clinicianId: ID!, $date: String!) {
    getAppointments(clinicianId: $clinicianId, date: $date) {
      id
      startTime
    }
  }
`

const RESCHEDULE_PUBLIC_APPOINTMENT = gql`
  mutation ReschedulePublicAppointment($token: String!, $new_start_datetime: String!) {
    reschedulePublicAppointment(token: $token, new_start_datetime: $new_start_datetime) {
      id
      start_datetime
      reschedule_fee_amount
    }
  }
`

function ContextState({ icon, title, body }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', px: 2, py: 6 }}>
      <Paper elevation={0} sx={{ p: 4, maxWidth: 460, width: '100%', textAlign: 'center', border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
        <Stack spacing={2} alignItems="center">
          {icon}
          <Typography variant="h6" fontWeight={800}>
            {title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {body}
          </Typography>
        </Stack>
      </Paper>
    </Box>
  )
}

export default function ReschedulePage() {
  const { token } = useParams()
  const { data, loading, error } = useQuery(GET_RESCHEDULE_CONTEXT, { variables: { token }, skip: !token })

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    )
  }

  // STATE-6/STATE-7 — the backend already distinguishes not-found / used /
  // expired / wrong-status with a distinct human message each
  // (getRescheduleContext's own checks); surfaced verbatim rather than a
  // single generic error, matching checkin.jsx's own established pattern.
  if (error) {
    return (
      <ContextState
        icon={<ErrorOutlineRoundedIcon sx={{ fontSize: 56, color: 'error.main' }} />}
        title="This reschedule link isn't valid"
        body={error.graphQLErrors?.[0]?.message || 'Please contact the clinic to reschedule your appointment.'}
      />
    )
  }

  const ctx = data?.getRescheduleContext
  if (!ctx) return null

  if (ctx.booking_mode !== 'slot') {
    return (
      <ContextState
        icon={<EventAvailableRoundedIcon sx={{ fontSize: 56, color: 'primary.main' }} />}
        title="Please contact the clinic to reschedule"
        body="This booking can't be rescheduled through this link — call the clinic and they'll help you move it."
      />
    )
  }

  return <ReschedulePicker token={token} context={ctx} />
}

function ReschedulePicker({ token, context }) {
  const [selectedDate, setSelectedDate] = useState(dayjs().add(1, 'day'))
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [result, setResult] = useState(null)

  const { data: availData } = useQuery(GET_CLINICIAN_AVAILABILITY, { variables: { id: context.clinician_id } })
  const { data: apptData } = useQuery(GET_APPOINTMENTS, {
    variables: { clinicianId: context.clinician_id, date: selectedDate.format('YYYY-MM-DD') },
    fetchPolicy: 'network-only', // BOOK-1 — availability is stale the moment it renders
  })
  const [reschedule, { loading: submitting, error: submitError }] = useMutation(RESCHEDULE_PUBLIC_APPOINTMENT)

  // Same 30-minute-step generation booking/index.jsx's own availableSlots()
  // uses, against the same getClinicianAvailability shape — not a
  // different slot cadence for this page.
  const slots = useMemo(() => {
    const rows = availData?.getClinicianAvailability
    if (!rows?.length) return []
    const dow = selectedDate.day()
    const dayAvailabilities = rows.filter((a) => Number(a.dayOfWeek) === dow || a.recurrenceType === 'daily')
    const times = []
    dayAvailabilities.forEach((avail) => {
      let current = dayjs(`${selectedDate.format('YYYY-MM-DD')}T${avail.startTime}`)
      const end = dayjs(`${selectedDate.format('YYYY-MM-DD')}T${avail.endTime}`)
      while (current.isBefore(end)) {
        times.push(current.format('HH:mm'))
        current = current.add(30, 'minute')
      }
    })
    return times
  }, [availData, selectedDate])

  const bookedTimes = apptData?.getAppointments?.map((a) => dayjs(a.startTime).format('HH:mm')) ?? []

  const handleConfirm = async () => {
    if (!selectedSlot) return
    const newStartDatetime = dayjs(`${selectedDate.format('YYYY-MM-DD')}T${selectedSlot}`).toISOString()
    try {
      const { data } = await reschedule({ variables: { token, new_start_datetime: newStartDatetime } })
      setResult(data?.reschedulePublicAppointment)
    } catch {
      // surfaced via submitError below
    }
  }

  if (result) {
    return (
      <ContextState
        icon={<CheckCircleRoundedIcon sx={{ fontSize: 56, color: 'success.main' }} />}
        title="You're rescheduled"
        body={
          result.reschedule_fee_amount
            ? `Your new time is ${dayjs(result.start_datetime).format('ddd, D MMM')} at ${dayjs(result.start_datetime).format('h:mm A')}. A rescheduling fee of ${formatCurrency(result.reschedule_fee_amount)} applies — the clinic will collect it at your visit.`
            : `Your new time is ${dayjs(result.start_datetime).format('ddd, D MMM')} at ${dayjs(result.start_datetime).format('h:mm A')}.`
        }
      />
    )
  }

  return (
    <Box sx={{ maxWidth: 720, mx: 'auto', px: 2, py: 4 }}>
      <Paper elevation={0} sx={{ p: 3, mb: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
        <Typography variant="subtitle1" fontWeight={700}>
          Reschedule your appointment
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Currently {dayjs(context.current_start_datetime).format('ddd, D MMM')} at{' '}
          {dayjs(context.current_start_datetime).format('h:mm A')} with {context.clinician_name}
          {context.service_name ? ` for ${context.service_name}` : ''}. Pick a new time below.
        </Typography>
      </Paper>

      {submitError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {submitError.graphQLErrors?.[0]?.message || 'This time is no longer available — please pick another.'}
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, p: 1 }}>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DateCalendar
                value={selectedDate}
                minDate={dayjs()}
                onChange={(newDate) => {
                  setSelectedDate(newDate)
                  setSelectedSlot(null)
                }}
              />
            </LocalizationProvider>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          {slots.length > 0 ? (
            <Grid container spacing={1}>
              {slots.map((slot) => (
                <Grid item xs={4} sm={3} md={4} key={slot}>
                  <Button
                    fullWidth
                    variant={selectedSlot === slot ? 'contained' : 'outlined'}
                    size="medium"
                    onClick={() => setSelectedSlot(slot)}
                    disabled={bookedTimes.includes(slot)}
                    sx={{ py: 1 }}
                  >
                    {dayjs(`2000-01-01T${slot}`).format('h:mm A')}
                  </Button>
                </Grid>
              ))}
            </Grid>
          ) : (
            <Alert severity="info">No availability on this date — please choose another day.</Alert>
          )}
        </Grid>
      </Grid>

      <Button
        fullWidth
        variant="contained"
        size="large"
        sx={{ mt: 3, textTransform: 'none', fontWeight: 700 }}
        disabled={!selectedSlot || submitting}
        onClick={handleConfirm}
      >
        {submitting ? <CircularProgress size={22} color="inherit" /> : 'Confirm new time'}
      </Button>
    </Box>
  )
}
