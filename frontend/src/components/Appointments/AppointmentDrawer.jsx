import { useState } from 'react'
import { useQuery, useMutation } from '@apollo/client'
import dayjs from 'dayjs'
import {
  Avatar,
  Box,
  Button,
  Chip,
  Divider,
  Drawer,
  IconButton,
  Skeleton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CancelIcon from '@mui/icons-material/Cancel'

import TaskAltIcon from '@mui/icons-material/TaskAlt'
import PersonOffIcon from '@mui/icons-material/PersonOff'
import PersonIcon from '@mui/icons-material/Person'
import MedicalServicesIcon from '@mui/icons-material/MedicalServices'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import LocalHospitalIcon from '@mui/icons-material/LocalHospital'
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom'

import { APPOINTMENT_DETAIL_QUERY } from '../../graphql/queries'
import {
  CANCEL_APPOINTMENT_MUTATION,
  COMPLETE_APPOINTMENT_MUTATION,
  MARK_NO_SHOW_MUTATION,
} from '../../graphql/mutations'
import * as MockStore from '../../mocks/store'
import CancelDialog from './CancelDialog'

// ─── Status colour map ────────────────────────────────────────────────────────
const STATUS_CFG = {
  pending:     { label: 'Pending',     bg: '#FEF7E0', color: '#8A4700', border: '#FDD663', dot: '#F9AB00' },
  confirmed:   { label: 'Confirmed',   bg: '#E6F4EA', color: '#137333', border: '#CEEAD6', dot: '#0F9D58' },
  cancelled:   { label: 'Cancelled',   bg: '#FCE8E6', color: '#A50E0E', border: '#F5C6C2', dot: '#D93025' },
  completed:   { label: 'Completed',   bg: '#E8F0FE', color: '#1557B0', border: '#AECBFA', dot: '#1A73E8' },
  no_show:     { label: 'No Show',     bg: '#F8F9FA', color: '#3C4043', border: '#E8EAED', dot: '#80868B' },
  rescheduled: { label: 'Rescheduled', bg: '#F3E8FD', color: '#6E2DB8', border: '#D7AEFA', dot: '#9334E6' },
}



// ─── Info row helper ──────────────────────────────────────────────────────────
function InfoRow({ icon, label, value }) {
  return (
    <Stack direction="row" spacing={1.5} alignItems="flex-start">
      <Box sx={{ color: '#1A73E8', mt: 0.2 }}>{icon}</Box>
      <Box>
        <Typography variant="caption" sx={{ color: '#5F6368' }}>{label}</Typography>
        <Typography variant="body2" fontWeight={600} sx={{ color: '#202124' }}>{value ?? '—'}</Typography>
      </Box>
    </Stack>
  )
}

// ─── Section card ─────────────────────────────────────────────────────────────
function SectionCard({ title, icon, children }) {
  return (
    <Box
      sx={{
        p: 2,
        borderRadius: 3,
        border: '1px solid #E8EAED',
        mb: 2,
        bgcolor: '#FFFFFF',
      }}
    >
      <Stack direction="row" spacing={1} alignItems="center" mb={1.5}>
        <Box sx={{ color: '#1A73E8' }}>{icon}</Box>
        <Typography variant="subtitle2" fontWeight={700} sx={{ color: '#5F6368' }}>
          {title}
        </Typography>
      </Stack>
      <Stack spacing={1.5}>{children}</Stack>
    </Box>
  )
}

// ─── AppointmentDrawer ────────────────────────────────────────────────────────
export default function AppointmentDrawer({ open, appointmentId, onClose, onRefetch }) {
  const [cancelOpen, setCancelOpen] = useState(false)

  const { data, loading } = useQuery(APPOINTMENT_DETAIL_QUERY, {
    variables: { id: appointmentId },
    skip: !appointmentId,
    fetchPolicy: 'network-only',
  })

  const graphqlApt = data?.appointment
  // Fallback to mock store when backend is offline
  const apt = graphqlApt ?? (appointmentId ? MockStore.getAppointmentById(appointmentId) : null)

  const [cancelAppointment] = useMutation(CANCEL_APPOINTMENT_MUTATION, {
    onCompleted: () => { setCancelOpen(false); onRefetch?.() },
  })
  const [completeAppointment] = useMutation(COMPLETE_APPOINTMENT_MUTATION, {
    onCompleted: () => onRefetch?.(),
  })
  const [markNoShow] = useMutation(MARK_NO_SHOW_MUTATION, {
    onCompleted: () => onRefetch?.(),
  })

  const statusCfg = STATUS_CFG[apt?.status] ?? { label: apt?.status, bg: '#F8F9FA', color: '#5F6368', border: '#E8EAED', dot: '#9AA0A6' }
  const isTerminal = ['cancelled', 'completed', 'no_show'].includes(apt?.status)

  return (
    <>
      <Drawer
        anchor="right"
        open={open}
        onClose={onClose}
        PaperProps={{
          sx: {
            width: { xs: '100%', sm: 440, md: 480 },
            borderRadius: { xs: 0, sm: '20px 0 0 20px' },
            pt: 0,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          },
        }}
      >
        {/* Header */}
        <Box
          sx={{
            p: 2.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #E8EAED',
            bgcolor: '#F8F9FA',
          }}
        >
          <Box>
            <Typography variant="h6" fontWeight={800}>
              Appointment Detail
            </Typography>
            {apt && (
              <Chip
                label={statusCfg.label}
                size="small"
                sx={{
                  mt: 0.5,
                  bgcolor: statusCfg.bg, color: statusCfg.color,
                  border: `1px solid ${statusCfg.border}`,
                  borderLeft: `3px solid ${statusCfg.dot}`,
                  fontWeight: 700, borderRadius: '8px', fontSize: '0.68rem', height: 24,
                }}
              />
            )}
          </Box>
          <IconButton onClick={onClose} size="small" sx={{ color: '#5F6368', '&:hover': { bgcolor: '#F1F3F4', color: '#202124' } }}>
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Body — scrollable */}
        <Box sx={{ flex: 1, overflowY: 'auto', p: 2.5 }}>
          {loading ? (
            <Stack spacing={2}>
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} variant="rounded" height={80} sx={{ borderRadius: 3 }} />
              ))}
            </Stack>
          ) : apt ? (
            <>
              {/* Patient */}
              <SectionCard title="Patient" icon={<PersonIcon fontSize="small" />}>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Avatar sx={{ bgcolor: 'primary.main', width: 44, height: 44 }}>
                    {apt.patient?.full_name?.[0] ?? 'P'}
                  </Avatar>
                  <Box>
                    <Typography fontWeight={700}>{apt.patient?.full_name ?? '—'}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {apt.patient?.email} • {apt.patient?.phone}
                    </Typography>
                  </Box>
                </Stack>
                <InfoRow
                  icon={<AccessTimeIcon fontSize="small" />}
                  label="Date of Birth"
                  value={apt.patient?.date_of_birth
                    ? dayjs(apt.patient.date_of_birth).format('DD MMM YYYY')
                    : '—'}
                />
              </SectionCard>

              {/* Clinician */}
              <SectionCard title="Clinician" icon={<MedicalServicesIcon fontSize="small" />}>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Avatar src={apt.clinician?.avatar_url} sx={{ width: 44, height: 44 }}>
                    {apt.clinician?.full_name?.[0] ?? 'C'}
                  </Avatar>
                  <Box>
                    <Typography fontWeight={700}>{apt.clinician?.full_name ?? '—'}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {apt.clinician?.clinician_type?.name ?? ''}
                    </Typography>
                  </Box>
                </Stack>
              </SectionCard>

              {/* Service & Logistics */}
              <SectionCard title="Service & Logistics" icon={<LocalHospitalIcon fontSize="small" />}>
                <InfoRow
                  icon={<TaskAltIcon fontSize="small" />}
                  label="Service"
                  value={apt.service?.name}
                />
                <InfoRow
                  icon={<AccessTimeIcon fontSize="small" />}
                  label="Date & Time"
                  value={dayjs(apt.start_datetime).format('dddd, DD MMM YYYY • h:mm A')}
                />
                <InfoRow
                  icon={<AccessTimeIcon fontSize="small" />}
                  label="Duration"
                  value={`${apt.duration_minutes ?? apt.service?.duration_minutes ?? '—'} minutes`}
                />
                <InfoRow
                  icon={<MeetingRoomIcon fontSize="small" />}
                  label="Room"
                  value={apt.room?.name}
                />
                <InfoRow
                  icon={<LocalHospitalIcon fontSize="small" />}
                  label="Clinic"
                  value={apt.clinic?.name}
                />
                {apt.notes && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">Notes</Typography>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{apt.notes}</Typography>
                  </Box>
                )}
              </SectionCard>

              {/* Status Timeline — custom pure-MUI implementation */}
              {apt.status_logs?.length > 0 && (
                <Box mb={2}>
                  <Typography variant="subtitle2" fontWeight={700} color="text.secondary" mb={1}>
                    Status History
                  </Typography>
                  <Box>
                    {apt.status_logs.map((log, idx) => {
                      const dotColor = {
                        confirmed: 'success.main',
                        cancelled: 'error.main',
                        completed: 'info.main',
                        no_show: 'text.disabled',
                        pending: 'warning.main',
                      }[log.status] ?? 'text.disabled'
                      const isLast = idx === apt.status_logs.length - 1
                      return (
                        <Stack key={log.id} direction="row" spacing={1.5}>
                          {/* Dot + connector */}
                          <Box display="flex" flexDirection="column" alignItems="center">
                            <Box
                              sx={{
                                width: 10,
                                height: 10,
                                borderRadius: '50%',
                                bgcolor: dotColor,
                                flexShrink: 0,
                                mt: 0.6,
                              }}
                            />
                            {!isLast && (
                              <Box sx={{ width: 2, flex: 1, bgcolor: 'divider', my: 0.25 }} />
                            )}
                          </Box>
                          {/* Content */}
                          <Box pb={isLast ? 0 : 1.5}>
                            <Typography variant="body2" fontWeight={600} sx={{ textTransform: 'capitalize' }}>
                              {log.status.replace('_', ' ')}
                            </Typography>
                            {log.reason && (
                              <Typography variant="caption" color="text.secondary" display="block">
                                {log.reason}
                              </Typography>
                            )}
                            <Typography variant="caption" color="text.disabled">
                              {dayjs(log.created_at).format('DD MMM YYYY, h:mm A')}
                              {log.changed_by_user ? ` · ${log.changed_by_user.name}` : ''}
                            </Typography>
                          </Box>
                        </Stack>
                      )
                    })}
                  </Box>
                </Box>
              )}
            </>
          ) : (
            <Typography color="text.secondary">Appointment not found.</Typography>
          )}
        </Box>

        {/* Action footer */}
        {apt && !isTerminal && (
          <>
            <Divider />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} flexWrap="wrap" p={2} gap={1}>
              <Tooltip title="Mark Completed">
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<TaskAltIcon />}
                  onClick={() => completeAppointment({ variables: { id: apt.id } })}
                  sx={{ background: 'linear-gradient(135deg, #0F9D58 0%, #0B8043 100%)', '&:hover': { background: 'linear-gradient(135deg, #0B8043 0%, #097A3D 100%)' }, flexGrow: { xs: 1, sm: 0 } }}
                >
                  Complete
                </Button>
              </Tooltip>
              <Tooltip title="Mark No Show">
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<PersonOffIcon />}
                  onClick={() => markNoShow({ variables: { id: apt.id } })}
                  sx={{ borderColor: '#F9AB00', color: '#8A4700', '&:hover': { bgcolor: '#FEF7E0', borderColor: '#F9AB00' }, flexGrow: { xs: 1, sm: 0 } }}
                >
                  No Show
                </Button>
              </Tooltip>
              <Tooltip title="Cancel Appointment">
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<CancelIcon />}
                  onClick={() => setCancelOpen(true)}
                  sx={{ borderColor: '#D93025', color: '#D93025', '&:hover': { bgcolor: '#FCE8E6', borderColor: '#D93025' }, flexGrow: { xs: 1, sm: 0 } }}
                >
                  Cancel
                </Button>
              </Tooltip>
            </Stack>
          </>
        )}
      </Drawer>

      {/* Cancel sub-dialog */}
      <CancelDialog
        open={cancelOpen}
        appointmentId={apt?.id}
        onClose={() => setCancelOpen(false)}
        onConfirm={(id, reason) => cancelAppointment({ variables: { id, reason } })}
      />
    </>
  )
}
