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
      {/* Icon circle — Google Blue */}
      <Box
        sx={{
          width: 110, height: 110, borderRadius: '50%',
          bgcolor: '#E8F0FE', border: '2px solid #AECBFA',
          display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 3,
        }}
      >
        <SentimentDissatisfied sx={{ fontSize: 58, color: '#1A73E8', opacity: 0.85 }} />
      </Box>

      {/* 404 number */}
      <Typography
        variant="h1"
        fontWeight={900}
        sx={{
          fontSize: { xs: '6rem', sm: '9rem' },
          lineHeight: 1,
          background: 'linear-gradient(135deg, #4285F4 30%, #1A73E8 100%)',
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
        The page you're looking for doesn't exist or has been moved. Double-check
        the URL or head back to your dashboard.
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
          px: 4, py: 1.5,
          background: 'linear-gradient(135deg, #4285F4 0%, #1A73E8 100%)',
          boxShadow: '0 4px 20px rgba(26,115,232,0.30)',
          '&:hover': {
            background: 'linear-gradient(135deg, #1A73E8 0%, #1557B0 100%)',
            boxShadow: '0 6px 24px rgba(26,115,232,0.40)',
          },
        }}
      >
        Go to Dashboard
      </Button>
    </Box>
  )
}
