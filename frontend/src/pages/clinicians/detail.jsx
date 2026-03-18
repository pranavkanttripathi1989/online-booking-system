import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import {
  Box, Button, Avatar, Typography, Chip, Grid, Card, CardContent,
  Stack, Divider, Paper, Table, TableBody, TableCell, TableHead,
  TableRow, Rating, LinearProgress, Tabs, Tab,
} from '@mui/material'
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded'
import MessageRoundedIcon from '@mui/icons-material/MessageRounded'
import EditRoundedIcon from '@mui/icons-material/EditRounded'
import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded'
import PhoneRoundedIcon from '@mui/icons-material/PhoneRounded'
import EmailRoundedIcon from '@mui/icons-material/EmailRounded'
import LocationOnRoundedIcon from '@mui/icons-material/LocationOnRounded'
import StarRoundedIcon from '@mui/icons-material/StarRounded'
import SchoolRoundedIcon from '@mui/icons-material/SchoolRounded'
import WorkHistoryRoundedIcon from '@mui/icons-material/WorkHistoryRounded'
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded'
import PeopleAltRoundedIcon from '@mui/icons-material/PeopleAltRounded'

// ─── Mock clinician data ────────────────────────────────────────────────────
const MOCK_CLINICIAN = {
  id: '1',
  name: 'Dr. Jane Smith',
  specialty: 'General Practitioner',
  status: 'active',
  rating: 4.8,
  review_count: 142,
  total_patients: 312,
  appointments_this_month: 67,
  years_experience: 14,
  email: 'jane.smith@medibook.dev',
  phone: '+1 555-200-0101',
  clinic: 'Main Branch — Downtown',
  bio: 'Dr. Jane Smith is a highly experienced General Practitioner with 14 years of practice. She specializes in preventive medicine, chronic disease management, and comprehensive family care. Dr. Smith holds certifications from the American Board of Family Medicine.',
  languages: ['English', 'Spanish'],
  education: [
    { degree: 'MBBS', institution: 'Harvard Medical School', year: '2008' },
    { degree: 'MD — Family Medicine', institution: 'Johns Hopkins University', year: '2012' },
    { degree: 'ABFM Board Certification', institution: 'American Board of Family Medicine', year: '2013' },
  ],
  services: ['General Consultation', 'Health Check-Up', 'Chronic Disease Management', 'Vaccinations', 'Minor Procedures', 'Mental Health Screening'],
  schedule: [
    { day: 'Monday',    start: '09:00', end: '17:00', slots: 16, booked: 14 },
    { day: 'Tuesday',   start: '09:00', end: '17:00', slots: 16, booked: 16 },
    { day: 'Wednesday', start: '09:00', end: '13:00', slots: 8,  booked: 6  },
    { day: 'Thursday',  start: '09:00', end: '17:00', slots: 16, booked: 12 },
    { day: 'Friday',    start: '09:00', end: '15:00', slots: 12, booked: 11 },
  ],
  recent_reviews: [
    { patient: 'Alice J.', rating: 5, comment: 'Incredibly thorough and compassionate. Dr. Smith took her time explaining everything.', date: '2026-03-01' },
    { patient: 'Bob S.',   rating: 5, comment: 'Best doctor I have had in years. Very professional and knowledgeable.', date: '2026-02-20' },
    { patient: 'Carol M.', rating: 4, comment: 'Good experience overall. The wait time was a little long but the consultation was great.', date: '2026-02-14' },
  ],
}

function TabPanel({ value, index, children }) {
  return value === index ? <Box>{children}</Box> : null
}

