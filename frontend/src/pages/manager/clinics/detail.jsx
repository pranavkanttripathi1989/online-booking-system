import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@apollo/client'
import { Helmet } from 'react-helmet-async'
import { Box, Button, Chip, Divider, Grid, IconButton, Paper, Skeleton, Stack, Typography } from '@mui/material'
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded'
import EditRoundedIcon from '@mui/icons-material/EditRounded'
import ApartmentRoundedIcon from '@mui/icons-material/ApartmentRounded'
import PhoneRoundedIcon from '@mui/icons-material/PhoneRounded'
import EmailRoundedIcon from '@mui/icons-material/EmailRounded'
import LocationOnRoundedIcon from '@mui/icons-material/LocationOnRounded'
import ScheduleRoundedIcon from '@mui/icons-material/ScheduleRounded'
import { CLINIC_DETAIL_QUERY, ROOMS_QUERY } from '../../../graphql/queries'
import ErrorBoundary from '../../../components/ErrorBoundary'

// SUG-CLI-005 — mock clinic detail records for offline mode (mirrors edit.jsx MOCK_CLINIC_BY_ID)
const MOCK_CLINIC_BY_ID = {
  1: {
    id: '1',
    name: 'City Heart Clinic',
    address: '14 Harley Street',
    city: 'London',
    postcode: 'W1G 9PJ',
    phone: '+44 20 7946 0001',
    email: 'info@cityheartclinic.co.uk',
    timezone: 'Europe/London',
    is_active: true,
  },
  2: {
    id: '2',
    name: 'Central Medical Centre',
    address: '22 Brook Street',
    city: 'London',
    postcode: 'W1K 5DF',
    phone: '+44 20 7946 0022',
    email: 'admin@centralmedical.co.uk',
    timezone: 'Europe/London',
    is_active: true,
  },
  3: {
    id: '3',
    name: 'Family Health Hub',
    address: '8 Baker Street',
    city: 'London',
    postcode: 'NW1 6XE',
    phone: '+44 20 7946 0033',
    email: 'hello@familyhealthhub.co.uk',
    timezone: 'Europe/London',
    is_active: true,
  },
  4: {
    id: '4',
    name: 'Westside Physio & Sports',
    address: "5 King's Road",
    city: 'London',
    postcode: 'SW3 4ND',
    phone: '+44 20 7946 0044',
    email: 'info@westsidephysio.co.uk',
    timezone: 'Europe/London',
    is_active: false,
  },
}

