import { useState, useEffect, useCallback } from 'react'
import { Outlet } from 'react-router-dom'
import { Box, Toolbar, Avatar, Menu, MenuItem, ListItemIcon, Divider, Typography, IconButton } from '@mui/material'
import { PersonOutlineRounded, SettingsOutlined, LogoutRounded, DarkModeRounded, LightModeRounded, ViewSidebarRounded } from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import { useApolloClient } from '@apollo/client'

import Sidebar, { DRAWER_WIDTH } from './Sidebar'
import Navbar from './Navbar'
import TopNav from './TopNav'
import AppBreadcrumbs from './AppBreadcrumbs'
import MobileBottomNav from './MobileBottomNav'
import GlobalSearch from '../GlobalSearch'
import NotificationPanel from '../NotificationPanel'
import { useAuth } from '../../context/AuthContext'
import { useThemeMode } from '../../context/ThemeContext'

const TOP_NAV_HEIGHT = 60 // px (TopNav bar height)

export default function Layout() {
  const [mobileOpen,  setMobileOpen]  = useState(false)
  // BUG-NAV-002 FIX: read 'medibook_nav_layout' first, fall back to legacy 'hs_nav_layout'
  // so user preference persisted by AppShell is respected on first launch
  const [navLayout,   setNavLayout]   = useState(() => {
    try {
      return localStorage.getItem('medibook_nav_layout')
          ?? localStorage.getItem('hs_nav_layout')
          ?? 'left'
    } catch { return 'left' }
  })

  // Shared state hoisted here so TopNav and Navbar can trigger the same panels
  const [searchOpen, setSearchOpen] = useState(false)
  const [notifOpen,  setNotifOpen]  = useState(false)
  const [userMenuAnchor, setUserMenuAnchor] = useState(null)

  const { user, logout } = useAuth()
  const { mode, toggle: toggleMode } = useThemeMode()
  const navigate = useNavigate()
  const client   = useApolloClient()

  const displayName = user?.name ?? 'Admin User'
  const initials    = displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  const isDark      = mode === 'dark'

  const toggleLayout = useCallback(() => {
    setNavLayout(prev => {
      const next = prev === 'left' ? 'top' : 'left'
      try { localStorage.setItem('medibook_nav_layout', next) } catch {}
      return next
    })
  }, [])

  const isTopNav = navLayout === 'top'

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>

      {/* ── Sidebar (left layout only) ──────────────────────────────────── */}
      {!isTopNav && (
        <Sidebar
          mobileOpen={mobileOpen}
          onMobileClose={() => setMobileOpen(false)}
        />
      )}

      {/* ── TopNav (top layout only) ────────────────────────────────────── */}
      {isTopNav && (
        <TopNav
          onToggleLayout={toggleLayout}
          onOpenSearch={() => setSearchOpen(true)}
          onOpenNotif={() => setNotifOpen(true)}
          onOpenUserMenu={(e) => setUserMenuAnchor(e.currentTarget)}
        />
      )}

      {/* ── Main area ─────────────────────────────────────────────────────── */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: isTopNav ? '100%' : { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          ml:    isTopNav ? 0       : { md: `${DRAWER_WIDTH}px` },
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          bgcolor: 'background.default',
          transition: 'margin-left 0.3s ease, width 0.3s ease',
        }}
      >
        {/* Navbar (always shown — in top mode it still shows the inner AppBar) */}
        {!isTopNav && (
          <Navbar
            onMobileMenuClick={() => setMobileOpen(v => !v)}
            navLayout={navLayout}
            onToggleLayout={toggleLayout}
          />
        )}

        {/* Spacer - below fixed header */}
        <Toolbar sx={{
          minHeight: isTopNav
            ? `${TOP_NAV_HEIGHT + 2.5}px !important`  // TopNav height + accent strip
            : { xs: '60px !important', sm: '64px !important' },
        }} />

        {/* Page content */}
        <Box
          sx={{
            flex: 1,
            p: { xs: 2, sm: 2.5, md: 3 },
            pb: { xs: '80px', md: 3 },
            maxWidth: 1440,
            width: '100%',
            mx: 'auto',
            alignSelf: 'stretch',
          }}
        >
          <AppBreadcrumbs />
          <Outlet />
        </Box>
      </Box>

      {/* ── Mobile Bottom Nav (xs/sm only, left layout only) ─────────────── */}
      {!isTopNav && <MobileBottomNav />}

      {/* ── Shared panels (available in both layouts) ──────────────────────── */}
      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
      <NotificationPanel open={notifOpen} onClose={() => setNotifOpen(false)} />

      {/* User menu for TopNav mode */}
      {isTopNav && (
        <Menu
          anchorEl={userMenuAnchor}
          open={Boolean(userMenuAnchor)}
          onClose={() => setUserMenuAnchor(null)}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          slotProps={{ paper: { elevation: 0, sx: {
            mt: 1, minWidth: 230, borderRadius: 2.5,
            border: '1px solid #E8EAED',
            boxShadow: '0 8px 32px rgba(32,33,36,0.18)',
            bgcolor: '#FFFFFF', backgroundImage: 'none',
          } } }}
        >
          <Box sx={{ px: 2.5, py: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar sx={{ width: 40, height: 40, background: 'linear-gradient(135deg, #00858F 0%, #006D77 100%)', fontSize: '0.9rem', fontWeight: 700 }}>{initials}</Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2" fontWeight={700} noWrap sx={{ color: '#202124' }}>{displayName}</Typography>
              <Typography variant="caption" noWrap sx={{ color: '#5F6368', display: 'block' }}>{user?.email ?? 'admin@medibook.com'}</Typography>
            </Box>
          </Box>
          <Divider sx={{ borderColor: '#E8EAED' }} />
          <Box sx={{ p: 1 }}>
            <MenuItem onClick={() => { setUserMenuAnchor(null); navigate('/settings') }} sx={{ borderRadius: 2, py: 1, px: 1.5, '&:hover': { bgcolor: 'rgba(0,109,119,0.06)' } }}>
              <ListItemIcon><PersonOutlineRounded fontSize="small" sx={{ color: '#5F6368' }} /></ListItemIcon>
              <Typography variant="body2" fontWeight={600}>Profile</Typography>
            </MenuItem>
            <MenuItem onClick={() => { setUserMenuAnchor(null); navigate('/settings') }} sx={{ borderRadius: 2, py: 1, px: 1.5, '&:hover': { bgcolor: 'rgba(0,109,119,0.06)' } }}>
              <ListItemIcon><SettingsOutlined fontSize="small" sx={{ color: '#5F6368' }} /></ListItemIcon>
              <Typography variant="body2" fontWeight={600}>Settings</Typography>
            </MenuItem>
            <MenuItem onClick={() => { toggleMode(); setUserMenuAnchor(null) }} sx={{ borderRadius: 2, py: 1, px: 1.5, '&:hover': { bgcolor: 'rgba(0,109,119,0.06)' } }}>
              <ListItemIcon>{isDark ? <LightModeRounded fontSize="small" sx={{ color: '#F9AB00' }} /> : <DarkModeRounded fontSize="small" sx={{ color: '#5F6368' }} />}</ListItemIcon>
              <Typography variant="body2" fontWeight={600}>{isDark ? 'Light Mode' : 'Dark Mode'}</Typography>
            </MenuItem>
            <MenuItem onClick={() => { toggleLayout(); setUserMenuAnchor(null) }} sx={{ borderRadius: 2, py: 1, px: 1.5, '&:hover': { bgcolor: 'rgba(0,109,119,0.06)' } }}>
              <ListItemIcon><ViewSidebarRounded fontSize="small" sx={{ color: '#006D77' }} /></ListItemIcon>
              <Typography variant="body2" fontWeight={600}>Switch to Sidebar</Typography>
            </MenuItem>
          </Box>
          <Divider sx={{ borderColor: '#E8EAED' }} />
          <Box sx={{ p: 1 }}>
            <MenuItem onClick={() => { setUserMenuAnchor(null); logout(client); navigate('/login', { replace: true }) }} sx={{ borderRadius: 2, py: 1, px: 1.5, color: '#D93025', '&:hover': { bgcolor: 'rgba(217,48,37,0.06)' } }}>
              <ListItemIcon><LogoutRounded fontSize="small" sx={{ color: '#D93025' }} /></ListItemIcon>
              <Typography variant="body2" fontWeight={700}>Logout</Typography>
            </MenuItem>
          </Box>
        </Menu>
      )}
    </Box>
  )
}
