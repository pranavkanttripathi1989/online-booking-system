import { useMemo, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import {
  Avatar, Box, Button, Card, CardContent, Chip, Paper, Stack, TextField, Tooltip, Typography,
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
import { useMockData, useMockMutation } from '../../mocks/useMockData'
import * as MockStore from '../../mocks/store'

// ─── Journey stage derivation ──────────────────────────────────────────────────
// Mirrors Semble's Journey object (arrived/consultation/departed/dna), nested on Booking.
// requirements/semble-competitive-gap-analysis-requirements.md — Scheduling table + Phase 3.
function journeyStage(journey) {
  if (!journey) return 'not_arrived'
  if (journey.dna) return 'dna'
  if (journey.departed) return 'departed'
  if (journey.consultation) return 'in_consultation'
  if (journey.arrived) return 'arrived'
  return 'not_arrived'
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

  // Seed data lives around March 2026 (see mocks/data/appointments.js) rather than the
  // real system date, so default to whichever date has the most bookings instead of
  // hard-filtering to "today" and showing an empty room.
  const defaultDate = useMemo(() => {
    const counts = {}
    MockStore.getAppointments().forEach((a) => {
      const d = a.start_datetime?.slice(0, 10)
      if (d) counts[d] = (counts[d] ?? 0) + 1
    })
    const busiest = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0]
    return busiest ?? dayjs().format('YYYY-MM-DD')
  }, [])

  const [selectedDate, setSelectedDate] = useState(defaultDate)

  const { data: appointments } = useMockData((store) =>
    store.getAppointments({ dateFrom: selectedDate, dateTo: selectedDate })
      .filter((a) => a.status !== 'cancelled')
  )

  const [checkIn]     = useMockMutation(MockStore.checkInPatient)
  const [startConsult] = useMockMutation(MockStore.markConsultationStarted)
  const [checkOut]    = useMockMutation(MockStore.checkOutPatient)
  const [markDna]     = useMockMutation(MockStore.markPatientDidNotAttend)
  const [resetJourney] = useMockMutation(MockStore.resetPatientJourney)

  const list = appointments ?? []
  const counts = useMemo(() => {
    const c = { not_arrived: 0, arrived: 0, in_consultation: 0, departed: 0, dna: 0 }
    list.forEach((a) => { c[journeyStage(a.journey)]++ })
    return c
  }, [list])

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
            Front-desk view of patient arrival, consultation and departure — mirrors Semble's Journey tracking.
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

      {list.length === 0 ? (
        <EmptyState
          icon={HourglassEmptyRoundedIcon}
          title="No appointments for this date"
          subtitle="Pick a different date to see the patient queue."
        />
      ) : (
        <Stack spacing={1.5}>
          {list.map((appt) => {
            const stage = journeyStage(appt.journey)
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
                            onClick={() => checkIn(appt.id)}
                            sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 700 }}
                          >
                            Check In
                          </Button>
                          <Tooltip title="Mark as did-not-attend">
                            <Button
                              size="small" color="error" variant="outlined" startIcon={<EventBusyRoundedIcon />}
                              onClick={() => markDna(appt.id)}
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
                          onClick={() => startConsult(appt.id)}
                          sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 700, bgcolor: '#7B3FE4', '&:hover': { bgcolor: '#6329D1' } }}
                        >
                          Start Consultation
                        </Button>
                      )}
                      {stage === 'in_consultation' && (
                        <Button
                          size="small" variant="contained" startIcon={<LogoutRoundedIcon />}
                          onClick={() => checkOut(appt.id)}
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
                              size="small" onClick={() => resetJourney(appt.id)}
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
