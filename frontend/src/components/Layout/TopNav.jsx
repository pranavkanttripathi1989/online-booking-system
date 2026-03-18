import { useLocation, useNavigate } from 'react-router-dom'
import { useApolloClient } from '@apollo/client'
import {
  Box, Typography, IconButton, Avatar, Badge, Chip, Divider, Tooltip,
  Button, alpha, Menu, MenuItem, ListItemIcon,
} from '@mui/material'
import {
  DashboardRounded, CalendarMonthRounded, EventNoteRounded, PersonAddRounded,
  MedicalServicesRounded, GroupRounded, SettingsRounded, LogoutRounded,
  LocalHospital, MessageRounded, StarRounded, AccountBalanceWalletRounded,
  WarningRounded, ScienceRounded, BadgeRounded, BarChartRounded,
  NotificationsNoneRounded, DarkModeRounded, LightModeRounded,
  SearchRounded, ViewSidebarRounded, ViewStreamRounded, KeyboardArrowDownRounded,
} from '@mui/icons-material'
import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useThemeMode } from '../../context/ThemeContext'

// NAV_ITEMS matches Sidebar sections
const NAV_MAIN = [
  { label: 'Dashboard',    path: '/dashboard',        icon: <DashboardRounded />,            roles: null },
  { label: 'Calendar',     path: '/calendar',         icon: <CalendarMonthRounded />,         roles: null },
  { label: 'Appointments', path: '/appointments',     icon: <EventNoteRounded />,              roles: null },
  { label: 'New Booking',  path: '/appointments/new', icon: <PersonAddRounded />,              roles: null },
  { label: 'Patients',     path: '/patients',         icon: <GroupRounded />,                  roles: ['admin','super_admin','receptionist','clinician'] },
  { label: 'Clinicians',   path: '/clinicians',       icon: <MedicalServicesRounded />,        roles: ['admin','super_admin','receptionist'] },
]
const NAV_MORE = [
  { label: 'Messages',     path: '/messages',         icon: <MessageRounded />,                roles: null, badge: 3 },
  { label: 'Reviews',      path: '/reviews',          icon: <StarRounded />,                   roles: ['admin','super_admin'] },
  { label: 'Finances',     path: '/finances',         icon: <AccountBalanceWalletRounded />,   roles: ['admin','super_admin'] },
  { label: 'Analytics',    path: '/analytics',        icon: <BarChartRounded />,               roles: ['admin','super_admin'] },
  { label: 'Staff',        path: '/staff',            icon: <BadgeRounded />,                  roles: ['admin','super_admin'] },
  { label: 'Test Results', path: '/test-results',     icon: <ScienceRounded />,                roles: ['admin','super_admin','clinician'] },
  { label: 'Settings',     path: '/settings',         icon: <SettingsRounded />,               roles: null },
]

