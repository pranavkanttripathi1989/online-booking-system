import { Box, Button, Typography, Paper } from '@mui/material'
import RefreshIcon from '@mui/icons-material/Refresh'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'

/**
 * ErrorFallback — drop-in component for useQuery / React Error Boundary failures.
 *
 * Usage with Apollo:
 *   const { data, loading, error, refetch } = useQuery(...)
 *   if (error) return <ErrorFallback error={error} onRetry={refetch} />
 *
 * Usage as React Error Boundary fallback:
 *   <ErrorBoundary FallbackComponent={ErrorFallback} />
 */
export default function ErrorFallback({ error, onRetry, resetErrorBoundary }) {
  const retry = onRetry ?? resetErrorBoundary
  const message = error?.message ?? 'Something went wrong. Please try again.'

  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      py={8}
      px={3}
      textAlign="center"
    >
      {/* Google Red icon circle */}
      <Box sx={{
        width: 80, height: 80, borderRadius: '50%',
        bgcolor: '#FCE8E6', border: '2px solid #F5C6C2',
        display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2.5,
      }}>
        <ErrorOutlineIcon sx={{ fontSize: 44, color: '#D93025' }} />
      </Box>

      <Typography variant="h6" fontWeight={700} sx={{ color: '#202124' }} mb={0.75}>
        Failed to load data
      </Typography>

      <Paper elevation={0} sx={{
        maxWidth: 420, mb: 3, px: 2.5, py: 1.5, borderRadius: 2,
        bgcolor: '#F8F9FA', border: '1px solid #E8EAED',
      }}>
        <Typography variant="body2" sx={{ fontFamily: 'monospace', color: '#5F6368', wordBreak: 'break-all' }}>
          {message}
        </Typography>
      </Paper>

      {retry && (
        <Button
          variant="contained"
          startIcon={<RefreshIcon />}
          onClick={retry}
          sx={{
            borderRadius: 2, fontWeight: 700, textTransform: 'none', px: 3,
            background: 'linear-gradient(135deg, #4285F4 0%, #1A73E8 100%)',
            '&:hover': { boxShadow: '0 4px 14px rgba(26,115,232,0.35)' },
          }}
        >
          Try Again
        </Button>
      )}
    </Box>
  )
}
