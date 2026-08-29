import { Box, Typography, Button, alpha } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { SentimentDissatisfied, Dashboard } from '@mui/icons-material'

export default function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      minHeight="100vh"
      textAlign="center"
      p={4}
      bgcolor="background.default"
    >
      {/* Icon circle -- brand primary (was off-brand "Google Blue"; see FRONTEND_RULES.md UI-8's brand-fit rule) */}
      <Box
        sx={{
          width: 110,
          height: 110,
          borderRadius: '50%',
          bgcolor: (t) => alpha(t.palette.primary.main, t.palette.mode === 'dark' ? 0.22 : 0.12),
          border: '2px solid',
          borderColor: (t) => alpha(t.palette.primary.main, 0.4),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mb: 3,
        }}
      >
        <SentimentDissatisfied sx={{ fontSize: 58, color: 'primary.main', opacity: 0.85 }} />
      </Box>

      {/* 404 number */}
      <Typography
        variant="h1"
        fontWeight={900}
        sx={{
          fontSize: { xs: '6rem', sm: '9rem' },
          lineHeight: 1,
          background: (t) => `linear-gradient(135deg, ${t.palette.primary.light} 30%, ${t.palette.primary.main} 100%)`,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          mb: 2,
          letterSpacing: '-4px',
        }}
      >
        404
      </Typography>

      <Typography variant="h5" fontWeight={700} mb={1}>
        Page not found
      </Typography>
      <Typography variant="body1" color="text.secondary" mb={4} maxWidth={420}>
        The page you're looking for doesn't exist or has been moved. Double-check the URL or head back to your dashboard.
      </Typography>

      <Button
        variant="contained"
        size="large"
        startIcon={<Dashboard />}
        onClick={() => navigate('/dashboard')}
        sx={{
          borderRadius: 2,
          textTransform: 'none',
          fontWeight: 700,
          px: 4,
          py: 1.5,
          background: (t) => `linear-gradient(135deg, ${t.palette.primary.light} 0%, ${t.palette.primary.main} 100%)`,
          boxShadow: (t) => `0 4px 20px ${alpha(t.palette.primary.main, 0.3)}`,
          '&:hover': {
            background: (t) => `linear-gradient(135deg, ${t.palette.primary.main} 0%, ${t.palette.primary.dark} 100%)`,
            boxShadow: (t) => `0 6px 24px ${alpha(t.palette.primary.main, 0.4)}`,
          },
        }}
      >
        Go to Dashboard
      </Button>
    </Box>
  )
}