function ClinicDetailPageInner() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data, loading } = useQuery(CLINIC_DETAIL_QUERY, { variables: { id } })
  const { data: roomsData } = useQuery(ROOMS_QUERY, { variables: { clinic_id: id } })
  // SUG-CLI-005 — fall back to mock data when backend is offline/unreachable
  const clinic = data?.clinic ?? MOCK_CLINIC_BY_ID[id]
  const rooms = (roomsData?.rooms ?? []).filter((r) => r.clinic?.id === id)

  if (loading)
    return (
      <Box>
        <Skeleton variant="rectangular" height={56} sx={{ borderRadius: 2, mb: 3 }} />
        <Grid container spacing={3}>
          {[...Array(3)].map((_, i) => (
            <Grid item xs={12} md={4} key={i}>
              <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 3 }} />
            </Grid>
          ))}
        </Grid>
      </Box>
    )

  // SUG-CLI-004 (older file) / SUG-CLI-011 — 404 guard for an unknown clinic ID
  if (!loading && !clinic)
    return (
      <Box sx={{ textAlign: 'center', py: 6 }}>
        <Typography variant="h5" fontWeight={700} mb={1}>
          Clinic not found
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={2}>
          We couldn't find a clinic with that ID.
        </Typography>
        <Button
          variant="contained"
          onClick={() => navigate('/manager/clinics')}
          sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 700 }}
        >
          Back to Clinics
        </Button>
      </Box>
    )

  const InfoRow = ({ icon: Icon, label, value }) =>
    value ? (
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: 1.5 }}>
        <Icon sx={{ color: 'text.secondary', fontSize: '1.1rem', mt: 0.3 }} />
        <Box>
          <Typography variant="caption" color="text.secondary">
            {label}
          </Typography>
          <Typography fontWeight={600}>{value}</Typography>
        </Box>
      </Box>
    ) : null

  return (
    <Box className="page-enter">
      <Helmet>
        <title>{clinic?.name ?? 'Clinic'} — MediBook</title>
      </Helmet>

      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3, flexWrap: 'wrap' }}>
        <IconButton onClick={() => navigate('/manager/clinics')} sx={{ bgcolor: 'action.hover', '&:hover': { bgcolor: 'action.selected' } }}>
          <ArrowBackRoundedIcon />
        </IconButton>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1 }}>
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: 3,
              background: (t) => `linear-gradient(135deg, ${t.palette.primary.main}, ${t.palette.primary.dark})`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ApartmentRoundedIcon sx={{ color: 'common.white', fontSize: '1.4rem' }} />
          </Box>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="h5" fontWeight={800}>
                {clinic?.name}
              </Typography>
              <Chip
                size="small"
                label={clinic?.is_active ? 'Active' : 'Inactive'}
                color={clinic?.is_active ? 'success' : 'default'}
                sx={{ fontWeight: 700 }}
              />
            </Box>
            <Typography variant="body2" color="text.secondary">
              {clinic?.city}
            </Typography>
          </Box>
        </Box>
        <Button
          variant="contained"
          startIcon={<EditRoundedIcon />}
          onClick={() => navigate(`/manager/clinics/${id}/edit`)}
          sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 700, background: (t) => `linear-gradient(135deg,${t.palette.primary.light},${t.palette.primary.main})` }}
        >
          Edit Clinic
        </Button>
      </Box>

      <Grid container spacing={3}>
        {/* Clinic Info */}
        <Grid item xs={12} md={4}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #E8EAED', height: '100%' }}>
            <Typography variant="subtitle1" fontWeight={700} mb={2.5}>
              Contact & Location
            </Typography>
            <InfoRow
              icon={LocationOnRoundedIcon}
              label="Address"
              value={[clinic?.address, clinic?.city, clinic?.postcode].filter(Boolean).join(', ')}
            />
            <InfoRow icon={PhoneRoundedIcon} label="Phone" value={clinic?.phone} />
            <InfoRow icon={EmailRoundedIcon} label="Email" value={clinic?.email} />
            <InfoRow icon={ScheduleRoundedIcon} label="Timezone" value={clinic?.timezone} />
          </Paper>
        </Grid>

        {/* Rooms */}
        <Grid item xs={12} md={8}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #E8EAED' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="subtitle1" fontWeight={700}>
                Rooms ({rooms.length})
              </Typography>
              <Button
                size="small"
                variant="outlined"
                onClick={() => navigate('/manager/rooms/new')}
                sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}
              >
                + Add Room
              </Button>
            </Box>
            <Divider sx={{ mb: 2 }} />
            {rooms.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="body2" color="text.secondary">
                  No rooms yet
                </Typography>
              </Box>
            ) : (
              <Stack spacing={1.5}>
                {rooms.map((r) => (
                  <Box
                    key={r.id}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      p: 1.5,
                      borderRadius: 2,
                      border: '1px solid',
                      borderColor: 'divider',
                      '&:hover': { bgcolor: 'action.hover' },
                    }}
                  >
                    <Box>
                      <Typography fontWeight={700}>{r.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Capacity: {r.capacity ?? 'N/A'}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip size="small" label={r.is_active ? 'Active' : 'Inactive'} color={r.is_active ? 'success' : 'default'} />
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => navigate(`/manager/rooms/${r.id}/edit`)}
                        sx={{ borderRadius: 2, textTransform: 'none' }}
                      >
                        Edit
                      </Button>
                    </Box>
                  </Box>
                ))}
              </Stack>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  )
}

// SUG-CLI-012 — ErrorBoundary wrapper, consistent with Availability/Blocks/Billing modules
export default function ClinicDetailPage() {
  return (
    <ErrorBoundary>
      <ClinicDetailPageInner />
    </ErrorBoundary>
  )
}
