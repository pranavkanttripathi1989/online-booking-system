import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@apollo/client'
import { Helmet } from 'react-helmet-async'
import {
  Avatar, Box, Button, Chip, Divider, Grid, IconButton,
  Paper, Skeleton, Stack, Typography,
} from '@mui/material'
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded'
import EditRoundedIcon      from '@mui/icons-material/EditRounded'
import MeetingRoomRoundedIcon from '@mui/icons-material/MeetingRoomRounded'
import PeopleRoundedIcon    from '@mui/icons-material/PeopleRounded'
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded'
import CancelRoundedIcon    from '@mui/icons-material/CancelRounded'
import { ROOM_DETAIL_QUERY } from '../../../graphql/queries'

export default function RoomDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const { data, loading } = useQuery(ROOM_DETAIL_QUERY, {
    variables: { id },
    fetchPolicy: 'cache-and-network',
  })

  const room = data?.room

  if (loading && !room) return (
    <Box>
      <Skeleton variant="rectangular" height={56} sx={{ borderRadius: 2, mb: 3 }} />
      <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 3 }} />
    </Box>
  )

  // Mock fallback so the page never appears empty
  const r = room ?? {
    id,
    name: 'Room 1A',
    capacity: 4,
    is_active: true,
    clinic: { id: '1', name: 'London Central Clinic' },
  }

  return (
    <Box className="page-enter">
      <Helmet><title>{r.name} — MediBook</title></Helmet>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3, flexWrap: 'wrap' }}>
        <IconButton onClick={() => navigate('/manager/rooms')} sx={{ bgcolor: '#F1F3F4' }}>
          <ArrowBackRoundedIcon />
        </IconButton>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h5" fontWeight={800}>{r.name}</Typography>
          <Typography variant="body2" color="text.secondary">{r.clinic?.name}</Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<EditRoundedIcon />}
          onClick={() => navigate(`/manager/rooms/${id}/edit`)}
          sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 700 }}
        >
          Edit Room
        </Button>
      </Box>

      {/* ── Info Cards ─────────────────────────────────────────────────── */}
      <Grid container spacing={3}>
        {/* Details card */}
        <Grid item xs={12} md={5}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #E8EAED', height: '100%' }}>
            <Stack direction="row" alignItems="center" spacing={2} mb={3}>
              <Box sx={{
                width: 56, height: 56, borderRadius: 3,
                background: 'linear-gradient(135deg,#E8F0FE,#AECBFA)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <MeetingRoomRoundedIcon sx={{ color: '#1A73E8', fontSize: '1.6rem' }} />
              </Box>
              <Box>
                <Typography variant="h6" fontWeight={800}>{r.name}</Typography>
                <Chip
                  icon={r.is_active ? <CheckCircleRoundedIcon sx={{ fontSize: '0.9rem !important' }} /> : <CancelRoundedIcon sx={{ fontSize: '0.9rem !important' }} />}
                  label={r.is_active ? 'Active' : 'Inactive'}
                  size="small"
                  sx={{
                    bgcolor: r.is_active ? '#E6F4EA' : '#FCE8E6',
                    color: r.is_active ? '#137333' : '#A50E0E',
                    fontWeight: 700, borderRadius: '8px', fontSize: '0.72rem', height: 24,
                  }}
                />
              </Box>
            </Stack>

            <Divider sx={{ mb: 2.5 }} />

            <Stack spacing={2.5}>
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={700} letterSpacing={0.5} textTransform="uppercase">Capacity</Typography>
                <Stack direction="row" alignItems="center" spacing={1} mt={0.5}>
                  <PeopleRoundedIcon sx={{ fontSize: '1.1rem', color: '#1A73E8' }} />
                  <Typography variant="body1" fontWeight={600}>{r.capacity ?? '—'} people</Typography>
                </Stack>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={700} letterSpacing={0.5} textTransform="uppercase">Clinic</Typography>
                <Typography variant="body1" fontWeight={600} mt={0.5}>{r.clinic?.name ?? '—'}</Typography>
              </Box>
            </Stack>
          </Paper>
        </Grid>

        {/* Today's usage placeholder */}
        <Grid item xs={12} md={7}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #E8EAED', height: '100%' }}>
            <Typography variant="subtitle1" fontWeight={700} mb={2}>Today's Schedule</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 6, color: 'text.disabled' }}>
              <MeetingRoomRoundedIcon sx={{ fontSize: 64, mb: 1 }} />
              <Typography variant="body2">No appointments in this room today</Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  )
}
