import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@apollo/client';
import { useSnackbar } from 'notistack';
import {
  Box, Grid, Typography, Card, CardContent, Stack, Button, Chip,
  IconButton, Divider, Tooltip, Alert,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import VisibilityIcon from '@mui/icons-material/Visibility';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import PhoneIcon from '@mui/icons-material/Phone';
import PersonIcon from '@mui/icons-material/Person';
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom';
import StarIcon from '@mui/icons-material/Star';
import StarOutlineIcon from '@mui/icons-material/StarOutline';
import { SearchField } from '../../../components/shared';
import ConfirmDialog from '../../../components/ConfirmDialog/ConfirmDialog';
import ErrorBoundary from '../../../components/ErrorBoundary';
import { CLINICS_QUERY, ROOMS_QUERY } from '../../../graphql/queries';
import { SET_HEAD_OFFICE_CLINIC_MUTATION } from '../../../graphql/mutations';

const CLINICS_DATA = [
  { id: '1', name: 'City Heart Clinic',        address: '14 Harley Street, London, W1G 9PJ',  phone: '+44 20 7946 0001', manager: 'Dr. Sarah Johnson', clinicians: 4, rooms: 5, status: 'active',   specialties: ['Cardiology','General Medicine'],               todayAppts: 24, monthlyAppts: 312 },
  { id: '2', name: 'Central Medical Centre',   address: '22 Brook Street, London, W1K 5DF',   phone: '+44 20 7946 0022', manager: 'Dr. Marcus Osei',   clinicians: 6, rooms: 8, status: 'active',   specialties: ['Neurology','Orthopaedics','Cardiology'],       todayAppts: 31, monthlyAppts: 428 },
  { id: '3', name: 'Family Health Hub',        address: '8 Baker Street, London, NW1 6XE',    phone: '+44 20 7946 0033', manager: 'Dr. Priya Sharma',  clinicians: 3, rooms: 4, status: 'active',   specialties: ['Paediatrics','Family Medicine','Gynaecology'], todayAppts: 18, monthlyAppts: 214 },
  { id: '4', name: 'Westside Physio & Sports', address: "5 King's Road, London, SW3 4ND",     phone: '+44 20 7946 0044', manager: 'James Peters',       clinicians: 2, rooms: 3, status: 'inactive', specialties: ['Physiotherapy','Sports Medicine'],             todayAppts: 0,  monthlyAppts: 0   },
];

// SUG-CLI-009 — rooms across ALL clinics (previously only 2 of 4 clinics had rooms represented)
const ROOMS_DATA = [
  { id: '1', name: 'Room 1A', clinic: 'City Heart Clinic',        capacity: 1, equipment: ['ECG', 'Blood pressure monitor'], status: 'in-use'   },
  { id: '2', name: 'Room 2B', clinic: 'City Heart Clinic',        capacity: 1, equipment: ['Ultrasound'],                   status: 'available' },
  { id: '3', name: 'Room 3C', clinic: 'City Heart Clinic',        capacity: 1, equipment: ['General'],                      status: 'available' },
  { id: '4', name: 'Suite A', clinic: 'Central Medical Centre',   capacity: 2, equipment: ['MRI lobby access', 'EEG'],      status: 'in-use'   },
  { id: '5', name: 'Room 1',  clinic: 'Central Medical Centre',   capacity: 1, equipment: ['General'],                      status: 'available' },
  { id: '6', name: 'Room 1',  clinic: 'Family Health Hub',        capacity: 1, equipment: ['Paediatric scales'],            status: 'available' },
  { id: '7', name: 'Room 2',  clinic: 'Family Health Hub',        capacity: 1, equipment: ['General'],                      status: 'in-use'   },
  { id: '8', name: 'Gym 1',   clinic: 'Westside Physio & Sports', capacity: 4, equipment: ['Treadmill', 'Resistance bands'], status: 'available' },
];

// SUG-CLI-008 / SUG-CLI-005 (older file) — persist deletes to localStorage so a deleted
// clinic doesn't reappear on page refresh (there is no real backend to call a DELETE
// mutation against, so localStorage is the closest available "persistence" layer).
const DELETED_CLINICS_KEY = 'medibook_deleted_clinic_ids';
const getDeletedClinicIds = () => {
  try { return JSON.parse(localStorage.getItem(DELETED_CLINICS_KEY)) ?? []; } catch { return []; }
};

// Backend/schema.prisma's Clinics/Rooms models don't yet carry clinician
// counts, today's/monthly appointment volume, or a manager/specialties list
// (those depend on Phase 5 Clinicians and Phase 7 Appointments existing) —
// real-backend rows render with honest placeholders for those fields rather
// than fabricated numbers. See context/phase4-catalog-modules-implementation-plan.md.
const toCardClinic = (c) => ({
  id: c.id,
  name: c.name,
  address: [c.address, c.city, c.postcode].filter(Boolean).join(', '),
  phone: c.phone,
  manager: '—',
  clinicians: 0,
  rooms: 0,
  status: c.is_active ? 'active' : 'inactive',
  specialties: [],
  todayAppts: 0,
  monthlyAppts: 0,
  // REQ041 -- undefined for a mock-data row (CLINICS_DATA has no such
  // field), never rendered as a false "not head office" for sample data.
  is_primary: c.is_primary,
});

const toCardRoom = (r) => ({
  id: r.id,
  name: r.name,
  clinic: r.clinic?.name ?? '—',
  capacity: r.capacity ?? 1,
  equipment: [],
  status: r.is_active ? 'available' : 'inactive',
});

function ManagerClinicsInner() {
  const navigate = useNavigate();
  const [search, setSearch]           = useState('');
  const [tab, setTab]                 = useState(0);
  const [deleteId, setDeleteId]       = useState(null);

  const { enqueueSnackbar } = useSnackbar();
  const { data: clinicsData, loading: clinicsLoading, error: clinicsError, refetch } = useQuery(CLINICS_QUERY, { errorPolicy: 'all' });
  const { data: roomsData } = useQuery(ROOMS_QUERY, { errorPolicy: 'all' });
  // REQ041 -- real clinics only; mock rows have no is_primary field to act on.
  const [setHeadOffice] = useMutation(SET_HEAD_OFFICE_CLINIC_MUTATION, {
    onCompleted: () => { enqueueSnackbar('Head office updated.', { variant: 'success' }); refetch(); },
    onError: (e) => enqueueSnackbar(e.message, { variant: 'error' }),
  });

  const apiClinics = clinicsData?.clinics ?? [];
  const useMock = apiClinics.length === 0 && !clinicsLoading;

  const [deletedMockIds] = useState(getDeletedClinicIds);
  const [locallyRemovedIds, setLocallyRemovedIds] = useState([]);

  const clinics = useMock
    ? CLINICS_DATA.filter(c => !deletedMockIds.includes(c.id) && !locallyRemovedIds.includes(c.id))
    : apiClinics.map(toCardClinic).filter(c => !locallyRemovedIds.includes(c.id));

  const rooms = useMock ? ROOMS_DATA : (roomsData?.rooms ?? []).map(toCardRoom);

  const filtered = clinics.filter(
    (c) => !search || c.name.toLowerCase().includes(search.toLowerCase())
  );

  const confirmDelete = () => {
    // No real deleteClinic mutation exists on the backend yet — same
    // "hide locally" behavior as before for mock rows; real rows are
    // removed from view only for this session, not actually deleted server-side.
    setLocallyRemovedIds(prev => [...prev, deleteId]);
    if (useMock) {
      const deletedIds = getDeletedClinicIds();
      if (!deletedIds.includes(deleteId)) {
        localStorage.setItem(DELETED_CLINICS_KEY, JSON.stringify([...deletedIds, deleteId]));
      }
    }
    setDeleteId(null);
  };

  return (
    <Box>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={800}>Clinics &amp; Rooms</Typography>
          <Typography variant="body2" color="text.secondary">
            {clinics.length} clinics · {clinics.reduce((s, c) => s + c.rooms, 0)} rooms total
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/manager/clinics/new')}
          sx={{
            borderRadius: 2.5, textTransform: 'none', fontWeight: 700,
            background: 'linear-gradient(135deg,#4285F4 0%,#1A73E8 100%)',
            '&:hover': { background: 'linear-gradient(135deg,#1A73E8 0%,#1557B0 100%)' },
          }}
        >
          Add Clinic
        </Button>
      </Stack>

      {clinicsError && (
        <Alert severity="warning" sx={{ mb: 2, borderRadius: 2.5 }} action={<Button size="small" onClick={() => refetch()}>Retry</Button>}>
          Backend unavailable — showing sample data
        </Alert>
      )}

      {/* KPI row */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'Total Clinics',    value: clinics.length,                                        color: '#006D77' },
          { label: 'Active Clinics',   value: clinics.filter(c => c.status === 'active').length,     color: '#0F9D58' },
          { label: 'Total Clinicians', value: clinics.reduce((s, c) => s + c.clinicians, 0),         color: '#1A73E8' },
          { label: "Today's Bookings", value: clinics.reduce((s, c) => s + c.todayAppts, 0),         color: '#F9AB00' },
        ].map(({ label, value, color }) => (
          <Grid item xs={6} sm={3} key={label}>
            <Card elevation={0} sx={{ border: '1px solid #E8EAED', borderTop: `4px solid ${color}`, borderRadius: 2.5 }}>
              <CardContent sx={{ p: 2 }}>
                <Typography variant="h4" fontWeight={800} sx={{ color }}>{value}</Typography>
                <Typography variant="body2" color="text.secondary">{label}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Filters */}
      <Stack direction="row" spacing={2} rowGap={1} flexWrap="wrap" sx={{ mb: 2.5 }} alignItems="center">
        <SearchField value={search} onChange={setSearch} placeholder="Search clinics..." sx={{ width: { xs: '100%', sm: 260 } }} />
        <Stack direction="row" spacing={1}>
          {['Clinics', 'Rooms'].map((t, i) => (
            <Chip
              key={t} label={t} onClick={() => setTab(i)}
              color={tab === i ? 'primary' : 'default'}
              variant={tab === i ? 'filled' : 'outlined'}
              sx={{ cursor: 'pointer', fontWeight: 700 }}
            />
          ))}
        </Stack>
      </Stack>

      {/* Clinics tab */}
      {tab === 0 ? (
        <Grid container spacing={3}>
          {filtered.map((clinic) => (
            <Grid item xs={12} md={6} key={clinic.id}>
              <Card
                elevation={0}
                sx={{
                  border: '1px solid #E8EAED', borderRadius: 3,
                  opacity: clinic.status === 'inactive' ? 0.65 : 1,
                  transition: 'box-shadow 0.2s',
                  '&:hover': { boxShadow: '0 4px 16px rgba(0,0,0,0.10)' },
                }}
              >
                <CardContent sx={{ p: 2.5 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1.5 }}>
                    <Box>
                      <Stack direction="row" spacing={0.75} alignItems="center">
                        <Typography fontWeight={800} sx={{ fontSize: '1rem' }}>{clinic.name}</Typography>
                        {clinic.is_primary && (
                          <Tooltip title="Head office">
                            <StarIcon sx={{ fontSize: 16, color: '#F9AB00' }} aria-label="Head office" />
                          </Tooltip>
                        )}
                      </Stack>
                      <Chip
                        label={clinic.status}
                        size="small"
                        sx={{
                          mt: 0.5,
                          bgcolor: clinic.status === 'active' ? '#E6F4EA' : '#F3F4F6',
                          color:   clinic.status === 'active' ? '#137333' : '#6B7280',
                          fontWeight: 700, borderRadius: '8px', fontSize: '0.7rem',
                        }}
                      />
                    </Box>
                    <Stack direction="row" spacing={0.5}>
                      {clinic.is_primary === false && (
                        <Tooltip title="Set as head office">
                          <IconButton size="small" aria-label={`Set ${clinic.name} as head office`} onClick={() => setHeadOffice({ variables: { id: clinic.id } })} sx={{ color: '#F9AB00' }}>
                            <StarOutlineIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      <Tooltip title="View Clinic">
                        <IconButton size="small" aria-label={`View ${clinic.name}`} onClick={() => navigate(`/manager/clinics/${clinic.id}`)} sx={{ color: '#1A73E8' }}>
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit Clinic">
                        <IconButton size="small" aria-label={`Edit ${clinic.name}`} onClick={() => navigate(`/manager/clinics/${clinic.id}/edit`)} sx={{ color: '#F9AB00' }}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete Clinic">
                        <IconButton size="small" aria-label={`Delete ${clinic.name}`} onClick={() => setDeleteId(clinic.id)} sx={{ color: '#D93025' }}>
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </Stack>

                  <Stack spacing={0.75} sx={{ mb: 1.5 }}>
                    <Stack direction="row" spacing={0.75} alignItems="center">
                      <LocationOnIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                      <Typography variant="caption" color="text.secondary">{clinic.address}</Typography>
                    </Stack>
                    <Stack direction="row" spacing={0.75} alignItems="center">
                      <PhoneIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                      <Typography variant="caption" color="text.secondary">{clinic.phone}</Typography>
                    </Stack>
                    <Stack direction="row" spacing={0.75} alignItems="center">
                      <PersonIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                      <Typography variant="caption" color="text.secondary">Manager: {clinic.manager}</Typography>
                    </Stack>
                  </Stack>

                  <Divider sx={{ mb: 1.5 }} />

                  <Grid container spacing={1.5}>
                    {[
                      { label: 'Clinicians', value: clinic.clinicians   },
                      { label: 'Rooms',      value: clinic.rooms        },
                      { label: 'Today',      value: clinic.todayAppts   },
                      { label: 'Monthly',    value: clinic.monthlyAppts },
                    ].map(({ label, value }) => (
                      <Grid item xs={3} key={label} sx={{ textAlign: 'center' }}>
                        <Typography variant="h5" fontWeight={800} color="primary">{value}</Typography>
                        <Typography variant="caption" color="text.secondary">{label}</Typography>
                      </Grid>
                    ))}
                  </Grid>

                  <Stack direction="row" flexWrap="wrap" gap={0.75} sx={{ mt: 1.5 }}>
                    {clinic.specialties.map(s => (
                      <Chip key={s} label={s} size="small" color="primary" variant="outlined" />
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : (
        /* Rooms tab */
        <Grid container spacing={2}>
          {rooms.map(room => (
            <Grid item xs={12} sm={6} md={3} key={room.id}>
              <Card
                elevation={0}
                sx={{ border: `2px solid ${room.status === 'in-use' ? '#006D77' : '#E8EAED'}`, borderRadius: 2.5 }}
              >
                <CardContent sx={{ p: 2 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <MeetingRoomIcon sx={{ color: '#006D77', fontSize: 20 }} />
                      <Typography fontWeight={700}>{room.name}</Typography>
                    </Stack>
                    <Chip
                      label={room.status === 'in-use' ? 'In Use' : 'Available'}
                      size="small"
                      sx={{
                        bgcolor: room.status === 'in-use' ? '#E8F8F9' : '#E6F4EA',
                        color:   room.status === 'in-use' ? '#006D77' : '#137333',
                        fontWeight: 700,
                      }}
                    />
                  </Stack>
                  <Typography variant="caption" color="text.secondary">{room.clinic}</Typography>
                  <Stack direction="row" flexWrap="wrap" gap={0.5} sx={{ mt: 1 }}>
                    {room.equipment.map(e => <Chip key={e} label={e} size="small" variant="outlined" />)}
                  </Stack>
                  <Stack direction="row" spacing={0.5} justifyContent="flex-end" mt={1.5}>
                    <Tooltip title="View Room">
                      <IconButton size="small" onClick={() => navigate(`/manager/rooms/${room.id}`)} sx={{ color: '#1A73E8' }}>
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit Room">
                      <IconButton size="small" onClick={() => navigate(`/manager/rooms/${room.id}/edit`)} sx={{ color: '#F9AB00' }}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Delete confirm */}
      <ConfirmDialog
        isOpen={!!deleteId}
        title="Delete Clinic"
        message="Are you sure you want to delete this clinic? This cannot be undone."
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
      />
    </Box>
  );
}

// SUG-CLI-012 — ErrorBoundary wrapper, consistent with Availability/Blocks/Billing modules
export default function ManagerClinics() {
  return (
    <ErrorBoundary>
      <ManagerClinicsInner />
    </ErrorBoundary>
  );
}
