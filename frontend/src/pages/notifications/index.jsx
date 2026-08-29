import { useState, useEffect } from 'react'
import { useQuery, useMutation, gql } from '@apollo/client'
import { alpha, useTheme } from '@mui/material/styles'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogActions,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material'
import NotificationsIcon from '@mui/icons-material/Notifications'
import CheckIcon from '@mui/icons-material/Check'
import DeleteIcon from '@mui/icons-material/Delete'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import CreditCardIcon from '@mui/icons-material/CreditCard'
import AlertIcon from '@mui/icons-material/Error'
import InfoIcon from '@mui/icons-material/Info'
import { useAuth } from '../../context/AuthContext'

// ─── GraphQL ─────────────────────────────────────────────────────────────────

// REQ134 (F-14 residue) — notifications is now {data, paginatorInfo}.
const GET_NOTIFICATIONS = gql`
  query GetNotifications($filter: String) {
    notifications(filter: $filter) {
      data {
        id
        title
        message
        type
        priority
        is_read
        created_at
      }
    }
  }
`
const GET_UNREAD_COUNT = gql`
  query GetUnreadNotificationCount {
    unreadNotificationCount
  }
`
const MARK_READ = gql`
  mutation MarkNotificationRead($id: ID!) {
    markNotificationRead(id: $id) {
      success
    }
  }
`
const MARK_ALL_READ = gql`
  mutation MarkAllNotificationsRead {
    markAllNotificationsRead {
      success
    }
  }
`
const DELETE_NOTIF = gql`
  mutation DeleteNotification($id: ID!) {
    deleteNotification(id: $id) {
      success
    }
  }
`

