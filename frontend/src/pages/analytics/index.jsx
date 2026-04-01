import { useState, useMemo } from 'react'
import { Helmet } from 'react-helmet-async'
import {
  Box, Button, Card, CardContent, Chip, Grid, MenuItem, Paper,
  Stack, TextField, ToggleButton, ToggleButtonGroup, Typography, Divider, Skeleton,
} from '@mui/material'
import { useSnackbar } from 'notistack'
import TrendingUpRoundedIcon    from '@mui/icons-material/TrendingUpRounded'
import TrendingDownRoundedIcon  from '@mui/icons-material/TrendingDownRounded'
import FileDownloadRoundedIcon  from '@mui/icons-material/FileDownloadRounded'
import PeopleAltRoundedIcon     from '@mui/icons-material/PeopleAltRounded'
import EventAvailableRoundedIcon from '@mui/icons-material/EventAvailableRounded'
import AttachMoneyRoundedIcon   from '@mui/icons-material/AttachMoneyRounded'
import StarRoundedIcon          from '@mui/icons-material/StarRounded'
import CompareArrowsRoundedIcon from '@mui/icons-material/CompareArrowsRounded'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'

// ─── Full Mock Data (7 months) ────────────────────────────────────────────────
const ALL_MONTHLY_APPTS = [
  { month: 'Sep', booked: 142, completed: 128, cancelled: 14, revenue: 18400 },
  { month: 'Oct', booked: 165, completed: 149, cancelled: 16, revenue: 21200 },
  { month: 'Nov', booked: 158, completed: 141, cancelled: 17, revenue: 19900 },
  { month: 'Dec', booked: 121, completed: 109, cancelled: 12, revenue: 15600 },
  { month: 'Jan', booked: 178, completed: 162, cancelled: 16, revenue: 23100 },
  { month: 'Feb', booked: 193, completed: 175, cancelled: 18, revenue: 25400 },
  { month: 'Mar', booked: 210, completed: 190, cancelled: 20, revenue: 27800 },
]

// FIX NEW-AF-002: Multiple weeks of data so weekly mode can be sliced by date range
// Each entry represents one week (Mon–Sun). We keep 7 weeks total (≈ same max as 7 months).
const ALL_WEEKLY_APPTS = [
  { day: 'Wk1 Mon', booked: 28, completed: 25, cancelled: 3,  revenue: 3800 },
  { day: 'Wk1 Tue', booked: 32, completed: 29, cancelled: 3,  revenue: 4300 },
  { day: 'Wk1 Wed', booked: 38, completed: 34, cancelled: 4,  revenue: 5100 },
  { day: 'Wk1 Thu', booked: 30, completed: 27, cancelled: 3,  revenue: 4100 },
  { day: 'Wk1 Fri', booked: 44, completed: 40, cancelled: 4,  revenue: 5900 },
  { day: 'Wk1 Sat', booked: 22, completed: 20, cancelled: 2,  revenue: 3200 },
  { day: 'Wk1 Sun', booked: 10, completed: 9,  cancelled: 1,  revenue: 1500 },
  { day: 'Wk2 Mon', booked: 33, completed: 30, cancelled: 3,  revenue: 4400 },
  { day: 'Wk2 Tue', booked: 37, completed: 34, cancelled: 3,  revenue: 5000 },
  { day: 'Wk2 Wed', booked: 41, completed: 37, cancelled: 4,  revenue: 5500 },
  { day: 'Wk2 Thu', booked: 35, completed: 32, cancelled: 3,  revenue: 4800 },
  { day: 'Wk2 Fri', booked: 48, completed: 43, cancelled: 5,  revenue: 6400 },
  { day: 'Wk2 Sat', booked: 25, completed: 23, cancelled: 2,  revenue: 3600 },
  { day: 'Wk2 Sun', booked: 11, completed: 10, cancelled: 1,  revenue: 1700 },
  { day: 'Wk3 Mon', booked: 36, completed: 33, cancelled: 3,  revenue: 4700 },
  { day: 'Wk3 Tue', booked: 40, completed: 37, cancelled: 3,  revenue: 5300 },
  { day: 'Wk3 Wed', booked: 44, completed: 40, cancelled: 4,  revenue: 5800 },
  { day: 'Wk3 Thu', booked: 33, completed: 30, cancelled: 3,  revenue: 4500 },
  { day: 'Wk3 Fri', booked: 50, completed: 45, cancelled: 5,  revenue: 6800 },
  { day: 'Wk3 Sat', booked: 27, completed: 25, cancelled: 2,  revenue: 3900 },
  { day: 'Wk3 Sun', booked: 12, completed: 11, cancelled: 1,  revenue: 1800 },
]

