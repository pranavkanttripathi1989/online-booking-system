import React, { useState, useMemo, useRef, useCallback } from 'react'
import dayjs from 'dayjs'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Stack,
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  TableSortLabel,
  Tooltip,
  TablePagination,
  InputAdornment,
  TextField,
  Alert,
} from '@mui/material'
import DownloadIcon from '@mui/icons-material/Download'
import { PatientAvatar } from '../../components/shared'
import SearchIcon from '@mui/icons-material/Search'
import ClearIcon from '@mui/icons-material/Clear'
import VisibilityIcon from '@mui/icons-material/Visibility'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import PersonSearchIcon from '@mui/icons-material/PersonSearch'
import { useNavigate } from 'react-router-dom'
import { useQuery, gql } from '@apollo/client'
import { PATIENT_FIELDS } from '../../graphql/queries'

// F-18 / BUG009. This page exported `MOCK_PATIENTS` — five hardcoded people —
// while backend/src/patients has been real and self-scoping for months. The
// "named export so the booking wizard can import it" comment was also stale:
// nothing imported it.
//
// Page-local query rather than the canonical PATIENTS_QUERY because this screen
// needs each patient's visit history, and adding a nested appointments field to
// the shared query would make every other consumer pay for it.
//
// NOTE (N+1): `appointments` is a @ResolveField, so this issues one extra query
// per patient in the page. At 10 rows that is 10 indexed lookups
// (Appointments(patient_id, appointment_date) — added in BUG005), which is
// acceptable; it would not be at a page size of 200. Revisit with a batched
// resolver if this page ever grows one.
const CLINICIAN_PATIENTS_QUERY = gql`
  query ClinicianPatients($search: String, $first: Int!, $page: Int!) {
    patients(search: $search, first: $first, page: $page) {
      data {
        ...PatientFields
        appointments(first: 100, page: 1) {
          data {
            id
            start_datetime
            status
          }
          paginatorInfo {
            total
          }
        }
      }
      paginatorInfo {
        total
        currentPage
        lastPage
        perPage
      }
    }
  }
  ${PATIENT_FIELDS}
`

// Flattens a real Patient into the display shape the table already expects.
// `condition` and `status` are deliberately absent — see the note on COLS.
function toRow(p) {
  const appts = p.appointments?.data ?? []
  const now = Date.now()
  const past = appts
    .filter((a) => new Date(a.start_datetime).getTime() <= now && a.status !== 'cancelled')
    .sort((a, b) => new Date(b.start_datetime) - new Date(a.start_datetime))
  const future = appts
    .filter((a) => new Date(a.start_datetime).getTime() > now && a.status !== 'cancelled')
    .sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime))
  return {
    id: p.id,
    name: p.full_name,
    dob: p.date_of_birth ? dayjs(p.date_of_birth).format('YYYY-MM-DD') : '',
    email: p.email ?? '',
    lastVisit: past[0] ? dayjs(past[0].start_datetime).format('YYYY-MM-DD') : null,
    nextAppt: future[0] ? dayjs(future[0].start_datetime).format('YYYY-MM-DD') : null,
    // Real count from the server, not the length of the fetched page.
    totalVisits: p.appointments?.paginatorInfo?.total ?? appts.length,
  }
}

// ─── Constants ────────────────────────────────────────────────────────────────
const STITCH_BRAND = '#006D77'

