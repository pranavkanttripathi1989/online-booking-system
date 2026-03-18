import React from 'react';
import { Box, Paper, Stack, Typography } from '@mui/material';
import { TrendingUp, TrendingDown, TrendingFlat } from '@mui/icons-material';

/**
 * StitchKpiCard — Reusable KPI stat card matching Stitch design system.
 * 
 * Props:
 *   title   {string}   — Card label (e.g. "Total Appointments")
 *   value   {string|number} — Main metric value (e.g. "1,284" or "$142.5k")
 *   icon    {ReactElement}  — MUI Icon element (e.g. <EventNote />)
 *   color   {string}   — Accent hex color for icon background
 *   trend   {number}   — Optional: percentage change (positive = up, negative = down)
 *   subtitle {string}  — Optional: secondary line below value
 */
export default function StitchKpiCard({ title, value, icon, color = '#006D77', trend, subtitle }) {
  const TrendIcon = trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : TrendingFlat;
  const trendColor = trend > 0 ? '#10B981' : trend < 0 ? '#EF4444' : '#94A3B8';

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.5,
        border: '1px solid',
        borderColor: '#E2E8F0',
        borderRadius: 3,
        bgcolor: 'white',
        flex: 1,
        minWidth: 160,
        transition: 'all 0.2s ease',
        '&:hover': {
          boxShadow: '0 8px 24px rgba(0,109,119,0.10)',
          transform: 'translateY(-2px)',
        },
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
        {/* Icon badge */}
        <Box
          sx={{
            width: 44,
            height: 44,
            bgcolor: `${color}1A`,
            borderRadius: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {React.cloneElement(icon, { sx: { color, fontSize: 22 } })}
        </Box>

        {/* Trend badge */}
        {trend !== undefined && (
          <Stack direction="row" alignItems="center" gap={0.3}>
            <TrendIcon sx={{ color: trendColor, fontSize: 14 }} />
            <Typography variant="caption" sx={{ color: trendColor, fontWeight: 700 }}>
              {Math.abs(trend)}%
            </Typography>
          </Stack>
        )}
      </Stack>

      <Box mt={2}>
        <Typography variant="h4" fontWeight={800} color="text.primary" lineHeight={1.1}>
          {value}
        </Typography>
        <Typography variant="caption" color="text.secondary" fontWeight={600} mt={0.5} display="block">
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="caption" color="text.disabled" mt={0.25} display="block">
            {subtitle}
          </Typography>
        )}
      </Box>
    </Paper>
  );
}
