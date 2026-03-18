import React, { useState } from 'react';
import {
  Box, Grid, Typography, Card, CardContent, Stack, Button, Chip, Avatar,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  IconButton, TextField, InputAdornment,
} from '@mui/material';
import { PatientAvatar, SearchField, StatusChip } from '../../components/shared';
import SearchIcon from '@mui/icons-material/Search';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import { useNavigate } from 'react-router-dom';

const PATIENTS = [
  { id: 1, name: 'Emma Wilson',  dob: '1990-04-12', email: 'emma@email.com',  lastVisit: '2026-03-05', totalVisits: 6, nextAppt: '2026-03-20', condition: 'Hypertension', status: 'active' },
  { id: 2, name: 'Omar Hassan',  dob: '1982-11-28', email: 'omar@email.com',  lastVisit: '2026-02-18', totalVisits: 3, nextAppt: null,          condition: 'Arrhythmia',  status: 'active' },
  { id: 3, name: 'Lily Chen',    dob: '2001-06-15', email: 'lily@email.com',  lastVisit: '2026-03-01', totalVisits: 1, nextAppt: null,          condition: '—',           status: 'new'    },
  { id: 4, name: 'James Brown',  dob: '1975-03-22', email: 'james@mail.com',  lastVisit: '2026-01-14', totalVisits: 8, nextAppt: '2026-03-25', condition: 'Cholesterol', status: 'active' },
  { id: 5, name: 'Sophie Müller',dob: '1988-09-01', email: 'sophie@mail.com', lastVisit: '2025-12-10', totalVisits: 2, nextAppt: null,          condition: '—',           status: 'inactive' },
];

export default function ClinicianPatients() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  const filtered = PATIENTS.filter((p) => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.email.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || p.status === filter;
    return matchSearch && matchFilter;
  });

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h2" fontWeight={700}>My Patients</Typography>
          <Typography variant="body2" color="text.secondary">{PATIENTS.length} patients · {PATIENTS.filter((p) => p.nextAppt).length} with upcoming appointments</Typography>
        </Box>
      </Stack>

      {/* Quick stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'Total Patients',  value: PATIENTS.length,                                        color: '#006D77' },
          { label: 'Active',          value: PATIENTS.filter((p) => p.status === 'active').length,   color: '#2DC653' },
          { label: 'New This Month',  value: PATIENTS.filter((p) => p.status === 'new').length,      color: '#3A86FF' },
          { label: 'Upcoming Appts',  value: PATIENTS.filter((p) => p.nextAppt).length,              color: '#E29578' },
        ].map(({ label, value, color }) => (
          <Grid item xs={6} sm={3} key={label}>
            <Card sx={{ borderTop: `4px solid ${color}` }}>
              <CardContent sx={{ p: 2 }}>
                <Typography variant="h3" fontWeight={800} sx={{ color }}>{value}</Typography>
                <Typography variant="body2" color="text.secondary">{label}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Filters */}
      <Stack direction="row" spacing={2} sx={{ mb: 2 }} alignItems="center">
        <SearchField value={search} onChange={setSearch} placeholder="Search by name or email..." sx={{ width: 280 }} />
        <Stack direction="row" spacing={1}>
          {['all', 'active', 'new', 'inactive'].map((f) => (
            <Chip key={f} label={f.charAt(0).toUpperCase() + f.slice(1)} onClick={() => setFilter(f)} color={filter === f ? 'primary' : 'default'} variant={filter === f ? 'filled' : 'outlined'} sx={{ cursor: 'pointer' }} />
          ))}
        </Stack>
      </Stack>

      {/* Table */}
      <TableContainer component={Paper} sx={{ border: '1px solid #D0E8EA' }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Patient</TableCell>
              <TableCell>Date of Birth</TableCell>
              <TableCell>Condition</TableCell>
              <TableCell>Last Visit</TableCell>
              <TableCell>Next Appointment</TableCell>
              <TableCell>Total Visits</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map((patient) => (
              <TableRow key={patient.id} hover>
                <TableCell>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <PatientAvatar firstName={patient.name.split(' ')[0]} lastName={patient.name.split(' ')[1]} email={patient.email} size="sm" />
                    <Box>
                      <Typography variant="body2" fontWeight={600}>{patient.name}</Typography>
                      <Typography variant="caption" color="text.secondary">{patient.email}</Typography>
                    </Box>
                  </Stack>
                </TableCell>
                <TableCell><Typography variant="body2">{patient.dob}</Typography></TableCell>
                <TableCell>
                  {patient.condition !== '—'
                    ? <Chip label={patient.condition} size="small" color="warning" variant="outlined" />
                    : <Typography variant="body2" color="text.secondary">—</Typography>}
                </TableCell>
                <TableCell><Typography variant="body2">{patient.lastVisit}</Typography></TableCell>
                <TableCell>
                  {patient.nextAppt
                    ? <Stack direction="row" alignItems="center" spacing={0.5}><CalendarMonthIcon sx={{ fontSize: 14, color: '#2DC653' }} /><Typography variant="body2" sx={{ color: '#2DC653', fontWeight: 600 }}>{patient.nextAppt}</Typography></Stack>
                    : <Typography variant="body2" color="text.secondary">None</Typography>}
                </TableCell>
                <TableCell>
                  <Chip label={patient.totalVisits} size="small" sx={{ bgcolor: '#E8F8F9', fontWeight: 700 }} />
                </TableCell>
                <TableCell>
                  <Chip
                    label={patient.status}
                    size="small"
                    sx={{
                      bgcolor: patient.status === 'active' ? '#D1FAE5' : patient.status === 'new' ? '#DBEAFE' : '#F3F4F6',
                      color:   patient.status === 'active' ? '#065F46' : patient.status === 'new' ? '#1E40AF' : '#6B7280',
                      fontWeight: 700, textTransform: 'capitalize',
                    }}
                  />
                </TableCell>
                <TableCell>
                  <Stack direction="row" spacing={0.5}>
                    <IconButton size="small" onClick={() => navigate(`/patients/${patient.id}`)} aria-label={`View ${patient.name}'s details`}>
                      <VisibilityIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={() => navigate('/appointments/book')} aria-label={`Book appointment for ${patient.name}`}>
                      <CalendarMonthIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