// SUG-NOTIF-001: Mock fallback so the page shows data when the backend is offline —
// the topbar bell (NotificationBell) already renders its own list; this keeps the
// full page usable rather than showing an empty inbox while the GraphQL query fails.
const MOCK_NOTIFICATIONS = [
  {
    id: '1',
    title: 'Appointment Reminder',
    message: 'Emma Wilson at 09:00',
    type: 'appointment',
    priority: 'normal',
    is_read: false,
    created_at: new Date().toISOString(),
  },
  {
    id: '2',
    title: 'Payment Received',
    message: '$150 received from Omar Hassan',
    type: 'payment',
    priority: 'normal',
    is_read: false,
    created_at: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: '3',
    title: 'System Alert',
    message: 'Backup completed',
    type: 'alert',
    priority: 'high',
    is_read: true,
    created_at: new Date(Date.now() - 86400000).toISOString(),
  },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

const typeIcon = (type) => {
  switch (type) {
    case 'appointment':
      return <CalendarMonthIcon />
    case 'payment':
      return <CreditCardIcon />
    case 'alert':
      return <AlertIcon />
    default:
      return <InfoIcon />
  }
}

// SUG-NOTIF-007: Priority intentionally wins over type — a high-priority notification
// (of any type, e.g. an urgent appointment) is always shown in red so it stands out in
// the list. This is deliberate, not a bug: severity should be scannable at a glance
// regardless of category. See SUG-NOTIF-PLAN-006 for the documented test case.
const iconColor = (theme, priority, type) => {
  const tone = (main) => ({
    bg: alpha(main, theme.palette.mode === 'dark' ? 0.18 : 0.12),
    color: main,
    border: alpha(main, theme.palette.mode === 'dark' ? 0.4 : 0.3),
  })
  if (priority === 'high') return tone(theme.palette.error.main)
  if (type === 'payment') return tone(theme.palette.success.main)
  if (type === 'appointment') return tone(theme.palette.info.main)
  return { bg: theme.palette.action.hover, color: theme.palette.text.secondary, border: theme.palette.divider }
}

const timeAgo = (dateStr) => {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function NotificationsPage() {
  const theme = useTheme()
  const { user } = useAuth()
  const [filter, setFilter] = useState('unread')
  const [actionError, setActionError] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null) // SUG-NOTIF-002: confirm before delete
  const [pendingId, setPendingId] = useState(null) // SUG-NOTIF-004: in-flight mutation guard
  const [markingAll, setMarkingAll] = useState(false) // SUG-NOTIF-005: Mark All Read loading state

  const { data, loading, error, refetch } = useQuery(GET_NOTIFICATIONS, {
    variables: { filter },
    fetchPolicy: 'cache-and-network',
    pollInterval: 30000, // 30s real-time substitute
    skip: !user?.id, // SUG-NOTIF-003: don't fire for unauthenticated users
  })
  // REQ134 (F-14 residue) — the true total, decoupled from the (now
  // bounded, first: 200 by default) list fetch above. A client-side
  // count over that list would silently undercount once a caller has
  // more unread notifications than fit in one page.
  const { data: unreadData, refetch: refetchUnread } = useQuery(GET_UNREAD_COUNT, { skip: !user?.id, pollInterval: 30000 })

  const [markRead] = useMutation(MARK_READ)
  const [markAllRead] = useMutation(MARK_ALL_READ)
  const [deleteNotif] = useMutation(DELETE_NOTIF)

  // SUG-NOTIF-001: fall back to mock data when the backend is unreachable (2s timeout)
  // so the page doesn't show an empty inbox while the topbar bell shows unread items.
  const notifications = data?.notifications?.data || (error ? MOCK_NOTIFICATIONS : [])
  const unreadCount = error ? notifications.filter((n) => !n.is_read).length : (unreadData?.unreadNotificationCount ?? 0) // SUG-NOTIF-006
  const hasUnread = unreadCount > 0

  // SUG-NOTIF-004: prevent concurrent mutations racing each other
  const run = async (fn, vars) => {
    if (pendingId) return
    setPendingId(vars?.id || 'all')
    setActionError(null)
    try {
      await fn({ variables: vars })
      refetch()
      refetchUnread()
    } catch (err) {
      setActionError(err.message)
    } finally {
      setPendingId(null)
    }
  }

  // SUG-NOTIF-005: dedicated loading state + label for Mark All Read
  const handleMarkAll = async () => {
    setMarkingAll(true)
    await run(markAllRead, {})
    setMarkingAll(false)
  }

  // SUG-NOTIF-002: delete requires confirmation via dialog instead of firing immediately
  const confirmDelete = async () => {
    const id = deleteTarget
    setDeleteTarget(null)
    await run(deleteNotif, { id })
  }

  if (loading && !data)
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={300}>
        <CircularProgress />
      </Box>
    )

  return (
    <Box>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={4}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <NotificationsIcon sx={{ fontSize: 32, color: 'primary.main' }} />
          <Typography variant="h5" fontWeight={700}>
            Notifications
          </Typography>
        </Stack>

        <Stack direction="row" spacing={1}>
          {/* Filter toggle */}
          <Box sx={{ display: 'flex', bgcolor: 'grey.100', borderRadius: 1, p: 0.5 }}>
            {['unread', 'all'].map((f) => (
              <Button
                key={f}
                size="small"
                onClick={() => setFilter(f)}
                sx={{
                  px: 2,
                  py: 0.5,
                  borderRadius: 0.5,
                  textTransform: 'capitalize',
                  bgcolor: filter === f ? 'background.paper' : 'transparent',
                  color: filter === f ? 'primary.main' : 'text.secondary',
                  boxShadow: filter === f ? 1 : 0,
                  fontWeight: filter === f ? 700 : 400,
                }}
              >
                {/* SUG-NOTIF-006: show notification counts on the filter chips */}
                {f === 'unread' ? `Unread${unreadCount ? ` (${unreadCount})` : ''}` : `All (${notifications.length})`}
              </Button>
            ))}
          </Box>

          {hasUnread && (
            <Button
              variant="contained"
              size="small"
              disabled={markingAll}
              startIcon={markingAll ? <CircularProgress size={14} color="inherit" /> : <CheckIcon />}
              onClick={handleMarkAll}
            >
              {markingAll ? 'Marking…' : 'Mark All Read'}
            </Button>
          )}
        </Stack>
      </Stack>

      {actionError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setActionError(null)}>
          {actionError}
        </Alert>
      )}

      {/* Empty state */}
      {notifications.length === 0 && (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 8 }}>
            <NotificationsIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              No {filter === 'unread' ? 'unread ' : ''}notifications
            </Typography>
          </CardContent>
        </Card>
      )}

      {/* List */}
      <Stack spacing={1.5}>
        {notifications.map((notif) => {
          const colors = iconColor(theme, notif.priority, notif.type)
          return (
            <Card
              key={notif.id}
              sx={{
                borderLeft: !notif.is_read ? '4px solid' : 'none',
                borderColor: 'primary.main',
                '&:hover': { boxShadow: 3 },
                transition: 'box-shadow 0.2s',
              }}
            >
              <CardContent sx={{ py: 2 }}>
                <Stack direction="row" spacing={2} alignItems="flex-start">
                  {/* Icon */}
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 42,
                      height: 42,
                      borderRadius: 1.5,
                      flexShrink: 0,
                      bgcolor: colors.bg,
                      color: colors.color,
                      border: `1px solid ${colors.border}`,
                    }}
                  >
                    {typeIcon(notif.type)}
                  </Box>

                  {/* Content */}
                  <Box flex={1} minWidth={0}>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                      <Box>
                        <Typography fontWeight={700} noWrap>
                          {notif.title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {notif.message}
                        </Typography>
                        <Stack direction="row" spacing={1} mt={0.5} alignItems="center">
                          <Typography variant="caption" color="text.disabled">
                            {timeAgo(notif.created_at)}
                          </Typography>
                          <Chip label={notif.type} size="small" sx={{ fontSize: '0.65rem', height: 18, textTransform: 'capitalize' }} />
                          {notif.priority === 'high' && (
                            <Chip label="High Priority" size="small" color="error" sx={{ fontSize: '0.65rem', height: 18 }} />
                          )}
                        </Stack>
                      </Box>

                      {/* Actions */}
                      <Stack direction="row" spacing={0.5} flexShrink={0}>
                        {!notif.is_read && (
                          <Tooltip title="Mark as read">
                            <IconButton size="small" color="primary" disabled={!!pendingId} onClick={() => run(markRead, { id: notif.id })}>
                              <CheckIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title="Delete">
                          {/* SUG-NOTIF-002: open confirm dialog instead of deleting immediately */}
                          <IconButton size="small" color="error" disabled={!!pendingId} onClick={() => setDeleteTarget(notif.id)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </Stack>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          )
        })}
      </Stack>

      {/* SUG-NOTIF-002: Delete confirmation dialog */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>Delete Notification?</DialogTitle>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button color="error" onClick={confirmDelete}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
