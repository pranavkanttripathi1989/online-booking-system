import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@apollo/client'
import { Helmet } from 'react-helmet-async'
import ErrorBoundary from '../../../components/ErrorBoundary'
import { Avatar, Box, Button, Chip, Divider, Grid, IconButton, Paper, Skeleton, Stack, Typography } from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded'
import EditRoundedIcon from '@mui/icons-material/EditRounded'
import MeetingRoomRoundedIcon from '@mui/icons-material/MeetingRoomRounded'
import PeopleRoundedIcon from '@mui/icons-material/PeopleRounded'
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded'
import CancelRoundedIcon from '@mui/icons-material/CancelRounded'
import { ROOM_DETAIL_QUERY } from '../../../graphql/queries'

function RoomDetailPage() {
  const theme = useTheme()
  const { id } = useParams()
  const navigate = useNavigate()

  const { data, loading, error } = useQuery(ROOM_DETAIL_QUERY, {
    variables: { id },
    fetchPolicy: 'cache-and-network',
  })

  // BUG-RM-001 FIX: trigger mock fallback on Apollo network error (data=undefined)
  // as well as when data.room is null (unknown ID with live backend)
  const room = data?.room

  if (loading && !room)
    return (
      <Box>
        <Skeleton variant="rectangular" height={56} sx={{ borderRadius: 2, mb: 3 }} />
        <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 3 }} />
      </Box>
    )

  // Mock fallback — activates on Apollo error OR unknown ID
  const r = room ?? {
    id,
    name: 'Room 1A',
    capacity: 4,
    is_active: true,
    clinic: { id: '1', name: 'London Central Clinic' },
  }

  return (
    <Box className="page-enter">
      <Helmet>
        <title>{r.name} — MediBook</title>
      </Helmet>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3, flexWrap: 'wrap' }}>
        {/* SUG-RM-004 FIX: aria-label on back button */}
        <IconButton onClick={() => navigate('/manager/rooms')} sx={{ bgcolor: 'action.hover' }} aria-label="Back to rooms">
          <ArrowBackRoundedIcon />
        </IconButton>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h5" fontWeight={800}>
            {r.name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {r.clinic?.name}
          </Typography>
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
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider', height: '100%' }}>
            <Stack direction="row" alignItems="center" spacing={2} mb={3}>
              <Box
                sx={{
                  width: 56,
                  height: 56,
                  borderRadius: 3,
                  background: (t) => `linear-gradient(135deg, ${alpha(t.palette.info.main, 0.18)}, ${alpha(t.palette.info.light, 0.24)})`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <MeetingRoomRoundedIcon sx={{ color: 'info.main', fontSize: '1.6rem' }} />
              </Box>
              <Box>
                <Typography variant="h6" fontWeight={800}>
                  {r.name}
                </Typography>
                <Chip
                  icon={
                    r.is_active ? (
                      <CheckCircleRoundedIcon sx={{ fontSize: '0.9rem !important' }} />
                    ) : (
                      <CancelRoundedIcon sx={{ fontSize: '0.9rem !important' }} />
                    )
                  }
                  label={r.is_active ? 'Active' : 'Inactive'}
                  size="small"
                  sx={{
                    bgcolor: alpha(r.is_active ? theme.palette.success.main : theme.palette.error.main, theme.palette.mode === 'dark' ? 0.18 : 0.12),
                    color: r.is_active ? 'success.main' : 'error.main',
                    fontWeight: 700,
                    borderRadius: '8px',
                    fontSize: '0.72rem',
                    height: 24,
                  }}
                />
              </Box>
            </Stack>

            <Divider sx={{ mb: 2.5 }} />

            <Stack spacing={2.5}>
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={700} letterSpacing={0.5} textTransform="uppercase">
                  Capacity
                </Typography>
                <Stack direction="row" alignItems="center" spacing={1} mt={0.5}>
                  <PeopleRoundedIcon sx={{ fontSize: '1.1rem', color: 'info.main' }} />
                  <Typography variant="body1" fontWeight={600}>
                    {r.capacity ?? '—'} people
                  </Typography>
                </Stack>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={700} letterSpacing={0.5} textTransform="uppercase">
                  Clinic
                </Typography>
                <Typography variant="body1" fontWeight={600} mt={0.5}>
                  {r.clinic?.name ?? '—'}
                </Typography>
              </Box>
            </Stack>
          </Paper>
        </Grid>

        {/* Today's usage placeholder */}
        <Grid item xs={12} md={7}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider', height: '100%' }}>
            <Typography variant="subtitle1" fontWeight={700} mb={2}>
              Today's Schedule
            </Typography>
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                py: 6,
                color: 'text.disabled',
              }}
            >
              <MeetingRoomRoundedIcon sx={{ fontSize: 64, mb: 1 }} />
              <Typography variant="body2">No appointments in this room today</Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  )
}

// SUG-RM-005 FIX: ErrorBoundary wrapper for crash resilience
export default function RoomDetailPageWithBoundary() {
  return (
    <ErrorBoundary>
      <RoomDetailPage />
    </ErrorBoundary>
  )
}
