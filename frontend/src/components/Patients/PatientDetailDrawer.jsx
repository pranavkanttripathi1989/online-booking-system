import { useState, useRef } from 'react'
import { useQuery, useMutation } from '@apollo/client'
import dayjs from 'dayjs'
import {
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Drawer,
  IconButton,
  Paper,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import EmailIcon from '@mui/icons-material/Email'
import PhoneIcon from '@mui/icons-material/Phone'
import CakeIcon from '@mui/icons-material/Cake'
import WcIcon from '@mui/icons-material/Wc'
import HomeIcon from '@mui/icons-material/Home'

import { PATIENT_DETAIL_QUERY } from '../../graphql/queries'
import { UPDATE_PATIENT_MUTATION } from '../../graphql/mutations'

// ─── Status chip colour ───────────────────────────────────────────────────────
const STATUS_COLOR = {
  pending: 'warning',
  confirmed: 'success',
  cancelled: 'error',
  completed: 'info',
  no_show: 'default',
}

// ─── Info row ─────────────────────────────────────────────────────────────────
function InfoRow({ icon, text }) {
  if (!text) return null
  return (
    <Stack direction="row" spacing={1.5} alignItems="center">
      <Box color="text.secondary" display="flex">
        {icon}
      </Box>
      <Typography variant="body2">{text}</Typography>
    </Stack>
  )
}

// ─── Gender display ───────────────────────────────────────────────────────────
const GENDER_CHIP = { male: 'info', female: 'secondary', other: 'default', prefer_not_to_say: 'default' }
function genderLabel(g) {
  return (g ?? 'unknown').replace(/_/g, ' ')
}

// ─── Age from DOB ─────────────────────────────────────────────────────────────
function ageFromDob(dob) {
  if (!dob) return null
  return dayjs().diff(dayjs(dob), 'year')
}

// ─── PatientDetailDrawer ──────────────────────────────────────────────────────
export default function PatientDetailDrawer({ open, patientId, onClose }) {
  const notesRef = useRef(null)

  const { data, loading } = useQuery(PATIENT_DETAIL_QUERY, {
    variables: { id: patientId },
    skip: !patientId,
    fetchPolicy: 'cache-and-network',
  })

  const [updatePatient] = useMutation(UPDATE_PATIENT_MUTATION)

  const patient = data?.patient

  // Auto-save notes on blur
  const handleNotesBlur = () => {
    const notes = notesRef.current?.value ?? ''
    if (!patient) return
    if (notes === (patient.notes ?? '')) return
    updatePatient({ variables: { id: patient.id, input: { notes } } })
  }

  const appointments = patient?.appointments?.data ?? []
  const sortedAppts = [...appointments].sort((a, b) => new Date(b.start_datetime) - new Date(a.start_datetime))
  const age = ageFromDob(patient?.date_of_birth)

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { width: { xs: '100%', sm: 480 }, display: 'flex', flexDirection: 'column', overflow: 'hidden' } }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 2.5,
          background: 'linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(139,92,246,0.06) 100%)',
          borderBottom: '1px solid',
          borderColor: 'divider',
          flexShrink: 0,
        }}
      >
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" spacing={2} alignItems="center">
            <Avatar sx={{ width: 52, height: 52, bgcolor: 'primary.main', fontWeight: 700, fontSize: 20 }}>
              {patient?.full_name?.[0] ?? 'P'}
            </Avatar>
            <Box>
              <Typography variant="h6" fontWeight={800}>
                {loading ? <Skeleton width={160} /> : (patient?.full_name ?? '—')}
              </Typography>
              <Stack direction="row" spacing={0.75} flexWrap="wrap" mt={0.5}>
                {age !== null && <Chip label={`${age} yrs`} size="small" variant="outlined" sx={{ height: 20, fontSize: 11 }} />}
                {patient?.gender && (
                  <Chip
                    label={genderLabel(patient.gender)}
                    color={GENDER_CHIP[patient.gender] ?? 'default'}
                    size="small"
                    sx={{ height: 20, fontSize: 11, textTransform: 'capitalize' }}
                  />
                )}
              </Stack>
            </Box>
          </Stack>
          <IconButton size="small" onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Stack>
      </Box>

      {/* Body */}
      <Box sx={{ flex: 1, overflowY: 'auto', p: 2.5 }}>
        {loading && !patient ? (
          <Stack spacing={2}>
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} variant="rounded" height={42} sx={{ borderRadius: 2 }} />
            ))}
          </Stack>
        ) : patient ? (
          <>
            {/* Contact details */}
            <Typography variant="subtitle2" fontWeight={700} color="text.secondary" mb={1.25}>
              Contact Details
            </Typography>
            <Paper elevation={0} sx={{ p: 1.75, border: '1px solid', borderColor: 'divider', borderRadius: 2, mb: 2.5 }}>
              <Stack spacing={1.25}>
                <InfoRow icon={<EmailIcon fontSize="small" />} text={patient.email} />
                <InfoRow icon={<PhoneIcon fontSize="small" />} text={patient.phone} />
                <InfoRow
                  icon={<CakeIcon fontSize="small" />}
                  text={patient.date_of_birth ? dayjs(patient.date_of_birth).format('DD MMM YYYY') : null}
                />
                <InfoRow icon={<HomeIcon fontSize="small" />} text={patient.address} />
              </Stack>
            </Paper>

            {/* Appointment history */}
            <Typography variant="subtitle2" fontWeight={700} color="text.secondary" mb={1.25}>
              Appointment History
              <Chip label={patient.appointments?.paginatorInfo?.total ?? 0} size="small" sx={{ ml: 1, height: 18, fontSize: 11 }} />
            </Typography>
            {sortedAppts.length === 0 ? (
              <Typography variant="body2" color="text.secondary" mb={2.5} textAlign="center">
                No appointments on record.
              </Typography>
            ) : (
              <TableContainer
                component={Paper}
                elevation={0}
                sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, mb: 2.5 }}
              >
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ '& th': { fontWeight: 700, fontSize: 11, color: 'text.secondary', bgcolor: 'rgba(0,0,0,0.02)' } }}>
                      <TableCell>Date</TableCell>
                      <TableCell>Clinician</TableCell>
                      <TableCell>Service</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {sortedAppts.map((apt) => (
                      <TableRow key={apt.id} hover sx={{ '&:last-child td': { border: 0 } }}>
                        <TableCell sx={{ fontSize: 12 }}>{dayjs(apt.start_datetime).format('DD MMM YY')}</TableCell>
                        <TableCell sx={{ fontSize: 12 }}>{apt.clinician?.full_name ?? '—'}</TableCell>
                        <TableCell sx={{ fontSize: 12 }}>{apt.service?.name ?? '—'}</TableCell>
                        <TableCell>
                          <Chip
                            label={(apt.status ?? '').replace('_', ' ')}
                            color={STATUS_COLOR[apt.status] ?? 'default'}
                            size="small"
                            sx={{ fontWeight: 600, fontSize: 10, textTransform: 'capitalize', height: 20 }}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            {/* Notes */}
            <Typography variant="subtitle2" fontWeight={700} color="text.secondary" mb={1.25}>
              Internal Notes
            </Typography>
            <TextField
              inputRef={notesRef}
              multiline
              rows={4}
              fullWidth
              defaultValue={patient.notes ?? ''}
              onBlur={handleNotesBlur}
              placeholder="Add internal notes about this patient… (auto-saved on blur)"
              helperText="Notes are saved automatically when you click away."
            />
          </>
        ) : (
          <Typography color="text.secondary">Patient not found.</Typography>
        )}
      </Box>
    </Drawer>
  )
}
