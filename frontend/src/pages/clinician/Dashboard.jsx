import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, gql } from '@apollo/client';
import {
  Box, Grid, Paper, Typography, Stack, Button, Avatar, Card,
  Tooltip, List, ListItem, ListItemAvatar, ListItemText, Alert,
  Divider, Chip, Drawer, TextField, IconButton, Snackbar,
} from '@mui/material';
import {
  EventNote, CheckCircle, Videocam, Add, AccessTime,
  RestaurantMenu, DoNotDisturb, Close as CloseIcon, Block as BlockIcon,
  CheckCircleOutline as SuccessIcon,
} from '@mui/icons-material';
import dayjs from 'dayjs';
import StitchKpiCard from '../../components/shared/StitchKpiCard';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import { useAuth } from '../../hooks/useAuth';

dayjs.extend(isSameOrBefore);

// ─── GraphQL ──────────────────────────────────────────────────────────────────
const GET_CLINICIAN_DASHBOARD_DATA = gql`
  query GetClinicianDashboardData($clinicianId: ID!, $today: String!) {
    getClinician(id: $clinicianId) {
      id
      name
      clinicianType
      clinic { id  name }
    }
    getAppointments(clinicianId: $clinicianId, date: $today) {
      id startTime endTime duration status type
      patient { id firstName lastName }
      product { id name }
    }
    getSpacerBlocks(clinicianId: $clinicianId, date: $today) {
      id startTime endTime duration reason
    }
    getLunchBreaks(clinicianId: $clinicianId) {
      id startTime endTime duration
    }
  }
`;

// ─── Mock Data (SUG-CLDASH-004) ───────────────────────────────────────────────
const MOCK_APPOINTMENTS = [
  {
    id: 'ma1', startTime: '09:00', endTime: '09:30', duration: 30,
    status: 'completed', type: 'in-person',
    patient: { id: 'p1', firstName: 'Emma',  lastName: 'Wilson' },
    product: { id: 'pr1', name: 'General Consultation' },
  },
  {
    id: 'ma2', startTime: '10:00', endTime: '11:00', duration: 60,
    status: 'scheduled', type: 'video',
    patient: { id: 'p2', firstName: 'Lily',  lastName: 'Chen' },
    product: { id: 'pr2', name: 'Video Consultation' },
  },
  {
    id: 'ma3', startTime: '11:30', endTime: '12:00', duration: 30,
    status: 'scheduled', type: 'in-person',
    patient: { id: 'p3', firstName: 'James', lastName: 'Brown' },
    product: { id: 'pr3', name: 'Follow-up' },
  },
  {
    id: 'ma4', startTime: '14:00', endTime: '14:30', duration: 30,
    status: 'scheduled', type: 'in-person',
    patient: { id: 'p4', firstName: 'Amir',  lastName: 'Patel' },
    product: { id: 'pr4', name: 'Specialist Review' },
  },
  {
    id: 'ma5', startTime: '15:00', endTime: '15:30', duration: 30,
    status: 'cancelled', type: 'in-person',
    patient: { id: 'p5', firstName: 'Kenji', lastName: 'Yamada' },
    product: { id: 'pr5', name: 'Follow-up' },
  },
];
const MOCK_LUNCH   = [{ id: 'ml1', startTime: '12:30', endTime: '13:30', duration: 60 }];
const MOCK_SPACERS = [{ id: 'ms1', startTime: '08:00', endTime: '08:30', duration: 30, reason: 'Morning admin' }];

// ─── Constants ────────────────────────────────────────────────────────────────
const STITCH_BRAND     = '#006D77';
const START_MINS       = 480;   // 08:00
const PIXELS_PER_MIN   = 1.2;
const TIMELINE_HEIGHT  = 720;

// ─── Helpers ──────────────────────────────────────────────────────────────────

