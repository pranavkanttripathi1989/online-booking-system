import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Box, Typography, Paper, useTheme, useMediaQuery, alpha } from '@mui/material'

// ─── Google 8-ramp chart colors ──────────────────────────────────────────────
const COLOURS = ['#4285F4', '#0F9D58', '#F9AB00', '#D93025', '#9334E6', '#FA7B17', '#009688', '#EA4335']

// ─── Mock data ─────────────────────────────────────────────────────────────────
const MOCK = [
  { service_name: 'General Consultation', count: 42 },
  { service_name: 'Physiotherapy', count: 28 },
  { service_name: 'Dental Check-up', count: 19 },
  { service_name: 'Cardiology Review', count: 14 },
  { service_name: 'Dermatology', count: 11 },
]

// ─── Custom Tooltip ────────────────────────────────────────────────────────────
function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const { name, value } = payload[0]
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        borderRadius: 3,
        minWidth: 160,
        border: '1px solid #E8EAED',
        boxShadow: '0 4px 20px rgba(32,33,36,0.18)',
        bgcolor: '#FFFFFF',
      }}
    >
      <Typography variant="caption" fontWeight={700} display="block" mb={0.5} sx={{ color: '#202124' }}>
        {name}
      </Typography>
      <Typography variant="caption" sx={{ color: '#5F6368' }}>
        Bookings:{' '}
      </Typography>
      <Typography variant="caption" fontWeight={700} sx={{ color: '#202124' }}>
        {value}
      </Typography>
    </Paper>
  )
}

// ─── Custom Legend ─────────────────────────────────────────────────────────────
function CustomLegend({ payload, isMobile }) {
  const items = isMobile ? payload?.slice(0, 4) : payload
  return (
    <Box display="flex" flexDirection="column" gap={0.75} pl={isMobile ? 0 : 1} mt={isMobile ? 1 : 0}>
      {items?.map((entry, idx) => (
        <Box key={idx} display="flex" alignItems="center" gap={1}>
          <Box sx={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: entry.color, flexShrink: 0 }} />
          <Typography variant="caption" sx={{ color: '#5F6368' }} noWrap sx2={{ maxWidth: 130 }}>
            {entry.value}
          </Typography>
          <Typography
            variant="caption"
            fontWeight={700}
            sx={{
              ml: 'auto',
              pl: 1,
              px: 1,
              py: 0.25,
              bgcolor: alpha(entry.color, 0.12),
              color: entry.color,
              borderRadius: '6px',
              fontSize: '0.68rem',
            }}
          >
            {entry.payload?.count ?? ''}
          </Typography>
        </Box>
      ))}
    </Box>
  )
}

// ─── Chart ─────────────────────────────────────────────────────────────────────
export default function ServicePieChart({ data }) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const chartData = data && data.length > 0 ? data : MOCK
  const total = chartData.reduce((s, d) => s + (d.count ?? d.value ?? 0), 0)

  return (
    <Box>
      <Typography variant="subtitle1" fontWeight={700} mb={2} sx={{ color: '#202124', fontSize: { xs: '0.875rem', md: '0.9375rem' } }}>
        Bookings by Service
      </Typography>
      <ResponsiveContainer width="100%" height={isMobile ? 240 : 260}>
        <PieChart>
          <Pie
            data={chartData}
            dataKey="count"
            nameKey="service_name"
            cx={isMobile ? '50%' : '38%'}
            cy="50%"
            outerRadius={90}
            innerRadius={52}
            paddingAngle={3}
            strokeWidth={0}
            isAnimationActive
            animationBegin={0}
            animationDuration={900}
          >
            {chartData.map((_, idx) => (
              <Cell key={idx} fill={COLOURS[idx % COLOURS.length]} />
            ))}
          </Pie>

          {/* Center label — total */}
          <text
            x={isMobile ? '50%' : '38%'}
            y="46%"
            textAnchor="middle"
            dominantBaseline="middle"
            style={{ fontSize: 20, fontWeight: 800, fill: '#202124', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            {total}
          </text>
          <text
            x={isMobile ? '50%' : '38%'}
            y="60%"
            textAnchor="middle"
            style={{ fontSize: 11, fill: '#9AA0A6', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            Total
          </text>

          <Tooltip content={<CustomTooltip />} />
          <Legend
            layout={isMobile ? 'horizontal' : 'vertical'}
            align={isMobile ? 'center' : 'right'}
            verticalAlign={isMobile ? 'bottom' : 'middle'}
            content={<CustomLegend isMobile={isMobile} />}
          />
        </PieChart>
      </ResponsiveContainer>
    </Box>
  )
}
