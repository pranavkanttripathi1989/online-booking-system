import { useState } from 'react'
import { useQuery } from '@apollo/client'
import { useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import {
  Alert,
  Box,
  Button,
  Grid,
  MenuItem,
  Paper,
  Skeleton,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'

import { CLINICIANS_QUERY, CLINICS_QUERY } from '../../graphql/queries'
import { useAuth } from '../../context/AuthContext'
import ClinicianCard from '../../components/Clinicians/ClinicianCard'
import ClinicianProfileDrawer from '../../components/Clinicians/ClinicianProfileDrawer'
import ClinicianFormDrawer from '../../components/Clinicians/ClinicianFormDrawer'

// ─── Mock Clinicians (fallback when backend is offline) ─────────────────────
const MOCK_CLINICIANS = [
  {
    id: 'c1', full_name: 'Dr. Jane Smith', title: 'Dr.', specialty: 'General Practitioner',
    qualification: 'MBBS, MRCGP', email: 'jane.smith@medibook.com', phone: '+44 7700 900001',
    is_active: true,
    clinic: { id: 'cl1', name: 'Central Medical Centre' },
    availability_heatmap: [3, 5, 4, 5, 4, 2, 0],
    reviews_avg: 4.8, reviews_count: 128,
    appointments_this_week: 34,
  },
  {
    id: 'c2', full_name: 'Dr. Carlos Vega', title: 'Dr.', specialty: 'Cardiologist',
    qualification: 'MD, FRCP', email: 'carlos.vega@medibook.com', phone: '+44 7700 900002',
    is_active: true,
    clinic: { id: 'cl1', name: 'Central Medical Centre' },
    availability_heatmap: [2, 4, 3, 4, 3, 1, 0],
    reviews_avg: 4.6, reviews_count: 96,
    appointments_this_week: 28,
  },
  {
    id: 'c3', full_name: 'Dr. Amy Chen', title: 'Dr.', specialty: 'Neurologist',
    qualification: 'MBChB, FRCP (Neurology)', email: 'amy.chen@medibook.com', phone: '+44 7700 900003',
    is_active: true,
    clinic: { id: 'cl2', name: 'North Clinic' },
    availability_heatmap: [1, 3, 4, 3, 4, 2, 0],
    reviews_avg: 4.9, reviews_count: 74,
    appointments_this_week: 22,
  },
  {
    id: 'c4', full_name: 'Dr. Michael Patel', title: 'Dr.', specialty: 'Cardiologist',
    qualification: 'MD, FACC', email: 'michael.patel@medibook.com', phone: '+44 7700 900004',
    is_active: true,
    clinic: { id: 'cl2', name: 'North Clinic' },
    availability_heatmap: [2, 2, 3, 2, 3, 0, 0],
    reviews_avg: 4.5, reviews_count: 51,
    appointments_this_week: 18,
  },
  {
    id: 'c5', full_name: 'Dr. Sarah Williams', title: 'Dr.', specialty: 'Physiotherapist',
    qualification: 'BSc Physiotherapy, MCSP', email: 'sarah.williams@medibook.com', phone: '+44 7700 900005',
    is_active: true,
    clinic: { id: 'cl1', name: 'Central Medical Centre' },
    availability_heatmap: [4, 5, 5, 4, 5, 3, 0],
    reviews_avg: 4.7, reviews_count: 62,
    appointments_this_week: 41,
  },
  {
    id: 'c6', full_name: 'Dr. Omar Hassan', title: 'Dr.', specialty: 'Radiologist',
    qualification: 'FRCR', email: 'omar.hassan@medibook.com', phone: '+44 7700 900006',
    is_active: false,
    clinic: { id: 'cl3', name: 'East Wing Radiology' },
    availability_heatmap: [0, 0, 0, 0, 0, 0, 0],
    reviews_avg: 4.3, reviews_count: 38,
    appointments_this_week: 0,
  },
]


function CardSkeleton() {
  return (
    <Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 3, height: 280 }}>
      <Stack direction="row" spacing={1.5} mb={2} alignItems="center">
        <Skeleton variant="circular" width={52} height={52} />
        <Box flex={1}><Skeleton width="60%" /><Skeleton width="40%" /></Box>
      </Stack>
      {[...Array(4)].map((_,i) => <Skeleton key={i} sx={{ mb: 0.75 }} />)}
    </Paper>
  )
}

export default function CliniciansPage() {
  const { user } = useAuth()
  const navigate  = useNavigate()
  const isAdmin = user?.roles?.some((r) => ['admin','super_admin','receptionist'].includes(r.name))

  // Filters
  const [filterClinic, setFilterClinic] = useState('')
  const [filterActive, setFilterActive] = useState('all')

  // Build query variables
  const queryVars = {
    first: 50,
    ...(filterClinic ? { clinic_id: filterClinic } : {}),
    ...(filterActive !== 'all' ? { is_active: filterActive === 'active' } : {}),
  }

  const { data, loading, error, refetch } = useQuery(CLINICIANS_QUERY, {
    variables: queryVars,
    fetchPolicy: 'cache-and-network',
  })

  const { data: clinicsData } = useQuery(CLINICS_QUERY)

  const apiClinicians = data?.clinicians?.data ?? []
  // Fall back to 6 rich mock clinicians when backend is offline
  const clinicians = apiClinicians.length > 0 ? apiClinicians : MOCK_CLINICIANS
  const clinics = clinicsData?.clinics ?? []

  const handleViewProfile = (clinician) => navigate(`/clinicians/${clinician.id}`)
  const handleAdd         = () => navigate('/clinicians/new')

  return (
    <Box className="page-enter">
      <Helmet><title>Clinicians — MediBook</title></Helmet>

      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="flex-end" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight={800}>Clinicians</Typography>
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
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}
          action={<Button size="small" onClick={() => refetch()}>Retry</Button>}>
          Backend unavailable — {error.message}
        </Alert>
      )}

      {/* Filter bar */}
      <Paper elevation={0} sx={{ p: 2, mb: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3, background: 'rgba(0,0,0,0.01)' }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
          {/* Clinic filter */}
          <TextField
            select size="small" label="Clinic" value={filterClinic} sx={{ minWidth: 180 }}
            onChange={(e) => setFilterClinic(e.target.value)}
          >
            <MenuItem value="">All Clinics</MenuItem>
            {clinics.filter((c) => c.is_active).map((c) => (
              <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
            ))}
          </TextField>

          {/* Active toggle */}
          <ToggleButtonGroup
            size="small"
            exclusive
            value={filterActive}
            onChange={(_, v) => { if (v) setFilterActive(v) }}
          >
            <ToggleButton value="all">All</ToggleButton>
            <ToggleButton value="active">Active</ToggleButton>
            <ToggleButton value="inactive">Inactive</ToggleButton>
          </ToggleButtonGroup>
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
                <ClinicianCard
                  clinician={c}
                  isAdmin={isAdmin}
                  onViewProfile={handleViewProfile}
                />
              </Grid>
            ))}
        {!loading && clinicians.length === 0 && (
          <Grid item xs={12}>
            <Box textAlign="center" py={8}>
              <Typography variant="h6" color="text.secondary">No clinicians found</Typography>
              <Typography variant="body2" color="text.disabled">Try adjusting your filters</Typography>
            </Box>
          </Grid>
        )}
      </Grid>

      {/* Profile drawer — kept for quick-peek, Edit Clinician goes to full page */}
      <ClinicianProfileDrawer
        open={false}
        clinician={null}
        onClose={() => {}}
      />
    </Box>
  )
}
