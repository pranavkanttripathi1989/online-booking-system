import { useState, useEffect } from 'react'
import { useQuery, useMutation } from '@apollo/client'
import { Helmet } from 'react-helmet-async'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import {
  Alert,
  Avatar,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  Paper,
  Radio,
  RadioGroup,
  FormControlLabel,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import SearchIcon from '@mui/icons-material/Search'
import ClearIcon from '@mui/icons-material/Clear'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import PauseCircleFilledRoundedIcon from '@mui/icons-material/PauseCircleFilledRounded'
import ArchiveRoundedIcon from '@mui/icons-material/ArchiveRounded'
import UnarchiveRoundedIcon from '@mui/icons-material/UnarchiveRounded'
import MergeTypeRoundedIcon from '@mui/icons-material/MergeTypeRounded'
import CloseRoundedIcon from '@mui/icons-material/CloseRounded'

import { PATIENTS_QUERY } from '../../graphql/queries'
import { MERGE_PATIENTS_MUTATION } from '../../graphql/mutations'
import { useAuth } from '../../hooks/useAuth'

// ─── Mock patients fallback ───────────────────────────────────────────────────
// Patient safety states (on_hold/archived/labels) — requirements/semble-competitive-gap-analysis-requirements.md Phase 1
const MOCK_PATIENTS = [
  {
    id: '1',
    full_name: 'Alice Johnson',
    email: 'alice@email.com',
    phone: '+1 555-1001',
    date_of_birth: '1992-05-12',
    gender: 'female',
    on_hold: false,
    on_hold_reason: null,
    archived: false,
    labels: [],
  },
  {
    id: '2',
    full_name: 'Bob Smith',
    email: 'bob@email.com',
    phone: '+1 555-1002',
    date_of_birth: '1979-11-30',
    gender: 'male',
    on_hold: true,
    on_hold_reason: 'Outstanding balance',
    archived: false,
    labels: ['VIP'],
  },
  {
    id: '3',
    full_name: 'Carlos Reyes',
    email: 'carlos@email.com',
    phone: '+1 555-1003',
    date_of_birth: '1985-03-22',
    gender: 'male',
    on_hold: false,
    on_hold_reason: null,
    archived: false,
    labels: [],
  },
  {
    id: '4',
    full_name: 'Diana Prince',
    email: 'diana@email.com',
    phone: '+1 555-1004',
    date_of_birth: '1990-07-18',
    gender: 'female',
    on_hold: false,
    on_hold_reason: null,
    archived: false,
    labels: ['Referral'],
  },
  {
    id: '5',
    full_name: 'Ethan Hunt',
    email: 'ethan@email.com',
    phone: '+1 555-1005',
    date_of_birth: '1987-09-01',
    gender: 'male',
    on_hold: false,
    on_hold_reason: null,
    archived: true,
    labels: [],
  },
  {
    id: '6',
    full_name: 'Fiona Green',
    email: 'fiona@email.com',
    phone: '+1 555-1006',
    date_of_birth: '1995-01-14',
    gender: 'female',
    on_hold: false,
    on_hold_reason: null,
    archived: false,
    labels: [],
  },
  {
    id: '7',
    full_name: 'George Miller',
    email: 'george@email.com',
    phone: '+1 555-1007',
    date_of_birth: '1968-04-09',
    gender: 'male',
    on_hold: false,
    on_hold_reason: null,
    archived: false,
    labels: [],
  },
  {
    id: '8',
    full_name: 'Hannah Brown',
    email: 'hannah@email.com',
    phone: '+1 555-1008',
    date_of_birth: '2001-12-25',
    gender: 'female',
    on_hold: false,
    on_hold_reason: null,
    archived: false,
    labels: [],
  },
  {
    id: '9',
    full_name: 'Ivan Petrov',
    email: 'ivan@email.com',
    phone: '+1 555-1009',
    date_of_birth: '1983-06-30',
    gender: 'male',
    on_hold: false,
    on_hold_reason: null,
    archived: false,
    labels: [],
  },
  {
    id: '10',
    full_name: 'Julia Roberts',
    email: 'julia@email.com',
    phone: '+1 555-1010',
    date_of_birth: '1993-02-17',
    gender: 'female',
    on_hold: false,
    on_hold_reason: null,
    archived: false,
    labels: [],
  },
  {
    id: '11',
    full_name: 'Kevin Chen',
    email: 'kevin@email.com',
    phone: '+1 555-1011',
    date_of_birth: '1977-08-05',
    gender: 'male',
    on_hold: false,
    on_hold_reason: null,
    archived: false,
    labels: [],
  },
  {
    id: '12',
    full_name: 'Laura Martinez',
    email: 'laura@email.com',
    phone: '+1 555-1012',
    date_of_birth: '1998-10-20',
    gender: 'female',
    on_hold: false,
    on_hold_reason: null,
    archived: false,
    labels: [],
  },
  {
    id: '13',
    full_name: 'Michael Wang',
    email: 'michael@email.com',
    phone: '+1 555-1013',
    date_of_birth: '1972-03-15',
    gender: 'male',
    on_hold: false,
    on_hold_reason: null,
    archived: false,
    labels: [],
  },
  {
    id: '14',
    full_name: 'Nina Patel',
    email: 'nina@email.com',
    phone: '+1 555-1014',
    date_of_birth: '1989-07-28',
    gender: 'female',
    on_hold: false,
    on_hold_reason: null,
    archived: false,
    labels: [],
  },
  {
    id: '15',
    full_name: 'Oscar Kim',
    email: 'oscar@email.com',
    phone: '+1 555-1015',
    date_of_birth: '1994-11-11',
    gender: 'male',
    on_hold: false,
    on_hold_reason: null,
    archived: false,
    labels: [],
  },
]

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

// ─── Merge Duplicate Patients Dialog ───────────────────────────────────────────
// Originally built as a Semble-parity mockup (requirements/semble-competitive-
// gap-analysis-requirements.md) with no backend behind it — REQ018 US-BOOK-01
// wired handleConfirmMerge below to the real, permission-gated mergePatients
// mutation, which was previously unreachable in real operation entirely
// (the "Merge Duplicates" button that opens this dialog was gated on
// `useMock`, i.e. only ever shown once the real backend query returned zero
// results). This component itself stays presentation-only — pick a
// survivor, preview what moves, confirm.
function MergePatientsDialog({ open, patientA, patientB, onClose, onConfirm }) {
  const [primaryId, setPrimaryId] = useState(patientA?.id)

  useEffect(() => {
    setPrimaryId(patientA?.id)
  }, [patientA])

  if (!patientA || !patientB) return null
  const primary = primaryId === patientA.id ? patientA : patientB
  const secondary = primaryId === patientA.id ? patientB : patientA

  const rows = [
    ['Email', primary.email, secondary.email],
    ['Phone', primary.phone, secondary.phone],
    ['Date of birth', primary.date_of_birth ?? '—', secondary.date_of_birth ?? '—'],
    ['Labels', (primary.labels ?? []).join(', ') || '—', (secondary.labels ?? []).join(', ') || '—'],
  ]

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ fontWeight: 800 }}>Merge Duplicate Patients</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Choose which record to keep as the primary. The other record's labels will be merged in, and it will be archived with a link back
          to the surviving record — it won't be deleted.
        </Typography>

        <RadioGroup value={primaryId} onChange={(e) => setPrimaryId(e.target.value)}>
          <Stack spacing={1.5} sx={{ mb: 2 }}>
            {[patientA, patientB].map((p) => (
              <Paper
                key={p.id}
                variant="outlined"
                sx={{ p: 1.5, borderRadius: 2, borderColor: primaryId === p.id ? 'primary.main' : 'divider' }}
              >
                <FormControlLabel
                  value={p.id}
                  control={<Radio size="small" />}
                  label={
                    <Stack>
                      <Typography variant="body2" fontWeight={700}>
                        {p.full_name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {p.email} · {p.phone}
                      </Typography>
                    </Stack>
                  }
                  sx={{ width: '100%', m: 0 }}
                />
              </Paper>
            ))}
          </Stack>
        </RadioGroup>

        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700, fontSize: 11, textTransform: 'uppercase', color: '#9AA0A6' }}>Field</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: 11, textTransform: 'uppercase', color: '#188038' }}>Keeping (primary)</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: 11, textTransform: 'uppercase', color: '#9AA0A6' }}>Archiving</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map(([label, primaryVal, secondaryVal]) => (
              <TableRow key={label}>
                <TableCell sx={{ fontSize: 12, color: 'text.secondary' }}>{label}</TableCell>
                <TableCell sx={{ fontSize: 12 }}>{primaryVal}</TableCell>
                <TableCell sx={{ fontSize: 12, color: 'text.secondary' }}>{secondaryVal}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <Alert severity="warning" sx={{ mt: 2, borderRadius: 2 }}>
          Every appointment, encounter, prescription, test result, and payment tied to the archived record moves to the surviving record.
          The archived record is never deleted — only marked inactive, with the merge itself recorded for later audit.
        </Alert>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} sx={{ textTransform: 'none' }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color="error"
          startIcon={<MergeTypeRoundedIcon />}
          onClick={() => onConfirm(primary.id, secondary.id)}
          sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}
        >
          Merge Patients
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// ─── PatientsPage ─────────────────────────────────────────────────────────────
export default function PatientsPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  // REQ018 US-BOOK-01 — matches the backend's own tight gate on
  // mergePatients (not staff/receptionist, per the requirement's own
  // non-functional note: merge is irreversible-in-the-UI and touches
  // clinical records).
  const canMerge = user?.roles?.some((r) => ['admin', 'super_admin', 'manager'].includes(r.name)) ?? false
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(25)
  const [activeLetter, setActiveLetter] = useState(null)
  const [genderFilter, setGenderFilter] = useState('all')
  const [mockPatients, setMockPatients] = useState(MOCK_PATIENTS)
  const [showArchived, setShowArchived] = useState(false)

  // ─── Duplicate patient merging (Semble createMergeRecord/updateMergeRecord parity) ───
  const [mergeMode, setMergeMode] = useState(false)
  const [mergeSelection, setMergeSelection] = useState([])
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false)
  const [mergeSnackbar, setMergeSnackbar] = useState(null)

  const toggleOnHold = (id) => {
    setMockPatients((prev) =>
      prev.map((p) => (p.id === id ? { ...p, on_hold: !p.on_hold, on_hold_reason: !p.on_hold ? 'Manually placed on hold' : null } : p)),
    )
  }
  const toggleArchived = (id) => {
    setMockPatients((prev) => prev.map((p) => (p.id === id ? { ...p, archived: !p.archived } : p)))
  }

  const toggleMergeMode = () => {
    setMergeMode((v) => !v)
    setMergeSelection([])
  }

  const toggleMergeSelection = (id) => {
    setMergeSelection((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id)
      if (prev.length >= 2) return prev // cap at 2 — merge is pairwise
      return [...prev, id]
    })
  }

  const [mergePatientsMutation] = useMutation(MERGE_PATIENTS_MUTATION)

  // REQ018 US-BOOK-01 — real mode calls the real, permission-gated
  // mergePatients mutation (FK remapping + audit trail on the backend,
  // never a client-side "union labels" simulation). Mock mode (no backend
  // data at all) keeps the original local-state simulation, matching this
  // page's established fallback convention for every other action.
  const handleConfirmMerge = async (primaryId, secondaryId) => {
    if (useMock) {
      const primary = mockPatients.find((p) => p.id === primaryId)
      const secondary = mockPatients.find((p) => p.id === secondaryId)
      const mergedLabels = Array.from(new Set([...(primary.labels ?? []), ...(secondary.labels ?? [])]))

      setMockPatients((prev) =>
        prev.map((p) => {
          if (p.id === primaryId) {
            return {
              ...p,
              labels: mergedLabels,
              merge_history: [
                ...(p.merge_history ?? []),
                { merged_patient_id: secondary.id, merged_patient_name: secondary.full_name, merged_at: new Date().toISOString() },
              ],
            }
          }
          if (p.id === secondaryId) {
            return { ...p, archived: true, merged_into: primaryId, merged_into_name: primary.full_name }
          }
          return p
        }),
      )

      setMergeSnackbar(`${secondary.full_name} merged into ${primary.full_name}`)
      setMergeDialogOpen(false)
      setMergeMode(false)
      setMergeSelection([])
      return
    }

    const secondary = patients.find((p) => p.id === secondaryId)
    const primary = patients.find((p) => p.id === primaryId)
    try {
      await mergePatientsMutation({ variables: { input: { surviving_patient_id: primaryId, merged_patient_id: secondaryId } } })
      await refetch()
      setMergeSnackbar(`${secondary?.full_name} merged into ${primary?.full_name}`)
    } catch (err) {
      setMergeSnackbar(err?.graphQLErrors?.[0]?.message || 'Failed to merge patients')
    }
    setMergeDialogOpen(false)
    setMergeMode(false)
    setMergeSelection([])
  }

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(0)
    }, 300)
    return () => clearTimeout(t)
  }, [search])

  const { data, loading, error, refetch } = useQuery(PATIENTS_QUERY, {
    variables: { search: debouncedSearch || undefined, first: rowsPerPage, page: page + 1 },
    fetchPolicy: 'cache-and-network',
    errorPolicy: 'all',
  })

  const apiPatients = data?.patients?.data ?? []
  const apiTotal = data?.patients?.paginatorInfo?.total ?? 0

  // Fall back to mock if backend unavailable
  const useMock = apiPatients.length === 0 && !loading
  const allPatients = useMock ? mockPatients : apiPatients
  const total = useMock ? mockPatients.filter((p) => showArchived || !p.archived).length : apiTotal

  // Client-side filters for mock mode
  const patients = useMock
    ? allPatients.filter((p) => {
        const q = debouncedSearch.toLowerCase()
        // SUG-PAT-009: search also matches phone (name + email already matched)
        const matchSearch =
          !debouncedSearch ||
          p.full_name.toLowerCase().includes(q) ||
          p.email.toLowerCase().includes(q) ||
          (p.phone ?? '').toLowerCase().replace(/[\s-]/g, '').includes(q.replace(/[\s-]/g, ''))
        const matchLetter = !activeLetter || p.full_name.toUpperCase().startsWith(activeLetter)
        const matchGender = genderFilter === 'all' || p.gender === genderFilter
        const matchArchived = showArchived || !p.archived
        return matchSearch && matchLetter && matchGender && matchArchived
      })
    : allPatients

  return (
    <Box className="page-enter" sx={{ pb: 4 }}>
      <Helmet>
        <title>Patients — MediBook</title>
      </Helmet>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <Box
        sx={{
          display: 'flex',
          alignItems: { xs: 'flex-start', sm: 'center' },
          justifyContent: 'space-between',
          flexDirection: { xs: 'column', sm: 'row' },
          gap: { xs: 1.5, sm: 0 },
          mb: 3,
        }}
      >
        <Box>
          <Typography variant="h4" fontWeight={800} sx={{ color: 'text.primary', fontSize: { xs: '1.35rem', sm: '1.5rem' } }}>
            Patients
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {loading ? 'Loading…' : `${useMock ? patients.length : total} patient${total !== 1 ? 's' : ''}`}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} sx={{ width: { xs: '100%', sm: 'auto' } }}>
          {/* REQ018 US-BOOK-01 — previously gated on `useMock` (only ever
              shown once the real backend query returned zero results),
              which meant this real, permission-gated feature could never
              actually be reached against real data. Gated by role instead,
              matching the backend's own tight mergePatients gate. */}
          {canMerge && (
            <Button
              variant={mergeMode ? 'contained' : 'outlined'}
              color={mergeMode ? 'error' : 'inherit'}
              startIcon={mergeMode ? <CloseRoundedIcon /> : <MergeTypeRoundedIcon />}
              onClick={toggleMergeMode}
              sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 700, flexShrink: 0 }}
            >
              {mergeMode ? 'Cancel Merge' : 'Merge Duplicates'}
            </Button>
          )}
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/patients/new')}
            sx={{
              borderRadius: 2.5,
              textTransform: 'none',
              fontWeight: 700,
              flex: { xs: 1, sm: 'initial' },
              background: (t) => `linear-gradient(135deg, ${t.palette.primary.light} 0%, ${t.palette.primary.main} 100%)`,
              boxShadow: '0 2px 8px rgba(26,115,232,0.30)',
              '&:hover': {
                background: (t) => `linear-gradient(135deg, ${t.palette.primary.main} 0%, ${t.palette.primary.dark} 100%)`,
                boxShadow: '0 4px 14px rgba(26,115,232,0.40)',
              },
            }}
          >
            Add Patient
          </Button>
        </Stack>
      </Box>

      {mergeMode && (
        <Paper
          elevation={0}
          sx={{
            p: 1.5,
            mb: 2,
            border: (t) => `1px solid ${t.palette.warning.light}`,
            borderRadius: 3,
            bgcolor: '#FEF7E0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 1,
          }}
        >
          <Typography variant="body2" fontWeight={600}>
            {mergeSelection.length === 0 && 'Select two patient records to merge.'}
            {mergeSelection.length === 1 && 'Select one more record to compare and merge.'}
            {mergeSelection.length === 2 && '2 records selected — ready to review and merge.'}
          </Typography>
          <Button
            size="small"
            variant="contained"
            disabled={mergeSelection.length !== 2}
            onClick={() => setMergeDialogOpen(true)}
            sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
          >
            Review & Merge
          </Button>
        </Paper>
      )}

      {/* ── Search + Gender filters ──────────────────────────────────── */}
      <Paper
        elevation={0}
        sx={{ p: 2, mb: 2, border: (t) => `1px solid ${t.palette.divider}`, borderRadius: 3, bgcolor: 'background.paper' }}
      >
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search by name, email or phone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  {loading && debouncedSearch ? <CircularProgress size={16} /> : <SearchIcon fontSize="small" sx={{ color: '#9AA0A6' }} />}
                </InputAdornment>
              ),
              endAdornment: search && (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setSearch('')}>
                    <ClearIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiOutlinedInput-root': { borderRadius: 2 },
              '& .MuiOutlinedInput-root.Mui-focused fieldset': { borderColor: 'primary.main' },
            }}
          />
          <ToggleButtonGroup
            value={genderFilter}
            exclusive
            onChange={(_, v) => {
              if (v) {
                setGenderFilter(v)
                setPage(0)
              }
            }}
            size="small"
            sx={{ flexShrink: 0 }}
          >
            {[
              ['all', 'All'],
              ['male', 'Male'],
              ['female', 'Female'],
            ].map(([v, l]) => (
              <ToggleButton
                key={v}
                value={v}
                sx={{
                  textTransform: 'none',
                  fontWeight: 700,
                  px: 2,
                  '&.Mui-selected': { bgcolor: 'primary.50', color: 'primary.main', borderColor: 'info.light' },
                }}
              >
                {l}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
          <Chip
            label={showArchived ? 'Showing archived' : 'Show archived'}
            size="small"
            variant={showArchived ? 'filled' : 'outlined'}
            onClick={() => setShowArchived((v) => !v)}
            sx={{ flexShrink: 0, cursor: 'pointer', fontWeight: 700 }}
          />
        </Stack>
      </Paper>

      {/* ── A-Z Alphabet Filter ──────────────────────────────────────── */}
      <Paper
        elevation={0}
        sx={{ px: 2, py: 1.25, mb: 2.5, border: (t) => `1px solid ${t.palette.divider}`, borderRadius: 3, overflowX: 'auto' }}
      >
        <Box sx={{ display: 'flex', flexWrap: { xs: 'nowrap', sm: 'wrap' }, gap: 0.5, alignItems: 'center', minWidth: 'max-content' }}>
          <Chip
            label="All"
            size="small"
            onClick={() => setActiveLetter(null)}
            variant={!activeLetter ? 'filled' : 'outlined'}
            sx={{
              fontWeight: 700,
              cursor: 'pointer',
              borderRadius: 1.5,
              bgcolor: !activeLetter ? 'primary.50' : undefined,
              color: !activeLetter ? 'primary.main' : 'text.secondary',
              borderColor: !activeLetter ? 'info.light' : 'divider',
            }}
          />
          {ALPHABET.map((l) => (
            <Chip
              key={l}
              label={l}
              size="small"
              onClick={() => setActiveLetter(activeLetter === l ? null : l)}
              sx={{
                fontWeight: 700,
                cursor: 'pointer',
                minWidth: 28,
                borderRadius: 1.5,
                bgcolor: activeLetter === l ? 'primary.50' : 'transparent',
                color: activeLetter === l ? 'primary.main' : 'text.secondary',
                border: (t) => `1px solid ${activeLetter === l ? t.palette.info.light : t.palette.divider}`,
              }}
            />
          ))}
        </Box>
      </Paper>

      {error && (
        <Alert
          severity="warning"
          sx={{ mb: 2, borderRadius: 2.5 }}
          action={
            <Button size="small" onClick={() => refetch()}>
              Retry
            </Button>
          }
        >
          Backend unavailable — showing sample data
        </Alert>
      )}

      {/* ── Table ───────────────────────────────────────────────────── */}
      <Paper elevation={0} sx={{ border: (t) => `1px solid ${t.palette.divider}`, borderRadius: 3, overflow: 'hidden' }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow
                sx={{
                  '& th': {
                    fontWeight: 700,
                    bgcolor: 'background.default',
                    color: '#9AA0A6',
                    fontSize: '0.70rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.10em',
                    py: 1.5,
                  },
                }}
              >
                {mergeMode && <TableCell padding="checkbox" />}
                <TableCell>Patient</TableCell>
                <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Email</TableCell>
                <TableCell>Phone</TableCell>
                <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>Date of Birth</TableCell>
                <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>Gender</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading && patients.length === 0
                ? [...Array(8)].map((_, i) => (
                    <TableRow key={i}>
                      {[...Array(6)].map((_, j) => (
                        <TableCell key={j}>
                          <Box sx={{ height: 24, bgcolor: 'action.hover', borderRadius: 1 }} />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                : patients.map((p) => (
                    <TableRow
                      key={p.id}
                      hover
                      onClick={() => (mergeMode ? p.archived || toggleMergeSelection(p.id) : navigate(`/patients/${p.id}`))}
                      // SUG-PT-012: keyboard navigation for rows
                      tabIndex={0}
                      role="button"
                      aria-label={
                        mergeMode
                          ? `${mergeSelection.includes(p.id) ? 'Deselect' : 'Select'} ${p.full_name} for merge`
                          : `View patient ${p.full_name}`
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          if (mergeMode) {
                            if (!p.archived) toggleMergeSelection(p.id)
                          } else navigate(`/patients/${p.id}`)
                        }
                      }}
                      sx={{
                        cursor: mergeMode && p.archived ? 'not-allowed' : 'pointer',
                        opacity: p.archived ? 0.6 : 1,
                        bgcolor: mergeSelection.includes(p.id) ? 'primary.50' : undefined,
                        '&:last-child td': { border: 0 },
                        '&:hover': { bgcolor: mergeSelection.includes(p.id) ? 'primary.50' : '#F1F3F4' },
                        '&:focus-visible': { outline: (t) => `2px solid ${t.palette.primary.main}`, outlineOffset: '-2px' },
                      }}
                    >
                      {mergeMode && (
                        <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            size="small"
                            disabled={p.archived}
                            checked={mergeSelection.includes(p.id)}
                            onChange={() => toggleMergeSelection(p.id)}
                            inputProps={{ 'aria-label': `Select ${p.full_name} for merge` }}
                          />
                        </TableCell>
                      )}
                      <TableCell>
                        <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
                          <Avatar
                            sx={{ width: 34, height: 34, bgcolor: 'primary.50', color: 'primary.main', fontSize: 14, fontWeight: 700 }}
                          >
                            {p.full_name?.[0] ?? 'P'}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight={600} sx={{ color: 'text.primary' }}>
                              {p.full_name}
                            </Typography>
                            {(p.on_hold || p.archived || p.merge_history?.length > 0 || p.labels?.length > 0) && (
                              <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ mt: 0.25 }}>
                                {p.on_hold && (
                                  <Tooltip title={p.on_hold_reason || 'On hold'}>
                                    <Chip size="small" color="warning" label="On hold" sx={{ height: 18, fontSize: 10, fontWeight: 700 }} />
                                  </Tooltip>
                                )}
                                {p.merged_into ? (
                                  <Tooltip title={`Duplicate — merged into ${p.merged_into_name}`}>
                                    <Chip
                                      size="small"
                                      icon={<MergeTypeRoundedIcon sx={{ fontSize: 12 }} />}
                                      label={`Merged → ${p.merged_into_name}`}
                                      sx={{ height: 18, fontSize: 10, fontWeight: 700, bgcolor: '#FCE8E6', color: '#B3261E' }}
                                    />
                                  </Tooltip>
                                ) : (
                                  p.archived && (
                                    <Chip
                                      size="small"
                                      label="Archived"
                                      sx={{ height: 18, fontSize: 10, fontWeight: 700, bgcolor: '#F1F3F4' }}
                                    />
                                  )
                                )}
                                {p.merge_history?.length > 0 && (
                                  <Tooltip
                                    title={`Absorbed ${p.merge_history.length} duplicate record(s): ${p.merge_history.map((h) => h.merged_patient_name).join(', ')}`}
                                  >
                                    <Chip
                                      size="small"
                                      icon={<MergeTypeRoundedIcon sx={{ fontSize: 12 }} />}
                                      label={`${p.merge_history.length} merged`}
                                      variant="outlined"
                                      sx={{ height: 18, fontSize: 10, fontWeight: 700, color: '#188038', borderColor: '#188038' }}
                                    />
                                  </Tooltip>
                                )}
                                {p.labels?.map((label) => (
                                  <Chip
                                    key={label}
                                    size="small"
                                    label={label}
                                    variant="outlined"
                                    sx={{ height: 18, fontSize: 10, fontWeight: 700 }}
                                  />
                                ))}
                              </Stack>
                            )}
                          </Box>
                        </Stack>
                      </TableCell>
                      <TableCell sx={{ fontSize: 13, color: 'text.secondary', display: { xs: 'none', sm: 'table-cell' } }}>
                        {p.email ?? '—'}
                      </TableCell>
                      <TableCell sx={{ fontSize: 13, color: 'text.secondary' }}>{p.phone ?? '—'}</TableCell>
                      <TableCell sx={{ fontSize: 13, color: 'text.secondary', display: { xs: 'none', md: 'table-cell' } }}>
                        {p.date_of_birth ? dayjs(p.date_of_birth).format('DD/MM/YYYY') : '—'}
                      </TableCell>
                      <TableCell>
                        {p.gender ? (
                          <Chip
                            label={p.gender.replace(/_/g, ' ')}
                            size="small"
                            sx={{
                              fontSize: 10,
                              height: 20,
                              textTransform: 'capitalize',
                              bgcolor: p.gender === 'male' ? '#EFF6FF' : p.gender === 'female' ? '#FDF2F8' : '#F0FDF4',
                              color: p.gender === 'male' ? '#1565C7' : p.gender === 'female' ? '#9D174D' : '#0B7B5C',
                              fontWeight: 700,
                            }}
                          />
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                        <Tooltip title="View Profile">
                          <IconButton size="small" onClick={() => navigate(`/patients/${p.id}`)} sx={{ color: 'primary.main' }}>
                            <OpenInNewIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit Patient">
                          <IconButton size="small" onClick={() => navigate(`/patients/${p.id}/edit`)} sx={{ color: 'warning.main' }}>
                            <span style={{ fontSize: '14px', lineHeight: 1 }}>✎</span>
                          </IconButton>
                        </Tooltip>
                        {useMock && (
                          <>
                            <Tooltip title={p.on_hold ? 'Remove hold' : 'Place on hold'}>
                              <IconButton
                                size="small"
                                onClick={() => toggleOnHold(p.id)}
                                aria-label={`${p.on_hold ? 'Remove hold from' : 'Place'} ${p.full_name} ${p.on_hold ? '' : 'on hold'}`}
                                sx={{ color: p.on_hold ? 'warning.main' : 'text.disabled' }}
                              >
                                <PauseCircleFilledRoundedIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title={p.archived ? 'Unarchive' : 'Archive'}>
                              <IconButton
                                size="small"
                                onClick={() => toggleArchived(p.id)}
                                aria-label={`${p.archived ? 'Unarchive' : 'Archive'} ${p.full_name}`}
                                sx={{ color: 'text.disabled' }}
                              >
                                {p.archived ? <UnarchiveRoundedIcon fontSize="small" /> : <ArchiveRoundedIcon fontSize="small" />}
                              </IconButton>
                            </Tooltip>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
              {!loading && patients.length === 0 && (
                <TableRow>
                  <TableCell colSpan={mergeMode ? 7 : 6} align="center" sx={{ py: 8 }}>
                    <Typography color="text.secondary">
                      {debouncedSearch
                        ? `No patients match "${debouncedSearch}"`
                        : activeLetter
                          ? `No patients starting with "${activeLetter}"`
                          : 'No patients found'}
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={patients.length}
          page={page}
          rowsPerPage={rowsPerPage}
          rowsPerPageOptions={[10, 25, 50]}
          onPageChange={(_, p) => setPage(p)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(+e.target.value)
            setPage(0)
          }}
        />
      </Paper>

      <MergePatientsDialog
        open={mergeDialogOpen}
        patientA={patients.find((p) => p.id === mergeSelection[0])}
        patientB={patients.find((p) => p.id === mergeSelection[1])}
        onClose={() => setMergeDialogOpen(false)}
        onConfirm={handleConfirmMerge}
      />

      <Snackbar
        open={!!mergeSnackbar}
        autoHideDuration={4000}
        onClose={() => setMergeSnackbar(null)}
        message={mergeSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  )
}
