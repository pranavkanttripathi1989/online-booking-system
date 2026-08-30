import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery } from '@apollo/client'
import { Helmet } from 'react-helmet-async'
import { useSnackbar } from 'notistack'
import dayjs from 'dayjs'
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker'
import { alpha } from '@mui/material/styles'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Grid,
  IconButton,
  MenuItem,
  Paper,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded'
import EditCalendarRoundedIcon from '@mui/icons-material/EditCalendarRounded'
import SaveRoundedIcon from '@mui/icons-material/SaveRounded'

import { UPDATE_APPOINTMENT_MUTATION } from '../../graphql/mutations'
import { APPOINTMENT_DETAIL_QUERY, CLINICIANS_QUERY, ROOMS_QUERY } from '../../graphql/queries'
import * as MockStore from '../../mocks/store'

// Found live while verifying B-2 (project-plans/08-integration-gap-analysis.md):
// missing 'scheduled' — a real, valid status (AppointmentUpdateInput's own
// @IsIn list, backend/src/appointments/dto/appointment.input.ts) and the
// default status a freshly-created appointment actually has. Editing any
// appointment still in that state hit MUI's "out-of-range value" Select
// warning and, from there, the Save button stopped registering clicks
// (confirmed live: notes typed correctly, but nothing ever reached the
// updateAppointment mutation) — a real, previously-shipped defect, not
// something this fix introduced.
const STATUS_OPTIONS = ['scheduled', 'pending', 'confirmed', 'cancelled', 'completed', 'no_show']

