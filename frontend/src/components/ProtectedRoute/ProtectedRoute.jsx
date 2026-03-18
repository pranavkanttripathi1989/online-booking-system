import { Outlet, Navigate } from 'react-router-dom'
import { Box, CircularProgress, Typography } from '@mui/material'
import { useAuth } from '../../context/AuthContext'

export default function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
        gap={2}
        bgcolor="background.default"
      >
        <CircularProgress size={44} thickness={4} />
        <Typography variant="body2" color="text.secondary">
          Checking your session…
        </Typography>
      </Box>
    )
  }

  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />
}
