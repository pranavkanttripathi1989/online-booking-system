import { Box, Card, CardContent, Typography, alpha, Skeleton } from '@mui/material'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import TrendingDownIcon from '@mui/icons-material/TrendingDown'
import RemoveIcon from '@mui/icons-material/Remove'

/**
 * KpiCard — Google Material 3 colors + progress bar + responsive
 */
export default function KpiCard({
  icon: Icon,
  label,
  value,
  trend,
  color = '#1A73E8',
  loading = false,
  prefix = '',
}) {
  const isUp   = typeof trend === 'number' ? trend > 0  : null
  const isFlat = typeof trend === 'number' && trend === 0

  // Google semantic trend colors
  const trendColor  = isFlat ? '#5F6368' : (isUp ? '#137333'  : '#A50E0E')
  const trendBg     = isFlat ? '#F8F9FA' : (isUp ? '#E6F4EA'  : '#FCE8E6')
  const trendBorder = isFlat ? '#E8EAED' : (isUp ? '#CEEAD6'  : '#F5C6C2')

  return (
    <Card sx={{
      height: '100%',
      borderRadius: { xs: 2.5, md: 3 },
      bgcolor: '#FFFFFF',
      border: '1px solid #E8EAED',
      boxShadow: '0 1px 2px rgba(32,33,36,0.08), 0 2px 6px rgba(32,33,36,0.04)',
      transition: 'transform 0.20s ease, box-shadow 0.20s ease',
      '&:hover': {
        transform: 'translateY(-3px)',
        boxShadow: '0 4px 16px rgba(32,33,36,0.16)',
      },
      overflow: 'visible',
    }}>
      <CardContent sx={{ p: { xs: '16px !important', md: '20px !important' }, height: '100%' }}>

        {/* Top row: Icon + Trend chip */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
          {/* Icon pill */}
          <Box sx={{
            width: { xs: 40, md: 48 },
            height: { xs: 40, md: 48 },
            borderRadius: 2.5,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: alpha(color, 0.10),
            border: `1.5px solid ${alpha(color, 0.20)}`,
          }}>
            {Icon && <Icon sx={{ color, fontSize: { xs: 22, md: 26 } }} />}
          </Box>

          {/* Trend badge */}
          {!loading && trend != null && (
            <Box sx={{
              display: 'flex', alignItems: 'center', gap: 0.4,
              px: 1, py: 0.4, borderRadius: 2,
              bgcolor: trendBg, border: `1px solid ${trendBorder}`,
            }}>
              {isFlat
                ? <RemoveIcon sx={{ color: trendColor, fontSize: 13 }} />
                : isUp
                  ? <TrendingUpIcon sx={{ color: trendColor, fontSize: 13 }} />
                  : <TrendingDownIcon sx={{ color: trendColor, fontSize: 13 }} />}
              <Typography sx={{ color: trendColor, fontWeight: 700, fontSize: '0.72rem', lineHeight: 1 }}>
                {isFlat ? '0%' : `${Math.abs(trend).toFixed(1)}%`}
              </Typography>
            </Box>
          )}
        </Box>

        {/* Value + Label */}
        {loading ? (
          <>
            <Skeleton variant="text" width={80} height={44} sx={{ mb: 0.5 }} />
            <Skeleton variant="text" width={120} height={18} />
          </>
        ) : (
          <>
            <Typography fontWeight={800} sx={{
              color: '#202124', letterSpacing: '-0.5px', lineHeight: 1.1, mb: 0.5,
              fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2rem' },
            }}>
              {prefix}{typeof value === 'number' ? value.toLocaleString() : (value ?? '—')}
            </Typography>
            <Typography variant="body2" noWrap sx={{
              color: '#5F6368', fontWeight: 500,
              fontSize: { xs: '0.72rem', sm: '0.8125rem' },
            }}>
              {label}
            </Typography>

            {/* Google-style progress bar */}
            {trend != null && (
              <Box sx={{ mt: { xs: 1.5, md: 2 }, height: 3, borderRadius: 2, bgcolor: alpha(color, 0.12) }}>
                <Box sx={{
                  height: '100%', borderRadius: 2, bgcolor: color,
                  width: `${Math.min(Math.abs(trend ?? 50), 100)}%`,
                  transition: 'width 1.2s cubic-bezier(0.4, 0, 0.2, 1)',
                }} />
              </Box>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
