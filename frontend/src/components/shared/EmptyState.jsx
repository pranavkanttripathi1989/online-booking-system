import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import InboxIcon from '@mui/icons-material/Inbox';

export default function EmptyState({
  icon: Icon = InboxIcon,
  title = 'No data found',
  subtitle = 'Try adjusting your filters or add new items.',
  actionLabel,
  onAction,
  sx = {},
}) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        py: 8,
        px: 3,
        textAlign: 'center',
        ...sx,
      }}
    >
      <Box
        sx={{
          width: 72,
          height: 72,
          borderRadius: '50%',
          bgcolor: '#E8F8F9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mb: 2,
        }}
      >
        <Icon sx={{ fontSize: 36, color: '#83C5BE' }} />
      </Box>
      <Typography variant="h5" fontWeight={600} color="text.primary" gutterBottom>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 320 }}>
        {subtitle}
      </Typography>
      {actionLabel && onAction && (
        <Button variant="contained" onClick={onAction} sx={{ mt: 3 }}>
          {actionLabel}
        </Button>
      )}
    </Box>
  );
}
