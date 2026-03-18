import {
  ResponsiveContainer,
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

// ─── Mock data ─────────────────────────────────────────────────────────────────
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
// Returns true when val is a proper ISO-style date string (YYYY-MM-DD or with T)
const isDateString = (val) => typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val)

// ─── Custom Tooltip ─────────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const displayLabel = isDateString(label) ? dayjs(label).format('ddd, MMM D') : label
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
export default function AppointmentVolumeChart({ data }) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const chartData = (data && data.length > 0) ? data : generateMockData()

  // If data uses short labels (Mon/Tue) show every tick; otherwise show weekly ticks for 30-day view
  const isShortLabels = chartData.length > 0 && !isDateString(chartData[0]?.date)
  const tickFormatter = (val, idx) => {
    if (isShortLabels) return val  // show Mon, Tue, etc. as-is
    return idx % 7 === 0 ? dayjs(val).format('MMM D') : ''
  }

  const TICK_STYLE = { fontSize: isMobile ? 10 : 11, fill: '#9AA0A6', fontFamily: 'Plus Jakarta Sans' }

  return (
    <Box>
      {/* Header row with period pills */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="subtitle1" fontWeight={700}
          sx={{ color: '#202124', fontSize: { xs: '0.875rem', md: '0.9375rem' } }}>
          Appointment Volume — Last 30 Days
        </Typography>
        <Box sx={{ display: { xs: 'none', sm: 'flex' }, gap: 0.5 }}>
          {['7D', '14D', '30D'].map((p) => (
            <Box key={p} sx={{
              px: 1.5, py: 0.4, borderRadius: 2, cursor: 'pointer',
              bgcolor: p === '30D' ? '#E8F0FE' : '#F8F9FA',
              color: p === '30D' ? '#1A73E8' : '#5F6368',
              border: '1px solid ' + (p === '30D' ? '#AECBFA' : '#E8EAED'),
              fontSize: '0.72rem', fontWeight: 700,
              transition: 'all 0.15s ease',
              '&:hover': { bgcolor: '#E8F0FE', color: '#1A73E8' },
            }}>{p}</Box>
          ))}
        </Box>
      </Box>

      <ResponsiveContainer width="100%" height={isMobile ? 200 : 260}>
        <LineChart data={chartData} margin={{ top: 4, right: 16, bottom: 0, left: -10 }}>
          <CartesianGrid strokeDasharray="4 4" stroke="#E8EAED" />
          <XAxis dataKey="date" tickFormatter={tickFormatter} tick={TICK_STYLE} axisLine={false} tickLine={false} />
          <YAxis allowDecimals={false} tick={TICK_STYLE} axisLine={false} tickLine={false} />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            formatter={(val) => (val === 'confirmed_count' ? 'Confirmed' : 'Cancelled')}
            wrapperStyle={{ fontSize: 12, fontFamily: 'Plus Jakarta Sans', color: '#5F6368', paddingTop: 8 }}
          />
          <Line
            type="monotone" dataKey="confirmed_count"
            stroke="#1A73E8" strokeWidth={2.5} dot={false}
            activeDot={{ r: 5, fill: '#1A73E8', stroke: '#fff', strokeWidth: 2 }}
          />
          <Line
            type="monotone" dataKey="cancelled_count"
            stroke="#D93025" strokeWidth={2.5} dot={false}
            activeDot={{ r: 5, fill: '#D93025', stroke: '#fff', strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </Box>
  )
}
