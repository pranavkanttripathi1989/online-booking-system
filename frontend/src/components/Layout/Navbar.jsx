import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApolloClient } from '@apollo/client'
import {
  AppBar, Toolbar, IconButton, Typography, Box, Avatar, Badge, Chip,
  Menu, MenuItem, ListItemIcon, Divider, Tooltip, useMediaQuery,
  InputBase, Paper, List, ListItem, ListItemAvatar, ListItemText,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import {
  MenuRounded, NotificationsNoneRounded, PersonOutlineRounded,
  SettingsOutlined, LogoutRounded, SearchRounded,
  DarkModeRounded, LightModeRounded, CloseRounded,
  ViewSidebarRounded, ViewStreamRounded,
  KeyboardReturnRounded, NavigateNextRounded,
  EventNoteRounded, MedicalServicesRounded, PersonRounded,
  AddRounded,
} from '@mui/icons-material'

import { useAuth } from '../../context/AuthContext'
import { useThemeMode } from '../../context/ThemeContext'
import { usePageTitle } from '../../hooks/usePageTitle'
import { DRAWER_WIDTH } from './Sidebar'
import GlobalSearch from '../GlobalSearch'
import NotificationPanel from '../NotificationPanel'

// ─── Inline search mock data ──────────────────────────────────────────────────
const SEARCH_DATA = [
  { type: 'patient',     label: 'Alice Thompson',   sub: 'GP Consultation · alice.thompson@gmail.com', path: '/patients/pat-1', Icon: PersonRounded },
  { type: 'patient',     label: 'Bob Martinez',     sub: 'Blood Test · bob.m@example.com',             path: '/patients/pat-2', Icon: PersonRounded },
  { type: 'patient',     label: 'Carol Davis',      sub: 'Follow-Up · carol.d@example.com',            path: '/patients/pat-3', Icon: PersonRounded },
  { type: 'clinician',  label: 'Dr. Sarah Mitchell',sub: 'General Practitioner · Meridian Central',    path: '/clinicians/clin-1', Icon: MedicalServicesRounded },
  { type: 'clinician',  label: 'Dr. James Okafor',  sub: 'Cardiologist · Northside Medical',           path: '/clinicians/clin-2', Icon: MedicalServicesRounded },
  { type: 'appointment',label: 'Alice Thompson',    sub: 'GP Consultation · Today 14:30, Confirmed',   path: '/appointments/appt-1', Icon: EventNoteRounded },
  { type: 'appointment',label: 'Bob Martinez',      sub: 'Blood Test · Tomorrow 09:00, Confirmed',     path: '/appointments/appt-2', Icon: EventNoteRounded },
  { type: 'page',       label: 'Calendar',          sub: 'Appointment scheduling calendar',            path: '/calendar',       Icon: NavigateNextRounded },
  { type: 'page',       label: 'Analytics',         sub: 'Reports and charts',                         path: '/analytics',      Icon: NavigateNextRounded },
  { type: 'page',       label: 'Settings',          sub: 'Profile, security, appearance',              path: '/settings',       Icon: NavigateNextRounded },
]

const TYPE_COLOR = {
  patient:     '#0F9D58',
  clinician:   '#9334E6',
  appointment: '#006D77',
  page:        '#80868B',
}

const TYPE_BG = {
  patient:     '#E6F4EA',
  clinician:   '#F3E8FD',
  appointment: 'rgba(0,109,119,0.10)',
  page:        '#F1F3F4',
}

// ─── Inline Search Dropdown ────────────────────────────────────────────────────
function InlineSearchDropdown({ query, onSelect, activeIdx, setActiveIdx }) {
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
      position: 'absolute', top: 'calc(100% + 8px)', left: 0, right: 0,
      zIndex: 2000, borderRadius: 2.5,
      border: '1px solid #E8EAED',
      boxShadow: '0 8px 32px rgba(32,33,36,0.16)',
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
                  key={item.label + item.type}
                  button
                  onClick={() => onSelect(item)}
                  onMouseEnter={() => setActiveIdx(idx)}
                  sx={{
                    px: 2, py: 0.85, cursor: 'pointer',
                    bgcolor: isActive ? 'rgba(0,109,119,0.06)' : 'transparent',
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
                  {isActive && <KeyboardReturnRounded sx={{ fontSize: '0.85rem', color: '#9AA0A6', flexShrink: 0 }} />}
                </ListItem>
              )
            })}
          </List>
        </Box>
      ))}
      <Box sx={{ px: 2, py: 1, borderTop: '1px solid #F1F3F4', bgcolor: '#FAFAFA', display: 'flex', gap: 2 }}>
        {[['↑↓', 'navigate'], ['↵', 'open'], ['ESC', 'close']].map(([k, lbl]) => (
          <Box key={k} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Chip label={k} size="small" sx={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '0.65rem', height: 18, bgcolor: '#fff', border: '1px solid #E8EAED', '& .MuiChip-label': { px: 0.6 } }} />
            <Typography variant="caption" sx={{ color: '#9AA0A6', fontSize: '0.68rem' }}>{lbl}</Typography>
          </Box>
        ))}
        <Box sx={{ ml: 'auto' }}>
          <Typography variant="caption" sx={{ color: '#9AA0A6', fontSize: '0.68rem' }}>⌘K for full search</Typography>
        </Box>
      </Box>
    </Paper>
  )
}

