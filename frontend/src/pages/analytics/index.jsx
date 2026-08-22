import { useState, useMemo } from 'react'
import { Helmet } from 'react-helmet-async'
import {
  Alert, Box, Button, Card, CardContent, Grid, MenuItem, Paper,
  Stack, TextField, Typography, Skeleton,
} from '@mui/material'
import { useQuery, gql } from '@apollo/client'
import { useSnackbar } from 'notistack'
import dayjs from 'dayjs'
import TrendingUpRoundedIcon     from '@mui/icons-material/TrendingUpRounded'
import TrendingDownRoundedIcon   from '@mui/icons-material/TrendingDownRounded'
import FileDownloadRoundedIcon   from '@mui/icons-material/FileDownloadRounded'
import PeopleAltRoundedIcon      from '@mui/icons-material/PeopleAltRounded'
import EventAvailableRoundedIcon from '@mui/icons-material/EventAvailableRounded'
import CurrencyRupeeRoundedIcon  from '@mui/icons-material/CurrencyRupeeRounded'
import PercentRoundedIcon        from '@mui/icons-material/PercentRounded'
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'

// F-18 / BUG009. This page rendered seven months of invented figures — down to
// "Revenue (Mar) $27,800", in dollars, for an India-market product — while
// backend/src/analytics has been real and role-gated all along.
//
// It is rewritten rather than patched because the mock's shape and the real
// API's shape barely overlap. Everything below now comes from
// getAppointmentStats, and the panels the API cannot support are GONE rather
// than left rendering plausible fiction:
//
//   * Service mix pie      — no per-service breakdown in this query.
//   * Patient growth chart — no historical patient-count series exists.
//   * Expenses / profit    — no cost model anywhere in the schema.
//   * Avg. rating KPI      — reviews exist, but not as an analytics aggregate.
//
// What replaced them is real: revenue by clinic, and top clinicians by volume
// and revenue, both of which the resolver already returns and nothing displayed.

const STATS_QUERY = gql`
  query AnalyticsStats($clinicId: ID, $startDate: String!, $endDate: String!) {
    getClinics { id name }
    getAppointmentStats(clinicId: $clinicId, startDate: $startDate, endDate: $endDate) {
      totalAppointments
      revenue
      activePatients
      utilization
      cancellationRate
      trends { totalAppointments revenue activePatients utilization cancellationRate }
      timeSeriesData { date scheduled completed cancelled }
      statusDistribution { name value }
      revenueByClinic { name revenue }
      topClinicians { id name appointments revenue }
    }
  }
`

const RANGES = {
  last7days:   { label: 'Last 7 days',   days: 7 },
  last30days:  { label: 'Last 30 days',  days: 30 },
  last90days:  { label: 'Last 90 days',  days: 90 },
  last365days: { label: 'Last 12 months', days: 365 },
}

const STATUS_COLORS = {
  Completed: '#0F9D58', Scheduled: '#1A73E8', Confirmed: '#1A73E8',
  Cancelled: '#D93025', Pending: '#F9AB00', 'No Show': '#9E9E9E',
}
const FALLBACK_COLORS = ['#1A73E8', '#0F9D58', '#9334E6', '#FA7B17', '#D93025', '#80868B']

const inr = (n) => `₹${Number(n ?? 0).toLocaleString('en-IN')}`

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <Paper sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
      <Typography variant="caption" fontWeight={800} sx={{ color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', mb: 0.75 }}>{label}</Typography>
      {payload.map((entry, i) => (
        <Stack key={i} direction="row" spacing={1} alignItems="center">
          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: entry.color }} />
          <Typography variant="caption" fontWeight={600} sx={{ color: 'text.secondary', textTransform: 'capitalize' }}>{String(entry.name).replace(/_/g, ' ')}:</Typography>
          <Typography variant="caption" fontWeight={800} sx={{ color: 'text.primary' }}>
            {entry.name === 'revenue' ? inr(entry.value) : entry.value}
          </Typography>
        </Stack>
      ))}
    </Paper>
  )
}

