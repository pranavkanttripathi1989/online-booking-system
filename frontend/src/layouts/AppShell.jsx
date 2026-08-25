/**
 * AppShell — Professional layout shell with:
 *   – Left sidebar (default) OR Top navigation bar (toggle persisted in localStorage)
 *   – Animated collapsible inline global search with auto-suggestions
 *   – Teal theme (#006D77) throughout
 *   – Role-filtered navigation items
 *   – Dark/Light mode toggle, notifications, user menu
 */
import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useQuery, useMutation, gql } from '@apollo/client'
import {
  Box, AppBar, Toolbar, Drawer, List, ListItemButton, ListItemIcon,
  ListItemText, Typography, Avatar, IconButton, Stack, Divider, Chip,
  BottomNavigation, BottomNavigationAction, useMediaQuery, useTheme,
  Menu, MenuItem, Badge, Collapse, InputBase, Paper,
  List as MuiList, ListItem, ListItemAvatar, Tooltip, Button, Snackbar, Alert,
} from '@mui/material'

// ─── Icons ────────────────────────────────────────────────────────────────────
import LocalHospitalIcon        from '@mui/icons-material/LocalHospital'
import MenuIcon                 from '@mui/icons-material/Menu'
import DashboardIcon            from '@mui/icons-material/Dashboard'
import CalendarMonthIcon        from '@mui/icons-material/CalendarMonth'
import EventNoteIcon            from '@mui/icons-material/EventNote'
import GroupIcon                from '@mui/icons-material/Group'
import PersonIcon               from '@mui/icons-material/Person'
import BarChartIcon             from '@mui/icons-material/BarChart'
import SettingsIcon             from '@mui/icons-material/Settings'
import AccountCircleIcon        from '@mui/icons-material/AccountCircle'
import LogoutIcon               from '@mui/icons-material/Logout'
import MessageIcon              from '@mui/icons-material/Message'
import AttachMoneyIcon          from '@mui/icons-material/AttachMoney'
import AdminPanelSettingsIcon   from '@mui/icons-material/AdminPanelSettings'
import ExpandLessIcon           from '@mui/icons-material/ExpandLess'
import ExpandMoreIcon           from '@mui/icons-material/ExpandMore'
import SecurityIcon             from '@mui/icons-material/Security'
import BusinessIcon             from '@mui/icons-material/Business'
import EmailIcon                from '@mui/icons-material/Email'
import PolicyIcon               from '@mui/icons-material/Policy'
import MedicalServicesIcon      from '@mui/icons-material/MedicalServices'
import NotificationsIcon        from '@mui/icons-material/Notifications'
import MeetingRoomIcon          from '@mui/icons-material/MeetingRoom'
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing'
import InventoryIcon            from '@mui/icons-material/Inventory2'
import BlockIcon                from '@mui/icons-material/Block'
import EventAvailableIcon       from '@mui/icons-material/EventAvailable'
import BadgeIcon                from '@mui/icons-material/Badge'
import CategoryIcon             from '@mui/icons-material/Category'
import WorkspacePremiumIcon     from '@mui/icons-material/WorkspacePremium'
import MedicationIcon           from '@mui/icons-material/Medication'
import SummarizeIcon            from '@mui/icons-material/Summarize'
import GavelIcon                from '@mui/icons-material/Gavel'
import GlobeIcon                from '@mui/icons-material/Language'
import EmailRulesIcon           from '@mui/icons-material/AlternateEmail'
import FormatListNumberedIcon   from '@mui/icons-material/FormatListNumbered'
import FamilyRestroomRoundedIcon from '@mui/icons-material/FamilyRestroomRounded'
import SearchRoundedIcon        from '@mui/icons-material/SearchRounded'
import CloseRoundedIcon         from '@mui/icons-material/CloseRounded'
import DarkModeRoundedIcon      from '@mui/icons-material/DarkModeRounded'
import LightModeRoundedIcon     from '@mui/icons-material/LightModeRounded'
import AddRoundedIcon           from '@mui/icons-material/AddRounded'
import ViewSidebarRoundedIcon   from '@mui/icons-material/ViewSidebarRounded'
import ViewStreamRoundedIcon    from '@mui/icons-material/ViewStreamRounded'
import KeyboardReturnRoundedIcon from '@mui/icons-material/KeyboardReturnRounded'
import NavigateNextRoundedIcon  from '@mui/icons-material/NavigateNextRounded'
import PersonRoundedIcon        from '@mui/icons-material/PersonRounded'
import WarningRoundedIcon       from '@mui/icons-material/WarningRounded'
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded'
import ScienceRoundedIcon       from '@mui/icons-material/ScienceRounded'
import StarRoundedIcon          from '@mui/icons-material/StarRounded'

import { useAuth } from '../context/AuthContext'
import NotificationBell from '../components/shared/NotificationBell'
import { useInactivityLogout } from '../hooks/useInactivityLogout'
import * as MockStore from '../mocks/store'

// ─── Constants ────────────────────────────────────────────────────────────────
const DRAWER_WIDTH = 260
const TEAL         = '#006D77'
const TEAL_LIGHT   = '#00858F'

// REQ002/PLAN022 — org branding (logo + org name in the sidebar/top-nav
// header). No role gate on myOrgBranding (any authenticated user); resolves
// to null for a platform-wide caller (admin/super_admin), which keeps the
// default HealthSync wordmark exactly as it renders today.
const GET_MY_ORG_BRANDING = gql`
  query MyOrgBrandingForShell { myOrgBranding { name logo_url primary_color secondary_color } }
`
// logo_url from the backend is a relative /uploads/... path (local
// filesystem storage, see org-branding.controller.ts) -- resolve it against
// the API origin the same way settings/index.jsx's own logo/avatar preview does.
function resolveLogoSrc(logoUrl) {
  if (!logoUrl) return undefined
  if (logoUrl.startsWith('http')) return logoUrl
  const apiBase = (import.meta.env.VITE_GRAPHQL_URL || 'http://localhost:4000/graphql').replace(/\/graphql$/, '')
  return `${apiBase}${logoUrl}`
}

// REQ053/Phase G+3 — the client-side half of ending an impersonation
// session lives in AuthContext's endImpersonating(); the caller (here)
// is responsible for the EndImpersonation mutation itself, best-effort —
// even if this call fails, endImpersonating() still restores the real
// admin's stashed session, since an un-ended impersonation token simply
// expires on its own ≤30-minute TTL regardless.
const END_IMPERSONATION_MUTATION = gql`
  mutation EndImpersonationFromShell { endImpersonation { success userErrors { message } } }
`
const IMPERSONATION_BANNER_HEIGHT = 36

