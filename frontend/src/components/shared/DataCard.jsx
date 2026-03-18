import React from 'react';
import { Paper, Stack, Avatar, Box, Typography, Chip } from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';

export default function DataCard({ icon, value, label, trend, borderColor = '#006D77', subtitle }) {
  const isPositive = trend > 0;
  return (
    <Paper
      elevation={0}
      sx={{
        border: '1px solid #D0E8EA',
        borderLeft: `4px solid ${borderColor}`,
        p: 2.5,
        height: '100%',
      }}
    >
      <Stack direction="row" alignItems="flex-start" spacing={2}>
        <Avatar sx={{ bgcolor: `${borderColor}22`, color: borderColor, width: 44, height: 44 }}>
          {icon}
        </Avatar>
        <Box flex={1}>
          <Typography variant="h4" fontWeight={700} sx={{ lineHeight: 1.2 }}>
            {value}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.3 }}>
            {label}
          </Typography>
          {subtitle && (
            <Typography variant="caption" color="text.secondary">
              {subtitle}
            </Typography>
          )}
          {trend !== undefined && (
            <Chip
              size="small"
              icon={isPositive ? <TrendingUpIcon sx={{ fontSize: '14px !important' }} /> : <TrendingDownIcon sx={{ fontSize: '14px !important' }} />}
              label={`${isPositive ? '+' : ''}${trend}%`}
              color={isPositive ? 'success' : 'error'}
              sx={{ mt: 1, height: 20, fontSize: '0.65rem' }}
            />
          )}
        </Box>
      </Stack>
    </Paper>
  );
}