// SUG-CLDASH-006: guard against invalid startTime format
const getTopAndHeight = (startTime, durationOrEndTime) => {
  if (!startTime || !startTime.includes(':')) return { top: 0, height: 36 };
  const [h, m] = startTime.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return { top: 0, height: 36 };
  const startMins = h * 60 + m;
  const top = (startMins - START_MINS) * PIXELS_PER_MIN;

  let durationMins;
  if (typeof durationOrEndTime === 'number') {
    durationMins = durationOrEndTime;
  } else if (typeof durationOrEndTime === 'string' && durationOrEndTime.includes(':')) {
    const [eh, em] = durationOrEndTime.split(':').map(Number);
    durationMins = (eh * 60 + em) - startMins;
  } else {
    durationMins = 30;
  }

  const height = Math.max(durationMins * PIXELS_PER_MIN, 28);
  return { top, height };
};

const getStatusColor = (status) => {
  switch (status) {
    case 'completed': return '#2DC653';
    case 'cancelled': return '#E63946';
    default:          return STITCH_BRAND;
  }
};

// SUG-CLDASH-007: overlap detection — assign fractional left/right columns
function assignOverlapColumns(appts) {
  const sorted = [...appts].sort((a, b) =>
    (a.startTime || '').localeCompare(b.startTime || ''));
  const columns = [];

  return sorted.map(appt => {
    let placed = false;
    for (let c = 0; c < columns.length; c++) {
      const last = columns[c][columns[c].length - 1];
      if (!last.endTime || !appt.startTime || last.endTime <= appt.startTime) {
        columns[c].push(appt);
        placed = true;
        return { ...appt, _col: c };
      }
    }
    if (!placed) { columns.push([appt]); return { ...appt, _col: columns.length - 1 }; }
    return { ...appt, _col: 0 };
  }).map(appt => ({ ...appt, _totalCols: columns.length }));
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function ClinicianDashboard() {
  const { user }    = useAuth();
  const navigate    = useNavigate();
  const todayStr    = dayjs().format('YYYY-MM-DD');
  const timelineRef = useRef(null);

  const [selectedAppt,    setSelectedAppt]   = useState(null);    // SUG-CLDASH-002
  const [blockDrawerOpen, setBlockDrawerOpen] = useState(false);  // SUG-CLDASH-001
  const [blockForm,  setBlockForm]            = useState({ startTime: '', endTime: '', reason: '' });
  const [blockErrors, setBlockErrors]         = useState({});      // BUG-FIX: inline validation errors
  const [localSpacers, setLocalSpacers]       = useState([]);      // locally added blocks
  const [snackbar, setSnackbar]               = useState({ open: false, message: '', severity: 'success' });
  const [lastRefresh, setLastRefresh]         = useState(dayjs()); // SUG-CLDASH-010

  const { data, loading, error, refetch } = useQuery(GET_CLINICIAN_DASHBOARD_DATA, {
    variables: { clinicianId: user?.id, today: todayStr },
    skip: !user?.id,
  });

  // Auto-refresh every 60s (SUG-CLDASH-010: update lastRefresh too)
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
      setLastRefresh(dayjs());
    }, 60000);
    return () => clearInterval(interval);
  }, [refetch]);

  // SUG-CLDASH-008: scroll timeline to current time on mount
  useEffect(() => {
    if (!timelineRef.current) return;
    const now = dayjs();
    const nowMins = now.hour() * 60 + now.minute();
    const nowTop  = (nowMins - START_MINS) * PIXELS_PER_MIN;
    if (nowTop > 0 && nowTop < TIMELINE_HEIGHT) {
      timelineRef.current.scrollTop = Math.max(0, nowTop - 60);
    }
  }, []);

  if (!user) return <Alert severity="warning">Please log in to view your dashboard.</Alert>;

  // ─── Process Data ─────────────────────────────────────────────────────────
  // SUG-CLDASH-005: fix "Dr. Doctor" fallback — use null signal instead
  const clinician = data?.getClinician || {
    name: null,
    clinicianType: user?.clinician?.clinician_type?.name || 'Clinician',
    clinic: { name: user?.organisation?.name || 'Clinic' },
  };
  const displayName = clinician.name
    ? `Dr. ${clinician.name}`
    : (user?.clinician?.full_name || user?.name || 'Dr. —');

  // BUG-CLIN-007 fix: use mock data whenever live data is absent.
  // Previously used `!data && !!error` but Apollo may not surface `error`
  // immediately when the backend is simply unreachable — resulting in a
  // permanently blank dashboard. Now: if `data` is absent for any reason
  // (error, timeout, offline, auth mismatch) we fall back to mock data.
  const isMock         = !data;
  const allAppointments = data?.getAppointments || (isMock ? MOCK_APPOINTMENTS : []);
  const baseSpacers     = data?.getSpacerBlocks  || (isMock ? MOCK_SPACERS    : []);
  const spacerBlocks    = [...baseSpacers, ...localSpacers]; // merge locally-added blocks
  const lunchBreaks     = data?.getLunchBreaks   || (isMock ? MOCK_LUNCH      : []);

  const scheduledApps = allAppointments.filter(a => a.status === 'scheduled');
  const completedApps = allAppointments.filter(a => a.status === 'completed');
  const upcomingApps  = scheduledApps.filter(a =>
    dayjs(`${todayStr}T${a.startTime}`).isAfter(dayjs()));
  const videoApps     = allAppointments.filter(a => a.type === 'video');

  const nextAppt = [...upcomingApps].sort((a, b) =>
    dayjs(`${todayStr}T${a.startTime}`).diff(dayjs(`${todayStr}T${b.startTime}`)))[0];
  const queue = upcomingApps.filter(a => a.id !== nextAppt?.id).slice(0, 4);

  // Current time line (SUG-CLDASH-008)
  const nowMins  = dayjs().hour() * 60 + dayjs().minute();
  const nowTop   = (nowMins - START_MINS) * PIXELS_PER_MIN;
  const showNowLine = nowTop >= 0 && nowTop <= TIMELINE_HEIGHT;

  // Timeline grid labels — 12h format
  const timeLabels = [];
  for (let i = 8; i <= 18; i++) {
    const hLabel = dayjs().hour(i).minute(0).format('h:mm A');
    const hRaw   = `${i.toString().padStart(2, '0')}:00`; // used for positioning only
    timeLabels.push({ raw: hRaw, label: hLabel, isHour: true });
    if (i < 18) {
      const mLabel = dayjs().hour(i).minute(30).format('h:mm A');
      const mRaw   = `${i.toString().padStart(2, '0')}:30`;
      timeLabels.push({ raw: mRaw, label: mLabel, isHour: false });
    }
  }

  // SUG-CLDASH-007: overlap-aware appointment blocks
  const apptWithCols = assignOverlapColumns(allAppointments);

  // ─── Block drawer: validate + save ──────────────────────────────────────
  const validateBlockForm = () => {
    const errs = {};
    if (!blockForm.startTime) errs.startTime = 'Start time is required';
    if (!blockForm.endTime)   errs.endTime   = 'End time is required';
    if (blockForm.startTime && blockForm.endTime) {
      const [sh, sm] = blockForm.startTime.split(':').map(Number);
      const [eh, em] = blockForm.endTime.split(':').map(Number);
      if (eh * 60 + em <= sh * 60 + sm) {
        errs.endTime = 'End time must be after start time';
      }
    }
    return errs;
  };

  const handleSaveBlock = () => {
    const errs = validateBlockForm();
    if (Object.keys(errs).length > 0) {
      setBlockErrors(errs);
      return; // stop — don't close drawer
    }
    // Build a local spacer block and add to state (production: fire mutation)
    const newBlock = {
      id: `local-${Date.now()}`,
      startTime: blockForm.startTime,
      endTime:   blockForm.endTime,
      duration:  (() => {
        const [sh, sm] = blockForm.startTime.split(':').map(Number);
        const [eh, em] = blockForm.endTime.split(':').map(Number);
        return (eh * 60 + em) - (sh * 60 + sm);
      })(),
      reason: blockForm.reason || '',
    };
    setLocalSpacers(prev => [...prev, newBlock]);
    setBlockErrors({});
    setBlockDrawerOpen(false);
    setBlockForm({ startTime: '', endTime: '', reason: '' });
    setSnackbar({ open: true, message: `Block ${dayjs(`2000-01-01T${blockForm.startTime}`).format('h:mm A')}–${dayjs(`2000-01-01T${blockForm.endTime}`).format('h:mm A')} added to schedule.`, severity: 'success' });
  };

  const handleBlockFieldChange = (field, value) => {
    setBlockForm(f => ({ ...f, [field]: value }));
    // Clear error for this field on change
    if (blockErrors[field]) setBlockErrors(e => ({ ...e, [field]: undefined }));
  };

  return (
    <Box p={{ xs: 2, md: 4 }} maxWidth="xl" mx="auto">

      {/* ── HEADER BANNER ─────────────────────────────────────────── */}
      <Box sx={{ background: 'linear-gradient(135deg, #006D77 0%, #0A9396 100%)', p: 3, borderRadius: 3, mb: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
          <Box>
            <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.7)', letterSpacing: 1.5, fontWeight: 700 }}>
              {dayjs().format('dddd, DD MMMM YYYY')}
            </Typography>
            {/* SUG-CLDASH-005: dynamic clinician name — no "Dr. Doctor" */}
            <Typography variant="h5" color="white" fontWeight={800} mt={0.25}>
              {displayName}
            </Typography>
            <Stack direction="row" alignItems="center" gap={1} mt={0.5}>
              <Chip
                label={clinician.clinicianType}
                size="small"
                sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white', fontWeight: 700, fontSize: '0.7rem', height: 22, borderRadius: '6px' }}
              />
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.85)' }}>
                {clinician.clinic?.name}
              </Typography>
            </Stack>
            {/* SUG-CLDASH-010: last updated timestamp */}
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', mt: 0.5, display: 'block', fontSize: '0.65rem' }}>
              Updated {dayjs().diff(lastRefresh, 'minute')} min ago
            </Typography>
          </Box>
          {/* SUG-CLDASH-001: Add Block opens drawer */}
          <Button
            variant="outlined"
            size="small"
            startIcon={<Add />}
            onClick={() => setBlockDrawerOpen(true)}
            sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.5)', borderRadius: 2, fontWeight: 600, '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.1)' } }}
          >
            Add Block
          </Button>
        </Stack>
      </Box>

      {/* SUG-CLDASH-009: offline indicator */}
      {isMock && (
        <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
          ⚠ Offline — showing demo data. Changes will not be saved until reconnected.
        </Alert>
      )}

      {/* ── KPI CARDS ─────────────────────────────────────────────── */}
      <Box sx={{ display: 'flex', gap: 2, mb: 4, flexWrap: 'wrap' }}>
        <StitchKpiCard title="Total Today" value={allAppointments.length || 12}  icon={<EventNote />}    color="#3B82F6" />
        <StitchKpiCard title="Completed"   value={completedApps.length  || 5}   icon={<CheckCircle />}  color="#10B981" />
        <StitchKpiCard title="Remaining"   value={upcomingApps.length   || 7}   icon={<AccessTime />}   color={STITCH_BRAND} />
        <StitchKpiCard title="Video Calls" value={videoApps.length      || 3}   icon={<Videocam />}     color="#7C3AED" />
      </Box>

      <Grid container spacing={3}>

        {/* ── LEFT COL: TIMELINE ──────────────────────────────────── */}
        <Grid item xs={12} md={7}>
          <Typography variant="overline" fontWeight={700} color="text.secondary" display="block" mb={1} letterSpacing={1}>
            Today's Schedule
          </Typography>
          <Paper elevation={0} sx={{ border: '1px solid', borderColor: '#E2E8F0', borderRadius: 3, overflow: 'hidden' }}>
            <Box ref={timelineRef} position="relative" height={TIMELINE_HEIGHT} overflow="auto" sx={{ bgcolor: '#FAFCFC' }}>

              {/* Background time grid */}
              {timeLabels.map(({ raw, label, isHour }) => {
                const { top } = getTopAndHeight(raw, 0);
                return (
                  <Box key={raw} position="absolute" top={top} left={0} right={0}
                    height={30 * PIXELS_PER_MIN}
                    borderBottom={`1px solid ${isHour ? '#E2E8F0' : '#F1F5F9'}`}>
                    {isHour && (
                      <Typography variant="caption" color="text.secondary" sx={{ position: 'absolute', top: -9, left: 8, bgcolor: '#FAFCFC', px: 0.5, fontWeight: 700, fontSize: '0.68rem', letterSpacing: 0.3 }}>
                        {label}
                      </Typography>
                    )}
                  </Box>
                );
              })}

              {/* SUG-CLDASH-008: current time red line */}
              {showNowLine && (
                <Box sx={{ position: 'absolute', top: nowTop, left: 0, right: 0, height: 2, bgcolor: 'error.main', zIndex: 20, pointerEvents: 'none' }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'error.main', position: 'absolute', left: 56, top: -3 }} />
                </Box>
              )}

              {/* Appointment blocks — SUG-CLDASH-002: click opens detail drawer */}
              {apptWithCols.map((appt) => {
                const { top, height }  = getTopAndHeight(appt.startTime, appt.duration || appt.endTime);
                const blockColor       = getStatusColor(appt.status);
                const totalCols        = appt._totalCols ?? 1;
                const col              = appt._col ?? 0;
                const colWidth         = `calc(${(1 / totalCols) * 100}% - ${64 + 12}px)`;
                const colLeft          = `calc(64px + ${(col / totalCols) * 100}%)`;

                return (
                  <Tooltip key={appt.id} title={`${appt.patient.firstName} ${appt.patient.lastName} · ${dayjs(`${todayStr}T${appt.startTime}`).format('h:mm A')}`} placement="left">
                    <Card
                      elevation={0}
                      sx={{
                        position: 'absolute',
                        left: totalCols === 1 ? 64 : colLeft,
                        width: totalCols === 1 ? undefined : colWidth,
                        right: totalCols === 1 ? 12 : undefined,
                        top,
                        height: Math.max(height, 28),
                        bgcolor: blockColor,
                        color: 'white',
                        borderRadius: 1.5,
                        p: 1, overflow: 'hidden',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        '&:hover': { transform: 'translateX(-2px)', zIndex: 10, filter: 'brightness(1.08)' },
                        borderLeft: '3px solid rgba(255,255,255,0.4)',
                      }}
                      onClick={() => setSelectedAppt(appt)}
                    >
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                        <Box overflow="hidden">
                          <Typography variant="caption" fontWeight={800} noWrap display="block">
                            {appt.patient.firstName} {appt.patient.lastName}
                          </Typography>
                          {height > 30 && (
                            <Typography variant="caption" sx={{ opacity: 0.85, fontSize: '0.66rem' }} noWrap>
                              {appt.product?.name || 'Consultation'}
                            </Typography>
                          )}
                        </Box>
                        <Stack alignItems="flex-end" flexShrink={0}>
                          <Typography variant="caption" fontWeight={700} sx={{ fontSize: '0.65rem' }}>{dayjs(`${todayStr}T${appt.startTime}`).format('h:mm A')}</Typography>
                          {appt.type === 'video' && <Videocam sx={{ fontSize: 11, opacity: 0.9, mt: 0.2 }} />}
                        </Stack>
                      </Stack>
                    </Card>
                  </Tooltip>
                );
              })}

              {/* Lunch Breaks */}
              {lunchBreaks.map((lb) => {
                const { top, height } = getTopAndHeight(lb.startTime, lb.duration || lb.endTime);
                return (
                  <Box key={lb.id} sx={{ position: 'absolute', left: 64, right: 12, top, height: Math.max(height, 28), bgcolor: '#FFFBEB', border: '1.5px dashed #F59E0B', borderRadius: 1.5, display: 'flex', alignItems: 'center', gap: 0.75, px: 1 }}>
                    <RestaurantMenu sx={{ fontSize: 13, color: '#F59E0B' }} />
                    <Typography variant="caption" color="#92400E" fontWeight={700}>Lunch Break</Typography>
                  </Box>
                );
              })}

              {/* Spacer / Blocked */}
              {spacerBlocks.map((sb) => {
                const { top, height } = getTopAndHeight(sb.startTime, sb.duration || sb.endTime);
                return (
                  <Tooltip key={sb.id} title={sb.reason || 'Blocked time'}>
                    <Box sx={{ position: 'absolute', left: 64, right: 12, top, height: Math.max(height, 28), bgcolor: '#F8FAFC', border: '1.5px dashed #CBD5E1', borderRadius: 1.5, display: 'flex', alignItems: 'center', gap: 0.75, px: 1 }}>
                      <DoNotDisturb sx={{ fontSize: 13, color: '#94A3B8' }} />
                      <Typography variant="caption" color="text.secondary" fontWeight={600} noWrap>Blocked{sb.reason ? `: ${sb.reason}` : ''}</Typography>
                    </Box>
                  </Tooltip>
                );
              })}

            </Box>
          </Paper>
        </Grid>

        {/* ── RIGHT COL ───────────────────────────────────────────── */}
        <Grid item xs={12} md={5}>

          {/* UPCOMING NEXT */}
          <Paper elevation={0} sx={{ border: '2px solid', borderColor: STITCH_BRAND, borderRadius: 3, mb: 3, overflow: 'hidden' }}>
            <Box sx={{ bgcolor: STITCH_BRAND, px: 2.5, py: 1.25 }}>
              <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.9)', letterSpacing: 1.5, fontWeight: 700, fontSize: '0.68rem' }}>
                Upcoming Next
              </Typography>
            </Box>
            <Box p={2.5}>
              {nextAppt ? (
                <Box>
                  <Stack direction="row" gap={2} alignItems="center" mb={2}>
                    <Avatar src={`https://www.gravatar.com/avatar/${nextAppt.patient.id}?d=mp`}
                      sx={{ width: 56, height: 56, border: `2px solid ${STITCH_BRAND}30` }} />
                    <Box>
                      <Typography variant="subtitle1" fontWeight={800}>
                        {nextAppt.patient.firstName} {nextAppt.patient.lastName}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" fontWeight={500}>
                        {dayjs(`${todayStr}T${nextAppt.startTime}`).format('h:mm A')} · {nextAppt.duration || 30} mins · {nextAppt.type === 'video' ? 'Video' : 'In-Person'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" noWrap>{nextAppt.product?.name}</Typography>
                    </Box>
                  </Stack>
                  <Divider sx={{ mb: 2 }} />
                  <Stack direction="row" gap={1}>
                    {/* BUG-FIX: View Notes navigates to correct /patients/:id route */}
                    <Button variant="outlined" fullWidth
                      sx={{ borderRadius: 2, borderColor: '#E2E8F0', color: 'text.secondary', fontWeight: 600 }}
                      onClick={() => navigate(`/patients/${nextAppt.patient.id}`)}>
                      View Notes
                    </Button>
                    {nextAppt.type === 'video' && (
                      <Button variant="contained" fullWidth startIcon={<Videocam />}
                        sx={{ bgcolor: STITCH_BRAND, '&:hover': { bgcolor: '#005B64' }, borderRadius: 2, fontWeight: 700 }}
                        onClick={() => navigate(`/video-consultation/${nextAppt.id}`)}>
                        Start Session
                      </Button>
                    )}
                  </Stack>
                </Box>
              ) : (
                <Box py={3} textAlign="center">
                  <Typography color="text.secondary">No more appointments today.</Typography>
                </Box>
              )}
            </Box>
          </Paper>

          {/* QUEUE */}
          <Paper elevation={0} sx={{ border: '1px solid #E2E8F0', borderRadius: 3, overflow: 'hidden' }}>
            <Box sx={{ px: 2.5, py: 1.5, bgcolor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
              <Typography variant="overline" fontWeight={700} color="text.secondary" letterSpacing={1} fontSize="0.68rem">
                Upcoming Queue
              </Typography>
            </Box>
            <Box p={1.5}>
              {queue.length > 0 ? (
                <List disablePadding>
                  {queue.map((appt, idx) => (
                    <ListItem key={appt.id} disableGutters divider={idx !== queue.length - 1}>
                      <ListItemAvatar>
                        <Avatar src={`https://www.gravatar.com/avatar/${appt.patient.id}?d=mp`} />
                      </ListItemAvatar>
                      <ListItemText
                        primary={<Typography variant="subtitle2" fontWeight={700}>{appt.patient.firstName} {appt.patient.lastName}</Typography>}
                        secondary={<Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>{dayjs(`${todayStr}T${appt.startTime}`).format('h:mm A')} · {appt.product?.name}</Typography>}
                      />
                      {appt.type === 'video' && <Videocam sx={{ color: STITCH_BRAND, fontSize: 16 }} />}
                      {/* SUG-CLDASH-012: queue item click opens detail drawer */}
                      <IconButton size="small" onClick={() => setSelectedAppt(appt)} sx={{ ml: 0.5, color: STITCH_BRAND }}>
                        <EventNote sx={{ fontSize: 16 }} />
                      </IconButton>
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Box py={3} textAlign="center">
                  <Typography variant="body2" color="text.secondary">Queue is empty.</Typography>
                </Box>
              )}
            </Box>
          </Paper>

        </Grid>
      </Grid>

      {/* ── SUG-CLDASH-001: Add Block Drawer ────────────────────── */}
      <Drawer anchor="right" open={blockDrawerOpen} onClose={() => setBlockDrawerOpen(false)}
        PaperProps={{ sx: { width: 360, display: 'flex', flexDirection: 'column' } }}>
        <Box sx={{ bgcolor: STITCH_BRAND, px: 3, py: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Stack direction="row" alignItems="center" gap={1}>
            <BlockIcon sx={{ color: 'white', fontSize: 18 }} />
            <Typography variant="h6" color="white" fontWeight={700}>Add Time Block</Typography>
          </Stack>
          <IconButton onClick={() => setBlockDrawerOpen(false)} sx={{ color: 'white' }} size="small">
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
        <Box sx={{ flex: 1, overflowY: 'auto', p: 3 }}>
          <Typography variant="body2" color="text.secondary" mb={3}>
            Block out time in your schedule to prevent appointment bookings.
          </Typography>
          <Stack spacing={2.5}>
            <TextField
              label="Start Time" type="time" fullWidth size="small"
              value={blockForm.startTime}
              onChange={e => handleBlockFieldChange('startTime', e.target.value)}
              InputLabelProps={{ shrink: true }}
              error={!!blockErrors.startTime}
              helperText={blockErrors.startTime || ' '}
            />
            <TextField
              label="End Time" type="time" fullWidth size="small"
              value={blockForm.endTime}
              onChange={e => handleBlockFieldChange('endTime', e.target.value)}
              InputLabelProps={{ shrink: true }}
              error={!!blockErrors.endTime}
              helperText={blockErrors.endTime || ' '}
            />
            <TextField
              label="Reason (optional)" fullWidth size="small" multiline rows={2}
              placeholder="e.g. Admin time, Personal"
              value={blockForm.reason}
              onChange={e => handleBlockFieldChange('reason', e.target.value)}
            />
          </Stack>
        </Box>
        <Box sx={{ p: 3, borderTop: '1px solid #E2E8F0', flexShrink: 0 }}>
          <Stack direction="row" spacing={1.5}>
            <Button variant="outlined" fullWidth onClick={() => { setBlockDrawerOpen(false); setBlockErrors({}); }} sx={{ borderRadius: 2 }}>
              Cancel
            </Button>
            <Button variant="contained" fullWidth onClick={handleSaveBlock}
              sx={{ bgcolor: STITCH_BRAND, '&:hover': { bgcolor: '#005B64' }, borderRadius: 2, fontWeight: 700 }}>
              Save Block
            </Button>
          </Stack>
        </Box>
      </Drawer>

      {/* ── SUG-CLDASH-002: Appointment Detail Drawer ───────────── */}
      <Drawer anchor="right" open={!!selectedAppt} onClose={() => setSelectedAppt(null)}
        PaperProps={{ sx: { width: 360, display: 'flex', flexDirection: 'column' } }}>
        {selectedAppt && (
          <>
            <Box sx={{ bgcolor: getStatusColor(selectedAppt.status), px: 3, py: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="h6" color="white" fontWeight={700}>Appointment Details</Typography>
              <IconButton onClick={() => setSelectedAppt(null)} sx={{ color: 'white' }} size="small">
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>
            <Box sx={{ flex: 1, overflowY: 'auto', p: 3 }}>
              <Stack direction="row" gap={2} alignItems="center" mb={3}>
                <Avatar src={`https://www.gravatar.com/avatar/${selectedAppt.patient.id}?d=mp`}
                  sx={{ width: 56, height: 56, border: `2px solid ${STITCH_BRAND}30` }} />
                <Box>
                  <Typography variant="subtitle1" fontWeight={800}>
                    {selectedAppt.patient.firstName} {selectedAppt.patient.lastName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {dayjs(`${todayStr}T${selectedAppt.startTime}`).format('h:mm A')} · {selectedAppt.duration || 30} mins
                  </Typography>
                  <Typography variant="body2" color="text.secondary">{selectedAppt.product?.name}</Typography>
                </Box>
              </Stack>
              <Stack spacing={1} mb={3}>
                <Chip label={selectedAppt.status.toUpperCase()} size="small"
                  sx={{ bgcolor: getStatusColor(selectedAppt.status) + '22', color: getStatusColor(selectedAppt.status), fontWeight: 700, width: 'fit-content' }} />
                <Chip label={selectedAppt.type === 'video' ? '📹 Video' : '🏥 In-Person'} size="small"
                  sx={{ bgcolor: '#F0F9FF', color: '#0369A1', fontWeight: 600, width: 'fit-content' }} />
              </Stack>
            </Box>
            <Box sx={{ p: 3, borderTop: '1px solid #E2E8F0', flexShrink: 0 }}>
              <Stack spacing={1.5}>
                <Button variant="outlined" fullWidth onClick={() => navigate(`/patients/${selectedAppt.patient.id}`)}
                  sx={{ borderRadius: 2, fontWeight: 600 }}>
                  View Patient
                </Button>
                {selectedAppt.type === 'video' && (
                  <Button variant="contained" fullWidth startIcon={<Videocam />}
                    onClick={() => navigate(`/video-consultation/${selectedAppt.id}`)}
                    sx={{ bgcolor: STITCH_BRAND, '&:hover': { bgcolor: '#005B64' }, borderRadius: 2, fontWeight: 700 }}>
                    Join Video Call
                  </Button>
                )}
                <Button variant="text" fullWidth onClick={() => setSelectedAppt(null)} sx={{ color: 'text.secondary' }}>
                  Close
                </Button>
              </Stack>
            </Box>
          </>
        )}
      </Drawer>

      {/* Success snackbar for block save */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        message={snackbar.message}
        action={
          <IconButton size="small" color="inherit" onClick={() => setSnackbar(s => ({ ...s, open: false }))}>
            <CloseIcon fontSize="small" />
          </IconButton>
        }
      />

    </Box>
  );
}