// ─── Search mock data ─────────────────────────────────────────────────────────
const SEARCH_DATA = [
  { type: 'patient',     label: 'Alice Thompson',    sub: 'GP Consultation · alice@example.com',        path: '/patients', Icon: PersonRoundedIcon },
  { type: 'patient',     label: 'Bob Martinez',      sub: 'Blood Test · bob@example.com',               path: '/patients', Icon: PersonRoundedIcon },
  { type: 'patient',     label: 'Carol Davis',       sub: 'Follow-Up · carol@example.com',              path: '/patients', Icon: PersonRoundedIcon },
  { type: 'clinician',  label: 'Dr. Sarah Mitchell', sub: 'General Practitioner · Meridian Central',    path: '/clinicians', Icon: MedicalServicesIcon },
  { type: 'clinician',  label: 'Dr. James Okafor',  sub: 'Cardiologist · Northside Medical',            path: '/clinicians', Icon: MedicalServicesIcon },
  { type: 'appointment',label: 'Alice Thompson',    sub: 'GP Consultation · Today 14:30',               path: '/appointments', Icon: EventNoteIcon },
  { type: 'appointment',label: 'Bob Martinez',      sub: 'Blood Test · Tomorrow 09:00',                 path: '/appointments', Icon: EventNoteIcon },
  { type: 'page',       label: 'Calendar',           sub: 'Appointment scheduling calendar',            path: '/calendar', Icon: CalendarMonthIcon },
  { type: 'page',       label: 'Analytics',          sub: 'Reports and charts',                         path: '/analytics', Icon: BarChartIcon },
  { type: 'page',       label: 'Settings',           sub: 'Profile, security, appearance',              path: '/settings', Icon: SettingsIcon },
]
const TYPE_COLOR = { patient: '#0F9D58', clinician: '#9334E6', appointment: TEAL, page: '#80868B' }
const TYPE_BG    = { patient: '#E6F4EA', clinician: '#F3E8FD', appointment: 'rgba(0,109,119,0.10)', page: '#F1F3F4' }

// ─── Nav config — filtered by role ────────────────────────────────────────────
const NAV_CONFIG = [
  // ── Dashboard: role-specific portals ──────────────────────────────────────
  { label: 'My Dashboard',  path: '/clinician/dashboard',  icon: <DashboardIcon />,          roles: ['clinician'] },
  { label: 'My Dashboard',  path: '/patient/dashboard',    icon: <DashboardIcon />,          roles: ['patient'] },
  { label: 'Dashboard',     path: '/dashboard',            icon: <DashboardIcon />,          roles: ['admin','super_admin','receptionist','staff'] },
  { label: 'Dashboard',     path: '/manager/dashboard',    icon: <DashboardIcon />,          roles: ['manager'] },
  // ── Appointments: role-specific ───────────────────────────────────────────
  { label: 'My Appointments', path: '/patient/appointments', icon: <EventNoteIcon />,        roles: ['patient'] },
  { label: 'My Family',     path: '/patient/family',       icon: <FamilyRestroomRoundedIcon />, roles: ['patient'] },
  { label: 'Appointments',  path: '/appointments',         icon: <EventNoteIcon />,          roles: ['admin','super_admin','manager','receptionist','staff','clinician'] },
  // ── Calendar: role-specific ───────────────────────────────────────────────
  { label: 'My Calendar',   path: '/clinician/calendar',   icon: <CalendarMonthIcon />,      roles: ['clinician'] },
  { label: 'Calendar',      path: '/calendar',             icon: <CalendarMonthIcon />,      roles: ['admin','super_admin','manager','receptionist','staff'] },
  // ── Patients ──────────────────────────────────────────────────────────────
  { label: 'My Patients',   path: '/clinician/patients',   icon: <GroupIcon />,              roles: ['clinician'] },
  { label: 'Patients',      path: '/patients',             icon: <GroupIcon />,              roles: ['admin','super_admin','manager','receptionist','staff'] },
  { label: 'Clinicians',    path: '/clinicians',           icon: <PersonIcon />,             roles: ['admin','super_admin','manager','receptionist','staff'] },
  { label: 'Live Queue',    path: '/queue',                icon: <FormatListNumberedIcon />, roles: ['admin','super_admin','manager','receptionist','staff','clinician'] },
  // REQ059 — pharmacy.resolver.ts is @Auth('staff','manager','admin',
  // 'super_admin'); previously only nested under the Manager section below,
  // which only renders for isManager (admin/super_admin/manager) — a real
  // staff pharmacy worker had no nav path to a page the backend already
  // let them use, matching App.jsx's own route-guard fix for the same gap.
  { label: 'Pharmacy',      path: '/manager/pharmacy',     icon: <MedicationIcon />,         roles: ['admin','super_admin','manager','staff'] },
  // ── Shared ────────────────────────────────────────────────────────────────
  { label: 'Messages',      path: '/messages',             icon: <MessageIcon />,            roles: 'all', badge: 0 },
  { label: 'Staff',         path: '/staff',                icon: <BadgeIcon />,              roles: ['admin','super_admin','manager'] },
  { label: 'Finances',      path: '/finances',             icon: <AttachMoneyIcon />,        roles: ['admin','super_admin','manager'] },
  { label: 'Reviews',       path: '/reviews',              icon: <StarRoundedIcon />,        roles: ['admin','super_admin','manager'] },
  { label: 'Analytics',     path: '/analytics',            icon: <BarChartIcon />,           roles: ['admin','super_admin','manager'] },
  { label: 'Test Results',  path: '/test-results',         icon: <ScienceRoundedIcon />,     roles: ['admin','super_admin','manager','clinician'] },
  { label: 'My Availability', path: '/clinician/availability', icon: <EventAvailableIcon />, roles: ['clinician'] },
  { label: 'Settings',      path: '/settings',             icon: <SettingsIcon />,           roles: 'all' },
]

const ADMIN_CHILDREN = [
  { label: 'Users & RBAC',    path: '/admin/users',           icon: <SecurityIcon /> },
  { label: 'Organizations',   path: '/admin/organizations',   icon: <BusinessIcon /> },
  { label: 'Communications',  path: '/admin/communications',  icon: <EmailIcon /> },
  { label: 'Policies',        path: '/admin/policies',        icon: <PolicyIcon /> },
  { label: 'Roles',           path: '/admin/roles',           icon: <AdminPanelSettingsIcon /> },
  { label: 'Clinician Types', path: '/admin/clinician-types', icon: <BadgeIcon /> },
  { label: 'Room Types',      path: '/admin/room-types',      icon: <MeetingRoomIcon /> },
  { label: 'Departments',     path: '/admin/departments',     icon: <CategoryIcon /> },
  { label: 'Languages',       path: '/admin/languages',       icon: <GlobeIcon /> },
  { label: 'Email Templates', path: '/admin/email-templates', icon: <EmailRulesIcon /> },
  { label: 'Plans',           path: '/admin/plans',           icon: <WorkspacePremiumIcon /> },
  { label: 'Insurance Payers', path: '/admin/payers',         icon: <LocalHospitalIcon /> },
  { label: 'Rights Requests', path: '/admin/rights-requests', icon: <GavelIcon /> },
]

const MANAGER_CHILDREN = [
  { label: 'Dashboard',    path: '/manager/dashboard', icon: <DashboardIcon /> },
  { label: 'Clinics',      path: '/manager/clinics',      icon: <BusinessIcon /> },
  { label: 'Availability', path: '/manager/availability', icon: <EventAvailableIcon /> },
  { label: 'Blocks',       path: '/manager/blocks',       icon: <BlockIcon /> },
  { label: 'Rooms',        path: '/manager/rooms',        icon: <MeetingRoomIcon /> },
  { label: 'Resources',    path: '/manager/resources',    icon: <PrecisionManufacturingIcon /> },
  { label: 'Products',     path: '/manager/products',     icon: <InventoryIcon /> },
  { label: 'Services',     path: '/manager/services',     icon: <MedicalServicesIcon /> },
  { label: 'Patient Reports', path: '/manager/reports',   icon: <SummarizeIcon /> },
  // Phase G+3 — checklist + intake-field config (REQ051/REQ052).
  { label: 'Clinic Forms', path: '/manager/clinic-forms', icon: <FormatListNumberedIcon /> },
  // Phase G+3 — multi-sitting service packages (REQ054).
  { label: 'Packages',     path: '/manager/packages',     icon: <WorkspacePremiumIcon /> },
]

