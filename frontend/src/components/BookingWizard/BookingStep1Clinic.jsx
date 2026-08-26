import { useQuery } from '@apollo/client'
import { Alert, Box, Button, Card, CardContent, Grid, Skeleton, Stack, Typography } from '@mui/material'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import LocationOnIcon from '@mui/icons-material/LocationOn'
import PhoneIcon from '@mui/icons-material/Phone'
import RefreshIcon from '@mui/icons-material/Refresh'

import { CLINICS_QUERY } from '../../graphql/queries'

// ─── Mock Clinics (fallback when backend is offline) ────────────────────────
const MOCK_CLINICS = [
  {
    id: 'cl1',
    name: 'Central Medical Centre',
    address: '12 Harley Street',
    city: 'London',
    postcode: 'W1G 9PQ',
    phone: '+44 20 7946 0001',
    is_active: true,
  },
  {
    id: 'cl2',
    name: 'North Clinic',
    address: '45 Victoria Road',
    city: 'Manchester',
    postcode: 'M2 4BQ',
    phone: '+44 161 946 0002',
    is_active: true,
  },
  {
    id: 'cl3',
    name: 'East Wing Radiology',
    address: '8 Brunswick Square',
    city: 'Bristol',
    postcode: 'BS2 8PE',
    phone: '+44 117 946 0003',
    is_active: true,
  },
]

function ClinicCardSkeleton() {
  return (
    <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
      <CardContent>
        <Skeleton width="60%" height={24} />
        <Skeleton width="80%" />
        <Skeleton width="40%" />
      </CardContent>
    </Card>
  )
}

export default function BookingStep1Clinic({ wizardData, updateWizard }) {
  const { data, loading, error, refetch } = useQuery(CLINICS_QUERY)

  const apiClinics = (data?.clinics ?? []).filter((c) => c.is_active)
  // Fall back to mock clinics when backend is offline
  const clinics = apiClinics.length > 0 ? apiClinics : MOCK_CLINICS
  const selected = wizardData.clinic

  const handleSelect = (clinic) => {
    // Reset downstream selections if clinic changes
    if (selected?.id !== clinic.id) {
      updateWizard({
        clinic,
        clinician: null,
        service: null,
        slot: null,
      })
    }
  }

  return (
    <Box>
      <Typography variant="h6" fontWeight={700} mb={0.5}>
        Select a Clinic
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Choose the clinic where the appointment will take place.
      </Typography>

      {error && (
        <Alert
          severity="error"
          action={
            <Button size="small" startIcon={<RefreshIcon />} onClick={() => refetch()}>
              Retry
            </Button>
          }
          sx={{ mb: 2, borderRadius: 2 }}
        >
          Could not load clinics — {error.message}
        </Alert>
      )}

      <Grid container spacing={2}>
        {loading
          ? [...Array(3)].map((_, i) => (
              <Grid item xs={12} sm={6} md={4} key={i}>
                <ClinicCardSkeleton />
              </Grid>
            ))
          : clinics.map((clinic) => {
              const isSelected = selected?.id === clinic.id
              return (
                <Grid item xs={12} sm={6} md={4} key={clinic.id}>
                  <Card
                    elevation={0}
                    onClick={() => handleSelect(clinic)}
                    sx={{
                      border: '2px solid',
                      borderColor: isSelected ? 'primary.main' : 'divider',
                      borderRadius: 3,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      position: 'relative',
                      background: isSelected
                        ? 'linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(139,92,246,0.05) 100%)'
                        : 'transparent',
                      '&:hover': {
                        borderColor: 'primary.light',
                        transform: 'translateY(-2px)',
                        boxShadow: '0 8px 24px rgba(99,102,241,0.15)',
                      },
                    }}
                  >
                    {isSelected && <CheckCircleIcon color="primary" sx={{ position: 'absolute', top: 12, right: 12, fontSize: 20 }} />}
                    <CardContent>
                      <Typography variant="subtitle1" fontWeight={700} mb={1.5} pr={3}>
                        {clinic.name}
                      </Typography>
                      <Stack spacing={0.75}>
                        <Stack direction="row" spacing={1} alignItems="flex-start">
                          <LocationOnIcon fontSize="small" sx={{ color: 'text.secondary', mt: 0.2 }} />
                          <Typography variant="body2" color="text.secondary">
                            {[clinic.address, clinic.city, clinic.postcode].filter(Boolean).join(', ')}
                          </Typography>
                        </Stack>
                        {clinic.phone && (
                          <Stack direction="row" spacing={1} alignItems="center">
                            <PhoneIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                            <Typography variant="body2" color="text.secondary">
                              {clinic.phone}
                            </Typography>
                          </Stack>
                        )}
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              )
            })}
      </Grid>

      {!loading && clinics.length === 0 && (
        <Box textAlign="center" py={6}>
          <Typography color="text.secondary">No active clinics found.</Typography>
        </Box>
      )}
    </Box>
  )
}
