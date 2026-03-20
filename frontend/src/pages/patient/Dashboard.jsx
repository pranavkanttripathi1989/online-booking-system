import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, gql } from '@apollo/client';
import {
  Box, Grid, Paper, Typography, Stack, Button, Avatar, Card, CardActions,
  Chip, List, ListItem, ListItemAvatar, ListItemText, CircularProgress, Alert
} from '@mui/material';
import {
  Add, CalendarMonth, CheckCircle, AccessTime, Cancel, Videocam,
  Payment, Settings, Warning, ArrowForward
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
    # Assuming getNotifications is available based on instructions
    getNotifications(userId: $userId, limit: 5) {
      id
      title
      message
      type
      createdAt
    }
    # For KPI numbers
    getPatientKpis(patientId: $userId) {
      total
      completed
      upcoming
      cancelled
    }
  }
`;

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

export default function PatientDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // We are passing user.id as both patientId and userId
  const { data, loading, error } = useQuery(GET_PATIENT_DASHBOARD_DATA, {
    variables: { userId: user?.id },
    skip: !user?.id,
  });

  if (!user) return <Alert severity="warning">Please log in to view your dashboard.</Alert>;

  const upcomingAppointments = data?.getPatientAppointments || [];
  const notifications = data?.getNotifications || [];
  const kpis = data?.getPatientKpis || { total: 0, completed: 0, upcoming: upcomingAppointments.length, cancelled: 0 };

  // For the 'Your Doctors' section, we can extract unique clinicians from recent appointments, or mock it if empty
  const uniqueClinicians = Array.from(
    new Map(upcomingAppointments.map(app => [app.clinician.id, app.clinician])).values()
  ).slice(0, 3);

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
          <Typography variant="h5" fontWeight={700} gutterBottom>
            Good morning, {user?.firstName || user?.name?.split(' ')[0] || 'Patient'}
          </Typography>
          <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.8)' }}>
            Here's a quick overview of your health schedule and upcoming tasks.
          </Typography>
          
          <Stack direction="row" gap={2} mt={3} flexWrap="wrap">
            <Button 
              variant="outlined" 
              startIcon={<Add />}
              onClick={() => navigate('/appointments/book')}
              sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.6)', '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.1)' } }}
            >
              Book Appointment
            </Button>
            <Button 
              variant="outlined"
              onClick={() => navigate('/patient/appointments')}
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

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'appointment': return <CalendarMonth color="primary" />;
      case 'payment': return <Payment color="success" />;
      case 'system': return <Settings color="action" />;
      case 'alert': return <Warning color="error" />;
      default: return <CalendarMonth color="primary" />;
    }
  };

  // NOTE: Not blocking on loading — mock data fallbacks above ensure immediate render.

  return (
    <Box p={{ xs: 2, md: 4 }} maxWidth="xl" mx="auto">
      {renderWelcomeBanner()}

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
                        <Avatar src={`https://www.gravatar.com/avatar/${appt.clinician.id}?d=mp`} sx={{ width: 48, height: 48 }} />
                        <Box>
                          <Typography variant="subtitle1" fontWeight={700}>{appt.clinician.name}</Typography>
                          <Typography variant="body2" color="text.secondary">{appt.clinician.clinicianType}</Typography>
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
                      <Button variant="contained" color="secondary" size="small" startIcon={<Videocam />}>
                        Join Video
                      </Button>
                    )}
                    <Button variant="outlined" size="small">Reschedule</Button>
                    <Button color="error" size="small">Cancel</Button>
                  </CardActions>
                </Card>
              );
            })
          )}
        </Grid>

        {/* Right Column - Side Content */}
        <Grid item xs={12} md={4}>
          <Paper elevation={0} sx={{ p: 2.5, mb: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
            <Typography variant="h6" fontWeight={700} gutterBottom>Your Doctors</Typography>
            
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
                    <Button size="small" variant="outlined" onClick={() => navigate(`/clinician/${clinician.id}`)}>Book</Button>
                  </ListItem>
                ))}
              </List>
            )}
          </Paper>

          <Paper elevation={0} sx={{ p: 2.5, border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
            <Typography variant="h6" fontWeight={700} gutterBottom>Recent Activity</Typography>
            
            {notifications.length === 0 ? (
              <Typography variant="body2" color="text.secondary" py={2}>No recent activity.</Typography>
            ) : (
              <List disablePadding>
                {notifications.map((notif, idx) => (
                  <ListItem key={notif.id || idx} disableGutters alignItems="flex-start" divider={idx !== notifications.length - 1} sx={{ py: 1.5 }}>
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
    </Box>
  );
}
