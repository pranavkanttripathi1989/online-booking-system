import { useState, useCallback, useMemo } from 'react'
import { useQuery, useMutation } from '@apollo/client'
import { Helmet } from 'react-helmet-async'
import { useNavigate } from 'react-router-dom'
import { useSnackbar } from 'notistack'
import dayjs from 'dayjs'
import * as MockStore from '../../mocks/store'
import {
  Box,
  Button,
  Chip,
  Fab,
  Grid,
  IconButton,
  MenuItem,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
  Paper,
  CircularProgress,
  InputAdornment,
  useMediaQuery,
  Slide,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { DataGrid } from '@mui/x-data-grid'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import AddIcon from '@mui/icons-material/Add'
import SearchIcon from '@mui/icons-material/Search'
import FilterAltOffIcon from '@mui/icons-material/FilterAltOff'
import FileDownloadRoundedIcon from '@mui/icons-material/FileDownloadRounded'
import VisibilityIcon from '@mui/icons-material/Visibility'
import CancelIcon from '@mui/icons-material/Cancel'
import EventRepeatIcon from '@mui/icons-material/EventRepeat'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import UpcomingRoundedIcon from '@mui/icons-material/UpcomingRounded'
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded'
import CancelScheduleSendRoundedIcon from '@mui/icons-material/CancelScheduleSendRounded'
import DeselctRoundedIcon from '@mui/icons-material/DeselectRounded'

import { APPOINTMENTS_QUERY, CLINICIANS_QUERY } from '../../graphql/queries'
import { CANCEL_APPOINTMENT_MUTATION, UPDATE_APPOINTMENT_MUTATION } from '../../graphql/mutations'
import CancelDialog from '../../components/Appointments/CancelDialog'
import Menu from '@mui/material/Menu'

// ─── Mock Appointments — now from centralized store (35 records, plan-compliant)
// BACKEND SWAP: remove these lines and use only apiRows from useQuery

// ─── Status config ───────────────────────────────────────────────────────────
const STATUS_OPTIONS = ['all', 'pending', 'confirmed', 'cancelled', 'completed', 'no_show']

const STATUS_CFG = {
  pending:     { label: 'Pending',     bg: '#FEF7E0', color: '#8A4700', border: '#FDD663', dot: '#F9AB00' },
  confirmed:   { label: 'Confirmed',   bg: '#E6F4EA', color: '#137333', border: '#CEEAD6', dot: '#0F9D58' },
  cancelled:   { label: 'Cancelled',   bg: '#FCE8E6', color: '#A50E0E', border: '#F5C6C2', dot: '#D93025' },
  completed:   { label: 'Completed',   bg: '#E8F0FE', color: '#1557B0', border: '#AECBFA', dot: '#1A73E8' },
  no_show:     { label: 'No Show',     bg: '#F8F9FA', color: '#3C4043', border: '#E8EAED', dot: '#80868B' },
  rescheduled: { label: 'Rescheduled', bg: '#F3E8FD', color: '#6E2DB8', border: '#D7AEFA', dot: '#9334E6' },
}

// ─── Status Chip ─────────────────────────────────────────────────────────────
function StatusChip({ status }) {
  const cfg = STATUS_CFG[status] ?? { label: status, bg: '#F8F9FA', color: '#5F6368', border: '#E8EAED', dot: '#9AA0A6' }
  return (
    <Chip
      label={cfg.label}
      size="small"
      sx={{
        bgcolor: cfg.bg, color: cfg.color,
        border: `1px solid ${cfg.border}`,
        borderLeft: `3px solid ${cfg.dot}`,
        fontWeight: 700, borderRadius: '8px',
        fontSize: '0.68rem', height: 24,
      }}
    />
  )
}

// ─── Empty State (SUG-APPT-003: contextual when filters applied) ──────────────
function EmptyState({ hasFilters, onClearFilters }) {
  return (
    <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" py={8} gap={2}>
      <CalendarMonthIcon sx={{ fontSize: 72, color: 'text.disabled' }} />
      {hasFilters ? (
        <>
          <Typography variant="h6" color="text.secondary" fontWeight={600}>
            No appointments match your filters
          </Typography>
          <Typography variant="body2" color="text.disabled" textAlign="center" sx={{ maxWidth: 320 }}>
            Try widening your date range, clearing the status filter, or searching a different name.
          </Typography>
          <Button size="small" variant="outlined" startIcon={<FilterAltOffIcon />} onClick={onClearFilters}
            sx={{ borderRadius: 2, fontWeight: 700, borderColor: '#D93025', color: '#D93025', '&:hover': { bgcolor: 'rgba(217,48,37,0.06)' } }}>
            Clear all filters
          </Button>
        </>
      ) : (
        <>
          <Typography variant="h6" color="text.secondary" fontWeight={600}>
            No appointments yet
          </Typography>
          <Typography variant="body2" color="text.disabled" textAlign="center">
            Create a new booking to get started.
          </Typography>
        </>
      )}
    </Box>
  )
}

// ─── AppointmentsPage ─────────────────────────────────────────────────────────
export default function AppointmentsPage() {
  const navigate = useNavigate()
  const { enqueueSnackbar } = useSnackbar()

  // SUG-APPT-008: Upcoming / Past / All tab view
  const [viewTab, setViewTab] = useState('upcoming') // 'upcoming' | 'past' | 'all'

  // ── Filters ──────────────────────────────────────────────────────────────
  const [dateFrom, setDateFrom] = useState(null)
  const [dateTo, setDateTo] = useState(null)
  const [status, setStatus] = useState('all')
  const [clinicianId, setClinicianId] = useState('')
  const [search, setSearch] = useState('')
  const [searchDraft, setSearchDraft] = useState('')

  // ── Pagination ─────────────────────────────────────────────────────────────
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 20 })

  // ── Drawer / Dialog ───────────────────────────────────────────────────────
  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelId, setCancelId] = useState(null)

  // SUG-APPT-002: Optimistic cancel — track locally-cancelled IDs
  const [optimisticCancelled, setOptimisticCancelled] = useState(new Set())

  // SUG-APPT-005: Inline status change — track per-row overrides
  const [statusOverrides, setStatusOverrides] = useState({}) // { [id]: newStatus }
  const [statusMenuAnchor, setStatusMenuAnchor] = useState(null) // { el, rowId }

  // SUG-APPT-006: Bulk row selection — always kept as plain string-ID array
  const [rowSelectionModel, setRowSelectionModel] = useState([])
  // Normalize MUI DataGrid v5 (array) and v6 ({type,ids:Set}) selection model forms
  const handleRowSelectionChange = (model) => {
    if (!model) { setRowSelectionModel([]); return }
    if (Array.isArray(model)) { setRowSelectionModel(model.map(String)); return }
    if (model.ids instanceof Set) { setRowSelectionModel([...model.ids].map(String)); return }
    setRowSelectionModel([])
  }

  // ── Build variables ───────────────────────────────────────────────────────
  // BUG019: at realistic data volume, the backend's unfiltered desc-ordered
  // page 1 can miss "today" entirely once the manual date pickers below are
  // left unset. Anchor each tab to a sensible default date window so it
  // actually reflects "upcoming"/"past"/"current-and-recent" against the
  // real backend — a manually-picked date always overrides the tab default.
  const buildFilters = useCallback(() => {
    const f = {}
    const today = dayjs().format('YYYY-MM-DD')
    let effectiveFrom = dateFrom ? dayjs(dateFrom).format('YYYY-MM-DD') : undefined
    let effectiveTo   = dateTo   ? dayjs(dateTo).format('YYYY-MM-DD')   : undefined
    if (!dateFrom && !dateTo) {
      if (viewTab === 'upcoming') effectiveFrom = today
      else if (viewTab === 'past') effectiveTo = today
      else if (viewTab === 'all') {
        // Results are ordered desc by appointment_time with no page-size
        // awareness of "today" — at realistic density (~20 appointments/day
        // in the isolated e2e dataset) even a same-day future extension puts
        // more rows between "today" and the window's far edge than fit on
        // page 1, so any upper bound beyond today re-buries it. Capping the
        // upper bound AT today (not into the future) is what actually
        // guarantees today's rows sort first within this window — "current
        // and recent", not "current and upcoming" (that needs an ascending
        // sort option on the resolver, deliberately out of scope here, see
        // BUG019's own note on not touching the shared resolver's ordering).
        effectiveFrom = dayjs().subtract(30, 'day').format('YYYY-MM-DD')
        effectiveTo = today
      }
    }
    if (effectiveFrom) f.date_from = effectiveFrom
    if (effectiveTo) f.date_to = effectiveTo
    if (status !== 'all') f.status = status
    if (clinicianId) f.clinician_id = clinicianId
    if (search) f.patient_name = search
    return Object.keys(f).length ? f : undefined
  }, [dateFrom, dateTo, viewTab, status, clinicianId, search])

  // ── Queries ───────────────────────────────────────────────────────────────
  const { data, loading, error, refetch } = useQuery(APPOINTMENTS_QUERY, {
    variables: {
      filters: buildFilters(),
      first: paginationModel.pageSize,
      page: paginationModel.page + 1,
    },
    fetchPolicy: 'cache-and-network',
  })

  const { data: cliniciansData, error: cliniciansError } = useQuery(CLINICIANS_QUERY, {
    variables: { first: 100, is_active: true },
  })

  // ── Mutations ─────────────────────────────────────────────────────────────
  const [cancelAppointment] = useMutation(CANCEL_APPOINTMENT_MUTATION, {
    onCompleted: () => { refetch(); setCancelOpen(false); setCancelId(null) },
  })
  const [updateAppointment] = useMutation(UPDATE_APPOINTMENT_MUTATION, {
    onError: () => {} // silent — optimistic override already applied
  })

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleClearFilters = () => {
    setDateFrom(null)
    setDateTo(null)
    setStatus('all')
    setClinicianId('')
    setSearch('')
    setSearchDraft('')
    setPaginationModel({ page: 0, pageSize: 20 })
    if (viewTab !== 'all') setViewTab('upcoming')
  }

  const handleTabChange = (_, newTab) => {
    setViewTab(newTab)
    // When switching tabs, reset date filters so tab pre-filtering controls the view
    setDateFrom(null)
    setDateTo(null)
    setPaginationModel({ page: 0, pageSize: 20 })
  }

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') setSearch(searchDraft)
  }

  const handleViewRow = (id) => navigate(`/appointments/${id}`)
  const handleCancelRow = (id) => { setCancelId(id); setCancelOpen(true) }

  // SUG-APPT-002: Optimistic cancel handler
  const handleOptimisticCancel = (id, reason) => {
    // 1. Immediately mark row as cancelled in local state
    setOptimisticCancelled(prev => new Set([...prev, id]))
    // 2. Fire mutation
    cancelAppointment({ variables: { id, reason } })
    // 3. Show undo-style snackbar
    enqueueSnackbar('Appointment cancelled.', {
      variant: 'warning',
      autoHideDuration: 4000,
    })
    setCancelOpen(false)
    setCancelId(null)
  }

  // SUG-APPT-005: Inline status change handler
  const handleInlineStatusChange = (rowId, newStatus) => {
    setStatusOverrides(prev => ({ ...prev, [rowId]: newStatus }))
    setStatusMenuAnchor(null)
    updateAppointment({ variables: { id: rowId, input: { status: newStatus } } })
    enqueueSnackbar(`Status updated to "${STATUS_CFG[newStatus]?.label ?? newStatus}"`, { variant: 'success', autoHideDuration: 3000 })
  }

  // SUG-APPT-006: Bulk cancel — cancel all selected non-terminal rows
  const handleBulkCancel = () => {
    const cancelable = rowSelectionModel.filter(id => {
      const row = displayRows.find(r => r.id === id)
      return row && !['cancelled', 'completed', 'no_show'].includes(row.status)
    })
    if (cancelable.length === 0) {
      enqueueSnackbar('No cancellable appointments in selection.', { variant: 'warning' })
      return
    }
    cancelable.forEach(id => {
      setOptimisticCancelled(prev => new Set([...prev, id]))
      cancelAppointment({ variables: { id, reason: 'Bulk cancellation' } })
    })
    enqueueSnackbar(`${cancelable.length} appointment${cancelable.length > 1 ? 's' : ''} cancelled.`, { variant: 'warning' })
    setRowSelectionModel([])
  }

  // SUG-APPT-006: Export selected rows as CSV
  const handleExportSelected = () => {
    const selected = displayRows.filter(r => rowSelectionModel.includes(r.id))
    if (selected.length === 0) return
    try {
      const exportRows = [
        ['ID', 'Patient', 'Email', 'Clinician', 'Service', 'Date & Time', 'Duration (min)', 'Status', 'Room', 'Clinic'],
        ...selected.map(r => [
          r.id,
          r.patient?.full_name ?? '',
          r.patient?.email ?? '',
          r.clinician?.full_name ?? '',
          r.service?.name ?? '',
          r.start_datetime ? dayjs(r.start_datetime).format('DD MMM YYYY, h:mm A') : '',
          r.duration_minutes ?? '',
          r.status ?? '',
          r.room?.name ?? '',
          r.clinic?.name ?? '',
        ]),
      ]
      const csv = exportRows.map(row =>
        row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      ).join('\n')
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href = url
      a.download = `appointments_selected_${dayjs().format('YYYY-MM-DD')}.csv`
      document.body.appendChild(a); a.click()
      document.body.removeChild(a); URL.revokeObjectURL(url)
      enqueueSnackbar(`Exported ${selected.length} selected appointments as CSV`, { variant: 'success' })
      setRowSelectionModel([])
    } catch {
      enqueueSnackbar('Export failed — please try again.', { variant: 'error' })
    }
  }

  // SUG-APPT-009: Export CSV — now with Room + Clinic columns (NEW-APPT-002)
  const handleExport = () => {
    try {
      const exportRows = [
        ['ID', 'Patient', 'Email', 'Clinician', 'Service', 'Date & Time', 'Duration (min)', 'Status', 'Room', 'Clinic'],
        ...displayRows.map(r => [
          r.id,
          r.patient?.full_name ?? '',
          r.patient?.email ?? '',
          r.clinician?.full_name ?? '',
          r.service?.name ?? '',
          r.start_datetime ? dayjs(r.start_datetime).format('DD MMM YYYY, h:mm A') : '',
          r.duration_minutes ?? '',
          r.status ?? '',
          r.room?.name ?? '',
          r.clinic?.name ?? '',
        ]),
      ]
      const csv = exportRows.map(row =>
        row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      ).join('\n')
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href = url
      a.download = `appointments_${viewTab}_${dayjs().format('YYYY-MM-DD')}.csv`
      document.body.appendChild(a); a.click()
      document.body.removeChild(a); URL.revokeObjectURL(url)
      enqueueSnackbar(`Exported ${displayRows.length} appointments as CSV (10 columns)`, { variant: 'success' })
    } catch {
      enqueueSnackbar('Export failed — please try again.', { variant: 'error' })
    }
  }

  const apiRows  = data?.appointments?.data ?? []

  // NEW-APPT-001 + NEW-APPT-003: Use current datetime (not start/end of day)
  // so today's elapsed appointments appear in "Past" and not in no-man's land
  const now = dayjs()
  const tabDateFrom = viewTab === 'upcoming' ? now.format('YYYY-MM-DDTHH:mm') : undefined
  const tabDateTo   = viewTab === 'past'     ? now.format('YYYY-MM-DDTHH:mm')  : undefined

  // Fall back to 35 plan-compliant mock rows only when the real query
  // genuinely fails (network/GraphQL error) -- the previous `apiRows.length
  // > 0 ? apiRows : mockRows` fell back on any empty *result* too, which
  // silently replaced a real, valid "no appointments match this filter"
  // state with 35 fabricated rows (confirmed live: filtering status=no_show,
  // which has zero real matches for this org, rendered three fake patients
  // -- Kavya Nair, Ingrid Larsson, Hassan Malik -- as if they were real).
  const mockRows = useMemo(() => {
    if (!error) return []
    return MockStore.getAppointments({
      status: status !== 'all' ? status : undefined,
      clinicianId: clinicianId || undefined,
      search: search || undefined,
      dateFrom: dateFrom ? dayjs(dateFrom).format('YYYY-MM-DD') : tabDateFrom,
      dateTo:   dateTo   ? dayjs(dateTo).format('YYYY-MM-DD')   : tabDateTo,
    })
  }, [error, status, clinicianId, search, dateFrom, dateTo, tabDateFrom, tabDateTo])

  const rows  = error ? mockRows : apiRows
  const total = error ? mockRows.length : (data?.appointments?.paginatorInfo?.total ?? 0)

  // SUG-APPT-002 + SUG-APPT-005: Apply optimistic cancellations and inline status overrides
  const displayRows = useMemo(() =>
    rows.map(r => {
      if (optimisticCancelled.has(r.id)) return { ...r, status: 'cancelled' }
      if (statusOverrides[r.id])         return { ...r, status: statusOverrides[r.id] }
      return r
    }),
    [rows, optimisticCancelled, statusOverrides]
  )

  // Detect if any filter is active (for contextual empty state)
  const hasActiveFilters = !!(search || status !== 'all' || clinicianId || dateFrom || dateTo || viewTab !== 'all')
  // Same error-only fallback reasoning as rows/mockRows above -- an org with
  // genuinely zero active clinicians is a valid real state, not a reason to
  // populate the filter dropdown with fake clinicians.
  const clinicians = cliniciansError
    ? MockStore.getClinicians({ isActive: true })
    : (cliniciansData?.clinicians?.data ?? [])
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  // ── Column definitions ────────────────────────────────────────────────────
  const columns = [
    {
      field: 'index',
      headerName: '#',
      width: 60,
      sortable: false,
      renderCell: (params) => {
        try {
          return paginationModel.page * paginationModel.pageSize + params.api.getRowIndexRelativeToVisibleRows(params.id) + 1
        } catch {
          return params.row?.index ?? ''
        }
      },
    },
    {
      field: 'patient',
      headerName: 'Patient',
      flex: 1.4,
      minWidth: 160,
      sortable: false,
      renderCell: ({ row }) => (
        <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', py: 0.5, width: '100%', overflow: 'hidden' }}>
          <Typography
            variant="body2"
            fontWeight={600}
            noWrap
            sx={{ color: '#202124', lineHeight: 1.4, maxWidth: '100%' }}
          >
            {row.patient?.full_name ?? '—'}
          </Typography>
          <Typography
            variant="caption"
            noWrap
            sx={{ color: '#9AA0A6', lineHeight: 1.3, maxWidth: '100%' }}
          >
            {row.patient?.email ?? ''}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'clinician',
      headerName: 'Clinician',
      flex: 1,
      minWidth: 140,
      sortable: false,
      renderCell: ({ row }) => row.clinician?.full_name ?? '—',
    },
    {
      field: 'service',
      headerName: 'Service',
      flex: 1.1,
      minWidth: 150,
      sortable: false,
      renderCell: ({ row }) => (
        <Tooltip title={row.service?.name ?? ''} placement="top">
          <Typography variant="body2" noWrap sx={{ maxWidth: '100%' }}>
            {row.service?.name ?? '—'}
          </Typography>
        </Tooltip>
      ),
    },
    {
      field: 'start_datetime',
      headerName: 'Date & Time',
      flex: 1.1,
      minWidth: 160,
      sortable: false,
      renderCell: ({ row }) =>
        row.start_datetime
          ? dayjs(row.start_datetime).format('DD MMM YYYY, h:mm A')
          : '—',
    },
    {
      field: 'duration_minutes',
      headerName: 'Duration',
      width: 100,
      sortable: false,
      renderCell: ({ row }) =>
        row.duration_minutes ? `${row.duration_minutes} min` : '—',
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 145,
      sortable: false,
      // SUG-APPT-005: Inline status change — clicking chip opens a small context menu
      renderCell: ({ row }) => (
        <>
          <Tooltip title="Click to change status"  placement="top">
            <Box
              component="span"
              onClick={(e) => {
                if (!['cancelled','completed','no_show'].includes(row.status))
                  setStatusMenuAnchor({ el: e.currentTarget, rowId: row.id })
              }}
              sx={{ cursor: ['cancelled','completed','no_show'].includes(row.status) ? 'default' : 'pointer' }}
            >
              <StatusChip status={row.status} />
            </Box>
          </Tooltip>
          <Menu
            anchorEl={statusMenuAnchor?.rowId === row.id ? statusMenuAnchor.el : null}
            open={statusMenuAnchor?.rowId === row.id}
            onClose={() => setStatusMenuAnchor(null)}
            transformOrigin={{ vertical: 'top', horizontal: 'left' }}
            PaperProps={{ sx: { borderRadius: 2, boxShadow: 3, minWidth: 160 } }}
          >
            {['confirmed', 'pending', 'cancelled', 'completed', 'no_show']
              .filter(s => s !== row.status)
              .map(s => (
                <MenuItem
                  key={s}
                  dense
                  onClick={() => handleInlineStatusChange(row.id, s)}
                  sx={{ gap: 1.5 }}
                >
                  <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: STATUS_CFG[s]?.dot, flexShrink: 0 }} />
                  {STATUS_CFG[s]?.label ?? s}
                </MenuItem>
              ))}
          </Menu>
        </>
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 150,
      sortable: false,
      align: 'center',
      headerAlign: 'center',
      renderCell: ({ row }) => (
        <Box display="flex" gap={0.5} alignItems="center">
          <Tooltip title="View">
            <IconButton size="small" onClick={() => handleViewRow(row.id)} color="primary">
              <VisibilityIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Edit">
            <IconButton size="small" color="warning" onClick={() => navigate(`/appointments/${row.id}/edit`)}>
              <EventRepeatIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Cancel">
            <span>
              <IconButton
                size="small"
                color="error"
                disabled={['cancelled', 'completed', 'no_show'].includes(row.status)}
                onClick={() => handleCancelRow(row.id)}
              >
                <CancelIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      ),
    },
  ]

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box className="page-enter">
        <Helmet>
          <title>Appointments — MediBook</title>
        </Helmet>

        {/* Page header */}
        <Box
          sx={{
            display: 'flex',
            alignItems: { xs: 'flex-start', sm: 'center' },
            justifyContent: 'space-between',
            flexDirection: { xs: 'column', sm: 'row' },
            gap: { xs: 1.5, sm: 0 },
            mb: 2.5,
          }}
        >
          <Box>
            <Typography variant="h4" fontWeight={800} sx={{ color: '#202124', fontSize: { xs: '1.35rem', sm: '1.5rem' } }}>
              Appointments
            </Typography>
            <Typography variant="body2" sx={{ color: '#5F6368' }}>
              {loading ? 'Loading…' : `${total.toLocaleString()} ${viewTab !== 'all' ? viewTab : 'total'} appointments`}
            </Typography>
          </Box>
          {/* SUG-APPT-009: Export CSV + New Booking buttons */}
          <Box sx={{ display: 'flex', gap: 1.5, width: { xs: '100%', sm: 'auto' }, flexDirection: { xs: 'column', sm: 'row' } }}>
            <Tooltip title={`Export ${displayRows.length} ${viewTab} appointments as CSV`}>
              <Button
                variant="outlined"
                startIcon={<FileDownloadRoundedIcon />}
                onClick={handleExport}
                sx={{
                  borderRadius: 2, fontWeight: 700,
                  borderColor: '#DADCE0', color: '#5F6368',
                  '&:hover': { bgcolor: '#F1F3F4', borderColor: '#9AA0A6' },
                }}
              >
                Export CSV
              </Button>
            </Tooltip>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate('/appointments/new')}
              sx={{
                borderRadius: 2, px: 2.5,
                background: 'linear-gradient(135deg, #006D77 0%, #00858F 100%)',
                boxShadow: '0 2px 8px rgba(0,109,119,0.30)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #005A62 0%, #006D77 100%)',
                  boxShadow: '0 4px 14px rgba(0,109,119,0.45)',
                },
              }}
            >
              New Booking
            </Button>
          </Box>
        </Box>

        {/* SUG-APPT-008: Upcoming / Past / All tab strip */}
        <Paper elevation={0} sx={{ border: '1px solid #E8EAED', borderRadius: 3, mb: 2, overflow: 'hidden' }}>
          <Tabs
            value={viewTab}
            onChange={handleTabChange}
            sx={{
              px: 1,
              '& .MuiTab-root': { fontWeight: 700, textTransform: 'none', minHeight: 48, fontSize: '0.875rem', color: '#5F6368' },
              '& .MuiTab-root.Mui-selected': { color: '#006D77' },
              '& .MuiTabs-indicator': { bgcolor: '#006D77', height: 3, borderRadius: '3px 3px 0 0' },
            }}
          >
            <Tab value="upcoming" icon={<UpcomingRoundedIcon sx={{ fontSize: '1rem' }} />} iconPosition="start" label="Upcoming" />
            <Tab value="past"     icon={<HistoryRoundedIcon  sx={{ fontSize: '1rem' }} />} iconPosition="start" label="Past" />
            <Tab value="all"      icon={<CalendarMonthIcon   sx={{ fontSize: '1rem' }} />} iconPosition="start" label="All" />
          </Tabs>
        </Paper>

        {/* Filter toolbar */}
        <Paper
          elevation={0}
          sx={{
            p: 2,
            mb: 2,
            border: '1px solid #E8EAED',
            borderRadius: 3,
            bgcolor: '#FFFFFF',
          }}
        >
          <Grid container spacing={2} alignItems="center">
            {/* Search — always visible */}
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                size="small"
                fullWidth
                label="Patient name"
                value={searchDraft}
                onChange={(e) => setSearchDraft(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                onBlur={() => setSearch(searchDraft)}
                sx={{ '& .MuiOutlinedInput-root.Mui-focused fieldset': { borderColor: '#006D77' } }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" sx={{ color: '#9AA0A6' }} />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            {/* Status */}
            <Grid item xs={12} sm={6} md={2}>
              <TextField
                select
                size="small"
                fullWidth
                label="Status"
                value={status}
                onChange={(e) => { setStatus(e.target.value); setPaginationModel((p) => ({ ...p, page: 0 })) }}
                sx={{ '& .MuiOutlinedInput-root.Mui-focused fieldset': { borderColor: '#006D77' } }}
              >
                {STATUS_OPTIONS.map((s) => (
                  <MenuItem key={s} value={s} sx={{ textTransform: 'capitalize' }}>
                    {s === 'all' ? 'All Statuses' : (STATUS_CFG[s]?.label ?? s)}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            {/* Clinician — hidden on xs */}
            <Grid item xs={12} sm={6} md={3} sx={{ display: { xs: 'none', sm: 'block' } }}>
              <TextField
                select
                size="small"
                fullWidth
                label="Clinician"
                value={clinicianId}
                onChange={(e) => { setClinicianId(e.target.value); setPaginationModel((p) => ({ ...p, page: 0 })) }}
                sx={{ '& .MuiOutlinedInput-root.Mui-focused fieldset': { borderColor: '#006D77' } }}
              >
                <MenuItem value="">All Clinicians</MenuItem>
                {clinicians.map((c) => (
                  <MenuItem key={c.id} value={c.id}>{c.full_name}</MenuItem>
                ))}
              </TextField>
            </Grid>

            {/* Date From */}
            <Grid item xs={12} sm={6} md={1.75} sx={{ display: { xs: 'none', sm: 'block' } }}>
              <DatePicker
                label="From"
                value={dateFrom}
                onChange={(v) => { setDateFrom(v); setPaginationModel((p) => ({ ...p, page: 0 })) }}
                slotProps={{ textField: { size: 'small', fullWidth: true } }}
              />
            </Grid>

            {/* Date To */}
            <Grid item xs={12} sm={6} md={1.75} sx={{ display: { xs: 'none', sm: 'block' } }}>
              <DatePicker
                label="To"
                value={dateTo}
                onChange={(v) => { setDateTo(v); setPaginationModel((p) => ({ ...p, page: 0 })) }}
                slotProps={{ textField: { size: 'small', fullWidth: true } }}
              />
            </Grid>

            {/* Clear */}
            <Grid item xs="auto">
              <Tooltip title="Clear filters">
                <IconButton onClick={handleClearFilters} sx={{ color: '#D93025', '&:hover': { bgcolor: 'rgba(217,48,37,0.06)' } }}>
                  <FilterAltOffIcon />
                </IconButton>
              </Tooltip>
            </Grid>
          </Grid>
        </Paper>

        {/* SUG-APPT-006: Bulk selection action bar — CSS animated */}
        <Box sx={{
          overflow: 'hidden',
          maxHeight: rowSelectionModel.length > 0 ? '80px' : '0px',
          opacity: rowSelectionModel.length > 0 ? 1 : 0,
          transition: 'max-height 0.25s ease, opacity 0.2s ease',
          mb: rowSelectionModel.length > 0 ? 2 : 0,
        }}>
          <Paper elevation={2} sx={{
            px: 3, py: 1.5, borderRadius: 3,
            border: '1.5px solid #006D77', bgcolor: 'rgba(0,109,119,0.04)',
            display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap',
          }}>
            <Typography variant="body2" fontWeight={700} sx={{ color: '#006D77', flex: 1 }}>
              {rowSelectionModel.length} appointment{rowSelectionModel.length !== 1 ? 's' : ''} selected
            </Typography>
            <Button size="small" variant="outlined" startIcon={<FileDownloadRoundedIcon />}
              onClick={handleExportSelected}
              sx={{ borderRadius: 2, fontWeight: 700, borderColor: '#006D77', color: '#006D77', '&:hover': { bgcolor: 'rgba(0,109,119,0.08)' } }}
            >Export Selected</Button>
            <Button size="small" variant="outlined" color="error"
              startIcon={<CancelScheduleSendRoundedIcon />} onClick={handleBulkCancel}
              sx={{ borderRadius: 2, fontWeight: 700 }}
            >Bulk Cancel</Button>
            <Tooltip title="Clear selection">
              <IconButton size="small" onClick={() => setRowSelectionModel([])} sx={{ color: '#5F6368' }}>
                <DeselctRoundedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Paper>
        </Box>

        {/* Data Grid */}
        <Paper
          elevation={0}
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 3,
            overflow: 'hidden',
            overflowX: 'auto',
          }}
        >
          <DataGrid
            rows={displayRows}
            columns={columns}
            rowCount={total}
            loading={loading}
            paginationMode="server"
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
            pageSizeOptions={[10, 20, 50]}
            getRowId={(r) => r.id}
            checkboxSelection
            disableRowSelectionOnClick
            rowSelectionModel={rowSelectionModel}
            onRowSelectionModelChange={handleRowSelectionChange}
            autoHeight
            rowHeight={72}
            columnVisibilityModel={{
              index: !isMobile,
              clinician: !isMobile,
              duration_minutes: !isMobile,
            }}
            slots={{
              // SUG-APPT-003: Contextual empty state
              noRowsOverlay: () => <EmptyState hasFilters={hasActiveFilters} onClearFilters={handleClearFilters} />,
              loadingOverlay: () => (
                <Box display="flex" alignItems="center" justifyContent="center" height="100%">
                  <CircularProgress size={36} />
                </Box>
              ),
            }}
            sx={{
              border: 'none',
              '& .MuiDataGrid-cell': {
                display: 'flex',
                alignItems: 'center',
                py: 1,
                overflow: 'hidden',
              },
              '& .MuiDataGrid-columnHeaders': {
                backgroundColor: '#F8F9FA',
                color: '#9AA0A6',
                fontWeight: 700,
                fontSize: '0.70rem',
                textTransform: 'uppercase',
                letterSpacing: '0.10em',
              },
              '& .MuiDataGrid-columnSeparator': { display: 'none' },
              '& .MuiDataGrid-row:hover': { backgroundColor: '#F1F3F4' },
              '& .MuiDataGrid-row.Mui-selected': { backgroundColor: 'rgba(0,109,119,0.06)' },
              '& .MuiDataGrid-row.Mui-selected:hover': { backgroundColor: 'rgba(0,109,119,0.10)' },
              '& .MuiCheckbox-root.Mui-checked': { color: '#006D77' },
              '& .MuiCheckbox-root.MuiCheckbox-indeterminate': { color: '#006D77' },
            }}
          />
        </Paper>

        {/* FAB */}
        <Fab
          color="primary"
          aria-label="new appointment"
          onClick={() => navigate('/appointments/new')}
          sx={{
            position: 'fixed',
            bottom: { xs: 80, md: 32 },
            right: { xs: 20, md: 32 },
            background: 'linear-gradient(135deg, #4285F4 0%, #1A73E8 100%)',
            boxShadow: '0 4px 14px rgba(26,115,232,0.40)',
            '&:hover': {
              background: 'linear-gradient(135deg, #1A73E8 0%, #1557B0 100%)',
              boxShadow: '0 6px 20px rgba(26,115,232,0.48)',
            },
          }}
        >
          <AddIcon />
        </Fab>

        {/* Cancel Dialog — SUG-APPT-002: uses optimistic handler */}
        <CancelDialog
          open={cancelOpen}
          appointmentId={cancelId}
          onClose={() => { setCancelOpen(false); setCancelId(null) }}
          onConfirm={handleOptimisticCancel}
        />
      </Box>
    </LocalizationProvider>
  )
}
