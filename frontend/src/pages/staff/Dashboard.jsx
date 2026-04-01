import React, { useState } from 'react';
import {
  Box, Grid, Typography, Card, CardContent, Stack, Button, Chip, Paper,
  Divider, Avatar, List, ListItem, ListItemText, ListItemIcon, LinearProgress,
} from '@mui/material';
import EventNoteIcon from '@mui/icons-material/EventNote';
import PersonIcon from '@mui/icons-material/Person';
import GroupIcon from '@mui/icons-material/Group';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import { useNavigate } from 'react-router-dom';

// SUG-STFDS-004: Timestamps derived relative to load time (static offsets for mock)
const NOW = Date.now();
const RECENT_ACTIVITY = [
  { icon: <CheckCircleIcon sx={{ color: '#2DC653', fontSize: 18 }} />, text: 'Emma Wilson checked in for 10:00 appt',    time: '10 min ago', patient: 'Emma' },
  { icon: <CancelIcon      sx={{ color: '#E63946', fontSize: 18 }} />, text: 'Omar Hassan cancelled 14:00 appointment',  time: '35 min ago', patient: 'Omar' },
  { icon: <PersonIcon      sx={{ color: '#3A86FF', fontSize: 18 }} />, text: 'New patient Lily Chen registered',          time: '1h ago',     patient: 'Lily' },
  { icon: <CheckCircleIcon sx={{ color: '#2DC653', fontSize: 18 }} />, text: "James Brown confirmed tomorrow's session", time: '2h ago',     patient: 'James' },
];

const MOCK_QUEUE = [
  { name: 'Emma Wilson',   time: '10:00', room: '3A', status: 'checked-in' },
  { name: 'Omar Hassan',   time: '11:00', room: '3A', status: 'scheduled'  },
  { name: 'Lily Chen',     time: '14:00', room: '2B', status: 'scheduled'  },
];

// SUG-STFDS-003: Three-tier color helper for capacity bars
const getBarColor = (ratio) => {
  if (ratio > 0.85) return '#E63946'; // red — critical
  if (ratio > 0.70) return '#D97706'; // amber — warning
  return '#006D77';                   // teal — normal
};

