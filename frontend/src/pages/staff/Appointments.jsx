import React, { useState } from 'react';
import {
  Box, Grid, Typography, Card, CardContent, Stack, Button, Chip,
  Avatar, Divider, Tab, Tabs, Paper, Switch, FormControlLabel,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Checkbox, IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Select, MenuItem, FormControl, InputLabel, Autocomplete,
} from '@mui/material';
import { StatusChip, SearchField, ConfirmDialog, PatientAvatar } from '../../components/shared';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import CancelIcon from '@mui/icons-material/Cancel';
import FilterListIcon from '@mui/icons-material/FilterList';
import DownloadIcon from '@mui/icons-material/Download';
import TableRowsIcon from '@mui/icons-material/TableRows';
import CalendarViewMonthIcon from '@mui/icons-material/CalendarViewMonth';

const MOCK_APPOINTMENTS = [
  { id: 1, dateTime: '2026-03-20 10:00', patient: { name: 'Emma Wilson', email: 'emma@email.com', avatar: 'EW' }, clinician: { name: 'Dr. Sarah Johnson', specialty: 'Cardiology', avatar: 'SJ' }, clinic: 'City Heart Clinic', room: '3A', duration: 30, service: 'Cardiology Consultation', price: 85,  status: 'confirmed' },
  { id: 2, dateTime: '2026-03-20 11:30', patient: { name: 'James Brown',  email: 'james@mail.com', avatar: 'JB' }, clinician: { name: 'Dr. Marcus Osei', specialty: 'Neurology', avatar: 'MO' },    clinic: 'Central Medical',   room: '1B', duration: 45, service: 'Neurology Assessment',  price: 120, status: 'scheduled' },
  { id: 3, dateTime: '2026-03-20 14:00', patient: { name: 'Lily Chen',    email: 'lily@email.com',  avatar: 'LC' }, clinician: { name: 'Dr. Priya Sharma', specialty: 'Paediatrics', avatar: 'PS' },  clinic: 'Family Health Hub', room: '2C', duration: 30, service: 'Paediatrics Check-up', price: 75,  status: 'completed' },
  { id: 4, dateTime: '2026-03-21 09:00', patient: { name: 'Omar Hassan',  email: 'omar@email.com',  avatar: 'OH' }, clinician: { name: 'Dr. Sarah Johnson', specialty: 'Cardiology', avatar: 'SJ' },  clinic: 'City Heart Clinic', room: '3A', duration: 30, service: 'ECG Recording',         price: 120, status: 'cancelled' },
];