const ALL_PATIENT_GROWTH = [
  { month: 'Sep', new_patients: 28, returning: 114 },
  { month: 'Oct', new_patients: 34, returning: 131 },
  { month: 'Nov', new_patients: 29, returning: 129 },
  { month: 'Dec', new_patients: 18, returning: 103 },
  { month: 'Jan', new_patients: 41, returning: 137 },
  { month: 'Feb', new_patients: 48, returning: 145 },
  { month: 'Mar', new_patients: 56, returning: 154 },
]

const ALL_REVENUE_MONTHLY = [
  { month: 'Sep', revenue: 18400, expenses: 7200, profit: 11200 },
  { month: 'Oct', revenue: 21200, expenses: 8100, profit: 13100 },
  { month: 'Nov', revenue: 19900, expenses: 7800, profit: 12100 },
  { month: 'Dec', revenue: 15600, expenses: 6500, profit: 9100  },
  { month: 'Jan', revenue: 23100, expenses: 8900, profit: 14200 },
  { month: 'Feb', revenue: 25400, expenses: 9400, profit: 16000 },
  { month: 'Mar', revenue: 27800, expenses: 10100, profit: 17700 },
]

const CLINICIAN_UTIL = [
  { name: 'Dr. Jane Smith',  slots: 200, booked: 181, utilization: 90 },
  { name: 'Dr. Carlos Vega', slots: 180, booked: 150, utilization: 83 },
  { name: 'Dr. Amara Patel', slots: 160, booked: 121, utilization: 76 },
  { name: 'Dr. Lena Müller', slots: 140, booked: 96,  utilization: 69 },
  { name: 'Dr. Samuel Osei', slots: 100, booked: 58,  utilization: 58 },
]

const SERVICE_PIX = [
  { name: 'Consultation',  value: 42, color: '#1A73E8' },
  { name: 'Follow-Up',     value: 23, color: '#0F9D58' },
  { name: 'Lab / Blood',   value: 15, color: '#9334E6' },
  { name: 'X-Ray / Scan',  value: 10, color: '#FA7B17' },
  { name: 'Physiotherapy', value: 6,  color: '#D93025' },
  { name: 'Other',         value: 4,  color: '#80868B' },
]

// SUG-AF-003: Appointment Status Breakdown
const STATUS_BREAKDOWN = [
  { name: 'Completed',  value: 87, color: '#0F9D58' },
  { name: 'Confirmed',  value: 42, color: '#1A73E8' },
  { name: 'Cancelled',  value: 23, color: '#D93025' },
  { name: 'Pending',    value: 18, color: '#F9AB00' },
  { name: 'No Show',    value: 9,  color: '#9E9E9E' },
]

// SUG-AF-006: Comparison KPIs — prior period values for delta display
const KPIS = [
  {
    label: 'Total Appointments', value: '1,167', rawValue: 1167, priorValue: 1038,
    delta: '+12.4%', up: true, icon: EventAvailableRoundedIcon, color: '#1A73E8'
  },
  {
    label: 'New Patients', value: '254', rawValue: 254, priorValue: 234,
    delta: '+8.7%', up: true, icon: PeopleAltRoundedIcon, color: '#0F9D58'
  },
  {
    label: 'Revenue (Mar)', value: '$27,800', rawValue: 27800, priorValue: 25389,
    delta: '+9.4%', up: true, icon: AttachMoneyRoundedIcon, color: '#9334E6'
  },
  {
    label: 'Avg. Rating', value: '4.7', rawValue: 4.7, priorValue: 4.5,
    delta: '+0.2', up: true, icon: StarRoundedIcon, color: '#FA7B17'
  },
]

// Date range → how many months to slice from the end
const DATE_RANGE_MONTHS = {
  last1month:  1,
  last3months: 3,
  last7months: 7,
  this_year:   7,
}

// FIX NEW-AF-002: Date range → how many weekly data points (days) to slice
// last1month ≈ 1 week, last3months ≈ 2 weeks, last7months ≈ 3 weeks
const DATE_RANGE_WEEKS = {
  last1month:  7,
  last3months: 14,
  last7months: 21,
  this_year:   21,
}