function SectionCard({ title, subtitle, children, action }) {
  return (
    <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', boxShadow: 'none', height: '100%' }}>
      <CardContent sx={{ p: 3, pb: '20px !important' }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={2.5}>
          <Box>
            <Typography variant="subtitle1" fontWeight={800}>{title}</Typography>
            {subtitle && <Typography variant="caption" color="text.secondary">{subtitle}</Typography>}
          </Box>
          {action}
        </Stack>
        {children}
      </CardContent>
    </Card>
  )
}

// `trend` is the real percentage change the resolver computed against the
// immediately preceding window of the same length — not a hardcoded "+12.4%".
function KpiCard({ label, value, trend, icon: Icon, color, loading }) {
  const up = (trend ?? 0) >= 0
  return (
    <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', boxShadow: 'none', height: '100%' }}>
      <CardContent sx={{ p: 2.5 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Box sx={{ minWidth: 0 }}>
            {loading ? <Skeleton width={90} height={38} /> : (
              <Typography variant="h4" fontWeight={800} sx={{ color, mb: 0.25 }}>{value}</Typography>
            )}
            <Typography variant="body2" color="text.secondary">{label}</Typography>
            {!loading && trend != null && (
              <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.5 }}>
                {up ? <TrendingUpRoundedIcon sx={{ fontSize: 16, color: '#137333' }} />
                    : <TrendingDownRoundedIcon sx={{ fontSize: 16, color: '#A50E0E' }} />}
                <Typography variant="caption" fontWeight={700} sx={{ color: up ? '#137333' : '#A50E0E' }}>
                  {up ? '+' : ''}{Number(trend).toFixed(1)}%
                </Typography>
                <Typography variant="caption" color="text.disabled">vs prior period</Typography>
              </Stack>
            )}
          </Box>
          <Icon sx={{ color, opacity: 0.25, fontSize: 34 }} />
        </Stack>
      </CardContent>
    </Card>
  )
}

export default function AnalyticsPage() {
  const { enqueueSnackbar } = useSnackbar()
  const [rangeKey, setRangeKey] = useState('last30days')
  const [clinicId, setClinicId] = useState('')

  const { startDate, endDate } = useMemo(() => {
    const days = RANGES[rangeKey]?.days ?? 30
    return {
      // The resolver parses these as plain YYYY-MM-DD and builds the UTC window
      // itself, including the equal-length prior period the trends compare to.
      startDate: dayjs().subtract(days - 1, 'day').format('YYYY-MM-DD'),
      endDate: dayjs().format('YYYY-MM-DD'),
    }
  }, [rangeKey])

  const { data, loading, error, refetch } = useQuery(STATS_QUERY, {
    variables: { clinicId: clinicId || null, startDate, endDate },
    fetchPolicy: 'cache-and-network',
  })

  const clinics = data?.getClinics ?? []
  const stats = data?.getAppointmentStats
  const series = stats?.timeSeriesData ?? []
  const hasData = (stats?.totalAppointments ?? 0) > 0

  const handleExport = () => {
    if (!series.length) {
      enqueueSnackbar('Nothing to export for this period.', { variant: 'warning' })
      return
    }
    try {
      const rows = [
        ['Date', 'Scheduled', 'Completed', 'Cancelled'],
        ...series.map((d) => [d.date, d.scheduled, d.completed, d.cancelled]),
      ]
      const csv = rows.map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
      const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
      const link = document.createElement('a')
      link.href = url
      link.download = `analytics_${startDate}_to_${endDate}.csv`
      link.click()
      URL.revokeObjectURL(url)
      enqueueSnackbar('Analytics CSV downloaded', { variant: 'success' })
    } catch {
      enqueueSnackbar('Export failed — please try again.', { variant: 'error' })
    }
  }

  return (
    <Box>
      <Helmet><title>Analytics &amp; Reporting · MediBook</title></Helmet>

      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ md: 'center' }} gap={2} sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={800} sx={{ fontSize: { xs: '1.35rem', sm: '1.5rem' } }}>Analytics &amp; Reporting</Typography>
          <Typography variant="body2" color="text.secondary">
            {dayjs(startDate).format('D MMM YYYY')} – {dayjs(endDate).format('D MMM YYYY')}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.5} flexWrap="wrap" gap={1}>
          <TextField select size="small" label="Clinic" value={clinicId} onChange={(e) => setClinicId(e.target.value)} sx={{ minWidth: 180 }}>
            <MenuItem value="">All clinics</MenuItem>
            {clinics.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
          </TextField>
          <TextField select size="small" label="Period" value={rangeKey} onChange={(e) => setRangeKey(e.target.value)} sx={{ minWidth: 160 }}>
            {Object.entries(RANGES).map(([k, v]) => <MenuItem key={k} value={k}>{v.label}</MenuItem>)}
          </TextField>
          <Button variant="outlined" size="small" startIcon={<FileDownloadRoundedIcon />} onClick={handleExport} disabled={!series.length}>
            Export CSV
          </Button>
        </Stack>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} action={<Button size="small" onClick={() => refetch()}>Retry</Button>}>
          Could not load analytics: {error.message}
        </Alert>
      )}

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} lg={3}>
          <KpiCard label="Total Appointments" loading={loading && !stats} color="#1A73E8" icon={EventAvailableRoundedIcon}
            value={(stats?.totalAppointments ?? 0).toLocaleString('en-IN')} trend={stats?.trends?.totalAppointments} />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <KpiCard label="Revenue" loading={loading && !stats} color="#9334E6" icon={CurrencyRupeeRoundedIcon}
            value={inr(stats?.revenue)} trend={stats?.trends?.revenue} />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <KpiCard label="Active Patients" loading={loading && !stats} color="#0F9D58" icon={PeopleAltRoundedIcon}
            value={(stats?.activePatients ?? 0).toLocaleString('en-IN')} trend={stats?.trends?.activePatients} />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <KpiCard label="Cancellation Rate" loading={loading && !stats} color="#D93025" icon={PercentRoundedIcon}
            value={`${Number(stats?.cancellationRate ?? 0).toFixed(1)}%`} trend={stats?.trends?.cancellationRate} />
        </Grid>
      </Grid>

      {/* An empty period is a real answer and says so. The previous version could
          not reach this state: its data was a constant. */}
      {!loading && !error && !hasData && (
        <Alert severity="info" sx={{ mb: 3 }}>
          No appointments in this period{clinicId ? ' for the selected clinic' : ''}. Try a wider date range.
        </Alert>
      )}

      <Grid container spacing={2}>
        <Grid item xs={12} lg={8}>
          <SectionCard title="Appointment volume" subtitle="Scheduled, completed and cancelled per day">
            <Box sx={{ width: '100%', height: 320 }}>
              {loading && !series.length ? <Skeleton variant="rounded" height={300} /> : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={series} margin={{ top: 4, right: 8, left: -20, bottom: 0 }} barGap={2}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8EAED" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(d) => dayjs(d).format('D MMM')} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip content={<ChartTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="scheduled" fill="#1A73E8" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="completed" fill="#0F9D58" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="cancelled" fill="#D93025" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Box>
          </SectionCard>
        </Grid>

        <Grid item xs={12} lg={4}>
          <SectionCard title="Status breakdown" subtitle="Appointments by status">
            <Box sx={{ width: '100%', height: 320 }}>
              {loading && !stats ? <Skeleton variant="rounded" height={300} /> : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={stats?.statusDistribution ?? []} dataKey="value" nameKey="name" innerRadius={55} outerRadius={95} paddingAngle={2}>
                      {(stats?.statusDistribution ?? []).map((entry, i) => (
                        <Cell key={entry.name} fill={STATUS_COLORS[entry.name] ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length]} stroke="none" />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </Box>
          </SectionCard>
        </Grid>

        <Grid item xs={12} lg={6}>
          <SectionCard title="Revenue by clinic" subtitle="Billable value of completed appointments">
            <Box sx={{ width: '100%', height: 300 }}>
              {loading && !stats ? <Skeleton variant="rounded" height={280} /> : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats?.revenueByClinic ?? []} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8EAED" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="revenue" fill="#9334E6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Box>
          </SectionCard>
        </Grid>

        <Grid item xs={12} lg={6}>
          <SectionCard title="Top clinicians" subtitle="By appointment volume in this period">
            {loading && !stats ? <Skeleton variant="rounded" height={280} /> : (
              <Stack spacing={1.5}>
                {(stats?.topClinicians ?? []).length === 0 && (
                  <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                    No clinician activity in this period
                  </Typography>
                )}
                {(stats?.topClinicians ?? []).map((c) => (
                  <Stack key={c.id} direction="row" alignItems="center" spacing={2}>
                    <Typography variant="body2" fontWeight={600} sx={{ flex: 1, minWidth: 0 }} noWrap>{c.name}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                      {c.appointments} appt{c.appointments === 1 ? '' : 's'}
                    </Typography>
                    <Typography variant="body2" fontWeight={700} sx={{ color: '#9334E6', whiteSpace: 'nowrap' }}>{inr(c.revenue)}</Typography>
                  </Stack>
                ))}
              </Stack>
            )}
          </SectionCard>
        </Grid>
      </Grid>

      <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 3 }}>
        Revenue is the billable value of completed appointments, not captured payments —
        see /finances for money actually collected. Utilisation is a completion-rate proxy;
        both definitions are documented in analytics.entity.ts.
      </Typography>
    </Box>
  )
}
