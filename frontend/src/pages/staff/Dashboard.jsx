import React from 'react'
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  LinearProgress,
  Paper,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material'
import { useQuery } from '@apollo/client'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import EventNoteIcon from '@mui/icons-material/EventNote'
import PersonIcon from '@mui/icons-material/Person'
import GroupIcon from '@mui/icons-material/Group'
import EventBusyIcon from '@mui/icons-material/EventBusy'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import { StatusChip } from '../../components/shared'
import { DASHBOARD_QUERY } from '../../graphql/queries'

// F-18 / BUG009. Every number on this page was invented — "12" appointments,
// a three-person queue, a four-item activity feed, three rooms with made-up
// occupancy — while backend/src/dashboard has been real and role-gated
// (@Auth('admin','super_admin','staff')) all along.
//
// Three panels had NO backend counterpart and are removed rather than faked,
// following the precedent set when clinicians/detail.jsx was rewired:
//
//   * "Check In" / "Checked In" count. Appointments.status is
//     scheduled | completed | cancelled | no_show — there is no checked_in
//     state, so the button wrote nowhere and the KPI counted a field that does
//     not exist. Real check-in is queue management (REQ019), a feature, not a
//     wiring gap. Logged as an open question.
//   * "Recent Activity" feed. No event or audit source shaped for it.
//   * "Clinic Capacity" per room. No per-room slot model exists — but
//     utilisation_by_clinician does and is real, so the panel keeps its purpose
//     with data that actually exists rather than being deleted outright.

const barColor = (pct) => (pct > 85 ? 'error.main' : pct > 70 ? 'warning.main' : 'primary.main')

function Kpi({ label, value, sub, color, icon, loading }) {
  return (
    <Card sx={{ borderTop: 4, borderColor: color, height: '100%' }}>
      <CardContent sx={{ p: 2 }}>
        <Stack direction="row" justifyContent="space-between">
          <Box sx={{ minWidth: 0 }}>
            {loading ? (
              <Skeleton width={60} height={40} />
            ) : (
              <Typography variant="h3" fontWeight={800} sx={{ color }}>
                {value}
              </Typography>
            )}
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.3 }}>
              {label}
            </Typography>
            {sub && (
              <Typography variant="caption" color="text.secondary">
                {sub}
              </Typography>
            )}
          </Box>
          <Box sx={{ color, opacity: 0.3, fontSize: 32 }}>{icon}</Box>
        </Stack>
      </CardContent>
    </Card>
  )
}

// BUG042 -- null means "no prior-period baseline", not "0% change". Coercing
// it to 0 would render a fabricated "unchanged" claim, the same defect class
// as the flat-100% trend bug this null replaced.
const pctLabel = (n) => (n == null ? '' : `${n >= 0 ? '+' : ''}${Number(n).toFixed(1)}% vs yesterday`)

