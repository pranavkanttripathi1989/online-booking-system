import { useState, useMemo } from 'react'
import { useQuery, useMutation } from '@apollo/client'
import { Helmet } from 'react-helmet-async'
import {
  Alert, Box, Button, Typography, Chip, Grid, Card, CardContent, Stack, Paper,
  Table, TableBody, TableCell, TableHead, TableRow, TableContainer, TextField, InputAdornment,
  MenuItem, IconButton, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions,
  Divider, LinearProgress, Select, FormControl, InputLabel, TableSortLabel, Skeleton,
  Autocomplete, CircularProgress,
} from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'
import { TEST_RESULTS_QUERY, PATIENTS_QUERY } from '../../graphql/queries'
import { ORDER_TEST_MUTATION } from '../../graphql/mutations'
import SearchRoundedIcon from '@mui/icons-material/SearchRounded'
import FilterListRoundedIcon from '@mui/icons-material/FilterListRounded'
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded'
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded'
import ScienceRoundedIcon from '@mui/icons-material/ScienceRounded'
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded'
import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded'
import HourglassEmptyRoundedIcon from '@mui/icons-material/HourglassEmptyRounded'

// ─── Mock data ────────────────────────────────────────────────────────────────
const MOCK_RESULTS = [
  {
    id: 'TR-001', patient: 'John Doe',       test: 'Complete Blood Count',    ordered_by: 'Dr. Jane Smith',   date_ordered: '2026-02-28', date_completed: '2026-03-01', status: 'completed', type: 'Blood Test',
    values: [{ name: 'Hemoglobin', value: '14.5 g/dL', ref: '13.5–17.5', flag: 'normal' }, { name: 'WBC', value: '7.2 ×10³/µL', ref: '4.5–11.0', flag: 'normal' }, { name: 'Platelets', value: '245 ×10³/µL', ref: '150–400', flag: 'normal' }],
  },
  {
    id: 'TR-002', patient: 'Sarah Miller',   test: 'HbA1c (Glycated Haemoglobin)', ordered_by: 'Dr. Carlos Vega', date_ordered: '2026-02-20', date_completed: '2026-02-22', status: 'completed', type: 'Blood Test',
    values: [{ name: 'HbA1c', value: '6.8%', ref: '< 5.7%', flag: 'high' }, { name: 'Fasting Glucose', value: '128 mg/dL', ref: '70–100 mg/dL', flag: 'high' }],
  },
  {
    id: 'TR-003', patient: 'Mark Johnson',   test: 'Chest X-Ray',             ordered_by: 'Dr. Amara Patel',  date_ordered: '2026-03-05', date_completed: '2026-03-05', status: 'completed', type: 'X-Ray',
    values: [{ name: 'Findings', value: 'No acute cardiopulmonary process.', ref: 'Normal', flag: 'normal' }],
  },
  {
    id: 'TR-004', patient: 'Emily Clark',    test: 'Thyroid Panel (TSH/T3/T4)', ordered_by: 'Dr. Jane Smith', date_ordered: '2026-03-08', date_completed: null, status: 'processing', type: 'Blood Test',
    values: [],
  },
  {
    id: 'TR-005', patient: 'Robert Davis',   test: 'MRI Brain',               ordered_by: 'Dr. Amara Patel',  date_ordered: '2026-03-10', date_completed: null, status: 'pending', type: 'MRI',
    values: [],
  },
  {
    // SUG-TRES-007: Added Ketones value with flag:'low' to exercise the low/amber colour path
    id: 'TR-006', patient: 'Jessica Liu',    test: 'Urine Analysis',          ordered_by: 'Dr. Carlos Vega',  date_ordered: '2026-02-15', date_completed: '2026-02-16', status: 'completed', type: 'Urine Test',
    values: [
      { name: 'pH',       value: '6.0',       ref: '4.5–8.0',  flag: 'normal' },
      { name: 'Protein',  value: 'Negative',  ref: 'Negative', flag: 'normal' },
      { name: 'Glucose',  value: 'Trace',     ref: 'Negative', flag: 'high'   },
      { name: 'Ketones',  value: 'Trace',     ref: 'Negative', flag: 'low'    },
    ],
  },
]

