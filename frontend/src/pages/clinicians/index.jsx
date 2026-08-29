import { useState, useMemo } from 'react'
import { useQuery } from '@apollo/client'
import { useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import {
  Alert,
  Box,
  Button,
  Chip,
  Grid,
  InputAdornment,
  MenuItem,
  Paper,
  Skeleton,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import SearchRoundedIcon from '@mui/icons-material/SearchRounded'
import AddIcon from '@mui/icons-material/Add'
import FilterListOffIcon from '@mui/icons-material/FilterListOff'

import { CLINICIANS_QUERY, CLINICS_QUERY } from '../../graphql/queries'
import { useAuth } from '../../context/AuthContext'
import ClinicianCard from '../../components/Clinicians/ClinicianCard'
import ClinicianProfileDrawer from '../../components/Clinicians/ClinicianProfileDrawer'
import ClinicianFormDrawer from '../../components/Clinicians/ClinicianFormDrawer'

// ─── Mock Clinicians (fallback when backend is offline) ─────────────────────
// BUG-CLIN-001 fix: use `clinician_type` object + `clinics` array to match
// ClinicianCard's expected data shape (it reads clinician_type.name and clinics).
// Added consultation_fee, avg_rating, total_reviews, services, availability_templates.
const MOCK_CLINICIANS = [
  {
    id: 'c1',
    full_name: 'Dr. Jane Smith',
    specialty: 'General Practitioner',
    clinician_type: { id: 'ct1', name: 'General Practitioner' },
    qualification: 'MBBS, MRCGP',
    email: 'jane.smith@medibook.com',
    phone: '+44 7700 900001',
    is_active: true,
    consultation_fee: 80,
    avg_rating: 4.8,
    total_reviews: 128,
    avatar_url: null,
    clinic: { id: 'cl1', name: 'Central Medical Centre' },
    clinics: [{ id: 'cl1', name: 'Central Medical Centre' }],
    services: [
      { id: 'sv1', name: 'General Consultation' },
      { id: 'sv2', name: 'Follow-up' },
    ],
    availability_templates: [
      { id: 'at1', day_of_week: 1, is_active: true },
      { id: 'at2', day_of_week: 2, is_active: true },
      { id: 'at3', day_of_week: 3, is_active: true },
      { id: 'at4', day_of_week: 4, is_active: true },
      { id: 'at5', day_of_week: 5, is_active: true },
    ],
  },
  {
    id: 'c2',
    full_name: 'Dr. Carlos Vega',
    specialty: 'Cardiologist',
    clinician_type: { id: 'ct2', name: 'Cardiologist' },
    qualification: 'MD, FRCP',
    email: 'carlos.vega@medibook.com',
    phone: '+44 7700 900002',
    is_active: true,
    consultation_fee: 120,
    avg_rating: 4.6,
    total_reviews: 96,
    avatar_url: null,
    clinic: { id: 'cl1', name: 'Central Medical Centre' },
    clinics: [{ id: 'cl1', name: 'Central Medical Centre' }],
    services: [
      { id: 'sv3', name: 'Cardiac Assessment' },
      { id: 'sv4', name: 'ECG' },
    ],
    availability_templates: [
      { id: 'at6', day_of_week: 1, is_active: true },
      { id: 'at7', day_of_week: 3, is_active: true },
      { id: 'at8', day_of_week: 5, is_active: true },
    ],
  },
  {
    id: 'c3',
    full_name: 'Dr. Amy Chen',
    specialty: 'Neurologist',
    clinician_type: { id: 'ct3', name: 'Neurologist' },
    qualification: 'MBChB, FRCP (Neurology)',
    email: 'amy.chen@medibook.com',
    phone: '+44 7700 900003',
    is_active: true,
    consultation_fee: 150,
    avg_rating: 4.9,
    total_reviews: 74,
    avatar_url: null,
    clinic: { id: 'cl2', name: 'North Clinic' },
    clinics: [{ id: 'cl2', name: 'North Clinic' }],
    services: [
      { id: 'sv5', name: 'Neurology Consult' },
      { id: 'sv6', name: 'MRI Review' },
    ],
    availability_templates: [
      { id: 'at9', day_of_week: 2, is_active: true },
      { id: 'at10', day_of_week: 4, is_active: true },
    ],
  },
  {
    id: 'c4',
    full_name: 'Dr. Michael Patel',
    specialty: 'Cardiologist',
    clinician_type: { id: 'ct2', name: 'Cardiologist' },
    qualification: 'MD, FACC',
    email: 'michael.patel@medibook.com',
    phone: '+44 7700 900004',
    is_active: true,
    consultation_fee: 130,
    avg_rating: 4.5,
    total_reviews: 51,
    avatar_url: null,
    clinic: { id: 'cl2', name: 'North Clinic' },
    clinics: [{ id: 'cl2', name: 'North Clinic' }],
    services: [{ id: 'sv3', name: 'Cardiac Assessment' }],
    availability_templates: [
      { id: 'at11', day_of_week: 1, is_active: true },
      { id: 'at12', day_of_week: 2, is_active: true },
    ],
  },
  {
    id: 'c5',
    full_name: 'Dr. Sarah Williams',
    specialty: 'Physiotherapist',
    clinician_type: { id: 'ct4', name: 'Physiotherapist' },
    qualification: 'BSc Physiotherapy, MCSP',
    email: 'sarah.williams@medibook.com',
    phone: '+44 7700 900005',
    is_active: true,
    consultation_fee: 70,
    avg_rating: 4.7,
    total_reviews: 62,
    avatar_url: null,
    clinic: { id: 'cl1', name: 'Central Medical Centre' },
    clinics: [{ id: 'cl1', name: 'Central Medical Centre' }],
    services: [
      { id: 'sv7', name: 'Physio Assessment' },
      { id: 'sv8', name: 'Rehabilitation Session' },
    ],
    availability_templates: [
      { id: 'at13', day_of_week: 1, is_active: true },
      { id: 'at14', day_of_week: 2, is_active: true },
      { id: 'at15', day_of_week: 3, is_active: true },
      { id: 'at16', day_of_week: 4, is_active: true },
      { id: 'at17', day_of_week: 5, is_active: true },
      { id: 'at18', day_of_week: 6, is_active: true },
    ],
  },
  {
    id: 'c6',
    full_name: 'Dr. Omar Hassan',
    specialty: 'Radiologist',
    clinician_type: { id: 'ct5', name: 'Radiologist' },
    qualification: 'FRCR',
    email: 'omar.hassan@medibook.com',
    phone: '+44 7700 900006',
    is_active: false,
    consultation_fee: 0,
    avg_rating: 4.3,
    total_reviews: 38,
    avatar_url: null,
    clinic: { id: 'cl3', name: 'East Wing Radiology' },
    clinics: [{ id: 'cl3', name: 'East Wing Radiology' }],
    services: [],
    availability_templates: [],
  },
  {
    id: 'c7',
    full_name: 'Dr. Sarah Mitchell',
    specialty: 'General Practitioner',
    clinician_type: { id: 'ct1', name: 'General Practitioner' },
    qualification: 'MBBS, DFFP',
    email: 'sarah.mitchell@medibook.com',
    phone: '+44 7700 900007',
    is_active: true,
    consultation_fee: 85,
    avg_rating: 4.7,
    total_reviews: 110,
    avatar_url: null,
    clinic: { id: 'cl1', name: 'Central Medical Centre' },
    clinics: [{ id: 'cl1', name: 'Central Medical Centre' }],
    services: [{ id: 'sv1', name: 'General Consultation' }],
    availability_templates: [
      { id: 'at19', day_of_week: 1, is_active: true },
      { id: 'at20', day_of_week: 3, is_active: true },
      { id: 'at21', day_of_week: 5, is_active: true },
    ],
  },
  {
    id: 'c8',
    full_name: 'Dr. Priya Sharma',
    specialty: 'Dermatologist',
    clinician_type: { id: 'ct6', name: 'Dermatologist' },
    qualification: 'MBBS, MRCP (Dermatology)',
    email: 'priya.sharma@medibook.com',
    phone: '+44 7700 900008',
    is_active: true,
    consultation_fee: 110,
    avg_rating: 4.8,
    total_reviews: 89,
    avatar_url: null,
    clinic: { id: 'cl3', name: 'East Wing Radiology' },
    clinics: [{ id: 'cl3', name: 'East Wing Radiology' }],
    services: [
      { id: 'sv9', name: 'Skin Consultation' },
      { id: 'sv10', name: 'Mole Check' },
    ],
    availability_templates: [
      { id: 'at22', day_of_week: 2, is_active: true },
      { id: 'at23', day_of_week: 4, is_active: true },
    ],
  },
]

function CardSkeleton() {
  return (
    <Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 3, height: 280 }}>
      <Stack direction="row" spacing={1.5} mb={2} alignItems="center">
        <Skeleton variant="circular" width={52} height={52} />
        <Box flex={1}>
          <Skeleton width="60%" />
          <Skeleton width="40%" />
        </Box>
      </Stack>
      {[...Array(4)].map((_, i) => (
        <Skeleton key={i} sx={{ mb: 0.75 }} />
      ))}
    </Paper>
  )
}

