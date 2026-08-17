import { useMemo } from 'react'
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
  ChevronLeftRounded, ChevronRightRounded, AssignmentRounded, HourglassTopRounded,
} from '@mui/icons-material'

import { useAuth } from '../../context/AuthContext'
import * as MockStore from '../../mocks/store'


// ─── Constants ────────────────────────────────────────────────────────────────
export const DRAWER_WIDTH = 256
// SUG-NAV-005: collapsed icon-rail width (desktop only)
export const COLLAPSED_DRAWER_WIDTH = 76

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
      { label: 'Appointments',  path: '/appointments',     icon: <EventNoteRounded />,     roles: null, badgeDynamic: 'pending' },
      { label: 'New Booking',   path: '/appointments/new', icon: <PersonAddRounded />,     roles: null },
      { label: 'Waiting Room',  path: '/waiting-room',     icon: <HourglassTopRounded />,  roles: ['admin', 'super_admin', 'receptionist', 'clinician'] },
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
      { label: 'Tasks',         path: '/tasks',            icon: <AssignmentRounded />,         roles: null },
      { label: 'Reviews',       path: '/reviews',          icon: <StarRounded />,               roles: ['admin', 'super_admin'] },
      { label: 'Finances',      path: '/finances',         icon: <AccountBalanceWalletRounded />, roles: ['admin', 'super_admin'] },
      { label: 'Analytics',     path: '/analytics',        icon: <BarChartRounded />,           roles: ['admin', 'super_admin'] },
      { label: 'Staff',         path: '/staff',            icon: <BadgeRounded />,              roles: ['admin', 'super_admin'] },
      { label: 'Test Results',  path: '/test-results',     icon: <ScienceRounded />,            roles: ['admin', 'super_admin', 'clinician'] },
      { label: 'My Availability', path: '/clinician/availability', icon: <AccessTimeRounded />,  roles: ['clinician'] },
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
// SUG-NAV-005: `collapsed` renders an icon-only rail (desktop permanent drawer
// only — `onToggleCollapse` is omitted for the mobile temporary drawer).
function SidebarContent({ onClose, collapsed = false, onToggleCollapse }) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const client = useApolloClient()
  const { user, hasRole, logout } = useAuth()

  const handleLogout = () => { logout(client); navigate('/login', { replace: true }) }

  // SUG-APPT-007: Dynamic pending appointment count for sidebar badge
  const pendingCount = useMemo(() => MockStore.getAppointments({ status: 'pending' }).length, [])

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
        px: collapsed ? 1.5 : 2.5, display: 'flex', alignItems: 'center', gap: 1.5,
        justifyContent: collapsed ? 'center' : 'flex-start',
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
        {!collapsed && (
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="subtitle1" fontWeight={800} noWrap sx={{ color: '#fff', lineHeight: 1.1, letterSpacing: '-0.4px' }}>
              Medi<span style={{ color: '#00A8B5' }}>Book</span>
            </Typography>
            <Typography variant="caption" noWrap sx={{ color: 'rgba(255,255,255,0.35)', lineHeight: 1, display: 'block', fontSize: '0.68rem', fontWeight: 500 }}>
              {user?.clinician?.clinician_type?.name ?? 'Medical Platform'}
            </Typography>
          </Box>
        )}
        {/* SUG-NAV-005: collapse/expand trigger — desktop permanent drawer only */}
        {onToggleCollapse && !collapsed && (
          <Tooltip title="Collapse sidebar" placement="right">
            <IconButton size="small" onClick={onToggleCollapse} sx={{ color: 'rgba(255,255,255,0.45)', '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.08)' } }}>
              <ChevronLeftRounded fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {/* SUG-NAV-005: re-expand trigger, shown centered under the logo while collapsed */}
      {onToggleCollapse && collapsed && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 1, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <Tooltip title="Expand sidebar" placement="right">
            <IconButton size="small" onClick={onToggleCollapse} sx={{ color: 'rgba(255,255,255,0.45)', '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.08)' } }}>
              <ChevronRightRounded fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      )}

      {/* ── Emergency button ─────────────────────────────────────────────── */}
      <Box sx={{ px: collapsed ? 1 : 2, pt: 2 }}>
        <Tooltip title={collapsed ? 'Emergency — 911' : ''} placement="right">
          <Box
            component="a"
            href="tel:911"
            className="emergency-pulse"
            sx={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1,
              bgcolor: '#D93025', color: '#fff', borderRadius: 2.5,
              py: 1, px: collapsed ? 1 : 2, textDecoration: 'none', cursor: 'pointer',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontWeight: 700, fontSize: '0.8rem',
              transition: 'opacity 0.15s',
              '&:hover': { opacity: 0.9 },
            }}
          >
            <WarningRounded sx={{ fontSize: '1rem' }} />
            {!collapsed && 'Emergency — 911'}
          </Box>
        </Tooltip>
      </Box>

      {/* ── Nav Sections ──────────────────────────────────────────────────── */}
      <Box sx={{ flex: 1, overflowY: 'auto', py: 1, px: 0.5, mt: 1 }}>
        {NAV_SECTIONS.map((section) => {
          const visible = section.items.filter((item) => !item.roles || item.roles.some((r) => hasRole(r)))
          if (!visible.length) return null
          return (
            <Box key={section.label} sx={{ mb: 1 }}>
              {!collapsed && (
                <Typography variant="overline" sx={{
                  px: 2.5, display: 'block', mb: 0.5,
                  color: 'rgba(255,255,255,0.28)',
                  fontSize: '0.62rem', letterSpacing: '0.14em',
                }}>
                  {section.label}
                </Typography>
              )}
              <List disablePadding sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                {visible.map((item) => {
                  const active = isActive(item.path)
                  const badgeVal = item.badge ?? (item.badgeDynamic === 'pending' ? (pendingCount > 0 ? pendingCount : null) : null)
                  const button = (
                    <ListItemButton
                      key={item.path}
                      selected={active}
                      onClick={() => { navigate(item.path); onClose?.() }}
                      sx={{
                        borderRadius: '10px',
                        py: { xs: 1.4, md: 1.1 },
                        px: collapsed ? 0 : { xs: 1.8, md: 1.5 },
                        justifyContent: collapsed ? 'center' : 'flex-start',
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
                        minWidth: collapsed ? 'unset' : 36,
                        color: active ? '#fff' : 'rgba(255,255,255,0.40)',
                        '& .MuiSvgIcon-root': { fontSize: { xs: '1.3rem', md: '1.15rem' } },
                        transition: 'color 0.15s',
                      }}>
                        {item.icon}
                      </ListItemIcon>
                      {!collapsed && (
                        <ListItemText
                          primary={item.label}
                          primaryTypographyProps={{
                            fontSize: { xs: '0.9rem', md: '0.865rem' },
                            fontWeight: active ? 700 : 500,
                            color: 'inherit',
                          }}
                        />
                      )}
                      {/* static badge or dynamic pending count (SUG-APPT-007) */}
                      {badgeVal != null && !collapsed && (
                        <Box sx={{ bgcolor: '#F9AB00', color: '#000', borderRadius: '10px', px: 1, py: 0.2, fontSize: '0.6rem', fontWeight: 700, minWidth: 20, textAlign: 'center' }}>
                          {badgeVal}
                        </Box>
                      )}
                      {/* collapsed: small dot badge instead of the full pill */}
                      {badgeVal != null && collapsed && (
                        <Box sx={{ position: 'absolute', top: 6, right: 14, width: 8, height: 8, borderRadius: '50%', bgcolor: '#F9AB00' }} />
                      )}
                    </ListItemButton>
                  )
                  return collapsed ? (
                    <Tooltip key={item.path} title={item.label} placement="right">
                      {button}
                    </Tooltip>
                  ) : button
                })}
              </List>
            </Box>
          )
        })}
      </Box>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)' }} />

      {/* ── User Footer ──────────────────────────────────────────────────── */}
      <Box sx={{ px: collapsed ? 1 : 2, py: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexDirection: collapsed ? 'column' : 'row' }}>
          <Tooltip title={collapsed ? displayName : ''} placement="right">
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
          </Tooltip>
          {!collapsed && (
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
          )}
          <Tooltip title="Logout" placement="right">
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
// SUG-NAV-005: `collapsed`/`onToggleCollapse` control the desktop icon-rail
// mode. The mobile temporary drawer always renders expanded — collapsing a
// full-screen overlay drawer isn't meaningful.
export default function Sidebar({ mobileOpen, onMobileClose, collapsed = false, onToggleCollapse }) {
  const mobileDrawerSx = {
    width: DRAWER_WIDTH, flexShrink: 0,
    '& .MuiDrawer-paper': {
      width: 280,
      boxSizing: 'border-box',
      bgcolor: '#202124',
      borderRight: 'none',
    },
  }
  const desktopWidth = collapsed ? COLLAPSED_DRAWER_WIDTH : DRAWER_WIDTH
  const desktopDrawerSx = {
    width: desktopWidth, flexShrink: 0,
    '& .MuiDrawer-paper': {
      width: desktopWidth,
      boxSizing: 'border-box',
      bgcolor: '#202124',
      borderRight: 'none',
      overflowX: 'hidden',
      transition: 'width 0.2s ease',
    },
    transition: 'width 0.2s ease',
  }
  return (
    <>
      <Drawer variant="temporary" open={mobileOpen} onClose={onMobileClose} ModalProps={{ keepMounted: true }} sx={{ display: { xs: 'block', md: 'none' }, ...mobileDrawerSx }}>
        <SidebarContent onClose={onMobileClose} />
      </Drawer>
      <Drawer variant="permanent" sx={{ display: { xs: 'none', md: 'block' }, ...desktopDrawerSx }} open>
        <SidebarContent collapsed={collapsed} onToggleCollapse={onToggleCollapse} />
      </Drawer>
    </>
  )
}
