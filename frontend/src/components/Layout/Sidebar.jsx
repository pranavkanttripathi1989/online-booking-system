import { useLocation, useNavigate } from 'react-router-dom'
import { useApolloClient } from '@apollo/client'
import {
  Box, Drawer, List, ListItemButton, ListItemIcon, ListItemText,
  Typography, Avatar, Chip, Divider, Tooltip, IconButton, alpha,
} from '@mui/material'
import {
  DashboardRounded, CalendarMonthRounded, EventNoteRounded, PersonAddRounded,
  MedicalServicesRounded, GroupRounded, SettingsRounded, LogoutRounded,
  LocalHospital, MessageRounded, StarRounded, AccountBalanceWalletRounded,
  WarningRounded, ScienceRounded, BadgeRounded, BarChartRounded, AccessTimeRounded,
} from '@mui/icons-material'

import { useAuth } from '../../context/AuthContext'

// ─── Constants ────────────────────────────────────────────────────────────────
export const DRAWER_WIDTH = 256

// NEW-AUTH-001: Format the stored login timestamp as a relative string
function getLastLoginText() {
  const ts = localStorage.getItem('medibook_last_login')
  if (!ts) return null
  const diff = Date.now() - new Date(ts).getTime()
  const mins  = Math.floor(diff / 60000)
  if (mins < 1)  return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)  return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

// ─── Nav Items ────────────────────────────────────────────────────────────────
const NAV_SECTIONS = [
  {
    label: 'Main',
    items: [
      { label: 'Dashboard',     path: '/dashboard',        icon: <DashboardRounded />,    roles: null },
      { label: 'Calendar',      path: '/calendar',         icon: <CalendarMonthRounded />, roles: null },
      { label: 'Appointments',  path: '/appointments',     icon: <EventNoteRounded />,     roles: null },
      { label: 'New Booking',   path: '/appointments/new', icon: <PersonAddRounded />,     roles: null },
    ],
  },
  {
    label: 'People',
    items: [
      { label: 'Patients',      path: '/patients',         icon: <GroupRounded />,            roles: ['admin', 'super_admin', 'receptionist', 'clinician'] },
      { label: 'Clinicians',    path: '/clinicians',       icon: <MedicalServicesRounded />,   roles: ['admin', 'super_admin', 'receptionist'] },
    ],
  },
  {
    label: 'Management',
    items: [
      { label: 'Messages',      path: '/messages',         icon: <MessageRounded />,            roles: null, badge: 3 },
      { label: 'Reviews',       path: '/reviews',          icon: <StarRounded />,               roles: ['admin', 'super_admin'] },
      { label: 'Finances',      path: '/finances',         icon: <AccountBalanceWalletRounded />, roles: ['admin', 'super_admin'] },
      { label: 'Analytics',     path: '/analytics',        icon: <BarChartRounded />,           roles: ['admin', 'super_admin'] },
      { label: 'Staff',         path: '/staff',            icon: <BadgeRounded />,              roles: ['admin', 'super_admin'] },
      { label: 'Test Results',  path: '/test-results',     icon: <ScienceRounded />,            roles: ['admin', 'super_admin', 'clinician'] },
    ],
  },
  {
    label: 'Account',
    items: [
      { label: 'Settings',      path: '/settings',         icon: <SettingsRounded />,           roles: null },
    ],
  },
]

