/**
 * ─── NotificationBell ─────────────────────────────────────────────────────────
 * AppBar notification icon with badge + dropdown panel of recent notifications.
 */
import React, { useState } from 'react';
import { useQuery, useMutation, gql } from '@apollo/client';
import {
  IconButton, Badge, Popover, Box, Typography, Stack, Divider,
  List, ListItem, ListItemText, ListItemIcon, Button, Chip, Tooltip, Avatar,
} from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import EventNoteRoundedIcon from '@mui/icons-material/EventNoteRounded';
import CreditCardRoundedIcon from '@mui/icons-material/CreditCardRounded';
import ErrorRoundedIcon from '@mui/icons-material/ErrorRounded';
import AnnouncementRoundedIcon from '@mui/icons-material/AnnouncementRounded';
import DoneAllIcon from '@mui/icons-material/DoneAll';

// Same real backend/src/notifications contract as pages/notifications/index.jsx
// (id/title/message/type/priority/is_read/created_at, type is exactly
// 'appointment' | 'payment' | 'alert' | 'system' per notification-trigger.service.ts) --
// this widget used to run on its own separate MockStore-backed list
// (getWidgetNotifications) with zero real GraphQL call, so its unread count
// and dropdown were entirely fake for every logged-in user.
//
// REQ134 (F-14 residue) — notifications is now {data, paginatorInfo}; this
// dropdown only ever needs a handful of recent items (first: 20), not
// every notification the caller has ever received. The badge count comes
// from a separate unreadNotificationCount query, not a client-side count
// over this bounded list -- counting client-side would silently
// undercount once a caller has more unread notifications than fit in one
// dropdown page.
const GET_NOTIFICATIONS = gql`
  query GetNotificationsForBell($first: Int) {
    notifications(first: $first) {
      data { id title message type priority is_read created_at }
    }
  }
`;
const GET_UNREAD_COUNT = gql`
  query GetUnreadNotificationCountForBell { unreadNotificationCount }
`;
const MARK_READ     = gql`mutation MarkNotificationReadFromBell($id: ID!) { markNotificationRead(id: $id) { success } }`;
const MARK_ALL_READ = gql`mutation MarkAllNotificationsReadFromBell        { markAllNotificationsRead      { success } }`;

const ICONS = {
  appointment: <EventNoteRoundedIcon     sx={{ color: '#1A73E8', fontSize: 18 }} />,
  payment:     <CreditCardRoundedIcon    sx={{ color: '#0F9D58', fontSize: 18 }} />,
  alert:       <ErrorRoundedIcon         sx={{ color: '#D93025', fontSize: 18 }} />,
  system:      <AnnouncementRoundedIcon  sx={{ color: '#9334E6', fontSize: 18 }} />,
};

const timeAgo = (dateStr) => {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

export default function NotificationBell() {
  const [anchorEl, setAnchorEl] = useState(null);
  const { data, refetch } = useQuery(GET_NOTIFICATIONS, { variables: { first: 20 }, fetchPolicy: 'cache-and-network' });
  const { data: unreadData, refetch: refetchUnread } = useQuery(GET_UNREAD_COUNT, { fetchPolicy: 'cache-and-network' });
  const refetchAll = () => { refetch(); refetchUnread(); };
  const [markReadMut]    = useMutation(MARK_READ,     { onCompleted: refetchAll });
  const [markAllReadMut] = useMutation(MARK_ALL_READ, { onCompleted: refetchAll });

  const list = (data?.notifications?.data || []).map((n) => ({
    id: n.id, unread: !n.is_read, type: n.type, title: n.title, body: n.message,
    time: timeAgo(n.created_at),
  }));
  const unread = unreadData?.unreadNotificationCount ?? 0;

  const markAllRead = () => markAllReadMut();
  const markRead    = (id) => markReadMut({ variables: { id } });

  const open = Boolean(anchorEl);

  return (
    <>
      <Tooltip title="Notifications">
        <IconButton
          onClick={(e) => setAnchorEl(e.currentTarget)}
          aria-label={`${unread} unread notifications`}
          aria-haspopup="true"
          aria-expanded={open}
        >
          <Badge badgeContent={unread} color="error" max={9}>
            {unread > 0 ? <NotificationsIcon /> : <NotificationsNoneIcon />}
          </Badge>
        </IconButton>
      </Tooltip>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{ sx: { width: 360, maxHeight: 480, overflow: 'hidden', display: 'flex', flexDirection: 'column' } }}
      >
        {/* Header */}
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ px: 2, py: 1.5, borderBottom: '1px solid #D0E8EA' }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography fontWeight={700}>Notifications</Typography>
            {unread > 0 && <Chip label={`${unread} new`} size="small" color="error" />}
          </Stack>
          {unread > 0 && (
            <Button size="small" startIcon={<DoneAllIcon />} onClick={markAllRead} sx={{ fontSize: '0.75rem' }}>
              Mark all read
            </Button>
          )}
        </Stack>

        {/* Notification List */}
        <List sx={{ overflow: 'auto', flex: 1, py: 0 }}>
          {list.map((notif, i) => (
            <React.Fragment key={notif.id}>
              <ListItem
                alignItems="flex-start"
                onClick={() => markRead(notif.id)}
                sx={{
                  py: 1.5, cursor: 'pointer',
                  bgcolor: notif.unread ? '#F0F7F8' : 'transparent',
                  '&:hover': { bgcolor: '#E8F8F9' },
                  transition: 'background 0.15s',
                }}
              >
                <ListItemIcon sx={{ minWidth: 36, mt: 0.5 }}>
                  <Box sx={{ width: 32, height: 32, borderRadius: '50%', bgcolor: '#F0F7F8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {ICONS[notif.type] || <AnnouncementRoundedIcon sx={{ color: '#6B7280', fontSize: 18 }} />}
                  </Box>
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="body2" fontWeight={notif.unread ? 700 : 500}>{notif.title}</Typography>
                      {notif.unread && <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#006D77', flexShrink: 0, ml: 1 }} />}
                    </Stack>
                  }
                  secondary={
                    <>
                      <Typography variant="caption" color="text.secondary">{notif.body}</Typography>
                      <br />
                      <Typography variant="caption" sx={{ color: '#83C5BE', fontWeight: 600 }}>{notif.time}</Typography>
                    </>
                  }
                />
              </ListItem>
              {i < list.length - 1 && <Divider component="li" sx={{ borderColor: '#F0F7F8' }} />}
            </React.Fragment>
          ))}
        </List>

        {/* Footer */}
        <Box sx={{ px: 2, py: 1.5, borderTop: '1px solid #D0E8EA', textAlign: 'center' }}>
          <Button
            size="small"
            fullWidth
            aria-label="View all notifications"
            onClick={() => { setAnchorEl(null); window.location.href = '/notifications'; }}
          >View All Notifications</Button>

        </Box>
      </Popover>
    </>
  );
}
