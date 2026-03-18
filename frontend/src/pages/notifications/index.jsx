import { useState, useEffect } from 'react'
import { useQuery, useMutation, gql } from '@apollo/client'
import {
  Alert, Box, Button, Card, CardContent, Chip,
  CircularProgress, IconButton, Stack, Tooltip, Typography,
} from '@mui/material'
import NotificationsIcon from '@mui/icons-material/Notifications'
import CheckIcon from '@mui/icons-material/Check'
import DeleteIcon from '@mui/icons-material/Delete'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import CreditCardIcon from '@mui/icons-material/CreditCard'
import AlertIcon from '@mui/icons-material/Error'
import InfoIcon from '@mui/icons-material/Info'

// ─── GraphQL ─────────────────────────────────────────────────────────────────

const GET_NOTIFICATIONS = gql`
  query GetNotifications($filter: String) {
    notifications(filter: $filter) {
      id title message type priority is_read created_at
    }
  }
`
const MARK_READ     = gql`mutation MarkNotificationRead($id:ID!)           { markNotificationRead(id:$id)           { success } }`
const MARK_ALL_READ = gql`mutation MarkAllNotificationsRead               { markAllNotificationsRead               { success } }`
const DELETE_NOTIF  = gql`mutation DeleteNotification($id:ID!)             { deleteNotification(id:$id)             { success } }`

// ─── Helpers ─────────────────────────────────────────────────────────────────

const typeIcon = (type) => {
  switch (type) {
    case 'appointment': return <CalendarMonthIcon />
    case 'payment':     return <CreditCardIcon />
    case 'alert':       return <AlertIcon />
    default:            return <InfoIcon />
  }
}

const iconColor = (priority, type) => {
  if (priority === 'high')        return { bg: '#FEE2E2', color: '#DC2626', border: '#FECACA' }
  if (type === 'payment')         return { bg: '#D1FAE5', color: '#059669', border: '#A7F3D0' }
  if (type === 'appointment')     return { bg: '#DBEAFE', color: '#2563EB', border: '#BFDBFE' }
  return { bg: '#F3F4F6', color: '#6B7280', border: '#E5E7EB' }
}

const timeAgo = (dateStr) => {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1)   return 'just now'
  if (mins < 60)  return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)   return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function NotificationsPage() {
  const [filter, setFilter] = useState('unread')
  const [actionError, setActionError] = useState(null)

  const { data, loading, refetch } = useQuery(GET_NOTIFICATIONS, {
    variables: { filter },
    fetchPolicy: 'cache-and-network',
    pollInterval: 30000,  // 30s real-time substitute
  })

  const [markRead]     = useMutation(MARK_READ)
  const [markAllRead]  = useMutation(MARK_ALL_READ)
  const [deleteNotif]  = useMutation(DELETE_NOTIF)

  const notifications = data?.notifications || []
  const hasUnread     = notifications.some(n => !n.is_read)

  const run = async (fn, vars) => {
    setActionError(null)
    try { await fn({ variables: vars }); refetch() }
    catch (err) { setActionError(err.message) }
  }

  if (loading && !data) return (
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
          <Typography variant="h5" fontWeight={700}>Notifications</Typography>
        </Stack>

        <Stack direction="row" spacing={1}>
          {/* Filter toggle */}
          <Box sx={{ display: 'flex', bgcolor: 'grey.100', borderRadius: 1, p: 0.5 }}>
            {['unread', 'all'].map(f => (
              <Button
                key={f}
                size="small"
                onClick={() => setFilter(f)}
                sx={{
                  px: 2, py: 0.5, borderRadius: 0.5, textTransform: 'capitalize',
                  bgcolor: filter === f ? 'background.paper' : 'transparent',
                  color:   filter === f ? 'primary.main'   : 'text.secondary',
                  boxShadow: filter === f ? 1 : 0,
                  fontWeight: filter === f ? 700 : 400,
                }}
              >
                {f === 'unread' ? 'Unread' : 'All'}
              </Button>
            ))}
          </Box>

          {hasUnread && (
            <Button
              variant="contained"
              size="small"
              startIcon={<CheckIcon />}
              onClick={() => run(markAllRead, {})}
            >
              Mark All Read
            </Button>
          )}
        </Stack>
      </Stack>

      {actionError && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setActionError(null)}>{actionError}</Alert>}

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
        {notifications.map(notif => {
          const colors = iconColor(notif.priority, notif.type)
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
                  <Box sx={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: 42, height: 42, borderRadius: 1.5, flexShrink: 0,
                    bgcolor: colors.bg, color: colors.color, border: `1px solid ${colors.border}`,
                  }}>
                    {typeIcon(notif.type)}
                  </Box>

                  {/* Content */}
                  <Box flex={1} minWidth={0}>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                      <Box>
                        <Typography fontWeight={700} noWrap>{notif.title}</Typography>
                        <Typography variant="body2" color="text.secondary">{notif.message}</Typography>
                        <Stack direction="row" spacing={1} mt={0.5} alignItems="center">
                          <Typography variant="caption" color="text.disabled">{timeAgo(notif.created_at)}</Typography>
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
                            <IconButton size="small" color="primary" onClick={() => run(markRead, { id: notif.id })}>
                              <CheckIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title="Delete">
                          <IconButton size="small" color="error" onClick={() => run(deleteNotif, { id: notif.id })}>
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
    </Box>
  )
}
