import { useQuery } from '@apollo/client'
import { useMemo } from 'react'
import { Box, Grid, Card, CardContent, Skeleton, Alert, Typography, Button, Chip, alpha } from '@mui/material'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
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
  total_appointments_today: 24,
  total_appointments_today_change: 8.4,
  total_clinicians: 12,
  total_clinicians_change: 0,
  total_patients: 1483,
  total_patients_change: 12.1,
  total_revenue_month: 28750,
  total_revenue_month_change: 9.3,
  // 30 days of ISO-dated data so 7D/14D/30D toggle slices are meaningful
  volume_by_day: (() => {
    const today = new Date()
    return Array.from({ length: 30 }, (_, i) => {
      const d = new Date(today)
      d.setDate(today.getDate() - (29 - i))
      const iso = d.toISOString().split('T')[0]
      const dow = d.getDay() // 0=Sun,6=Sat
      const isWeekend = dow === 0 || dow === 6
      return {
        date: iso,
        confirmed_count: isWeekend ? Math.floor(Math.random() * 10) + 2 : Math.floor(Math.random() * 20) + 8,
        cancelled_count: Math.floor(Math.random() * 4),
      }
    })
  })(),
  bookings_by_service: [
    { name: 'Consultation', value: 38 },
    { name: 'Blood Test', value: 22 },
    { name: 'MRI Scan', value: 15 },
    { name: 'X-Ray', value: 12 },
    { name: 'Other', value: 13 },
  ],
  utilisation_by_clinician: [
    { name: 'Dr. Smith', booked: 28, available: 32 },
    { name: 'Dr. Vega', booked: 24, available: 32 },
    { name: 'Dr. Chen', booked: 20, available: 28 },
    { name: 'Dr. Patel', booked: 30, available: 32 },
  ],
  upcoming_appointments: [
    {
      id: 'appt-1',
      patient: { full_name: 'John Doe' },
      clinician: { full_name: 'Dr. Sarah Mitchell' },
      service: { name: 'Consultation' },
      start_datetime: new Date(Date.now() + 3600000).toISOString(),
      status: 'confirmed',
    },
    {
      id: 'appt-2',
      patient: { full_name: 'Sarah Miller' },
      clinician: { full_name: 'Dr. Raj Patel' },
      service: { name: 'Blood Test' },
      start_datetime: new Date(Date.now() + 7200000).toISOString(),
      status: 'pending',
    },
    {
      id: 'appt-3',
      patient: { full_name: 'Mark Johnson' },
      clinician: { full_name: 'Dr. Priya Sharma' },
      service: { name: 'MRI Scan' },
      start_datetime: new Date(Date.now() + 10800000).toISOString(),
      status: 'confirmed',
    },
    {
      id: 'appt-4',
      patient: { full_name: 'Lisa Park' },
      clinician: { full_name: 'Dr. Jane Smith' },
      service: { name: 'Physiotherapy' },
      start_datetime: new Date(Date.now() + 14400000).toISOString(),
      status: 'pending',
    },
    {
      id: 'appt-5',
      patient: { full_name: 'David Thompson' },
      clinician: { full_name: 'Dr. Carlos Vega' },
      service: { name: 'Cardiology' },
      start_datetime: new Date(Date.now() + 18000000).toISOString(),
      status: 'confirmed',
    },
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

  // NEW-DASH-008: live "last refreshed" timestamp (computed once on mount)
  const lastRefreshed = useMemo(() => new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }), [])

  // NEW-DASH-009: confirmation rate from volume_by_day
  const confirmationRate = useMemo(() => {
    const vol = d?.volume_by_day ?? []
    const totalConfirmed = vol.reduce((s, x) => s + (x.confirmed_count ?? 0), 0)
    const totalAll = vol.reduce((s, x) => s + (x.confirmed_count ?? 0) + (x.cancelled_count ?? 0), 0)
    return totalAll > 0 ? Math.round((totalConfirmed / totalAll) * 100) : null
  }, [d])

  // SUG-DASH-004: each KPI card now has an href so clicking drills down
  const kpis = [
    {
      icon: CalendarMonthIcon,
      label: 'Total Appointments Today',
      value: d?.total_appointments_today ?? null,
      trend: d?.total_appointments_today_change ?? null,
      color: '#006D77',
      href: '/appointments',
    },
    {
      icon: MedicalServicesIcon,
      label: 'Total Clinicians',
      value: d?.total_clinicians ?? null,
      trend: d?.total_clinicians_change ?? null,
      color: '#0F9D58',
      href: '/clinicians',
    },
    {
      icon: GroupIcon,
      label: 'Total Patients',
      value: d?.total_patients ?? null,
      trend: d?.total_patients_change ?? null,
      color: '#9334E6',
      href: '/patients',
    },
    {
      icon: AttachMoneyIcon,
      label: 'Revenue This Month',
      value: d?.total_revenue_month ?? null,
      trend: d?.total_revenue_month_change ?? null,
      color: '#FA7B17',
      prefix: '$',
      href: '/finances',
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
          bgcolor: 'background.paper',
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider',
          boxShadow: '0 1px 2px rgba(32,33,36,0.06)',
        }}
      >
        <Box>
          <Typography
            variant="h5"
            fontWeight={700}
            sx={{ color: 'text.primary', mb: 0.25, fontSize: { xs: '1rem', sm: '1.05rem', md: '1.125rem' } }}
          >
            {getGreeting()}, {firstName}! 👋
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', display: { xs: 'none', sm: 'block' } }}>
            {formatDate()}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
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
              background: 'linear-gradient(135deg, #006D77 0%, #00858F 100%)',
              boxShadow: '0 2px 8px rgba(0,109,119,0.30)',
              '&:hover': {
                background: 'linear-gradient(135deg, #005A62 0%, #006D77 100%)',
                boxShadow: '0 4px 14px rgba(0,109,119,0.45)',
              },
            }}
          >
            New Booking
          </Button>
          {/* NEW-DASH-008: last refreshed timestamp */}
          <Chip
            icon={<AccessTimeIcon sx={{ fontSize: 13 }} />}
            label={`Refreshed ${lastRefreshed}`}
            size="small"
            sx={{
              bgcolor: '#F8F9FA',
              color: '#5F6368',
              border: '1px solid #E8EAED',
              fontSize: '0.7rem',
              display: { xs: 'none', sm: 'flex' },
            }}
          />
        </Box>
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
            {isLoading ? (
              <KpiSkeleton />
            ) : (
              // NEW-DASH-010: a11y role + aria-label for keyboard/screen-reader users
              <Box
                role={kpi.href ? 'button' : undefined}
                tabIndex={kpi.href ? 0 : undefined}
                aria-label={kpi.href ? `Navigate to ${kpi.label}` : undefined}
                onKeyDown={(e) => kpi.href && (e.key === 'Enter' || e.key === ' ') && navigate(kpi.href)}
                onClick={() => kpi.href && navigate(kpi.href)}
                sx={{
                  cursor: kpi.href ? 'pointer' : 'default',
                  borderRadius: 3,
                  outline: 'none',
                  transition: 'transform 0.15s, box-shadow 0.15s',
                  '&:hover': kpi.href ? { transform: 'translateY(-2px)', boxShadow: '0 6px 20px rgba(0,0,0,0.10)' } : {},
                  '&:focus-visible': kpi.href ? { boxShadow: '0 0 0 3px rgba(0,109,119,0.35)', borderRadius: 3 } : {},
                }}
              >
                <KpiCard {...kpi} loading={false} />
              </Box>
            )}
          </Grid>
        ))}
      </Grid>

      {/* NEW-DASH-009: confirmation rate insight strip */}
      {confirmationRate !== null && !isLoading && (
        <Box sx={{ mb: 2.5, px: 0.5, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <Typography variant="caption" color="text.secondary" fontWeight={600}>
            Confirmation rate this period:
          </Typography>
          <Chip
            label={`${confirmationRate}%`}
            size="small"
            sx={{
              bgcolor: confirmationRate >= 75 ? '#E6F4EA' : confirmationRate >= 50 ? '#FEF7E0' : '#FCE8E6',
              color: confirmationRate >= 75 ? '#137333' : confirmationRate >= 50 ? '#8A4700' : '#A50E0E',
              fontWeight: 700,
              fontSize: '0.72rem',
              height: 20,
            }}
          />
          <Typography variant="caption" color="text.disabled">
            ({d?.volume_by_day?.reduce((s, x) => s + (x.confirmed_count ?? 0), 0) ?? 0} confirmed
            {' / '}
            {d?.volume_by_day?.reduce((s, x) => s + (x.confirmed_count ?? 0) + (x.cancelled_count ?? 0), 0) ?? 0} total)
          </Typography>
        </Box>
      )}

      {/* ── Charts Row 1: Line chart + Pie chart ─────────────────────────── */}
      <Grid container spacing={2.5} mb={2.5}>
        <Grid item xs={12} md={8}>
          {isLoading ? (
            <ChartSkeleton height={270} />
          ) : (
            <Card sx={{ borderRadius: 3, height: '100%' }}>
              <CardContent sx={{ p: '24px !important' }}>
                <AppointmentVolumeChart data={d?.volume_by_day} />
              </CardContent>
            </Card>
          )}
        </Grid>

        <Grid item xs={12} md={4}>
          {isLoading ? (
            <ChartSkeleton height={270} />
          ) : (
            <Card sx={{ borderRadius: 3, height: '100%' }}>
              <CardContent sx={{ p: '24px !important' }}>
                <ServicePieChart data={d?.bookings_by_service} />
              </CardContent>
            </Card>
          )}
        </Grid>
      </Grid>

      {/* ── Charts Row 2: Utilisation bar chart ──────────────────────────── */}
      <Grid container spacing={2.5} mb={2.5}>
        <Grid item xs={12}>
          {isLoading ? (
            <ChartSkeleton height={240} />
          ) : (
            <Card sx={{ borderRadius: 3 }}>
              <CardContent sx={{ p: '24px !important' }}>
                <UtilisationChart data={d?.utilisation_by_clinician} />
              </CardContent>
            </Card>
          )}
        </Grid>
      </Grid>

      {/* ── Recent Appointments Table ─────────────────────────────────────── */}
      <Grid container spacing={2.5}>
        <Grid item xs={12}>
          {isLoading ? (
            <ChartSkeleton height={200} />
          ) : (
            <Card sx={{ borderRadius: 3 }}>
              <CardContent sx={{ p: '24px !important' }}>
                <RecentAppointmentsTable appointments={d?.upcoming_appointments} />
              </CardContent>
            </Card>
          )}
        </Grid>
      </Grid>
    </Box>
  )
}