// `condition` and `status` (active/new/inactive) are GONE rather than faked.
// Neither exists anywhere in the schema. `status` could be *derived* — "new" if
// one visit, "inactive" if the last visit is over N months old — but N is a
// clinical/business rule nobody has set, and inventing one is exactly what Hard
// Rule 7 forbids. Logged as an open question instead; the columns come back the
// moment there is a real definition to render.
const COLS = [
  { key: 'name', label: 'Patient', sortable: true },
  { key: 'dob', label: 'Date of Birth', sortable: true },
  { key: 'lastVisit', label: 'Last Visit', sortable: true },
  { key: 'nextAppt', label: 'Next Appointment', sortable: true },
  { key: 'totalVisits', label: 'Total Visits', sortable: true },
  { key: 'actions', label: 'Actions', sortable: false },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────
// SUG-CLPAT-008: safe single-word name split
const splitName = (fullName = '') => {
  const [first = '', ...rest] = fullName.split(' ')
  return { firstName: first, lastName: rest.join(' ') }
}

// Diacritic-normalising search moved SERVER-side with the query; the local
// helper it used is gone. Postgres `contains` with mode:'insensitive' handles
// case, and matching across the whole dataset beats matching one page.
// Sort comparator (null/undefined → '' so nulls sort to start of asc)
const compareBy = (key, dir) => (a, b) => {
  const av = a[key] ?? ''
  const bv = b[key] ?? ''
  if (av < bv) return dir === 'asc' ? -1 : 1
  if (av > bv) return dir === 'asc' ? 1 : -1
  return 0
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function ClinicianPatients() {
  const navigate = useNavigate()

  // ── State ──────────────────────────────────────────────────────────────────
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [sortKey, setSortKey] = useState('name')
  const [sortDir, setSortDir] = useState('asc')
  // SUG-CLPAT-012: pagination
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(5)

  // NEW-CLPAT-022: debounced search — avoids re-filtering on every keystroke
  const debounceTimer = useRef(null)
  const handleSearch = useCallback((val) => {
    setSearch(val) // update input field immediately
    setPage(0)
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => setDebouncedSearch(val), 150)
  }, [])

  // ── Sort handler ───────────────────────────────────────────────────────────
  const handleSort = (key) => {
    setSortDir((prev) => (sortKey === key && prev === 'asc' ? 'desc' : 'asc'))
    setSortKey(key)
    setPage(0) // reset to first page on sort change
  }

  // Search and pagination are SERVER-side. patients.service.ts narrows a
  // clinician caller to patients they have actually treated (an
  // `appointments: { some: { clinician_id } }` relation check), so "My Patients"
  // is enforced by the backend rather than by this page filtering a list it
  // should never have received.
  const { data, loading, error, refetch } = useQuery(CLINICIAN_PATIENTS_QUERY, {
    variables: {
      search: debouncedSearch || undefined,
      first: rowsPerPage === -1 ? 200 : rowsPerPage,
      page: page + 1,
    },
    fetchPolicy: 'cache-and-network',
  })

  const totalPatients = data?.patients?.paginatorInfo?.total ?? 0
  const rows = useMemo(() => (data?.patients?.data ?? []).map(toRow), [data])

  // Sorting stays client-side and therefore sorts THIS PAGE only. The backend
  // exposes no sort argument, and pretending otherwise would silently mis-order
  // across pages. Made visible in the column header tooltip rather than hidden.
  const filtered = useMemo(() => [...rows].sort(compareBy(sortKey, sortDir)), [rows, sortKey, sortDir])
  const paginated = filtered

  const handleSearchChange = (val) => {
    handleSearch(val)
  }

  // NEW-CLPAT-023: Export CSV of filtered patient list
  const exportCSV = () => {
    const header = ['Name', 'DOB', 'Email', 'Last Visit', 'Next Appt', 'Total Visits']
    const rows = filtered.map((p) => [p.name, p.dob, p.email ?? '', p.lastVisit ?? '', p.nextAppt ?? '', p.totalVisits])
    const csv = [header, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `my-patients-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── KPI calculations ───────────────────────────────────────────────────────
  // "Active" and "New This Month" are gone with the status field they counted.
  // "Upcoming Appts" is scoped to this page, and says so, rather than implying a
  // figure across all patients that this query cannot see.
  const kpis = [
    { label: 'Total Patients', value: totalPatients, color: STITCH_BRAND },
    { label: 'With Upcoming (this page)', value: rows.filter((p) => p.nextAppt).length, color: '#E29578' },
  ]

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Box>
      {/* HEADER */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h2" fontWeight={700}>
            My Patients
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {loading && !rows.length ? 'Loading…' : `${totalPatients} patient${totalPatients === 1 ? '' : 's'} you have treated`}
          </Typography>
        </Box>
        {/* NEW-CLPAT-023: Export CSV button */}
        <Tooltip title={`Export ${filtered.length} patient${filtered.length !== 1 ? 's' : ''} to CSV`}>
          <Button
            size="small"
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={exportCSV}
            sx={{ color: STITCH_BRAND, borderColor: STITCH_BRAND, borderRadius: 2, fontWeight: 600, '&:hover': { bgcolor: '#E8F8F9' } }}
          >
            Export CSV
          </Button>
        </Tooltip>
      </Stack>

      {/* KPI CARDS — SUG-CLPAT-017: horizontal scroll on mobile */}
      <Box
        sx={{
          display: 'flex',
          gap: 2,
          mb: 3,
          overflowX: { xs: 'auto', sm: 'visible' },
          pb: { xs: 1, sm: 0 },
          flexWrap: { xs: 'nowrap', sm: 'wrap' },
        }}
      >
        {kpis.map(({ label, value, color }) => (
          <Box key={label} sx={{ minWidth: { xs: 130, sm: 0 }, flex: { xs: '0 0 auto', sm: '1 1 0' } }}>
            <Card sx={{ borderTop: `4px solid ${color}`, height: '100%' }}>
              <CardContent sx={{ p: 2 }}>
                <Typography variant="h3" fontWeight={800} sx={{ color }}>
                  {value}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {label}
                </Typography>
              </CardContent>
            </Card>
          </Box>
        ))}
      </Box>

      {/* FILTERS */}
      <Stack direction="row" spacing={2} sx={{ mb: 2 }} alignItems="center" flexWrap="wrap" gap={1}>
        {/* Search field — inline with clear button */}
        <TextField
          size="small"
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Search by name or email…"
          sx={{ width: 280 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
              </InputAdornment>
            ),
            endAdornment: search ? (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => handleSearchChange('')} edge="end" aria-label="Clear search">
                  <ClearIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </InputAdornment>
            ) : null,
          }}
        />

        {/* Results count badge */}
        <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
          {`${filtered.length} shown · ${totalPatients} total`}
        </Typography>
      </Stack>

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
          Could not load your patients: {error.message}
        </Alert>
      )}

      {/* TABLE */}
      <TableContainer component={Paper} sx={{ border: '1px solid #D0E8EA', borderRadius: 2 }}>
        <Table size="small">
          <TableHead sx={{ bgcolor: '#F8FCFC' }}>
            <TableRow>
              {COLS.map(({ key, label, sortable }) => (
                <TableCell key={key} sx={{ fontWeight: 700, borderBottom: '2px solid #D0E8EA', py: 1.5 }}>
                  {sortable ? (
                    <TableSortLabel active={sortKey === key} direction={sortKey === key ? sortDir : 'asc'} onClick={() => handleSort(key)}>
                      {label}
                    </TableSortLabel>
                  ) : (
                    label
                  )}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>

          <TableBody>
            {/* Empty state */}
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 7 }}>
                  <Stack spacing={1.5} alignItems="center">
                    <PersonSearchIcon sx={{ fontSize: 48, color: 'text.disabled' }} />
                    <Typography variant="body1" fontWeight={600} color="text.secondary">
                      No patients found
                    </Typography>
                    <Typography variant="body2" color="text.disabled">
                      {search
                        ? `No results for "${search}". Try a different name or email.`
                        : 'Patients appear here once you have treated them.'}
                    </Typography>
                    {search && (
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => handleSearchChange('')}
                        sx={{ mt: 1, color: STITCH_BRAND, borderColor: STITCH_BRAND, borderRadius: 2 }}
                      >
                        Clear filters
                      </Button>
                    )}
                  </Stack>
                </TableCell>
              </TableRow>
            ) : (
              paginated.map((patient) => {
                const { firstName, lastName } = splitName(patient.name) // SUG-008
                // NEW-CLPAT-019: overdue warning — last visit > 90 days
                const daysSinceVisit = patient.lastVisit ? dayjs().diff(dayjs(patient.lastVisit), 'day') : null
                // The `status !== 'inactive'` guard went with the status field. Overdue is
                // now purely "last real visit was over 90 days ago", which is what it
                // always actually measured.
                const isOverdue = daysSinceVisit !== null && daysSinceVisit > 90
                return (
                  <TableRow
                    key={patient.id}
                    hover
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') navigate(`/patients/${patient.id}`)
                    }}
                    sx={{ '&:last-child td': { borderBottom: 0 }, cursor: 'pointer' }}
                  >
                    {/* Patient */}
                    <TableCell>
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <PatientAvatar firstName={firstName} lastName={lastName} email={patient.email} size="sm" />
                        <Box>
                          <Typography variant="body2" fontWeight={600}>
                            {patient.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {patient.email ?? '—'}
                          </Typography>
                        </Box>
                      </Stack>
                    </TableCell>

                    {/* DOB — NEW-CLPAT-021: show computed age badge */}
                    <TableCell>
                      <Stack direction="row" alignItems="center" spacing={0.75}>
                        <Typography variant="body2">{patient.dob ? dayjs(patient.dob).format('DD/MM/YYYY') : '—'}</Typography>
                        {patient.dob && (
                          <Chip
                            label={`${dayjs().diff(dayjs(patient.dob), 'year')}y`}
                            size="small"
                            sx={{ bgcolor: '#F1F5F9', color: '#475569', fontWeight: 600, fontSize: '0.6rem', height: 16, px: 0 }}
                          />
                        )}
                      </Stack>
                    </TableCell>

                    {/* Condition */}
                    <TableCell>
                      {patient.condition && patient.condition !== '—' ? (
                        <Chip label={patient.condition} size="small" color="warning" variant="outlined" />
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          —
                        </Typography>
                      )}
                    </TableCell>

                    {/* Last Visit — NEW-CLPAT-018: relative "N days ago" tooltip */}
                    <TableCell>
                      <Tooltip title={patient.lastVisit ? `${daysSinceVisit} days ago` : 'No visit recorded'} placement="top">
                        <Typography variant="body2" sx={{ cursor: 'help' }}>
                          {patient.lastVisit ? dayjs(patient.lastVisit).format('DD/MM/YYYY') : '—'}
                        </Typography>
                      </Tooltip>
                    </TableCell>

                    {/* Next Appointment */}
                    <TableCell>
                      {patient.nextAppt ? (
                        <Stack direction="row" alignItems="center" spacing={0.5}>
                          <CalendarMonthIcon sx={{ fontSize: 14, color: '#2DC653' }} />
                          <Typography variant="body2" sx={{ color: '#2DC653', fontWeight: 600 }}>
                            {dayjs(patient.nextAppt).format('DD/MM/YYYY')}
                          </Typography>
                        </Stack>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          None
                        </Typography>
                      )}
                    </TableCell>

                    {/* Total Visits */}
                    <TableCell>
                      <Chip label={patient.totalVisits} size="small" sx={{ bgcolor: '#E8F8F9', fontWeight: 700, color: STITCH_BRAND }} />
                    </TableCell>

                    {/* Status — NEW-CLPAT-019: overdue warning badge */}
                    <TableCell>
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        {isOverdue && (
                          <Tooltip title={`Last visit ${daysSinceVisit} days ago — consider follow-up`}>
                            <Chip
                              label="Overdue"
                              size="small"
                              sx={{ bgcolor: '#FFF3CD', color: '#856404', fontWeight: 700, fontSize: '0.65rem', height: 18 }}
                            />
                          </Tooltip>
                        )}
                      </Stack>
                    </TableCell>

                    {/* Actions */}
                    <TableCell>
                      <Stack direction="row" spacing={0.5}>
                        <Tooltip title={`View ${patient.name}'s profile`} placement="top">
                          <IconButton
                            size="small"
                            onClick={() => navigate(`/patients/${patient.id}`)}
                            aria-label={`View ${patient.name}'s profile`}
                            sx={{ color: STITCH_BRAND, '&:hover': { bgcolor: '#E8F8F9' } }}
                          >
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>

                        {/* SUG-CLPAT-003: pass patient context to booking wizard */}
                        <Tooltip title={`Book appointment for ${patient.name}`} placement="top">
                          <IconButton
                            size="small"
                            onClick={() =>
                              navigate('/appointments/book', {
                                state: { patientId: patient.id, patientName: patient.name },
                              })
                            }
                            aria-label={`Book appointment for ${patient.name}`}
                            sx={{ color: '#3A86FF', '&:hover': { bgcolor: '#EFF6FF' } }}
                          >
                            <CalendarMonthIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>

        {/* SUG-CLPAT-012: Pagination */}
        {filtered.length > 0 && (
          <TablePagination
            rowsPerPageOptions={[5, 10, 25, { label: 'All', value: -1 }]}
            component="div"
            count={totalPatients}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={(_, newPage) => setPage(newPage)}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10))
              setPage(0)
            }}
            sx={{ borderTop: '1px solid #E8EAED' }}
          />
        )}
      </TableContainer>
    </Box>
  )
}