// ─── Sidebar Content ──────────────────────────────────────────────────────────
function SidebarContent({ onClose }) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const client = useApolloClient()
  const { user, hasRole, logout } = useAuth()

  const handleLogout = () => { logout(client); navigate('/login', { replace: true }) }

  const isActive = (path) => {
    if (path === '/appointments' && pathname === '/appointments/new') return false
    return pathname === path || pathname.startsWith(path + '/')
  }

  const displayName = user?.name ?? 'User'
  const initials = displayName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
  const primaryRole = user?.roles?.[0]?.name ?? 'user'

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', bgcolor: '#202124' }}>

      {/* ── Logo ─────────────────────────────────────────────────────────── */}
      <Box sx={{
        px: 2.5, display: 'flex', alignItems: 'center', gap: 1.5,
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        minHeight: { xs: 68, md: 64 },
        py: 2,
      }}>
        <Box sx={{
          width: 38, height: 38, borderRadius: 2,
          background: 'linear-gradient(135deg, #006D77 0%, #00858F 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, boxShadow: '0 4px 14px rgba(0,109,119,0.45)',
        }}>
          <LocalHospital sx={{ color: '#fff', fontSize: 22 }} />
        </Box>
        <Box>
          <Typography variant="subtitle1" fontWeight={800} sx={{ color: '#fff', lineHeight: 1.1, letterSpacing: '-0.4px' }}>
            Medi<span style={{ color: '#00A8B5' }}>Book</span>
          </Typography>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.35)', lineHeight: 1, display: 'block', fontSize: '0.68rem', fontWeight: 500 }}>
            {user?.clinician?.clinician_type?.name ?? 'Medical Platform'}
          </Typography>
        </Box>
      </Box>

      {/* ── Emergency button ─────────────────────────────────────────────── */}
      <Box sx={{ px: 2, pt: 2 }}>
        <Box
          component="a"
          href="tel:911"
          className="emergency-pulse"
          sx={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1,
            bgcolor: '#D93025', color: '#fff', borderRadius: 2.5,
            py: 1, px: 2, textDecoration: 'none', cursor: 'pointer',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontWeight: 700, fontSize: '0.8rem',
            transition: 'opacity 0.15s',
            '&:hover': { opacity: 0.9 },
          }}
        >
          <WarningRounded sx={{ fontSize: '1rem' }} />
          Emergency — 911
        </Box>
      </Box>

      {/* ── Nav Sections ──────────────────────────────────────────────────── */}
      <Box sx={{ flex: 1, overflowY: 'auto', py: 1, px: 0.5, mt: 1 }}>
        {NAV_SECTIONS.map((section) => {
          const visible = section.items.filter((item) => !item.roles || item.roles.some((r) => hasRole(r)))
          if (!visible.length) return null
          return (
            <Box key={section.label} sx={{ mb: 1 }}>
              <Typography variant="overline" sx={{
                px: 2.5, display: 'block', mb: 0.5,
                color: 'rgba(255,255,255,0.28)',
                fontSize: '0.62rem', letterSpacing: '0.14em',
              }}>
                {section.label}
              </Typography>
              <List disablePadding sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                {visible.map((item) => {
                  const active = isActive(item.path)
                  return (
                    <ListItemButton
                      key={item.path}
                      selected={active}
                      onClick={() => { navigate(item.path); onClose?.() }}
                      sx={{
                        borderRadius: '10px',
                        py: { xs: 1.4, md: 1.1 },
                        px: { xs: 1.8, md: 1.5 },
                        mx: 1,
                        position: 'relative',
                        color: active ? '#fff' : 'rgba(255,255,255,0.60)',
                        background: active
                          ? 'linear-gradient(135deg, rgba(0,109,119,0.90) 0%, rgba(0,133,143,0.95) 100%)'
                          : 'transparent',
                        boxShadow: active ? '0 2px 12px rgba(0,109,119,0.38)' : 'none',
                        border: 'none',
                        '&:hover': {
                          bgcolor: active ? undefined : 'rgba(255,255,255,0.08)',
                          color: '#fff',
                        },
                        '&.Mui-selected': {
                          background: 'linear-gradient(135deg, rgba(0,109,119,0.90) 0%, rgba(0,133,143,0.95) 100%)',
                          color: '#fff',
                          boxShadow: '0 2px 12px rgba(0,109,119,0.38)',
                          '& .MuiListItemIcon-root': { color: '#fff' },
                        },
                        '&.Mui-selected:hover': {
                          background: 'linear-gradient(135deg, rgba(0,90,98,0.95) 0%, rgba(0,109,119,0.98) 100%)',
                        },
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <ListItemIcon sx={{
                        minWidth: 36,
                        color: active ? '#fff' : 'rgba(255,255,255,0.40)',
                        '& .MuiSvgIcon-root': { fontSize: { xs: '1.3rem', md: '1.15rem' } },
                        transition: 'color 0.15s',
                      }}>
                        {item.icon}
                      </ListItemIcon>
                      <ListItemText
                        primary={item.label}
                        primaryTypographyProps={{
                          fontSize: { xs: '0.9rem', md: '0.865rem' },
                          fontWeight: active ? 700 : 500,
                          color: 'inherit',
                        }}
                      />
                      {item.badge && (
                        <Box sx={{ bgcolor: '#D93025', color: '#fff', borderRadius: '10px', px: 1, py: 0.2, fontSize: '0.6rem', fontWeight: 700, minWidth: 20, textAlign: 'center' }}>
                          {item.badge}
                        </Box>
                      )}
                    </ListItemButton>
                  )
                })}
              </List>
            </Box>
          )
        })}
      </Box>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)' }} />

      {/* ── User Footer ──────────────────────────────────────────────────── */}
      <Box sx={{ px: 2, py: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ position: 'relative', flexShrink: 0 }}>
            <Avatar sx={{
              width: 36, height: 36,
              background: 'linear-gradient(135deg, #006D77 0%, #00858F 100%)',
              fontSize: '0.8rem', fontWeight: 700,
              boxShadow: '0 2px 10px rgba(0,109,119,0.30)',
            }}>
              {initials}
            </Avatar>
            <Box sx={{ position: 'absolute', bottom: 0, right: 0, width: 9, height: 9, borderRadius: '50%', bgcolor: '#0F9D58', border: '2px solid #202124' }} />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="body2" fontWeight={700} sx={{ color: '#fff', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.83rem' }}>
              {displayName}
            </Typography>
            <Chip
              label={primaryRole.replace('_', ' ')}
              size="small"
              sx={{ mt: 0.3, height: 17, fontSize: '0.6rem', fontWeight: 700, bgcolor: alpha('#006D77', 0.20), color: '#7ECACA', textTransform: 'capitalize', border: 'none', '& .MuiChip-label': { px: 0.8 } }}
            />
            {/* NEW-AUTH-001: Last signed in */}
            {getLastLoginText() && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4, mt: 0.4 }}>
                <AccessTimeRounded sx={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.25)' }} />
                <Typography variant="caption" sx={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.25)', lineHeight: 1 }}>
                  {getLastLoginText()}
                </Typography>
              </Box>
            )}
          </Box>
          <Tooltip title="Logout" placement="top">
            <IconButton size="small" onClick={handleLogout} sx={{ color: 'rgba(255,255,255,0.35)', width: 30, height: 30, '&:hover': { color: '#D93025', bgcolor: alpha('#D93025', 0.15) }, transition: 'all 0.15s ease' }}>
              <LogoutRounded sx={{ fontSize: '1rem' }} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
    </Box>
  )
}

// ─── Sidebar ─────────────────────────────────────────────────────────────────
export default function Sidebar({ mobileOpen, onMobileClose }) {
  const drawerSx = {
    width: DRAWER_WIDTH, flexShrink: 0,
    '& .MuiDrawer-paper': {
      width: { xs: 280, md: DRAWER_WIDTH },
      boxSizing: 'border-box',
      bgcolor: '#202124',
      borderRight: 'none',
    },
  }
  return (
    <>
      <Drawer variant="temporary" open={mobileOpen} onClose={onMobileClose} ModalProps={{ keepMounted: true }} sx={{ display: { xs: 'block', md: 'none' }, ...drawerSx }}>
        <SidebarContent onClose={onMobileClose} />
      </Drawer>
      <Drawer variant="permanent" sx={{ display: { xs: 'none', md: 'block' }, ...drawerSx }} open>
        <SidebarContent />
      </Drawer>
    </>
  )
}