// ─── Navbar ───────────────────────────────────────────────────────────────────
export default function Navbar({ onMobileMenuClick, navLayout, onToggleLayout }) {
  const navigate = useNavigate()
  const client = useApolloClient()
  const { user, logout } = useAuth()
  const { mode, toggle: toggleMode } = useThemeMode()
  const pageTitle = usePageTitle()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))

  const [anchorEl,   setAnchorEl]   = useState(null)
  const [searchOpen, setSearchOpen] = useState(false)       // full Dialog
  const [inlineOpen, setInlineOpen] = useState(false)       // inline bar
  const [query,      setQuery]      = useState('')
  const [activeIdx,  setActiveIdx]  = useState(0)
  const [notifOpen,  setNotifOpen]  = useState(false)
  const [scrolled,   setScrolled]   = useState(false)
  const inputRef = useRef(null)
  const searchBoxRef = useRef(null)

  const menuOpen = Boolean(anchorEl)
  const isDark   = mode === 'dark'

  const displayName = user?.name ?? 'Admin User'
  const initials    = displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

  // Scroll shadow
  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 4)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  // ⌘K shortcut
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setSearchOpen(v => !v) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Click outside inline search
  useEffect(() => {
    if (!inlineOpen) return
    const handler = (e) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target)) {
        setInlineOpen(false); setQuery('')
      }
    }
    setTimeout(() => document.addEventListener('mousedown', handler), 0)
    return () => document.removeEventListener('mousedown', handler)
  }, [inlineOpen])

  // Focus inline input
  useEffect(() => {
    if (inlineOpen) setTimeout(() => inputRef.current?.focus(), 50)
  }, [inlineOpen])

  const openInline = () => { setInlineOpen(true); setQuery(''); setActiveIdx(0) }
  const closeInline = () => { setInlineOpen(false); setQuery('') }

  const handleSelect = useCallback((item) => {
    navigate(item.path); closeInline()
  }, [navigate])

  const handleInlineKey = (e) => {
    const results = query.length >= 1
      ? SEARCH_DATA.filter(d => d.label.toLowerCase().includes(query.toLowerCase()) || d.sub.toLowerCase().includes(query.toLowerCase())).slice(0, 8)
      : SEARCH_DATA.filter(d => d.type === 'page').slice(0, 6)
    const resultCount = results.length
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, resultCount - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)) }
    if (e.key === 'Escape')   { closeInline() }
    // BUG-NAV-001 FIX: plain Enter navigates to the highlighted result
    if (e.key === 'Enter' && !e.ctrlKey) {
      e.preventDefault()
      const selected = results[activeIdx]
      if (selected) { handleSelect(selected) } else { closeInline(); setSearchOpen(true) }
    }
    if (e.key === 'Enter' && e.ctrlKey) { closeInline(); setSearchOpen(true) }
  }

  const isTopNav = navLayout === 'top'

  return (
    <>
      <AppBar position="fixed" elevation={0} sx={{
        width: !isTopNav ? { md: `calc(100% - ${DRAWER_WIDTH}px)` } : '100%',
        ml:    !isTopNav ? { md: `${DRAWER_WIDTH}px` } : 0,
        zIndex: (t) => t.zIndex.drawer - 1,
        bgcolor: isDark ? '#1C1C1E' : '#FFFFFF',
        borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#E8EAED'}`,
        backgroundImage: 'none',
        transition: 'box-shadow 0.2s ease, width 0.3s ease, margin-left 0.3s ease',
        boxShadow: scrolled
          ? '0 2px 12px rgba(32,33,36,0.12)'
          : 'none',
      }}>

        {/* ── Progress bar accent at very top ───────────────────────────── */}
        <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2.5, background: 'linear-gradient(90deg, #006D77, #00858F, #0F9D58)', opacity: 0.9 }} />

        <Toolbar sx={{ gap: 1, minHeight: { xs: 60, sm: 64 }, px: { xs: 2, sm: 3 }, justifyContent: 'space-between' }}>

          {/* ── Left ──────────────────────────────────────────────────── */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0, flexShrink: 0 }}>
            {/* Mobile hamburger */}
            <IconButton
              edge="start"
              onClick={onMobileMenuClick}
              sx={{ display: { md: 'none' }, color: '#5F6368', '&:hover': { bgcolor: 'rgba(0,109,119,0.06)' } }}
              aria-label="Open navigation"
            >
              <MenuRounded />
            </IconButton>

            {/* Nav layout toggle */}
            <Tooltip title={isTopNav ? 'Switch to Sidebar navigation' : 'Switch to Top navigation'} placement="bottom">
              <IconButton
                size="small"
                onClick={onToggleLayout}
                sx={{
                  display: { xs: 'none', md: 'flex' },
                  color: isTopNav ? '#006D77' : '#9AA0A6',
                  bgcolor: isTopNav ? 'rgba(0,109,119,0.08)' : 'transparent',
                  borderRadius: 1.5, p: 0.75,
                  '&:hover': { bgcolor: 'rgba(0,109,119,0.10)', color: '#006D77' },
                  transition: 'all 0.18s ease',
                }}
              >
                {isTopNav ? <ViewStreamRounded sx={{ fontSize: '1.1rem' }} /> : <ViewSidebarRounded sx={{ fontSize: '1.1rem' }} />}
              </IconButton>
            </Tooltip>

            {/* Page title */}
            <Typography variant="h6" fontWeight={700} noWrap sx={{
              color: isDark ? '#E8EAED' : '#202124',
              fontSize: { xs: '0.95rem', sm: '1.0rem', md: '1.05rem' },
              letterSpacing: '-0.2px',
            }}>
              {pageTitle}
            </Typography>
          </Box>

          {/* ── Center — animated inline search ──────────────────────── */}
          <Box
            ref={searchBoxRef}
            sx={{
              display: { xs: 'none', sm: 'flex' },
              alignItems: 'center',
              position: 'relative',
              flex: inlineOpen ? '1 1 420px' : '0 0 auto',
              maxWidth: inlineOpen ? 520 : 320,
              mx: { sm: 1.5, md: 3 },
              transition: 'flex 0.25s ease, max-width 0.25s ease',
            }}
          >
            {/* Collapsed trigger */}
            {!inlineOpen && (
              <Box
                onClick={openInline}
                sx={{
                  display: 'flex', alignItems: 'center', gap: 1,
                  bgcolor: isDark ? 'rgba(255,255,255,0.05)' : '#F8F9FA',
                  border: `1.5px solid ${isDark ? 'rgba(255,255,255,0.10)' : '#E8EAED'}`,
                  borderRadius: '24px',
                  px: 1.5, py: 0.75, cursor: 'pointer', width: '100%',
                  transition: 'all 0.18s ease',
                  '&:hover': {
                    borderColor: '#006D77',
                    boxShadow: '0 0 0 3px rgba(0,109,119,0.10)',
                    bgcolor: isDark ? 'rgba(255,255,255,0.08)' : '#F1F3F4',
                  },
                }}
              >
                <SearchRounded sx={{ color: '#9AA0A6', fontSize: '1rem', flexShrink: 0 }} />
                <Typography variant="body2" sx={{ color: '#9AA0A6', flex: 1, fontSize: '0.85rem', fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
                  Search…
                </Typography>
                <Chip label="⌘K" size="small" sx={{
                  height: 20, fontFamily: 'monospace', fontWeight: 800, fontSize: '0.65rem',
                  bgcolor: isDark ? 'rgba(255,255,255,0.08)' : '#F1F3F4',
                  border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : '#E8EAED'}`,
                  color: '#9AA0A6',
                  '& .MuiChip-label': { px: 0.75 },
                }} />
              </Box>
            )}

            {/* Expanded search input */}
            {inlineOpen && (
              <Box sx={{
                display: 'flex', alignItems: 'center', gap: 1, width: '100%',
                bgcolor: '#fff', borderRadius: '12px',
                border: '2px solid #006D77',
                boxShadow: '0 0 0 4px rgba(0,109,119,0.10)',
                px: 1.5, py: 0.75,
                animation: 'expandSearch 0.2s ease',
                '@keyframes expandSearch': { from: { opacity: 0.7, transform: 'scaleX(0.95)' }, to: { opacity: 1, transform: 'scaleX(1)' } },
              }}>
                <SearchRounded sx={{ color: '#006D77', fontSize: '1rem', flexShrink: 0 }} />
                <InputBase
                  inputRef={inputRef}
                  value={query}
                  onChange={e => { setQuery(e.target.value); setActiveIdx(0) }}
                  onKeyDown={handleInlineKey}
                  placeholder="Search patients, clinicians, appointments…"
                  fullWidth
                  sx={{ fontSize: '0.875rem', fontFamily: '"Plus Jakarta Sans", sans-serif', fontWeight: 600, color: '#202124' }}
                  inputProps={{ 'aria-label': 'Search' }}
                />
                {query && (
                  <IconButton size="small" onClick={() => setQuery('')} sx={{ color: '#9AA0A6', p: 0.25 }}>
                    <CloseRounded sx={{ fontSize: '0.9rem' }} />
                  </IconButton>
                )}
                <IconButton size="small" onClick={closeInline} sx={{ color: '#9AA0A6', p: 0.25 }}>
                  <CloseRounded sx={{ fontSize: '1rem' }} />
                </IconButton>
              </Box>
            )}

            {/* Inline dropdown results */}
            {inlineOpen && (
              <InlineSearchDropdown
                query={query}
                onSelect={handleSelect}
                activeIdx={activeIdx}
                setActiveIdx={setActiveIdx}
              />
            )}
          </Box>

          {/* ── Right actions ─────────────────────────────────────────── */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>

            {/* Mobile search icon */}
            <Tooltip title="Search (⌘K)">
              <IconButton size="small" onClick={() => setSearchOpen(true)}
                aria-label="Open search"
                sx={{ display: { sm: 'none' }, color: '#5F6368', '&:hover': { bgcolor: 'rgba(0,109,119,0.06)' } }}>
                <SearchRounded fontSize="small" />
              </IconButton>
            </Tooltip>

            {/* Quick add new appointment */}
            <Tooltip title="New Appointment">
              <IconButton size="small" onClick={() => navigate('/appointments/new')}
                aria-label="Create new appointment"
                sx={{
                  display: { xs: 'none', sm: 'flex' },
                  color: '#fff', bgcolor: '#006D77', borderRadius: 1.5,
                  p: 0.7,
                  '&:hover': { bgcolor: '#005A62', boxShadow: '0 4px 12px rgba(0,109,119,0.30)' },
                  transition: 'all 0.18s ease',
                }}>
                <AddRounded sx={{ fontSize: '1.1rem' }} />
              </IconButton>
            </Tooltip>

            {/* Dark/Light toggle */}
            <Tooltip title={isDark ? 'Light mode' : 'Dark mode'}>
              <IconButton size="small" onClick={toggleMode}
                sx={{
                  color: '#5F6368',
                  '&:hover': { bgcolor: 'rgba(0,109,119,0.06)', color: isDark ? '#F9AB00' : '#006D77' },
                  transition: 'all 0.2s',
                }}
                aria-label="Toggle dark mode"
              >
                {isDark ? <LightModeRounded sx={{ fontSize: '1.2rem' }} /> : <DarkModeRounded sx={{ fontSize: '1.2rem' }} />}
              </IconButton>
            </Tooltip>

            {/* Notifications */}
            <Tooltip title="Notifications">
              <IconButton size="small" onClick={() => setNotifOpen(true)}
                sx={{ color: '#5F6368', '&:hover': { bgcolor: 'rgba(0,109,119,0.06)' } }}>
                <Badge
                  badgeContent={3}
                  sx={{ '& .MuiBadge-badge': { bgcolor: '#D93025', color: '#FFFFFF', fontSize: '0.58rem', minWidth: 16, height: 16 } }}
                >
                  <NotificationsNoneRounded sx={{ fontSize: '1.25rem' }} />
                </Badge>
              </IconButton>
            </Tooltip>

            <Box sx={{ width: 1, height: 22, bgcolor: '#E8EAED', mx: 0.5 }} />

            {/* User avatar */}
            <Tooltip title={displayName}>
              <IconButton
                onClick={(e) => setAnchorEl(e.currentTarget)}
                id="user-menu-button"
                aria-controls={menuOpen ? 'user-menu' : undefined}
                aria-haspopup="true"
                aria-expanded={menuOpen ? 'true' : undefined}
                sx={{ p: 0.5 }}
              >
                <Box sx={{ position: 'relative' }}>
                  <Avatar sx={{
                    width: 34, height: 34,
                    background: 'linear-gradient(135deg, #00858F 0%, #006D77 100%)',
                    fontSize: '0.78rem', fontWeight: 700,
                    boxShadow: '0 2px 8px rgba(0,109,119,0.35)',
                    transition: 'transform 0.15s',
                    '&:hover': { transform: 'scale(1.05)' },
                  }}>
                    {initials}
                  </Avatar>
                  <Box sx={{ position: 'absolute', bottom: 0, right: 0, width: 9, height: 9, borderRadius: '50%', bgcolor: '#0F9D58', border: '2px solid #FFFFFF' }} />
                </Box>
              </IconButton>
            </Tooltip>
          </Box>

          {/* User dropdown menu */}
          <Menu
            id="user-menu"
            anchorEl={anchorEl}
            open={menuOpen}
            onClose={() => setAnchorEl(null)}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            slotProps={{ paper: { elevation: 0, sx: {
              mt: 1, minWidth: 230, borderRadius: 2.5,
              border: '1px solid #E8EAED',
              boxShadow: '0 8px 32px rgba(32,33,36,0.18)',
              bgcolor: '#FFFFFF', backgroundImage: 'none',
              '&::before': {
                content: '""', display: 'block', position: 'absolute',
                top: -6, right: 16, width: 12, height: 12,
                bgcolor: '#FFFFFF', border: '1px solid #E8EAED',
                borderBottom: 'none', borderRight: 'none',
                transform: 'rotate(45deg)',
              },
            } } }}
          >
            {/* User header */}
            <Box sx={{ px: 2.5, py: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Avatar sx={{ width: 40, height: 40, background: 'linear-gradient(135deg, #00858F 0%, #006D77 100%)', fontSize: '0.9rem', fontWeight: 700 }}>{initials}</Avatar>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" fontWeight={700} noWrap sx={{ color: '#202124' }}>{displayName}</Typography>
                <Typography variant="caption" noWrap sx={{ color: '#5F6368', display: 'block' }}>{user?.email ?? 'admin@medibook.com'}</Typography>
              </Box>
            </Box>
            <Divider sx={{ borderColor: '#E8EAED' }} />
            <Box sx={{ p: 1 }}>
              <MenuItem onClick={() => { setAnchorEl(null); navigate('/settings') }} sx={{ borderRadius: 2, py: 1, px: 1.5, '&:hover': { bgcolor: 'rgba(0,109,119,0.06)' } }}>
                <ListItemIcon><PersonOutlineRounded fontSize="small" sx={{ color: '#5F6368' }} /></ListItemIcon>
                <Typography variant="body2" fontWeight={600}>Profile</Typography>
              </MenuItem>
              <MenuItem onClick={() => { setAnchorEl(null); navigate('/settings') }} sx={{ borderRadius: 2, py: 1, px: 1.5, '&:hover': { bgcolor: 'rgba(0,109,119,0.06)' } }}>
                <ListItemIcon><SettingsOutlined fontSize="small" sx={{ color: '#5F6368' }} /></ListItemIcon>
                <Typography variant="body2" fontWeight={600}>Settings</Typography>
              </MenuItem>
              <MenuItem onClick={() => { toggleMode(); setAnchorEl(null) }} sx={{ borderRadius: 2, py: 1, px: 1.5, '&:hover': { bgcolor: 'rgba(0,109,119,0.06)' } }}>
                <ListItemIcon>{isDark ? <LightModeRounded fontSize="small" sx={{ color: '#F9AB00' }} /> : <DarkModeRounded fontSize="small" sx={{ color: '#5F6368' }} />}</ListItemIcon>
                <Typography variant="body2" fontWeight={600}>{isDark ? 'Light Mode' : 'Dark Mode'}</Typography>
              </MenuItem>
              <MenuItem onClick={() => onToggleLayout()} sx={{ borderRadius: 2, py: 1, px: 1.5, '&:hover': { bgcolor: 'rgba(0,109,119,0.06)' } }}>
                <ListItemIcon>{isTopNav ? <ViewSidebarRounded fontSize="small" sx={{ color: '#006D77' }} /> : <ViewStreamRounded fontSize="small" sx={{ color: '#006D77' }} />}</ListItemIcon>
                <Typography variant="body2" fontWeight={600}>{isTopNav ? 'Switch to Sidebar' : 'Switch to Top Nav'}</Typography>
              </MenuItem>
            </Box>
            <Divider sx={{ borderColor: '#E8EAED' }} />
            <Box sx={{ p: 1 }}>
              <MenuItem onClick={() => { setAnchorEl(null); logout(client); navigate('/login', { replace: true }) }} sx={{ borderRadius: 2, py: 1, px: 1.5, color: '#D93025', '&:hover': { bgcolor: 'rgba(217,48,37,0.06)' } }}>
                <ListItemIcon><LogoutRounded fontSize="small" sx={{ color: '#D93025' }} /></ListItemIcon>
                <Typography variant="body2" fontWeight={700}>Logout</Typography>
              </MenuItem>
            </Box>
          </Menu>
        </Toolbar>
      </AppBar>

      {/* Full-screen Global Search Dialog */}
      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />

      {/* Notification Panel */}
      <NotificationPanel open={notifOpen} onClose={() => setNotifOpen(false)} />
    </>
  )
}
