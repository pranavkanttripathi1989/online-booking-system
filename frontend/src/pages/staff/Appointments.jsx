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
  const [fromDate, setFromDate] = useState('');   // SUG-STFAPPT-001
  const [toDate, setToDate] = useState('');       // SUG-STFAPPT-001
  const [selected, setSelected] = useState([]);
  const [bookOpen, setBookOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [editTarget, setEditTarget] = useState(null); // SUG-STFAPPT-003

  // SUG-STFAPPT-002: Book form controlled state
  const [bookForm, setBookForm] = useState({ patient: '', clinician: '', date: '', time: '', service: '', reason: '', clinic: '', room: '', duration: 30 });
  const setBookField = (k, v) => setBookForm(f => ({ ...f, [k]: v }));
  const resetBook = () => { setBookForm({ patient: '', clinician: '', date: '', time: '', service: '', reason: '', clinic: '', room: '', duration: 30 }); setEditTarget(null); };

  const filtered = appointments.filter((a) => {
    const matchSearch = !search || a.patient.name.toLowerCase().includes(search.toLowerCase()) || a.clinician.name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || a.status === statusFilter;
    // SUG-STFAPPT-001: Date range filter
    const apptDate = a.dateTime.split(' ')[0]
    const matchFrom = !fromDate || apptDate >= fromDate;
    const matchTo   = !toDate   || apptDate <= toDate;
    return matchSearch && matchStatus && matchFrom && matchTo;
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

  // SUG-STFAPPT-004: Bulk cancel handler
  const handleBulkCancel = () => {
    setAppointments(prev => prev.map(a => selected.includes(a.id) ? { ...a, status: 'cancelled' } : a));
    setSelected([]);
  };

  // SUG-STFAPPT-005: CSV export
  const handleExportCSV = (rows) => {
    const cols = ['ID', 'Date', 'Time', 'Patient', 'Clinician', 'Service', 'Status', 'Price'];
    const data = rows.map(a => [a.id, a.dateTime.split(' ')[0], a.dateTime.split(' ')[1], a.patient.name, a.clinician.name, a.service, a.status, `£${a.price}`]);
    const csv = [cols, ...data].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href = url; link.download = 'appointments.csv'; link.click();
    URL.revokeObjectURL(url);
  };

  // SUG-STFAPPT-002: Book (or edit) appointment submit
  const handleBookSubmit = () => {
    if (editTarget) {
      // Edit mode — update existing
      setAppointments(prev => prev.map(a => a.id === editTarget.id ? {
        ...a,
        dateTime: bookForm.date && bookForm.time ? `${bookForm.date} ${bookForm.time}` : a.dateTime,
        patient: { ...a.patient, name: bookForm.patient || a.patient.name },
        clinician: { ...a.clinician, name: bookForm.clinician || a.clinician.name },
        service: bookForm.service || a.service,
        duration: bookForm.duration,
      } : a));
    } else {
      // Create mode
      const newAppt = {
        id: Date.now(),
        dateTime: bookForm.date && bookForm.time ? `${bookForm.date} ${bookForm.time}` : '—',
        patient: { name: bookForm.patient || 'New Patient', email: '', avatar: (bookForm.patient || 'NP').split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase() },
        clinician: { name: bookForm.clinician || 'TBD', specialty: '', avatar: 'TBD' },
        clinic: bookForm.clinic || '—', room: bookForm.room || '—',
        duration: bookForm.duration, service: bookForm.service || '—', price: 0, status: 'scheduled',
      };
      setAppointments(prev => [...prev, newAppt]);
    }
    resetBook();
    setBookOpen(false);
  };

  // SUG-STFAPPT-003: Open edit dialog pre-filled
  const handleEdit = (appt) => {
    setEditTarget(appt);
    setBookForm({
      patient: appt.patient.name, clinician: appt.clinician.name,
      date: appt.dateTime.split(' ')[0], time: appt.dateTime.split(' ')[1],
      service: appt.service, reason: '', clinic: appt.clinic, room: appt.room,
      duration: appt.duration,
    });
    setBookOpen(true);
  };

  // SUG-STFAPPT-009: Reset all filters
  const hasFilters = search || statusFilter !== 'all' || fromDate || toDate;
  const resetFilters = () => { setSearch(''); setStatusFilter('all'); setFromDate(''); setToDate(''); };

  return (
    <Box>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Typography variant="h2" fontWeight={700}>Appointments</Typography>
          {/* SUG-STFAPPT-007: Show active (non-cancelled) count */}
          <Chip label={`${appointments.filter(a => a.status !== 'cancelled').length} active · ${appointments.length} total`} color="primary" />
        </Stack>
        <Stack direction="row" spacing={1.5}>
          {/* SUG-STFAPPT-005: Header Export CSV wired */}
          <Button variant="outlined" startIcon={<DownloadIcon />} size="small" onClick={() => handleExportCSV(filtered)}>Export CSV</Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => { resetBook(); setBookOpen(true); }}>
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
            {/* SUG-STFAPPT-001: Date pickers wired to state */}
            <Grid item xs={6} sm={2}>
              <TextField fullWidth size="small" type="date" label="From" InputLabelProps={{ shrink: true }} value={fromDate} onChange={e => setFromDate(e.target.value)} />
            </Grid>
            <Grid item xs={6} sm={2}>
              <TextField fullWidth size="small" type="date" label="To" InputLabelProps={{ shrink: true }} value={toDate} onChange={e => setToDate(e.target.value)} />
            </Grid>
            {/* SUG-STFAPPT-009: Reset filters button */}
            {hasFilters && (
              <Grid item xs={6} sm={2}>
                <Button size="small" variant="text" onClick={resetFilters}>Clear Filters</Button>
              </Grid>
            )}
          </Grid>
          {(statusFilter !== 'all' || fromDate || toDate) && (
            <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
              {statusFilter !== 'all' && <Chip label={`Status: ${statusFilter}`} size="small" onDelete={() => setStatusFilter('all')} />}
              {fromDate && <Chip label={`From: ${fromDate}`} size="small" onDelete={() => setFromDate('')} />}
              {toDate   && <Chip label={`To: ${toDate}`}   size="small" onDelete={() => setToDate('')} />}
            </Stack>
          )}
        </CardContent>
      </Card>

      {/* Bulk actions */}
      {selected.length > 0 && (
        <Paper sx={{ p: 1.5, mb: 2, bgcolor: '#E8F8F9', border: '1px solid #83C5BE', display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="body2" fontWeight={700}>{selected.length} selected</Typography>
          {/* SUG-STFAPPT-004: Bulk cancel wired */}
          <Button size="small" color="error" variant="outlined" onClick={handleBulkCancel}>Cancel Selected</Button>
          {/* SUG-STFAPPT-005: Bulk export wired */}
          <Button size="small" variant="outlined" startIcon={<DownloadIcon />} onClick={() => handleExportCSV(appointments.filter(a => selected.includes(a.id)))}>Export</Button>
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
            {/* SUG-STFAPPT-006: Empty state row */}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 6, color: 'text.secondary', fontStyle: 'italic' }}>
                  No appointments match your current filters
                </TableCell>
              </TableRow>
            )}
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
                    {/* SUG-STFAPPT-003: Edit icon pre-fills dialog */}
                    <IconButton size="small" onClick={() => handleEdit(appt)} aria-label={`Edit appointment for ${appt.patient.name}`}><EditIcon fontSize="small" /></IconButton>
                    {appt.status !== 'cancelled' && (
                      <IconButton size="small" color="error" onClick={() => setCancelTarget(appt.id)} aria-label={`Cancel appointment for ${appt.patient.name}`}>
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

      {/* SUG-STFAPPT-002/003: Book / Edit Appointment Dialog with controlled state */}
      <Dialog open={bookOpen} onClose={() => { setBookOpen(false); resetBook(); }} maxWidth="md" fullWidth>
        <DialogTitle fontWeight={700}>{editTarget ? 'Edit Appointment' : 'Book Appointment'}</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ pt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Patient (search by name/email)" size="small" value={bookForm.patient} onChange={e => setBookField('patient', e.target.value)} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Clinician" size="small" value={bookForm.clinician} onChange={e => setBookField('clinician', e.target.value)} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Clinic</InputLabel>
                <Select label="Clinic" value={bookForm.clinic} onChange={e => setBookField('clinic', e.target.value)}>
                  <MenuItem value="City Heart Clinic">City Heart Clinic</MenuItem>
                  <MenuItem value="Central Medical Centre">Central Medical Centre</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Room</InputLabel>
                <Select label="Room" value={bookForm.room} onChange={e => setBookField('room', e.target.value)}>
                  <MenuItem value="1A">Room 1A</MenuItem>
                  <MenuItem value="2B">Room 2B</MenuItem>
                  <MenuItem value="3A">Room 3A</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6} sm={3}>
              <TextField fullWidth label="Date" type="date" size="small" InputLabelProps={{ shrink: true }} value={bookForm.date} onChange={e => setBookField('date', e.target.value)} />
            </Grid>
            <Grid item xs={6} sm={3}>
              <TextField fullWidth label="Time" type="time" size="small" InputLabelProps={{ shrink: true }} value={bookForm.time} onChange={e => setBookField('time', e.target.value)} />
            </Grid>
            <Grid item xs={6} sm={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Duration</InputLabel>
                <Select label="Duration" value={bookForm.duration} onChange={e => setBookField('duration', e.target.value)}>
                  {[15, 30, 45, 60].map((d) => <MenuItem key={d} value={d}>{d} min</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6} sm={3}>
              <TextField fullWidth label="Service" size="small" value={bookForm.service} onChange={e => setBookField('service', e.target.value)} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth multiline rows={2} label="Reason for Visit" size="small" value={bookForm.reason} onChange={e => setBookField('reason', e.target.value)} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => { setBookOpen(false); resetBook(); }}>Cancel</Button>
          <Button variant="contained" onClick={handleBookSubmit}>{editTarget ? 'Save Changes' : 'Book Appointment'}</Button>
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
