import { useState } from 'react'
import { useQuery } from '@apollo/client'
import dayjs from 'dayjs'
import {
  Avatar,
  Box,
  Chip,
  CircularProgress,
  Divider,
  Drawer,
  IconButton,
  Paper,
  Skeleton,
  Stack,
  Tab,
  Tabs,
  Typography,
} from '@mui/material'
import { DataGrid } from '@mui/x-data-grid'
import CloseIcon from '@mui/icons-material/Close'
import TranslateIcon from '@mui/icons-material/Translate'
import EmailIcon from '@mui/icons-material/Email'
import LocalHospitalIcon from '@mui/icons-material/LocalHospital'

import { CLINICIAN_DETAIL_QUERY } from '../../graphql/queries'

// ─── Avatar helpers ───────────────────────────────────────────────────────────
const NAME_COLOURS = ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#3b82f6','#ef4444','#14b8a6']
function nameColour(name=''){let h=0;for(let i=0;i<name.length;i++)h=(h*31+name.charCodeAt(i))>>>0;return NAME_COLOURS[h%NAME_COLOURS.length]}
function initials(name=''){return name.split(' ').slice(0,2).map(p=>p[0]).join('').toUpperCase()}

// ─── Day labels ───────────────────────────────────────────────────────────────
const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

// ─── Tab Panel helper ─────────────────────────────────────────────────────────
function TabPanel({ value, index, children }) {
  return value === index ? <Box pt={2}>{children}</Box> : null
}

// ─── Info row ─────────────────────────────────────────────────────────────────
function InfoRow({ icon, text }) {
  if (!text) return null
  return (
    <Stack direction="row" spacing={1.5} alignItems="center">
      <Box color="text.secondary" display="flex">{icon}</Box>
      <Typography variant="body2">{text}</Typography>
    </Stack>
  )
}

