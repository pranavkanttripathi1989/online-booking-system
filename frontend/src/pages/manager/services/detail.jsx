import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@apollo/client'
import { Helmet } from 'react-helmet-async'
import {
  Box, Button, Chip, Divider, Grid, IconButton,
  Paper, Skeleton, Stack, Typography,
} from '@mui/material'
import ArrowBackRoundedIcon    from '@mui/icons-material/ArrowBackRounded'
import EditRoundedIcon         from '@mui/icons-material/EditRounded'
import MedicalServicesRoundedIcon from '@mui/icons-material/MedicalServicesRounded'
import TimerRoundedIcon        from '@mui/icons-material/TimerRounded'
import AttachMoneyRoundedIcon  from '@mui/icons-material/AttachMoneyRounded'
import CheckCircleRoundedIcon  from '@mui/icons-material/CheckCircleRounded'
import CancelRoundedIcon       from '@mui/icons-material/CancelRounded'
import { SERVICE_DETAIL_QUERY } from '../../../graphql/queries'

export default function ServiceDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const { data, loading } = useQuery(SERVICE_DETAIL_QUERY, {
    variables: { id },
    fetchPolicy: 'cache-and-network',
  })

  const service = data?.service

  if (loading && !service) return (
    <Box>
      <Skeleton variant="rectangular" height={56} sx={{ borderRadius: 2, mb: 3 }} />
      <Skeleton variant="rectangular" height={320} sx={{ borderRadius: 3 }} />
    </Box>
  )

  const s = service ?? {
    id,
    name: 'General Consultation',
    description: 'A comprehensive general consultation with a qualified clinician.',
    duration_minutes: 30,
    price: 85,
    is_active: true,
    category: null,
    clinicians: [],
  }

  return (
    <Box className="page-enter">
      <Helmet><title>{s.name} — MediBook</title></Helmet>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3, flexWrap: 'wrap' }}>
        <IconButton onClick={() => navigate('/manager/services')} sx={{ bgcolor: '#F1F3F4' }}>
          <ArrowBackRoundedIcon />
        </IconButton>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h5" fontWeight={800}>{s.name}</Typography>
          <Typography variant="body2" color="text.secondary">
            {s.category?.name ? `Category: ${s.category.name}` : 'Service Detail'}
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<EditRoundedIcon />}
          onClick={() => navigate(`/manager/services/${id}/edit`)}
          sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 700 }}
        >
          Edit Service
        </Button>
      </Box>

      <Grid container spacing={3}>
        {/* Main details */}
        <Grid item xs={12} md={7}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #E8EAED' }}>
            <Stack direction="row" alignItems="center" spacing={2} mb={3}>
              <Box sx={{
                width: 56, height: 56, borderRadius: 3,
                background: 'linear-gradient(135deg,#E6F4EA,#CEEAD6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <MedicalServicesRoundedIcon sx={{ color: '#0F9D58', fontSize: '1.6rem' }} />
              </Box>
              <Box>
                <Typography variant="h6" fontWeight={800}>{s.name}</Typography>
                <Chip
                  icon={s.is_active ? <CheckCircleRoundedIcon sx={{ fontSize: '0.9rem !important' }} /> : <CancelRoundedIcon sx={{ fontSize: '0.9rem !important' }} />}
                  label={s.is_active ? 'Active' : 'Inactive'}
                  size="small"
                  sx={{
                    bgcolor: s.is_active ? '#E6F4EA' : '#FCE8E6',
                    color: s.is_active ? '#137333' : '#A50E0E',
                    fontWeight: 700, borderRadius: '8px', fontSize: '0.72rem', height: 24,
                  }}
                />
              </Box>
            </Stack>

            <Divider sx={{ mb: 2.5 }} />

            {s.description && (
              <Box mb={2.5}>
                <Typography variant="caption" color="text.secondary" fontWeight={700} letterSpacing={0.5} textTransform="uppercase">Description</Typography>
                <Typography variant="body2" mt={0.5} color="text.secondary">{s.description}</Typography>
              </Box>
            )}

            <Stack direction="row" spacing={4}>
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={700} letterSpacing={0.5} textTransform="uppercase">Duration</Typography>
                <Stack direction="row" alignItems="center" spacing={0.75} mt={0.5}>
                  <TimerRoundedIcon sx={{ fontSize: '1rem', color: '#F9AB00' }} />
                  <Typography variant="body1" fontWeight={700}>{s.duration_minutes ?? '—'} min</Typography>
                </Stack>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={700} letterSpacing={0.5} textTransform="uppercase">Price</Typography>
                <Stack direction="row" alignItems="center" spacing={0.25} mt={0.5}>
                  <Typography variant="body1" fontWeight={700} color="success.main">
                    £{Number(s.price ?? 0).toFixed(2)}
                  </Typography>
                </Stack>
              </Box>
              {s.category && (
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={700} letterSpacing={0.5} textTransform="uppercase">Category</Typography>
                  <Typography variant="body1" fontWeight={600} mt={0.5}>{s.category.name}</Typography>
                </Box>
              )}
            </Stack>
          </Paper>
        </Grid>

        {/* Clinicians assigned */}
        <Grid item xs={12} md={5}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #E8EAED', height: '100%' }}>
            <Typography variant="subtitle1" fontWeight={700} mb={2}>Assigned Clinicians</Typography>
            {s.clinicians?.length > 0 ? (
              <Stack spacing={1.5}>
                {s.clinicians.map(c => (
                  <Stack key={c.id} direction="row" alignItems="center" spacing={1.5}
                    onClick={() => navigate(`/clinicians/${c.id}`)}
                    sx={{ cursor: 'pointer', p: 1, borderRadius: 2, '&:hover': { bgcolor: '#F1F3F4' } }}
                  >
                    <Box sx={{ width: 36, height: 36, borderRadius: '50%', bgcolor: '#E8F0FE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Typography variant="caption" fontWeight={800} color="#1A73E8">{c.full_name?.[0]}</Typography>
                    </Box>
                    <Typography variant="body2" fontWeight={600}>{c.full_name}</Typography>
                  </Stack>
                ))}
              </Stack>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 4, color: 'text.disabled' }}>
                <MedicalServicesRoundedIcon sx={{ fontSize: 48, mb: 1 }} />
                <Typography variant="body2">No clinicians assigned</Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  )
}