export default function CliniciansPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const isAdmin = user?.roles?.some((r) => ['admin', 'super_admin', 'manager', 'staff'].includes(r.name))

  // Filters
  const [filterClinic, setFilterClinic] = useState('')
  const [filterActive, setFilterActive] = useState('all')
  const [searchTerm, setSearchTerm] = useState('') // BUG-CLIN-002 fix
  const [filterSpecialty, setFilterSpecialty] = useState('') // BUG-CLIN-003 fix

  const { data, loading, error, refetch } = useQuery(CLINICIANS_QUERY, {
    variables: { first: 50 },
    fetchPolicy: 'cache-and-network',
  })

  const { data: clinicsData } = useQuery(CLINICS_QUERY)

  const apiClinicians = data?.clinicians?.data ?? []
  // REQ013/PLAN023 Phase A fix: fall back to mock only on a real query
  // error, not merely an empty real result -- an org with genuinely zero
  // clinicians (or a filtered view matching none) is a valid real state,
  // not a reason to render 8 fabricated clinicians in its place. Same bug
  // class already found and fixed this session in appointments/index.jsx,
  // calendar/index.jsx, and clinicians/{Create,Edit}ClinicianPage.jsx.
  const allClinicians = error ? MOCK_CLINICIANS : apiClinicians
  const clinics = clinicsData?.clinics ?? []

  // Derive specialty list from data for filter dropdown (BUG-CLIN-003)
  const specialties = useMemo(
    () => [...new Set(allClinicians.map((c) => c.specialty ?? c.clinician_type?.name).filter(Boolean))].sort(),
    [allClinicians],
  )

  // BUG-CLIN-002/004/003 fix: local useMemo filter so mock data responds to all filters
  const clinicians = useMemo(() => {
    let result = allClinicians
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase()
      result = result.filter(
        (c) =>
          (c.full_name ?? `${c.first_name ?? ''} ${c.last_name ?? ''}`).toLowerCase().includes(q) ||
          (c.specialty ?? c.clinician_type?.name ?? '').toLowerCase().includes(q) ||
          (c.email ?? '').toLowerCase().includes(q),
      )
    }
    if (filterSpecialty) {
      result = result.filter((c) => (c.specialty ?? c.clinician_type?.name) === filterSpecialty)
    }
    if (filterActive !== 'all') {
      result = result.filter((c) => (filterActive === 'active' ? c.is_active : !c.is_active))
    }
    if (filterClinic) {
      result = result.filter((c) => c.clinic?.id === filterClinic || c.clinics?.some?.((cl) => cl.id === filterClinic))
    }
    return result
  }, [allClinicians, searchTerm, filterSpecialty, filterActive, filterClinic])

  const handleViewProfile = (clinician) => navigate(`/clinicians/${clinician.id}`)
  const handleAdd = () => navigate('/clinicians/new')

  // SUG-015: "Clear Filters" — true when any filter is non-default
  const isFiltered = searchTerm.trim() !== '' || filterSpecialty !== '' || filterClinic !== '' || filterActive !== 'all'
  const clearFilters = () => {
    setSearchTerm('')
    setFilterSpecialty('')
    setFilterClinic('')
    setFilterActive('all')
  }

  // SUG-014: specialty + clinic option counts for dropdown badges
  const specialtyCount = (sp) => allClinicians.filter((c) => (c.specialty ?? c.clinician_type?.name) === sp).length
  const clinicCount = (clId) => allClinicians.filter((c) => c.clinic?.id === clId || c.clinics?.some?.((cl) => cl.id === clId)).length

  return (
    <Box className="page-enter">
      <Helmet>
        <title>Clinicians — MediBook</title>
      </Helmet>

      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="flex-end" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight={800}>
            Clinicians
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {loading ? 'Loading…' : `${clinicians.length} clinician${clinicians.length !== 1 ? 's' : ''}`}
          </Typography>
        </Box>
        {isAdmin && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleAdd} sx={{ borderRadius: 2 }}>
            Add Clinician
          </Button>
        )}
      </Box>

      {error && (
        <Alert
          severity="error"
          sx={{ mb: 2, borderRadius: 2 }}
          action={
            <Button size="small" onClick={() => refetch()}>
              Retry
            </Button>
          }
        >
          Backend unavailable — {error.message}
        </Alert>
      )}

      {/* Filter bar — BUG-CLIN-002/003/004 fixed */}
      <Paper
        elevation={0}
        sx={{ p: 2, mb: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3, background: 'rgba(0,0,0,0.01)' }}
      >
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center" flexWrap="wrap">
          {/* Search — BUG-CLIN-002 fix */}
          <TextField
            size="small"
            label="Search clinicians"
            value={searchTerm}
            sx={{ minWidth: 220, flex: 1 }}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRoundedIcon sx={{ fontSize: '1rem', color: 'text.disabled' }} />
                </InputAdornment>
              ),
            }}
          />

          {/* Specialty filter — BUG-CLIN-003 fix + SUG-014: count badge */}
          <TextField
            select
            size="small"
            label="Specialization"
            value={filterSpecialty}
            sx={{ minWidth: 200 }}
            onChange={(e) => setFilterSpecialty(e.target.value)}
          >
            <MenuItem value="">All Specializations</MenuItem>
            {specialties.map((s) => (
              <MenuItem key={s} value={s}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', gap: 1 }}>
                  <span>{s}</span>
                  <Chip
                    label={specialtyCount(s)}
                    size="small"
                    sx={{ height: 18, fontSize: '0.65rem', bgcolor: (t) => alpha(t.palette.primary.main, t.palette.mode === 'dark' ? 0.22 : 0.12), color: 'primary.main', fontWeight: 700 }}
                  />
                </Box>
              </MenuItem>
            ))}
          </TextField>

          {/* Clinic filter — SUG-014: count badge */}
          <TextField
            select
            size="small"
            label="Clinic"
            value={filterClinic}
            sx={{ minWidth: 180 }}
            onChange={(e) => setFilterClinic(e.target.value)}
          >
            <MenuItem value="">All Clinics</MenuItem>
            {(clinics.length > 0
              ? clinics.filter((c) => c.is_active)
              : [
                  { id: 'cl1', name: 'Central Medical Centre' },
                  { id: 'cl2', name: 'North Clinic' },
                  { id: 'cl3', name: 'East Wing Radiology' },
                ]
            ).map((c) => (
              <MenuItem key={c.id} value={c.id}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', gap: 1 }}>
                  <span>{c.name}</span>
                  <Chip
                    label={clinicCount(c.id)}
                    size="small"
                    sx={{ height: 18, fontSize: '0.65rem', bgcolor: (t) => alpha(t.palette.primary.main, t.palette.mode === 'dark' ? 0.22 : 0.12), color: 'primary.main', fontWeight: 700 }}
                  />
                </Box>
              </MenuItem>
            ))}
          </TextField>

          {/* Active toggle */}
          <ToggleButtonGroup
            size="small"
            exclusive
            value={filterActive}
            onChange={(_, v) => {
              if (v) setFilterActive(v)
            }}
          >
            <ToggleButton value="all">All</ToggleButton>
            <ToggleButton value="active">Active</ToggleButton>
            <ToggleButton value="inactive">Inactive</ToggleButton>
          </ToggleButtonGroup>

          {/* SUG-015: Clear All Filters — only shown when a filter is active */}
          {isFiltered && (
            <Tooltip title="Clear all filters">
              <Button
                size="small"
                variant="outlined"
                onClick={clearFilters}
                startIcon={<FilterListOffIcon fontSize="small" />}
                sx={{
                  color: 'error.main',
                  borderColor: 'error.main',
                  borderRadius: 2,
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  '&:hover': { bgcolor: (t) => alpha(t.palette.error.main, 0.12), borderColor: 'error.dark' },
                }}
              >
                Clear Filters
              </Button>
            </Tooltip>
          )}
        </Stack>
      </Paper>

      {/* Grid */}
      <Grid container spacing={2.5}>
        {loading
          ? [...Array(8)].map((_, i) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={i}>
                <CardSkeleton />
              </Grid>
            ))
          : clinicians.map((c) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={c.id}>
                {/* SUG-013: dim inactive cards */}
                <Box sx={c.is_active ? {} : { opacity: 0.7, filter: 'grayscale(30%)', transition: 'opacity 0.2s' }}>
                  <ClinicianCard clinician={c} isAdmin={isAdmin} onViewProfile={handleViewProfile} />
                </Box>
              </Grid>
            ))}
        {!loading && clinicians.length === 0 && (
          <Grid item xs={12}>
            <Box textAlign="center" py={8}>
              <Typography variant="h6" color="text.secondary">
                No clinicians found
              </Typography>
              <Typography variant="body2" color="text.disabled">
                Try adjusting your filters
              </Typography>
            </Box>
          </Grid>
        )}
      </Grid>

      {/* Profile drawer — kept for quick-peek, Edit Clinician goes to full page */}
      <ClinicianProfileDrawer open={false} clinician={null} onClose={() => {}} />
    </Box>
  )
}
