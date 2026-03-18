import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, gql } from '@apollo/client';
import {
  Box, Grid, Paper, Typography, Button, Drawer, IconButton,
  List, ListItem, ListItemText, Chip, FormControl, InputLabel,
  RadioGroup, FormControlLabel, Radio, TextField, Stack,
  ToggleButtonGroup, ToggleButton, Switch, FormGroup, CircularProgress, Alert, Tooltip
} from '@mui/material';
import {
  Add, Close, Edit, DeleteOutline, Alarm
} from '@mui/icons-material';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import { useAuth } from '../../hooks/useAuth';

// --- GraphQL ---

const GET_AVAILABILITY_DATA = gql`
  query GetAvailabilityData($clinicianId: ID!) {
    getClinicianAvailability(clinicianId: $clinicianId) {
      id
      dayOfWeek
      startTime
      endTime
      recurrenceType
      validFrom
      validUntil
      roomId
    }
    getLunchBreaks(clinicianId: $clinicianId) {
      id
      dayOfWeek
      startTime
      endTime
    }
    getClinician(id: $clinicianId) {
      id
      clinic {
        id
      }
    }
  }
`;

const GET_ROOMS = gql`
  query GetRooms($clinicId: ID!) {
    getRooms(clinicId: $clinicId) {
      id
      name
      roomNumber
    }
  }
`;

const SAVE_AVAILABILITY = gql`
  mutation SaveAvailability($input: ClinicianAvailabilityInput!) {
    saveClinicianAvailability(input: $input) {
      id
    }
  }
`;

const DELETE_AVAILABILITY = gql`
  mutation DeleteAvailability($id: ID!) {
    deleteClinicianAvailability(id: $id)
  }
`;