const BOTTOM_NAV = [
  { label: 'Dashboard',    path: '/dashboard',    icon: <DashboardIcon /> },
  { label: 'Calendar',     path: '/calendar',     icon: <CalendarMonthIcon /> },
  { label: 'Appointments', path: '/appointments', icon: <EventNoteIcon /> },
  { label: 'Notify',       path: null,            icon: <NotificationsIcon /> },
  { label: 'Menu',         path: null,            icon: <MenuIcon /> },
]

const ROLE_COLORS = {
  admin:        { bg: '#006D77', label: 'Admin' },
  super_admin:  { bg: '#7C3AED', label: 'Super Admin' },
  manager:      { bg: '#3A86FF', label: 'Manager' },
  clinician:    { bg: '#2DC653', label: 'Clinician' },
  // 'staff' is the real seeded role name — RolesGuard never sees
  // 'receptionist' (see NAV_CONFIG's own comment on the same dead name a
  // few lines below). Keying this map by the dead name meant every real
  // staff/receptionist account fell through to the ROLE_COLORS.patient
  // fallback and showed a "Patient" badge in the sidebar/topbar.
  staff:        { bg: '#F9AB00', label: 'Staff' },
  patient:      { bg: '#80868B', label: 'Patient' },
}

function filterNav(items, userRoles) {
  const roleSet = Array.isArray(userRoles) ? userRoles : [userRoles]
  return items.filter(item => item.roles === 'all' || roleSet.some(r => item.roles.includes(r)))
}

// ─── Inline Search Dropdown ────────────────────────────────────────────────────
function SearchDropdown({ query, onSelect, activeIdx, setActiveIdx }) {
  const results = query.length >= 1
    ? SEARCH_DATA.filter(d =>
        d.label.toLowerCase().includes(query.toLowerCase()) ||
        d.sub.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 8)
    : SEARCH_DATA.filter(d => d.type === 'page').slice(0, 6)

  if (!results.length) return null

  const grouped = results.reduce((acc, r) => {
    if (!acc[r.type]) acc[r.type] = []
    acc[r.type].push(r)
    return acc
  }, {})

  let flatIdx = -1

  return (
    <Paper elevation={0} sx={{
      position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
      zIndex: 2000, borderRadius: 2.5,
      border: '1px solid #E8EAED',
      boxShadow: '0 8px 32px rgba(32,33,36,0.18)',
      overflow: 'hidden',
    }}>
      {Object.entries(grouped).map(([type, items]) => (
        <Box key={type}>
          <Box sx={{ px: 2, pt: 1.25, pb: 0.25 }}>
            <Typography variant="caption" sx={{ color: '#9AA0A6', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '0.64rem' }}>
              {type === 'page' ? 'Quick links' : type + 's'}
            </Typography>
          </Box>
          <List dense disablePadding>
            {items.map(item => {
              flatIdx += 1
              const idx = flatIdx
              const isActive = activeIdx === idx
              return (
                <ListItem
                  key={item.label + type}
                  button
                  onClick={() => onSelect(item)}
                  onMouseEnter={() => setActiveIdx(idx)}
                  sx={{
                    px: 2, py: 0.8, cursor: 'pointer',
                    bgcolor: isActive ? 'rgba(0,109,119,0.07)' : 'transparent',
                    '&:hover': { bgcolor: 'rgba(0,109,119,0.04)' },
                    transition: 'background 0.1s',
                  }}
                >
                  <ListItemAvatar sx={{ minWidth: 36 }}>
                    <Avatar sx={{ width: 28, height: 28, bgcolor: TYPE_BG[type], borderRadius: 1.5 }}>
                      <item.Icon sx={{ fontSize: '0.85rem', color: TYPE_COLOR[type] }} />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={<Typography variant="body2" fontWeight={700} sx={{ color: '#202124', lineHeight: 1.2 }}>{item.label}</Typography>}
                    secondary={<Typography variant="caption" sx={{ color: '#9AA0A6' }}>{item.sub}</Typography>}
                  />
                  {isActive && <KeyboardReturnRoundedIcon sx={{ fontSize: '0.85rem', color: '#9AA0A6', flexShrink: 0 }} />}
                </ListItem>
              )
            })}
          </List>
        </Box>
      ))}
      <Box sx={{ px: 2, py: 0.9, borderTop: '1px solid #F1F3F4', bgcolor: '#FAFAFA', display: 'flex', gap: 2 }}>
        {[['↑↓', 'navigate'], ['↵', 'open'], ['ESC', 'close']].map(([k, lbl]) => (
          <Box key={k} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Chip label={k} size="small" sx={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '0.65rem', height: 18, bgcolor: '#fff', border: '1px solid #E8EAED', '& .MuiChip-label': { px: 0.6 } }} />
            <Typography variant="caption" sx={{ color: '#9AA0A6', fontSize: '0.68rem' }}>{lbl}</Typography>
          </Box>
        ))}
      </Box>
    </Paper>
  )
}

