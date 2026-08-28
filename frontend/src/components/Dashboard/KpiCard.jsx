import { Box, Card, CardContent, Typography, Skeleton } from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import TrendingDownIcon from '@mui/icons-material/TrendingDown'
import RemoveIcon from '@mui/icons-material/Remove'

/**
 * KpiCard — Google Material 3 colors + progress bar + responsive
 */
export default function KpiCard({ icon: Icon, label, value, trend, color, loading = false, prefix = '' }) {
  const theme = useTheme()
  const resolvedColor = color ?? theme.palette.primary.main
  const isUp = typeof trend === 'number' ? trend > 0 : null
  const isFlat = typeof trend === 'number' && trend === 0
  const isDark = theme.palette.mode === 'dark'

  // BUG047 Phase 1 -- trend up/down/flat is a semantic tone (success/error/
  // neutral), derived from the theme instead of hand-picked hex.
  const trendGroup = isFlat ? null : isUp ? theme.palette.success : theme.palette.error
  const trendColor = isFlat ? theme.palette.text.secondary : isDark ? trendGroup.light : trendGroup.dark
  const trendBg = isFlat ? theme.palette.action.selected : alpha(trendGroup.main, isDark ? 0.2 : 0.12)
  const trendBorder = isFlat ? theme.palette.divider : alpha(trendGroup.main, isDark ? 0.4 : 0.28)

  return (
    <Card
      sx={{
        height: '100%',
        borderRadius: { xs: 2.5, md: 3 },
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        boxShadow: '0 1px 2px rgba(32,33,36,0.08), 0 2px 6px rgba(32,33,36,0.04)',
        transition: 'transform 0.20s ease, box-shadow 0.20s ease',
        '&:hover': {
          transform: 'translateY(-3px)',
          boxShadow: '0 4px 16px rgba(32,33,36,0.16)',
        },
        overflow: 'visible',
      }}
    >
      <CardContent sx={{ p: { xs: '16px !important', md: '20px !important' }, height: '100%' }}>
        {/* Top row: Icon + Trend chip */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
          {/* Icon pill */}
          <Box
            sx={{
              width: { xs: 40, md: 48 },
              height: { xs: 40, md: 48 },
              borderRadius: 2.5,
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: alpha(resolvedColor, 0.1),
              border: `1.5px solid ${alpha(resolvedColor, 0.2)}`,
            }}
          >
            {Icon && <Icon sx={{ color: resolvedColor, fontSize: { xs: 22, md: 26 } }} />}
          </Box>

          {/* Trend badge */}
          {!loading && trend != null && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.4,
                px: 1,
                py: 0.4,
                borderRadius: 2,
                bgcolor: trendBg,
                border: `1px solid ${trendBorder}`,
              }}
            >
              {isFlat ? (
                <RemoveIcon sx={{ color: trendColor, fontSize: 13 }} />
              ) : isUp ? (
                <TrendingUpIcon sx={{ color: trendColor, fontSize: 13 }} />
              ) : (
                <TrendingDownIcon sx={{ color: trendColor, fontSize: 13 }} />
              )}
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
            <Typography
              fontWeight={800}
              sx={{
                color: 'text.primary',
                letterSpacing: '-0.5px',
                lineHeight: 1.1,
                mb: 0.5,
                fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2rem' },
              }}
            >
              {prefix}
              {typeof value === 'number' ? value.toLocaleString() : (value ?? '—')}
            </Typography>
            <Typography
              variant="body2"
              noWrap
              sx={{
                color: 'text.secondary',
                fontWeight: 500,
                fontSize: { xs: '0.72rem', sm: '0.8125rem' },
              }}
            >
              {label}
            </Typography>

            {/* Google-style progress bar */}
            {trend != null && (
              <Box sx={{ mt: { xs: 1.5, md: 2 }, height: 3, borderRadius: 2, bgcolor: alpha(resolvedColor, 0.12) }}>
                <Box
                  sx={{
                    height: '100%',
                    borderRadius: 2,
                    bgcolor: resolvedColor,
                    width: `${Math.min(Math.abs(trend ?? 50), 100)}%`,
                    transition: 'width 1.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                />
              </Box>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
