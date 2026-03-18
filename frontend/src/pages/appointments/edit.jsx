import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery } from '@apollo/client'
import { Helmet } from 'react-helmet-async'
import { useSnackbar } from 'notistack'
import dayjs from 'dayjs'
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker'
import {
  Box, Button, CircularProgress, Grid, IconButton, MenuItem,
  Paper, Skeleton, Stack, TextField, Typography,
} from '@mui/material'
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded'
import EditCalendarRoundedIcon from '@mui/icons-material/EditCalendarRounded'
import SaveRoundedIcon from '@mui/icons-material/SaveRounded'

import { UPDATE_APPOINTMENT_MUTATION }  from '../../graphql/mutations'
import { APPOINTMENT_DETAIL_QUERY, CLINICIANS_QUERY, ROOMS_QUERY } from '../../graphql/queries'
import * as MockStore from '../../mocks/store'

const STATUS_OPTIONS = ['pending','confirmed','cancelled','completed','no_show']

export default function EditAppointmentPage() {
  const { id }   = useParams()
  const navigate = useNavigate()
  const { enqueueSnackbar } = useSnackbar()
  const [form, setForm]     = useState(null)

  const { data, loading: fetching } = useQuery(APPOINTMENT_DETAIL_QUERY, { variables: { id }, fetchPolicy: 'network-only' })
  const { data: cliniciansData }    = useQuery(CLINICIANS_QUERY, { variables: { first: 100, is_active: true } })
  const { data: roomsData }         = useQuery(ROOMS_QUERY)
  const clinicians = cliniciansData?.clinicians?.data?.length
    ? cliniciansData.clinicians.data
    : MockStore.getClinicians()
  const rooms = roomsData?.rooms?.length
    ? roomsData.rooms
    : MockStore.getAppointments().reduce((acc, a) => {
        if (a.room && !acc.find(r => r.id === a.room.id)) acc.push(a.room)
        return acc
      }, [])

  useEffect(() => {
    // Use GraphQL data first, fallback to MockStore when backend is offline
    const a = data?.appointment ?? MockStore.getAppointmentById(id)
    if (!a) return
    setForm({
      status:       a.status ?? 'pending',
      start:        a.start_datetime ? dayjs(a.start_datetime) : null,
      end:          a.end_datetime   ? dayjs(a.end_datetime)   : null,
      clinician_id: a.clinician?.id ?? '',
      room_id:      a.room?.id      ?? '',
      notes:        a.notes         ?? '',
      cancellation_reason: a.cancellation_reason ?? '',
    })
  }, [data, id])

  const [updateAppointment, { loading }] = useMutation(UPDATE_APPOINTMENT_MUTATION, {
    onCompleted: () => {
      enqueueSnackbar('Appointment updated successfully', { variant: 'success' })
      navigate('/appointments')
    },
    onError: (err) => enqueueSnackbar(err.message, { variant: 'error' }),
  })

  if (fetching || !form) return (
    <Box><Skeleton variant="rectangular" height={56} sx={{ borderRadius: 2, mb: 3 }} />
      <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 3 }} /></Box>
  )

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }))

  const handleSubmit = () => {
    updateAppointment({
      variables: {
        id,
        input: {
          status:       form.status,
          start_datetime: form.start ? form.start.toISOString() : undefined,
          end_datetime:   form.end   ? form.end.toISOString()   : undefined,
          clinician_id:   form.clinician_id || undefined,
          room_id:        form.room_id       || undefined,
          notes:          form.notes         || undefined,
          cancellation_reason: form.status === 'cancelled' ? form.cancellation_reason : undefined,
        }
      }
    })
  }

  const apt = data?.appointment ?? MockStore.getAppointmentById(id)
  return (
    <Box className="page-enter">
      <Helmet><title>Edit Appointment — MediBook</title></Helmet>

      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3, flexWrap: 'wrap' }}>
        <IconButton onClick={() => navigate('/appointments')} sx={{ bgcolor: '#F1F3F4', '&:hover': { bgcolor: '#E8EAED' } }}>
          <ArrowBackRoundedIcon />
        </IconButton>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1 }}>
          <Box sx={{ width: 40, height: 40, borderRadius: 2.5, background: 'linear-gradient(135deg,#FEF7E0,#FEEFC3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <EditCalendarRoundedIcon sx={{ color: '#F9AB00', fontSize: '1.2rem' }} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={800} color="#202124">Edit Appointment</Typography>
            <Typography variant="body2" color="text.secondary">
              {apt?.patient?.full_name} · {apt?.service?.name}
            </Typography>
          </Box>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" onClick={() => navigate('/appointments')} sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 700 }}>Cancel</Button>
          <Button variant="contained" startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <SaveRoundedIcon />}
            onClick={handleSubmit} disabled={loading}
            sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 700, background: 'linear-gradient(135deg,#4285F4,#1A73E8)', '&:hover': { background: 'linear-gradient(135deg,#1A73E8,#1557B0)' } }}
          >
            {loading ? 'Saving…' : 'Save Changes'}
          </Button>
        </Stack>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #E8EAED', mb: 3 }}>
            <Typography variant="subtitle1" fontWeight={700} color="#202124" mb={2.5}>Schedule</Typography>
            <Grid container spacing={2.5}>
              <Grid item xs={12} sm={6}>
                <DateTimePicker label="Start Date & Time" value={form.start}
                  onChange={(v) => setForm(f => ({ ...f, start: v }))}
                  slotProps={{ textField: { fullWidth: true, sx: { '& .MuiOutlinedInput-root': { borderRadius: 2 } } } }} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <DateTimePicker label="End Date & Time" value={form.end}
                  onChange={(v) => setForm(f => ({ ...f, end: v }))}
                  slotProps={{ textField: { fullWidth: true, sx: { '& .MuiOutlinedInput-root': { borderRadius: 2 } } } }} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField select fullWidth label="Clinician" value={form.clinician_id} onChange={set('clinician_id')} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}>
                  <MenuItem value="">No clinician</MenuItem>
                  {clinicians.map(c => <MenuItem key={c.id} value={c.id}>{c.full_name}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField select fullWidth label="Room" value={form.room_id} onChange={set('room_id')} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}>
                  <MenuItem value="">No room</MenuItem>
                  {rooms.map(r => <MenuItem key={r.id} value={r.id}>{r.name} — {r.clinic?.name}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth multiline rows={3} label="Notes" value={form.notes} onChange={set('notes')} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
              </Grid>
            </Grid>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #E8EAED', mb: 3 }}>
            <Typography variant="subtitle1" fontWeight={700} color="#202124" mb={2.5}>Status</Typography>
            <TextField select fullWidth label="Appointment Status" value={form.status} onChange={set('status')} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 }, mb: 2 }}>
              {STATUS_OPTIONS.map(s => <MenuItem key={s} value={s}>{s.replace('_', ' ')}</MenuItem>)}
            </TextField>
            {form.status === 'cancelled' && (
              <TextField fullWidth multiline rows={2} label="Cancellation Reason" value={form.cancellation_reason} onChange={set('cancellation_reason')} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
            )}
          </Paper>

          {/* Read-only info */}
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #E8EAED', bgcolor: '#F8F9FA' }}>
            <Typography variant="subtitle2" fontWeight={700} color="#5F6368" mb={1}>Patient</Typography>
            <Typography fontWeight={600}>{apt?.patient?.full_name ?? '—'}</Typography>
            <Typography variant="body2" color="text.secondary">{apt?.patient?.email}</Typography>
            <Typography variant="subtitle2" fontWeight={700} color="#5F6368" mt={2} mb={0.5}>Service</Typography>
            <Typography fontWeight={600}>{apt?.service?.name ?? '—'}</Typography>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  )
}
