/**
 * ─── NotificationBell ─────────────────────────────────────────────────────────
 * AppBar notification icon with badge + dropdown panel of recent notifications.
 */
import React, { useState } from 'react';
import {
  IconButton, Badge, Popover, Box, Typography, Stack, Divider,
  List, ListItem, ListItemText, ListItemIcon, Button, Chip, Tooltip, Avatar,
} from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import EventNoteRoundedIcon from '@mui/icons-material/EventNoteRounded';
import PersonAddRoundedIcon from '@mui/icons-material/PersonAddRounded';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import ScienceRoundedIcon from '@mui/icons-material/ScienceRounded';
import AnnouncementRoundedIcon from '@mui/icons-material/AnnouncementRounded';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import { useMockData, useMockMutation } from '../../mocks/useMockData';
import * as MockStore from '../../mocks/store';

// SUG-NOTIF-001/002 (notification-test-suggestion.md): icon taxonomy matches
// NotificationPanel's TYPE_CONFIG so both widgets render the same shared
// MockStore-backed notification list consistently.
const ICONS = {
  appointment: <EventNoteRoundedIcon     sx={{ color: '#1A73E8', fontSize: 18 }} />,
  patient:     <PersonAddRoundedIcon     sx={{ color: '#0F9D58', fontSize: 18 }} />,
  review:      <StarRoundedIcon          sx={{ color: '#F9AB00', fontSize: 18 }} />,
  result:      <ScienceRoundedIcon       sx={{ color: '#9334E6', fontSize: 18 }} />,
  system:      <AnnouncementRoundedIcon  sx={{ color: '#D93025', fontSize: 18 }} />,
};

export default function NotificationBell() {
  const [anchorEl, setAnchorEl]     = useState(null);
  // SUG-NOTIF-001/002: shared MockStore source (was local useState(INITIAL_NOTIFICATIONS))
  const { data: notifications } = useMockData(store => store.getWidgetNotifications());
  const [markAllReadMut] = useMockMutation(() => MockStore.markAllWidgetNotificationsRead());
  const [markReadMut]    = useMockMutation((id) => MockStore.markWidgetNotificationRead(id));

  const list = notifications || [];
  const unread = list.filter((n) => n.unread).length;

  const markAllRead = () => markAllReadMut();
  const markRead    = (id) => markReadMut(id);

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
                    {ICONS[notif.type]}
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
