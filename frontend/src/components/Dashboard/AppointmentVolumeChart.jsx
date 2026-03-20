import { useState } from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import { Box, Typography, useTheme, useMediaQuery, Paper } from '@mui/material'
import dayjs from 'dayjs'

// ─── Internal mock data (30 real days) ────────────────────────────────────────
// SUG-DASH-001 / BUG-DASH-001 fix: chart needs 30 days of data so the 7D/14D
// toggle has meaningful slices to show.
const generateMockData = () => {
  const data = []
  for (let i = 29; i >= 0; i--) {
    data.push({
      date: dayjs().subtract(i, 'day').format('YYYY-MM-DD'),
      confirmed_count: Math.floor(Math.random() * 20) + 5,
      cancelled_count: Math.floor(Math.random() * 5),
    })
  }
  return data
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const isDateString = (val) => typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val)

// Day-range options
const RANGES = [
  { label: '7D',  days: 7  },
  { label: '14D', days: 14 },
  { label: '30D', days: 30 },
]

// ─── Custom Tooltip ─────────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const displayLabel = isDateString(label) ? dayjs(label).format('ddd, DD MMM') : label
  return (
    <Paper elevation={0} sx={{
      p: 2, borderRadius: 3, minWidth: 170,
      border: '1px solid #E8EAED',
      boxShadow: '0 4px 20px rgba(32,33,36,0.18)',
      bgcolor: '#FFFFFF',
    }}>
      <Typography variant="caption" fontWeight={700} display="block" mb={0.75} sx={{ color: '#202124' }}>
        {displayLabel}
      </Typography>
      {payload.map((entry) => (
        <Box key={entry.name} display="flex" alignItems="center" gap={1} mb={0.25}>
          <Box sx={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: entry.color, flexShrink: 0 }} />
          <Typography variant="caption" sx={{ color: '#5F6368', textTransform: 'capitalize' }}>
            {entry.name === 'confirmed_count' ? 'Confirmed' : entry.name === 'cancelled_count' ? 'Cancelled' : entry.name}:
          </Typography>
          <Typography variant="caption" fontWeight={700} sx={{ color: '#202124' }}>
            {entry.value}
          </Typography>
        </Box>
      ))}
    </Paper>
  )
}

// ─── Chart ─────────────────────────────────────────────────────────────────────
// BUG-DASH-001 FIX: chartRange state now lives inside this component.
// The 7D/14D/30D pills have onClick handlers → chartRange updates → chartData
// is re-sliced → chart re-renders with the correct data and title.
// SUG-DASH-005: Switched from LineChart to stacked BarChart per suggestion.
export default function AppointmentVolumeChart({ data }) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  // BUG-DASH-001: chartRange state + reactive data slicing
  const [chartRange, setChartRange] = useState(30)

  // Use passed-in data if it has 30 days; fall back to generated mock
  const fullData = (data && data.length >= 7) ? data : generateMockData()

  // Slice to the selected range (last N entries)
  const chartData = fullData.slice(-chartRange)

  // Reactive title (BUG-DASH-001)
  const chartTitle = `Appointment Volume — Last ${chartRange} Days`

  // Tick formatter — for short labels (Mon/Tue) show all; for ISO dates thin out
  const isShortLabels = chartData.length > 0 && !isDateString(chartData[0]?.date)
  const tickFormatter = (val, idx) => {
    if (isShortLabels) return val
    const step = chartRange <= 7 ? 1 : chartRange <= 14 ? 2 : 7
    return idx % step === 0 ? dayjs(val).format('DD MMM') : ''
  }

  const TICK_STYLE = { fontSize: isMobile ? 10 : 11, fill: '#9AA0A6', fontFamily: 'Plus Jakarta Sans' }

  return (
    <Box>
      {/* Header row with period pills — BUG-DASH-001 fix: onClick → setChartRange */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="subtitle1" fontWeight={700}
          sx={{ color: '#202124', fontSize: { xs: '0.875rem', md: '0.9375rem' } }}>
          {chartTitle}
        </Typography>
        <Box sx={{ display: { xs: 'none', sm: 'flex' }, gap: 0.5 }}>
          {RANGES.map(({ label, days }) => {
            const isActive = chartRange === days
            return (
              <Box
                key={label}
                onClick={() => setChartRange(days)}
                sx={{
                  px: 1.5, py: 0.4, borderRadius: 2, cursor: 'pointer',
                  bgcolor: isActive ? '#E8F0FE' : '#F8F9FA',
                  color:   isActive ? '#1A73E8' : '#5F6368',
                  border: '1px solid ' + (isActive ? '#AECBFA' : '#E8EAED'),
                  fontSize: '0.72rem', fontWeight: 700,
                  transition: 'all 0.15s ease',
                  userSelect: 'none',
                  '&:hover': { bgcolor: '#E8F0FE', color: '#1A73E8' },
                }}
              >
                {label}
              </Box>
            )
          })}
        </Box>
      </Box>

      {/* SUG-DASH-005: Stacked BarChart (was LineChart) */}
      <ResponsiveContainer width="100%" height={isMobile ? 200 : 260}>
        <BarChart data={chartData} margin={{ top: 4, right: 16, bottom: 0, left: -10 }}>
          <CartesianGrid strokeDasharray="4 4" stroke="#E8EAED" vertical={false} />
          <XAxis dataKey="date" tickFormatter={tickFormatter} tick={TICK_STYLE} axisLine={false} tickLine={false} />
          <YAxis allowDecimals={false} tick={TICK_STYLE} axisLine={false} tickLine={false} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(32,33,36,0.04)' }} />
          <Legend
            formatter={(val) => (val === 'confirmed_count' ? 'Confirmed' : 'Cancelled')}
            wrapperStyle={{ fontSize: 12, fontFamily: 'Plus Jakarta Sans', color: '#5F6368', paddingTop: 8 }}
          />
          <Bar dataKey="confirmed_count" name="confirmed_count" fill="#1A73E8" radius={[4, 4, 0, 0]} stackId="a" />
          <Bar dataKey="cancelled_count" name="cancelled_count" fill="#D93025" radius={[4, 4, 0, 0]} stackId="a" />
        </BarChart>
      </ResponsiveContainer>
    </Box>
  )
}