// Helper map
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function ClinicianAvailability() {
  const { user } = useAuth();
  
  // State
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editSlot, setEditSlot] = useState(null);
  const [saving, setSaving] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    recurrence_type: 'weekly', // single | daily | weekly | monthly | custom
    day_of_week: '0', 
    start_time: dayjs().hour(9).minute(0),
    end_time: dayjs().hour(17).minute(0),
    room_id: '',
    valid_from: null,
    valid_until: null,
    exclude_weekends: false,
    exclude_saturday: false,
    exclude_sunday: false,
  });

  // Queries
  const { data: avData, loading: avLoading, error: avError, refetch } = useQuery(GET_AVAILABILITY_DATA, {
    variables: { clinicianId: user?.id },
    skip: !user?.id,
  });

  const clinicId = avData?.getClinician?.clinic?.id;

  const { data: roomData } = useQuery(GET_ROOMS, {
    variables: { clinicId },
    skip: !clinicId,
  });

  // Mutations
  const [saveAvailability] = useMutation(SAVE_AVAILABILITY);
  const [deleteAvailability] = useMutation(DELETE_AVAILABILITY);

  // Processing Data
  const availabilities = useMemo(() => avData?.getClinicianAvailability || [], [avData]);
  const lunchBreaks = useMemo(() => avData?.getLunchBreaks || [], [avData]);
  const rooms = useMemo(() => roomData?.getRooms || [], [roomData]);

  // Handlers
  const handleOpenDrawer = (dayIndex = 0, slot = null) => {
    if (slot) {
      setEditSlot(slot);
      setFormData({
        recurrence_type: slot.recurrenceType || 'weekly',
        day_of_week: slot.dayOfWeek,
        start_time: dayjs(`2024-01-01T${slot.startTime}`),
        end_time: dayjs(`2024-01-01T${slot.endTime}`),
        room_id: slot.roomId || '',
        valid_from: slot.validFrom ? dayjs(slot.validFrom) : null,
        valid_until: slot.validUntil ? dayjs(slot.validUntil) : null,
        exclude_weekends: false,
        exclude_saturday: false,
        exclude_sunday: false,
      });
    } else {
      setEditSlot(null);
      setFormData(prev => ({ 
        ...prev, 
        day_of_week: String(dayIndex),
        start_time: dayjs().hour(9).minute(0),
        end_time: dayjs().hour(17).minute(0),
        room_id: rooms.length > 0 ? rooms[0].id : ''
      }));
    }
    setDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setDrawerOpen(false);
    setEditSlot(null);
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const input = {
        clinicianId: user.id,
        recurrenceType: formData.recurrence_type,
        dayOfWeek: formData.day_of_week,
        startTime: formData.start_time.format('HH:mm'),
        endTime: formData.end_time.format('HH:mm'),
        roomId: formData.room_id || null,
        validFrom: formData.valid_from ? formData.valid_from.format('YYYY-MM-DD') : null,
        validUntil: formData.valid_until ? formData.valid_until.format('YYYY-MM-DD') : null,
      };

      if (editSlot) {
        input.id = editSlot.id;
      }

      await saveAvailability({ variables: { input } });
      await refetch();
      handleCloseDrawer();
    } catch (err) {
      console.error(err);
      alert("Failed to save availability. Check console.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Delete this availability slot?")) {
      try {
        await deleteAvailability({ variables: { id } });
        refetch();
        if (editSlot?.id === id) handleCloseDrawer();
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Render Helpers
  const renderDaySchedule = (dayName, dayIndex) => {
    // Filter matching slots (day_of_week string format matching DAYS standard or daily)
    const matchingAvails = availabilities.filter(a => 
      a.dayOfWeek === String(dayIndex) || 
      a.dayOfWeek === dayName || 
      a.recurrenceType === 'daily'
    );
    
    const matchingLunches = lunchBreaks.filter(lb => 
      lb.dayOfWeek === String(dayIndex) || 
      lb.dayOfWeek === dayName ||
      lb.dayOfWeek === 'daily'
    );

    // Sort by start time mathematically
    const sortedItems = [...matchingAvails, ...matchingLunches].sort((a, b) => {
      return a.startTime.localeCompare(b.startTime);
    });

    return (
      <Grid item xs={1} key={dayIndex} sx={{ minWidth: 140 }}>
        <Paper 
          elevation={0} 
          sx={{ 
            p: 1.5, 
            height: '100%', 
            minHeight: 280, 
            border: '1px solid', 
            borderColor: 'divider', 
            borderRadius: 2,
            bgcolor: '#f8fafc',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          <Typography variant="subtitle2" fontWeight={800} color="text.secondary" mb={2} align="center" sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>
            {dayName}
          </Typography>

          <Box flexGrow={1}>
            {sortedItems.map((item, idx) => {
              const isLunch = item.__typename === 'LunchBreak' || item.id?.includes('lunch'); // mock check
              
              if (isLunch) {
                return (
                  <Box 
                    key={`lb-${idx}`}
                    sx={{ 
                      bgcolor: 'warning.light', 
                      border: '1px dashed', 
                      borderColor: 'warning.main', 
                      borderRadius: 1.5, 
                      p: 1, 
                      mb: 1 
                    }}
                  >
                    <Typography variant="caption" color="warning.dark" fontWeight={700} display="block">
                       LUNCH
                    </Typography>
                    <Typography variant="caption" color="warning.dark" fontWeight={600}>
                      {item.startTime} - {item.endTime}
                    </Typography>
                  </Box>
                );
              }

              const roomName = rooms.find(r => r.id === item.roomId)?.name || 'Consulting Room';

              return (
                <Tooltip key={item.id} title={`Edit ${item.startTime} - ${item.endTime} in ${roomName}`} placement="top">
                  <Box 
                    sx={{ 
                      bgcolor: 'primary.main', 
                      color: 'white',
                      borderRadius: 1.5, 
                      p: 1.5, 
                      mb: 1, 
                      cursor: 'pointer',
                      transition: 'transform 0.1s, box-shadow 0.1s',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                      '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 4px 8px rgba(0,0,0,0.15)', opacity: 0.95 }
                    }}
                    onClick={() => handleOpenDrawer(dayIndex, item)}
                  >
                    <Typography variant="body2" fontWeight={800} letterSpacing={0.5} display="block" mb={0.5}>
                      {item.startTime} — {item.endTime}
                    </Typography>
                    <Typography variant="caption" sx={{ opacity: 0.85, display: 'block', lineHeight: 1.2 }}>
                      {roomName}
                    </Typography>
                  </Box>
                </Tooltip>
              );
            })}
          </Box>

          <Button 
            size="small" 
            startIcon={<Add />} 
            onClick={() => handleOpenDrawer(dayIndex)}
            fullWidth 
            variant="outlined" 
            sx={{ mt: 2, bgcolor: 'white', borderStyle: 'dashed' }}
          >
            Add Slot
          </Button>
        </Paper>
      </Grid>
    );
  };


  if (avLoading) return <Box p={4} display="flex" justifyContent="center"><CircularProgress /></Box>;
  if (avError) return <Box p={4}><Alert severity="error">{avError.message}</Alert></Box>;

  return (
    <Box p={{ xs: 2, md: 4 }} maxWidth="xl" mx="auto">
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Box>
           <Typography variant="h4" fontWeight={800} gutterBottom>Availability Setup</Typography>
           <Typography variant="body1" color="text.secondary">Configure your working hours, recurring blocks, and lunch breaks.</Typography>
        </Box>
      </Box>

      {/* 7-DAY GRID */}
      <Box sx={{ overflowX: 'auto', pb: 2 }}>
        <Grid container spacing={2} sx={{ width: 'max-content', minWidth: '100%' }}>
          {DAYS.map((dayName, dayIndex) => renderDaySchedule(dayName, dayIndex))}
        </Grid>
      </Box>

      {/* LUNCH BREAKS SECTION */}
      <Paper elevation={0} sx={{ p: 3, mt: 4, border: '1px solid', borderColor: 'divider', borderRadius: 3, maxWidth: 600 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6" fontWeight={700}>Standard Lunch Breaks</Typography>
          <Button size="small" variant="text" startIcon={<Add />}>Add Break</Button>
        </Box>
        
        {lunchBreaks.length === 0 ? (
          <Typography variant="body2" color="text.secondary">No fixed lunch breaks configured. Click 'Add Break' to setup global breaks.</Typography>
        ) : (
          <List disablePadding>
            {lunchBreaks.map((lb, idx) => (
              <ListItem key={lb.id} divider={idx !== lunchBreaks.length - 1} sx={{ px: 0 }}>
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: 'warning.light', color: 'warning.dark' }}><Alarm /></Avatar>
                </ListItemAvatar>
                <ListItemText 
                  primary={<Typography variant="subtitle2" fontWeight={600}>{lb.startTime} — {lb.endTime}</Typography>} 
                  secondary={<Typography variant="caption" color="text.secondary">Every {lb.dayOfWeek === 'daily' ? 'Day' : DAYS[lb.dayOfWeek] || lb.dayOfWeek}</Typography>} 
                />
                <Chip size="small" label="Recurring" color="default" variant="outlined" />
                <IconButton size="small" sx={{ ml: 2 }}><Edit fontSize="small" /></IconButton>
                <IconButton size="small" color="error"><DeleteOutline fontSize="small" /></IconButton>
              </ListItem>
            ))}
          </List>
        )}
      </Paper>

      {/* RIGHT DRAWER: EDIT SLOT */}
      <Drawer 
        anchor="right" 
        open={drawerOpen} 
        onClose={handleCloseDrawer}
        PaperProps={{ sx: { width: { xs: '100%', sm: 480 }, p: 3, borderRadius: '24px 0 0 24px' } }}
      >
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
          <Typography variant="h5" fontWeight={800}>
            {editSlot ? 'Edit Slot' : 'New Availability Slot'}
          </Typography>
          <IconButton onClick={handleCloseDrawer}><Close /></IconButton>
        </Box>

        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <Stack spacing={4}>
            {/* RECURRENCE */}
            <FormControl>
              <Typography variant="subtitle2" fontWeight={700} gutterBottom>1. Recurrence Pattern</Typography>
              <RadioGroup 
                row 
                value={formData.recurrence_type} 
                onChange={(e) => handleChange('recurrence_type', e.target.value)}
                sx={{ 
                  bgcolor: '#f8fafc', p: 1, borderRadius: 2, border: '1px solid', borderColor: 'divider',
                  '& .MuiFormControlLabel-root': { flex: 1, m: 0 }
                }}
              >
                <FormControlLabel value="single" control={<Radio size="small" />} label={<Typography variant="body2">Once</Typography>} />
                <FormControlLabel value="daily" control={<Radio size="small" />} label={<Typography variant="body2">Daily</Typography>} />
                <FormControlLabel value="weekly" control={<Radio size="small" />} label={<Typography variant="body2" fontWeight={600}>Weekly</Typography>} />
                <FormControlLabel value="monthly" control={<Radio size="small" />} label={<Typography variant="body2">Monthly</Typography>} />
              </RadioGroup>
            </FormControl>

            {/* CONDITIONAL DAY SELECTOR (WEEKLY) */}
            {formData.recurrence_type === 'weekly' && (
              <Box>
                <Typography variant="subtitle2" fontWeight={700} gutterBottom>Select Repeat Day</Typography>
                <ToggleButtonGroup 
                  value={formData.day_of_week} 
                  exclusive
                  onChange={(e, val) => val && handleChange('day_of_week', val)} 
                  size="small"
                  fullWidth
                >
                  <ToggleButton value="0">M</ToggleButton>
                  <ToggleButton value="1">T</ToggleButton>
                  <ToggleButton value="2">W</ToggleButton>
                  <ToggleButton value="3">T</ToggleButton>
                  <ToggleButton value="4">F</ToggleButton>
                  <ToggleButton value="5">S</ToggleButton>
                  <ToggleButton value="6">S</ToggleButton>
                </ToggleButtonGroup>
              </Box>
            )}

            {/* TIME BLOCK */}
            <Box>
               <Typography variant="subtitle2" fontWeight={700} gutterBottom>2. Time Block</Typography>
               <Grid container spacing={2}>
                 <Grid item xs={6}>
                   <TimePicker 
                    label="Start Time" 
                    value={formData.start_time} 
                    onChange={(val) => handleChange('start_time', val)}
                    sx={{ width: '100%' }}
                   />
                 </Grid>
                 <Grid item xs={6}>
                   <TimePicker 
                    label="End Time" 
                    value={formData.end_time} 
                    onChange={(val) => handleChange('end_time', val)}
                    sx={{ width: '100%' }}
                   />
                 </Grid>
               </Grid>
               {formData.end_time.isBefore(formData.start_time) && (
                 <Alert severity="error" sx={{ mt: 1, py: 0 }}>End time must be after start time</Alert>
               )}
            </Box>

            {/* ROOM */}
            <Box>
               <Typography variant="subtitle2" fontWeight={700} gutterBottom>3. Location</Typography>
               <TextField 
                 select
                 fullWidth
                 label="Consulting Room"
                 value={formData.room_id}
                 onChange={(e) => handleChange('room_id', e.target.value)}
                 SelectProps={{ native: true }}
               >
                 <option value="" disabled>Select a room...</option>
                 {rooms.map(r => (
                   <option key={r.id} value={r.id}>{r.name} (Room {r.roomNumber})</option>
                 ))}
               </TextField>
            </Box>

            {/* VALIDITY PERIOD */}
            {formData.recurrence_type !== 'single' && (
              <Box>
                <Typography variant="subtitle2" fontWeight={700} gutterBottom>4. Validity Range (Optional)</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <DatePicker 
                      label="Valid From" 
                      value={formData.valid_from} 
                      onChange={(val) => handleChange('valid_from', val)}
                      slotProps={{ textField: { fullWidth: true } }}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <DatePicker 
                      label="Valid Until" 
                      value={formData.valid_until} 
                      onChange={(val) => handleChange('valid_until', val)}
                      slotProps={{ textField: { fullWidth: true } }}
                    />
                  </Grid>
                </Grid>
                
                {formData.recurrence_type === 'daily' && (
                  <FormGroup sx={{ mt: 2 }}>
                    <FormControlLabel control={<Switch checked={formData.exclude_weekends} onChange={e => handleChange('exclude_weekends', e.target.checked)} />} label={<Typography variant="body2">Exclude Weekends</Typography>} />
                  </FormGroup>
                )}
              </Box>
            )}
          </Stack>
        </LocalizationProvider>

        {/* ACTIONS */}
        <Box flexGrow={1} />
        <Stack direction="row" justifyContent="space-between" mt={4} pt={3} borderTop="1px solid" borderColor="divider">
          {editSlot ? (
            <Button color="error" onClick={() => handleDelete(editSlot.id)} disabled={saving}>Delete</Button>
          ) : (
            <Box />
          )}
          <Stack direction="row" gap={2}>
            <Button onClick={handleCloseDrawer} disabled={saving} variant="outlined">Cancel</Button>
            <Button 
              variant="contained" 
              onClick={handleSave} 
              disabled={saving || formData.end_time.isBefore(formData.start_time)}
            >
              {saving ? 'Saving...' : 'Save Slot'}
            </Button>
          </Stack>
        </Stack>

      </Drawer>
    </Box>
  );
}
