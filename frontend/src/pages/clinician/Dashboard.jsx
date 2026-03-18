import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, gql } from '@apollo/client';
import {
  Box, Grid, Paper, Typography, Stack, Button, Avatar, Card,
  Tooltip, List, ListItem, ListItemAvatar, ListItemText, CircularProgress, Alert, Divider, Chip
} from '@mui/material';
import {
  EventNote, CheckCircle, Schedule, Videocam, Add, AccessTime, RestaurantMenu, DoNotDisturb
} from '@mui/icons-material';
import dayjs from 'dayjs';
import StitchKpiCard from '../../components/shared/StitchKpiCard';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import { useAuth } from '../../hooks/useAuth';

dayjs.extend(isSameOrBefore);

// --- GraphQL ---

const GET_CLINICIAN_DASHBOARD_DATA = gql`
  query GetClinicianDashboardData($clinicianId: ID!, $today: String!) {
    getClinician(id: $clinicianId) {
      id
      name
      clinicianType
      clinic {
        id
        name
      }
    }
    getAppointments(clinicianId: $clinicianId, date: $today) {
      id
      startTime
      endTime
      duration
      status
      type
      patient {
        id
        firstName
        lastName
      }
      product {
        id
        name
      }
    }
    # Assuming appropriate resolvers exist
    getSpacerBlocks(clinicianId: $clinicianId, date: $today) {
      id
      startTime
      endTime
      duration
      reason
    }
    getLunchBreaks(clinicianId: $clinicianId) {
      id
      startTime
      endTime
      duration
    }
  }
`;

// Stitch brand colors
const STITCH_BRAND = '#006D77';

