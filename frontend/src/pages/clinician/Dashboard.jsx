import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, gql } from '@apollo/client';
import {
  Box, Grid, Paper, Typography, Stack, Button, Avatar, Card,
  Tooltip, List, ListItem, ListItemAvatar, ListItemText, Alert,
  Divider, Chip, Drawer, TextField, IconButton, Snackbar,
} from '@mui/material';
import {
  EventNote, CheckCircle, Videocam, Add, AccessTime,
  RestaurantMenu, DoNotDisturb, Close as CloseIcon, Block as BlockIcon,
} from '@mui/icons-material';
import dayjs from 'dayjs';
import StitchKpiCard from '../../components/shared/StitchKpiCard';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import { useAuth } from '../../hooks/useAuth';

dayjs.extend(isSameOrBefore);

// ─── GraphQL ──────────────────────────────────────────────────────────────────
// BUG021: this page's own dashboard was fabricated end to end --
// getClinician/getAppointments are the @Public() patient-self-serve dialect
// (backend/src/public), whose real getAppointments return type has only
// id/startTime/endTime, guaranteeing a GraphQL validation error on every
// request; isMock = !data then permanently masked that as fake sample data.
// Replaced with: a dedicated network-only profile query (LOGIN_MUTATION never
// selects user.clinician, so a freshly-logged-in session's cached copy is
// undefined -- same bug class as AuthContext's own documented user.patient.id
// gap, worked around the same way the Settings Privacy tab already does) and
// the real appointments() query, self-scoped server-side via the caller's own
// JWT clinician_id -- the same primitive clinician/Calendar.jsx already uses.
// User.clinician resolves to the smaller ClinicianInfo type (id/full_name/
// avatar_url/clinician_type only -- no clinics field), so a second query
// against the real Clinician type (clinicians module, no @Auth restriction
// on the single-record read) fetches the clinic needed for createSpacerBlock.
const GET_MY_CLINICIAN_PROFILE = gql`
  query GetMyClinicianProfileForDashboard {
    me {
      clinician {
        id
        full_name
        clinician_type { name }
      }
    }
  }
`;
const GET_MY_CLINICIAN_CLINIC = gql`
  query GetMyClinicianClinicForDashboard($id: ID!) {
    clinician(id: $id) {
      id
      clinics { id name }
    }
  }
`;
const GET_TODAY_APPOINTMENTS = gql`
  query GetTodayAppointmentsForDashboard($dateFrom: String!, $dateTo: String!) {
    appointments(filters: { date_from: $dateFrom, date_to: $dateTo }, first: 200) {
      data {
        id start_datetime end_datetime duration_minutes status type
        patient { id full_name }
        service { name }
      }
    }
  }
`;
const GET_SPACER_BLOCKS = gql`
  query GetMySpacerBlocksForDashboard($clinicianId: ID!, $date: String!) {
    getSpacerBlocks(clinicianId: $clinicianId, date: $date) {
      id startTime endTime duration reason
    }
  }
`;
const GET_LUNCH_BREAKS = gql`
  query GetMyLunchBreaksForDashboard($clinicianId: ID!) {
    getLunchBreaks(clinicianId: $clinicianId) {
      id startTime endTime duration
    }
  }
`;
const CREATE_SPACER_BLOCK = gql`
  mutation CreateMySpacerBlock($input: CreateSpacerBlockInput!) {
    createSpacerBlock(input: $input) {
      success
      userErrors { message }
      spacerBlock { id start_time end_time reason }
    }
  }
`;
const COMPLETE_APPOINTMENT = gql`
  mutation CompleteMyAppointment($id: ID!) {
    completeAppointment(id: $id) { id status }
  }
`;

// The real appointment shape (start_datetime ISO, duration_minutes,
// patient.full_name, service.name) differs from what this page's timeline/
// drawer render code expects (HH:mm strings, a flat duration, a single
// full_name field) -- mapped once here rather than rewriting every render
// call site, matching this codebase's own resolver-boundary-conversion
// convention (money/paise) for a real-vs-display shape mismatch.
const mapAppointment = (apt) => ({
  id: apt.id,
  startTime: dayjs(apt.start_datetime).format('HH:mm'),
  endTime: dayjs(apt.end_datetime).format('HH:mm'),
  duration: apt.duration_minutes,
  status: apt.status,
  type: apt.type === 'video' ? 'video' : 'in-person',
  patient: { id: apt.patient.id, full_name: apt.patient.full_name },
  product: apt.service ? { name: apt.service.name } : null,
});

