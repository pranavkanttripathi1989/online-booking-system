import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Dialog, InputBase, Box, List, ListItem, ListItemAvatar,
  ListItemText, Avatar, Typography, Chip, Stack, Divider, Paper,
  useMediaQuery,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import SearchRoundedIcon from '@mui/icons-material/SearchRounded'
import PersonRoundedIcon from '@mui/icons-material/PersonRounded'
import EventNoteRoundedIcon from '@mui/icons-material/EventNoteRounded'
import MedicalServicesRoundedIcon from '@mui/icons-material/MedicalServicesRounded'
import KeyboardReturnRoundedIcon from '@mui/icons-material/KeyboardReturnRounded'
import NavigateNextRoundedIcon from '@mui/icons-material/NavigateNextRounded'
import CloseRoundedIcon from '@mui/icons-material/CloseRounded'

// ─── Mock search index ────────────────────────────────────────────────────────
const MOCK_DATA = [
  // Patients
  { type: 'patient',     id: '1',  label: 'Alice Johnson',   sub: 'alice@email.com · Female · DOB: 12 May 1992',  path: '/patients/1' },
  { type: 'patient',     id: '2',  label: 'Bob Smith',       sub: 'bob@email.com · Male · DOB: 30 Nov 1979',      path: '/patients/2' },
  { type: 'patient',     id: '3',  label: 'Carlos Reyes',    sub: 'carlos@email.com · Male · DOB: 22 Mar 1985',   path: '/patients/3' },
  { type: 'patient',     id: '4',  label: 'Diana Prince',    sub: 'diana@email.com · Female · DOB: 18 Jul 1990',  path: '/patients/4' },
  { type: 'patient',     id: '5',  label: 'Emily Chen',      sub: 'emily@email.com · Female · DOB: 05 Feb 1988',  path: '/patients/5' },
  // Clinicians
  { type: 'clinician',   id: '1',  label: 'Dr. Jane Smith',  sub: 'General Practitioner · Main Branch',           path: '/clinicians/1' },
  { type: 'clinician',   id: '2',  label: 'Dr. Carlos Vega', sub: 'Cardiologist · Downtown Clinic',               path: '/clinicians/2' },
  { type: 'clinician',   id: '3',  label: 'Dr. Amara Patel', sub: 'Dermatologist · Westside Branch',              path: '/clinicians/3' },
  // Appointments
  { type: 'appointment', id: '101', label: 'Alice Johnson — General Consultation',     sub: 'Mon 10 Mar 2026 · 09:00 · Confirmed',    path: '/appointments' },
  { type: 'appointment', id: '102', label: 'Bob Smith — Follow-Up',                   sub: 'Tue 11 Mar 2026 · 14:00 · Pending',       path: '/appointments' },
  { type: 'appointment', id: '103', label: 'Emily Chen — Blood Test',                 sub: 'Wed 12 Mar 2026 · 11:30 · Confirmed',     path: '/appointments' },
  // Pages
  { type: 'page',        id: 'p1', label: 'Dashboard',       sub: 'Main overview page',                           path: '/dashboard' },
  { type: 'page',        id: 'p2', label: 'Analytics',       sub: 'Reports & charts',                             path: '/analytics' },
  { type: 'page',        id: 'p3', label: 'Settings',        sub: 'Profile, security, appearance',                path: '/settings' },
  { type: 'page',        id: 'p4', label: 'Calendar',        sub: 'Appointment calendar',                         path: '/calendar' },
  { type: 'page',        id: 'p5', label: 'Staff Management',sub: 'Manage clinic staff',                          path: '/staff' },
  { type: 'page',        id: 'p6', label: 'Test Results',    sub: 'Medical test results',                         path: '/test-results' },
]

const TYPE_CONFIG = {
  patient:     { label: 'Patient',     color: '#0F9D58', bgcolor: '#E6F4EA', Icon: PersonRoundedIcon },
  clinician:   { label: 'Clinician',   color: '#9334E6', bgcolor: '#F3E8FD', Icon: MedicalServicesRoundedIcon },
  appointment: { label: 'Appointment', color: '#006D77', bgcolor: '#E8F0FE', Icon: EventNoteRoundedIcon },
  page:        { label: 'Page',        color: '#5F6368', bgcolor: '#F8F9FA', Icon: NavigateNextRoundedIcon },
}

