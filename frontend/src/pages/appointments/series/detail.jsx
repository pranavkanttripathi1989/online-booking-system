import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@apollo/client'
import { Helmet } from 'react-helmet-async'
import { useSnackbar } from 'notistack'
import dayjs from 'dayjs'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Button,
  Stack,
  Skeleton,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
} from '@mui/material'
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded'
import EventRepeatRoundedIcon from '@mui/icons-material/EventRepeatRounded'
import { GET_APPOINTMENT_SERIES } from '../../../graphql/queries'
import { CANCEL_APPOINTMENT_SERIES_MUTATION } from '../../../graphql/mutations'

const NON_TERMINAL_STATUSES = ['scheduled', 'confirmed', 'awaiting_payment', 'checked_in', 'in_consultation']

const STATUS_LABELS = {
  scheduled: 'Scheduled',
  confirmed: 'Confirmed',
  awaiting_payment: 'Awaiting payment',
  checked_in: 'Checked in',
  in_consultation: 'In consultation',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_show: 'No-show',
}

export default function AppointmentSeriesDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { enqueueSnackbar } = useSnackbar()
  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')

  const { data, loading, error, refetch } = useQuery(GET_APPOINTMENT_SERIES, { variables: { id }, fetchPolicy: 'cache-and-network' })
  const [cancelSeries, { loading: cancelling }] = useMutation(CANCEL_APPOINTMENT_SERIES_MUTATION)

  const series = data?.appointmentSeries

  // 'completed' is never stored server-side (REQ163) -- derived here from
  // every occurrence's own real status.
  const displayStatus =
    series?.status === 'cancelled'
      ? 'cancelled'
      : series?.appointments?.length > 0 && series.appointments.every((a) => !NON_TERMINAL_STATUSES.includes(a.status))
        ? 'completed'
        : 'active'

  const handleCancel = async () => {
    try {
      const { data: result } = await cancelSeries({ variables: { input: { series_id: id, reason: cancelReason || 'Cancelled by staff' } } })
      const r = result.cancelAppointmentSeries
      enqueueSnackbar(`${r.cancelled_count} of ${r.attempted_count} remaining appointments cancelled.`, {
        variant: r.failed_count > 0 ? 'warning' : 'success',
      })
      setCancelOpen(false)
      setCancelReason('')
      refetch()
    } catch (err) {
      enqueueSnackbar(err.message || 'Could not cancel this series.', { variant: 'error' })
    }
  }

  if (loading && !series) {
    return (
      <Box p={{ xs: 2, md: 3 }} maxWidth="lg" mx="auto">
        <Skeleton variant="text" width={280} height={48} />
        <Skeleton variant="rectangular" height={300} sx={{ mt: 2, borderRadius: 2 }} />
      </Box>
    )
  }

  if (error || !series) {
    return (
      <Box p={{ xs: 2, md: 3 }} maxWidth="lg" mx="auto">
        <Alert severity="error">Could not load this series — it may not exist, or you may not have access to it.</Alert>
      </Box>
    )
  }

  return (
    <Box className="page-enter" p={{ xs: 2, md: 3 }} maxWidth="lg" mx="auto">
      <Helmet>
        <title>{series.name} — MediBook</title>
      </Helmet>
      <Stack direction="row" alignItems="center" spacing={1.5} mb={3}>
        <IconButton onClick={() => navigate('/appointments')} aria-label="Back to appointments">
          <ArrowBackRoundedIcon />
        </IconButton>
        <EventRepeatRoundedIcon sx={{ color: 'primary.main' }} />
        <Box>
          <Typography variant="h5" fontWeight={800}>
            {series.name}
          </Typography>
          <Stack direction="row" spacing={1} mt={0.5}>
            <Chip size="small" label={series.series_type === 'recurring' ? 'Recurring series' : 'Treatment plan'} />
            <Chip
              size="small"
              label={displayStatus === 'cancelled' ? 'Cancelled' : displayStatus === 'completed' ? 'Completed' : 'Active'}
              color={displayStatus === 'cancelled' ? 'default' : displayStatus === 'completed' ? 'success' : 'primary'}
            />
          </Stack>
        </Box>
        <Box flex={1} />
        {displayStatus === 'active' && (
          <Button variant="outlined" color="error" onClick={() => setCancelOpen(true)} sx={{ textTransform: 'none' }}>
            Cancel remaining
          </Button>
        )}
      </Stack>

      <Card>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={700} mb={2}>
            Occurrences ({series.appointments?.length ?? 0})
          </Typography>
          {!series.appointments?.length ? (
            <Alert severity="info">No appointments were created for this series.</Alert>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>#</TableCell>
                    <TableCell>Date &amp; time</TableCell>
                    <TableCell>Service</TableCell>
                    <TableCell>Clinician</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {series.appointments.map((appt, i) => (
                    <TableRow key={appt.id} hover>
                      <TableCell>{i + 1}</TableCell>
                      <TableCell>{dayjs(appt.start_datetime).format('ddd, D MMM YYYY, h:mm A')}</TableCell>
                      <TableCell>{appt.service?.name ?? '—'}</TableCell>
                      <TableCell>{appt.clinician?.full_name ?? '—'}</TableCell>
                      <TableCell>
                        <Chip size="small" label={STATUS_LABELS[appt.status] ?? appt.status} />
                      </TableCell>
                      <TableCell align="right">
                        <Button size="small" sx={{ textTransform: 'none' }} onClick={() => navigate(`/appointments/${appt.id}`)}>
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      <Dialog open={cancelOpen} onClose={() => setCancelOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Cancel remaining appointments</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" mb={2}>
            This cancels every remaining scheduled/confirmed appointment in this series. Appointments already completed are not affected.
          </Typography>
          <TextField
            label="Reason"
            fullWidth
            multiline
            minRows={2}
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="e.g. Patient discontinued treatment"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelOpen(false)} sx={{ textTransform: 'none' }}>
            Keep series
          </Button>
          <Button variant="contained" color="error" onClick={handleCancel} disabled={cancelling} sx={{ textTransform: 'none' }}>
            {cancelling ? 'Cancelling…' : 'Cancel remaining'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
