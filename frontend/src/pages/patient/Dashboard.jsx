import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, gql } from '@apollo/client';
import {
  Box, Grid, Paper, Typography, Stack, Button, Avatar, Card, CardActions,
  Chip, List, ListItem, ListItemAvatar, ListItemText, CircularProgress, Alert,
  Skeleton, Dialog, DialogTitle, DialogContent, DialogActions as MuiDialogActions,
} from '@mui/material';
import {
  Add, CalendarMonth, CheckCircle, AccessTime, Cancel, Videocam,
  Payment, Settings, Warning, ArrowForward, EventRepeat,
} from '@mui/icons-material';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { useAuth } from '../../hooks/useAuth';

// Initialize the plugin for relative time formatting
dayjs.extend(relativeTime);

// --- GraphQL Queries ---

const GET_PATIENT_DASHBOARD_DATA = gql`
  query GetPatientDashboardData($userId: ID!) {
    getPatientAppointments(patientId: $userId, status: "scheduled") {
      id
      startTime
      endTime
      status
      type
      duration
      clinician {
        id
        name
        clinicianType
      }
    }
    getNotifications(userId: $userId, limit: 5) {
      id
      title
      message
      type
      createdAt
    }
    getPatientKpis(patientId: $userId) {
      total
      completed
      upcoming
      cancelled
    }
  }
`;

// --- Mock Data Fallback (SUG-PTDASH-004) ---
const MOCK_UPCOMING = [
  {
    id: 'm1', startTime: '2026-04-10T10:00:00Z', endTime: '2026-04-10T10:30:00Z',
    status: 'scheduled', type: 'video', duration: 30,
    clinician: { id: 'c1', name: 'Dr. Sarah Johnson', clinicianType: 'Cardiologist' },
  },
  {
    id: 'm2', startTime: '2026-04-15T14:00:00Z', endTime: '2026-04-15T14:30:00Z',
    status: 'scheduled', type: 'in-person', duration: 45,
    clinician: { id: 'c2', name: 'Dr. Marcus Osei', clinicianType: 'Neurologist' },
  },
];
const MOCK_NOTIFICATIONS = [
  { id: 'n1', title: 'Appointment Confirmed', message: 'Your video appointment with Dr. Sarah Johnson is confirmed for 10 Apr at 10:00 AM.', type: 'appointment', createdAt: new Date(Date.now() - 2 * 60000).toISOString() },
  { id: 'n2', title: 'Payment Successful', message: '£85 has been charged for your Cardiology consultation.', type: 'payment', createdAt: new Date(Date.now() - 30 * 60000).toISOString() },
];
const MOCK_KPIS = { total: 12, completed: 9, upcoming: 2, cancelled: 1 };

// --- Helper Components ---

const DataCard = ({ title, value, icon, color }) => (
  <Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
    <Box sx={{ bgcolor: `${color}15`, p: 1.5, borderRadius: 2, display: 'flex' }}>
      {React.cloneElement(icon, { sx: { color, fontSize: 32 } })}
    </Box>
    <Box>
      <Typography variant="h4" fontWeight={700} color="text.primary">{value}</Typography>
      <Typography variant="body2" color="text.secondary" fontWeight={500}>{title}</Typography>
    </Box>
  </Paper>
);

const StatusChip = ({ status }) => {
  const getProps = () => {
    switch (status) {
      case 'scheduled': return { color: 'info', label: 'Scheduled' };
      case 'completed': return { color: 'success', label: 'Completed' };
      case 'cancelled': return { color: 'error', label: 'Cancelled' };
      default: return { color: 'default', label: status };
    }
  };
  return <Chip size="small" variant="filled" {...getProps()} />;
};

