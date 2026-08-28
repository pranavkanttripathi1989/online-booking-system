/**
 * AuthLayout — centred card wrapper for login / forgot-password / reset pages.
 */
import React from 'react'
import { Outlet, Link as RouterLink } from 'react-router-dom'
import { Box, Stack, Typography } from '@mui/material'
import MedicalServicesIcon from '@mui/icons-material/MedicalServices'

export default function AuthLayout() {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.default',
      }}
    >
      {/* Minimal nav strip */}
      <Box component="header" sx={{ bgcolor: 'background.paper', borderBottom: '1px solid', borderColor: 'divider', py: 1.5, px: 3 }}>
        <Stack
          direction="row"
          alignItems="center"
          spacing={1}
          component={RouterLink}
          to="/"
          sx={{ textDecoration: 'none', width: 'fit-content' }}
        >
          <Box
            sx={{
              width: 30,
              height: 30,
              borderRadius: '50%',
              bgcolor: 'primary.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <MedicalServicesIcon sx={{ color: 'primary.contrastText', fontSize: 15 }} />
          </Box>
          <Typography fontWeight={800} sx={{ color: 'primary.main', fontSize: '1rem' }}>
            HealthSync
          </Typography>
        </Stack>
      </Box>

      {/* Page content (LoginPage / ForgotPasswordPage renders its own layout) */}
      <Box component="main" sx={{ flex: 1 }}>
        <Outlet />
      </Box>

      {/* Minimal footer */}
      <Box component="footer" sx={{ py: 2, textAlign: 'center', borderTop: '1px solid', borderColor: 'divider' }}>
        <Typography variant="caption" color="text.secondary">
          © 2026 HealthSync Ltd · &nbsp;
          <Box component="span" sx={{ cursor: 'pointer', '&:hover': { color: 'primary.main' } }}>
            Privacy Policy
          </Box>
          &nbsp;·&nbsp;
          <Box component="span" sx={{ cursor: 'pointer', '&:hover': { color: 'primary.main' } }}>
            Terms of Service
          </Box>
        </Typography>
      </Box>
    </Box>
  )
}