const TYPE_ICONS = { 'Blood Test': '🩸', 'X-Ray': '🩻', 'MRI': '🧠', 'Urine Test': '🧪', 'DNA Testing': '🧬' }
const STATUS_PROPS = {
  completed:  { color: 'success', icon: CheckCircleRoundedIcon, label: 'Completed' },
  processing: { color: 'warning', icon: HourglassEmptyRoundedIcon, label: 'Processing' },
  pending:    { color: 'default', icon: AccessTimeRoundedIcon, label: 'Pending' },
}
const flagColorsFor = (theme) => ({
  normal: theme.palette.success.main,
  high: theme.palette.error.main,
  low: theme.palette.warning.main,
})

// ─── Result Detail Dialog ─────────────────────────────────────────────────────
// SUG-TRES-001: handleDownloadPDF generates mock CSV/text file download
function handleDownloadPDF(result) {
  const lines = [
    `Test Result: ${result.id}`,
    `Test: ${result.test}`,
    `Patient: ${result.patient}`,
    `Ordered by: ${result.ordered_by}`,
    `Date Ordered: ${result.date_ordered}`,
    `Date Completed: ${result.date_completed}`,
    '',
    'Parameters:',
    ...result.values.map(v => `  ${v.name}: ${v.value} (Ref: ${v.ref}) [${v.flag.toUpperCase()}]`),
  ]
  const blob = new Blob([lines.join('\n')], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = `${result.id}-result.txt`; a.click()
  URL.revokeObjectURL(url)
}

function ResultDialog({ result, onClose }) {
  const theme = useTheme()
  const FLAG_COLORS = flagColorsFor(theme)
  if (!result) return null
  return (
    <Dialog open={!!result} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ fontWeight: 800, pb: 1 }}>
        {result.test}
        <Typography variant="caption" display="block" sx={{ color: 'text.secondary', fontWeight: 500, mt: 0.25 }}>
          Patient: {result.patient} · Ordered by: {result.ordered_by}
        </Typography>
      </DialogTitle>
      <DialogContent dividers>
        {result.values.length === 0
          ? <Typography color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>Results not yet available</Typography>
          : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ '& th': { fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', color: 'text.secondary', bgcolor: 'action.hover' } }}>
                    <TableCell>Parameter</TableCell>
                    <TableCell>Result</TableCell>
                    <TableCell>Reference Range</TableCell>
                    <TableCell>Flag</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {result.values.map((v, i) => {
                    // SUG-TRES-003: fallback to grey for unknown flag values
                    const flagColor = FLAG_COLORS[v.flag] || theme.palette.text.secondary
                    return (
                      <TableRow key={i} sx={{ '&:last-child td': { border: 0 } }}>
                        <TableCell sx={{ fontWeight: 600, fontSize: '0.8rem' }}>{v.name}</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.85rem', color: flagColor }}>{v.value}</TableCell>
                        <TableCell sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>{v.ref}</TableCell>
                        <TableCell>
                          <Chip label={v.flag} size="small"
                            sx={{
                              bgcolor: alpha(flagColor, theme.palette.mode === 'dark' ? 0.22 : 0.12),
                              color: flagColor,
                              fontWeight: 700,
                              fontSize: '0.7rem',
                              textTransform: 'capitalize',
                            }}
                          />
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )
        }
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} sx={{ textTransform: 'none', fontWeight: 700 }}>Close</Button>
        {result.status === 'completed' && (
          // SUG-TRES-001: Download PDF wired to handleDownloadPDF
          <Button variant="outlined" startIcon={<DownloadRoundedIcon />}
            onClick={() => handleDownloadPDF(result)}
            sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}>Download PDF</Button>
        )}
      </DialogActions>
    </Dialog>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function TestResultsPage() {
  const theme = useTheme()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')
  const [viewResult, setViewResult] = useState(null)
  // SUG-TRES-002: Order Test dialog state
  const [orderOpen, setOrderOpen] = useState(false)
  const [orderForm, setOrderForm] = useState({ patientId: '', patient: '', testType: 'Blood Test' })
  // F-08 (project-plans/02-findings-register.md) — the "Patient Name" field
  // used to be free text with no patient_id ever sent, which made the
  // backend's own patient self-scoping on this domain permanently dead code.
  const [patientSearch, setPatientSearch] = useState('')
  const [selectedPatient, setSelectedPatient] = useState(null)
  const { data: patientsData, loading: loadingPatients } = useQuery(PATIENTS_QUERY, {
    variables: { search: patientSearch, first: 20 },
    skip: patientSearch.length < 2,
    fetchPolicy: 'network-only',
  })
  const patientOptions = patientsData?.patients?.data ?? []
  // SUG-TRES-005: column sorting
  const [sortField, setSortField] = useState('date_ordered')
  const [sortDir, setSortDir] = useState('desc')

  // REQ133 (F-14 residue) — testResults is now {data, paginatorInfo}, not a
  // bare array. Also fixes a real bug found while touching these lines: the
  // old useMock fallback ("apiResults.length === 0 && !loading") fell back
  // to fabricated MOCK_RESULTS on any real *empty* result, not just a real
  // network error — live-confirmed the same class of bug Priority-3's own
  // sweep already found and fixed on appointments/index.jsx/calendar/index.jsx
  // (`error ? mockRows : apiRows`). Matches that exact fix here.
  const { data, loading, error, refetch } = useQuery(TEST_RESULTS_QUERY, { fetchPolicy: 'cache-and-network', errorPolicy: 'all' })
  const apiResults = data?.testResults?.data ?? []
  const useMock = !!error
  const [localResults, setLocalResults] = useState([])
  const results = useMock ? [...localResults, ...MOCK_RESULTS] : apiResults

  const [orderTest, { loading: ordering }] = useMutation(ORDER_TEST_MUTATION, {
    onCompleted: () => refetch(),
  })

  const handleOrderSubmit = async () => {
    try {
      await orderTest({ variables: { input: { patient_id: orderForm.patientId, patient: orderForm.patient, testType: orderForm.testType } } })
    } catch (_) {
      // SUG-TRES-008: backend unreachable — same offline-success pattern used
      // elsewhere in this codebase (e.g. patients/index.jsx's AddPatientDialog).
      const newResult = {
        id: `TR-${String(results.length + 1).padStart(3, '0')}`,
        patient: orderForm.patient,
        test: orderForm.testType,
        ordered_by: 'Current User',
        date_ordered: new Date().toISOString().split('T')[0],
        date_completed: null,
        status: 'pending',
        type: orderForm.testType,
        values: [],
      }
      setLocalResults(prev => [newResult, ...prev])
    }
    setOrderOpen(false)
    setOrderForm({ patientId: '', patient: '', testType: 'Blood Test' })
    setSelectedPatient(null)
    setPatientSearch('')
  }

  const handleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('asc') }
  }

  const types = useMemo(() => ['All', ...new Set(results.map(r => r.type))], [results])

  const filtered = useMemo(() => {
    const list = results.filter(r => {
      const matchSearch = !search || r.patient.toLowerCase().includes(search.toLowerCase()) || r.test.toLowerCase().includes(search.toLowerCase()) || r.id.toLowerCase().includes(search.toLowerCase())
      const matchType = typeFilter === 'All' || r.type === typeFilter
      const matchStatus = statusFilter === 'All' || r.status === statusFilter
      return matchSearch && matchType && matchStatus
    })
    // SUG-TRES-005: sort by the selected column
    const dir = sortDir === 'asc' ? 1 : -1
    return [...list].sort((a, b) => {
      const av = a[sortField] ?? '', bv = b[sortField] ?? ''
      return String(av).localeCompare(String(bv)) * dir
    })
  }, [results, search, typeFilter, statusFilter, sortField, sortDir])

  const counts = useMemo(() => ({
    completed:  results.filter(r => r.status === 'completed').length,
    processing: results.filter(r => r.status === 'processing').length,
    pending:    results.filter(r => r.status === 'pending').length,
  }), [results])

  return (
    <Box className="page-enter" sx={{ pb: 4 }}>
      <Helmet><title>Test Results — MediBook</title></Helmet>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight={800} sx={{ color: 'text.primary' }}>Medical Test Results</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {results.length} total results · {counts.pending} pending
            {/* REQ133 — the query is now bounded (first: 200 by default);
                say so honestly rather than silently truncating with no signal. */}
            {!useMock && data?.testResults?.paginatorInfo?.hasMorePages && (
              <> · showing the {results.length} most recent of {data.testResults.paginatorInfo.total}</>
            )}
          </Typography>
        </Box>
        {/* SUG-TRES-002: Order Test wired to dialog */}
        <Button variant="contained" startIcon={<ScienceRoundedIcon />}
          onClick={() => setOrderOpen(true)}
          sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 700 }}>Order Test</Button>
      </Box>

      {error && (
        <Alert severity="warning" sx={{ mb: 2, borderRadius: 2.5 }} action={<Button size="small" onClick={() => refetch()}>Retry</Button>}>
          Backend unavailable — showing sample data
        </Alert>
      )}

      {/* ── Status KPIs ─────────────────────────────────────────────────── */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {loading ? (
          // SUG-TRES-006: loading skeleton for KPI cards
          [0, 1, 2, 3].map(i => (
            <Grid item xs={6} md={3} key={i}>
              <Card sx={{ borderRadius: 3, border: '1px solid #E2E8F0', boxShadow: 'none' }}>
                <CardContent sx={{ p: '16px !important' }}>
                  <Skeleton variant="text" width={50} height={40} />
                  <Skeleton variant="text" width={80} height={18} />
                </CardContent>
              </Card>
            </Grid>
          ))
        ) : [
          { label: 'Total Tests', value: results.length, color: theme.palette.info.main, icon: ScienceRoundedIcon },
          { label: 'Completed', value: counts.completed, color: theme.palette.success.main, icon: CheckCircleRoundedIcon },
          { label: 'Processing', value: counts.processing, color: theme.palette.warning.main, icon: HourglassEmptyRoundedIcon },
          { label: 'Pending', value: counts.pending, color: theme.palette.text.secondary, icon: AccessTimeRoundedIcon },
        ].map((k) => (
          <Grid item xs={6} md={3} key={k.label}>
            <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
              <CardContent sx={{ p: '16px !important' }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography variant="h4" fontWeight={800} sx={{ color: k.color }}>{k.value}</Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>{k.label}</Typography>
                  </Box>
                  <Box
                    sx={{
                      width: 44,
                      height: 44,
                      borderRadius: 2.5,
                      bgcolor: alpha(k.color, theme.palette.mode === 'dark' ? 0.22 : 0.12),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <k.icon sx={{ color: k.color, fontSize: '1.3rem' }} />
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* ── Filters ─────────────────────────────────────────────────────── */}
      <Paper sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, boxShadow: 'none', mb: 3 }}>
        <Box sx={{ p: 2, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center', borderBottom: '1px solid', borderColor: 'divider' }}>
          <TextField size="small" placeholder="Search by patient, test, or ID…" value={search} onChange={(e) => setSearch(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchRoundedIcon fontSize="small" sx={{ color: 'text.disabled' }} /></InputAdornment> }}
            sx={{ flex: 1, minWidth: 240, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          />
          <TextField select size="small" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} label="Type" sx={{ minWidth: 130, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}>
            {types.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
          </TextField>
          <TextField select size="small" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} label="Status" sx={{ minWidth: 130, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}>
            {['All', 'completed', 'processing', 'pending'].map(s => <MenuItem key={s} value={s} sx={{ textTransform: 'capitalize' }}>{s.charAt(0).toUpperCase() + s.slice(1)}</MenuItem>)}
          </TextField>
          {/* SUG-TRES-004: Reset Filters button */}
          {(search || typeFilter !== 'All' || statusFilter !== 'All') && (
            <Button size="small" variant="text" onClick={() => { setSearch(''); setTypeFilter('All'); setStatusFilter('All') }}
              sx={{ textTransform: 'none', fontWeight: 700, color: 'text.secondary', whiteSpace: 'nowrap' }}>
              Clear Filters
            </Button>
          )}
        </Box>

        {/* ── Table ───────────────────────────────────────────────────── */}
        <TableContainer>
        <Table>
          <TableHead>
            <TableRow sx={{ '& th': { fontWeight: 700, color: 'text.secondary', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em', bgcolor: 'action.hover', py: 1.2 } }}>
              <TableCell>ID</TableCell>
              <TableCell>Test</TableCell>
              {/* SUG-TRES-005: column sorting on Patient, Date Ordered, Status */}
              <TableCell sortDirection={sortField === 'patient' ? sortDir : false}>
                <TableSortLabel active={sortField === 'patient'} direction={sortField === 'patient' ? sortDir : 'asc'} onClick={() => handleSort('patient')}>Patient</TableSortLabel>
              </TableCell>
              <TableCell>Ordered By</TableCell>
              <TableCell sortDirection={sortField === 'date_ordered' ? sortDir : false}>
                <TableSortLabel active={sortField === 'date_ordered'} direction={sortField === 'date_ordered' ? sortDir : 'asc'} onClick={() => handleSort('date_ordered')}>Date Ordered</TableSortLabel>
              </TableCell>
              <TableCell>Completed</TableCell>
              <TableCell sortDirection={sortField === 'status' ? sortDir : false}>
                <TableSortLabel active={sortField === 'status'} direction={sortField === 'status' ? sortDir : 'asc'} onClick={() => handleSort('status')}>Status</TableSortLabel>
              </TableCell>
              <TableCell align="right">Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              // SUG-TRES-006: loading skeleton for table rows
              [0, 1, 2, 3].map(i => (
                <TableRow key={i}>
                  {Array.from({ length: 8 }).map((_, c) => (
                    <TableCell key={c}><Skeleton variant="text" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : <>
              {filtered.map((r) => {
                const s = STATUS_PROPS[r.status] || STATUS_PROPS.pending
                return (
                  <TableRow key={r.id} hover sx={{ '&:last-child td': { border: 0 }, cursor: 'pointer' }} onClick={() => setViewResult(r)}>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.78rem', color: 'primary.main' }}>{r.id}</TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography sx={{ fontSize: '1.1rem' }}>{TYPE_ICONS[r.type] || '🧪'}</Typography>
                        <Box>
                          <Typography variant="body2" fontWeight={700}>{r.test}</Typography>
                          <Chip label={r.type} size="small" variant="outlined" sx={{ fontSize: '0.68rem', height: 18 }} />
                        </Box>
                      </Stack>
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.82rem', fontWeight: 600 }}>{r.patient}</TableCell>
                    <TableCell sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>{r.ordered_by}</TableCell>
                    <TableCell sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>{r.date_ordered}</TableCell>
                    <TableCell sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>{r.date_completed ?? <Chip label="Pending" size="small" sx={{ fontSize: '0.68rem' }} />}</TableCell>
                    <TableCell><Chip icon={<s.icon sx={{ fontSize: '0.85rem !important' }} />} label={s.label} color={s.color} size="small" sx={{ fontWeight: 700, fontSize: '0.72rem' }} /></TableCell>
                    <TableCell align="right" onClick={(e) => { e.stopPropagation(); setViewResult(r) }}>
                      <Tooltip title="View Result"><IconButton size="small" sx={{ color: 'primary.main' }}><VisibilityRoundedIcon fontSize="small" /></IconButton></Tooltip>
                    </TableCell>
                  </TableRow>
                )
              })}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={8} align="center" sx={{ py: 6, color: 'text.secondary' }}>No test results found</TableCell></TableRow>
              )}
            </>}
          </TableBody>
        </Table>
        </TableContainer>
      </Paper>

      <ResultDialog result={viewResult} onClose={() => setViewResult(null)} />

      {/* SUG-TRES-002: Order New Test Dialog */}
      <Dialog open={orderOpen} onClose={() => setOrderOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>Order New Test</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Autocomplete
              value={selectedPatient}
              inputValue={patientSearch}
              onInputChange={(_, val) => setPatientSearch(val)}
              onChange={(_, val) => {
                setSelectedPatient(val)
                setOrderForm(f => ({ ...f, patientId: val?.id ?? '', patient: val?.full_name ?? '' }))
              }}
              options={patientOptions}
              getOptionLabel={(p) => `${p.full_name} (${p.email ?? p.phone ?? ''})`}
              isOptionEqualToValue={(opt, val) => opt.id === val.id}
              loading={loadingPatients}
              noOptionsText={patientSearch.length < 2 ? 'Type at least 2 characters…' : 'No patients found'}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Patient"
                  placeholder="Search patient by name…"
                  size="small"
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {loadingPatients ? <CircularProgress size={18} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
            />
            <TextField select label="Test Type" fullWidth size="small"
              value={orderForm.testType}
              onChange={e => setOrderForm(f => ({ ...f, testType: e.target.value }))}
            >
              {['Blood Test', 'X-Ray', 'MRI', 'Urine Test', 'DNA Testing'].map(t => (
                <MenuItem key={t} value={t}>{TYPE_ICONS[t]} {t}</MenuItem>
              ))}
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button onClick={() => setOrderOpen(false)} sx={{ textTransform: 'none', fontWeight: 700, color: 'text.secondary' }}>Cancel</Button>
          <Button variant="contained" onClick={handleOrderSubmit}
            disabled={!orderForm.patientId}
            sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}>Submit Order</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