export default function TopNav({ onToggleLayout, onOpenSearch, onOpenNotif, onOpenUserMenu }) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const client = useApolloClient()
  const { user, hasRole, logout } = useAuth()
  const { mode, toggle: toggleMode } = useThemeMode()
  const [moreAnchor, setMoreAnchor] = useState(null)

  const isDark   = mode === 'dark'
  const displayName = user?.name ?? 'Admin User'
  const initials    = displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

  const isActive = (path) => {
    if (path === '/appointments' && pathname === '/appointments/new') return false
    return pathname === path || pathname.startsWith(path + '/')
  }

  const filteredMain = NAV_MAIN.filter(i => !i.roles || i.roles.some(r => hasRole(r)))
  const filteredMore = NAV_MORE.filter(i => !i.roles || i.roles.some(r => hasRole(r)))

  return (
    <Box sx={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1200,
      bgcolor: isDark ? '#1C1C1E' : '#202124',
      borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.10)'}`,
      boxShadow: '0 2px 12px rgba(0,0,0,0.20)',
    }}>
      {/* Accent strip */}
      <Box sx={{ height: 2.5, background: 'linear-gradient(90deg, #006D77, #00858F, #0F9D58)' }} />

      <Box sx={{ display: 'flex', alignItems: 'center', px: 3, gap: 0, minHeight: 54 }}>

        {/* Logo */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mr: 3, flexShrink: 0 }}>
          <Box sx={{
            width: 32, height: 32, borderRadius: 1.5,
            background: 'linear-gradient(135deg, #006D77 0%, #00858F 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0,109,119,0.45)',
          }}>
            <LocalHospital sx={{ color: '#fff', fontSize: 18 }} />
          </Box>
          <Typography variant="subtitle1" fontWeight={800} sx={{ color: '#fff', letterSpacing: '-0.5px', lineHeight: 1 }}>
            Medi<span style={{ color: '#00A8B5' }}>Book</span>
          </Typography>
        </Box>

        <Divider orientation="vertical" flexItem sx={{ borderColor: 'rgba(255,255,255,0.12)', mx: 1 }} />

        {/* Nav links */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, flex: 1, overflow: 'hidden' }}>
          {filteredMain.map(item => {
            const active = isActive(item.path)
            return (
              <Button
                key={item.path}
                startIcon={<Box sx={{ '& .MuiSvgIcon-root': { fontSize: '0.95rem' } }}>{item.icon}</Box>}
                onClick={() => navigate(item.path)}
                sx={{
                  textTransform: 'none', fontWeight: active ? 700 : 500,
                  fontSize: '0.82rem', borderRadius: '8px',
                  px: 1.4, py: 0.7, minWidth: 'auto',
                  color: active ? '#fff' : 'rgba(255,255,255,0.62)',
                  bgcolor: active ? 'rgba(0,109,119,0.85)' : 'transparent',
                  boxShadow: active ? '0 2px 8px rgba(0,109,119,0.35)' : 'none',
                  '&:hover': {
                    bgcolor: active ? 'rgba(0,109,119,0.90)' : 'rgba(255,255,255,0.08)',
                    color: '#fff',
                  },
                  transition: 'all 0.15s',
                  fontFamily: '"Plus Jakarta Sans", sans-serif',
                }}
              >
                {item.label}
                {item.badge > 0 && (
                  <Box component="span" sx={{ ml: 0.75, bgcolor: '#D93025', color: '#fff', borderRadius: '10px', px: 0.7, py: 0.1, fontSize: '0.6rem', fontWeight: 800, lineHeight: 1.6 }}>
                    {item.badge}
                  </Box>
                )}
              </Button>
            )
          })}

          {/* More dropdown */}
          {filteredMore.length > 0 && (
            <>
              <Button
                endIcon={<KeyboardArrowDownRounded sx={{ fontSize: '1rem' }} />}
                onClick={(e) => setMoreAnchor(e.currentTarget)}
                sx={{
                  textTransform: 'none', fontWeight: 500, fontSize: '0.82rem', borderRadius: '8px',
                  px: 1.4, py: 0.7, color: 'rgba(255,255,255,0.62)', minWidth: 'auto',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.08)', color: '#fff' },
                  fontFamily: '"Plus Jakarta Sans", sans-serif',
                }}
              >
                More
              </Button>
              <Menu
                anchorEl={moreAnchor}
                open={Boolean(moreAnchor)}
                onClose={() => setMoreAnchor(null)}
                slotProps={{ paper: { elevation: 0, sx: {
                  mt: 1, minWidth: 200, borderRadius: 2.5, border: '1px solid #E8EAED',
                  boxShadow: '0 8px 32px rgba(32,33,36,0.18)',
                } } }}
              >
                {filteredMore.map(item => {
                  const active = isActive(item.path)
                  return (
                    <MenuItem key={item.path} onClick={() => { navigate(item.path); setMoreAnchor(null) }}
                      sx={{ borderRadius: 1.5, mx: 0.5, color: active ? '#006D77' : 'inherit',
                        bgcolor: active ? 'rgba(0,109,119,0.08)' : 'transparent',
                        fontWeight: active ? 700 : 400, }}>
                      <ListItemIcon sx={{ color: active ? '#006D77' : 'inherit' }}>{item.icon}</ListItemIcon>
                      {item.label}
                      {item.badge > 0 && (
                        <Box component="span" sx={{ ml: 'auto', bgcolor: '#D93025', color: '#fff', borderRadius: '10px', px: 0.7, py: 0.1, fontSize: '0.6rem', fontWeight: 800 }}>
                          {item.badge}
                        </Box>
                      )}
                    </MenuItem>
                  )
                })}
              </Menu>
            </>
          )}
        </Box>

        {/* Right side */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexShrink: 0 }}>

          {/* Emergency */}
          <Box component="a" href="tel:911" sx={{
            display: 'flex', alignItems: 'center', gap: 0.5,
            bgcolor: alpha('#D93025', 0.20), color: '#FF6B5B',
            borderRadius: 1.5, px: 1.25, py: 0.5, textDecoration: 'none',
            fontSize: '0.75rem', fontWeight: 700, fontFamily: '"Plus Jakarta Sans", sans-serif',
            border: '1px solid rgba(217,48,37,0.30)',
            '&:hover': { bgcolor: alpha('#D93025', 0.30) },
            transition: 'all 0.15s',
          }}>
            <WarningRounded sx={{ fontSize: '0.9rem' }} /> 911
          </Box>

          {/* Search */}
          <Tooltip title="Search (⌘K)">
            <IconButton size="small" onClick={onOpenSearch}
              sx={{ color: 'rgba(255,255,255,0.65)', '&:hover': { bgcolor: 'rgba(255,255,255,0.08)', color: '#fff' } }}>
              <SearchRounded sx={{ fontSize: '1.2rem' }} />
            </IconButton>
          </Tooltip>

          {/* Dark mode */}
          <Tooltip title={isDark ? 'Light mode' : 'Dark mode'}>
            <IconButton size="small" onClick={toggleMode}
              sx={{ color: 'rgba(255,255,255,0.65)', '&:hover': { bgcolor: 'rgba(255,255,255,0.08)', color: '#fff' } }}>
              {isDark
                ? <LightModeRounded sx={{ fontSize: '1.1rem' }} />
                : <DarkModeRounded sx={{ fontSize: '1.1rem' }} />}
            </IconButton>
          </Tooltip>

          {/* Notifications */}
          <Tooltip title="Notifications">
            <IconButton size="small" onClick={onOpenNotif}
              sx={{ color: 'rgba(255,255,255,0.65)', '&:hover': { bgcolor: 'rgba(255,255,255,0.08)', color: '#fff' } }}>
              <Badge badgeContent={3} sx={{ '& .MuiBadge-badge': { bgcolor: '#D93025', color: '#fff', fontSize: '0.58rem', minWidth: 16, height: 16 } }}>
                <NotificationsNoneRounded sx={{ fontSize: '1.2rem' }} />
              </Badge>
            </IconButton>
          </Tooltip>

          {/* Switch to sidebar */}
          <Tooltip title="Switch to Sidebar navigation">
            <IconButton size="small" onClick={onToggleLayout}
              sx={{ color: 'rgba(0,169,181,0.80)', bgcolor: 'rgba(0,109,119,0.18)', borderRadius: 1.5, p: 0.7,
                '&:hover': { bgcolor: 'rgba(0,109,119,0.30)', color: '#00A9B5' },
              }}>
              <ViewSidebarRounded sx={{ fontSize: '1.1rem' }} />
            </IconButton>
          </Tooltip>

          <Divider orientation="vertical" flexItem sx={{ borderColor: 'rgba(255,255,255,0.12)', mx: 0.5 }} />

          {/* Avatar */}
          <Tooltip title={displayName}>
            <IconButton onClick={onOpenUserMenu} sx={{ p: 0.5 }}>
              <Box sx={{ position: 'relative' }}>
                <Avatar sx={{
                  width: 32, height: 32,
                  background: 'linear-gradient(135deg, #00858F 0%, #006D77 100%)',
                  fontSize: '0.75rem', fontWeight: 700,
                  boxShadow: '0 2px 8px rgba(0,109,119,0.45)',
                }}>
                  {initials}
                </Avatar>
                <Box sx={{ position: 'absolute', bottom: 0, right: 0, width: 8, height: 8, borderRadius: '50%', bgcolor: '#0F9D58', border: '2px solid #202124' }} />
              </Box>
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
    </Box>
  )
}
