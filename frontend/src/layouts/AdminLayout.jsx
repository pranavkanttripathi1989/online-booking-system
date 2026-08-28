import { useState } from 'react'
import { Box, Drawer, List, ListItemButton, ListItemIcon, ListItemText, Typography, Divider, IconButton, Stack } from '@mui/material'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import MenuRoundedIcon from '@mui/icons-material/MenuRounded'
import PeopleAltIcon from '@mui/icons-material/PeopleAlt'
import BusinessIcon from '@mui/icons-material/Business'
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings'
import EmailIcon from '@mui/icons-material/Email'
import ChatIcon from '@mui/icons-material/Chat'
import PolicyIcon from '@mui/icons-material/Policy'
import MedicalServicesIcon from '@mui/icons-material/MedicalServices'
import LanguageIcon from '@mui/icons-material/Language'
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom'
import HistoryIcon from '@mui/icons-material/History'
import CategoryIcon from '@mui/icons-material/Category'
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium'
import LocalHospitalIcon from '@mui/icons-material/LocalHospital'
import GavelIcon from '@mui/icons-material/Gavel'

const BRAND = '#006D77'
const SIDEBAR_WIDTH = 224

// BUG032 -- this used to omit 4 real, working /admin/* routes entirely
// (Departments, Plans, Insurance Payers, Rights Requests), reachable only
// via the main AppShell sidebar's own collapsible "Admin" section -- a real
// navigational dead end for anyone who lands on an /admin/* page first.
const NAV_SECTIONS = [
  {
    label: 'Users & Access',
    items: [
      { label: 'Users & RBAC', icon: <PeopleAltIcon />, path: '/admin/users' },
      { label: 'Roles', icon: <AdminPanelSettingsIcon />, path: '/admin/roles' },
      { label: 'Audit Log', icon: <HistoryIcon />, path: '/admin/users?tab=2' },
      { label: 'Rights Requests', icon: <GavelIcon />, path: '/admin/rights-requests' },
    ],
  },
  {
    label: 'System',
    items: [
      { label: 'Organizations', icon: <BusinessIcon />, path: '/admin/organizations' },
      { label: 'Plans', icon: <WorkspacePremiumIcon />, path: '/admin/plans' },
      { label: 'Insurance Payers', icon: <LocalHospitalIcon />, path: '/admin/payers' },
      { label: 'Policies', icon: <PolicyIcon />, path: '/admin/policies' },
      { label: 'Communications', icon: <ChatIcon />, path: '/admin/communications' },
      { label: 'Email Templates', icon: <EmailIcon />, path: '/admin/email-templates' },
    ],
  },
  {
    label: 'Reference Data',
    items: [
      { label: 'Departments', icon: <CategoryIcon />, path: '/admin/departments' },
      { label: 'Clinician Types', icon: <MedicalServicesIcon />, path: '/admin/clinician-types' },
      { label: 'Room Types', icon: <MeetingRoomIcon />, path: '/admin/room-types' },
      { label: 'Languages', icon: <LanguageIcon />, path: '/admin/languages' },
    ],
  },
]