// ─── Drawer/Sidebar Content ────────────────────────────────────────────────────
function DrawerContent({ user, navItems, location, navigate, expandedAdmin, setExpandedAdmin, expandedManager, setExpandedManager, branding, onClose }) {
  const userRoles = user?.roles?.map(r => r.name) || ['patient']
  const role      = userRoles[0]
  const roleCfg   = ROLE_COLORS[role] || ROLE_COLORS.patient
  const isAdmin   = userRoles.some(r => ['admin','super_admin'].includes(r))
  const isManager = userRoles.some(r => ['admin','super_admin','manager'].includes(r))

  const initials  = (user?.name || user?.email || 'U').slice(0, 1).toUpperCase()
  const displayName = user?.name || user?.email || 'User'

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/')

  return (
    <Box sx={{ width: DRAWER_WIDTH, height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#1A2332', overflow: 'hidden' }}>

      {/* Brand header */}
      <Box sx={{
        background: `linear-gradient(160deg, #004D55 0%, ${TEAL} 100%)`,
        px: 2.5, py: 2,
        display: 'flex', alignItems: 'center', gap: 1.5,
      }}>
        {branding?.logo_url ? (
          <Box component="img" src={resolveLogoSrc(branding.logo_url)} alt={`${branding.name} logo`} sx={{
            width: 36, height: 36, borderRadius: 1.5, objectFit: 'cover',
            border: '1px solid rgba(255,255,255,0.20)', flexShrink: 0,
          }} />
        ) : (
          <Box sx={{
            width: 36, height: 36, borderRadius: 1.5,
            background: 'rgba(255,255,255,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '1px solid rgba(255,255,255,0.20)',
          }}>
            <LocalHospitalIcon sx={{ color: '#fff', fontSize: 20 }} />
          </Box>
        )}
        <Box sx={{ minWidth: 0 }}>
          {branding?.logo_url ? (
            <Typography variant="subtitle1" fontWeight={800} noWrap sx={{ color: '#fff', lineHeight: 1.1, letterSpacing: '-0.4px' }}>
              {branding.name}
            </Typography>
          ) : (
            <Typography variant="subtitle1" fontWeight={800} sx={{ color: '#fff', lineHeight: 1.1, letterSpacing: '-0.4px' }}>
              Health<span style={{ color: '#7FEBED' }}>Sync</span>
            </Typography>
          )}
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.55)', display: 'block', fontSize: '0.68rem' }}>
            Medical Platform
          </Typography>
        </Box>
      </Box>

      {/* User card */}
      <Box sx={{ px: 2, pt: 2, pb: 1 }}>
        <Box sx={{ bgcolor: 'rgba(255,255,255,0.06)', borderRadius: 2, p: 1.5, display: 'flex', alignItems: 'center', gap: 1.25 }}>
          <Box sx={{ position: 'relative', flexShrink: 0 }}>
            <Avatar sx={{ width: 38, height: 38, bgcolor: TEAL, fontWeight: 800, fontSize: '0.9rem', boxShadow: `0 2px 8px rgba(0,109,119,0.35)` }}>
              {initials}
            </Avatar>
            <Box sx={{ position: 'absolute', bottom: 0, right: 0, width: 9, height: 9, borderRadius: '50%', bgcolor: '#0F9D58', border: '2px solid #1A2332' }} />
          </Box>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="body2" fontWeight={700} noWrap sx={{ color: '#fff', fontSize: '0.83rem' }}>{displayName}</Typography>
            <Chip label={roleCfg.label} size="small" sx={{ mt: 0.3, height: 17, fontSize: '0.6rem', fontWeight: 700, bgcolor: roleCfg.bg + '33', color: '#fff', border: 'none', '& .MuiChip-label': { px: 0.8 } }} />
          </Box>
        </Box>
      </Box>

      {/* Navigation */}
      <Box sx={{ flex: 1, overflowY: 'auto', py: 0.5, px: 1 }}>
        {navItems.map(item => {
          const active = isActive(item.path)
          return (
            <ListItemButton
              key={item.path}
              selected={active}
              onClick={() => { navigate(item.path); onClose?.() }}
              sx={{
                borderRadius: '10px', py: 1.1, px: 1.5, mb: 0.3,
                color: active ? '#fff' : 'rgba(255,255,255,0.58)',
                background: active ? `linear-gradient(135deg, ${TEAL}E8 0%, ${TEAL_LIGHT}F2 100%)` : 'transparent',
                boxShadow: active ? `0 2px 10px rgba(0,109,119,0.36)` : 'none',
                '&:hover': { bgcolor: active ? undefined : 'rgba(255,255,255,0.06)', color: '#fff' },
                '&.Mui-selected': { background: `linear-gradient(135deg, ${TEAL}E8 0%, ${TEAL_LIGHT}F2 100%)`, color: '#fff', '& .MuiListItemIcon-root': { color: '#fff' } },
                '&.Mui-selected:hover': { background: `linear-gradient(135deg, ${TEAL} 0%, ${TEAL_LIGHT} 100%)` },
                transition: 'all 0.15s ease',
              }}
            >
              <ListItemIcon sx={{ minWidth: 36, color: active ? '#fff' : 'rgba(255,255,255,0.38)', '& .MuiSvgIcon-root': { fontSize: '1.15rem' }, transition: 'color 0.15s' }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText primary={item.label} primaryTypographyProps={{ fontSize: '0.865rem', fontWeight: active ? 700 : 500, color: 'inherit' }} />
              {item.badge > 0 && (
                <Box sx={{ bgcolor: '#D93025', color: '#fff', borderRadius: '10px', px: 0.8, py: 0.1, fontSize: '0.6rem', fontWeight: 700 }}>
                  {item.badge}
                </Box>
              )}
            </ListItemButton>
          )
        })}

        {/* Manager section */}
        {isManager && (
          <>
            <ListItemButton onClick={() => setExpandedManager(v => !v)} sx={{ borderRadius: '10px', py: 1.1, px: 1.5, mb: 0.3, color: 'rgba(255,255,255,0.58)', '&:hover': { bgcolor: 'rgba(255,255,255,0.06)', color: '#fff' } }}>
              <ListItemIcon sx={{ minWidth: 36, color: 'rgba(255,255,255,0.38)', '& .MuiSvgIcon-root': { fontSize: '1.15rem' } }}><SettingsIcon /></ListItemIcon>
              <ListItemText primary="Manager" primaryTypographyProps={{ fontSize: '0.865rem', fontWeight: 500, color: 'inherit' }} />
              {expandedManager ? <ExpandLessIcon sx={{ fontSize: '1rem', color: 'rgba(255,255,255,0.40)' }} /> : <ExpandMoreIcon sx={{ fontSize: '1rem', color: 'rgba(255,255,255,0.40)' }} />}
            </ListItemButton>
            <Collapse in={expandedManager} timeout="auto" unmountOnExit>
              <List disablePadding sx={{ pl: 1 }}>
                {MANAGER_CHILDREN.map(child => {
                  const act = location.pathname === child.path
                  return (
                    <ListItemButton key={child.path} selected={act} onClick={() => { navigate(child.path); onClose?.() }}
                      sx={{ borderRadius: '8px', py: 0.8, px: 1.5, mb: 0.3, color: act ? '#fff' : 'rgba(255,255,255,0.48)', background: act ? `${TEAL}CC` : 'transparent', '&:hover': { bgcolor: 'rgba(255,255,255,0.06)', color: '#fff' }, '&.Mui-selected': { background: `${TEAL}CC`, color: '#fff' } }}>
                      <ListItemIcon sx={{ minWidth: 32, color: 'inherit', '& .MuiSvgIcon-root': { fontSize: '1rem' } }}>{child.icon}</ListItemIcon>
                      <ListItemText primary={child.label} primaryTypographyProps={{ fontSize: '0.82rem', fontWeight: act ? 700 : 400, color: 'inherit' }} />
                    </ListItemButton>
                  )
                })}
              </List>
            </Collapse>
          </>
        )}

        {/* Admin section */}
        {isAdmin && (
          <>
            <ListItemButton onClick={() => setExpandedAdmin(v => !v)} sx={{ borderRadius: '10px', py: 1.1, px: 1.5, mb: 0.3, color: 'rgba(255,255,255,0.58)', '&:hover': { bgcolor: 'rgba(255,255,255,0.06)', color: '#fff' } }}>
              <ListItemIcon sx={{ minWidth: 36, color: 'rgba(255,255,255,0.38)', '& .MuiSvgIcon-root': { fontSize: '1.15rem' } }}><AdminPanelSettingsIcon /></ListItemIcon>
              <ListItemText primary="Admin" primaryTypographyProps={{ fontSize: '0.865rem', fontWeight: 500, color: 'inherit' }} />
              {expandedAdmin ? <ExpandLessIcon sx={{ fontSize: '1rem', color: 'rgba(255,255,255,0.40)' }} /> : <ExpandMoreIcon sx={{ fontSize: '1rem', color: 'rgba(255,255,255,0.40)' }} />}
            </ListItemButton>
            <Collapse in={expandedAdmin} timeout="auto" unmountOnExit>
              <List disablePadding sx={{ pl: 1 }}>
                {ADMIN_CHILDREN.map(child => {
                  const act = location.pathname === child.path
                  return (
                    <ListItemButton key={child.path} selected={act} onClick={() => { navigate(child.path); onClose?.() }}
                      sx={{ borderRadius: '8px', py: 0.8, px: 1.5, mb: 0.3, color: act ? '#fff' : 'rgba(255,255,255,0.48)', background: act ? `${TEAL}CC` : 'transparent', '&:hover': { bgcolor: 'rgba(255,255,255,0.06)', color: '#fff' }, '&.Mui-selected': { background: `${TEAL}CC`, color: '#fff' } }}>
                      <ListItemIcon sx={{ minWidth: 32, color: 'inherit', '& .MuiSvgIcon-root': { fontSize: '1rem' } }}>{child.icon}</ListItemIcon>
                      <ListItemText primary={child.label} primaryTypographyProps={{ fontSize: '0.82rem', fontWeight: act ? 700 : 400, color: 'inherit' }} />
                    </ListItemButton>
                  )
                })}
              </List>
            </Collapse>
          </>
        )}
      </Box>

      {/* Emergency button */}
      <Box sx={{ px: 2, py: 1.5 }}>
        <Box component="a" href="tel:911" sx={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1,
          bgcolor: 'rgba(217,48,37,0.18)', color: '#FF6B5B',
          border: '1px solid rgba(217,48,37,0.30)',
          borderRadius: 2, py: 0.9, textDecoration: 'none',
          fontFamily: '"Plus Jakarta Sans", sans-serif', fontWeight: 700, fontSize: '0.78rem',
          '&:hover': { bgcolor: 'rgba(217,48,37,0.26)' }, transition: 'all 0.15s',
        }}>
          <WarningRoundedIcon sx={{ fontSize: '0.95rem' }} /> Emergency — 911
        </Box>
      </Box>
    </Box>
  )
}

// ─── Top Navigation Bar ────────────────────────────────────────────────────────
function TopNavBar({ navItems, location, navigate, onToggleLayout, onOpenUserMenu, branding, bannerOffset = 0 }) {
  const [moreAnchor, setMoreAnchor] = useState(null)
  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/')

  // Split nav items — show first 6, rest in "More"
  const mainItems = navItems.slice(0, 6)
  const moreItems  = navItems.slice(6)

  return (
    <Box sx={{
      position: 'fixed', top: bannerOffset, left: 0, right: 0, zIndex: 1200,
      bgcolor: '#1A2332',
      borderBottom: '1px solid rgba(255,255,255,0.08)',
      boxShadow: '0 2px 12px rgba(0,0,0,0.25)',
    }}>
      <Box sx={{ height: 2.5, background: `linear-gradient(90deg, ${TEAL}, ${TEAL_LIGHT}, #0F9D58)` }} />
      <Box sx={{ display: 'flex', alignItems: 'center', px: 3, gap: 0, minHeight: 52 }}>
        {/* Logo */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mr: 3, flexShrink: 0 }}>
          {branding?.logo_url ? (
            <Box component="img" src={resolveLogoSrc(branding.logo_url)} alt={`${branding.name} logo`} sx={{ width: 32, height: 32, borderRadius: 1.5, objectFit: 'cover', border: '1px solid rgba(255,255,255,0.18)' }} />
          ) : (
            <Box sx={{ width: 32, height: 32, borderRadius: 1.5, bgcolor: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.18)' }}>
              <LocalHospitalIcon sx={{ color: '#fff', fontSize: 18 }} />
            </Box>
          )}
          {branding?.logo_url ? (
            <Typography variant="subtitle1" fontWeight={800} noWrap sx={{ color: '#fff', letterSpacing: '-0.5px', lineHeight: 1, maxWidth: 160 }}>
              {branding.name}
            </Typography>
          ) : (
            <Typography variant="subtitle1" fontWeight={800} sx={{ color: '#fff', letterSpacing: '-0.5px', lineHeight: 1 }}>
              Health<span style={{ color: '#7FEBED' }}>Sync</span>
            </Typography>
          )}
        </Box>

        <Divider orientation="vertical" flexItem sx={{ borderColor: 'rgba(255,255,255,0.12)', mx: 1.5 }} />

        {/* Nav links */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, flex: 1 }}>
          {mainItems.map(item => {
            const active = isActive(item.path)
            return (
              <Button key={item.path} startIcon={<Box sx={{ '& .MuiSvgIcon-root': { fontSize: '0.9rem' }, display: 'flex' }}>{item.icon}</Box>}
                onClick={() => navigate(item.path)}
                sx={{
                  textTransform: 'none', fontWeight: active ? 700 : 500, fontSize: '0.82rem', borderRadius: '8px',
                  px: 1.4, py: 0.7, minWidth: 'auto', color: active ? '#fff' : 'rgba(255,255,255,0.60)',
                  bgcolor: active ? `${TEAL}CC` : 'transparent',
                  boxShadow: active ? `0 2px 8px rgba(0,109,119,0.35)` : 'none',
                  '&:hover': { bgcolor: active ? `${TEAL}E0` : 'rgba(255,255,255,0.08)', color: '#fff' },
                  transition: 'all 0.15s', fontFamily: '"Plus Jakarta Sans", sans-serif',
                }}
              >
                {item.label}
                {item.badge > 0 && <Box component="span" sx={{ ml: 0.75, bgcolor: '#D93025', color: '#fff', borderRadius: '10px', px: 0.7, py: 0.1, fontSize: '0.6rem', fontWeight: 800, lineHeight: 1.6 }}>{item.badge}</Box>}
              </Button>
            )
          })}

          {moreItems.length > 0 && (
            <>
              <Button endIcon={<KeyboardArrowDownRoundedIcon sx={{ fontSize: '1rem' }} />} onClick={e => setMoreAnchor(e.currentTarget)}
                sx={{ textTransform: 'none', fontWeight: 500, fontSize: '0.82rem', borderRadius: '8px', px: 1.4, py: 0.7, color: 'rgba(255,255,255,0.60)', minWidth: 'auto', '&:hover': { bgcolor: 'rgba(255,255,255,0.08)', color: '#fff' }, fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
                More
              </Button>
              <Menu anchorEl={moreAnchor} open={Boolean(moreAnchor)} onClose={() => setMoreAnchor(null)}
                slotProps={{ paper: { elevation: 0, sx: { mt: 1, minWidth: 200, borderRadius: 2.5, border: '1px solid #E8EAED', boxShadow: '0 8px 32px rgba(32,33,36,0.18)' } } }}>
                {moreItems.map(item => {
                  const active = isActive(item.path)
                  return (
                    <MenuItem key={item.path} onClick={() => { navigate(item.path); setMoreAnchor(null) }}
                      sx={{ borderRadius: 1.5, mx: 0.5, color: active ? TEAL : 'inherit', bgcolor: active ? 'rgba(0,109,119,0.08)' : 'transparent', fontWeight: active ? 700 : 400 }}>
                      <ListItemIcon sx={{ color: active ? TEAL : 'inherit' }}>{item.icon}</ListItemIcon>
                      {item.label}
                    </MenuItem>
                  )
                })}
              </Menu>
            </>
          )}
        </Box>

        {/* Right: switch to sidebar */}
        <Tooltip title="Switch to Sidebar navigation">
          <IconButton size="small" onClick={onToggleLayout}
            sx={{ color: 'rgba(0,169,181,0.80)', bgcolor: 'rgba(0,109,119,0.18)', borderRadius: 1.5, p: 0.7, mr: 1, '&:hover': { bgcolor: 'rgba(0,109,119,0.30)' } }}>
            <ViewSidebarRoundedIcon sx={{ fontSize: '1.1rem' }} />
          </IconButton>
        </Tooltip>
        <Divider orientation="vertical" flexItem sx={{ borderColor: 'rgba(255,255,255,0.12)', mr: 1 }} />
        <Tooltip title="User menu">
          <IconButton onClick={onOpenUserMenu} sx={{ p: 0.5 }}>
            <Avatar sx={{ width: 30, height: 30, bgcolor: TEAL, fontSize: '0.72rem', fontWeight: 700, boxShadow: `0 2px 8px rgba(0,109,119,0.40)` }}>A</Avatar>
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  )
}

// ─── Main AppShell ────────────────────────────────────────────────────────────
export default function AppShell() {
  const theme    = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout, isImpersonating, endImpersonating } = useAuth()
  const [endImpersonationMutation] = useMutation(END_IMPERSONATION_MUTATION)
  const handleExitImpersonation = async () => {
    try { await endImpersonationMutation() } catch { /* best-effort — restore the real session regardless */ }
    endImpersonating()
    navigate('/')
  }
  const bannerOffset = isImpersonating ? IMPERSONATION_BANNER_HEIGHT : 0
  // REQ002/PLAN022 — org branding for the sidebar/top-nav header. Resolves
  // to null (not an error) for a platform-wide caller, which the render
  // below treats as "show the default HealthSync branding."
  const { data: brandingData } = useQuery(GET_MY_ORG_BRANDING, { errorPolicy: 'ignore' })
  const branding = brandingData?.myOrgBranding ?? null

  const [mobileOpen,       setMobileOpen]       = useState(false)
  const [expandedAdmin,    setExpandedAdmin]     = useState(false)
  const [expandedManager,  setExpandedManager]   = useState(false)
  const [anchorEl,         setAnchorEl]          = useState(null)
  const [scrolled,         setScrolled]          = useState(false)
  const [darkMode,         setDarkMode]          = useState(false)
  // SUG-AUTH-003: inactivity auto-logout warning
  const [warnSeconds,      setWarnSeconds]       = useState(null)
  // BUG-MSG-001: live unread badge from MockStore
  const [msgUnreadCount,   setMsgUnreadCount]    = useState(
    () => MockStore.getStore().message_threads.filter(t => (t.unread_count ?? 0) > 0).length
  )

  // Nav layout toggle (persisted)
  const [navLayout, setNavLayout] = useState(() => {
    try { return localStorage.getItem('hs_nav_layout') ?? 'left' } catch { return 'left' }
  })
  const isTopNav = navLayout === 'top'

  // Inline search
  const [inlineOpen, setInlineOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchActiveIdx, setSearchActiveIdx] = useState(0)
  const searchBoxRef = useRef(null)
  const searchInputRef = useRef(null)

  const userRoles   = user?.roles?.map(r => r.name) || ['patient']
  const role        = userRoles[0]
  const roleCfg     = ROLE_COLORS[role] || ROLE_COLORS.patient
  const rawNavItems = filterNav(NAV_CONFIG, userRoles)
  // BUG-MSG-001: inject live unread count into Messages nav badge
  const navItems    = rawNavItems.map(item =>
    item.path === '/messages' ? { ...item, badge: msgUnreadCount } : item
  )
  const initials    = (user?.name || user?.email || 'U').slice(0, 1).toUpperCase()
  const displayName = user?.name || user?.email || 'User'

  const bottomIdx = BOTTOM_NAV.findIndex(b => b.path && location.pathname.startsWith(b.path))

  const signOut = () => {
    setAnchorEl(null)
    logout()
    navigate('/login')
  }

  // SUG-AUTH-003: auto-logout after 15 min idle + 60s warning
  useInactivityLogout({
    onWarn:   (secs) => setWarnSeconds(secs),
    onLogout: () => {
      setWarnSeconds(null)
      logout()
      navigate('/login?reason=session_expired')
    },
    enabled: true,
  })

  const toggleLayout = useCallback(() => {
    setNavLayout(prev => {
      const next = prev === 'left' ? 'top' : 'left'
      try { localStorage.setItem('hs_nav_layout', next) } catch {}
      return next
    })
  }, [])

  // BUG-MSG-001: subscribe to MockStore for live Messages unread badge
  useEffect(() => {
    return MockStore.subscribe(() => {
      const count = MockStore.getStore().message_threads.filter(t => (t.unread_count ?? 0) > 0).length
      setMsgUnreadCount(count)
    })
  }, [])

  // Scroll detection for shadow
  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 4)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  // ⌘K shortcut
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setInlineOpen(v => !v)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Auto-focus inline search
  useEffect(() => {
    if (inlineOpen) setTimeout(() => searchInputRef.current?.focus(), 60)
  }, [inlineOpen])

  // Click outside to close search
  useEffect(() => {
    if (!inlineOpen) return
    const handler = (e) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target)) {
        setInlineOpen(false); setSearchQuery('')
      }
    }
    setTimeout(() => document.addEventListener('mousedown', handler), 0)
    return () => document.removeEventListener('mousedown', handler)
  }, [inlineOpen])

  const handleSearchSelect = useCallback((item) => {
    navigate(item.path)
    setInlineOpen(false)
    setSearchQuery('')
  }, [navigate])

  const handleSearchKey = (e) => {
    const count = (searchQuery.length >= 1
      ? SEARCH_DATA.filter(d => d.label.toLowerCase().includes(searchQuery.toLowerCase()) || d.sub.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 8)
      : SEARCH_DATA.filter(d => d.type === 'page').slice(0, 6)).length
    if (e.key === 'ArrowDown') { e.preventDefault(); setSearchActiveIdx(i => Math.min(i + 1, count - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setSearchActiveIdx(i => Math.max(i - 1, 0)) }
    if (e.key === 'Escape')   { setInlineOpen(false); setSearchQuery('') }
  }

  const headerHeight = isTopNav ? 57 : 64 // px

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>

      {/* REQ053/Phase G+3 — persistent impersonation banner. Fixed, above
          everything else (AppBar/Drawer/TopNavBar are all offset down by
          IMPERSONATION_BANNER_HEIGHT via bannerOffset when this is shown). */}
      {isImpersonating && (
        <Box sx={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: theme.zIndex.drawer + 10,
          height: IMPERSONATION_BANNER_HEIGHT,
          bgcolor: '#D93025', color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5,
          fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: '0.8rem', fontWeight: 700,
        }}>
          <WarningRoundedIcon sx={{ fontSize: '1rem' }} />
          Impersonating {displayName}
          <Button
            size="small"
            onClick={handleExitImpersonation}
            sx={{
              color: '#fff', textTransform: 'none', fontWeight: 800, minWidth: 0,
              px: 1, py: 0.1, ml: 1, borderRadius: 1.5,
              bgcolor: 'rgba(255,255,255,0.18)', '&:hover': { bgcolor: 'rgba(255,255,255,0.28)' },
            }}
          >
            Exit
          </Button>
        </Box>
      )}

      {/* SUG-AUTH-003: Inactivity warning Snackbar */}
      <Snackbar
        open={warnSeconds !== null}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        sx={{ top: '72px !important' }}
      >
        <Alert
          severity="warning"
          variant="filled"
          action={
            <Button
              color="inherit" size="small" fontWeight={700}
              onClick={() => setWarnSeconds(null)}
              sx={{ fontWeight: 700, textTransform: 'none' }}
            >
              Stay logged in
            </Button>
          }
          sx={{ width: '100%', boxShadow: '0 4px 20px rgba(0,0,0,0.18)' }}
        >
          Session expiring in <strong>{warnSeconds}s</strong> due to inactivity.
        </Alert>
      </Snackbar>

      {/* ── AppBar (left mode only) ──────────────────────────────────────────── */}
      {!isTopNav && (
        <AppBar position="fixed" elevation={0} sx={{
          zIndex: theme.zIndex.drawer + 1,
          top: bannerOffset,
          bgcolor: '#fff',
          color: 'text.primary',
          borderBottom: '1px solid #E8EAED',
          boxShadow: scrolled ? '0 2px 12px rgba(32,33,36,0.12)' : 'none',
          transition: 'box-shadow 0.2s ease',
          ml: isMobile ? 0 : `${DRAWER_WIDTH}px`,
          width: isMobile ? '100%' : `calc(100% - ${DRAWER_WIDTH}px)`,
        }}>
          {/* Slim teal progress accent line */}
          <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${TEAL}, ${TEAL_LIGHT}, #0F9D58)` }} />

          <Toolbar sx={{ minHeight: `${headerHeight}px !important`, gap: 1, px: { xs: 2, sm: 3 }, justifyContent: 'space-between', mt: '3px' }}>

            {/* Left — hamburger + toggle + title */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexShrink: 0 }}>
              {isMobile && (
                <IconButton edge="start" onClick={() => setMobileOpen(true)} sx={{ color: '#5F6368', '&:hover': { bgcolor: 'rgba(0,109,119,0.06)' } }}>
                  <MenuIcon />
                </IconButton>
              )}

              {/* Nav layout toggle */}
              <Tooltip title="Switch to Top navigation">
                <IconButton size="small" onClick={toggleLayout}
                  sx={{
                    display: { xs: 'none', md: 'flex' },
                    color: '#9AA0A6', borderRadius: 1.5, p: 0.7,
                    '&:hover': { bgcolor: 'rgba(0,109,119,0.08)', color: TEAL },
                    transition: 'all 0.18s ease',
                  }}>
                  <ViewStreamRoundedIcon sx={{ fontSize: '1.1rem' }} />
                </IconButton>
              </Tooltip>

              {/* Page title */}
              <Typography variant="h6" fontWeight={700} noWrap sx={{
                color: '#202124', fontSize: { xs: '0.95rem', sm: '1.0rem', md: '1.05rem' }, letterSpacing: '-0.2px',
              }}>
                {/* REQ020: /clinician/encounters/:id has no NAV_CONFIG entry
                    (reached only via the appointment detail page's "Start
                    Consultation" button, not the sidebar) -- without this,
                    the header falsely read "Dashboard" the entire time a
                    clinician was in the consultation workspace. */}
                {location.pathname.startsWith('/clinician/encounters')
                  ? 'Consultation'
                  : navItems.find(n => location.pathname.startsWith(n.path))?.label || 'Dashboard'}
              </Typography>
            </Box>

            {/* Center — collapsible inline search */}
            <Box ref={searchBoxRef} sx={{
              display: { xs: 'none', sm: 'flex' },
              alignItems: 'center',
              position: 'relative',
              flex: inlineOpen ? '1 1 400px' : '0 0 auto',
              maxWidth: inlineOpen ? 500 : 280,
              mx: { sm: 1.5, md: 3 },
              transition: 'flex 0.25s ease, max-width 0.25s ease',
            }}>
              {!inlineOpen ? (
                <Box onClick={() => { setInlineOpen(true); setSearchQuery(''); setSearchActiveIdx(0) }}
                  sx={{
                    display: 'flex', alignItems: 'center', gap: 1,
                    bgcolor: '#F8F9FA', border: '1.5px solid #E8EAED', borderRadius: '24px',
                    px: 1.5, py: 0.75, cursor: 'pointer', width: '100%',
                    transition: 'all 0.18s ease',
                    '&:hover': { borderColor: TEAL, boxShadow: `0 0 0 3px rgba(0,109,119,0.10)`, bgcolor: '#F1F3F4' },
                  }}>
                  <SearchRoundedIcon sx={{ color: '#9AA0A6', fontSize: '1rem', flexShrink: 0 }} />
                  <Typography variant="body2" sx={{ color: '#9AA0A6', flex: 1, fontSize: '0.85rem', fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
                    Search…
                  </Typography>
                  <Chip label="⌘K" size="small" sx={{ height: 20, fontFamily: 'monospace', fontWeight: 800, fontSize: '0.65rem', bgcolor: '#F1F3F4', border: '1px solid #E8EAED', color: '#9AA0A6', '& .MuiChip-label': { px: 0.75 } }} />
                </Box>
              ) : (
                <Box sx={{
                  display: 'flex', alignItems: 'center', gap: 1, width: '100%',
                  bgcolor: '#fff', borderRadius: '12px',
                  border: `2px solid ${TEAL}`,
                  boxShadow: `0 0 0 4px rgba(0,109,119,0.10)`,
                  px: 1.5, py: 0.75,
                }}>
                  <SearchRoundedIcon sx={{ color: TEAL, fontSize: '1rem', flexShrink: 0 }} />
                  <InputBase
                    inputRef={searchInputRef}
                    value={searchQuery}
                    onChange={e => { setSearchQuery(e.target.value); setSearchActiveIdx(0) }}
                    onKeyDown={handleSearchKey}
                    placeholder="Search patients, clinicians, appointments…"
                    fullWidth
                    sx={{ fontSize: '0.875rem', fontFamily: '"Plus Jakarta Sans", sans-serif', fontWeight: 600, color: '#202124' }}
                  />
                  {searchQuery && (
                    <IconButton size="small" onClick={() => setSearchQuery('')} sx={{ color: '#9AA0A6', p: 0.25 }}>
                      <CloseRoundedIcon sx={{ fontSize: '0.9rem' }} />
                    </IconButton>
                  )}
                  <IconButton size="small" onClick={() => { setInlineOpen(false); setSearchQuery('') }} sx={{ color: '#9AA0A6', p: 0.25 }}>
                    <CloseRoundedIcon sx={{ fontSize: '1rem' }} />
                  </IconButton>
                </Box>
              )}
              {inlineOpen && (
                <SearchDropdown
                  query={searchQuery}
                  onSelect={handleSearchSelect}
                  activeIdx={searchActiveIdx}
                  setActiveIdx={setSearchActiveIdx}
                />
              )}
            </Box>

            {/* Right — actions */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
              {/* Mobile search */}
              <Tooltip title="Search (⌘K)">
                <IconButton size="small" onClick={() => setInlineOpen(true)} sx={{ display: { sm: 'none' }, color: '#5F6368', '&:hover': { bgcolor: 'rgba(0,109,119,0.06)' } }}>
                  <SearchRoundedIcon fontSize="small" />
                </IconButton>
              </Tooltip>

              {/* Quick new appointment */}
              <Tooltip title="New Appointment">
                <IconButton size="small" onClick={() => navigate('/appointments/new')}
                  sx={{ display: { xs: 'none', sm: 'flex' }, color: '#fff', bgcolor: TEAL, borderRadius: 1.5, p: 0.7, '&:hover': { bgcolor: '#005A62', boxShadow: `0 4px 12px rgba(0,109,119,0.30)` }, transition: 'all 0.18s ease' }}>
                  <AddRoundedIcon sx={{ fontSize: '1.1rem' }} />
                </IconButton>
              </Tooltip>

              {/* Dark mode */}
              <Tooltip title={darkMode ? 'Light mode' : 'Dark mode'}>
                <IconButton size="small" onClick={() => setDarkMode(v => !v)}
                  sx={{ color: '#5F6368', '&:hover': { bgcolor: 'rgba(0,109,119,0.06)', color: darkMode ? '#F9AB00' : TEAL }, transition: 'all 0.2s' }}>
                  {darkMode ? <LightModeRoundedIcon sx={{ fontSize: '1.2rem' }} /> : <DarkModeRoundedIcon sx={{ fontSize: '1.2rem' }} />}
                </IconButton>
              </Tooltip>

              {/* Notifications */}
              <NotificationBell />

              <Box sx={{ width: 1, height: 22, bgcolor: '#E8EAED', mx: 0.5 }} />

              {/* User avatar */}
              <Tooltip title={displayName}>
                <IconButton onClick={e => setAnchorEl(e.currentTarget)} sx={{ p: 0.5 }}>
                  <Box sx={{ position: 'relative' }}>
                    <Avatar sx={{ width: 34, height: 34, background: `linear-gradient(135deg, ${TEAL_LIGHT} 0%, ${TEAL} 100%)`, fontSize: '0.78rem', fontWeight: 700, boxShadow: `0 2px 8px rgba(0,109,119,0.35)`, transition: 'transform 0.15s', '&:hover': { transform: 'scale(1.05)' } }}>
                      {initials}
                    </Avatar>
                    <Box sx={{ position: 'absolute', bottom: 0, right: 0, width: 9, height: 9, borderRadius: '50%', bgcolor: '#0F9D58', border: '2px solid #FFFFFF' }} />
                  </Box>
                </IconButton>
              </Tooltip>
            </Box>
          </Toolbar>
        </AppBar>
      )}

      {/* ── TopNav (top layout mode) ─────────────────────────────────────────── */}
      {isTopNav && (
        <TopNavBar
          navItems={navItems}
          location={location}
          navigate={navigate}
          onToggleLayout={toggleLayout}
          onOpenUserMenu={e => setAnchorEl(e.currentTarget)}
          branding={branding}
          bannerOffset={bannerOffset}
        />
      )}

      {/* ── User Menu ────────────────────────────────────────────────────────── */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        slotProps={{ paper: { elevation: 0, sx: { mt: 1, minWidth: 230, borderRadius: 2.5, border: '1px solid #E8EAED', boxShadow: '0 8px 32px rgba(32,33,36,0.18)', bgcolor: '#fff', backgroundImage: 'none' } } }}
      >
        <Box sx={{ px: 2.5, py: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar sx={{ width: 40, height: 40, background: `linear-gradient(135deg, ${TEAL_LIGHT} 0%, ${TEAL} 100%)`, fontSize: '0.9rem', fontWeight: 700 }}>{initials}</Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" fontWeight={700} noWrap sx={{ color: '#202124' }}>{displayName}</Typography>
            <Chip label={roleCfg.label} size="small" sx={{ mt: 0.3, height: 17, fontSize: '0.62rem', fontWeight: 700, bgcolor: roleCfg.bg + '22', color: roleCfg.bg, '& .MuiChip-label': { px: 0.8 } }} />
          </Box>
        </Box>
        <Divider sx={{ borderColor: '#E8EAED' }} />
        <Box sx={{ p: 1 }}>
          <MenuItem onClick={() => { navigate(userRoles.includes('patient') ? '/patient/profile' : '/profile'); setAnchorEl(null) }} sx={{ borderRadius: 2, py: 1, px: 1.5, '&:hover': { bgcolor: 'rgba(0,109,119,0.06)' } }}>
            <ListItemIcon><AccountCircleIcon fontSize="small" sx={{ color: '#5F6368' }} /></ListItemIcon>
            <Typography variant="body2" fontWeight={600}>My Profile</Typography>
          </MenuItem>
          <MenuItem onClick={() => { navigate('/settings'); setAnchorEl(null) }} sx={{ borderRadius: 2, py: 1, px: 1.5, '&:hover': { bgcolor: 'rgba(0,109,119,0.06)' } }}>
            <ListItemIcon><SettingsIcon fontSize="small" sx={{ color: '#5F6368' }} /></ListItemIcon>
            <Typography variant="body2" fontWeight={600}>Settings</Typography>
          </MenuItem>
          <MenuItem onClick={toggleLayout} sx={{ borderRadius: 2, py: 1, px: 1.5, '&:hover': { bgcolor: 'rgba(0,109,119,0.06)' } }}>
            <ListItemIcon>{isTopNav ? <ViewSidebarRoundedIcon fontSize="small" sx={{ color: TEAL }} /> : <ViewStreamRoundedIcon fontSize="small" sx={{ color: TEAL }} />}</ListItemIcon>
            <Typography variant="body2" fontWeight={600}>{isTopNav ? 'Switch to Sidebar' : 'Switch to Top Nav'}</Typography>
          </MenuItem>
        </Box>
        <Divider sx={{ borderColor: '#E8EAED' }} />
        <Box sx={{ p: 1 }}>
          <MenuItem onClick={signOut} sx={{ borderRadius: 2, py: 1, px: 1.5, color: '#D93025', '&:hover': { bgcolor: 'rgba(217,48,37,0.06)' } }}>
            <ListItemIcon><LogoutIcon fontSize="small" sx={{ color: '#D93025' }} /></ListItemIcon>
            <Typography variant="body2" fontWeight={700}>Sign Out</Typography>
          </MenuItem>
        </Box>
      </Menu>

      {/* ── Drawer (left mode) ───────────────────────────────────────────────── */}
      {!isTopNav && (
        isMobile ? (
          <Drawer variant="temporary" open={mobileOpen} onClose={() => setMobileOpen(false)} ModalProps={{ keepMounted: true }}
            PaperProps={{ sx: { width: DRAWER_WIDTH, bgcolor: '#1A2332', borderRight: 'none', top: bannerOffset, height: `calc(100% - ${bannerOffset}px)` } }}>
            <DrawerContent user={user} navItems={navItems} location={location} navigate={navigate}
              expandedAdmin={expandedAdmin} setExpandedAdmin={setExpandedAdmin}
              expandedManager={expandedManager} setExpandedManager={setExpandedManager}
              branding={branding}
              onClose={() => setMobileOpen(false)} />
          </Drawer>
        ) : (
          <Drawer variant="permanent" open
            PaperProps={{ sx: { width: DRAWER_WIDTH, bgcolor: '#1A2332', borderRight: 'none', top: bannerOffset, height: `calc(100% - ${bannerOffset}px)` } }}>
            <DrawerContent user={user} navItems={navItems} location={location} navigate={navigate}
              expandedAdmin={expandedAdmin} setExpandedAdmin={setExpandedAdmin}
              expandedManager={expandedManager} setExpandedManager={setExpandedManager}
              branding={branding} />
          </Drawer>
        )
      )}

      {/* ── Main Content ──────────────────────────────────────────────────────── */}
      <Box component="main" sx={{
        ml: (isTopNav || isMobile) ? 0 : `${DRAWER_WIDTH}px`,
        mt: `${(isTopNav ? 57 : headerHeight + 3) + bannerOffset}px`,
        p: { xs: 2, sm: 2.5, md: 3 },
        bgcolor: 'background.default',
        minHeight: '100vh',
        width: (isTopNav || isMobile) ? '100%' : `calc(100% - ${DRAWER_WIDTH}px)`,
        pb: isMobile ? 10 : 3,
        transition: 'margin-left 0.3s ease, width 0.3s ease',
      }}>
        <Outlet />
      </Box>

      {/* ── Mobile Bottom Navigation (left mode only) ──────────────────────── */}
      {isMobile && !isTopNav && (
        <BottomNavigation
          value={bottomIdx >= 0 ? bottomIdx : 0}
          onChange={(_, newVal) => {
            const target = BOTTOM_NAV[newVal]
            if (target.label === 'Menu') setMobileOpen(true)
            else if (target.path) navigate(target.path)
          }}
          sx={{
            position: 'fixed', bottom: 0, left: 0, right: 0,
            zIndex: theme.zIndex.drawer + 2,
            borderTop: '1px solid #D0E8EA', bgcolor: '#fff',
            '& .MuiBottomNavigationAction-root': {
              minWidth: 0, color: '#5A7184',
              '&.Mui-selected': { color: TEAL },
            },
          }}
          showLabels
        >
          {BOTTOM_NAV.map(item => (
            <BottomNavigationAction key={item.label} label={item.label} icon={item.icon} aria-label={item.label} />
          ))}
        </BottomNavigation>
      )}
    </Box>
  )
}