// ─── ClinicianProfileDrawer ───────────────────────────────────────────────────
export default function ClinicianProfileDrawer({ open, clinician, onClose }) {
  const [tab, setTab] = useState(0)

  const { data, loading } = useQuery(CLINICIAN_DETAIL_QUERY, {
    variables: { id: clinician?.id },
    skip: !clinician?.id,
    fetchPolicy: 'cache-and-network',
  })

  const detail = data?.clinician ?? clinician
  const templates = detail?.availability_templates ?? []
  const services = detail?.services ?? []

  // Appointment columns for the mini DataGrid
  const apptColumns = [
    {
      field: 'start_datetime', headerName: 'Date & Time', flex: 1, sortable: false,
      renderCell: ({ row }) => dayjs(row.start_datetime).format('DD MMM, HH:mm'),
    },
    {
      field: 'patient', headerName: 'Patient', flex: 1, sortable: false,
      renderCell: ({ row }) => row.patient?.full_name ?? '—',
    },
    {
      field: 'status', headerName: 'Status', width: 110, sortable: false,
      renderCell: ({ row }) => {
        const COLOR_MAP = { confirmed:'success',pending:'warning',cancelled:'error',completed:'info',no_show:'default' }
        return <Chip label={row.status?.replace('_',' ')} color={COLOR_MAP[row.status]??'default'} size="small" sx={{fontWeight:600,textTransform:'capitalize'}} />
      },
    },
  ]

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { width: { xs: '100%', sm: 520 }, display: 'flex', flexDirection: 'column', overflow: 'hidden' } }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 3,
          background: 'linear-gradient(135deg, rgba(99,102,241,0.14) 0%, rgba(139,92,246,0.07) 100%)',
          borderBottom: '1px solid',
          borderColor: 'divider',
          flexShrink: 0,
        }}
      >
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between">
          <Stack direction="row" spacing={2} alignItems="center">
            <Avatar
              src={detail?.avatar_url}
              sx={{ width: 64, height: 64, bgcolor: nameColour(detail?.full_name ?? ''), fontSize: 24, fontWeight: 700 }}
            >
              {!detail?.avatar_url && initials(detail?.full_name ?? '')}
            </Avatar>
            <Box>
              <Typography variant="h6" fontWeight={800}>{detail?.full_name ?? '—'}</Typography>
              <Stack direction="row" spacing={0.75} flexWrap="wrap" mt={0.5}>
                {detail?.clinician_type && (
                  <Chip label={detail.clinician_type.name} color="primary" size="small" sx={{ fontWeight: 600 }} />
                )}
                <Chip
                  label={detail?.is_active ? 'Active' : 'Inactive'}
                  color={detail?.is_active ? 'success' : 'default'}
                  size="small"
                  sx={{ fontWeight: 600 }}
                />
              </Stack>
            </Box>
          </Stack>
          <IconButton size="small" onClick={onClose}><CloseIcon /></IconButton>
        </Stack>
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: '1px solid', borderColor: 'divider', flexShrink: 0 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto">
          <Tab label="Overview" />
          <Tab label="Availability" />
          <Tab label="Appointments" />
          <Tab label="Services" />
        </Tabs>
      </Box>

      {/* Scrollable body */}
      <Box sx={{ flex: 1, overflowY: 'auto', p: 2.5 }}>
        {loading && !detail && (
          <Stack spacing={2}>{[...Array(4)].map((_,i) => <Skeleton key={i} variant="rounded" height={64} sx={{borderRadius:2}} />)}</Stack>
        )}

        {/* ── Overview ── */}
        <TabPanel value={tab} index={0}>
          <Stack spacing={2}>
            {detail?.bio && (
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={700} display="block" mb={0.5}>Bio</Typography>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{detail.bio}</Typography>
              </Box>
            )}
            <Divider />
            <Stack spacing={1.25}>
              <InfoRow icon={<TranslateIcon fontSize="small" />} text={detail?.languages?.join(', ')} />
              {detail?.consultation_fee && (
                <Typography variant="body2" color="text.secondary">
                  💷 £{Number(detail.consultation_fee).toFixed(2)} per consultation
                </Typography>
              )}
              {detail?.gender && (
                <Typography variant="body2" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
                  {detail.gender}
                </Typography>
              )}
            </Stack>
            {detail?.clinics?.length > 0 && (
              <>
                <Divider />
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={700} display="block" mb={0.75}>
                    Assigned Clinics
                  </Typography>
                  <Stack spacing={0.5}>
                    {detail.clinics.map((c) => (
                      <Stack key={c.id} direction="row" spacing={1} alignItems="center">
                        <LocalHospitalIcon fontSize="small" sx={{ color: 'primary.main' }} />
                        <Typography variant="body2">{c.name} — {c.city}</Typography>
                      </Stack>
                    ))}
                  </Stack>
                </Box>
              </>
            )}
          </Stack>
        </TabPanel>

        {/* ── Availability ── */}
        <TabPanel value={tab} index={1}>
          {templates.length === 0 ? (
            <Typography color="text.secondary" textAlign="center" py={4}>No availability templates configured.</Typography>
          ) : (
            <Stack spacing={1.5}>
              {templates.map((t) => (
                <Paper
                  key={t.id}
                  elevation={0}
                  sx={{ p: 1.5, border: '1px solid', borderColor: t.is_active ? 'success.light' : 'divider', borderRadius: 2 }}
                >
                  <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Box>
                      <Typography variant="body2" fontWeight={700}>{DAY_NAMES[t.day_of_week] ?? t.day_of_week}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {t.start_time} – {t.end_time} · {t.slot_duration_minutes}min slots
                        {t.buffer_minutes ? ` · ${t.buffer_minutes}min buffer` : ''}
                      </Typography>
                      {t.clinic?.name && (
                        <Typography variant="caption" color="text.secondary" display="block">{t.clinic.name}{t.room?.name ? ` · ${t.room.name}` : ''}</Typography>
                      )}
                    </Box>
                    <Chip
                      label={t.is_active ? 'Active' : 'Inactive'}
                      color={t.is_active ? 'success' : 'default'}
                      size="small"
                      sx={{ fontWeight: 600 }}
                    />
                  </Stack>
                </Paper>
              ))}
            </Stack>
          )}
        </TabPanel>

        {/* ── Appointments ── */}
        <TabPanel value={tab} index={2}>
          <Typography variant="caption" color="text.secondary" display="block" mb={1.5}>
            Upcoming appointments for this clinician
          </Typography>
          <DataGrid
            rows={[]}   // Will be populated when CLINICIAN_DETAIL_QUERY includes appointments (future)
            columns={apptColumns}
            autoHeight
            hideFooter
            disableRowSelectionOnClick
            slots={{
              noRowsOverlay: () => (
                <Box display="flex" alignItems="center" justifyContent="center" height="100%" py={4}>
                  <Typography color="text.secondary" variant="body2">No upcoming appointments</Typography>
                </Box>
              ),
            }}
            sx={{ border: 'none', '& .MuiDataGrid-columnHeaders': { background: 'rgba(0,0,0,0.02)' } }}
          />
        </TabPanel>

        {/* ── Services ── */}
        <TabPanel value={tab} index={3}>
          {services.length === 0 ? (
            <Typography color="text.secondary" textAlign="center" py={4}>No services assigned.</Typography>
          ) : (
            <Stack spacing={1}>
              {services.map((s) => (
                <Paper key={s.id} elevation={0} sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Box>
                      <Typography variant="body2" fontWeight={700}>{s.name}</Typography>
                      <Typography variant="caption" color="text.secondary">⏱ {s.duration_minutes} min</Typography>
                    </Box>
                    {s.price && (
                      <Typography variant="body2" fontWeight={700} color="primary">£{Number(s.price).toFixed(2)}</Typography>
                    )}
                  </Stack>
                </Paper>
              ))}
            </Stack>
          )}
        </TabPanel>
      </Box>
    </Drawer>
  )
}