export default function AdminLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  // BUG032 -- this used to strip the query string entirely and compare only
  // the pathname, so "Users & RBAC" (/admin/users) and "Audit Log"
  // (/admin/users?tab=2) were both "active" on every /admin/users URL
  // regardless of which in-page tab was actually open. An item whose own
  // configured path carries a `?tab=` now also requires the real, current
  // `?tab=` to match; an item with no query string in its own path (the
  // common case) still matches on pathname alone.
  const isActive = (path) => {
    const [base, itemQuery] = path.split('?')
    const pathMatches = location.pathname === base || location.pathname.startsWith(base + '/')
    if (!pathMatches) return false
    if (!itemQuery) return true
    const itemTab = new URLSearchParams(itemQuery).get('tab')
    const currentTab = new URLSearchParams(location.search).get('tab')
    return itemTab === currentTab
  }

  const navContent = (onNavigate) => (
    <>
      <Box sx={{ px: 2, py: 1.5, mb: 0.5 }}>
        <Typography
          variant="caption"
          sx={{ fontWeight: 800, fontSize: '0.65rem', letterSpacing: 1.2, textTransform: 'uppercase', color: BRAND }}
        >
          Admin Console
        </Typography>
      </Box>

      {NAV_SECTIONS.map((section, si) => (
        <Box key={section.label}>
          {si > 0 && <Divider sx={{ my: 1, borderColor: '#E2E8F0' }} />}
          <Typography
            variant="caption"
            sx={{
              px: 2,
              display: 'block',
              mb: 0.5,
              fontWeight: 700,
              fontSize: '0.62rem',
              letterSpacing: 0.8,
              textTransform: 'uppercase',
              color: 'text.disabled',
            }}
          >
            {section.label}
          </Typography>
          <List dense disablePadding>
            {section.items.map((item) => {
              const active = isActive(item.path)
              return (
                <ListItemButton
                  key={item.path}
                  onClick={() => {
                    navigate(item.path)
                    onNavigate?.()
                  }}
                  sx={{
                    mx: 1,
                    px: 1.5,
                    py: 0.8,
                    borderRadius: 1.5,
                    mb: 0.25,
                    bgcolor: active ? `${BRAND}14` : 'transparent',
                    '&:hover': { bgcolor: active ? `${BRAND}20` : 'rgba(0,0,0,0.04)' },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 32, color: active ? BRAND : '#94A3B8' }}>
                    {item.icon.type ? <item.icon.type sx={{ fontSize: 18, color: active ? BRAND : '#94A3B8' }} /> : item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.label}
                    primaryTypographyProps={{
                      variant: 'body2',
                      fontWeight: active ? 700 : 500,
                      fontSize: '0.8rem',
                      color: active ? BRAND : 'text.secondary',
                      noWrap: true,
                    }}
                  />
                  {active && <Box sx={{ width: 3, height: 24, borderRadius: 4, bgcolor: BRAND, ml: 0.5, flexShrink: 0 }} />}
                </ListItemButton>
              )
            })}
          </List>
        </Box>
      ))}
    </>
  )

  return (
    <Box sx={{ display: 'flex', minHeight: '100%', flexDirection: { xs: 'column', md: 'row' } }}>
      {/* ── Mobile admin-nav toggle (context/frontend-hard-rules.md §1.3 — drawer pattern, not a fixed permanent panel) ── */}
      <Stack
        direction="row"
        alignItems="center"
        spacing={1}
        sx={{ display: { xs: 'flex', md: 'none' }, px: 2, py: 1, borderBottom: '1px solid #E2E8F0', bgcolor: '#F8FAFC' }}
      >
        <IconButton onClick={() => setMobileNavOpen(true)} aria-label="Open admin console menu" size="small">
          <MenuRoundedIcon />
        </IconButton>
        <Typography variant="body2" fontWeight={700} sx={{ color: BRAND }}>
          Admin Console
        </Typography>
      </Stack>

      {/* ── Mobile admin sub-nav (temporary drawer) ── */}
      <Drawer
        variant="temporary"
        open={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': { width: 260, bgcolor: '#F8FAFC', pt: 1, pb: 2 },
        }}
      >
        {navContent(() => setMobileNavOpen(false))}
      </Drawer>

      {/* ── Desktop admin sub-nav (permanent drawer) ── */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          width: SIDEBAR_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: SIDEBAR_WIDTH,
            position: 'relative',
            height: '100%',
            bgcolor: '#F8FAFC',
            borderRight: '1px solid #E2E8F0',
            boxShadow: 'none',
            pt: 1,
            pb: 2,
            overflowX: 'hidden',
          },
        }}
      >
        {navContent()}
      </Drawer>

      {/* ── Main Content ──────────────────────────────────────────────── */}
      <Box component="main" sx={{ flex: 1, p: { xs: 2, md: 3 }, minWidth: 0, overflowX: 'auto' }}>
        <Outlet />
      </Box>
    </Box>
  )
}
