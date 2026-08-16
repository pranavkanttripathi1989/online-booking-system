import React, { useState, useMemo, useEffect } from 'react';
import {
  Box, Stack, Typography, Card, CardContent, Button, Chip, Divider,
  Avatar, Paper, Tab, Tabs, IconButton, Grid, TextField, InputAdornment,
  Select, MenuItem, FormControl, InputLabel,
  Dialog, DialogTitle, DialogContent, DialogActions,
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
import EventRepeatIcon from '@mui/icons-material/EventRepeat';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSnackbar } from 'notistack';

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

// SUG-PTAPPT-003: Receipt handler (passed down from parent)
// SUG-PTAPPT-005: Price null guard
// SUG-PTAPPT-011 / SUG-PTDASH-011: Reschedule handler
// SUG-PTAPPT-012: onViewDetails opens the detail drawer/dialog
function AppointmentCard({ appt, onCancel, onJoinVideo, onReceipt, onReschedule, onViewDetails, highlighted }) {
  const isUpcoming   = ['scheduled', 'confirmed'].includes(appt.status);
  const borderColor  = appt.status === 'confirmed' ? '#2DC653' : appt.status === 'scheduled' ? '#006D77' : appt.status === 'cancelled' ? '#E63946' : '#D0E8EA';

  return (
    <Paper
      variant="outlined"
      onClick={() => onViewDetails(appt)}
      sx={{
        p: 2.5, borderLeft: `4px solid ${borderColor}`, borderRadius: 2, cursor: 'pointer',
        ...(highlighted ? { boxShadow: '0 0 0 2px #006D77', bgcolor: '#F0FBFB' } : {}),
      }}
    >
      <Grid container spacing={2} alignItems="center">
        <Grid item>
          <Avatar sx={{ width: 44, height: 44, bgcolor: '#006D77', fontWeight: 800 }}>{appt.initials}</Avatar>
        </Grid>
        <Grid item xs>
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }}>
            <Box>
              {/* SUG-PTAPPT-006: noWrap + maxWidth guard for long doctor names */}
              <Typography fontWeight={700} noWrap sx={{ maxWidth: 280 }}>{appt.doctor}</Typography>
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
            {/* SUG-PTAPPT-005: Null guard for missing price */}
            <Typography variant="body2" color="primary" fontWeight={700}>
              {appt.price != null ? `£${appt.price}` : 'Price TBD'}
            </Typography>
          </Stack>
        </Grid>

        {/* Actions */}
        <Grid item onClick={(e) => e.stopPropagation()}>
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
            {/* SUG-PTAPPT-003: Receipt onClick handler */}
            {appt.status === 'completed' && (
              <Button
                variant="outlined" size="small" startIcon={<DownloadIcon />}
                aria-label={`Download receipt for ${appt.service}`}
                onClick={() => onReceipt(appt)}
              >
                Receipt
              </Button>
            )}
            {/* SUG-PTAPPT-011 / SUG-PTDASH-011: Reschedule button for upcoming appointments */}
            {isUpcoming && (
              <Button
                variant="outlined" size="small" startIcon={<EventRepeatIcon />}
                onClick={() => onReschedule(appt)}
                aria-label={`Reschedule appointment with ${appt.doctor}`}
              >
                Reschedule
              </Button>
            )}
            {isUpcoming && (
              <Button
                variant="outlined" size="small" color="error" startIcon={<CancelIcon />}
                onClick={() => onCancel(appt.id)}
                aria-label={`Cancel appointment with ${appt.doctor}`}
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
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState(0);
  const [search, setSearch] = useState('');

  // SUG-PTAPPT-002: Controlled sort state
  const [sortBy, setSortBy] = useState('date');
  // SUG-PTAPPT-008: Sort direction toggle (asc/desc)
  const [sortDir, setSortDir] = useState('asc');

  // SUG-PTAPPT-001 + SUG-PTAPPT-007: Convert to state so cancel updates UI + subtitle
  const [appointments, setAppointments] = useState(APPOINTMENTS);
  const [cancelId, setCancelId] = useState(null);

  // SUG-PTAPPT-011 / SUG-PTDASH-011: Reschedule dialog state + query-param handoff from Dashboard
  const [rescheduleAppt, setRescheduleAppt] = useState(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [highlightId, setHighlightId] = useState(null);

  // SUG-PTAPPT-012: Appointment detail dialog state
  const [detailAppt, setDetailAppt] = useState(null);

  // SUG-PTDASH-011: /patient/appointments?reschedule=:id opens the reschedule dialog for that appointment
  useEffect(() => {
    const rescheduleId = searchParams.get('reschedule');
    if (rescheduleId) {
      const target = appointments.find((a) => String(a.id) === String(rescheduleId));
      if (target) {
        setTab(0);
        setRescheduleAppt(target);
        setRescheduleDate(target.date);
        setRescheduleTime(target.time);
        setHighlightId(target.id);
      }
      // Clear the param so refresh/back doesn't keep re-opening the dialog
      setSearchParams((prev) => { const p = new URLSearchParams(prev); p.delete('reschedule'); return p; }, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const upcoming = appointments.filter((a) => ['scheduled', 'confirmed'].includes(a.status));
  const past     = appointments.filter((a) => ['completed', 'cancelled'].includes(a.status));

  // SUG-PTAPPT-001: Cancel handler — update status in state, no backend call in mock mode
  const handleCancel = (id) => {
    setAppointments((prev) =>
      prev.map((a) => a.id === id ? { ...a, status: 'cancelled' } : a)
    );
    setCancelId(null);
  };

  // SUG-PTAPPT-003: Receipt handler — navigate to receipt page
  const handleReceipt = (appt) => {
    navigate(`/patient/appointments/${appt.id}/receipt`);
  };

  // SUG-PTAPPT-011 / SUG-PTDASH-011: Reschedule handlers
  const handleRescheduleConfirm = () => {
    if (!rescheduleAppt || !rescheduleDate || !rescheduleTime) return;
    setAppointments((prev) =>
      prev.map((a) => a.id === rescheduleAppt.id ? { ...a, date: rescheduleDate, time: rescheduleTime } : a)
    );
    enqueueSnackbar(`Appointment with ${rescheduleAppt.doctor} rescheduled to ${rescheduleDate} at ${rescheduleTime}`, { variant: 'success' });
    setRescheduleAppt(null);
    setHighlightId(null);
  };

  // SUG-PTAPPT-002 + SUG-PTAPPT-004: search resets on tab change; sort applied via useMemo
  const handleTabChange = (_, v) => {
    setTab(v);
    setSearch(''); // Clear search on tab switch (E4 fix)
  };

  const filtered = useMemo(() => {
    const base = (tab === 0 ? upcoming : past).filter((a) =>
      !search ||
      a.doctor.toLowerCase().includes(search.toLowerCase()) ||
      a.specialty.toLowerCase().includes(search.toLowerCase())
    );
    // SUG-PTAPPT-002: Apply sort
    const sorted = [...base].sort((a, b) => {
      if (sortBy === 'doctor') return a.doctor.localeCompare(b.doctor);
      if (sortBy === 'price')  return (a.price ?? 0) - (b.price ?? 0);
      return new Date(a.date) - new Date(b.date); // default: date ascending
    });
    // SUG-PTAPPT-008: Sort direction toggle
    return sortDir === 'desc' ? sorted.reverse() : sorted;
  }, [tab, upcoming, past, search, sortBy, sortDir]);

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

      {/* Tabs — search resets on switch (SUG-PTAPPT-004) */}
      <Tabs value={tab} onChange={handleTabChange} sx={{ borderBottom: '1px solid #D0E8EA', mb: 2 }}>
        <Tab label={`Upcoming (${upcoming.length})`} />
        <Tab label={`Past (${past.length})`} />
      </Tabs>

      {/* Search + sort — sort is now controlled (SUG-PTAPPT-002) */}
      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        <TextField
          size="small" placeholder="Search by doctor or specialty..."
          value={search} onChange={(e) => setSearch(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18 }} /></InputAdornment> }}
          sx={{ width: 280 }}
        />
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Sort by</InputLabel>
          <Select value={sortBy} onChange={(e) => setSortBy(e.target.value)} label="Sort by">
            <MenuItem value="date">Date</MenuItem>
            <MenuItem value="doctor">Doctor</MenuItem>
            <MenuItem value="price">Price</MenuItem>
          </Select>
        </FormControl>
        {/* SUG-PTAPPT-008: Sort direction toggle */}
        <IconButton
          size="small"
          onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
          aria-label={sortDir === 'asc' ? 'Sort ascending — click for descending' : 'Sort descending — click for ascending'}
          sx={{ border: '1px solid #D0E8EA', borderRadius: 1.5 }}
        >
          {sortDir === 'asc' ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />}
        </IconButton>
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
              onCancel={(id) => setCancelId(id)}        // SUG-PTAPPT-001
              onJoinVideo={(id) => navigate(`/video/${id}`)}
              onReceipt={handleReceipt}                 // SUG-PTAPPT-003
              onReschedule={(a) => { setRescheduleAppt(a); setRescheduleDate(a.date); setRescheduleTime(a.time); }} // SUG-PTAPPT-011
              onViewDetails={(a) => setDetailAppt(a)}   // SUG-PTAPPT-012
              highlighted={highlightId === appt.id}
            />
          ))}
        </Stack>
      )}

      {/* SUG-PTAPPT-001: Cancel Confirm Dialog */}
      <Dialog open={Boolean(cancelId)} onClose={() => setCancelId(null)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>Cancel Appointment?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Are you sure you want to cancel this appointment? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setCancelId(null)} sx={{ textTransform: 'none' }}>Keep Appointment</Button>
          <Button
            id="confirm-cancel-btn"
            color="error" variant="contained"
            onClick={() => handleCancel(cancelId)}
            sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
          >
            Yes, Cancel
          </Button>
        </DialogActions>
      </Dialog>

      {/* SUG-PTAPPT-011 / SUG-PTDASH-011: Reschedule Dialog */}
      <Dialog open={Boolean(rescheduleAppt)} onClose={() => { setRescheduleAppt(null); setHighlightId(null); }} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>Reschedule Appointment</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {rescheduleAppt && `Currently ${rescheduleAppt.date} at ${rescheduleAppt.time} with ${rescheduleAppt.doctor}.`}
          </Typography>
          <Stack spacing={2}>
            <TextField
              label="New Date" type="date" fullWidth size="small"
              InputLabelProps={{ shrink: true }}
              value={rescheduleDate}
              onChange={(e) => setRescheduleDate(e.target.value)}
            />
            <TextField
              label="New Time" type="time" fullWidth size="small"
              InputLabelProps={{ shrink: true }}
              value={rescheduleTime}
              onChange={(e) => setRescheduleTime(e.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => { setRescheduleAppt(null); setHighlightId(null); }} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!rescheduleDate || !rescheduleTime}
            onClick={handleRescheduleConfirm}
            sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
          >
            Confirm Reschedule
          </Button>
        </DialogActions>
      </Dialog>

      {/* SUG-PTAPPT-012: Appointment Detail Dialog */}
      <Dialog open={Boolean(detailAppt)} onClose={() => setDetailAppt(null)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
          <InfoOutlinedIcon fontSize="small" /> Appointment Details
        </DialogTitle>
        <DialogContent dividers>
          {detailAppt && (
            <Stack spacing={1.5}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Avatar sx={{ bgcolor: '#006D77', fontWeight: 800 }}>{detailAppt.initials}</Avatar>
                <Box>
                  <Typography fontWeight={700}>{detailAppt.doctor}</Typography>
                  <Typography variant="body2" color="text.secondary">{detailAppt.specialty}</Typography>
                </Box>
              </Stack>
              <Divider />
              <Stack direction="row" justifyContent="space-between"><Typography variant="body2" color="text.secondary">Service</Typography><Typography variant="body2" fontWeight={600}>{detailAppt.service}</Typography></Stack>
              <Stack direction="row" justifyContent="space-between"><Typography variant="body2" color="text.secondary">Date</Typography><Typography variant="body2" fontWeight={600}>{detailAppt.date}</Typography></Stack>
              <Stack direction="row" justifyContent="space-between"><Typography variant="body2" color="text.secondary">Time</Typography><Typography variant="body2" fontWeight={600}>{detailAppt.time}</Typography></Stack>
              <Stack direction="row" justifyContent="space-between"><Typography variant="body2" color="text.secondary">Location</Typography><Typography variant="body2" fontWeight={600}>{detailAppt.type === 'video' ? 'Video Consultation' : detailAppt.clinic}</Typography></Stack>
              <Stack direction="row" justifyContent="space-between"><Typography variant="body2" color="text.secondary">Price</Typography><Typography variant="body2" fontWeight={600}>{detailAppt.price != null ? `£${detailAppt.price}` : 'Price TBD'}</Typography></Stack>
              <Stack direction="row" justifyContent="space-between" alignItems="center"><Typography variant="body2" color="text.secondary">Status</Typography><StatusChip status={detailAppt.status} /></Stack>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDetailAppt(null)} sx={{ textTransform: 'none', fontWeight: 700 }}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
