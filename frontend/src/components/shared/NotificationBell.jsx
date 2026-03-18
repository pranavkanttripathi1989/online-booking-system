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
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import PaymentIcon from '@mui/icons-material/Payment';
import VideocamIcon from '@mui/icons-material/Videocam';
import DoneAllIcon from '@mui/icons-material/DoneAll';

const ICONS = {
  booking:    <CalendarMonthIcon sx={{ color: '#006D77', fontSize: 18 }} />,
  confirmed:  <CheckCircleIcon  sx={{ color: '#2DC653', fontSize: 18 }} />,
  cancelled:  <CancelIcon       sx={{ color: '#E63946', fontSize: 18 }} />,
  payment:    <PaymentIcon      sx={{ color: '#7C3AED', fontSize: 18 }} />,
  video:      <VideocamIcon     sx={{ color: '#3A86FF', fontSize: 18 }} />,
};

const INITIAL_NOTIFICATIONS = [
  { id: 1, type: 'confirmed', title: 'Appointment Confirmed',      body: 'Dr. Sarah Johnson · Thu 20 Mar, 10:00 AM',   time: '2m ago',   read: false },
  { id: 2, type: 'payment',   title: 'Payment Successful',         body: '£85 charged for Cardiology Consultation',    time: '5m ago',   read: false },
  { id: 3, type: 'video',     title: 'Video Call Starting Soon',   body: 'Your call with Dr. Osei starts in 15 min',   time: '15m ago',  read: false },
  { id: 4, type: 'booking',   title: 'New Appointment Request',    body: 'Emma Wilson — Cardiology (Fri 21 Mar)',       time: '1h ago',   read: true  },
  { id: 5, type: 'cancelled', title: 'Appointment Cancelled',      body: 'Omar Hassan cancelled his 14:00 slot',       time: '3h ago',   read: true  },
];

export default function NotificationBell() {
  const [anchorEl, setAnchorEl]     = useState(null);
  const [notifications, setNotifs]  = useState(INITIAL_NOTIFICATIONS);

  const unread = notifications.filter((n) => !n.read).length;

  const markAllRead = () => setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
  const markRead    = (id) => setNotifs((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));

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
          {notifications.map((notif, i) => (
            <React.Fragment key={notif.id}>
              <ListItem
                alignItems="flex-start"
                onClick={() => markRead(notif.id)}
                sx={{
                  py: 1.5, cursor: 'pointer',
                  bgcolor: notif.read ? 'transparent' : '#F0F7F8',
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
                      <Typography variant="body2" fontWeight={notif.read ? 500 : 700}>{notif.title}</Typography>
                      {!notif.read && <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#006D77', flexShrink: 0, ml: 1 }} />}
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
              {i < notifications.length - 1 && <Divider component="li" sx={{ borderColor: '#F0F7F8' }} />}
            </React.Fragment>
          ))}
        </List>

        {/* Footer */}
        <Box sx={{ px: 2, py: 1.5, borderTop: '1px solid #D0E8EA', textAlign: 'center' }}>
          <Button size="small" fullWidth>View All Notifications</Button>
        </Box>
      </Popover>
    </>
  );
}
