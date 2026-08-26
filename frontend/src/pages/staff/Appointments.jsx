import React, { useState, useMemo } from 'react'
import {
  Box,
  Grid,
  Typography,
  Card,
  CardContent,
  Stack,
  Button,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Checkbox,
  Avatar,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Alert,
  Skeleton,
  TablePagination,
} from '@mui/material'
import { useQuery, useMutation } from '@apollo/client'
import { useNavigate } from 'react-router-dom'
import { useSnackbar } from 'notistack'
import dayjs from 'dayjs'
import { StatusChip, SearchField, ConfirmDialog, PatientAvatar } from '../../components/shared'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import CancelIcon from '@mui/icons-material/Cancel'
import DownloadIcon from '@mui/icons-material/Download'
import { APPOINTMENTS_QUERY } from '../../graphql/queries'
import { CANCEL_APPOINTMENT_MUTATION } from '../../graphql/mutations'

// F-18 / BUG009. This page rendered four hardcoded appointments
// (`MOCK_APPOINTMENTS`) while backend/src/appointments has existed and been
// tested for months. It never imported mocks/store, which is why four
// grep-based audits walked past it.
//
// Filtering is done SERVER-side through AppointmentFilters (date_from, date_to,
// status, patient_name) rather than in the browser. The mock version filtered a
// four-row array client-side; doing that against a real, paginated dataset would
// only ever filter the current page and quietly under-report.

const ROWS_PER_PAGE = 20
const STATUSES = ['all', 'scheduled', 'completed', 'cancelled', 'no_show']