export default function StaffDashboard() {
  const navigate = useNavigate()
  const { data, loading, error, refetch } = useQuery(DASHBOARD_QUERY, { fetchPolicy: 'cache-and-network' })

  const d = data?.dashboard
  // No mock fallback — an empty clinic day is a real answer.
  const queue = d?.upcoming_appointments ?? []
  const utilisation = d?.utilisation_by_clinician ?? []

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1.5} sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h2" fontWeight={700}>
            Staff Dashboard
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {dayjs().format('dddd, D MMMM YYYY')}
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<CalendarMonthIcon />} onClick={() => navigate('/staff/appointments')}>
          View All Appointments
        </Button>
      </Stack>

      {error && (
        <Alert
          severity="error"
          sx={{ mb: 3 }}
          action={
            <Button size="small" onClick={() => refetch()}>
              Retry
            </Button>
          }
        >
          Could not load the dashboard: {error.message}
        </Alert>
      )}

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} md={3}>
          <Kpi
            label="Today's Appointments"
            loading={loading && !d}
            color="primary.main"
            icon={<EventNoteIcon />}
            value={d?.total_appointments_today ?? 0}
            sub={d ? pctLabel(d.total_appointments_today_change) : ''}
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <Kpi
            label="This Week"
            loading={loading && !d}
            color="success.main"
            icon={<CalendarMonthIcon />}
            value={d?.total_appointments_week ?? 0}
            sub="Scheduled across the clinic"
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <Kpi
            label="Total Patients"
            loading={loading && !d}
            color="info.main"
            icon={<PersonIcon />}
            value={d?.total_patients ?? 0}
            sub={d && d.total_patients_change != null ? `${Number(d.total_patients_change).toFixed(1)}% vs last month` : ''}
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <Kpi
            label="No-Show Rate"
            loading={loading && !d}
            color="error.main"
            icon={<EventBusyIcon />}
            value={`${Number(d?.no_show_rate ?? 0).toFixed(1)}%`}
            sub="Last 30 days"
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={7}>
          <Card>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="h5" fontWeight={700} sx={{ mb: 2 }}>
                Upcoming Appointments
              </Typography>
              <Stack spacing={1.5}>
                {loading && !queue.length && Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} variant="rounded" height={64} />)}

                {!loading && queue.length === 0 && (
                  <Typography color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
                    No upcoming appointments
                  </Typography>
                )}

                {queue.map((a) => (
                  <Paper
                    key={a.id}
                    variant="outlined"
                    sx={{ p: 1.5, display: 'flex', alignItems: 'center', gap: 2, borderRadius: 2, flexWrap: 'wrap' }}
                  >
                    <Avatar sx={{ bgcolor: 'primary.main', width: 36, height: 36, fontWeight: 800, fontSize: '0.8rem' }}>
                      {(a.patient?.full_name ?? '?')
                        .split(' ')
                        .filter(Boolean)
                        .map((n) => n[0])
                        .join('')
                        .slice(0, 2)}
                    </Avatar>
                    <Box flex={1} sx={{ minWidth: 140 }}>
                      <Typography variant="body2" fontWeight={700}>
                        {a.patient?.full_name ?? '—'}
                      </Typography>
                      <Stack direction="row" spacing={1} flexWrap="wrap">
                        <Typography variant="caption" color="text.secondary">
                          {dayjs(a.start_datetime).format('D MMM, HH:mm')}
                        </Typography>
                        {a.clinician?.full_name && (
                          <Typography variant="caption" color="text.secondary">
                            {a.clinician.full_name}
                          </Typography>
                        )}
                        {a.service?.name && (
                          <Typography variant="caption" color="text.secondary">
                            {a.service.name}
                          </Typography>
                        )}
                      </Stack>
                    </Box>
                    <StatusChip status={a.status} />
                  </Paper>
                ))}
              </Stack>
              <Button fullWidth variant="outlined" sx={{ mt: 2 }} onClick={() => navigate('/staff/appointments')}>
                Manage All Appointments
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={5}>
          <Card>
            <CardContent sx={{ p: 2.5 }}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                <GroupIcon fontSize="small" color="action" />
                <Typography variant="h5" fontWeight={700}>
                  Clinician Utilisation
                </Typography>
              </Stack>

              {loading && !utilisation.length && Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} height={44} sx={{ mb: 1 }} />)}

              {!loading && utilisation.length === 0 && (
                <Typography color="text.secondary" variant="body2" sx={{ py: 3, textAlign: 'center' }}>
                  No availability configured yet
                </Typography>
              )}

              {utilisation.map((u) => {
                const pct = Number(u.utilisation_percent ?? 0)
                return (
                  <Box key={u.clinician.id} sx={{ mb: 1.5 }}>
                    <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }} spacing={1}>
                      <Typography variant="body2" fontWeight={600} noWrap sx={{ minWidth: 0 }}>
                        {u.clinician.full_name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                        {u.slots_booked}/{u.slots_available} slots
                      </Typography>
                    </Stack>
                    <LinearProgress
                      variant="determinate"
                      value={Math.min(100, pct)}
                      aria-label={`${u.clinician.full_name} utilisation ${pct.toFixed(0)} percent`}
                      sx={{ height: 6, borderRadius: 3, '& .MuiLinearProgress-bar': { bgcolor: barColor(pct), borderRadius: 3 } }}
                    />
                  </Box>
                )
              })}

              {/* The resolver documents exactly what this count includes and
                  excludes (dashboard.service.ts getUtilisationByClinician). Said
                  out loud rather than presented as an exact capacity figure. */}
              <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 1 }}>
                Slots are derived from configured availability; a simplified measure.
              </Typography>
            </CardContent>
          </Card>

          <Card sx={{ mt: 2 }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="h5" fontWeight={700} sx={{ mb: 1 }}>
                Bookings by Service
              </Typography>
              {loading && !d && <Skeleton height={80} />}
              {d && (d.bookings_by_service ?? []).length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  No bookings yet
                </Typography>
              )}
              {(d?.bookings_by_service ?? []).map((s) => (
                <Stack key={s.service_name} direction="row" justifyContent="space-between" sx={{ py: 0.5 }} spacing={1}>
                  <Typography variant="body2" noWrap sx={{ minWidth: 0 }}>
                    {s.service_name}
                  </Typography>
                  <Chip label={s.count} size="small" />
                </Stack>
              ))}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}
