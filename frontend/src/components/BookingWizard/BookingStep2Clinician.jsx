import { useState } from 'react'
import { useQuery } from '@apollo/client'
import {
  Avatar,
  Box,
  Card,
  CardContent,
  Chip,
  Grid,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import TranslateIcon from '@mui/icons-material/Translate'
import AttachMoneyIcon from '@mui/icons-material/AttachMoney'

import { CLINICIANS_QUERY, SERVICES_QUERY } from '../../graphql/queries'

// ─── Mock Clinicians (fallback when backend is offline) ─────────────────────
const MOCK_CLINICIANS = [
  { id: 'c1', full_name: 'Dr. Jane Smith',    clinician_type: { name: 'General Practitioner' }, consultation_fee: '85.00',  languages: ['English', 'French'] },
  { id: 'c2', full_name: 'Dr. Carlos Vega',   clinician_type: { name: 'Cardiologist' },          consultation_fee: '150.00', languages: ['English', 'Spanish'] },
  { id: 'c3', full_name: 'Dr. Amy Chen',      clinician_type: { name: 'Neurologist' },            consultation_fee: '175.00', languages: ['English', 'Mandarin'] },
  { id: 'c4', full_name: 'Dr. Michael Patel', clinician_type: { name: 'Cardiologist' },           consultation_fee: '160.00', languages: ['English', 'Hindi'] },
  { id: 'c5', full_name: 'Dr. Sarah Williams',clinician_type: { name: 'Physiotherapist' },        consultation_fee: '70.00',  languages: ['English'] },
]

// ─── Mock Services (fallback when backend is offline) ──────────────────────
const MOCK_SERVICES = [
  { id: 's1',  name: 'General Consultation', category: { name: 'Consultation' },  duration_minutes: 30, price: '85.00',  clinicians: [{ id: 'c1' }, { id: 'c2' }, { id: 'c3' }, { id: 'c4' }] },
  { id: 's2',  name: 'Follow-up Visit',      category: { name: 'Consultation' },  duration_minutes: 20, price: '60.00',  clinicians: [{ id: 'c1' }, { id: 'c2' }, { id: 'c3' }, { id: 'c4' }, { id: 'c5' }] },
  { id: 's3',  name: 'Blood Test',           category: { name: 'Examination' },   duration_minutes: 20, price: '45.00',  clinicians: [{ id: 'c1' }, { id: 'c2' }] },
  { id: 's4',  name: 'MRI Scan',             category: { name: 'Examination' },   duration_minutes: 60, price: '380.00', clinicians: [{ id: 'c3' }] },
  { id: 's5',  name: 'Ultrasound',           category: { name: 'Examination' },   duration_minutes: 30, price: '120.00', clinicians: [{ id: 'c4' }] },
  { id: 's6',  name: 'X-Ray',               category: { name: 'Examination' },   duration_minutes: 20, price: '95.00',  clinicians: [{ id: 'c1' }, { id: 'c4' }] },
  { id: 's7',  name: 'Routine Checkup',      category: { name: 'Routine Care' },  duration_minutes: 30, price: '75.00',  clinicians: [{ id: 'c1' }, { id: 'c2' }, { id: 'c5' }] },
  { id: 's8',  name: 'Annual Physical',      category: { name: 'Routine Care' },  duration_minutes: 45, price: '110.00', clinicians: [{ id: 'c1' }, { id: 'c2' }] },
  { id: 's9',  name: 'Physiotherapy',        category: { name: 'Rehabilitation' },duration_minutes: 60, price: '90.00',  clinicians: [{ id: 'c5' }] },
  { id: 's10', name: 'EEG',                  category: { name: 'Neurology' },     duration_minutes: 45, price: '200.00', clinicians: [{ id: 'c3' }] },
  { id: 's11', name: 'Cardiology Review',    category: { name: 'Cardiology' },    duration_minutes: 40, price: '145.00', clinicians: [{ id: 'c2' }, { id: 'c4' }] },
  { id: 's12', name: 'Vaccination',          category: { name: 'Preventive' },    duration_minutes: 15, price: '35.00',  clinicians: [{ id: 'c1' }, { id: 'c5' }] },
]

function ClinicianCard({ clinician, selected, onSelect }) {
  return (
    <Card
      elevation={0}
      onClick={() => onSelect(clinician)}
      sx={{
        border: '2px solid',
        borderColor: selected ? 'primary.main' : 'divider',
        borderRadius: 3,
        cursor: 'pointer',
        position: 'relative',
        transition: 'all 0.2s ease',
        background: selected
          ? 'linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(139,92,246,0.05) 100%)'
          : 'transparent',
        '&:hover': {
          borderColor: 'primary.light',
          transform: 'translateY(-2px)',
          boxShadow: '0 8px 24px rgba(99,102,241,0.15)',
        },
      }}
    >
      {selected && (
        <CheckCircleIcon
          color="primary"
          sx={{ position: 'absolute', top: 12, right: 12, fontSize: 20 }}
        />
      )}
      <CardContent>
        <Stack direction="row" spacing={1.5} alignItems="center" mb={1}>
          <Avatar src={clinician.avatar_url} sx={{ width: 44, height: 44 }}>
            {clinician.full_name?.[0]}
          </Avatar>
          <Box>
            <Typography variant="subtitle2" fontWeight={700}>{clinician.full_name}</Typography>
            {clinician.clinician_type && (
              <Chip
                label={clinician.clinician_type.name}
                size="small"
                variant="outlined"
                color="primary"
                sx={{ height: 18, fontSize: 11 }}
              />
            )}
          </Box>
        </Stack>
        <Stack spacing={0.5}>
          {clinician.consultation_fee && (
            <Stack direction="row" spacing={0.5} alignItems="center">
              <AttachMoneyIcon fontSize="small" sx={{ color: 'text.secondary', fontSize: 14 }} />
              <Typography variant="caption" color="text.secondary">
                ₹{Number(clinician.consultation_fee).toFixed(2)} consultation fee
              </Typography>
            </Stack>
          )}
          {clinician.languages?.length > 0 && (
            <Stack direction="row" spacing={0.5} alignItems="center">
              <TranslateIcon fontSize="small" sx={{ color: 'text.secondary', fontSize: 14 }} />
              <Typography variant="caption" color="text.secondary">
                {clinician.languages.join(', ')}
              </Typography>
            </Stack>
          )}
        </Stack>
      </CardContent>
    </Card>
  )
}

function ServiceCard({ service, selected, onSelect }) {
  return (
    <Card
      elevation={0}
      onClick={() => onSelect(service)}
      sx={{
        border: '2px solid',
        borderColor: selected ? 'secondary.main' : 'divider',
        borderRadius: 3,
        cursor: 'pointer',
        position: 'relative',
        transition: 'all 0.2s ease',
        background: selected
          ? 'linear-gradient(135deg, rgba(139,92,246,0.08) 0%, rgba(99,102,241,0.04) 100%)'
          : 'transparent',
        '&:hover': {
          borderColor: 'secondary.light',
          transform: 'translateY(-2px)',
          boxShadow: '0 8px 24px rgba(139,92,246,0.15)',
        },
      }}
    >
      {selected && (
        <CheckCircleIcon
          color="secondary"
          sx={{ position: 'absolute', top: 12, right: 12, fontSize: 20 }}
        />
      )}
      <CardContent sx={{ pb: '12px !important' }}>
        <Typography variant="subtitle2" fontWeight={700} pr={3}>{service.name}</Typography>
        {service.category && (
          <Chip label={service.category.name} size="small" sx={{ mt: 0.5, mb: 1, height: 18, fontSize: 11 }} />
        )}
        <Stack direction="row" spacing={1} flexWrap="wrap">
          <Typography variant="caption" color="text.secondary">
            ⏱ {service.duration_minutes} min
          </Typography>
          {service.price && (
            <Typography variant="caption" color="text.secondary">
              ₹{Number(service.price).toFixed(2)}
            </Typography>
          )}
        </Stack>
      </CardContent>
    </Card>
  )
}

export default function BookingStep2Clinician({ wizardData, updateWizard }) {
  const clinicId = wizardData.clinic?.id

  const { data: cliniciansData, loading: loadingClinicians } = useQuery(CLINICIANS_QUERY, {
    variables: { clinic_id: clinicId, is_active: true, first: 50 },
    skip: !clinicId,
  })

  const selectedClinician = wizardData.clinician
  const selectedService = wizardData.service

  // Load services when a clinician is selected
  const { data: servicesData, loading: loadingServices } = useQuery(SERVICES_QUERY, {
    variables: { is_active: true },
    skip: !selectedClinician,
  })

  const apiClinicians = cliniciansData?.clinicians?.data ?? []
  // Fall back to mock when backend is offline
  const clinicians = apiClinicians.length > 0 ? apiClinicians : MOCK_CLINICIANS

  // Filter services to those the selected clinician offers
  const apiServices = servicesData?.services ?? []
  const allServices = apiServices.length > 0 ? apiServices : MOCK_SERVICES
  const services = selectedClinician
    ? allServices.filter((svc) =>
        svc.clinicians?.some((c) => c.id === selectedClinician.id)
      )
    : []

  const handleClinicianSelect = (clinician) => {
    if (selectedClinician?.id !== clinician.id) {
      updateWizard({ clinician, service: null, slot: null })
    }
  }

  const handleServiceSelect = (service) => {
    updateWizard({ service, slot: null })
  }

  return (
    <Box>
      <Typography variant="h6" fontWeight={700} mb={0.5}>Clinician & Service</Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Choose a clinician, then select the service you need.
      </Typography>

      {/* Clinicians */}
      <Typography variant="subtitle2" fontWeight={700} color="text.secondary" mb={1.5}>
        Available Clinicians
      </Typography>
      <Grid container spacing={2} mb={3}>
        {loadingClinicians
          ? [...Array(3)].map((_, i) => (
              <Grid item xs={12} sm={6} md={4} key={i}>
                <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
                  <CardContent>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Skeleton variant="circular" width={44} height={44} />
                      <Box flex={1}><Skeleton width="60%" /><Skeleton width="40%" /></Box>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            ))
          : clinicians.map((c) => (
              <Grid item xs={12} sm={6} md={4} key={c.id}>
                <ClinicianCard
                  clinician={c}
                  selected={selectedClinician?.id === c.id}
                  onSelect={handleClinicianSelect}
                />
              </Grid>
            ))}
        {!loadingClinicians && clinicians.length === 0 && (
          <Grid item xs={12}>
            <Typography color="text.secondary" textAlign="center" py={2}>
              No clinicians available for this clinic.
            </Typography>
          </Grid>
        )}
      </Grid>

      {/* Services */}
      {selectedClinician && (
        <>
          <Typography variant="subtitle2" fontWeight={700} color="text.secondary" mb={1.5}>
            Services offered by {selectedClinician.full_name}
          </Typography>
          <Grid container spacing={2}>
            {loadingServices
              ? [...Array(3)].map((_, i) => (
                  <Grid item xs={12} sm={6} md={4} key={i}>
                    <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
                      <CardContent><Skeleton /><Skeleton width="60%" /></CardContent>
                    </Card>
                  </Grid>
                ))
              : services.map((s) => (
                  <Grid item xs={12} sm={6} md={4} key={s.id}>
                    <ServiceCard
                      service={s}
                      selected={selectedService?.id === s.id}
                      onSelect={handleServiceSelect}
                    />
                  </Grid>
                ))}
            {!loadingServices && services.length === 0 && (
              <Grid item xs={12}>
                <Typography color="text.secondary" textAlign="center" py={2}>
                  No services found for this clinician.
                </Typography>
              </Grid>
            )}
          </Grid>
        </>
      )}
    </Box>
  )
}