// ─── Tooltip ─────────────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <Paper sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 2, boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}>
      <Typography variant="caption" fontWeight={800} sx={{ color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', mb: 0.75 }}>{label}</Typography>
      {payload.map((entry, i) => (
        <Stack key={i} direction="row" spacing={1} alignItems="center">
          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: entry.color }} />
          <Typography variant="caption" fontWeight={600} sx={{ color: 'text.secondary', textTransform: 'capitalize' }}>{entry.name.replace(/_/g, ' ')}:</Typography>
          <Typography variant="caption" fontWeight={800} sx={{ color: 'text.primary' }}>
            {entry.name === 'revenue' || entry.name === 'expenses' || entry.name === 'profit' ? `$${entry.value.toLocaleString()}` : entry.value}
          </Typography>
        </Stack>
      ))}
    </Paper>
  )
}

function SectionCard({ title, subtitle, children, action }) {
  return (
    <Card sx={{ borderRadius: 3, border: '1px solid #E8EAED', boxShadow: 'none', bgcolor: '#FFFFFF' }}>
      <CardContent sx={{ p: 3, pb: '20px !important' }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={2.5}>
          <Box>
            <Typography variant="subtitle1" fontWeight={800} sx={{ color: '#202124' }}>{title}</Typography>
            {subtitle && <Typography variant="caption" sx={{ color: '#5F6368' }}>{subtitle}</Typography>}
          </Box>
          {action}
        </Stack>
        {children}
      </CardContent>
    </Card>
  )
}

// SUG-AF-006: Prior period comparison badge
function CompareBadge({ priorValue, rawValue, label }) {
  const diff = rawValue - priorValue
  const pct  = ((diff / priorValue) * 100).toFixed(1)
  const up   = diff >= 0
  return (
    <Box sx={{ mt: 1, p: 1, borderRadius: 2, bgcolor: up ? '#E6F4EA' : '#FCE8E6', border: `1px solid ${up ? '#CEEAD6' : '#F5C6C2'}` }}>
      <Typography variant="caption" sx={{ color: up ? '#137333' : '#A50E0E', fontWeight: 700, display: 'block' }}>
        vs prior period: {up ? '+' : ''}{pct}%
      </Typography>
      <Typography variant="caption" sx={{ color: 'text.disabled' }}>Prior: {label}</Typography>
    </Box>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function AnalyticsPage() {
  const { enqueueSnackbar } = useSnackbar()
  const [timeframe, setTimeframe] = useState('monthly')
  // FIX BUG-AF-001: controlled date range state
  const [dateRange, setDateRange] = useState('last7months')
  // SUG-AF-006: comparison mode toggle
  const [compareMode, setCompareMode] = useState(false)

  // FIX BUG-AF-001: derive chart data slices from dateRange
  const monthCount = DATE_RANGE_MONTHS[dateRange] ?? 7
  const weekCount  = DATE_RANGE_WEEKS[dateRange] ?? 21

  // FIX NEW-AF-002: weekly data is now sliced based on date range (weekCount days)
  const apptData    = timeframe === 'weekly'
    ? ALL_WEEKLY_APPTS.slice(-weekCount)
    : ALL_MONTHLY_APPTS.slice(-monthCount)
  const revenueData = ALL_REVENUE_MONTHLY.slice(-monthCount)
  const growthData  = ALL_PATIENT_GROWTH.slice(-monthCount)
  const xKey        = timeframe === 'weekly' ? 'day' : 'month'

  // Persist date range to localStorage for SUG-AF-008 (shared date range context)
  const handleDateRangeChange = (newRange) => {
    setDateRange(newRange)
    try { localStorage.setItem('medibook_dateRange', newRange) } catch { /* ignore */ }
  }

  // FIX BUG-AF-003: CSV export implementation
  const handleExport = () => {
    try {
      const rows = [
        ['Month', 'Booked', 'Completed', 'Cancelled', 'Revenue ($)', 'Expenses ($)', 'Profit ($)'],
        ...revenueData.map((r, i) => {
          const a = apptData[i] || {}
          return [r.month, a.booked ?? '', a.completed ?? '', a.cancelled ?? '', r.revenue, r.expenses, r.profit]
        }),
      ]
      const csv = rows.map(row => row.join(',')).join('\n')
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url  = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href     = url
      link.download = `analytics_${dateRange}_${new Date().toISOString().slice(0,10)}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      enqueueSnackbar('Analytics CSV downloaded successfully!', { variant: 'success' })
    } catch {
      enqueueSnackbar('Export failed — please try again.', { variant: 'error' })
    }
  }

  const rangeLabel = dateRange
    .replace('last1month', 'Last 1 Month')
    .replace('last3months', 'Last 3 Months')
    .replace('last7months', 'Last 7 Months')
    .replace('this_year', 'This Year')

  return (
    <Box className="page-enter" sx={{ pb: 4 }}>
      <Helmet><title>Analytics — MediBook</title></Helmet>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <Box sx={{ display: 'flex', alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between', flexDirection: { xs: 'column', sm: 'row' }, gap: { xs: 1.5, sm: 2 }, mb: 3.5 }}>
        <Box>
          <Typography variant="h4" fontWeight={800} sx={{ color: '#202124', fontSize: { xs: '1.35rem', sm: '1.5rem' } }}>Analytics &amp; Reporting</Typography>
          <Typography variant="body2" sx={{ color: '#5F6368' }}>Insights across appointments, patients, clinicians, and revenue</Typography>
        </Box>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ flexShrink: 0, width: { xs: '100%', sm: 'auto' } }}>
          {/* FIX BUG-AF-001: controlled select wired to dateRange state */}
          <TextField
            select size="small"
            value={dateRange}
            onChange={(e) => handleDateRangeChange(e.target.value)}
            inputProps={{ 'aria-label': 'Select date range' }}
            sx={{ minWidth: { xs: '100%', sm: 160 }, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          >
            {[
              ['last1month',  'Last 1 Month'],
              ['last3months', 'Last 3 Months'],
              ['last7months', 'Last 7 Months'],
              ['this_year',   'This Year'],
            ].map(([v, l]) => <MenuItem key={v} value={v}>{l}</MenuItem>)}
          </TextField>

          {/* SUG-AF-006: Compare toggle */}
          <Button
            variant={compareMode ? 'contained' : 'outlined'}
            startIcon={<CompareArrowsRoundedIcon />}
            onClick={() => setCompareMode(c => !c)}
            aria-pressed={compareMode}
            sx={{
              borderRadius: 2, textTransform: 'none', fontWeight: 700, whiteSpace: 'nowrap',
              ...(compareMode
                ? { background: 'linear-gradient(135deg, #4285F4 0%, #1A73E8 100%)' }
                : { borderColor: '#DADCE0', color: '#202124', '&:hover': { bgcolor: '#F1F3F4', borderColor: '#9AA0A6' } }
              ),
              width: { xs: '100%', sm: 'auto' },
            }}
          >
            {compareMode ? 'Comparing' : 'Compare'}
          </Button>

          {/* FIX BUG-AF-003: wired export handler */}
          <Button
            variant="outlined"
            startIcon={<FileDownloadRoundedIcon />}
            onClick={handleExport}
            aria-label="Export analytics as CSV"
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700, whiteSpace: 'nowrap', borderColor: '#DADCE0', color: '#202124', '&:hover': { bgcolor: '#F1F3F4', borderColor: '#9AA0A6' }, width: { xs: '100%', sm: 'auto' } }}
          >Export CSV</Button>
        </Stack>
      </Box>

      {/* ── KPI Cards ───────────────────────────────────────────────────── */}
      <Grid container spacing={2.5} sx={{ mb: 3.5 }}>
        {KPIS.map((k) => (
          <Grid item xs={6} lg={3} key={k.label}>
            <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', boxShadow: 'none', height: '100%' }}>
              <CardContent sx={{ p: '20px !important' }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1.5}>
                  <Box sx={{ width: 44, height: 44, borderRadius: 2.5, bgcolor: `${k.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <k.icon sx={{ color: k.color, fontSize: '1.25rem' }} />
                  </Box>
                  <Chip
                    size="small"
                    icon={k.up ? <TrendingUpRoundedIcon sx={{ fontSize: '0.85rem !important' }} /> : <TrendingDownRoundedIcon sx={{ fontSize: '0.85rem !important' }} />}
                    label={k.delta}
                    sx={{ bgcolor: k.up ? '#E6F4EA' : '#FCE8E6', color: k.up ? '#137333' : '#A50E0E', fontWeight: 800, fontSize: '0.72rem', '& .MuiChip-icon': { color: 'inherit' } }}
                  />
                </Stack>
                <Typography variant="h4" fontWeight={800} sx={{ color: k.color, mb: 0.25 }}>{k.value}</Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>{k.label}</Typography>
                {/* SUG-AF-006: comparison panel */}
                {compareMode && (
                  <CompareBadge
                    rawValue={k.rawValue}
                    priorValue={k.priorValue}
                    label={k.label.includes('$') || k.label.includes('Revenue')
                      ? `$${k.priorValue.toLocaleString()}`
                      : String(k.priorValue)}
                  />
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* ── Timeframe toggle ────────────────────────────────────────────── */}
      <Box sx={{ mb: 2.5 }}>
        <ToggleButtonGroup
          value={timeframe} exclusive
          onChange={(_, v) => { if (v) setTimeframe(v) }}
          size="small"
          aria-label="Chart timeframe"
        >
          {[['weekly','Weekly'], ['monthly','Monthly']].map(([v,l]) => (
            <ToggleButton key={v} value={v} aria-label={`${l} view`} sx={{ textTransform: 'none', fontWeight: 700, px: 2.5, '&.Mui-selected': { bgcolor: '#E8F0FE', color: '#1A73E8', borderColor: '#AECBFA' } }}>{l}</ToggleButton>
          ))}
        </ToggleButtonGroup>
        <Typography variant="caption" sx={{ ml: 2, color: 'text.disabled' }}>
          {timeframe === 'weekly'
            ? `Showing last ${weekCount} days (${rangeLabel})`
            : `Showing last ${monthCount} month${monthCount > 1 ? 's' : ''} (${rangeLabel})`}
        </Typography>
      </Box>

      <Grid container spacing={3}>

        {/* ── Appointment Volume (Area) ── BUG-AF-001 + NEW-AF-002 fixed */}
        <Grid item xs={12} lg={8}>
          <SectionCard
            title="Appointment Volume"
            subtitle={`Bookings, completions, cancellations · ${rangeLabel}${timeframe === 'weekly' ? ' — Weekly view' : ''}`}
          >
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={apptData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <defs>
                  {[['booked','#1A73E8'], ['completed','#0F9D58'], ['cancelled','#D93025']].map(([key, color]) => (
                    <linearGradient key={key} id={`grad_${key}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={color} stopOpacity={0.15} />
                      <stop offset="95%" stopColor={color} stopOpacity={0} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
                <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: '#9AA0A6' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9AA0A6' }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ paddingTop: 12, fontSize: 12, fontWeight: 700 }} />
                <Area type="monotone" dataKey="booked"    stroke="#1A73E8" strokeWidth={2} fill="url(#grad_booked)"    />
                <Area type="monotone" dataKey="completed" stroke="#0F9D58" strokeWidth={2} fill="url(#grad_completed)" />
                <Area type="monotone" dataKey="cancelled" stroke="#D93025" strokeWidth={2} fill="url(#grad_cancelled)" />
              </AreaChart>
            </ResponsiveContainer>
          </SectionCard>
        </Grid>

        {/* ── Service Distribution (Pie) */}
        <Grid item xs={12} lg={4}>
          <SectionCard title="Service Breakdown" subtitle="Appointment types distribution">
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={SERVICE_PIX} cx="50%" cy="50%" outerRadius={75} innerRadius={45} dataKey="value" paddingAngle={3}>
                  {SERVICE_PIX.map((entry, index) => <Cell key={index} fill={entry.color} stroke="none" />)}
                </Pie>
                <Tooltip formatter={(value) => [`${value}%`, 'Share']} />
              </PieChart>
            </ResponsiveContainer>
            <Stack spacing={0.75} mt={1}>
              {SERVICE_PIX.map((s) => (
                <Stack key={s.name} direction="row" justifyContent="space-between" alignItems="center">
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: s.color, flexShrink: 0 }} />
                    <Typography variant="caption" fontWeight={600} sx={{ color: 'text.secondary' }}>{s.name}</Typography>
                  </Stack>
                  <Typography variant="caption" fontWeight={800} sx={{ color: 'text.primary' }}>{s.value}%</Typography>
                </Stack>
              ))}
            </Stack>
          </SectionCard>
        </Grid>

        {/* ── SUG-AF-003: Appointment Status Breakdown Donut ── NEW */}
        <Grid item xs={12} lg={4}>
          <SectionCard title="Appointment Status Breakdown" subtitle="Distribution by appointment outcome">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={STATUS_BREAKDOWN}
                  cx="50%" cy="50%"
                  outerRadius={85} innerRadius={52}
                  dataKey="value"
                  paddingAngle={3}
                >
                  {STATUS_BREAKDOWN.map((entry, index) => <Cell key={index} fill={entry.color} stroke="none" />)}
                </Pie>
                <Tooltip formatter={(value, name) => [`${value} appts`, name]} />
              </PieChart>
            </ResponsiveContainer>
            <Stack spacing={0.75} mt={1}>
              {STATUS_BREAKDOWN.map((s) => (
                <Stack key={s.name} direction="row" justifyContent="space-between" alignItems="center">
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: s.color, flexShrink: 0 }} />
                    <Typography variant="caption" fontWeight={600} sx={{ color: 'text.secondary' }}>{s.name}</Typography>
                  </Stack>
                  <Typography variant="caption" fontWeight={800} sx={{ color: 'text.primary' }}>{s.value}</Typography>
                </Stack>
              ))}
            </Stack>
          </SectionCard>
        </Grid>

        {/* ── Revenue (Bar) — BUG-AF-001 fixed: uses sliced revenueData */}
        <Grid item xs={12} lg={8}>
          <SectionCard title="Revenue vs Expenses" subtitle="Monthly financial overview (USD)">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={revenueData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#7A96AE' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#7A96AE' }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ paddingTop: 12, fontSize: 12, fontWeight: 700 }} />
                <Bar dataKey="revenue"  fill="#1A73E8" radius={[6,6,0,0]} name="Revenue" />
                <Bar dataKey="expenses" fill="#D93025" radius={[6,6,0,0]} name="Expenses" fillOpacity={0.8} />
                <Bar dataKey="profit"   fill="#0F9D58" radius={[6,6,0,0]} name="Profit" />
              </BarChart>
            </ResponsiveContainer>
          </SectionCard>
        </Grid>

        {/* ── Patient Growth (Stacked Bar) — BUG-AF-001 fixed: uses growthData */}
        <Grid item xs={12} lg={5}>
          <SectionCard title="Patient Growth" subtitle="New vs returning patients">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={growthData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#7A96AE' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#7A96AE' }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ paddingTop: 12, fontSize: 12, fontWeight: 700 }} />
                <Bar dataKey="returning"   fill="#1A73E8" radius={[0,0,0,0]} name="Returning" stackId="a" />
                <Bar dataKey="new_patients" fill="#0F9D58" radius={[6,6,0,0]} name="New"       stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </SectionCard>
        </Grid>

        {/* ── Clinician Utilization ────────────────────────────────────── */}
        <Grid item xs={12} lg={7}>
          <SectionCard title="Clinician Utilization" subtitle="Slot occupancy rate for the period">
            <Grid container spacing={2.5}>
              {CLINICIAN_UTIL.map((c) => (
                <Grid item xs={12} sm={6} md={4} key={c.name}>
                  <Paper sx={{ p: 2, borderRadius: 2.5, border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
                    <Typography variant="caption" fontWeight={700} sx={{ color: 'text.secondary', display: 'block', mb: 0.75, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</Typography>
                    <Typography variant="h5" fontWeight={800} sx={{ color: c.utilization >= 80 ? '#0F9D58' : c.utilization >= 60 ? '#F9AB00' : '#D93025', mb: 1 }}>{c.utilization}%</Typography>
                    <Box
                      role="progressbar"
                      aria-valuenow={c.utilization}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`${c.name} utilization`}
                      sx={{ height: 6, bgcolor: '#F1F3F4', borderRadius: 3, overflow: 'hidden' }}
                    >
                      <Box sx={{ height: '100%', width: `${c.utilization}%`, bgcolor: c.utilization >= 80 ? '#0F9D58' : c.utilization >= 60 ? '#F9AB00' : '#D93025', borderRadius: 3, transition: 'width 0.6s ease' }} />
                    </Box>
                    <Typography variant="caption" sx={{ color: 'text.secondary', mt: 0.75, display: 'block' }}>{c.booked}/{c.slots} slots</Typography>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </SectionCard>
        </Grid>

      </Grid>
    </Box>
  )
}
