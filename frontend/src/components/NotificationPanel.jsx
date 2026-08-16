import { useState } from 'react'
import {
  Drawer, Box, Typography, IconButton, Stack, Divider, Chip,
  Avatar, List, ListItem, ListItemAvatar, ListItemText, Button,
  Tooltip, Badge, useMediaQuery,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import CloseRoundedIcon from '@mui/icons-material/CloseRounded'
import CheckRoundedIcon from '@mui/icons-material/CheckRounded'
import DoneAllRoundedIcon from '@mui/icons-material/DoneAllRounded'
import PersonAddRoundedIcon from '@mui/icons-material/PersonAddRounded'
import EventNoteRoundedIcon from '@mui/icons-material/EventNoteRounded'
import StarRoundedIcon from '@mui/icons-material/StarRounded'
import ScienceRoundedIcon from '@mui/icons-material/ScienceRounded'
import AnnouncementRoundedIcon from '@mui/icons-material/AnnouncementRounded'
import NotificationsNoneRoundedIcon from '@mui/icons-material/NotificationsNoneRounded'
import { useNavigate } from 'react-router-dom'
import ErrorBoundary from '../components/ErrorBoundary'
import { useMockData, useMockMutation } from '../mocks/useMockData'
import * as MockStore from '../mocks/store'

// ─── Notifications ──────────────────────────────────────────────────────────
// SUG-NOTIF-001/002 (notification-test-suggestion.md): notifications now live
// in the shared MockStore (see mocks/store.js `_widgetNotifications`) instead
// of a local useState array, so read/dismiss state matches NotificationBell.

const TYPE_CONFIG = {
  appointment: { Icon: EventNoteRoundedIcon,  color: '#1A73E8', bgcolor: '#E8F0FE' },
  patient:     { Icon: PersonAddRoundedIcon,  color: '#0F9D58', bgcolor: '#E6F4EA' },
  review:      { Icon: StarRoundedIcon,       color: '#F9AB00', bgcolor: '#FEF7E0' },
  result:      { Icon: ScienceRoundedIcon,    color: '#9334E6', bgcolor: '#F3E8FD' },
  system:      { Icon: AnnouncementRoundedIcon, color: '#D93025', bgcolor: '#FCE8E6' },
}

function NotificationPanel({ open, onClose }) {
  const navigate = useNavigate()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  // SUG-NOTIF-001/002: shared MockStore source (was local useState(INITIAL_NOTIFS))
  const { data: notifsData } = useMockData(store => store.getWidgetNotifications())
  const [markAllReadMut] = useMockMutation(() => MockStore.markAllWidgetNotificationsRead())
  const [markReadMut]    = useMockMutation((id) => MockStore.markWidgetNotificationRead(id))
  const [dismissMut]     = useMockMutation((id) => MockStore.dismissWidgetNotification(id))
  const [filter, setFilter] = useState('all')

  const notifs = notifsData || []
  const unreadCount = notifs.filter(n => n.unread).length

  const markAllRead = () => markAllReadMut()
  const markRead = (id) => markReadMut(id)
  const dismiss  = (id) => dismissMut(id)

  const filtered = filter === 'unread' ? notifs.filter(n => n.unread) : notifs

  return (
    <Drawer
      anchor={isMobile ? 'bottom' : 'right'}
      open={open}
      onClose={onClose}
      PaperProps={{ sx: {
        width: { xs: '100%', sm: 380 },
        maxHeight: { xs: '78vh', sm: '100%' },
        borderRadius: { xs: '20px 20px 0 0', sm: 0 },
        overflow: 'hidden',
        boxShadow: '-8px 0 32px rgba(0,0,0,0.12)',
      } }}
    >
      {/* Drag handle — mobile only */}
      <Box sx={{ display: { xs: 'flex', sm: 'none' }, justifyContent: 'center', pt: 1.5, pb: 0.5 }}>
        <Box sx={{ width: 40, height: 4, borderRadius: 2, bgcolor: '#E8EAED' }} />
      </Box>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <Box sx={{ p: 2.5, pb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E8EAED' }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: '#E8F0FE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <NotificationsNoneRoundedIcon sx={{ color: '#1A73E8', fontSize: '1.2rem' }} />
          </Box>
          <Box>
            <Stack direction="row" spacing={0.75} alignItems="center">
              <Typography variant="subtitle1" fontWeight={800} sx={{ color: '#202124' }}>Notifications</Typography>
              {unreadCount > 0 && <Chip label={unreadCount} size="small" sx={{ height: 18, fontSize: '0.68rem', fontWeight: 800, bgcolor: '#FCE8E6', color: '#D93025', '& .MuiChip-label': { px: 0.75 } }} />}
            </Stack>
            <Typography variant="caption" sx={{ color: '#5F6368' }}>{notifs.length} total notifications</Typography>
          </Box>
        </Stack>
        <Stack direction="row" spacing={0.5}>
          {unreadCount > 0 && (
            <Tooltip title="Mark all as read">
              <IconButton aria-label="Mark all notifications as read" size="small" onClick={markAllRead} sx={{ color: '#5F6368', '&:hover': { color: '#1A73E8', bgcolor: '#E8F0FE' } }}>
                <DoneAllRoundedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          <IconButton aria-label="Close notifications panel" size="small" onClick={onClose} sx={{ color: '#5F6368', '&:hover': { bgcolor: '#F1F3F4' } }}>
            <CloseRoundedIcon fontSize="small" />
          </IconButton>
        </Stack>
      </Box>

      {/* ── Filter tabs ─────────────────────────────────────────────────── */}
      <Stack direction="row" spacing={0.5} sx={{ px: 2.5, py: 1.25, borderBottom: '1px solid #E8EAED' }}>
        {[['all', 'All'], ['unread', 'Unread']].map(([val, label]) => (
          <Chip key={val} label={`${label}${val === 'unread' && unreadCount > 0 ? ` (${unreadCount})` : ''}`} size="small" onClick={() => setFilter(val)}
            sx={{ fontWeight: 700, cursor: 'pointer',
              bgcolor: filter === val ? '#E8F0FE' : 'transparent',
              color: filter === val ? '#1A73E8' : '#5F6368',
              border: '1px solid', borderColor: filter === val ? '#AECBFA' : 'transparent',
              '&:hover': { bgcolor: '#F8F9FA' } }}
          />
        ))}
      </Stack>

      {/* ── Notifications list ───────────────────────────────────────────── */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {filtered.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <DoneAllRoundedIcon sx={{ fontSize: '3rem', color: 'text.disabled', mb: 1 }} />
            <Typography variant="body2" fontWeight={700} sx={{ color: 'text.secondary' }}>All caught up!</Typography>
            <Typography variant="caption" sx={{ color: 'text.disabled' }}>No unread notifications</Typography>
          </Box>
        ) : (
          <List disablePadding>
            {filtered.map((n, idx) => {
              const cfg = TYPE_CONFIG[n.type]
              return (
                <Box key={n.id}>
                  {idx > 0 && <Divider />}
                  <ListItem
                    alignItems="flex-start"
                    sx={{ py: 2, px: 2.5, cursor: 'pointer',
                      bgcolor: n.unread ? '#E8F0FE' : '#FFFFFF',
                      borderLeft: n.unread ? '3px solid #1A73E8' : '3px solid transparent',
                      transition: 'background 0.15s',
                      '&:hover': { bgcolor: n.unread ? '#E0EAFE' : '#F8F9FA' },
                    }}
                    onClick={() => { markRead(n.id); if (n.action) { navigate(n.action); onClose() } }}
                  >
                    <ListItemAvatar sx={{ mt: 0.25 }}>
                      <Box sx={{ position: 'relative' }}>
                        <Avatar sx={{ width: 38, height: 38, bgcolor: cfg.bgcolor, borderRadius: 2 }}>
                          <cfg.Icon sx={{ fontSize: '1rem', color: cfg.color }} />
                        </Avatar>
                        {n.unread && <Box sx={{ position: 'absolute', top: -2, right: -2, width: 9, height: 9, bgcolor: '#1A73E8', borderRadius: '50%', border: '2px solid #FFFFFF' }} />}
                      </Box>
                    </ListItemAvatar>
                    <ListItemText
                      sx={{ my: 0 }}
                      primary={
                        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                          <Typography variant="body2" fontWeight={n.unread ? 800 : 600} sx={{ color: 'text.primary', lineHeight: 1.4 }}>{n.title}</Typography>
                          <Stack direction="row" spacing={0.5} alignItems="center" flexShrink={0}>
                           <Typography variant="caption" sx={{ color: '#9AA0A6', whiteSpace: 'nowrap', fontSize: '0.72rem' }}>{n.time}</Typography>
                            <IconButton size="small" onClick={(e) => { e.stopPropagation(); dismiss(n.id) }} sx={{ opacity: 0, '.MuiListItem-root:hover &': { opacity: 1 }, color: 'text.disabled', p: 0.25, '&:hover': { color: 'error.main' } }}>
                              <CloseRoundedIcon sx={{ fontSize: '0.85rem' }} />
                            </IconButton>
                          </Stack>
                        </Stack>
                      }
                      secondary={
                        <Stack spacing={0.75} mt={0.5}>
                          <Typography variant="caption" sx={{ color: 'text.secondary', lineHeight: 1.6 }}>{n.body}</Typography>
                          {!n.unread ? null : (
                            <Button aria-label={`Mark as read: ${n.title}`} size="small" variant="text" onClick={(e) => { e.stopPropagation(); markRead(n.id) }}
                              startIcon={<CheckRoundedIcon sx={{ fontSize: '0.8rem !important' }} />}
                              sx={{ alignSelf: 'flex-start', textTransform: 'none', fontWeight: 700, fontSize: '0.72rem', color: 'primary.main', p: 0, minWidth: 0, '&:hover': { bgcolor: 'transparent', opacity: 0.75 } }}>
                              Mark as read
                            </Button>
                          )}
                        </Stack>
                      }
                    />
                  </ListItem>
                </Box>
              )
            })}
          </List>
        )}
      </Box>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
        <Button variant="outlined" fullWidth sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 700 }} onClick={onClose}>Notification Settings</Button>
      </Box>
    </Drawer>
  )
}

// ErrorBoundary wrapper
export default function NotificationPanelWithBoundary(props) {
  return <ErrorBoundary><NotificationPanel {...props} /></ErrorBoundary>
}