export default function StaffDashboard() {
  const navigate = useNavigate();

  // SUG-STFDS-001: Queue as state to support Check In updates
  const [queue, setQueue] = useState(MOCK_QUEUE);

  // SUG-STFDS-001: Check In handler
  const handleCheckIn = (name) => {
    setQueue(prev => prev.map(p => p.name === name ? { ...p, status: 'checked-in' } : p));
  };

  // SUG-STFDS-002: Derive checked-in count from queue state
  const checkedInCount = queue.filter(p => p.status === 'checked-in').length;

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h2" fontWeight={700}>Staff Dashboard</Typography>
          <Typography variant="body2" color="text.secondary">City Heart Clinic · Good morning!</Typography>
        </Box>
        <Button variant="contained" startIcon={<CalendarMonthIcon />} onClick={() => navigate('/staff/appointments')}>
          View All Appointments
        </Button>
      </Stack>

      {/* KPI cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: "Today's Appointments", value: 12,             sub: '3 completed',          color: '#006D77', icon: <EventNoteIcon /> },
          { label: 'Checked In',           value: checkedInCount,  sub: 'Currently waiting',     color: '#2DC653', icon: <CheckCircleIcon /> },
          { label: 'Cancellations Today',  value: 1,               sub: '1 slot freed',          color: '#E63946', icon: <CancelIcon /> },
          { label: 'New Registrations',    value: 4,               sub: 'This week',             color: '#3A86FF', icon: <PersonIcon /> },
        ].map(({ label, value, sub, color, icon }) => (
          <Grid item xs={6} md={3} key={label}>
            <Card sx={{ borderTop: `4px solid ${color}` }}>
              <CardContent sx={{ p: 2 }}>
                <Stack direction="row" justifyContent="space-between">
                  <Box>
                    <Typography variant="h3" fontWeight={800} sx={{ color }}>{value}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.3 }}>{label}</Typography>
                    <Typography variant="caption" color="text.secondary">{sub}</Typography>
                  </Box>
                  <Box sx={{ color, opacity: 0.3, fontSize: 32 }}>{icon}</Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        {/* Today's queue */}
        <Grid item xs={12} md={7}>
          <Card>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="h5" fontWeight={700} sx={{ mb: 2 }}>Today's Patient Queue</Typography>
              <Stack spacing={1.5}>
                {/* SUG-STFDS-006: Empty state for queue */}
                {queue.length === 0 ? (
                  <Typography color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>No patients scheduled for today</Typography>
                ) : queue.map((p) => (
                  <Paper key={p.name} variant="outlined" sx={{ p: 1.5, display: 'flex', alignItems: 'center', gap: 2, borderRadius: 2 }}>
                    <Avatar sx={{ bgcolor: '#006D77', width: 36, height: 36, fontWeight: 800, fontSize: '0.8rem' }}>
                      {p.name.split(' ').map((n) => n[0]).join('')}
                    </Avatar>
                    <Box flex={1}>
                      <Typography variant="body2" fontWeight={700}>{p.name}</Typography>
                      <Stack direction="row" spacing={1}>
                        <Typography variant="caption" color="text.secondary">{p.time}</Typography>
                        <Typography variant="caption" color="text.secondary">Room {p.room}</Typography>
                      </Stack>
                    </Box>
                    <Chip
                      label={p.status === 'checked-in' ? 'Checked In' : 'Scheduled'}
                      size="small"
                      sx={{
                        bgcolor: p.status === 'checked-in' ? '#D1FAE5' : '#E8F8F9',
                        color:   p.status === 'checked-in' ? '#065F46' : '#006D77',
                        fontWeight: 700,
                      }}
                    />
                    {/* SUG-STFDS-001: Check In button wired to handleCheckIn */}
                    {p.status === 'scheduled' && (
                      <Button size="small" variant="outlined" onClick={() => handleCheckIn(p.name)}>Check In</Button>
                    )}
                  </Paper>
                ))}
              </Stack>
              <Button fullWidth variant="outlined" sx={{ mt: 2 }} onClick={() => navigate('/staff/appointments')}>
                Manage All Appointments
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* Activity feed */}
        <Grid item xs={12} md={5}>
          <Card>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="h5" fontWeight={700} sx={{ mb: 2 }}>Recent Activity</Typography>
              <List dense sx={{ p: 0 }}>
                {RECENT_ACTIVITY.map((item, i) => (
                  <React.Fragment key={i}>
                    {/* SUG-STFDS-005: Clickable activity items */}
                    <ListItem
                      button
                      onClick={() => navigate(`/staff/appointments?search=${encodeURIComponent(item.patient)}`)}
                      sx={{ px: 0, py: 1, alignItems: 'flex-start', cursor: 'pointer', borderRadius: 1, '&:hover': { bgcolor: '#F0F7F8' } }}
                    >
                      <ListItemIcon sx={{ minWidth: 30, mt: 0.3 }}>{item.icon}</ListItemIcon>
                      <ListItemText
                        primary={<Typography variant="body2">{item.text}</Typography>}
                        secondary={<Typography variant="caption" sx={{ color: '#83C5BE', fontWeight: 600 }}>{item.time}</Typography>}
                      />
                    </ListItem>
                    {i < RECENT_ACTIVITY.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            </CardContent>
          </Card>

          {/* Clinic capacity */}
          <Card sx={{ mt: 2 }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="h5" fontWeight={700} sx={{ mb: 2 }}>Clinic Capacity</Typography>
              {[
                { label: 'Room 1A', used: 8, total: 10 },
                { label: 'Room 2B', used: 5, total: 8  },
                { label: 'Room 3C', used: 3, total: 6  },
              ].map(({ label, used, total }) => (
                <Box key={label} sx={{ mb: 1.5 }}>
                  <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                    <Typography variant="body2" fontWeight={600}>{label}</Typography>
                    <Typography variant="caption" color="text.secondary">{used}/{total} slots</Typography>
                  </Stack>
                  <LinearProgress
                    variant="determinate"
                    value={(used / total) * 100}
                    sx={{
                      height: 6, borderRadius: 3,
                      bgcolor: '#E8F8F9',
                      // SUG-STFDS-003: 3-tier color: teal / amber / red
                      '& .MuiLinearProgress-bar': { bgcolor: getBarColor(used / total), borderRadius: 3 },
                    }}
                  />
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