const patientInitials = (fullName) =>
  (fullName || '').split(' ').filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?';

const isUpcomingStatus = (status) => status === 'scheduled' || status === 'confirmed';

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
  const [snackbar, setSnackbar]               = useState({ open: false, message: '', severity: 'success' });
  const [lastRefresh, setLastRefresh]         = useState(dayjs()); // SUG-CLDASH-010

  const { data: profileData, loading: profileLoading, error: profileError } = useQuery(GET_MY_CLINICIAN_PROFILE, {
    fetchPolicy: 'network-only',
    skip: !user,
  });
  const clinicianId = profileData?.me?.clinician?.id;

  const { data: clinicianClinicData } = useQuery(GET_MY_CLINICIAN_CLINIC, {
    variables: { id: clinicianId },
    skip: !clinicianId,
  });
  const clinicianClinicId = clinicianClinicData?.clinician?.clinics?.[0]?.id;
  const clinicianClinicName = clinicianClinicData?.clinician?.clinics?.[0]?.name;

  const { data, loading, error, refetch } = useQuery(GET_TODAY_APPOINTMENTS, {
    variables: { dateFrom: todayStr, dateTo: todayStr },
    skip: !user,
  });
  const { data: spacersData, refetch: refetchSpacers } = useQuery(GET_SPACER_BLOCKS, {
    variables: { clinicianId, date: todayStr },
    skip: !clinicianId,
  });
  const { data: lunchData } = useQuery(GET_LUNCH_BREAKS, {
    variables: { clinicianId },
    skip: !clinicianId,
  });
  const [createSpacerBlockMutation, { loading: savingBlock }] = useMutation(CREATE_SPACER_BLOCK);
  const [completeAppointmentMutation, { loading: markingComplete }] = useMutation(COMPLETE_APPOINTMENT);

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

  if ((loading || profileLoading) && !data && !profileData) {
    return (
      <Box p={{ xs: 2, md: 4 }} maxWidth="xl" mx="auto">
        <Typography color="text.secondary">Loading your dashboard…</Typography>
      </Box>
    );
  }

  // BUG021: a genuine query error is a real error state, not a cue to render
  // fabricated sample data.
  if (error || profileError) {
    return (
      <Box p={{ xs: 2, md: 4 }} maxWidth="xl" mx="auto">
        <Alert severity="error" action={
          <Button color="inherit" size="small" onClick={() => { refetch(); }}>Retry</Button>
        }>
          Couldn't load your dashboard. {(error || profileError).message}
        </Alert>
      </Box>
    );
  }

  if (!profileLoading && profileData && !profileData.me?.clinician) {
    return (
      <Box p={{ xs: 2, md: 4 }} maxWidth="xl" mx="auto">
        <Alert severity="warning">
          Your account isn't linked to a clinician profile yet — contact your admin.
        </Alert>
      </Box>
    );
  }

  // ─── Process Data ─────────────────────────────────────────────────────────
  const clinicianType = profileData?.me?.clinician?.clinician_type?.name || 'Clinician';
  const clinicName    = clinicianClinicName || 'Clinic';
  const displayName   = profileData?.me?.clinician?.full_name
    ? `Dr. ${profileData.me.clinician.full_name}`
    : 'Dr. —';

  const allAppointments = (data?.appointments?.data || []).map(mapAppointment);
  const spacerBlocks    = (spacersData?.getSpacerBlocks || []);
  const lunchBreaks     = (lunchData?.getLunchBreaks || []);

  const scheduledApps = allAppointments.filter(a => isUpcomingStatus(a.status));
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

  // BUG021: real createSpacerBlock mutation — branches on success/userErrors
  // (this domain's real mutation-response convention), refetches the real
  // spacer-blocks query on success instead of hand-merging a fake local row.
  const handleSaveBlock = async () => {
    const errs = validateBlockForm();
    if (Object.keys(errs).length > 0) {
      setBlockErrors(errs);
      return; // stop — don't close drawer
    }
    try {
      const { data: result } = await createSpacerBlockMutation({
        variables: {
          input: {
            clinician_id: clinicianId,
            clinic_id: clinicianClinicId,
            block_date: todayStr,
            start_time: blockForm.startTime,
            end_time: blockForm.endTime,
            reason: blockForm.reason || '',
            recurrence_type: 'single',
          },
        },
      });
      if (!result?.createSpacerBlock?.success) {
        const msg = result?.createSpacerBlock?.userErrors?.[0]?.message || 'Failed to save block.';
        setSnackbar({ open: true, message: msg, severity: 'error' });
        return;
      }
      await refetchSpacers();
      setBlockErrors({});
      setBlockDrawerOpen(false);
      setBlockForm({ startTime: '', endTime: '', reason: '' });
      setSnackbar({ open: true, message: `Block ${dayjs(`2000-01-01T${blockForm.startTime}`).format('h:mm A')}–${dayjs(`2000-01-01T${blockForm.endTime}`).format('h:mm A')} added to schedule.`, severity: 'success' });
    } catch (e) {
      setSnackbar({ open: true, message: e.message || 'Failed to save block.', severity: 'error' });
    }
  };

  // BUG021: real completeAppointment mutation — refetches today's appointments
  // instead of a client-only status override.
  const handleMarkComplete = async (id) => {
    try {
      await completeAppointmentMutation({ variables: { id } });
      await refetch();
      setSelectedAppt(prev => (prev && prev.id === id ? { ...prev, status: 'completed' } : prev));
      setSnackbar({ open: true, message: 'Appointment marked as complete.', severity: 'success' });
    } catch (e) {
      setSnackbar({ open: true, message: e.message || 'Failed to mark complete.', severity: 'error' });
    }
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
                label={clinicianType}
                size="small"
                sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white', fontWeight: 700, fontSize: '0.7rem', height: 22, borderRadius: '6px' }}
              />
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.85)' }}>
                {clinicName}
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

      {/* ── KPI CARDS ─────────────────────────────────────────────── */}
      <Box sx={{ display: 'flex', gap: 2, mb: 4, flexWrap: 'wrap' }}>
        <StitchKpiCard title="Total Today" value={allAppointments.length}  icon={<EventNote />}    color="#3B82F6" />
        <StitchKpiCard title="Completed"   value={completedApps.length}   icon={<CheckCircle />}  color="#10B981" />
        <StitchKpiCard title="Remaining"   value={upcomingApps.length}    icon={<AccessTime />}   color={STITCH_BRAND} />
        <StitchKpiCard title="Video Calls" value={videoApps.length}       icon={<Videocam />}     color="#7C3AED" />
      </Box>
      {/* NEW-CLDASH-019: completed/total progress bar */}
      {allAppointments.length > 0 && (
        <Box sx={{ mb: 3, px: 0.5 }}>
          <Stack direction="row" justifyContent="space-between" mb={0.5}>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
              Today's Progress
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {completedApps.length} / {allAppointments.length} completed
            </Typography>
          </Stack>
          <Box sx={{ height: 6, bgcolor: '#E8F8F9', borderRadius: 3, overflow: 'hidden' }}>
            <Box sx={{
              height: '100%', borderRadius: 3,
              bgcolor: '#10B981',
              width: `${Math.min(100, (completedApps.length / allAppointments.length) * 100)}%`,
              transition: 'width 0.4s ease',
            }} />
          </Box>
        </Box>
      )}

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

              {/* SUG-CLDASH-008: current time red line + SUG-CLDASH-014: Now label */}
              {showNowLine && (
                <Box sx={{ position: 'absolute', top: nowTop, left: 0, right: 0, height: 2, bgcolor: 'error.main', zIndex: 20, pointerEvents: 'none' }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'error.main', position: 'absolute', left: 56, top: -3 }} />
                  {/* SUG-CLDASH-014: "Now h:mm A" chip next to dot */}
                  <Box sx={{
                    position: 'absolute', left: 68, top: -10,
                    bgcolor: 'error.main', color: 'white',
                    fontSize: '0.6rem', fontWeight: 700, lineHeight: 1,
                    px: 0.75, py: '3px', borderRadius: '6px',
                    letterSpacing: 0.2, whiteSpace: 'nowrap',
                  }}>
                    Now {dayjs().format('h:mm A')}
                  </Box>
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
                  <Tooltip key={appt.id} title={`${appt.patient.full_name} · ${dayjs(`${todayStr}T${appt.startTime}`).format('h:mm A')}`} placement="left">
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
                            {appt.patient.full_name}
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
                    <Box sx={{ position: 'absolute', left: 64, right: 12, top, height: Math.max(height, 28), bgcolor: '#F8FAFC', border: '1.5px dashed #CBD5E1', borderRadius: 1.5, display: 'flex', alignItems: 'center', gap: 0.75, px: 1, pr: 0.5 }}>
                      <DoNotDisturb sx={{ fontSize: 13, color: '#94A3B8', flexShrink: 0 }} />
                      <Typography variant="caption" color="text.secondary" fontWeight={600} noWrap sx={{ flex: 1 }}>Blocked{sb.reason ? `: ${sb.reason}` : ''}</Typography>
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
                        {nextAppt.patient.full_name}
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
                        primary={<Typography variant="subtitle2" fontWeight={700}>{appt.patient.full_name}</Typography>}
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
          {/* NEW-CLDASH-017: real-time duration preview */}
          {blockForm.startTime && blockForm.endTime && (() => {
            const [sh, sm] = blockForm.startTime.split(':').map(Number);
            const [eh, em] = blockForm.endTime.split(':').map(Number);
            const dur = (eh * 60 + em) - (sh * 60 + sm);
            if (dur <= 0) return null;
            return (
              <Box sx={{ mb: 2, px: 1.5, py: 0.75, bgcolor: '#E8F8F9', borderRadius: 2, display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
                <AccessTime sx={{ fontSize: 14, color: STITCH_BRAND }} />
                <Typography variant="caption" color={STITCH_BRAND} fontWeight={700}>
                  Duration: {dur >= 60 ? `${Math.floor(dur/60)}h ${dur%60 ? dur%60+'m' : ''}`.trim() : `${dur} mins`}
                </Typography>
              </Box>
            );
          })()}
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
            <Button variant="contained" fullWidth onClick={handleSaveBlock} disabled={savingBlock}
              sx={{ bgcolor: STITCH_BRAND, '&:hover': { bgcolor: '#005B64' }, borderRadius: 2, fontWeight: 700 }}>
              {savingBlock ? 'Saving…' : 'Save Block'}
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
                {/* NEW-CLDASH-018: initials fallback when Gravatar fails */}
                <Avatar
                  src={`https://www.gravatar.com/avatar/${selectedAppt.patient.id}?d=404`}
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  sx={{ width: 56, height: 56, border: `2px solid ${STITCH_BRAND}30`, position: 'relative' }}
                />
                {/* Fallback initials avatar always rendered behind */}
                <Avatar sx={{
                  width: 56, height: 56,
                  bgcolor: getStatusColor(selectedAppt.status),
                  fontWeight: 800, fontSize: '1rem',
                  position: 'absolute',
                  zIndex: -1,
                }}>{patientInitials(selectedAppt.patient.full_name)}</Avatar>
                <Box>
                  <Typography variant="subtitle1" fontWeight={800}>
                    {selectedAppt.patient.full_name}
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
                {/* Mark Complete — only offered for still-upcoming appointments */}
                {isUpcomingStatus(selectedAppt.status) && (
                  <Button variant="contained" fullWidth startIcon={<CheckCircle />}
                    onClick={() => handleMarkComplete(selectedAppt.id)} disabled={markingComplete}
                    sx={{ bgcolor: '#10B981', '&:hover': { bgcolor: '#059669' }, borderRadius: 2, fontWeight: 700 }}>
                    {markingComplete ? 'Saving…' : 'Mark Complete'}
                  </Button>
                )}
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
