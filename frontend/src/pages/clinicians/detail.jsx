import { useState } from 'react'
import { useQuery } from '@apollo/client'
import { useParams, useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import {
  Box, Button, Avatar, Typography, Chip, Grid, Card, CardContent,
  Stack, Divider, Paper, Tabs, Tab, Skeleton,
} from '@mui/material'
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded'
import MessageRoundedIcon from '@mui/icons-material/MessageRounded'
import EditRoundedIcon from '@mui/icons-material/EditRounded'
import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded'
import LocationOnRoundedIcon from '@mui/icons-material/LocationOnRounded'
import TranslateRoundedIcon from '@mui/icons-material/TranslateRounded'
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded'

import { CLINICIAN_DETAIL_QUERY } from '../../graphql/queries'

// Priority 3 mock-removal sweep (2026-08-22) — this page was previously a
// single hardcoded MOCK_CLINICIAN object ("Dr. Jane Smith") with zero real
// GraphQL call at all: every clinician's detail page, for every real
// clinician in the system, showed the exact same fabricated profile
// (fake rating/review count/patient count/years of experience/education/
// reviews), regardless of the :id in the URL. `components/Clinicians/
// ClinicianProfileDrawer.jsx` (used by clinicians/index.jsx's list view) is
// the proven, already-real reference this rewrite follows for field shape.
//
// rating/review_count/total_patients/appointments_this_month/
// years_experience/education/recent_reviews have no matching field
// anywhere on the real Clinician GraphQL type or Prisma model, and
// reviews.resolver.ts's `reviews` query has no clinician-scoped filter
// (ReviewFilterInput is stars/search only) -- these are dropped rather than
// faked; logged in context/open-questions.md, not silently kept as if real.

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function TabPanel({ value, index, children }) {
  return value === index ? <Box>{children}</Box> : null
}

function InfoPill({ icon: Icon, label, value }) {
  if (!value) return null
  return (
    <Stack direction="row" spacing={1.25} alignItems="flex-start">
      <Icon sx={{ fontSize: '1rem', color: 'primary.main', mt: 0.3, flexShrink: 0 }} />
      <Box>
        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.67rem', letterSpacing: '0.07em' }}>{label}</Typography>
        <Typography variant="body2" fontWeight={600}>{value}</Typography>
      </Box>
    </Stack>
  )
}

export default function ClinicianDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [tab, setTab] = useState(0)

  const { data, loading } = useQuery(CLINICIAN_DETAIL_QUERY, { variables: { id }, skip: !id })
  const c = data?.clinician
  const templates = c?.availability_templates ?? []
  const services = c?.services ?? []

  if (loading && !c) {
    return (
      <Box sx={{ pb: 4 }}>
        <Skeleton variant="rectangular" height={40} width={180} sx={{ borderRadius: 2, mb: 2 }} />
        <Skeleton variant="rectangular" height={180} sx={{ borderRadius: 3, mb: 3 }} />
        <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 3 }} />
      </Box>
    )
  }

  if (!c) {
    return (
      <Box sx={{ pb: 4, textAlign: 'center', py: 8 }}>
        <Typography variant="h6" color="text.secondary">Clinician not found</Typography>
        <Button startIcon={<ArrowBackRoundedIcon />} onClick={() => navigate('/clinicians')} sx={{ mt: 2, textTransform: 'none', fontWeight: 600 }}>
          Back to Clinicians
        </Button>
      </Box>
    )
  }

  const initials = c.full_name.split(' ').filter(Boolean).slice(0, 2).map(n => n[0]).join('')

  return (
    <Box className="page-enter" sx={{ pb: 4 }}>
      <Helmet><title>{c.full_name} — MediBook</title></Helmet>

      <Button startIcon={<ArrowBackRoundedIcon />} onClick={() => navigate('/clinicians')}
        sx={{ mb: 2, textTransform: 'none', fontWeight: 600, color: 'text.secondary' }}>
        Back to Clinicians
      </Button>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <Card sx={{ borderRadius: 3, mb: 3, border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
        <CardContent sx={{ p: { xs: 2.5, sm: 3.5 } }}>
          <Grid container spacing={3} alignItems="flex-start">
            <Grid item xs={12} sm="auto">
              <Box sx={{ position: 'relative', display: 'inline-block', textAlign: 'center' }}>
                <Avatar src={c.avatar_url} sx={{ width: 96, height: 96, bgcolor: '#0B7B5C', fontSize: '2rem', fontWeight: 800 }}>
                  {!c.avatar_url && initials}
                </Avatar>
                <Chip label={c.is_active ? 'active' : 'inactive'} color={c.is_active ? 'success' : 'default'} size="small" sx={{ mt: 1, fontWeight: 700, display: 'block', fontSize: '0.68rem' }} />
              </Box>
            </Grid>
            <Grid item xs={12} sm>
              <Stack direction="row" alignItems="center" spacing={1.5} mb={0.5} flexWrap="wrap">
                <Typography variant="h5" fontWeight={800} sx={{ color: 'text.primary' }}>{c.full_name}</Typography>
                {c.clinician_type && <Chip label={c.clinician_type.name} variant="outlined" size="small" sx={{ fontWeight: 700 }} />}
              </Stack>
              {c.consultation_fee != null && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>₹{Number(c.consultation_fee).toFixed(2)} per consultation</Typography>
              )}
            </Grid>
            <Grid item xs={12} sm="auto">
              <Stack direction={{ xs: 'row', sm: 'column' }} spacing={1}>
                <Button variant="contained" startIcon={<CalendarMonthRoundedIcon />} size="small" onClick={() => navigate('/appointments/new')} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700, whiteSpace: 'nowrap' }}>New Appointment</Button>
                <Button variant="outlined" startIcon={<MessageRoundedIcon />} size="small" onClick={() => navigate('/messages')} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}>Message</Button>
                <Button variant="outlined" startIcon={<EditRoundedIcon />} size="small" onClick={() => navigate(`/clinicians/${id}/edit`)} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}>Edit Clinician</Button>
              </Stack>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* ── Tabs ────────────────────────────────────────────────────────── */}
      <Paper sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', boxShadow: 'none', overflow: 'hidden' }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto"
          sx={{ px: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.default',
            '& .MuiTab-root': { textTransform: 'none', fontWeight: 700, minHeight: 52, fontSize: '0.875rem' },
            '& .MuiTabs-indicator': { bgcolor: 'primary.main', height: 3, borderRadius: 1.5 },
          }}>
          <Tab label="Overview" />
          <Tab label="Schedule" />
          <Tab label="Services" />
        </Tabs>

        <Box sx={{ p: { xs: 2, sm: 3 } }}>

          {/* ── Overview ────────────────────────────────────────────────── */}
          <TabPanel value={tab} index={0}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" fontWeight={800} sx={{ color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: '0.08em', mb: 2 }}>Assigned Clinics</Typography>
                {c.clinics.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">No clinics assigned.</Typography>
                ) : (
                  <Stack spacing={1.5}>
                    {c.clinics.map(clinic => (
                      <InfoPill key={clinic.id} icon={LocationOnRoundedIcon} label="Clinic" value={`${clinic.name}${clinic.city ? ` — ${clinic.city}` : ''}`} />
                    ))}
                  </Stack>
                )}
                <Divider sx={{ my: 2.5 }} />
                <Typography variant="subtitle2" fontWeight={800} sx={{ color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: '0.08em', mb: 2 }}>Languages</Typography>
                {c.languages.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">Not specified.</Typography>
                ) : (
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    {c.languages.map(l => <Chip key={l} icon={<TranslateRoundedIcon />} label={l} size="small" variant="outlined" sx={{ fontWeight: 700 }} />)}
                  </Stack>
                )}
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" fontWeight={800} sx={{ color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: '0.08em', mb: 2 }}>Bio</Typography>
                <Box sx={{ bgcolor: 'action.hover', borderRadius: 2, p: 2 }}>
                  <Typography variant="body2" sx={{ lineHeight: 1.8, color: 'text.primary' }}>{c.bio || 'No bio provided.'}</Typography>
                </Box>
                {c.gender && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 2, textTransform: 'capitalize' }}>{c.gender}</Typography>
                )}
              </Grid>
            </Grid>
          </TabPanel>

          {/* ── Schedule ────────────────────────────────────────────────── */}
          <TabPanel value={tab} index={1}>
            {templates.length === 0 ? (
              <Typography color="text.secondary" textAlign="center" py={4}>No availability templates configured.</Typography>
            ) : (
              <Stack spacing={1.5}>
                {templates.map(t => (
                  <Box key={t.id} sx={{ borderLeft: '3px solid', borderColor: t.is_active ? 'primary.main' : 'divider', pl: 2.5, py: 0.75 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
                      <Box>
                        <Typography variant="body2" fontWeight={800}>{DAY_NAMES[t.day_of_week] ?? `Day ${t.day_of_week}`}</Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>{t.start_time} – {t.end_time}</Typography>
                        {t.clinic?.name && (
                          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>{t.clinic.name}{t.room?.name ? ` · ${t.room.name}` : ''}</Typography>
                        )}
                      </Box>
                      <Chip label={t.is_active ? 'Active' : 'Inactive'} color={t.is_active ? 'success' : 'default'} size="small" sx={{ fontWeight: 700 }} />
                    </Stack>
                  </Box>
                ))}
              </Stack>
            )}
          </TabPanel>

          {/* ── Services ────────────────────────────────────────────────── */}
          <TabPanel value={tab} index={2}>
            {services.length === 0 ? (
              <Typography color="text.secondary" textAlign="center" py={4}>No services assigned.</Typography>
            ) : (
              <Stack direction="row" flexWrap="wrap" gap={1.5}>
                {services.map(s => (
                  <Chip key={s.id} label={`${s.name}${s.duration_minutes ? ` (${s.duration_minutes} min)` : ''}`} icon={<CheckCircleRoundedIcon />}
                    sx={{ fontWeight: 700, borderRadius: 2, bgcolor: 'primary.50', color: 'primary.main', '& .MuiChip-icon': { color: 'primary.main' } }} />
                ))}
              </Stack>
            )}
          </TabPanel>

        </Box>
      </Paper>
    </Box>
  )
}