export default function EditAppointmentPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { enqueueSnackbar } = useSnackbar()
  const [form, setForm] = useState(null)

  // BUG022's sibling finding (B-2, project-plans/08-integration-gap-analysis.md):
  // these three fallbacks all used `.length`/`??` truthy checks, the same
  // anti-pattern already fixed twice elsewhere in this codebase
  // (appointments/index.jsx, calendar/index.jsx) — they substituted
  // fabricated MockStore data on a genuine EMPTY result, not just a real
  // query error, and `data?.appointment ?? MockStore...` additionally
  // masked a real fetch error entirely (this page never even read `error`
  // off the appointment query before this fix). Gated on `error` only,
  // matching the established convention.
  const { data, loading: fetching, error } = useQuery(APPOINTMENT_DETAIL_QUERY, { variables: { id }, fetchPolicy: 'network-only' })
  // A genuinely nonexistent/deleted appointment id comes back from the real
  // backend as a GraphQL error (appointments.service.ts's own
  // NotFoundException), not a successful `{appointment: null}` result —
  // distinguished from a real connectivity/server error so it gets the
  // real not-found state below instead of a MockStore fallback masking a
  // "this record is genuinely gone" response as a degraded-but-working page.
  const isNotFound = error?.graphQLErrors?.[0]?.message === 'Appointment not found'
  const { data: cliniciansData, error: cliniciansError } = useQuery(CLINICIANS_QUERY, { variables: { first: 100, is_active: true } })
  const { data: roomsData, error: roomsError } = useQuery(ROOMS_QUERY)
  const clinicians = cliniciansError ? MockStore.getClinicians() : (cliniciansData?.clinicians?.data ?? [])
  const rooms = roomsError
    ? MockStore.getAppointments().reduce((acc, a) => {
        if (a.room && !acc.find((r) => r.id === a.room.id)) acc.push(a.room)
        return acc
      }, [])
    : (roomsData?.rooms ?? [])

  useEffect(() => {
    if (isNotFound) return
    const a = error ? MockStore.getAppointmentById(id) : data?.appointment
    if (!a) return
    setForm({
      status: a.status ?? 'pending',
      start: a.start_datetime ? dayjs(a.start_datetime) : null,
      end: a.end_datetime ? dayjs(a.end_datetime) : null,
      clinician_id: a.clinician?.id ?? '',
      room_id: a.room?.id ?? '',
      notes: a.notes ?? '',
      cancellation_reason: a.cancellation_reason ?? '',
    })
  }, [data, error, isNotFound, id])

  const [updateAppointment, { loading }] = useMutation(UPDATE_APPOINTMENT_MUTATION, {
    onCompleted: () => {
      enqueueSnackbar('Appointment updated successfully', { variant: 'success' })
      navigate(`/appointments/${id}`)
    },
    // A save that never reached the real backend must never look like it
    // succeeded — the prior "mock mode" branch here silently wrote the
    // edit into an in-memory MockStore record, showed a success toast, and
    // navigated away as if the change were persisted, when nothing was
    // actually saved. A real failure is always a real failure.
    onError: (err) => {
      enqueueSnackbar(err.message, { variant: 'error' })
    },
  })

  if (fetching)
    return (
      <Box>
        <Skeleton variant="rectangular" height={56} sx={{ borderRadius: 2, mb: 3 }} />
        <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 3 }} />
      </Box>
    )

  // A genuinely nonexistent/deleted appointment — either a real backend
  // NotFoundException (isNotFound) or, in principle, a successful query
  // that simply returns a null appointment — previously left `form` stuck
  // at null forever, rendering the loading skeleton indefinitely instead
  // of a real not-found state.
  if (isNotFound || (!error && data && !data.appointment))
    return (
      <Alert
        severity="warning"
        action={
          <Button color="inherit" size="small" onClick={() => navigate('/appointments')}>
            Back to Appointments
          </Button>
        }
      >
        This appointment could not be found.
      </Alert>
    )

  if (!form)
    return (
      <Box>
        <Skeleton variant="rectangular" height={56} sx={{ borderRadius: 2, mb: 3 }} />
        <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 3 }} />
      </Box>
    )

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  // Validation: end must be after start
  const endBeforeStart = form.start && form.end && !form.end.isAfter(form.start)

  const handleSubmit = () => {
    if (endBeforeStart) {
      enqueueSnackbar('End time must be after start time.', { variant: 'error' })
      return
    }

    // BUG022's sibling finding (B-2), found live while verifying this same
    // slice: AppointmentUpdateInput (backend/src/appointments/dto/
    // appointment.input.ts) has no end_datetime field at all — sending one
    // rejects the ENTIRE mutation with a GraphQL variable-coercion error
    // before it ever reaches the resolver ("Field \"end_datetime\" is not
    // defined by type \"AppointmentUpdateInput\""), unconditionally, since
    // form.end is always populated from the loaded appointment. This page's
    // Save button has never actually worked. End time isn't independently
    // editable on the backend (it's derived from start_datetime + the
    // service's own duration) — the End Date & Time field stays visible as
    // read-only context, not sent in the update.
    updateAppointment({
      variables: {
        id,
        input: {
          status: form.status,
          start_datetime: form.start ? form.start.toISOString() : undefined,
          clinician_id: form.clinician_id || undefined,
          room_id: form.room_id || undefined,
          notes: form.notes || undefined,
          cancellation_reason: form.status === 'cancelled' ? form.cancellation_reason : undefined,
        },
      },
    })
  }

  const apt = error ? MockStore.getAppointmentById(id) : data?.appointment
  return (
    <Box className="page-enter">
      <Helmet>
        <title>Edit Appointment — MediBook</title>
      </Helmet>

      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3, flexWrap: 'wrap' }}>
        <IconButton onClick={() => navigate('/appointments')} sx={{ bgcolor: 'action.hover', '&:hover': { bgcolor: 'divider' } }}>
          <ArrowBackRoundedIcon />
        </IconButton>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2.5,
              background: (t) => `linear-gradient(135deg,${alpha(t.palette.warning.main, 0.2)},${alpha(t.palette.warning.light, 0.3)})`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <EditCalendarRoundedIcon sx={{ color: 'warning.main', fontSize: '1.2rem' }} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={800} color="text.primary">
              Edit Appointment
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {apt?.patient?.full_name} · {apt?.service?.name}
            </Typography>
          </Box>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            onClick={() => navigate('/appointments')}
            sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 700 }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <SaveRoundedIcon />}
            onClick={handleSubmit}
            disabled={loading || !!endBeforeStart}
            sx={{
              borderRadius: 2.5,
              textTransform: 'none',
              fontWeight: 700,
              background: (t) => `linear-gradient(135deg,${t.palette.primary.main},${t.palette.primary.light})`,
              '&:hover': { background: (t) => `linear-gradient(135deg,${t.palette.primary.dark},${t.palette.primary.main})`, boxShadow: (t) => `0 4px 14px ${alpha(t.palette.primary.main, 0.4)}` },
            }}
          >
            {loading ? 'Saving…' : 'Save Changes'}
          </Button>
        </Stack>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider', mb: 3 }}>
            <Typography variant="subtitle1" fontWeight={700} color="text.primary" mb={2.5}>
              Schedule
            </Typography>
            <Grid container spacing={2.5}>
              <Grid item xs={12} sm={6}>
                <DateTimePicker
                  label="Start Date & Time"
                  value={form.start}
                  onChange={(v) => setForm((f) => ({ ...f, start: v }))}
                  slotProps={{ textField: { fullWidth: true, sx: { '& .MuiOutlinedInput-root': { borderRadius: 2 } } } }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <DateTimePicker
                  label="End Date & Time"
                  value={form.end}
                  disabled
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      error: !!endBeforeStart,
                      helperText: endBeforeStart ? 'End time must be after start time' : 'Set automatically from the service duration',
                      sx: { '& .MuiOutlinedInput-root': { borderRadius: 2 } },
                    },
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  fullWidth
                  label="Clinician"
                  value={form.clinician_id}
                  onChange={set('clinician_id')}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                >
                  <MenuItem value="">No clinician</MenuItem>
                  {clinicians.map((c) => (
                    <MenuItem key={c.id} value={c.id}>
                      {c.full_name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  fullWidth
                  label="Room"
                  value={form.room_id}
                  onChange={set('room_id')}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                >
                  <MenuItem value="">No room</MenuItem>
                  {rooms.map((r) => (
                    <MenuItem key={r.id} value={r.id}>
                      {r.name} — {r.clinic?.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Notes"
                  value={form.notes}
                  onChange={set('notes')}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                />
              </Grid>
            </Grid>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider', mb: 3 }}>
            <Typography variant="subtitle1" fontWeight={700} color="text.primary" mb={2.5}>
              Status
            </Typography>
            <TextField
              select
              fullWidth
              label="Appointment Status"
              value={form.status}
              onChange={set('status')}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 }, mb: 2 }}
            >
              {STATUS_OPTIONS.map((s) => (
                <MenuItem key={s} value={s}>
                  {s.replace('_', ' ')}
                </MenuItem>
              ))}
            </TextField>
            {form.status === 'cancelled' && (
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Cancellation Reason"
                value={form.cancellation_reason}
                onChange={set('cancellation_reason')}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            )}
          </Paper>

          {/* Read-only info */}
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider', bgcolor: 'action.hover' }}>
            <Typography variant="subtitle2" fontWeight={700} color="text.secondary" mb={1}>
              Patient
            </Typography>
            <Typography fontWeight={600}>{apt?.patient?.full_name ?? '—'}</Typography>
            <Typography variant="body2" color="text.secondary">
              {apt?.patient?.email}
            </Typography>
            <Typography variant="subtitle2" fontWeight={700} color="text.secondary" mt={2} mb={0.5}>
              Service
            </Typography>
            <Typography fontWeight={600}>{apt?.service?.name ?? '—'}</Typography>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  )
}
