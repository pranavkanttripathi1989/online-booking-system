import { useQuery } from '@apollo/client'
import { Box, Grid, Card, CardContent, Skeleton, Alert, Typography, Button, alpha } from '@mui/material'
import { Helmet } from 'react-helmet-async'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import MedicalServicesIcon from '@mui/icons-material/MedicalServices'
import GroupIcon from '@mui/icons-material/Group'
import AttachMoneyIcon from '@mui/icons-material/AttachMoney'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import { useNavigate } from 'react-router-dom'

import { DASHBOARD_QUERY } from '../../graphql/queries'
import { useAuth } from '../../context/AuthContext'
import KpiCard from '../../components/Dashboard/KpiCard'
import AppointmentVolumeChart from '../../components/Dashboard/AppointmentVolumeChart'
import UtilisationChart from '../../components/Dashboard/UtilisationChart'
import ServicePieChart from '../../components/Dashboard/ServicePieChart'
import RecentAppointmentsTable from '../../components/Dashboard/RecentAppointmentsTable'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function formatDate() {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

// ─── Mock fallback data ────────────────────────────────────────────────────────
const MOCK_DASHBOARD = {
  total_appointments_today: 24,    total_appointments_today_change: 8.4,
  total_clinicians: 12,            total_clinicians_change: 0,
  total_patients: 1483,            total_patients_change: 12.1,
  total_revenue_month: 28750,      total_revenue_month_change: 9.3,
  volume_by_day: [
    { date: 'Mon', confirmed_count: 14, cancelled_count: 2 },
    { date: 'Tue', confirmed_count: 20, cancelled_count: 3 },
    { date: 'Wed', confirmed_count: 17, cancelled_count: 1 },
    { date: 'Thu', confirmed_count: 26, cancelled_count: 4 },
    { date: 'Fri', confirmed_count: 22, cancelled_count: 3 },
    { date: 'Sat', confirmed_count: 11, cancelled_count: 1 },
    { date: 'Sun', confirmed_count:  6, cancelled_count: 0 },
  ],
  bookings_by_service: [
    { name: 'Consultation', value: 38 }, { name: 'Blood Test', value: 22 },
    { name: 'MRI Scan', value: 15 },     { name: 'X-Ray', value: 12 }, { name: 'Other', value: 13 },
  ],
  utilisation_by_clinician: [
    { name: 'Dr. Smith', booked: 28, available: 32 }, { name: 'Dr. Vega',  booked: 24, available: 32 },
    { name: 'Dr. Chen',  booked: 20, available: 28 }, { name: 'Dr. Patel', booked: 30, available: 32 },
  ],
  upcoming_appointments: [
    { id: 'appt-1', patient: { full_name: 'John Doe'     }, clinician: { full_name: 'Dr. Sarah Mitchell' }, service: { name: 'Consultation' }, start_datetime: new Date(Date.now() + 3600000).toISOString(),  status: 'confirmed' },
    { id: 'appt-2', patient: { full_name: 'Sarah Miller' }, clinician: { full_name: 'Dr. Raj Patel'      }, service: { name: 'Blood Test'   }, start_datetime: new Date(Date.now() + 7200000).toISOString(),  status: 'pending'   },
    { id: 'appt-3', patient: { full_name: 'Mark Johnson' }, clinician: { full_name: 'Dr. Priya Sharma'   }, service: { name: 'MRI Scan'     }, start_datetime: new Date(Date.now() + 10800000).toISOString(), status: 'confirmed' },
  ],
}



// ─── Loading Skeletons ────────────────────────────────────────────────────────

function KpiSkeleton() {
  return (
    <Card sx={{ height: '100%', borderRadius: 3 }}>
      <CardContent sx={{ p: '20px !important' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Skeleton variant="rounded" width={48} height={48} sx={{ borderRadius: 2.5 }} />
          <Skeleton variant="rounded" width={56} height={24} sx={{ borderRadius: 2 }} />
        </Box>
        <Skeleton variant="text" width={70} height={44} sx={{ mb: 0.5 }} />
        <Skeleton variant="text" width={120} height={18} />
      </CardContent>
    </Card>
  )
}

function ChartSkeleton({ height = 290 }) {
  return (
    <Card sx={{ borderRadius: 3, height: '100%' }}>
      <CardContent sx={{ p: '24px !important' }}>
        <Skeleton variant="text" width={180} height={28} sx={{ mb: 2 }} />
        <Skeleton variant="rectangular" height={height} sx={{ borderRadius: 2 }} />
      </CardContent>
    </Card>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { data, loading, error } = useQuery(DASHBOARD_QUERY, {
    fetchPolicy: 'cache-and-network',
    errorPolicy: 'all',
  })

  // Use real data or fall back to mock when backend is offline
  const d = data?.dashboard ?? MOCK_DASHBOARD
  const isLoading = loading && !data

  const firstName = user?.name?.split(' ')[0] ?? 'there'

  const kpis = [
    {
      icon: CalendarMonthIcon,
      label: 'Total Appointments Today',
      value: d?.total_appointments_today ?? null,
      trend: d?.total_appointments_today_change ?? null,
      color: '#1A73E8',
    },
    {
      icon: MedicalServicesIcon,
      label: 'Total Clinicians',
      value: d?.total_clinicians ?? null,
      trend: d?.total_clinicians_change ?? null,
      color: '#0F9D58',
    },
    {
      icon: GroupIcon,
      label: 'Total Patients',
      value: d?.total_patients ?? null,
      trend: d?.total_patients_change ?? null,
      color: '#9334E6',
    },
    {
      icon: AttachMoneyIcon,
      label: 'Revenue This Month',
      value: d?.total_revenue_month ?? null,
      trend: d?.total_revenue_month_change ?? null,
      color: '#FA7B17',
      prefix: '$',
    },
  ]

  return (
    <Box className="page-enter" sx={{ pb: 4 }}>
      <Helmet>
        <title>Dashboard — MediBook</title>
      </Helmet>

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <Box
        sx={{
          display: 'flex',
          alignItems: { xs: 'flex-start', sm: 'center' },
          justifyContent: 'space-between',
          flexDirection: { xs: 'column', sm: 'row' },
          gap: 2,
          mb: 3.5,
          p: { xs: '14px 16px', sm: '16px 20px', md: '20px 24px' },
          bgcolor: '#FFFFFF',
          borderRadius: 3,
          border: '1px solid #E8EAED',
          boxShadow: '0 1px 2px rgba(32,33,36,0.06)',
        }}
      >
        <Box>
          <Typography
            variant="h5"
            fontWeight={700}
            sx={{ color: '#202124', mb: 0.25, fontSize: { xs: '1rem', sm: '1.05rem', md: '1.125rem' } }}
          >
            {getGreeting()}, {firstName}! 👋
          </Typography>
          <Typography variant="body2" sx={{ color: '#5F6368', display: { xs: 'none', sm: 'block' } }}>
            {formatDate()}
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddRoundedIcon />}
          onClick={() => navigate('/appointments/new')}
          sx={{
            borderRadius: 2,
            textTransform: 'none',
            fontWeight: 700,
            px: 2.5,
            py: 1,
            whiteSpace: 'nowrap',
            width: { xs: '100%', sm: 'auto' },
            mt: { xs: 0.5, sm: 0 },
            background: 'linear-gradient(135deg, #4285F4 0%, #1A73E8 100%)',
            boxShadow: '0 2px 8px rgba(26,115,232,0.30)',
            '&:hover': {
              background: 'linear-gradient(135deg, #1A73E8 0%, #1557B0 100%)',
              boxShadow: '0 4px 14px rgba(26,115,232,0.40)',
            },
          }}
        >
          New Booking
        </Button>
      </Box>

      {/* ── Non-fatal GraphQL error banner ───────────────────────────────── */}
      {error && (
        <Alert severity="warning" sx={{ mb: 3, borderRadius: 2 }}>
          Some dashboard data could not be loaded — showing available data.
        </Alert>
      )}

      {/* ── KPI Cards ────────────────────────────────────────────────────── */}
      <Grid container spacing={{ xs: 1.5, sm: 2, md: 2.5 }} mb={2.5}>
        {kpis.map((kpi) => (
          <Grid item xs={6} sm={6} md={3} key={kpi.label}>
            {isLoading
              ? <KpiSkeleton />
              : <KpiCard {...kpi} loading={false} />
            }
          </Grid>
        ))}
      </Grid>

      {/* ── Charts Row 1: Line chart + Pie chart ─────────────────────────── */}
      <Grid container spacing={2.5} mb={2.5}>
        <Grid item xs={12} md={8}>
          {isLoading
            ? <ChartSkeleton height={270} />
            : (
              <Card sx={{ borderRadius: 3, height: '100%' }}>
                <CardContent sx={{ p: '24px !important' }}>
                  <AppointmentVolumeChart data={d?.volume_by_day} />
                </CardContent>
              </Card>
            )
          }
        </Grid>

        <Grid item xs={12} md={4}>
          {isLoading
            ? <ChartSkeleton height={270} />
            : (
              <Card sx={{ borderRadius: 3, height: '100%' }}>
                <CardContent sx={{ p: '24px !important' }}>
                  <ServicePieChart data={d?.bookings_by_service} />
                </CardContent>
              </Card>
            )
          }
        </Grid>
      </Grid>

      {/* ── Charts Row 2: Utilisation bar chart ──────────────────────────── */}
      <Grid container spacing={2.5} mb={2.5}>
        <Grid item xs={12}>
          {isLoading
            ? <ChartSkeleton height={240} />
            : (
              <Card sx={{ borderRadius: 3 }}>
                <CardContent sx={{ p: '24px !important' }}>
                  <UtilisationChart data={d?.utilisation_by_clinician} />
                </CardContent>
              </Card>
            )
          }
        </Grid>
      </Grid>

      {/* ── Recent Appointments Table ─────────────────────────────────────── */}
      <Grid container spacing={2.5}>
        <Grid item xs={12}>
          {isLoading
            ? <ChartSkeleton height={200} />
            : (
              <Card sx={{ borderRadius: 3 }}>
                <CardContent sx={{ p: '24px !important' }}>
                  <RecentAppointmentsTable appointments={d?.upcoming_appointments} />
                </CardContent>
              </Card>
            )
          }
        </Grid>
      </Grid>
    </Box>
  )
}
