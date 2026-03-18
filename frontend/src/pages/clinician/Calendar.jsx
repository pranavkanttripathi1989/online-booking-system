import React, { useState } from 'react';
import {
  Box, Grid, Typography, Card, CardContent, Stack, Button, Chip, Avatar,
  Paper, IconButton, Tooltip, Divider,
} from '@mui/material';
import { StatusChip, PatientAvatar } from '../../components/shared';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import TodayIcon from '@mui/icons-material/Today';
import VideocamIcon from '@mui/icons-material/Videocam';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import { useNavigate } from 'react-router-dom';

// ── Helpers ───────────────────────────────────────────────────────────────────
const DAYS  = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const HOURS = Array.from({ length: 9 }, (_, i) => `${(i + 9).toString().padStart(2, '0')}:00`);

const EVENTS = [
  { id: 1, day: 0, start: 9,   end: 9.5,  patient: 'Emma Wilson',  type: 'in-person', status: 'confirmed', color: '#006D77' },
  { id: 2, day: 0, start: 10,  end: 10.5, patient: 'Omar Hassan',  type: 'in-person', status: 'confirmed', color: '#006D77' },
  { id: 3, day: 0, start: 12,  end: 12.5, patient: 'LUNCH',        type: 'break',     status: 'break',     color: '#D97706' },
  { id: 4, day: 1, start: 9,   end: 9.5,  patient: 'Lily Chen',    type: 'video',     status: 'scheduled', color: '#7C3AED' },
  { id: 5, day: 1, start: 10,  end: 11,   patient: 'James Brown',  type: 'in-person', status: 'confirmed', color: '#006D77' },
  { id: 6, day: 2, start: 9,   end: 9.5,  patient: 'Amir Patel',   type: 'in-person', status: 'confirmed', color: '#006D77' },
  { id: 7, day: 2, start: 14,  end: 14.5, patient: 'Sophie M.',    type: 'video',     status: 'scheduled', color: '#7C3AED' },
  { id: 8, day: 3, start: 11,  end: 11.5, patient: 'Team Meeting', type: 'block',     status: 'break',     color: '#6B7280' },
  { id: 9, day: 4, start: 9,   end: 9.5,  patient: 'Kenji Yamada', type: 'in-person', status: 'confirmed', color: '#006D77' },
];

const GRID_ROW = 60; // px per hour row

