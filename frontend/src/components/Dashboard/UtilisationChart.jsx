import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  LabelList,
} from 'recharts'
import { Box, Typography, useTheme, useMediaQuery, Paper } from '@mui/material'

// ─── Google traffic-light thresholds ──────────────────────────────────────────
const barColor = (pct) => {
  if (pct < 50)  return '#D93025'   // Google Red — Low
  if (pct < 75)  return '#F9AB00'   // Google Yellow — OK
  return '#0F9D58'                  // Google Green — Great
}

// ─── Mock data ─────────────────────────────────────────────────────────────────
const MOCK = [
  { name: 'Dr Smith',   utilisation_percent: 82 },
  { name: 'Dr Patel',   utilisation_percent: 61 },
  { name: 'Dr Nguyen',  utilisation_percent: 44 },
  { name: 'Dr Müller',  utilisation_percent: 78 },
  { name: 'Dr Jones',   utilisation_percent: 55 },
]

// ─── Custom Tooltip ────────────────────────────────────────────────────────────
function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <Paper elevation={0} sx={{
      p: 2, borderRadius: 3, minWidth: 160,
      border: '1px solid #E8EAED',
      boxShadow: '0 4px 20px rgba(32,33,36,0.18)',
      bgcolor: '#FFFFFF',
    }}>
      <Typography variant="caption" fontWeight={700} display="block" mb={0.5} sx={{ color: '#202124' }}>
        {d.name}
      </Typography>
      <Typography variant="caption" sx={{ color: '#5F6368' }}>Utilisation: </Typography>
      <Typography variant="caption" fontWeight={700} sx={{ color: barColor(d.utilisation_percent) }}>
        {d.utilisation_percent}%
      </Typography>
      {d.slots_booked != null && (
        <Typography variant="caption" sx={{ color: '#5F6368', display: 'block', mt: 0.25 }}>
          {d.slots_booked} / {d.slots_available} slots
        </Typography>
      )}
    </Paper>
  )
}

// ─── Chart ─────────────────────────────────────────────────────────────────────
export default function UtilisationChart({ data }) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  const allData = (data && data.length > 0)
    ? data.map((d) => ({
        name: d.clinician?.full_name ?? 'Unknown',
        utilisation_percent: Math.round(d.utilisation_percent ?? 0),
        slots_booked: d.slots_booked,
        slots_available: d.slots_available,
      }))
    : MOCK

  // Limit to 4 on mobile
  const chartData = allData.slice(0, isMobile ? 4 : 99)

  const TICK_STYLE = { fontSize: isMobile ? 10 : 11, fill: '#9AA0A6', fontFamily: 'Plus Jakarta Sans' }

  return (
    <Box>
      <Typography variant="subtitle1" fontWeight={700} mb={2}
        sx={{ color: '#202124', fontSize: { xs: '0.875rem', md: '0.9375rem' } }}>
        Clinician Utilisation
      </Typography>
      <ResponsiveContainer width="100%" height={isMobile ? 200 : 240}>
        <BarChart data={chartData} margin={{ top: 20, right: 16, bottom: 0, left: -10 }}>
          <CartesianGrid strokeDasharray="4 4" stroke="#E8EAED" vertical={false} />
          <XAxis dataKey="name" tick={TICK_STYLE} axisLine={false} tickLine={false} />
          <YAxis
            domain={[0, 100]}
            tickFormatter={(v) => `${v}%`}
            tick={TICK_STYLE}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(32,33,36,0.04)' }} />
          <Bar dataKey="utilisation_percent" radius={[8, 8, 0, 0]} maxBarSize={52}>
            {chartData.map((entry, idx) => (
              <Cell key={idx} fill={barColor(entry.utilisation_percent)} />
            ))}
            <LabelList
              dataKey="utilisation_percent"
              position="top"
              formatter={(v) => `${v}%`}
              style={{
                fontSize: isMobile ? 0 : 11,
                fontWeight: 800, fill: '#202124',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
              }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Google traffic-light legend */}
      <Box display="flex" gap={2.5} mt={1.5} justifyContent="center" flexWrap="wrap">
        {[
          { label: '< 50% — Low',   color: '#D93025' },
          { label: '50–75% — OK',   color: '#F9AB00' },
          { label: '> 75% — Great', color: '#0F9D58' },
        ].map(({ label, color }) => (
          <Box key={label} display="flex" alignItems="center" gap={0.75}>
            <Box sx={{ width: 10, height: 10, borderRadius: '3px', backgroundColor: color }} />
            <Typography variant="caption" sx={{ color: '#5F6368' }}>{label}</Typography>
          </Box>
        ))}
      </Box>
    </Box>
  )
}