function InfoPill({ icon: Icon, label, value }) {
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
  const c = MOCK_CLINICIAN

  return (
    <Box className="page-enter" sx={{ pb: 4 }}>
      <Helmet><title>{c.name} — MediBook</title></Helmet>

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
                <Avatar sx={{ width: 96, height: 96, bgcolor: '#0B7B5C', fontSize: '2rem', fontWeight: 800 }}>
                  {c.name.split(' ').filter(Boolean).slice(1, 3).map(n => n[0]).join('')}
                </Avatar>
                <Chip label={c.status} color="success" size="small" sx={{ mt: 1, fontWeight: 700, display: 'block', fontSize: '0.68rem' }} />
              </Box>
            </Grid>
            <Grid item xs={12} sm>
              <Stack direction="row" alignItems="center" spacing={1.5} mb={0.5} flexWrap="wrap">
                <Typography variant="h5" fontWeight={800} sx={{ color: 'text.primary' }}>{c.name}</Typography>
                <Chip label={c.specialty} variant="outlined" size="small" sx={{ fontWeight: 700 }} />
              </Stack>
              <Stack direction="row" spacing={1} alignItems="center" mb={1.5}>
                <Rating value={c.rating} precision={0.1} readOnly size="small" icon={<StarRoundedIcon fontSize="inherit" />} emptyIcon={<StarRoundedIcon fontSize="inherit" />} />
                <Typography variant="body2" fontWeight={700} sx={{ color: '#D97706' }}>{c.rating}</Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>({c.review_count} reviews)</Typography>
              </Stack>
              <Grid container spacing={2}>
                {[
                  { label: 'Patients', value: c.total_patients, icon: PeopleAltRoundedIcon, color: '#1565C7' },
                  { label: 'This Month', value: c.appointments_this_month, icon: CalendarMonthRoundedIcon, color: '#0B7B5C' },
                  { label: 'Years Exp.', value: c.years_experience, icon: WorkHistoryRoundedIcon, color: '#7C3AED' },
                ].map(stat => (
                  <Grid item key={stat.label}>
                    <Paper sx={{ px: 2, py: 1.25, borderRadius: 2.5, border: '1px solid', borderColor: 'divider', boxShadow: 'none', textAlign: 'center' }}>
                      <Typography variant="h6" fontWeight={800} sx={{ color: stat.color }}>{stat.value}</Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>{stat.label}</Typography>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </Grid>
            <Grid item xs={12} sm="auto">
              <Stack direction={{ xs: 'row', sm: 'column' }} spacing={1}>
                <Button variant="contained" startIcon={<CalendarMonthRoundedIcon />} size="small" onClick={() => navigate('/appointments/new')} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700, whiteSpace: 'nowrap' }}>New Appointment</Button>
                <Button variant="outlined" startIcon={<MessageRoundedIcon />} size="small" sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}>Message</Button>
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
          <Tab label={`Reviews (${c.review_count})`} />
        </Tabs>

        <Box sx={{ p: { xs: 2, sm: 3 } }}>

          {/* ── Overview ────────────────────────────────────────────────── */}
          <TabPanel value={tab} index={0}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" fontWeight={800} sx={{ color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: '0.08em', mb: 2 }}>Contact & Location</Typography>
                <Stack spacing={1.75}>
                  <InfoPill icon={EmailRoundedIcon} label="Email" value={c.email} />
                  <InfoPill icon={PhoneRoundedIcon} label="Phone" value={c.phone} />
                  <InfoPill icon={LocationOnRoundedIcon} label="Clinic" value={c.clinic} />
                </Stack>
                <Divider sx={{ my: 2.5 }} />
                <Typography variant="subtitle2" fontWeight={800} sx={{ color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: '0.08em', mb: 2 }}>Languages</Typography>
                <Stack direction="row" spacing={1}>
                  {c.languages.map(l => <Chip key={l} label={l} size="small" variant="outlined" sx={{ fontWeight: 700 }} />)}
                </Stack>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" fontWeight={800} sx={{ color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: '0.08em', mb: 2 }}>Bio</Typography>
                <Box sx={{ bgcolor: 'action.hover', borderRadius: 2, p: 2 }}>
                  <Typography variant="body2" sx={{ lineHeight: 1.8, color: 'text.primary' }}>{c.bio}</Typography>
                </Box>
                <Divider sx={{ my: 2.5 }} />
                <Typography variant="subtitle2" fontWeight={800} sx={{ color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: '0.08em', mb: 2 }}>Education</Typography>
                <Stack spacing={1.5}>
                  {c.education.map((e, i) => (
                    <Stack key={i} direction="row" spacing={1.5} alignItems="flex-start">
                      <SchoolRoundedIcon sx={{ fontSize: '1rem', color: 'primary.main', mt: 0.4, flexShrink: 0 }} />
                      <Box>
                        <Typography variant="body2" fontWeight={700}>{e.degree}</Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>{e.institution} · {e.year}</Typography>
                      </Box>
                    </Stack>
                  ))}
                </Stack>
              </Grid>
            </Grid>
          </TabPanel>

          {/* ── Schedule ────────────────────────────────────────────────── */}
          <TabPanel value={tab} index={1}>
            <Stack spacing={2}>
              {c.schedule.map(s => {
                const pct = Math.round((s.booked / s.slots) * 100)
                return (
                  <Box key={s.day} sx={{ borderLeft: '3px solid', borderColor: pct >= 90 ? 'error.main' : pct >= 70 ? 'warning.main' : 'primary.main', pl: 2.5, py: 0.75 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.75} flexWrap="wrap" gap={1}>
                      <Box>
                        <Typography variant="body2" fontWeight={800}>{s.day}</Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>{s.start} – {s.end}</Typography>
                      </Box>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="caption" fontWeight={700} sx={{ color: pct >= 90 ? 'error.main' : pct >= 70 ? 'warning.main' : 'primary.main' }}>{pct}% booked</Typography>
                        <Chip label={`${s.booked}/${s.slots} slots`} size="small" variant="outlined" sx={{ fontSize: '0.72rem' }} />
                      </Stack>
                    </Stack>
                    <LinearProgress variant="determinate" value={pct} sx={{ height: 6, borderRadius: 3, bgcolor: 'action.hover', '& .MuiLinearProgress-bar': { bgcolor: pct >= 90 ? '#DC2626' : pct >= 70 ? '#D97706' : '#1565C7', borderRadius: 3 } }} />
                  </Box>
                )
              })}
            </Stack>
          </TabPanel>

          {/* ── Services ────────────────────────────────────────────────── */}
          <TabPanel value={tab} index={2}>
            <Stack direction="row" flexWrap="wrap" gap={1.5}>
              {c.services.map(s => (
                <Chip key={s} label={s} icon={<CheckCircleRoundedIcon />} sx={{ fontWeight: 700, borderRadius: 2, bgcolor: 'primary.50', color: 'primary.main', '& .MuiChip-icon': { color: 'primary.main' } }} />
              ))}
            </Stack>
          </TabPanel>

          {/* ── Reviews ─────────────────────────────────────────────────── */}
          <TabPanel value={tab} index={3}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <Box sx={{ textAlign: 'center', p: 3, bgcolor: 'action.hover', borderRadius: 3 }}>
                  <Typography variant="h2" fontWeight={800} sx={{ color: '#D97706', lineHeight: 1 }}>{c.rating}</Typography>
                  <Rating value={c.rating} precision={0.1} readOnly sx={{ mt: 1 }} icon={<StarRoundedIcon fontSize="inherit" />} emptyIcon={<StarRoundedIcon fontSize="inherit" />} />
                  <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}>Based on {c.review_count} reviews</Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={8}>
                <Stack spacing={2}>
                  {c.recent_reviews.map((r, i) => (
                    <Box key={i} sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 2.5 }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={0.75} flexWrap="wrap" gap={0.5}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Avatar sx={{ width: 28, height: 28, bgcolor: 'primary.main', fontSize: '0.75rem', fontWeight: 700 }}>{r.patient[0]}</Avatar>
                          <Typography variant="body2" fontWeight={700}>{r.patient}</Typography>
                        </Stack>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Rating value={r.rating} readOnly size="small" icon={<StarRoundedIcon fontSize="inherit" />} emptyIcon={<StarRoundedIcon fontSize="inherit" />} />
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>{r.date}</Typography>
                        </Stack>
                      </Stack>
                      <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.7 }}>{r.comment}</Typography>
                    </Box>
                  ))}
                  <Button variant="outlined" fullWidth sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}>View All {c.review_count} Reviews</Button>
                </Stack>
              </Grid>
            </Grid>
          </TabPanel>

        </Box>
      </Paper>
    </Box>
  )
}