export default function ClinicianCalendar() {
  const navigate = useNavigate();
  const [weekOffset, setWeekOffset] = useState(0);
  const [selected, setSelected]     = useState(null);

  const weekLabel = weekOffset === 0 ? 'This Week' : weekOffset === 1 ? 'Next Week' : `Week +${weekOffset}`;

  return (
    <Box>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h2" fontWeight={700}>Calendar</Typography>
          <Typography variant="body2" color="text.secondary">Dr. James Wilson · City Heart Clinic</Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          <IconButton onClick={() => setWeekOffset((w) => w - 1)} aria-label="Previous week"><ChevronLeftIcon /></IconButton>
          <Chip label={weekLabel} color="primary" onClick={() => setWeekOffset(0)} sx={{ fontWeight: 700, cursor: 'pointer' }} />
          <IconButton onClick={() => setWeekOffset((w) => w + 1)} aria-label="Next week"><ChevronRightIcon /></IconButton>
          <Button variant="outlined" startIcon={<TodayIcon />} onClick={() => setWeekOffset(0)} size="small">Today</Button>
        </Stack>
      </Stack>

      {/* Legend */}
      <Stack direction="row" spacing={2} sx={{ mb: 2 }} flexWrap="wrap" gap={1}>
        {[
          { label: 'In-Person', color: '#006D77' },
          { label: 'Video',     color: '#7C3AED' },
          { label: 'Break',     color: '#D97706' },
          { label: 'Blocked',   color: '#6B7280' },
        ].map(({ label, color }) => (
          <Stack key={label} direction="row" alignItems="center" spacing={0.75}>
            <Box sx={{ width: 12, height: 12, borderRadius: 1, bgcolor: color }} />
            <Typography variant="caption" color="text.secondary">{label}</Typography>
          </Stack>
        ))}
      </Stack>

      <Grid container spacing={0} sx={{ border: '1px solid #D0E8EA', borderRadius: 2, overflow: 'hidden' }}>
        {/* Time column */}
        <Grid item sx={{ width: 56, borderRight: '1px solid #D0E8EA' }}>
          <Box sx={{ height: 48, borderBottom: '1px solid #D0E8EA' }} />
          {HOURS.map((h) => (
            <Box key={h} sx={{ height: GRID_ROW, borderBottom: '1px solid #F0F7F8', display: 'flex', alignItems: 'flex-start', pt: 0.5, pl: 0.5 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem', lineHeight: 1 }}>{h}</Typography>
            </Box>
          ))}
        </Grid>

        {/* Day columns */}
        {DAYS.map((day, dayIdx) => {
          const dayEvents = EVENTS.filter((e) => e.day === dayIdx);
          return (
            <Grid item key={day} xs sx={{ borderRight: dayIdx < 6 ? '1px solid #D0E8EA' : 'none', minWidth: 0 }}>
              {/* Day header */}
              <Box sx={{ height: 48, borderBottom: '1px solid #D0E8EA', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', bgcolor: dayIdx === 0 ? '#E8F8F9' : '#FAFAFA' }}>
                <Typography variant="caption" color="text.secondary" fontWeight={700}>{day}</Typography>
                <Typography variant="body2" fontWeight={700} sx={{ color: dayIdx === 0 ? '#006D77' : 'text.primary' }}>
                  {20 + dayIdx}
                </Typography>
              </Box>

              {/* Hour rows */}
              <Box sx={{ position: 'relative' }}>
                {HOURS.map((h) => (
                  <Box key={h} sx={{ height: GRID_ROW, borderBottom: '1px solid #F0F7F8' }} />
                ))}

                {/* Events */}
                {dayEvents.map((ev) => {
                  const topPx   = (ev.start - 9) * GRID_ROW;
                  const heightPx = (ev.end - ev.start) * GRID_ROW - 2;
                  return (
                    <Tooltip key={ev.id} title={`${ev.patient} · ${ev.type}`} placement="top">
                      <Box
                        onClick={() => setSelected(ev)}
                        sx={{
                          position: 'absolute', top: topPx, left: 2, right: 2,
                          height: heightPx, bgcolor: ev.color,
                          borderRadius: 1, cursor: 'pointer', p: 0.5,
                          overflow: 'hidden',
                          opacity: 0.9,
                          '&:hover': { opacity: 1, boxShadow: '0 2px 8px rgba(0,0,0,0.2)' },
                          transition: 'opacity 0.15s',
                        }}
                      >
                        <Typography variant="caption" sx={{ color: '#fff', fontWeight: 700, fontSize: '0.65rem', display: 'block' }} noWrap>
                          {ev.patient}
                        </Typography>
                        {heightPx > 22 && (
                          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.6rem' }}>
                            {ev.type === 'video' ? '📹' : ev.type === 'break' ? '☕' : '🏥'}
                          </Typography>
                        )}
                      </Box>
                    </Tooltip>
                  );
                })}
              </Box>
            </Grid>
          );
        })}
      </Grid>

      {/* Event detail panel */}
      {selected && selected.type !== 'break' && selected.type !== 'block' && (
        <Card sx={{ mt: 3, border: '2px solid #006D77' }}>
          <CardContent sx={{ p: 2.5 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
              <Typography variant="h5" fontWeight={700}>Appointment Details</Typography>
              <Button size="small" onClick={() => setSelected(null)}>Close</Button>
            </Stack>
            <Stack direction="row" spacing={2} alignItems="center">
              <Avatar sx={{ bgcolor: '#006D77', fontWeight: 800 }}>
                {selected.patient.split(' ').map((n) => n[0]).join('').substring(0, 2)}
              </Avatar>
              <Box>
                <Typography fontWeight={700}>{selected.patient}</Typography>
                <Chip
                  icon={selected.type === 'video' ? <VideocamIcon /> : <LocationOnIcon />}
                  label={selected.type}
                  size="small"
                  sx={{ bgcolor: selected.type === 'video' ? '#EDE9FE' : '#E8F8F9', color: selected.type === 'video' ? '#7C3AED' : '#006D77' }}
                />
              </Box>
              <Box sx={{ ml: 'auto' }}>
                <Stack direction="row" spacing={1}>
                  {selected.type === 'video' && (
                    <Button variant="contained" startIcon={<VideocamIcon />} onClick={() => navigate(`/video/${selected.id}`)}>
                      Join Call
                    </Button>
                  )}
                  <Button variant="outlined">View Patient</Button>
                </Stack>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