// SUG-PTDASH-006: Dynamic greeting based on time of day
function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function PatientDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // SUG-PTDASH-003: Cancel dialog state
  const [cancelId, setCancelId] = useState(null);
  // SUG-PTDASH-012: Optimistic cancel in mock mode — locally hide cancelled ids
  const [cancelledIds, setCancelledIds] = useState(() => new Set());

  const { data, loading, error } = useQuery(GET_PATIENT_DASHBOARD_DATA, {
    variables: { userId: user?.id },
    skip: !user?.id,
  });

  if (!user) return <Alert severity="warning">Please log in to view your dashboard.</Alert>;

  // SUG-PTDASH-004: Mock fallbacks when backend offline
  // SUG-PTDASH-012: filter out optimistically-cancelled appointments
  const upcomingAppointments = (data?.getPatientAppointments || MOCK_UPCOMING).filter(a => !cancelledIds.has(a.id));
  const notifications = data?.getNotifications || MOCK_NOTIFICATIONS;
  const kpis = data?.getPatientKpis || { ...MOCK_KPIS, upcoming: upcomingAppointments.length };

  // Guard: safe clinician extraction (E1: null clinician.id)
  const uniqueClinicians = Array.from(
    new Map(
      upcomingAppointments
        .filter(a => a.clinician?.id)
        .map(a => [a.clinician.id, a.clinician])
    ).values()
  ).slice(0, 3);

  // SUG-PTDASH-003: Handlers for Reschedule and Cancel
  const handleReschedule = (apptId) => navigate(`/patient/appointments?reschedule=${apptId}`);
  const handleCancelConfirm = () => {
    // In production: call CANCEL_APPOINTMENT mutation
    // SUG-PTDASH-012: Mock mode — optimistically remove the card from the list
    setCancelledIds(prev => new Set(prev).add(cancelId));
    setCancelId(null);
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'appointment': return <CalendarMonth color="primary" />;
      case 'payment': return <Payment color="success" />;
      case 'system': return <Settings color="action" />;
      case 'alert': return <Warning color="error" />;
      default: return <CalendarMonth color="primary" />;
    }
  };

  const renderWelcomeBanner = () => (
    <Paper
      elevation={0}
      sx={{
        background: 'linear-gradient(135deg, #004D55 0%, #0A9396 100%)',
        p: 4,
        borderRadius: 3,
        mb: 3,
        color: 'white'
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
        <Box>
          {/* SUG-PTDASH-006: Dynamic greeting */}
          <Typography variant="h5" fontWeight={700} gutterBottom>
            {getGreeting()}, {user?.firstName || user?.name?.split(' ')[0] || 'Patient'}
          </Typography>
          <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.8)' }}>
            Here's a quick overview of your health schedule and upcoming tasks.
          </Typography>

          <Stack direction="row" gap={2} mt={3} flexWrap="wrap">
            <Button
              variant="outlined"
              startIcon={<Add />}
              onClick={() => navigate('/appointments/book')}
              aria-label="Book a new appointment"
              sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.6)', '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.1)' } }}
            >
              Book Appointment
            </Button>
            <Button
              variant="outlined"
              onClick={() => navigate('/patient/appointments')}
              aria-label="View all appointments"
              sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.6)', '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.1)' } }}
            >
              View All
            </Button>
          </Stack>
        </Box>

        <Box sx={{ display: { xs: 'none', md: 'block' }, ml: 'auto' }}>
          <Avatar
            src={`https://www.gravatar.com/avatar/${user?.id}?d=mp&s=120`}
            sx={{ width: 100, height: 100, border: '4px solid rgba(255,255,255,0.2)' }}
          />
        </Box>
      </Stack>
    </Paper>
  );

  // SUG-PTDASH-005: Loading skeleton
  if (loading) return (
    <Box p={{ xs: 2, md: 4 }} maxWidth="xl" mx="auto">
      {renderWelcomeBanner()}
      <Grid container spacing={2} mb={4}>
        {[1, 2, 3, 4].map(i => (
          <Grid item xs={6} sm={3} key={i}>
            <Skeleton variant="rectangular" height={80} sx={{ borderRadius: 3 }} />
          </Grid>
        ))}
      </Grid>
      <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 3 }} />
    </Box>
  );

  return (
    <Box p={{ xs: 2, md: 4 }} maxWidth="xl" mx="auto">
      {renderWelcomeBanner()}

      {/* SUG-PTDASH-008: Apollo error state */}
      {error && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Could not load live dashboard data — showing demo information.
        </Alert>
      )}

      <Grid container spacing={2} mb={4}>
        <Grid item xs={6} sm={3}>
          <DataCard title="Total Visits" value={kpis.total} icon={<CalendarMonth />} color="#3A86FF" />
        </Grid>
        <Grid item xs={6} sm={3}>
          <DataCard title="Completed" value={kpis.completed} icon={<CheckCircle />} color="#2DC653" />
        </Grid>
        <Grid item xs={6} sm={3}>
          <DataCard title="Upcoming" value={kpis.upcoming} icon={<AccessTime />} color="#006D77" />
        </Grid>
        <Grid item xs={6} sm={3}>
          <DataCard title="Cancelled" value={kpis.cancelled} icon={<Cancel />} color="#E63946" />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Left Column - Main Content */}
        <Grid item xs={12} md={8}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6" fontWeight={700}>Upcoming Appointments</Typography>
            <Button endIcon={<ArrowForward />} onClick={() => navigate('/patient/appointments')}>View all</Button>
          </Box>

          {upcomingAppointments.length === 0 ? (
            <Paper elevation={0} sx={{ p: 4, textAlign: 'center', border: '1px dashed', borderColor: 'divider', borderRadius: 3 }}>
              <Typography color="text.secondary" mb={2}>You have no upcoming appointments.</Typography>
              <Button variant="contained" onClick={() => navigate('/appointments/book')}>Find a Doctor</Button>
            </Paper>
          ) : (
            upcomingAppointments.map(appt => {
              const startDateTime = dayjs(appt.startTime);
              const statusColor = appt.status === 'scheduled' ? '#006D77' : appt.status === 'completed' ? '#2DC653' : '#E63946';

              return (
                <Card
                  key={appt.id}
                  elevation={0}
                  sx={{
                    mb: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderLeft: `4px solid ${statusColor}`,
                    borderRadius: 2
                  }}
                >
                  <Box p={2} display="flex" flexWrap="wrap" gap={2}>
                    {/* Date Block */}
                    <Box
                      sx={{
                        bgcolor: 'primary.main',
                        color: 'white',
                        borderRadius: 2,
                        p: 1.5,
                        minWidth: 70,
                        textAlign: 'center',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center'
                      }}
                    >
                      <Typography variant="body2" fontWeight={600} sx={{ textTransform: 'uppercase', opacity: 0.9 }}>
                        {startDateTime.format('MMM')}
                      </Typography>
                      <Typography variant="h5" fontWeight={800} lineHeight={1}>
                        {startDateTime.format('D')}
                      </Typography>
                    </Box>

                    {/* Content Block */}
                    <Box flexGrow={1}>
                      <Stack direction="row" alignItems="center" gap={2}>
                        <Avatar src={`https://www.gravatar.com/avatar/${appt.clinician?.id}?d=mp`} sx={{ width: 48, height: 48 }} />
                        <Box>
                          <Typography variant="subtitle1" fontWeight={700}>{appt.clinician?.name}</Typography>
                          <Typography variant="body2" color="text.secondary">{appt.clinician?.clinicianType}</Typography>
                        </Box>
                      </Stack>

                      <Stack direction="row" flexWrap="wrap" gap={1} mt={1.5}>
                        <Chip size="small" icon={<AccessTime fontSize="small" />} label={`${startDateTime.format('h:mm A')} (${appt.duration || 30} min)`} />
                        <Chip size="small" icon={appt.type === 'video' ? <Videocam fontSize="small" /> : <CalendarMonth fontSize="small" />} label={appt.type === 'video' ? 'Video Consult' : 'In-Person'} variant="outlined" />
                        <StatusChip status={appt.status} />
                      </Stack>
                    </Box>
                  </Box>

                  <CardActions sx={{ px: 2, pb: 2, pt: 0, justifyContent: 'flex-start', flexWrap: 'wrap' }}>
                    {appt.type === 'video' && appt.status === 'scheduled' && (
                      <Button
                        variant="contained" color="secondary" size="small" startIcon={<Videocam />}
                        onClick={() => navigate(`/video/${appt.id}`)}
                        aria-label={`Join video call with ${appt.clinician?.name}`}
                      >
                        Join Video
                      </Button>
                    )}
                    {/* SUG-PTDASH-003: Reschedule handler */}
                    <Button
                      variant="outlined" size="small" startIcon={<EventRepeat />}
                      onClick={() => handleReschedule(appt.id)}
                      aria-label={`Reschedule appointment with ${appt.clinician?.name}`}
                    >
                      Reschedule
                    </Button>
                    {/* SUG-PTDASH-003: Cancel handler with dialog */}
                    <Button
                      color="error" size="small" startIcon={<Cancel />}
                      onClick={() => setCancelId(appt.id)}
                      aria-label={`Cancel appointment with ${appt.clinician?.name}`}
                    >
                      Cancel
                    </Button>
                  </CardActions>
                </Card>
              );
            })
          )}
        </Grid>

        {/* Right Column - Side Content */}
        <Grid item xs={12} md={4}>
          <Paper elevation={0} sx={{ p: 2.5, mb: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
              <Typography variant="h6" fontWeight={700}>Your Doctors</Typography>
              {/* SUG-PTDASH-010: View all link */}
              <Button size="small" onClick={() => navigate('/patient/appointments')} sx={{ fontSize: '0.75rem' }}>View all</Button>
            </Box>

            {uniqueClinicians.length === 0 ? (
              <Typography variant="body2" color="text.secondary" py={2}>No recent doctors found.</Typography>
            ) : (
              <List disablePadding>
                {uniqueClinicians.map((clinician, idx) => (
                  <ListItem key={clinician.id} disableGutters divider={idx !== uniqueClinicians.length - 1}>
                    <ListItemAvatar>
                      <Avatar src={`https://www.gravatar.com/avatar/${clinician.id}?d=mp`} />
                    </ListItemAvatar>
                    <ListItemText
                      primary={<Typography variant="subtitle2" fontWeight={600}>{clinician.name}</Typography>}
                      secondary={<Typography variant="caption" color="text.secondary">{clinician.clinicianType}</Typography>}
                    />
                    <Button size="small" variant="outlined" onClick={() => navigate(`/appointments/book?clinician=${clinician.id}`)}>Book</Button>
                  </ListItem>
                ))}
              </List>
            )}
          </Paper>

          <Paper elevation={0} sx={{ p: 2.5, border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
              <Typography variant="h6" fontWeight={700}>Recent Activity</Typography>
              {/* SUG-PTDASH-010: View all link */}
              <Button size="small" onClick={() => navigate('/notifications')} sx={{ fontSize: '0.75rem' }}>View all</Button>
            </Box>

            {notifications.length === 0 ? (
              <Typography variant="body2" color="text.secondary" py={2}>No recent activity.</Typography>
            ) : (
              <List disablePadding>
                {/* SUG-PTDASH-007: Client-side limit */}
                {notifications.slice(0, 5).map((notif, idx) => (
                  <ListItem key={notif.id || idx} disableGutters alignItems="flex-start" divider={idx !== Math.min(notifications.length, 5) - 1} sx={{ py: 1.5 }}>
                    <ListItemAvatar sx={{ minWidth: 40, mt: 0.5 }}>
                      <Box sx={{ bgcolor: 'action.hover', p: 1, borderRadius: '50%', display: 'inline-flex' }}>
                        {getNotificationIcon(notif.type)}
                      </Box>
                    </ListItemAvatar>
                    <ListItemText
                      primary={<Typography variant="subtitle2" fontWeight={600} mb={0.5}>{notif.title}</Typography>}
                      secondary={
                        <Box>
                          <Typography variant="body2" color="text.secondary" sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {notif.message}
                          </Typography>
                          <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 0.5 }}>
                            {dayjs(notif.createdAt).fromNow()}
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* SUG-PTDASH-003: Cancel Confirmation Dialog */}
      <Dialog open={Boolean(cancelId)} onClose={() => setCancelId(null)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>Cancel Appointment?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Are you sure you want to cancel this appointment? This action cannot be undone.
          </Typography>
        </DialogContent>
        <MuiDialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setCancelId(null)} sx={{ textTransform: 'none' }}>Keep Appointment</Button>
          <Button
            id="dashboard-confirm-cancel-btn"
            color="error" variant="contained"
            onClick={handleCancelConfirm}
            sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
          >
            Yes, Cancel
          </Button>
        </MuiDialogActions>
      </Dialog>
    </Box>
  );
}