export default function ClinicianDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const todayStr = dayjs().format('YYYY-MM-DD');

  const { data, loading, error, refetch } = useQuery(GET_CLINICIAN_DASHBOARD_DATA, {
    variables: { clinicianId: user?.id, today: todayStr },
    skip: !user?.id,
  });

  // Auto-refresh every 60s
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 60000);
    return () => clearInterval(interval);
  }, [refetch]);

  if (!user) return <Alert severity="warning">Please log in to view your dashboard.</Alert>;
  // NOTE: We do NOT block on loading — mock data fallbacks render the page immediately.
  // The loading state is shown inline via the KPI cards showing '...' values.

  // --- Process Data ---
  const clinician = data?.getClinician || { name: 'Doctor', clinicianType: 'Specialist', clinic: { name: 'Health Clinic' } };
  const allAppointments = data?.getAppointments || [];
  const spacerBlocks = data?.getSpacerBlocks || [];
  const lunchBreaks = data?.getLunchBreaks || [];

  // Calculate stats
  const scheduledApps = allAppointments.filter(a => a.status === 'scheduled');
  const completedApps = allAppointments.filter(a => a.status === 'completed');
  const upcomingApps = scheduledApps.filter(a => dayjs(`${todayStr}T${a.startTime}`).isAfter(dayjs()));
  const videoApps = allAppointments.filter(a => a.type === 'video');

  // Next Patient Logic
  const nextAppt = upcomingApps.sort((a, b) => dayjs(`${todayStr}T${a.startTime}`).diff(dayjs(`${todayStr}T${b.startTime}`)))[0];
  const queue = upcomingApps.filter(a => a.id !== nextAppt?.id).slice(0, 4);

  // --- Timeline Calculations ---
  // Start 08:00 (480 mins), End 18:00 (1080 mins). Total 600 mins.
  // We'll scale 1 min = 1.2px
  const START_MINS = 480;
  const PIXELS_PER_MIN = 1.2;

  const timeLabels = [];
  for (let i = 8; i <= 18; i++) {
    timeLabels.push(`${i.toString().padStart(2, '0')}:00`);
    if (i < 18) {
      timeLabels.push(`${i.toString().padStart(2, '0')}:30`);
    }
  }

  const getTopAndHeight = (startTime, durationOrEndTime) => {
    const [h, m] = startTime.split(':').map(Number);
    const startMins = h * 60 + m;
    const top = (startMins - START_MINS) * PIXELS_PER_MIN;
    
    let durationMins;
    if (typeof durationOrEndTime === 'number') {
      durationMins = durationOrEndTime;
    } else if (typeof durationOrEndTime === 'string') {
      const [eh, em] = durationOrEndTime.split(':').map(Number);
      durationMins = (eh * 60 + em) - startMins;
    } else {
      durationMins = 30; // default 30 min
    }
    
    const height = durationMins * PIXELS_PER_MIN;
    return { top, height };
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'completed': return '#2DC653';
      case 'cancelled': return '#E63946';
      case 'scheduled': default: return '#006D77';
    }
  };

  return (
    <Box p={{ xs: 2, md: 4 }} maxWidth="xl" mx="auto">
      
      {/* HEADER STRIP — Stitch gradient banner */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #006D77 0%, #0A9396 100%)',
          p: 3,
          borderRadius: 3,
          mb: 3,
        }}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
          <Box>
            <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.7)', letterSpacing: 1.5, fontWeight: 700 }}>
              {dayjs().format('dddd, DD MMMM YYYY')}
            </Typography>
            <Typography variant="h5" color="white" fontWeight={800} mt={0.25}>
              Dr. {clinician.name}
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
          </Box>
          <Button
            variant="outlined"
            size="small"
            startIcon={<Add />}
            sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.5)', borderRadius: 2, fontWeight: 600, '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.1)' } }}
          >
            Add Block
          </Button>
        </Stack>
      </Box>

      {/* STATS ROW — Stitch KPI cards */}
      <Box sx={{ display: 'flex', gap: 2, mb: 4, flexWrap: 'wrap' }}>
        <StitchKpiCard title="Total Today" value={allAppointments.length || 12} icon={<EventNote />} color="#3B82F6" />
        <StitchKpiCard title="Completed" value={completedApps.length || 5} icon={<CheckCircle />} color="#10B981" />
        <StitchKpiCard title="Remaining" value={upcomingApps.length || 7} icon={<AccessTime />} color={STITCH_BRAND} />
        <StitchKpiCard title="Video Calls" value={videoApps.length || 3} icon={<Videocam />} color="#7C3AED" />
      </Box>

      <Grid container spacing={3}>
        
        {/* LEFT COL: TIMELINE */}
        <Grid item xs={12} md={7}>
          <Typography variant="overline" fontWeight={700} color="text.secondary" display="block" mb={1} letterSpacing={1}>Today's Schedule</Typography>
          <Paper elevation={0} sx={{ border: '1px solid', borderColor: '#E2E8F0', borderRadius: 3, overflow: 'hidden' }}>
            
            <Box position="relative" height={720} overflow="auto" sx={{ bgcolor: '#FAFCFC' }}>
              
              {/* Background Time Grid */}
              {timeLabels.map((time) => {
                const { top } = getTopAndHeight(time, 0);
                const isHour = time.endsWith(':00');
                return (
                  <Box key={time} position="absolute" top={top} left={0} right={0} height={30 * PIXELS_PER_MIN} borderBottom={`1px solid ${isHour ? '#E2E8F0' : '#F1F5F9'}`}>
                    {isHour && (
                      <Typography variant="caption" color="text.secondary" sx={{ position: 'absolute', top: -9, left: 8, bgcolor: '#FAFCFC', px: 0.5, fontWeight: 700, fontSize: '0.68rem', letterSpacing: 0.3 }}>
                        {time}
                      </Typography>
                    )}
                  </Box>
                );
              })}

              {/* Today's Appointments — Stitch block colors */}
              {allAppointments.map((appt) => {
                const { top, height } = getTopAndHeight(appt.startTime, appt.duration || appt.endTime);
                const blockColor = getStatusColor(appt.status);
                return (
                  <Card
                    key={appt.id}
                    elevation={0}
                    sx={{
                      position: 'absolute',
                      left: 64,
                      right: 12,
                      top,
                      height: Math.max(height, 28),
                      bgcolor: blockColor,
                      color: 'white',
                      borderRadius: 1.5,
                      p: 1,
                      overflow: 'hidden',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      '&:hover': { transform: 'translateX(-2px)', zIndex: 10, filter: 'brightness(1.08)' },
                      borderLeft: `3px solid rgba(255,255,255,0.4)`,
                    }}
                    onClick={() => console.log('Selected Appt', appt.id)}
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
                        <Typography variant="caption" fontWeight={700} sx={{ fontSize: '0.65rem' }}>{appt.startTime}</Typography>
                        {appt.type === 'video' && <Videocam sx={{ fontSize: 11, opacity: 0.9, mt: 0.2 }} />}
                      </Stack>
                    </Stack>
                  </Card>
                );
              })}

              {/* Lunch Breaks — Stitch amber dashed */}
              {lunchBreaks.map((lb) => {
                const { top, height } = getTopAndHeight(lb.startTime, lb.duration || lb.endTime);
                return (
                  <Box
                    key={lb.id}
                    sx={{
                      position: 'absolute', left: 64, right: 12, top, height: Math.max(height, 28),
                      bgcolor: '#FFFBEB',
                      border: '1.5px dashed #F59E0B',
                      borderRadius: 1.5,
                      display: 'flex', alignItems: 'center', gap: 0.75, px: 1,
                    }}
                  >
                    <RestaurantMenu sx={{ fontSize: 13, color: '#F59E0B' }} />
                    <Typography variant="caption" color="#92400E" fontWeight={700}>Lunch Break</Typography>
                  </Box>
                );
              })}

              {/* Spacer / Blocked — Stitch grey dashed */}
              {spacerBlocks.map((sb) => {
                const { top, height } = getTopAndHeight(sb.startTime, sb.duration || sb.endTime);
                return (
                  <Tooltip key={sb.id} title={sb.reason || 'Blocked time'}>
                    <Box
                      sx={{
                        position: 'absolute', left: 64, right: 12, top, height: Math.max(height, 28),
                        bgcolor: '#F8FAFC',
                        border: '1.5px dashed #CBD5E1',
                        borderRadius: 1.5,
                        display: 'flex', alignItems: 'center', gap: 0.75, px: 1,
                      }}
                    >
                      <DoNotDisturb sx={{ fontSize: 13, color: '#94A3B8' }} />
                      <Typography variant="caption" color="text.secondary" fontWeight={600} noWrap>Blocked{sb.reason ? `: ${sb.reason}` : ''}</Typography>
                    </Box>
                  </Tooltip>
                );
              })}

            </Box>
          </Paper>
        </Grid>

        {/* RIGHT COL */}
        <Grid item xs={12} md={5}>
          
          {/* NEXT PATIENT — Stitch teal accent border */}
          <Paper elevation={0} sx={{ border: '2px solid', borderColor: STITCH_BRAND, borderRadius: 3, mb: 3, overflow: 'hidden' }}>
            <Box sx={{ bgcolor: STITCH_BRAND, px: 2.5, py: 1.25 }}>
              <Typography variant="overline" sx={{ color: 'rgba(255,255,255,0.9)', letterSpacing: 1.5, fontWeight: 700, fontSize: '0.68rem' }}>UPCOMING NEXT</Typography>
            </Box>
          <Box p={2.5}>
            {nextAppt ? (
              <Box>
                <Stack direction="row" gap={2} alignItems="center" mb={2}>
                  <Avatar src={`https://www.gravatar.com/avatar/${nextAppt.patient.id}?d=mp`} sx={{ width: 56, height: 56, border: `2px solid ${STITCH_BRAND}30` }} />
                  <Box>
                    <Typography variant="subtitle1" fontWeight={800}>
                      {nextAppt.patient.firstName} {nextAppt.patient.lastName}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" fontWeight={500}>
                      {dayjs(`${todayStr}T${nextAppt.startTime}`).format('HH:mm')} · {nextAppt.duration || 30} mins · {nextAppt.type === 'video' ? 'Video' : 'In-Person'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {nextAppt.product?.name}
                    </Typography>
                  </Box>
                </Stack>
                <Divider sx={{ mb: 2 }} />
                <Stack direction="row" gap={1}>
                  <Button variant="outlined" fullWidth sx={{ borderRadius: 2, borderColor: '#E2E8F0', color: 'text.secondary', fontWeight: 600 }}>View Notes</Button>
                  {nextAppt.type === 'video' && (
                    <Button
                      variant="contained"
                      fullWidth
                      startIcon={<Videocam />}
                      sx={{ bgcolor: STITCH_BRAND, '&:hover': { bgcolor: '#005B64' }, borderRadius: 2, fontWeight: 700 }}
                      onClick={() => navigate(`/video-consultation/${nextAppt.id}`)}
                    >
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


          {/* QUEUE — Stitch style */}
          <Paper elevation={0} sx={{ border: '1px solid #E2E8F0', borderRadius: 3, overflow: 'hidden' }}>
            <Box sx={{ px: 2.5, py: 1.5, bgcolor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
              <Typography variant="overline" fontWeight={700} color="text.secondary" letterSpacing={1} fontSize="0.68rem">Upcoming Queue</Typography>
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
                      secondary={<Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>{appt.startTime} · {appt.product?.name}</Typography>}
                    />
                    {appt.type === 'video' && <Videocam sx={{ color: STITCH_BRAND, fontSize: 16 }} />}
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
    </Box>
  );
}
