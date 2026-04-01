import React, { useState, useMemo, useRef, useCallback } from 'react';
import dayjs from 'dayjs';
import {
  Box, Grid, Typography, Card, CardContent, Stack, Button, Chip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  IconButton, TableSortLabel, Tooltip, TablePagination, InputAdornment, TextField,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import { PatientAvatar } from '../../components/shared';
import SearchIcon         from '@mui/icons-material/Search';
import ClearIcon          from '@mui/icons-material/Clear';
import VisibilityIcon     from '@mui/icons-material/Visibility';
import CalendarMonthIcon  from '@mui/icons-material/CalendarMonth';
import PersonSearchIcon   from '@mui/icons-material/PersonSearch';
import { useNavigate }    from 'react-router-dom';

// ─── Mock Patients ─────────────────────────────────────────────────────────────
// Named export so booking wizard can import for pre-fill lookup (SUG-CLPAT-011)
export const MOCK_PATIENTS = [
  { id: 'pt-1', name: 'Alice Thompson',  dob: '1985-03-12', email: 'alice.thompson@gmail.com',       lastVisit: '2026-03-05', totalVisits: 6, nextAppt: '2026-03-20', condition: 'Hypertension', status: 'active'   },
  { id: 'pt-2', name: 'Marcus Chen',     dob: '1990-07-25', email: 'marcus.chen@outlook.com',        lastVisit: '2026-02-18', totalVisits: 3, nextAppt: null,          condition: 'Asthma',       status: 'active'   },
  { id: 'pt-3', name: 'Fatima Al-Hassan',dob: '1978-11-04', email: 'fatima.alhassan@email.com',      lastVisit: '2026-03-01', totalVisits: 1, nextAppt: null,          condition: 'Diabetes',     status: 'new'      },
  { id: 'pt-4', name: 'George Williams', dob: '1962-05-18', email: 'george.williams@btinternet.com', lastVisit: '2026-01-14', totalVisits: 8, nextAppt: '2026-03-25', condition: 'Cholesterol',  status: 'active'   },
  { id: 'pt-5', name: 'Sophie Turner',   dob: '1995-09-30', email: 'sophie.turner@gmail.com',        lastVisit: '2025-12-10', totalVisits: 2, nextAppt: null,          condition: '—',            status: 'inactive' },
];

// ─── Constants ────────────────────────────────────────────────────────────────
const STITCH_BRAND = '#006D77';

const FILTERS = ['all', 'active', 'new', 'inactive'];
const FILTER_LABELS = { all: 'All', active: 'Active', new: 'New', inactive: 'Inactive' };

const COLS = [
  { key: 'name',        label: 'Patient',          sortable: true  },
  { key: 'dob',         label: 'Date of Birth',    sortable: true  },
  { key: 'condition',   label: 'Condition',        sortable: false },
  { key: 'lastVisit',   label: 'Last Visit',       sortable: true  },
  { key: 'nextAppt',    label: 'Next Appointment', sortable: true  },
  { key: 'totalVisits', label: 'Total Visits',     sortable: true  },
  { key: 'status',      label: 'Status',           sortable: true  },
  { key: 'actions',     label: 'Actions',          sortable: false },
];

// ─── Status colours ────────────────────────────────────────────────────────────
const getStatusStyle = (status) => ({
  bgcolor:       status === 'active' ? '#D1FAE5' : status === 'new' ? '#DBEAFE' : '#F3F4F6',
  color:         status === 'active' ? '#065F46' : status === 'new' ? '#1E40AF' : '#6B7280',
  fontWeight:    700,
  textTransform: 'capitalize',
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
// SUG-CLPAT-008: safe single-word name split
const splitName = (fullName = '') => {
  const [first = '', ...rest] = fullName.split(' ');
  return { firstName: first, lastName: rest.join(' ') };
};

// SUG-CLPAT-010: Unicode normalization for diacritic-insensitive search
const normalise = (str = '') =>
  str.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

// Sort comparator (null/undefined → '' so nulls sort to start of asc)
const compareBy = (key, dir) => (a, b) => {
  const av = a[key] ?? '';
  const bv = b[key] ?? '';
  if (av < bv) return dir === 'asc' ? -1 : 1;
  if (av > bv) return dir === 'asc' ?  1 : -1;
  return 0;
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function ClinicianPatients() {
  const navigate = useNavigate();

  // ── State ──────────────────────────────────────────────────────────────────
  const [search,   setSearch]   = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filter,   setFilter]   = useState('all');
  const [sortKey,  setSortKey]  = useState('name');
  const [sortDir,  setSortDir]  = useState('asc');
  // SUG-CLPAT-012: pagination
  const [page,     setPage]     = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  // NEW-CLPAT-022: debounced search — avoids re-filtering on every keystroke
  const debounceTimer = useRef(null);
  const handleSearch = useCallback((val) => {
    setSearch(val); // update input field immediately
    setPage(0);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => setDebouncedSearch(val), 150);
  }, []);

  // ── Sort handler ───────────────────────────────────────────────────────────
  const handleSort = (key) => {
    setSortDir(prev => (sortKey === key && prev === 'asc') ? 'desc' : 'asc');
    setSortKey(key);
    setPage(0); // reset to first page on sort change
  };

  // ── Filter chip counts (always based on full MOCK list) ───────────────────
  const countOf = (status) =>
    status === 'all' ? MOCK_PATIENTS.length : MOCK_PATIENTS.filter(p => p.status === status).length;

  // ── Filtered + sorted + paginated list ────────────────────────────────────
  const filtered = useMemo(() => {
    const q = normalise(debouncedSearch); // NEW-CLPAT-022: use debounced value
    return MOCK_PATIENTS
      .filter(p => {
        const matchSearch =
          !debouncedSearch ||
          normalise(p.name  ?? '').includes(q) ||  // SUG-010: diacritic-safe
          normalise(p.email ?? '').includes(q);     // SUG-002: null guard
        const matchFilter = filter === 'all' || p.status === filter;
        return matchSearch && matchFilter;
      })
      .sort(compareBy(sortKey, sortDir));
  }, [debouncedSearch, filter, sortKey, sortDir]);

  // Paginated slice
  const paginated = rowsPerPage === -1
    ? filtered
    : filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  // Reset to page 0 whenever filter/search changes
  const handleFilterChange = (f) => { setFilter(f); setPage(0); };
  const handleSearchChange = (val) => { handleSearch(val); };

  // NEW-CLPAT-023: Export CSV of filtered patient list
  const exportCSV = () => {
    const header = ['Name', 'DOB', 'Email', 'Condition', 'Last Visit', 'Next Appt', 'Total Visits', 'Status'];
    const rows = filtered.map(p => [
      p.name, p.dob, p.email ?? '', p.condition ?? '',
      p.lastVisit ?? '', p.nextAppt ?? '', p.totalVisits, p.status,
    ]);
    const csv = [header, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `my-patients-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── KPI calculations ───────────────────────────────────────────────────────
  const kpis = [
    { label: 'Total Patients', value: MOCK_PATIENTS.length,                                    color: STITCH_BRAND },
    { label: 'Active',         value: MOCK_PATIENTS.filter(p => p.status === 'active').length, color: '#2DC653'    },
    { label: 'New This Month', value: MOCK_PATIENTS.filter(p => p.status === 'new').length,    color: '#3A86FF'    },
    { label: 'Upcoming Appts', value: MOCK_PATIENTS.filter(p => p.nextAppt).length,            color: '#E29578'    },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Box>
      {/* HEADER */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h2" fontWeight={700}>My Patients</Typography>
          <Typography variant="body2" color="text.secondary">
            {MOCK_PATIENTS.length} patients · {MOCK_PATIENTS.filter(p => p.nextAppt).length} with upcoming appointments
          </Typography>
        </Box>
        {/* NEW-CLPAT-023: Export CSV button */}
        <Tooltip title={`Export ${filtered.length} patient${filtered.length !== 1 ? 's' : ''} to CSV`}>
          <Button
            size="small"
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={exportCSV}
            sx={{ color: STITCH_BRAND, borderColor: STITCH_BRAND, borderRadius: 2, fontWeight: 600,
              '&:hover': { bgcolor: '#E8F8F9' } }}
          >
            Export CSV
          </Button>
        </Tooltip>
      </Stack>

      {/* KPI CARDS — SUG-CLPAT-017: horizontal scroll on mobile */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, overflowX: { xs: 'auto', sm: 'visible' }, pb: { xs: 1, sm: 0 }, flexWrap: { xs: 'nowrap', sm: 'wrap' } }}>
        {kpis.map(({ label, value, color }) => (
          <Box key={label} sx={{ minWidth: { xs: 130, sm: 0 }, flex: { xs: '0 0 auto', sm: '1 1 0' } }}>
            <Card sx={{ borderTop: `4px solid ${color}`, height: '100%' }}>
              <CardContent sx={{ p: 2 }}>
                <Typography variant="h3" fontWeight={800} sx={{ color }}>{value}</Typography>
                <Typography variant="body2" color="text.secondary">{label}</Typography>
              </CardContent>
            </Card>
          </Box>
        ))}
      </Box>

      {/* FILTERS */}
      <Stack direction="row" spacing={2} sx={{ mb: 2 }} alignItems="center" flexWrap="wrap" gap={1}>
        {/* Search field — inline with clear button */}
        <TextField
          size="small"
          value={search}
          onChange={e => handleSearchChange(e.target.value)}
          placeholder="Search by name or email…"
          sx={{ width: 280 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
              </InputAdornment>
            ),
            endAdornment: search ? (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => handleSearchChange('')} edge="end" aria-label="Clear search">
                  <ClearIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </InputAdornment>
            ) : null,
          }}
        />

        {/* Filter chips — SUG-CLPAT-016: keyboard nav (Enter/Space) */}
        <Stack direction="row" spacing={1} flexWrap="wrap">
          {FILTERS.map(f => (
            <Chip
              key={f}
              label={`${FILTER_LABELS[f]} (${countOf(f)})`}
              onClick={() => handleFilterChange(f)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleFilterChange(f); } }}
              tabIndex={0}
              color={filter === f ? 'primary' : 'default'}
              variant={filter === f ? 'filled' : 'outlined'}
              sx={{ cursor: 'pointer', fontWeight: filter === f ? 700 : 400 }}
            />
          ))}
        </Stack>

        {/* Results count badge */}
        <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
          {filtered.length === MOCK_PATIENTS.length
            ? `${filtered.length} patients`
            : `${filtered.length} of ${MOCK_PATIENTS.length} patients`}
        </Typography>
      </Stack>

      {/* TABLE */}
      <TableContainer component={Paper} sx={{ border: '1px solid #D0E8EA', borderRadius: 2 }}>
        <Table size="small">
          <TableHead sx={{ bgcolor: '#F8FCFC' }}>
            <TableRow>
              {COLS.map(({ key, label, sortable }) => (
                <TableCell key={key} sx={{ fontWeight: 700, borderBottom: '2px solid #D0E8EA', py: 1.5 }}>
                  {sortable ? (
                    <TableSortLabel
                      active={sortKey === key}
                      direction={sortKey === key ? sortDir : 'asc'}
                      onClick={() => handleSort(key)}
                    >
                      {label}
                    </TableSortLabel>
                  ) : label}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>

          <TableBody>
            {/* Empty state */}
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 7 }}>
                  <Stack spacing={1.5} alignItems="center">
                    <PersonSearchIcon sx={{ fontSize: 48, color: 'text.disabled' }} />
                    <Typography variant="body1" fontWeight={600} color="text.secondary">
                      No patients found
                    </Typography>
                    <Typography variant="body2" color="text.disabled">
                      {search
                        ? `No results for "${search}". Try a different name or email.`
                        : `No patients match the "${FILTER_LABELS[filter]}" filter.`}
                    </Typography>
                    {(search || filter !== 'all') && (
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => { handleSearchChange(''); handleFilterChange('all'); }}
                        sx={{ mt: 1, color: STITCH_BRAND, borderColor: STITCH_BRAND, borderRadius: 2 }}
                      >
                        Clear filters
                      </Button>
                    )}
                  </Stack>
                </TableCell>
              </TableRow>
            ) : (
              paginated.map(patient => {
                const { firstName, lastName } = splitName(patient.name); // SUG-008
                // NEW-CLPAT-019: overdue warning — last visit > 90 days
                const daysSinceVisit = patient.lastVisit ? dayjs().diff(dayjs(patient.lastVisit), 'day') : null;
                const isOverdue = daysSinceVisit !== null && daysSinceVisit > 90 && patient.status !== 'inactive';
                return (
                  <TableRow
                    key={patient.id}
                    hover
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/patients/${patient.id}`); }}
                    sx={{ '&:last-child td': { borderBottom: 0 }, cursor: 'pointer' }}
                  >
                    {/* Patient */}
                    <TableCell>
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <PatientAvatar firstName={firstName} lastName={lastName} email={patient.email} size="sm" />
                        <Box>
                          <Typography variant="body2" fontWeight={600}>{patient.name}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {patient.email ?? '—'}
                          </Typography>
                        </Box>
                      </Stack>
                    </TableCell>

                    {/* DOB — NEW-CLPAT-021: show computed age badge */}
                    <TableCell>
                      <Stack direction="row" alignItems="center" spacing={0.75}>
                        <Typography variant="body2">
                          {patient.dob ? dayjs(patient.dob).format('DD/MM/YYYY') : '—'}
                        </Typography>
                        {patient.dob && (
                          <Chip
                            label={`${dayjs().diff(dayjs(patient.dob), 'year')}y`}
                            size="small"
                            sx={{ bgcolor: '#F1F5F9', color: '#475569', fontWeight: 600, fontSize: '0.6rem', height: 16, px: 0}}
                          />
                        )}
                      </Stack>
                    </TableCell>

                    {/* Condition */}
                    <TableCell>
                      {patient.condition && patient.condition !== '—'
                        ? <Chip label={patient.condition} size="small" color="warning" variant="outlined" />
                        : <Typography variant="body2" color="text.secondary">—</Typography>}
                    </TableCell>

                    {/* Last Visit — NEW-CLPAT-018: relative "N days ago" tooltip */}
                    <TableCell>
                      <Tooltip title={patient.lastVisit ? `${daysSinceVisit} days ago` : 'No visit recorded'} placement="top">
                        <Typography variant="body2" sx={{ cursor: 'help' }}>
                          {patient.lastVisit ? dayjs(patient.lastVisit).format('DD/MM/YYYY') : '—'}
                        </Typography>
                      </Tooltip>
                    </TableCell>

                    {/* Next Appointment */}
                    <TableCell>
                      {patient.nextAppt
                        ? (
                          <Stack direction="row" alignItems="center" spacing={0.5}>
                            <CalendarMonthIcon sx={{ fontSize: 14, color: '#2DC653' }} />
                            <Typography variant="body2" sx={{ color: '#2DC653', fontWeight: 600 }}>
                              {dayjs(patient.nextAppt).format('DD/MM/YYYY')}
                            </Typography>
                          </Stack>
                        )
                        : <Typography variant="body2" color="text.secondary">None</Typography>}
                    </TableCell>

                    {/* Total Visits */}
                    <TableCell>
                      <Chip
                        label={patient.totalVisits}
                        size="small"
                        sx={{ bgcolor: '#E8F8F9', fontWeight: 700, color: STITCH_BRAND }}
                      />
                    </TableCell>

                    {/* Status — NEW-CLPAT-019: overdue warning badge */}
                    <TableCell>
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <Chip label={patient.status} size="small" sx={getStatusStyle(patient.status)} />
                        {isOverdue && (
                          <Tooltip title={`Last visit ${daysSinceVisit} days ago — consider follow-up`}>
                            <Chip label="Overdue" size="small" sx={{ bgcolor: '#FFF3CD', color: '#856404', fontWeight: 700, fontSize: '0.65rem', height: 18 }} />
                          </Tooltip>
                        )}
                      </Stack>
                    </TableCell>

                    {/* Actions */}
                    <TableCell>
                      <Stack direction="row" spacing={0.5}>
                        <Tooltip title={`View ${patient.name}'s profile`} placement="top">
                          <IconButton
                            size="small"
                            onClick={() => navigate(`/patients/${patient.id}`)}
                            aria-label={`View ${patient.name}'s profile`}
                            sx={{ color: STITCH_BRAND, '&:hover': { bgcolor: '#E8F8F9' } }}
                          >
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>

                        {/* SUG-CLPAT-003: pass patient context to booking wizard */}
                        <Tooltip title={`Book appointment for ${patient.name}`} placement="top">
                          <IconButton
                            size="small"
                            onClick={() => navigate('/appointments/book', {
                              state: { patientId: patient.id, patientName: patient.name },
                            })}
                            aria-label={`Book appointment for ${patient.name}`}
                            sx={{ color: '#3A86FF', '&:hover': { bgcolor: '#EFF6FF' } }}
                          >
                            <CalendarMonthIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        {/* SUG-CLPAT-012: Pagination */}
        {filtered.length > 0 && (
          <TablePagination
            rowsPerPageOptions={[5, 10, 25, { label: 'All', value: -1 }]}
            component="div"
            count={filtered.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={(_, newPage) => setPage(newPage)}
            onRowsPerPageChange={e => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
            sx={{ borderTop: '1px solid #E8EAED' }}
          />
        )}
      </TableContainer>
    </Box>
  );
}