export default function StaffAppointments() {
  const navigate = useNavigate()
  const { enqueueSnackbar } = useSnackbar()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [page, setPage] = useState(0)
  const [selected, setSelected] = useState([])
  const [cancelTarget, setCancelTarget] = useState(null)
  const [bulkCancelOpen, setBulkCancelOpen] = useState(false)

  const filters = useMemo(() => {
    const f = {}
    if (statusFilter !== 'all') f.status = statusFilter
    if (fromDate) f.date_from = fromDate
    if (toDate) f.date_to = toDate
    if (search.trim()) f.patient_name = search.trim()
    return f
  }, [statusFilter, fromDate, toDate, search])

  const { data, loading, error, refetch } = useQuery(APPOINTMENTS_QUERY, {
    variables: { filters, first: ROWS_PER_PAGE, page: page + 1 },
    fetchPolicy: 'cache-and-network',
  })

  const [cancelAppointment, { loading: cancelling }] = useMutation(CANCEL_APPOINTMENT_MUTATION)

  // No `|| MOCK` fallback. An empty result is a real answer and must render as
  // "none found", never as fabricated rows — the exact regression
  // appointments/index.jsx and calendar/index.jsx shipped (Priority 3, point 3).
  const rows = data?.appointments?.data ?? []
  const total = data?.appointments?.paginatorInfo?.total ?? 0
  const activeCount = rows.filter((a) => a.status !== 'cancelled').length

  const handleSelectAll = (e) => setSelected(e.target.checked ? rows.map((a) => a.id) : [])
  const handleSelect = (id) => setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  const runCancel = async (ids) => {
    try {
      // Sequential rather than Promise.all: each is a real mutation and a
      // partial failure should stop rather than leave an unknown subset applied.
      for (const id of ids) {
        await cancelAppointment({ variables: { id, reason: 'Cancelled by front desk' } })
      }
      enqueueSnackbar(`${ids.length} appointment${ids.length > 1 ? 's' : ''} cancelled`, { variant: 'success' })
      setSelected([])
      await refetch()
    } catch (e) {
      enqueueSnackbar(e.message || 'Could not cancel the appointment', { variant: 'error' })
    } finally {
      setCancelTarget(null)
      setBulkCancelOpen(false)
    }
  }

  const handleExportCSV = (list) => {
    const cols = ['ID', 'Date', 'Time', 'Patient', 'Clinician', 'Service', 'Status', 'Price']
    const body = list.map((a) => [
      a.id,
      dayjs(a.start_datetime).format('YYYY-MM-DD'),
      dayjs(a.start_datetime).format('HH:mm'),
      a.patient?.full_name ?? '',
      a.clinician?.full_name ?? '',
      a.service?.name ?? '',
      a.status,
      a.service?.price ?? '', // rupees — converted at the resolver boundary
    ])
    // Quote every field: real patient names and service names contain commas.
    const csv = [cols, ...body].map((row) => row.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `appointments-${dayjs().format('YYYY-MM-DD')}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const hasFilters = search || statusFilter !== 'all' || fromDate || toDate
  const resetFilters = () => {
    setSearch('')
    setStatusFilter('all')
    setFromDate('')
    setToDate('')
    setPage(0)
  }

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1.5} sx={{ mb: 3 }}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Typography variant="h2" fontWeight={700}>
            Appointments
          </Typography>
          {!loading && <Chip label={`${activeCount} active · ${total} total`} color="primary" />}
        </Stack>
        <Stack direction="row" spacing={1.5}>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            size="small"
            disabled={!rows.length}
            onClick={() => handleExportCSV(rows)}
          >
            Export CSV
          </Button>
          {/* Booking goes to the real, already-wired /appointments/new rather
              than a second form. The mock dialog here took free-text patient and
              clinician names, which cannot create a real appointment — that
              needs ids, availability and a clinic the caller's org owns. */}
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/appointments/new')}>
            Book Appointment
          </Button>
        </Stack>
      </Stack>

      <Card sx={{ mb: 2 }}>
        <CardContent sx={{ p: 2 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={4}>
              <SearchField
                value={search}
                onChange={(v) => {
                  setSearch(v)
                  setPage(0)
                }}
                placeholder="Search by patient name..."
                sx={{ width: '100%' }}
              />
            </Grid>
            <Grid item xs={6} sm={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  value={statusFilter}
                  label="Status"
                  onChange={(e) => {
                    setStatusFilter(e.target.value)
                    setPage(0)
                  }}
                >
                  {STATUSES.map((s) => (
                    <MenuItem key={s} value={s}>
                      {s === 'all' ? 'All' : s.replace('_', ' ')}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6} sm={2}>
              <TextField
                fullWidth
                size="small"
                type="date"
                label="From"
                InputLabelProps={{ shrink: true }}
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value)
                  setPage(0)
                }}
              />
            </Grid>
            <Grid item xs={6} sm={2}>
              <TextField
                fullWidth
                size="small"
                type="date"
                label="To"
                InputLabelProps={{ shrink: true }}
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value)
                  setPage(0)
                }}
              />
            </Grid>
            {hasFilters && (
              <Grid item xs={6} sm={2}>
                <Button size="small" variant="text" onClick={resetFilters}>
                  Clear Filters
                </Button>
              </Grid>
            )}
          </Grid>
        </CardContent>
      </Card>

      {selected.length > 0 && (
        <Paper sx={{ p: 1.5, mb: 2, bgcolor: 'action.hover', display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Typography variant="body2" fontWeight={700}>
            {selected.length} selected
          </Typography>
          <Button size="small" color="error" variant="outlined" disabled={cancelling} onClick={() => setBulkCancelOpen(true)}>
            Cancel Selected
          </Button>
          <Button
            size="small"
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={() => handleExportCSV(rows.filter((a) => selected.includes(a.id)))}
          >
            Export
          </Button>
        </Paper>
      )}

      {error && (
        <Alert
          severity="error"
          sx={{ mb: 2 }}
          action={
            <Button size="small" onClick={() => refetch()}>
              Retry
            </Button>
          }
        >
          Could not load appointments: {error.message}
        </Alert>
      )}

      <TableContainer component={Paper} variant="outlined">
        <Table>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  indeterminate={selected.length > 0 && selected.length < rows.length}
                  checked={rows.length > 0 && selected.length === rows.length}
                  onChange={handleSelectAll}
                  inputProps={{ 'aria-label': 'Select all appointments on this page' }}
                />
              </TableCell>
              <TableCell>Date &amp; Time</TableCell>
              <TableCell>Patient</TableCell>
              <TableCell>Clinician</TableCell>
              <TableCell>Clinic &amp; Room</TableCell>
              <TableCell>Duration</TableCell>
              <TableCell>Service &amp; Price</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading &&
              !rows.length &&
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={`s-${i}`}>
                  <TableCell colSpan={9}>
                    <Skeleton height={40} />
                  </TableCell>
                </TableRow>
              ))}

            {/* Distinguish "no data at all" from "filters exclude everything" —
                they call for different next actions from the user. */}
            {!loading && !error && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                  {hasFilters ? 'No appointments match your current filters' : 'No appointments have been booked yet'}
                </TableCell>
              </TableRow>
            )}

            {rows.map((appt) => (
              <TableRow key={appt.id} hover selected={selected.includes(appt.id)}>
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={selected.includes(appt.id)}
                    onChange={() => handleSelect(appt.id)}
                    inputProps={{ 'aria-label': `Select appointment for ${appt.patient?.full_name ?? 'patient'}` }}
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight={700}>
                    {dayjs(appt.start_datetime).format('DD MMM YYYY')}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {dayjs(appt.start_datetime).format('HH:mm')}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <PatientAvatar
                      firstName={appt.patient?.first_name}
                      lastName={appt.patient?.last_name}
                      email={appt.patient?.email}
                      size="sm"
                    />
                    <Box>
                      <Typography variant="body2" fontWeight={600}>
                        {appt.patient?.full_name ?? '—'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {appt.patient?.email ?? ''}
                      </Typography>
                    </Box>
                  </Stack>
                </TableCell>
                <TableCell>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Avatar
                      src={appt.clinician?.avatar_url || undefined}
                      sx={{ width: 28, height: 28, bgcolor: 'primary.main', fontSize: '0.7rem', fontWeight: 700 }}
                    >
                      {(appt.clinician?.full_name ?? '?')
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .slice(0, 2)}
                    </Avatar>
                    <Box>
                      <Typography variant="body2" fontWeight={600}>
                        {appt.clinician?.full_name ?? '—'}
                      </Typography>
                      {appt.clinician?.clinician_type?.name && (
                        <Chip label={appt.clinician.clinician_type.name} size="small" variant="outlined" color="primary" />
                      )}
                    </Box>
                  </Stack>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">{appt.clinic?.name ?? '—'}</Typography>
                  {appt.room?.name && <Chip label={`Room ${appt.room.name}`} size="small" sx={{ mt: 0.25 }} />}
                </TableCell>
                <TableCell>
                  <Chip label={`${appt.duration_minutes ?? '—'} min`} size="small" variant="outlined" />
                </TableCell>
                <TableCell>
                  <Typography variant="body2">{appt.service?.name ?? '—'}</Typography>
                  {appt.service?.price != null && (
                    <Typography variant="caption" color="primary" fontWeight={700}>
                      ₹{appt.service.price.toLocaleString()}
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  <StatusChip status={appt.status} />
                </TableCell>
                <TableCell>
                  <Stack direction="row" spacing={0.5}>
                    <IconButton
                      size="small"
                      onClick={() => navigate(`/appointments/${appt.id}/edit`)}
                      aria-label={`Edit appointment for ${appt.patient?.full_name ?? 'patient'}`}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    {appt.status !== 'cancelled' && (
                      <IconButton
                        size="small"
                        color="error"
                        disabled={cancelling}
                        onClick={() => setCancelTarget(appt.id)}
                        aria-label={`Cancel appointment for ${appt.patient?.full_name ?? 'patient'}`}
                      >
                        <CancelIcon fontSize="small" />
                      </IconButton>
                    )}
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        component="div"
        count={total}
        page={page}
        onPageChange={(_, p) => {
          setPage(p)
          setSelected([])
        }}
        rowsPerPage={ROWS_PER_PAGE}
        rowsPerPageOptions={[ROWS_PER_PAGE]}
      />

      <ConfirmDialog
        open={Boolean(cancelTarget)}
        onClose={() => setCancelTarget(null)}
        onConfirm={() => runCancel([cancelTarget])}
        title="Cancel Appointment"
        message="Are you sure you want to cancel this appointment? The patient will be notified."
        confirmLabel="Cancel Appointment"
        confirmColor="error"
      />

      <ConfirmDialog
        open={bulkCancelOpen}
        onClose={() => setBulkCancelOpen(false)}
        onConfirm={() => runCancel(selected)}
        title="Cancel Appointments"
        message={`Cancel ${selected.length} appointment(s)? All selected patients will be notified.`}
        confirmLabel="Cancel Appointments"
        confirmColor="error"
      />
    </Box>
  )
}