export default function GlobalSearch({ open, onClose }) {
  const navigate = useNavigate()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const [query, setQuery] = useState('')
  const [activeIdx, setActiveIdx] = useState(0)
  const inputRef = useRef(null)

  const results = query.length >= 1
    ? MOCK_DATA.filter(d =>
        d.label.toLowerCase().includes(query.toLowerCase()) ||
        d.sub.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 10)
    : MOCK_DATA.filter(d => d.type === 'page').slice(0, 6)

  const grouped = results.reduce((acc, item) => {
    if (!acc[item.type]) acc[item.type] = []
    acc[item.type].push(item)
    return acc
  }, {})

  useEffect(() => { setActiveIdx(0) }, [query])
  useEffect(() => { if (open) { setQuery(''); setTimeout(() => inputRef.current?.focus(), 80) } }, [open])

  const handleSelect = useCallback((item) => {
    navigate(item.path)
    onClose()
  }, [navigate, onClose])

  const handleKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, results.length - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)) }
    if (e.key === 'Enter' && results[activeIdx]) handleSelect(results[activeIdx])
    if (e.key === 'Escape') onClose()
  }

  let flatIdx = -1

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen={isMobile}
      maxWidth={isMobile ? false : 'sm'}
      fullWidth={!isMobile}
      PaperProps={{ elevation: 0, sx: { bgcolor: 'transparent', boxShadow: 'none', mt: { xs: 0, sm: '8vh' }, mx: { xs: 0, sm: 2 }, verticalAlign: 'top' } }}
      sx={{ '& .MuiBackdrop-root': { backdropFilter: 'blur(4px)', bgcolor: 'rgba(0,0,0,0.35)' }, '& .MuiDialog-paper': { maxHeight: { xs: '100vh', sm: '80vh' } } }}
    >
      <Paper sx={{ borderRadius: { xs: 0, sm: 3 }, border: { xs: 'none', sm: '1px solid #E8EAED' }, overflow: 'hidden', boxShadow: '0 8px 40px rgba(32,33,36,0.22)' }}>
        {/* Search Input */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2.5, py: 1.75, borderBottom: '1px solid #E8EAED' }}>
          <SearchRoundedIcon sx={{ color: '#006D77', fontSize: '1.3rem', flexShrink: 0 }} />
          <InputBase
            inputRef={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Search patients, clinicians, appointments…"
            fullWidth
            sx={{ fontSize: { xs: '16px', sm: '1rem' }, fontFamily: '"Plus Jakarta Sans", sans-serif', fontWeight: 600, color: '#202124' }}
            inputProps={{ 'aria-label': 'Global search' }}
          />
          {query && (
            <Box onClick={() => setQuery('')} sx={{ cursor: 'pointer', color: 'text.disabled', display: 'flex', alignItems: 'center' }}>
              <CloseRoundedIcon sx={{ fontSize: '1rem' }} />
            </Box>
          )}
          <Chip label="ESC" size="small" onClick={onClose} sx={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.7rem', cursor: 'pointer', bgcolor: 'action.hover', flexShrink: 0 }} />
        </Box>

        {/* Results */}
        <Box sx={{ maxHeight: 480, overflow: 'auto' }}>
          {results.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>No results for "{query}"</Typography>
              <Typography variant="caption" sx={{ color: 'text.disabled' }}>Try searching by name, email, or specialty</Typography>
            </Box>
          ) : (
            Object.entries(grouped).map(([type, items], gi) => {
              const cfg = TYPE_CONFIG[type]
              return (
                <Box key={type}>
                  {gi > 0 && <Divider />}
                  <Box sx={{ px: 2.5, pt: 1.5, pb: 0.5 }}>
                    <Typography variant="caption" fontWeight={700} sx={{ color: '#9AA0A6', textTransform: 'uppercase', letterSpacing: '0.12em', fontSize: '0.68rem' }}>
                      {cfg.label}s
                    </Typography>
                  </Box>
                  <List dense disablePadding>
                    {items.map(item => {
                      flatIdx++
                      const thisIdx = flatIdx
                      const isActive = activeIdx === thisIdx
                      return (
                        <ListItem key={item.id}
                          button
                          onClick={() => handleSelect(item)}
                          onMouseEnter={() => setActiveIdx(thisIdx)}
                          sx={{ px: 2.5, py: 1.1, cursor: 'pointer', bgcolor: isActive ? 'action.selected' : 'transparent', '&:hover': { bgcolor: 'action.hover' }, borderRadius: 0, transition: 'background 0.1s' }}>
                          <ListItemAvatar sx={{ minWidth: 40 }}>
                            <Avatar sx={{ width: 32, height: 32, bgcolor: cfg.bgcolor, borderRadius: 1.5 }}>
                              <cfg.Icon sx={{ fontSize: '0.9rem', color: cfg.color }} />
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={<Typography variant="body2" fontWeight={700} sx={{ color: 'text.primary' }}>{item.label}</Typography>}
                            secondary={<Typography variant="caption" sx={{ color: 'text.secondary' }}>{item.sub}</Typography>}
                          />
                          {isActive && <KeyboardReturnRoundedIcon sx={{ fontSize: '1rem', color: 'text.disabled' }} />}
                        </ListItem>
                      )
                    })}
                  </List>
                </Box>
              )
            })
          )}
        </Box>

        {/* Footer */}
        <Box sx={{ px: 2.5, py: 1.25, borderTop: '1px solid', borderColor: 'divider', bgcolor: 'action.hover', display: 'flex', gap: 2.5 }}>
          {[['↑↓', 'navigate'], ['↵', 'open'], ['ESC', 'close']].map(([key, label]) => (
            <Stack key={key} direction="row" spacing={0.75} alignItems="center">
              <Chip label={key} size="small" sx={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '0.68rem', bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', height: 20 }} />
              <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.72rem' }}>{label}</Typography>
            </Stack>
          ))}
        </Box>
      </Paper>
    </Dialog>
  )
}
