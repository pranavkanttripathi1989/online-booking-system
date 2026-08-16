/**
 * PublicLayout — wrapper for pages accessible without login (Landing, DoctorProfile, etc.)
 * Includes a sticky top header with HealthSync branding and a footer.
 */
import React, { useState } from 'react';
import { Outlet, Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  AppBar, Toolbar, Box, Typography, Button, Container, Stack, Divider,
  IconButton, Drawer, List, ListItem, ListItemButton, ListItemText,
  useMediaQuery, useTheme,
} from '@mui/material';
import MedicalServicesIcon from '@mui/icons-material/MedicalServices';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';

const NAV_LINKS = [
  { label: 'Find a Doctor', href: '/#search' },
  { label: 'How It Works',  href: '/#how-it-works' },
  { label: 'Specialties',   href: '/#specialties' },
  { label: 'For Clinicians',href: '/login' },
];

export default function PublicLayout() {
  const navigate   = useNavigate();
  const theme      = useTheme();
  const isMobile   = useMediaQuery(theme.breakpoints.down('md'));
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* ── Top Navigation ──────────────────────────────────────────────────── */}
      <AppBar
        position="sticky"
        elevation={0}
        sx={{ bgcolor: '#fff', borderBottom: '1px solid #D0E8EA', color: 'text.primary' }}
      >
        <Toolbar sx={{ gap: 2 }}>
          {/* Logo */}
          <Stack direction="row" alignItems="center" spacing={1} component={RouterLink} to="/" sx={{ textDecoration: 'none', color: 'inherit' }}>
            <Box sx={{ width: 32, height: 32, borderRadius: '50%', bgcolor: '#006D77', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <MedicalServicesIcon sx={{ color: '#fff', fontSize: 16 }} />
            </Box>
            <Typography fontWeight={800} sx={{ color: '#006D77', fontSize: '1.1rem' }}>HealthSync</Typography>
          </Stack>

          {/* Desktop nav */}
          {!isMobile && (
            <Stack direction="row" spacing={3} sx={{ flex: 1, ml: 4 }}>
              {NAV_LINKS.map((link) => (
                <Button
                  key={link.label}
                  component="a" href={link.href}
                  sx={{ color: 'text.secondary', fontWeight: 600, '&:hover': { color: '#006D77' } }}
                >
                  {link.label}
                </Button>
              ))}
            </Stack>
          )}

          <Box sx={{ flex: 1 }} />

          {!isMobile ? (
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Button onClick={() => navigate('/get-started')} sx={{ fontWeight: 700 }}>For Clinics</Button>
              <Button variant="outlined" onClick={() => navigate('/login')} sx={{ fontWeight: 700 }}>Sign In</Button>
              <Button variant="contained" onClick={() => navigate('/login')} sx={{ fontWeight: 700 }}>Book Now</Button>
            </Stack>
          ) : (
            <IconButton onClick={() => setDrawerOpen(true)} aria-label="Open navigation menu">
              <MenuIcon />
            </IconButton>
          )}
        </Toolbar>
      </AppBar>

      {/* Mobile Drawer */}
      <Drawer anchor="right" open={drawerOpen} onClose={() => setDrawerOpen(false)} PaperProps={{ sx: { width: 280 } }}>
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'flex-end' }}>
          <IconButton onClick={() => setDrawerOpen(false)} aria-label="Close navigation">
            <CloseIcon />
          </IconButton>
        </Box>
        <List>
          {NAV_LINKS.map((link) => (
            <ListItem key={link.label} disablePadding>
              <ListItemButton component="a" href={link.href} onClick={() => setDrawerOpen(false)}>
                <ListItemText primary={link.label} primaryTypographyProps={{ fontWeight: 600 }} />
              </ListItemButton>
            </ListItem>
          ))}
          <ListItem sx={{ pt: 2 }}>
            <Button fullWidth variant="contained" onClick={() => navigate('/login')} sx={{ fontWeight: 700 }}>Sign In / Book</Button>
          </ListItem>
          <ListItem>
            <Button fullWidth variant="outlined" onClick={() => navigate('/get-started')} sx={{ fontWeight: 700 }}>Run a clinic? Get started</Button>
          </ListItem>
        </List>
      </Drawer>

      {/* ── Page Content ────────────────────────────────────────────────────── */}
      <Box component="main" sx={{ flex: 1 }}>
        <Outlet />
      </Box>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <Box component="footer" sx={{ bgcolor: '#003B42', color: '#fff', py: 5, mt: 'auto' }}>
        <Container maxWidth="lg">
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={{ xs: 4, md: 8 }}>
            {/* Brand */}
            <Box sx={{ flex: 1 }}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                <Box sx={{ width: 28, height: 28, borderRadius: '50%', bgcolor: '#83C5BE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <MedicalServicesIcon sx={{ color: '#003B42', fontSize: 14 }} />
                </Box>
                <Typography fontWeight={800} sx={{ fontSize: '1.1rem' }}>HealthSync</Typography>
              </Stack>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)', maxWidth: 260 }}>
                Connecting patients with the right clinicians, faster and simpler.
              </Typography>
            </Box>

            {/* Links */}
            {[
              { title: 'Patients',   items: ['Find a Doctor', 'Book Appointment', 'Video Consultation', 'Medical Records'] },
              { title: 'Clinicians', items: ['Join HealthSync', 'Clinician Portal', 'Availability Manager', 'Billing'] },
              { title: 'Company',    items: ['About Us', 'Blog', 'Careers', 'Contact'] },
            ].map(({ title, items }) => (
              <Box key={title}>
                <Typography variant="body2" fontWeight={700} sx={{ mb: 1.5, textTransform: 'uppercase', letterSpacing: 0.5, color: '#83C5BE' }}>{title}</Typography>
                <Stack spacing={0.75}>
                  {items.map((item) => (
                    <Typography key={item} variant="body2" sx={{ color: 'rgba(255,255,255,0.6)', cursor: 'pointer', '&:hover': { color: '#fff' } }}>{item}</Typography>
                  ))}
                </Stack>
              </Box>
            ))}
          </Stack>

          <Divider sx={{ my: 3, borderColor: 'rgba(255,255,255,0.1)' }} />
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems="center" spacing={1}>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.45)' }}>
              © 2026 HealthSync Ltd. All rights reserved. Registered in England & Wales.
            </Typography>
            <Stack direction="row" spacing={2}>
              {['Privacy Policy', 'Terms of Service', 'Cookie Policy'].map((item) => (
                <Typography key={item} variant="caption" sx={{ color: 'rgba(255,255,255,0.45)', cursor: 'pointer', '&:hover': { color: '#83C5BE' } }}>{item}</Typography>
              ))}
            </Stack>
          </Stack>
        </Container>
      </Box>
    </Box>
  );
}