export default function StaffAppointments() {
  const [appointments, setAppointments] = useState(MOCK_APPOINTMENTS);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selected, setSelected] = useState([]);
  const [bookOpen, setBookOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState(null);

  const filtered = appointments.filter((a) => {
    const matchSearch = !search || a.patient.name.toLowerCase().includes(search.toLowerCase()) || a.clinician.name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || a.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleSelectAll = (e) => {
    setSelected(e.target.checked ? filtered.map((a) => a.id) : []);
  };

  const handleSelect = (id) => {
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const handleCancel = (id) => {
    setAppointments((prev) => prev.map((a) => a.id === id ? { ...a, status: 'cancelled' } : a));
    setCancelTarget(null);
  };

  return (
    <Box>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Typography variant="h2" fontWeight={700}>Appointments</Typography>
          <Chip label={`${appointments.length} total`} color="primary" />
        </Stack>
        <Stack direction="row" spacing={1.5}>
          <Button variant="outlined" startIcon={<DownloadIcon />} size="small">Export CSV</Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setBookOpen(true)}>
            Book Appointment
          </Button>
        </Stack>
      </Stack>

      {/* Filter Bar */}
      <Card sx={{ mb: 2 }}>
        <CardContent sx={{ p: 2 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={4}>
              <SearchField value={search} onChange={setSearch} placeholder="Search patient or clinician..." sx={{ width: '100%' }} />
            </Grid>
            <Grid item xs={6} sm={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} label="Status">
                  {['all', 'scheduled', 'confirmed', 'completed', 'cancelled'].map((s) => (
                    <MenuItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6} sm={2}>
              <TextField fullWidth size="small" type="date" label="From" InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={6} sm={2}>
              <TextField fullWidth size="small" type="date" label="To" InputLabelProps={{ shrink: true }} />
            </Grid>
          </Grid>
          {statusFilter !== 'all' && (
            <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
              <Chip label={`Status: ${statusFilter}`} size="small" onDelete={() => setStatusFilter('all')} />
            </Stack>
          )}
        </CardContent>
      </Card>

      {/* Bulk actions */}
      {selected.length > 0 && (
        <Paper sx={{ p: 1.5, mb: 2, bgcolor: '#E8F8F9', border: '1px solid #83C5BE', display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="body2" fontWeight={700}>{selected.length} selected</Typography>
          <Button size="small" color="error" variant="outlined">Cancel Selected</Button>
          <Button size="small" variant="outlined" startIcon={<DownloadIcon />}>Export</Button>
        </Paper>
      )}

      {/* Table */}
      <TableContainer component={Paper} sx={{ border: '1px solid #D0E8EA' }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  indeterminate={selected.length > 0 && selected.length < filtered.length}
                  checked={filtered.length > 0 && selected.length === filtered.length}
                  onChange={handleSelectAll}
                />
              </TableCell>
              <TableCell>Date & Time</TableCell>
              <TableCell>Patient</TableCell>
              <TableCell>Clinician</TableCell>
              <TableCell>Clinic & Room</TableCell>
              <TableCell>Duration</TableCell>
              <TableCell>Service & Price</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map((appt) => (
              <TableRow key={appt.id} hover selected={selected.includes(appt.id)}>
                <TableCell padding="checkbox">
                  <Checkbox checked={selected.includes(appt.id)} onChange={() => handleSelect(appt.id)} />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight={700}>{appt.dateTime.split(' ')[0]}</Typography>
                  <Typography variant="caption" color="text.secondary">{appt.dateTime.split(' ')[1]}</Typography>
                </TableCell>
                <TableCell>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <PatientAvatar firstName={appt.patient.name.split(' ')[0]} lastName={appt.patient.name.split(' ')[1]} email={appt.patient.email} size="sm" />
                    <Box>
                      <Typography variant="body2" fontWeight={600}>{appt.patient.name}</Typography>
                      <Typography variant="caption" color="text.secondary">{appt.patient.email}</Typography>
                    </Box>
                  </Stack>
                </TableCell>
                <TableCell>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Avatar sx={{ width: 28, height: 28, bgcolor: '#006D77', fontSize: '0.7rem', fontWeight: 700 }}>
                      {appt.clinician.avatar}
                    </Avatar>
                    <Box>
                      <Typography variant="body2" fontWeight={600}>{appt.clinician.name}</Typography>
                      <Chip label={appt.clinician.specialty} size="small" variant="outlined" color="primary" />
                    </Box>
                  </Stack>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">{appt.clinic}</Typography>
                  <Chip label={`Room ${appt.room}`} size="small" sx={{ bgcolor: '#F0F7F8', mt: 0.25 }} />
                </TableCell>
                <TableCell>
                  <Chip label={`${appt.duration} min`} size="small" variant="outlined" />
                </TableCell>
                <TableCell>
                  <Typography variant="body2">{appt.service}</Typography>
                  <Typography variant="caption" color="primary" fontWeight={700}>£{appt.price}</Typography>
                </TableCell>
                <TableCell><StatusChip status={appt.status} /></TableCell>
                <TableCell>
                  <Stack direction="row" spacing={0.5}>
                    <IconButton size="small"><EditIcon fontSize="small" /></IconButton>
                    {appt.status !== 'cancelled' && (
                      <IconButton size="small" color="error" onClick={() => setCancelTarget(appt.id)}>
                        <CancelIcon fontSize="small" />
                      </IconButton>
                    )}
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Book Appointment Modal */}
      <Dialog open={bookOpen} onClose={() => setBookOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle fontWeight={700}>Book Appointment</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ pt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Patient (search by name/email)" size="small" />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Clinician" size="small" />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Clinic</InputLabel>
                <Select label="Clinic" defaultValue="">
                  <MenuItem value="city">City Heart Clinic</MenuItem>
                  <MenuItem value="central">Central Medical Centre</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Room</InputLabel>
                <Select label="Room" defaultValue="">
                  <MenuItem value="room1a">Room 1A</MenuItem>
                  <MenuItem value="room2b">Room 2B</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6} sm={3}>
              <TextField fullWidth label="Date" type="date" size="small" InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={6} sm={3}>
              <TextField fullWidth label="Time" type="time" size="small" InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={6} sm={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Duration</InputLabel>
                <Select label="Duration" defaultValue={30}>
                  {[15, 30, 45, 60].map((d) => <MenuItem key={d} value={d}>{d} min</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6} sm={3}>
              <TextField fullWidth label="Service" size="small" />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth multiline rows={2} label="Reason for Visit" size="small" />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setBookOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => setBookOpen(false)}>Book Appointment</Button>
        </DialogActions>
      </Dialog>

      {/* Cancel Confirm */}
      <ConfirmDialog
        open={Boolean(cancelTarget)}
        onClose={() => setCancelTarget(null)}
        onConfirm={() => handleCancel(cancelTarget)}
        title="Cancel Appointment"
        message="Are you sure you want to cancel this appointment? The patient will be notified."
        confirmLabel="Cancel Appointment"
        confirmColor="error"
      />
    </Box>
  );
}
