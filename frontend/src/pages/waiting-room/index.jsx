import { useMemo, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@apollo/client'
import { useSnackbar } from 'notistack'
import dayjs from 'dayjs'
import {
  Avatar, Box, Button, Card, CardContent, Chip, Paper, Stack, TextField, Tooltip, Typography, CircularProgress,
} from '@mui/material'
import PersonAddAltRoundedIcon from '@mui/icons-material/PersonAddAltRounded'
import MedicalServicesRoundedIcon from '@mui/icons-material/MedicalServicesRounded'
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded'
import EventBusyRoundedIcon from '@mui/icons-material/EventBusyRounded'
import UndoRoundedIcon from '@mui/icons-material/UndoRounded'
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded'
import HourglassEmptyRoundedIcon from '@mui/icons-material/HourglassEmptyRounded'

import ErrorBoundary from '../../components/ErrorBoundary'
import EmptyState from '../../components/shared/EmptyState'
import { APPOINTMENTS_QUERY } from '../../graphql/queries'
import {
  CHECK_IN_APPOINTMENT_MUTATION, START_CONSULTATION_MUTATION, COMPLETE_APPOINTMENT_MUTATION,
  MARK_NO_SHOW_MUTATION, RESET_APPOINTMENT_JOURNEY_MUTATION,
} from '../../graphql/mutations'

// REQ042 — real backend statuses replace the old MockStore `journey` object
// (arrived/consultation/departed/dna). `checked_in`/`in_consultation` are
// additive Appointments.status values (appointments.service.ts); `completed`
// and `no_show` already existed.
function journeyStage(status) {
  if (status === 'no_show') return 'dna'
  if (status === 'completed') return 'departed'
  if (status === 'in_consultation') return 'in_consultation'
  if (status === 'checked_in') return 'arrived'
  return 'not_arrived' // scheduled, confirmed, or anything else pre-arrival
}

const STAGE_META = {
  not_arrived:     { label: 'Not arrived',      color: '#5F6368', bg: '#F1F3F4' },
  arrived:         { label: 'Checked in',        color: '#1A73E8', bg: '#E8F0FE' },
  in_consultation: { label: 'With clinician',    color: '#7B3FE4', bg: '#F3E8FD' },
  departed:        { label: 'Completed',         color: '#188038', bg: '#E6F4EA' },
  dna:             { label: 'Did not attend',    color: '#B3261E', bg: '#FCE8E6' },
}

function WaitingRoomContent() {
  const navigate = useNavigate()
  const { enqueueSnackbar } = useSnackbar()
  const [selectedDate, setSelectedDate] = useState(dayjs().format('YYYY-MM-DD'))

  const { data, loading, error, refetch } = useQuery(APPOINTMENTS_QUERY, {
    variables: { filters: { date_from: selectedDate, date_to: selectedDate }, first: 200, page: 1 },
    fetchPolicy: 'cache-and-network',
  })

  const mutationOpts = { onCompleted: () => refetch(), onError: (e) => enqueueSnackbar(e.message, { variant: 'error' }) }
  const [checkIn] = useMutation(CHECK_IN_APPOINTMENT_MUTATION, mutationOpts)
  const [startConsult] = useMutation(START_CONSULTATION_MUTATION, mutationOpts)
  const [checkOut] = useMutation(COMPLETE_APPOINTMENT_MUTATION, mutationOpts)
  const [markDna] = useMutation(MARK_NO_SHOW_MUTATION, mutationOpts)
  const [resetJourney] = useMutation(RESET_APPOINTMENT_JOURNEY_MUTATION, mutationOpts)

  const list = useMemo(
    () => (data?.appointments?.data ?? []).filter((a) => a.status !== 'cancelled'),
    [data],
  )
  const counts = useMemo(() => {
    const c = { not_arrived: 0, arrived: 0, in_consultation: 0, departed: 0, dna: 0 }
    list.forEach((a) => { c[journeyStage(a.status)]++ })
    return c
  }, [list])

  if (error) {
    return (
      <EmptyState
        icon={HourglassEmptyRoundedIcon}
        title="Couldn't load the waiting room"
        subtitle={error.message}
      />
    )
  }

  return (
    <Box className="page-enter" sx={{ pb: 4 }}>
      <Helmet><title>Waiting Room — MediBook</title></Helmet>

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between" alignItems={{ sm: 'center' }}
        spacing={1.5} sx={{ mb: 3 }}
      >
        <Box>
          <Typography variant="h4" fontWeight={800} sx={{ fontSize: { xs: '1.35rem', sm: '1.5rem' } }}>Waiting Room</Typography>
          <Typography variant="body2" color="text.secondary">
            Front-desk view of real patient arrival, consultation and departure.
          </Typography>
        </Box>
        <TextField
          type="date" size="small" label="Date" value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 }, width: { xs: '100%', sm: 200 } }}
        />
      </Stack>

      {/* Stage summary */}
      <Stack direction="row" spacing={1.5} sx={{ mb: 3, overflowX: 'auto', pb: 0.5 }}>
        {Object.entries(STAGE_META).map(([key, meta]) => (
          <Paper key={key} elevation={0} sx={{ px: 2, py: 1.25, borderRadius: 2.5, border: '1px solid #E8EAED', flexShrink: 0, minWidth: 130 }}>
            <Typography variant="h5" fontWeight={800} sx={{ color: meta.color }}>{counts[key]}</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>{meta.label}</Typography>
          </Paper>
        ))}
      </Stack>

      {loading && list.length === 0 ? (
        <Stack alignItems="center" sx={{ py: 6 }}><CircularProgress /></Stack>
      ) : list.length === 0 ? (
        <EmptyState
          icon={HourglassEmptyRoundedIcon}
          title="No appointments for this date"
          subtitle="Pick a different date to see the patient queue."
        />
      ) : (
        <Stack spacing={1.5}>
          {list.map((appt) => {
            const stage = journeyStage(appt.status)
            const meta = STAGE_META[stage]
            return (
              <Card key={appt.id} variant="outlined" sx={{ borderRadius: 2.5 }}>
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
                    <Avatar sx={{ bgcolor: '#E8F0FE', color: '#1A73E8', fontWeight: 700 }}>
                      {appt.patient?.full_name?.[0] ?? 'P'}
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography
                        variant="body1" fontWeight={700} sx={{ cursor: 'pointer' }}
                        onClick={() => navigate(`/patients/${appt.patient?.id}`)}
                      >
                        {appt.patient?.full_name ?? 'Unknown patient'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {dayjs(appt.start_datetime).format('h:mm A')} · {appt.clinician?.full_name ?? '—'} · {appt.room?.name ?? 'No room'} · {appt.service?.name ?? ''}
                      </Typography>
                    </Box>

                    <Chip
                      label={meta.label} size="small"
                      sx={{ bgcolor: meta.bg, color: meta.color, fontWeight: 700, flexShrink: 0 }}
                    />

                    <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
                      {stage === 'not_arrived' && (
                        <>
                          <Button
                            size="small" variant="contained" startIcon={<PersonAddAltRoundedIcon />}
                            onClick={() => checkIn({ variables: { id: appt.id } })}
                            sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 700 }}
                          >
                            Check In
                          </Button>
                          <Tooltip title="Mark as did-not-attend">
                            <Button
                              size="small" color="error" variant="outlined" startIcon={<EventBusyRoundedIcon />}
                              onClick={() => markDna({ variables: { id: appt.id } })}
                              sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 700 }}
                            >
                              No-show
                            </Button>
                          </Tooltip>
                        </>
                      )}
                      {stage === 'arrived' && (
                        <Button
                          size="small" variant="contained" startIcon={<MedicalServicesRoundedIcon />}
                          onClick={() => startConsult({ variables: { id: appt.id } })}
                          sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 700, bgcolor: '#7B3FE4', '&:hover': { bgcolor: '#6329D1' } }}
                        >
                          Start Consultation
                        </Button>
                      )}
                      {stage === 'in_consultation' && (
                        <Button
                          size="small" variant="contained" startIcon={<LogoutRoundedIcon />}
                          onClick={() => checkOut({ variables: { id: appt.id } })}
                          sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 700, bgcolor: '#188038', '&:hover': { bgcolor: '#12652C' } }}
                        >
                          Check Out
                        </Button>
                      )}
                      {(stage === 'departed' || stage === 'dna') && (
                        <>
                          <Chip
                            icon={stage === 'departed' ? <CheckCircleRoundedIcon /> : <EventBusyRoundedIcon />}
                            label={stage === 'departed' ? 'Visit complete' : 'Recorded as no-show'}
                            size="small" variant="outlined"
                            sx={{ fontWeight: 700, color: meta.color, borderColor: meta.color }}
                          />
                          <Tooltip title="Undo — reset this patient's journey status">
                            <Button
                              size="small" onClick={() => resetJourney({ variables: { id: appt.id } })}
                              startIcon={<UndoRoundedIcon />}
                              sx={{ textTransform: 'none', color: 'text.secondary' }}
                              aria-label={`Reset journey status for ${appt.patient?.full_name}`}
                            >
                              Undo
                            </Button>
                          </Tooltip>
                        </>
                      )}
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            )
          })}
        </Stack>
      )}
    </Box>
  )
}

export default function WaitingRoomPage() {
  return (
    <ErrorBoundary>
      <WaitingRoomContent />
    </ErrorBoundary>
  )
}
