import React, { useState } from 'react';
import {
  Box, Stack, Typography, Card, CardContent, Button, Chip, Divider,
  Avatar, Paper, Tab, Tabs, IconButton, Grid, TextField, InputAdornment,
  Select, MenuItem, FormControl, InputLabel,
} from '@mui/material';
import { StatusChip, EmptyState, AppointmentsListSkeleton } from '../../components/shared';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import VideocamIcon from '@mui/icons-material/Videocam';
import CancelIcon from '@mui/icons-material/Cancel';
import DownloadIcon from '@mui/icons-material/Download';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import { useNavigate } from 'react-router-dom';

const APPOINTMENTS = [
  {
    id: 1, date: '2026-03-20', time: '10:00 AM', doctor: 'Dr. Sarah Johnson',
    specialty: 'Cardiology', clinic: 'City Heart Clinic', type: 'in-person',
    service: 'Cardiology Consultation', price: 85, status: 'confirmed',
    initials: 'SJ',
  },
  {
    id: 2, date: '2026-03-25', time: '02:30 PM', doctor: 'Dr. Marcus Osei',
    specialty: 'Neurology', clinic: 'Online', type: 'video',
    service: 'Neurology Follow-up', price: 95, status: 'scheduled',
    initials: 'MO',
  },
  {
    id: 3, date: '2026-03-05', time: '09:00 AM', doctor: 'Dr. Sarah Johnson',
    specialty: 'Cardiology', clinic: 'City Heart Clinic', type: 'in-person',
    service: 'ECG Recording', price: 120, status: 'completed',
    initials: 'SJ',
  },
  {
    id: 4, date: '2026-02-18', time: '11:00 AM', doctor: 'Dr. Priya Sharma',
    specialty: 'Paediatrics', clinic: 'Family Health Hub', type: 'in-person',
    service: 'Annual Check-up', price: 75, status: 'cancelled',
    initials: 'PS',
  },
];

function AppointmentCard({ appt, onCancel, onJoinVideo }) {
  const isUpcoming   = ['scheduled', 'confirmed'].includes(appt.status);
  const borderColor  = appt.status === 'confirmed' ? '#2DC653' : appt.status === 'scheduled' ? '#006D77' : appt.status === 'cancelled' ? '#E63946' : '#D0E8EA';

  return (
    <Paper variant="outlined" sx={{ p: 2.5, borderLeft: `4px solid ${borderColor}`, borderRadius: 2 }}>
      <Grid container spacing={2} alignItems="center">
        <Grid item>
          <Avatar sx={{ width: 44, height: 44, bgcolor: '#006D77', fontWeight: 800 }}>{appt.initials}</Avatar>
        </Grid>
        <Grid item xs>
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }}>
            <Box>
              <Typography fontWeight={700}>{appt.doctor}</Typography>
              <Chip label={appt.specialty} size="small" color="primary" variant="outlined" sx={{ mt: 0.25, mr: 1 }} />
              <Chip
                icon={appt.type === 'video' ? <VideocamIcon /> : <LocationOnIcon />}
                label={appt.type === 'video' ? 'Video' : appt.clinic}
                size="small" variant="outlined"
                sx={{ mt: 0.25, color: appt.type === 'video' ? '#7C3AED' : undefined }}
              />
            </Box>
            <StatusChip status={appt.status} />
          </Stack>

          <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
            <Stack direction="row" spacing={0.5} alignItems="center">
              <CalendarMonthIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
              <Typography variant="body2" color="text.secondary">{appt.date}</Typography>
            </Stack>
            <Stack direction="row" spacing={0.5} alignItems="center">
              <AccessTimeIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
              <Typography variant="body2" color="text.secondary">{appt.time}</Typography>
            </Stack>
            <Typography variant="body2" color="primary" fontWeight={700}>£{appt.price}</Typography>
          </Stack>
        </Grid>

        {/* Actions */}
        <Grid item>
          <Stack direction={{ xs: 'row', sm: 'column' }} spacing={1} alignItems="flex-end">
            {appt.type === 'video' && isUpcoming && (
              <Button
                variant="contained" size="small" startIcon={<VideocamIcon />}
                onClick={() => onJoinVideo(appt.id)}
                sx={{ bgcolor: '#7C3AED', '&:hover': { bgcolor: '#6D28D9' }, whiteSpace: 'nowrap' }}
              >
                Join Call
              </Button>
            )}
            {appt.status === 'completed' && (
              <Button variant="outlined" size="small" startIcon={<DownloadIcon />}>Receipt</Button>
            )}
            {isUpcoming && (
              <Button
                variant="outlined" size="small" color="error" startIcon={<CancelIcon />}
                onClick={() => onCancel(appt.id)}
              >
                Cancel
              </Button>
            )}
          </Stack>
        </Grid>
      </Grid>
    </Paper>
  );
}

export default function PatientAppointments() {
  const navigate     = useNavigate();
  const [tab, setTab] = useState(0);
  const [search, setSearch] = useState('');

  const upcoming  = APPOINTMENTS.filter((a) => ['scheduled', 'confirmed'].includes(a.status));
  const past      = APPOINTMENTS.filter((a) => ['completed', 'cancelled'].includes(a.status));

  const filtered = (tab === 0 ? upcoming : past).filter((a) =>
    !search || a.doctor.toLowerCase().includes(search.toLowerCase()) || a.specialty.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h2" fontWeight={700}>My Appointments</Typography>
          <Typography variant="body2" color="text.secondary">{upcoming.length} upcoming · {past.length} past</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/appointments/book')}>
          Book Appointment
        </Button>
      </Stack>

      {/* Tabs */}
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: '1px solid #D0E8EA', mb: 2 }}>
        <Tab label={`Upcoming (${upcoming.length})`} />
        <Tab label={`Past (${past.length})`} />
      </Tabs>

      {/* Search + filter */}
      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        <TextField
          size="small" placeholder="Search by doctor or specialty..."
          value={search} onChange={(e) => setSearch(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18 }} /></InputAdornment> }}
          sx={{ width: 280 }}
        />
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Sort by</InputLabel>
          <Select defaultValue="date" label="Sort by">
            <MenuItem value="date">Date</MenuItem>
            <MenuItem value="doctor">Doctor</MenuItem>
            <MenuItem value="price">Price</MenuItem>
          </Select>
        </FormControl>
      </Stack>

      {/* List */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<CalendarMonthIcon sx={{ fontSize: 48 }} />}
          title={tab === 0 ? 'No upcoming appointments' : 'No past appointments'}
          description={tab === 0 ? "Book your first appointment to get started." : "Your completed appointments will appear here."}
          action={tab === 0 ? { label: 'Book Appointment', onClick: () => navigate('/appointments/book') } : null}
        />
      ) : (
        <Stack spacing={2}>
          {filtered.map((appt) => (
            <AppointmentCard
              key={appt.id}
              appt={appt}
              onCancel={(id) => console.log('cancel', id)}
              onJoinVideo={(id) => navigate(`/video/${id}`)}
            />
          ))}
        </Stack>
      )}
    </Box>
  );
}
