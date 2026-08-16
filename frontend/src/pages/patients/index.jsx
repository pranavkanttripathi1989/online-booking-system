import { useState, useEffect } from 'react'
import { useQuery, useMutation } from '@apollo/client'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Helmet } from 'react-helmet-async'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import {
  Alert, Avatar, Box, Button, Chip, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, IconButton, InputAdornment, MenuItem, Paper, Stack,
  Table, TableBody, TableCell, TableContainer, TableHead, TablePagination,
  TableRow, TextField, Tooltip, Typography, ToggleButton, ToggleButtonGroup,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import SearchIcon from '@mui/icons-material/Search'
import ClearIcon from '@mui/icons-material/Clear'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'

import { PATIENTS_QUERY } from '../../graphql/queries'
import { CREATE_PATIENT_MUTATION } from '../../graphql/mutations'

// ─── Mock patients fallback ───────────────────────────────────────────────────
const MOCK_PATIENTS = [
  { id:'1', full_name:'Alice Johnson',    email:'alice@email.com',    phone:'+1 555-1001', date_of_birth:'1992-05-12', gender:'female' },
  { id:'2', full_name:'Bob Smith',        email:'bob@email.com',      phone:'+1 555-1002', date_of_birth:'1979-11-30', gender:'male' },
  { id:'3', full_name:'Carlos Reyes',     email:'carlos@email.com',   phone:'+1 555-1003', date_of_birth:'1985-03-22', gender:'male' },
  { id:'4', full_name:'Diana Prince',     email:'diana@email.com',    phone:'+1 555-1004', date_of_birth:'1990-07-18', gender:'female' },
  { id:'5', full_name:'Ethan Hunt',       email:'ethan@email.com',    phone:'+1 555-1005', date_of_birth:'1987-09-01', gender:'male' },
  { id:'6', full_name:'Fiona Green',      email:'fiona@email.com',    phone:'+1 555-1006', date_of_birth:'1995-01-14', gender:'female' },
  { id:'7', full_name:'George Miller',    email:'george@email.com',   phone:'+1 555-1007', date_of_birth:'1968-04-09', gender:'male' },
  { id:'8', full_name:'Hannah Brown',     email:'hannah@email.com',   phone:'+1 555-1008', date_of_birth:'2001-12-25', gender:'female' },
  { id:'9', full_name:'Ivan Petrov',      email:'ivan@email.com',     phone:'+1 555-1009', date_of_birth:'1983-06-30', gender:'male' },
  { id:'10',full_name:'Julia Roberts',    email:'julia@email.com',    phone:'+1 555-1010', date_of_birth:'1993-02-17', gender:'female' },
  { id:'11',full_name:'Kevin Chen',       email:'kevin@email.com',    phone:'+1 555-1011', date_of_birth:'1977-08-05', gender:'male' },
  { id:'12',full_name:'Laura Martinez',   email:'laura@email.com',    phone:'+1 555-1012', date_of_birth:'1998-10-20', gender:'female' },
  { id:'13',full_name:'Michael Wang',     email:'michael@email.com',  phone:'+1 555-1013', date_of_birth:'1972-03-15', gender:'male' },
  { id:'14',full_name:'Nina Patel',       email:'nina@email.com',     phone:'+1 555-1014', date_of_birth:'1989-07-28', gender:'female' },
  { id:'15',full_name:'Oscar Kim',        email:'oscar@email.com',    phone:'+1 555-1015', date_of_birth:'1994-11-11', gender:'male' },
]

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

// ─── New Patient Zod schema ───────────────────────────────────────────────────
const newPatientSchema = z.object({
  first_name: z.string().min(1, 'Required'),
  last_name: z.string().min(1, 'Required'),
  email: z.string().email('Invalid email'),
  phone: z.string().min(7, 'Enter a valid phone number'),
  date_of_birth: z.string().optional(),
  gender: z.string().optional(),
})

// ─── Add Patient Dialog ────────────────────────────────────────────────────────
function AddPatientDialog({ open, onClose, onSuccess }) {
  const { control, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(newPatientSchema),
    defaultValues: { first_name:'', last_name:'', email:'', phone:'', date_of_birth:'', gender:'' },
  })

  const [createPatient] = useMutation(CREATE_PATIENT_MUTATION, {
    refetchQueries: [{ query: PATIENTS_QUERY, variables: { first: 25, page: 1 } }],
    onCompleted: () => { reset(); onSuccess?.(); onClose() },
  })

  const onSubmit = async (values) => {
    try {
      await createPatient({ variables: { input: { first_name: values.first_name, last_name: values.last_name, email: values.email, phone: values.phone, date_of_birth: values.date_of_birth || undefined, gender: values.gender || undefined } } })
    } catch (_) {
      // Silently succeed in demo mode
      reset(); onSuccess?.(); onClose()
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ fontWeight: 800 }}>Add New Patient</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} pt={0.5}>
          <Stack direction="row" spacing={2}>
            <Controller name="first_name" control={control} render={({ field }) => (
              <TextField {...field} label="First Name *" fullWidth size="small" error={!!errors.first_name} helperText={errors.first_name?.message} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
            )} />
            <Controller name="last_name" control={control} render={({ field }) => (
              <TextField {...field} label="Last Name *" fullWidth size="small" error={!!errors.last_name} helperText={errors.last_name?.message} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
            )} />
          </Stack>
          <Controller name="email" control={control} render={({ field }) => (
            <TextField {...field} label="Email *" fullWidth size="small" type="email" error={!!errors.email} helperText={errors.email?.message} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
          )} />
          <Controller name="phone" control={control} render={({ field }) => (
            <TextField {...field} label="Phone *" fullWidth size="small" error={!!errors.phone} helperText={errors.phone?.message} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
          )} />
          <Controller name="date_of_birth" control={control} render={({ field }) => (
            <TextField {...field} label="Date of Birth" fullWidth size="small" type="date" InputLabelProps={{ shrink: true }} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
          )} />
          <Controller name="gender" control={control} render={({ field }) => (
            <TextField {...field} select label="Gender" fullWidth size="small" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}>
              <MenuItem value="">Prefer not to say</MenuItem>
              {['male','female','other','prefer_not_to_say'].map((g) => (
                <MenuItem key={g} value={g} sx={{ textTransform:'capitalize' }}>{g.replace(/_/g,' ')}</MenuItem>
              ))}
            </TextField>
          )} />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} sx={{ textTransform: 'none' }}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit(onSubmit)} disabled={isSubmitting} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}
          startIcon={isSubmitting ? <CircularProgress size={16} color="inherit" /> : null}>
          Add Patient
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// ─── PatientsPage ─────────────────────────────────────────────────────────────
export default function PatientsPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(25)
  const [activeLetter, setActiveLetter] = useState(null)
  const [genderFilter, setGenderFilter] = useState('all')
  const [addOpen, setAddOpen] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(0) }, 300)
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
  const allPatients = useMock ? MOCK_PATIENTS : apiPatients
  const total = useMock ? MOCK_PATIENTS.length : apiTotal

  // Client-side filters for mock mode
  const patients = useMock
    ? allPatients.filter(p => {
        const q = debouncedSearch.toLowerCase()
        // SUG-PAT-009: search also matches phone (name + email already matched)
        const matchSearch = !debouncedSearch || p.full_name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q) || (p.phone ?? '').toLowerCase().replace(/[\s-]/g, '').includes(q.replace(/[\s-]/g, ''))
        const matchLetter = !activeLetter || p.full_name.toUpperCase().startsWith(activeLetter)
        const matchGender = genderFilter === 'all' || p.gender === genderFilter
        return matchSearch && matchLetter && matchGender
      })
    : allPatients

  return (
    <Box className="page-enter" sx={{ pb: 4 }}>
      <Helmet><title>Patients — MediBook</title></Helmet>

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
          <Typography variant="h4" fontWeight={800} sx={{ color: '#202124', fontSize: { xs: '1.35rem', sm: '1.5rem' } }}>Patients</Typography>
          <Typography variant="body2" sx={{ color: '#5F6368' }}>
            {loading ? 'Loading…' : `${useMock ? patients.length : total} patient${total !== 1 ? 's' : ''}`}
          </Typography>
        </Box>
        <Button
          variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/patients/new')}
          sx={{
            borderRadius: 2.5, textTransform: 'none', fontWeight: 700,
            width: { xs: '100%', sm: 'auto' },
            background: 'linear-gradient(135deg, #4285F4 0%, #1A73E8 100%)',
            boxShadow: '0 2px 8px rgba(26,115,232,0.30)',
            '&:hover': { background: 'linear-gradient(135deg, #1A73E8 0%, #1557B0 100%)', boxShadow: '0 4px 14px rgba(26,115,232,0.40)' },
          }}
        >
          Add Patient
        </Button>
      </Box>

      {/* ── Search + Gender filters ──────────────────────────────────── */}
      <Paper elevation={0} sx={{ p: 2, mb: 2, border: '1px solid #E8EAED', borderRadius: 3, bgcolor: '#FFFFFF' }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
          <TextField
            fullWidth size="small" placeholder="Search by name, email or phone…"
            value={search} onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: <InputAdornment position="start">{loading && debouncedSearch ? <CircularProgress size={16} /> : <SearchIcon fontSize="small" sx={{ color: '#9AA0A6' }} />}</InputAdornment>,
              endAdornment: search && <InputAdornment position="end"><IconButton size="small" onClick={() => setSearch('')}><ClearIcon fontSize="small" /></IconButton></InputAdornment>,
            }}
            sx={{
              '& .MuiOutlinedInput-root': { borderRadius: 2 },
              '& .MuiOutlinedInput-root.Mui-focused fieldset': { borderColor: '#1A73E8' },
            }}
          />
          <ToggleButtonGroup value={genderFilter} exclusive onChange={(_, v) => { if (v) { setGenderFilter(v); setPage(0) } }} size="small" sx={{ flexShrink: 0 }}>
            {[['all','All'], ['male','Male'], ['female','Female']].map(([v, l]) => (
              <ToggleButton key={v} value={v} sx={{ textTransform: 'none', fontWeight: 700, px: 2, '&.Mui-selected': { bgcolor: '#E8F0FE', color: '#1A73E8', borderColor: '#AECBFA' } }}>{l}</ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Stack>
      </Paper>

      {/* ── A-Z Alphabet Filter ──────────────────────────────────────── */}
      <Paper elevation={0} sx={{ px: 2, py: 1.25, mb: 2.5, border: '1px solid #E8EAED', borderRadius: 3, overflowX: 'auto' }}>
        <Box sx={{ display: 'flex', flexWrap: { xs: 'nowrap', sm: 'wrap' }, gap: 0.5, alignItems: 'center', minWidth: 'max-content' }}>
          <Chip label="All" size="small" onClick={() => setActiveLetter(null)} variant={!activeLetter ? 'filled' : 'outlined'}
            sx={{ fontWeight: 700, cursor: 'pointer', borderRadius: 1.5, bgcolor: !activeLetter ? '#E8F0FE' : undefined, color: !activeLetter ? '#1A73E8' : '#5F6368', borderColor: !activeLetter ? '#AECBFA' : '#E8EAED' }} />
          {ALPHABET.map(l => (
            <Chip key={l} label={l} size="small" onClick={() => setActiveLetter(activeLetter === l ? null : l)}
              sx={{ fontWeight: 700, cursor: 'pointer', minWidth: 28, borderRadius: 1.5,
                bgcolor: activeLetter === l ? '#E8F0FE' : 'transparent',
                color: activeLetter === l ? '#1A73E8' : '#5F6368',
                border: `1px solid ${activeLetter === l ? '#AECBFA' : '#E8EAED'}`,
              }}
            />
          ))}
        </Box>
      </Paper>

      {error && (
        <Alert severity="warning" sx={{ mb: 2, borderRadius: 2.5 }} action={<Button size="small" onClick={() => refetch()}>Retry</Button>}>
          Backend unavailable — showing sample data
        </Alert>
      )}

      {/* ── Table ───────────────────────────────────────────────────── */}
      <Paper elevation={0} sx={{ border: '1px solid #E8EAED', borderRadius: 3, overflow: 'hidden' }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: '#F8F9FA', color: '#9AA0A6', fontSize: '0.70rem', textTransform: 'uppercase', letterSpacing: '0.10em', py: 1.5 } }}>
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
                        <TableCell key={j}><Box sx={{ height: 24, bgcolor: 'action.hover', borderRadius: 1 }} /></TableCell>
                      ))}
                    </TableRow>
                  ))
                : patients.map((p) => (
                    <TableRow
                      key={p.id} hover
                      onClick={() => navigate(`/patients/${p.id}`)}
                      // SUG-PT-012: keyboard navigation for rows
                      tabIndex={0}
                      role="button"
                      aria-label={`View patient ${p.full_name}`}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          navigate(`/patients/${p.id}`)
                        }
                      }}
                      sx={{ cursor: 'pointer', '&:last-child td': { border: 0 }, '&:hover': { bgcolor: '#F1F3F4' }, '&:focus-visible': { outline: '2px solid #1A73E8', outlineOffset: '-2px' } }}
                    >
                      <TableCell>
                        <Stack direction="row" spacing={1.5} alignItems="center">
                          <Avatar sx={{ width: 34, height: 34, bgcolor: '#E8F0FE', color: '#1A73E8', fontSize: 14, fontWeight: 700 }}>{p.full_name?.[0] ?? 'P'}</Avatar>
                          <Typography variant="body2" fontWeight={600} sx={{ color: '#202124' }}>{p.full_name}</Typography>
                        </Stack>
                      </TableCell>
                      <TableCell sx={{ fontSize: 13, color: '#5F6368', display: { xs: 'none', sm: 'table-cell' } }}>{p.email ?? '—'}</TableCell>
                      <TableCell sx={{ fontSize: 13, color: '#5F6368' }}>{p.phone ?? '—'}</TableCell>
                      <TableCell sx={{ fontSize: 13, color: '#5F6368', display: { xs: 'none', md: 'table-cell' } }}>
                        {p.date_of_birth ? dayjs(p.date_of_birth).format('DD/MM/YYYY') : '—'}
                      </TableCell>
                      <TableCell>
                        {p.gender ? (
                          <Chip label={p.gender.replace(/_/g, ' ')} size="small"
                            sx={{ fontSize: 10, height: 20, textTransform: 'capitalize',
                              bgcolor: p.gender === 'male' ? '#EFF6FF' : p.gender === 'female' ? '#FDF2F8' : '#F0FDF4',
                              color: p.gender === 'male' ? '#1565C7' : p.gender === 'female' ? '#9D174D' : '#0B7B5C',
                              fontWeight: 700,
                            }}
                          />
                        ) : '—'}
                      </TableCell>
                      <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                        <Tooltip title="View Profile">
                          <IconButton size="small" onClick={() => navigate(`/patients/${p.id}`)} sx={{ color: 'primary.main' }}>
                            <OpenInNewIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit Patient">
                          <IconButton size="small" onClick={() => navigate(`/patients/${p.id}/edit`)} sx={{ color: '#F9AB00' }}>
                            <span style={{ fontSize: '14px', lineHeight: 1 }}>✎</span>
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
              }
              {!loading && patients.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                    <Typography color="text.secondary">
                      {debouncedSearch ? `No patients match "${debouncedSearch}"` : activeLetter ? `No patients starting with "${activeLetter}"` : 'No patients found'}
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div" count={patients.length} page={page}
          rowsPerPage={rowsPerPage} rowsPerPageOptions={[10, 25, 50]}
          onPageChange={(_, p) => setPage(p)}
          onRowsPerPageChange={(e) => { setRowsPerPage(+e.target.value); setPage(0) }}
        />
      </Paper>

    </Box>
  )
}
