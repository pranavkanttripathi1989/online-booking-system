/**
 * ─── Skeleton Components ──────────────────────────────────────────────────────
 * Reusable skeleton loaders that match HealthSync's card/table patterns.
 * All use MUI Skeleton with the default pulse animation.
 */
import React from 'react'
import {
  Skeleton,
  Card,
  CardContent,
  Stack,
  Box,
  Grid,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
} from '@mui/material'

// ─── DataCard skeleton ────────────────────────────────────────────────────────
export function DataCardSkeleton() {
  return (
    <Card sx={{ borderLeft: '4px solid #D0E8EA' }}>
      <CardContent sx={{ p: 2.5 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Box flex={1}>
            <Skeleton variant="text" width="60%" sx={{ fontSize: '2rem', mb: 0.5 }} />
            <Skeleton variant="text" width="80%" />
          </Box>
          <Skeleton variant="circular" width={44} height={44} />
        </Stack>
        <Skeleton variant="rounded" width={60} height={20} sx={{ mt: 1 }} />
      </CardContent>
    </Card>
  )
}

// ─── Table skeleton ───────────────────────────────────────────────────────────
export function TableSkeleton({ rows = 5, cols = 5 }) {
  return (
    <TableContainer component={Paper} sx={{ border: '1px solid #D0E8EA' }}>
      <Table>
        <TableHead>
          <TableRow>
            {Array.from({ length: cols }).map((_, i) => (
              <TableCell key={i}>
                <Skeleton variant="text" width="70%" />
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {Array.from({ length: rows }).map((_, rowIdx) => (
            <TableRow key={rowIdx}>
              {Array.from({ length: cols }).map((_, colIdx) => (
                <TableCell key={colIdx}>
                  {colIdx === 0 ? (
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Skeleton variant="circular" width={32} height={32} />
                      <Box>
                        <Skeleton variant="text" width={80} />
                        <Skeleton variant="text" width={120} sx={{ fontSize: '0.7rem' }} />
                      </Box>
                    </Stack>
                  ) : (
                    <Skeleton variant="text" width={colIdx === cols - 1 ? 50 : '80%'} />
                  )}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  )
}

// ─── Appointment card skeleton ────────────────────────────────────────────────
export function AppointmentCardSkeleton() {
  return (
    <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, borderLeft: '4px solid #D0E8EA' }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="space-between">
        <Stack direction="row" spacing={2} alignItems="flex-start">
          <Skeleton variant="circular" width={40} height={40} />
          <Box>
            <Skeleton variant="text" width={160} sx={{ fontSize: '1.1rem' }} />
            <Skeleton variant="rounded" width={80} height={22} sx={{ mt: 0.5 }} />
            <Stack direction="row" spacing={1} sx={{ mt: 0.75 }}>
              <Skeleton variant="rounded" width={100} height={20} />
              <Skeleton variant="rounded" width={60} height={20} />
            </Stack>
          </Box>
        </Stack>
        <Stack spacing={1} alignItems={{ sm: 'flex-end' }}>
          <Skeleton variant="rounded" width={80} height={24} />
          <Stack direction="row" spacing={1}>
            <Skeleton variant="rounded" width={90} height={30} />
            <Skeleton variant="rounded" width={90} height={30} />
          </Stack>
        </Stack>
      </Stack>
    </Paper>
  )
}

// ─── Doctor card skeleton ─────────────────────────────────────────────────────
export function DoctorCardSkeleton() {
  return (
    <Card>
      <CardContent sx={{ p: 2.5 }}>
        <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
          <Skeleton variant="circular" width={56} height={56} />
          <Box flex={1}>
            <Skeleton variant="text" width="70%" sx={{ fontSize: '1.1rem' }} />
            <Skeleton variant="rounded" width={80} height={22} sx={{ mt: 0.5 }} />
          </Box>
        </Stack>
        <Skeleton variant="text" width="90%" />
        <Skeleton variant="text" width="60%" />
        <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
          <Skeleton variant="rounded" width={80} height={22} />
          <Skeleton variant="rounded" width={70} height={22} />
        </Stack>
        <Box sx={{ mt: 1.5, pt: 1.5, borderTop: '1px solid #F0F7F8' }}>
          <Stack direction="row" justifyContent="space-between">
            <Box>
              <Skeleton variant="text" width={60} sx={{ fontSize: '1.5rem' }} />
            </Box>
            <Box>
              <Skeleton variant="text" width={80} />
            </Box>
          </Stack>
        </Box>
      </CardContent>
      <Box sx={{ px: 2.5, pb: 2 }}>
        <Skeleton variant="rounded" width="100%" height={36} />
      </Box>
    </Card>
  )
}

// ─── Grid of doctor card skeletons ────────────────────────────────────────────
export function DoctorGridSkeleton({ count = 6 }) {
  return (
    <Grid container spacing={3}>
      {Array.from({ length: count }).map((_, i) => (
        <Grid item xs={12} sm={6} md={4} key={i}>
          <DoctorCardSkeleton />
        </Grid>
      ))}
    </Grid>
  )
}

// ─── Dashboard KPI row skeleton ───────────────────────────────────────────────
export function KpiRowSkeleton({ count = 4 }) {
  return (
    <Grid container spacing={2}>
      {Array.from({ length: count }).map((_, i) => (
        <Grid item xs={6} md key={i}>
          <DataCardSkeleton />
        </Grid>
      ))}
    </Grid>
  )
}

// ─── Page header skeleton ─────────────────────────────────────────────────────
export function PageHeaderSkeleton() {
  return (
    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
      <Box>
        <Skeleton variant="text" width={240} sx={{ fontSize: '2rem' }} />
        <Skeleton variant="text" width={160} />
      </Box>
      <Skeleton variant="rounded" width={140} height={36} />
    </Stack>
  )
}

// ─── Appointments List skeleton (3 cards) ─────────────────────────────────────
export function AppointmentsListSkeleton({ count = 3 }) {
  return (
    <Stack spacing={2}>
      {Array.from({ length: count }).map((_, i) => (
        <AppointmentCardSkeleton key={i} />
      ))}
    </Stack>
  )
}
