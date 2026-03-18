import { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import {
  Box, Button, Typography, Chip, Grid, Card, CardContent, Stack, Paper,
  Table, TableBody, TableCell, TableHead, TableRow, TextField, InputAdornment,
  MenuItem, IconButton, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions,
  Divider, LinearProgress,
} from '@mui/material'
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
    id: 'TR-006', patient: 'Jessica Liu',    test: 'Urine Analysis',          ordered_by: 'Dr. Carlos Vega',  date_ordered: '2026-02-15', date_completed: '2026-02-16', status: 'completed', type: 'Urine Test',
    values: [{ name: 'pH', value: '6.0', ref: '4.5–8.0', flag: 'normal' }, { name: 'Protein', value: 'Negative', ref: 'Negative', flag: 'normal' }, { name: 'Glucose', value: 'Trace', ref: 'Negative', flag: 'high' }],
  },
]

const TYPE_ICONS = { 'Blood Test': '🩸', 'X-Ray': '🩻', 'MRI': '🧠', 'Urine Test': '🧪', 'DNA Testing': '🧬' }
const STATUS_PROPS = {
  completed:  { color: 'success', icon: CheckCircleRoundedIcon, label: 'Completed' },
  processing: { color: 'warning', icon: HourglassEmptyRoundedIcon, label: 'Processing' },
  pending:    { color: 'default', icon: AccessTimeRoundedIcon, label: 'Pending' },
}
const FLAG_COLORS = { normal: '#0B7B5C', high: '#DC2626', low: '#D97706' }

// ─── Result Detail Dialog ─────────────────────────────────────────────────────
function ResultDialog({ result, onClose }) {
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
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& th': { fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', color: 'text.secondary', bgcolor: '#F8FAFC' } }}>
                  <TableCell>Parameter</TableCell>
                  <TableCell>Result</TableCell>
                  <TableCell>Reference Range</TableCell>
                  <TableCell>Flag</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {result.values.map((v, i) => (
                  <TableRow key={i} sx={{ '&:last-child td': { border: 0 } }}>
                    <TableCell sx={{ fontWeight: 600, fontSize: '0.8rem' }}>{v.name}</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.85rem', color: FLAG_COLORS[v.flag] || 'text.primary' }}>{v.value}</TableCell>
                    <TableCell sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>{v.ref}</TableCell>
                    <TableCell>
                      <Chip label={v.flag} size="small"
                        sx={{ bgcolor: `${FLAG_COLORS[v.flag]}18`, color: FLAG_COLORS[v.flag], fontWeight: 700, fontSize: '0.7rem', textTransform: 'capitalize' }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )
        }
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} sx={{ textTransform: 'none', fontWeight: 700 }}>Close</Button>
        {result.status === 'completed' && (
          <Button variant="outlined" startIcon={<DownloadRoundedIcon />} sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}>Download PDF</Button>
        )}
      </DialogActions>
    </Dialog>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function TestResultsPage() {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')
  const [viewResult, setViewResult] = useState(null)

  const types = ['All', ...new Set(MOCK_RESULTS.map(r => r.type))]
  const filtered = MOCK_RESULTS.filter(r => {
    const matchSearch = !search || r.patient.toLowerCase().includes(search.toLowerCase()) || r.test.toLowerCase().includes(search.toLowerCase()) || r.id.toLowerCase().includes(search.toLowerCase())
    const matchType = typeFilter === 'All' || r.type === typeFilter
    const matchStatus = statusFilter === 'All' || r.status === statusFilter
    return matchSearch && matchType && matchStatus
  })

  const counts = { completed: MOCK_RESULTS.filter(r => r.status === 'completed').length, processing: MOCK_RESULTS.filter(r => r.status === 'processing').length, pending: MOCK_RESULTS.filter(r => r.status === 'pending').length }

  return (
    <Box className="page-enter" sx={{ pb: 4 }}>
      <Helmet><title>Test Results — MediBook</title></Helmet>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight={800} sx={{ color: '#0D1B2E' }}>Medical Test Results</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>{MOCK_RESULTS.length} total results · {counts.pending} pending</Typography>
        </Box>
        <Button variant="contained" startIcon={<ScienceRoundedIcon />} sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 700 }}>Order Test</Button>
      </Box>

      {/* ── Status KPIs ─────────────────────────────────────────────────── */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {[
          { label: 'Total Tests', value: MOCK_RESULTS.length, color: '#1565C7', icon: ScienceRoundedIcon },
          { label: 'Completed', value: counts.completed, color: '#0B7B5C', icon: CheckCircleRoundedIcon },
          { label: 'Processing', value: counts.processing, color: '#D97706', icon: HourglassEmptyRoundedIcon },
          { label: 'Pending', value: counts.pending, color: '#64748B', icon: AccessTimeRoundedIcon },
        ].map((k) => (
          <Grid item xs={6} md={3} key={k.label}>
            <Card sx={{ borderRadius: 3, border: '1px solid #E2E8F0', boxShadow: 'none' }}>
              <CardContent sx={{ p: '16px !important' }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography variant="h4" fontWeight={800} sx={{ color: k.color }}>{k.value}</Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>{k.label}</Typography>
                  </Box>
                  <Box sx={{ width: 44, height: 44, borderRadius: 2.5, bgcolor: `${k.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <k.icon sx={{ color: k.color, fontSize: '1.3rem' }} />
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* ── Filters ─────────────────────────────────────────────────────── */}
      <Paper sx={{ border: '1px solid #E2E8F0', borderRadius: 3, boxShadow: 'none', mb: 3 }}>
        <Box sx={{ p: 2, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center', borderBottom: '1px solid #E2E8F0' }}>
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
        </Box>

        {/* ── Table ───────────────────────────────────────────────────── */}
        <Table>
          <TableHead>
            <TableRow sx={{ '& th': { fontWeight: 700, color: 'text.secondary', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em', bgcolor: '#F8FAFC', py: 1.2 } }}>
              <TableCell>ID</TableCell>
              <TableCell>Test</TableCell>
              <TableCell>Patient</TableCell>
              <TableCell>Ordered By</TableCell>
              <TableCell>Date Ordered</TableCell>
              <TableCell>Completed</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
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
          </TableBody>
        </Table>
      </Paper>

      <ResultDialog result={viewResult} onClose={() => setViewResult(null)} />
    </Box>
  )
}
