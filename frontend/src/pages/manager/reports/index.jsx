import { useState, useEffect } from 'react'
import { useApolloClient, gql } from '@apollo/client'
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Grid,
  MenuItem,
  Stack,
  TextField,
  Typography,
  IconButton,
  Tooltip,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import PeopleAltIcon from '@mui/icons-material/PeopleAlt'
import ScheduleSendIcon from '@mui/icons-material/ScheduleSend'
import { CLINICS_QUERY } from '../../../graphql/queries'

// REQ029 (US-RPT-02/03) — Patient report group + scheduled delivery.
// Real backend from day one, same convention as admin/Departments.jsx.
// Desktop-dense tier (manager-facing reporting console).
const GET_PATIENT_REPORT_GROUP = gql`
  query GetPatientReportGroup($clinicId: ID, $startDate: String!, $endDate: String!, $lapsedLookbackDays: Int) {
    getPatientReportGroup(clinicId: $clinicId, startDate: $startDate, endDate: $endDate, lapsedLookbackDays: $lapsedLookbackDays) {
      newPatients
      repeatPatients
      acquisitionSourceBreakdown {
        source
        count
      }
      lapsedPatients {
        id
        full_name
        last_visit
      }
    }
  }
`
const GET_SCHEDULED_REPORTS = gql`
  query GetScheduledReports {
    scheduledReports {
      id
      report_type
      cadence
      channel
      is_active
      last_sent_at
      clinic_id
    }
  }
`
const CREATE_SCHEDULED_REPORT = gql`
  mutation CreateScheduledReport($input: ScheduledReportInput!) {
    createScheduledReport(input: $input) {
      id
    }
  }
`
const DEACTIVATE_SCHEDULED_REPORT = gql`
  mutation DeactivateScheduledReport($id: ID!) {
    deactivateScheduledReport(id: $id) {
      id
      is_active
    }
  }
`

const REPORT_TYPES = [
  { value: 'daily_collections', label: 'Daily Collections' },
  { value: 'patient_report_group', label: 'Patient Report Group' },
  { value: 'utilisation', label: 'Utilisation' },
]
const CADENCES = ['daily', 'weekly', 'monthly']

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}
function daysAgoIso(n) {
  return new Date(Date.now() - n * 86400000).toISOString().slice(0, 10)
}

export default function ManagerReportsPage() {
  const client = useApolloClient()
  const [clinics, setClinics] = useState([])
  const [clinicId, setClinicId] = useState('')
  const [startDate, setStartDate] = useState(daysAgoIso(30))
  const [endDate, setEndDate] = useState(todayIso())
  const [patientGroup, setPatientGroup] = useState(null)
  const [schedules, setSchedules] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [showScheduleForm, setShowScheduleForm] = useState(false)
  const [scheduleForm, setScheduleForm] = useState({ report_type: 'daily_collections', cadence: 'daily', channel: 'email', recipients: '' })
  const [formError, setFormError] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const loadClinics = async () => {
    const { data } = await client.query({ query: CLINICS_QUERY, fetchPolicy: 'network-only' })
    setClinics(data?.clinics ?? [])
  }

  const loadReportData = async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const [{ data: groupData }, { data: schedData }] = await Promise.all([
        client.query({
          query: GET_PATIENT_REPORT_GROUP,
          variables: { clinicId: clinicId || undefined, startDate, endDate, lapsedLookbackDays: 90 },
          fetchPolicy: 'network-only',
        }),
        client.query({ query: GET_SCHEDULED_REPORTS, fetchPolicy: 'network-only' }),
      ])
      setPatientGroup(groupData?.getPatientReportGroup ?? null)
      setSchedules(schedData?.scheduledReports ?? [])
    } catch (err) {
      setLoadError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadClinics().catch((e) => setLoadError(e.message))
  }, []) // eslint-disable-line
  useEffect(() => {
    loadReportData()
  }, [clinicId, startDate, endDate]) // eslint-disable-line

  const showSuccess = (msg) => {
    setSuccessMsg(msg)
    setTimeout(() => setSuccessMsg(null), 3000)
  }

  const submitSchedule = async (e) => {
    e.preventDefault()
    const recipients = scheduleForm.recipients
      .split(',')
      .map((r) => r.trim())
      .filter(Boolean)
    if (recipients.length === 0) {
      setFormError('At least one recipient email is required')
      return
    }
    setSubmitting(true)
    setFormError(null)
    try {
      await client.mutate({
        mutation: CREATE_SCHEDULED_REPORT,
        variables: {
          input: {
            clinic_id: clinicId || undefined,
            report_type: scheduleForm.report_type,
            cadence: scheduleForm.cadence,
            channel: scheduleForm.channel,
            recipients,
          },
        },
      })
      showSuccess('Scheduled report created.')
      setScheduleForm({ report_type: 'daily_collections', cadence: 'daily', channel: 'email', recipients: '' })
      setShowScheduleForm(false)
      loadReportData()
    } catch (err) {
      setFormError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const deactivateSchedule = async (id) => {
    try {
      await client.mutate({ mutation: DEACTIVATE_SCHEDULED_REPORT, variables: { id } })
      loadReportData()
    } catch (err) {
      setFormError(err.message)
    }
  }

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={1}>
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Patient Reports
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Growth trends and scheduled report delivery
          </Typography>
        </Box>
      </Stack>

      <Stack direction="row" spacing={2} flexWrap="wrap" mb={3}>
        <TextField select size="small" label="Clinic" value={clinicId} onChange={(e) => setClinicId(e.target.value)} sx={{ minWidth: 200 }}>
          <MenuItem value="">All clinics</MenuItem>
          {clinics.map((c) => (
            <MenuItem key={c.id} value={c.id}>
              {c.name}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          size="small"
          type="date"
          label="From"
          InputLabelProps={{ shrink: true }}
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />
        <TextField
          size="small"
          type="date"
          label="To"
          InputLabelProps={{ shrink: true }}
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
        />
      </Stack>

      {loadError && (
        <Alert
          severity="warning"
          sx={{ mb: 2 }}
          action={
            <Button size="small" onClick={loadReportData}>
              Retry
            </Button>
          }
        >
          Failed to load: {loadError}
        </Alert>
      )}
      {successMsg && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {successMsg}
        </Alert>
      )}
      {formError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setFormError(null)}>
          {formError}
        </Alert>
      )}

      {loading ? (
        <Box display="flex" justifyContent="center" py={6}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <Grid container spacing={2.5} mb={4}>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ p: 2.5 }}>
                <Typography variant="caption" color="text.secondary">
                  New Patients
                </Typography>
                <Typography variant="h4" fontWeight={800}>
                  {patientGroup?.newPatients ?? 0}
                </Typography>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ p: 2.5 }}>
                <Typography variant="caption" color="text.secondary">
                  Repeat Patients
                </Typography>
                <Typography variant="h4" fontWeight={800}>
                  {patientGroup?.repeatPatients ?? 0}
                </Typography>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={6}>
              <Card sx={{ p: 2.5 }}>
                <Typography variant="caption" color="text.secondary" mb={1} display="block">
                  Acquisition Source
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {(patientGroup?.acquisitionSourceBreakdown ?? []).length === 0 && (
                    <Typography variant="body2" color="text.secondary">
                      No data in range
                    </Typography>
                  )}
                  {(patientGroup?.acquisitionSourceBreakdown ?? []).map((s) => (
                    <Chip key={s.source} label={`${s.source}: ${s.count}`} size="small" />
                  ))}
                </Stack>
              </Card>
            </Grid>
          </Grid>

          <Card sx={{ mb: 4 }}>
            <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Typography variant="subtitle1" fontWeight={700}>
                <PeopleAltIcon sx={{ fontSize: 18, verticalAlign: 'middle', mr: 0.5 }} />
                Lapsed Patients (recall candidates)
              </Typography>
            </Box>
            <Box sx={{ overflowX: 'auto' }}>
              <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse' }}>
                <Box component="tbody">
                  {(patientGroup?.lapsedPatients ?? []).length === 0 && (
                    <Box component="tr">
                      <Box component="td" sx={{ textAlign: 'center', py: 4 }}>
                        <Typography color="text.secondary">No lapsed patients in the lookback window</Typography>
                      </Box>
                    </Box>
                  )}
                  {(patientGroup?.lapsedPatients ?? []).map((p) => (
                    <Box
                      component="tr"
                      key={p.id}
                      sx={{ '&:hover': { bgcolor: 'grey.50' }, borderBottom: '1px solid', borderColor: 'divider' }}
                    >
                      <Box component="td" sx={{ px: 2, py: 1.5 }}>
                        <Typography fontWeight={600}>{p.full_name}</Typography>
                      </Box>
                      <Box component="td" sx={{ px: 2, py: 1.5 }}>
                        <Typography variant="body2" color="text.secondary">
                          Last visit: {p.last_visit ? new Date(p.last_visit).toLocaleDateString('en-IN') : '—'}
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                </Box>
              </Box>
            </Box>
          </Card>

          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
            <Typography variant="h6" fontWeight={700}>
              <ScheduleSendIcon sx={{ fontSize: 20, verticalAlign: 'middle', mr: 0.5 }} />
              Scheduled Reports
            </Typography>
            <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={() => setShowScheduleForm((p) => !p)}>
              Schedule a report
            </Button>
          </Stack>

          {showScheduleForm && (
            <Card sx={{ mb: 2, p: 2 }}>
              <Box component="form" onSubmit={submitSchedule}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6} md={3}>
                    <TextField
                      select
                      fullWidth
                      size="small"
                      label="Report"
                      value={scheduleForm.report_type}
                      onChange={(e) => setScheduleForm((p) => ({ ...p, report_type: e.target.value }))}
                    >
                      {REPORT_TYPES.map((t) => (
                        <MenuItem key={t.value} value={t.value}>
                          {t.label}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid item xs={12} sm={6} md={2}>
                    <TextField
                      select
                      fullWidth
                      size="small"
                      label="Cadence"
                      value={scheduleForm.cadence}
                      onChange={(e) => setScheduleForm((p) => ({ ...p, cadence: e.target.value }))}
                    >
                      {CADENCES.map((c) => (
                        <MenuItem key={c} value={c}>
                          {c}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid item xs={12} sm={12} md={5}>
                    <TextField
                      fullWidth
                      required
                      size="small"
                      label="Recipient emails (comma-separated)"
                      value={scheduleForm.recipients}
                      onChange={(e) => setScheduleForm((p) => ({ ...p, recipients: e.target.value }))}
                      placeholder="ops@clinic.test, manager@clinic.test"
                    />
                  </Grid>
                  <Grid item xs={12} sm={12} md={2}>
                    <Stack direction="row" spacing={1}>
                      <Button type="submit" variant="contained" disabled={submitting}>
                        Save
                      </Button>
                      <Button variant="outlined" onClick={() => setShowScheduleForm(false)}>
                        Cancel
                      </Button>
                    </Stack>
                  </Grid>
                </Grid>
              </Box>
            </Card>
          )}

          <Card>
            <Box sx={{ overflowX: 'auto' }}>
              <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse' }}>
                <Box component="thead">
                  <Box component="tr" sx={{ bgcolor: 'grey.50' }}>
                    {['Report', 'Cadence', 'Channel', 'Last Sent', 'Status', 'Actions'].map((h) => (
                      <Box
                        key={h}
                        component="th"
                        sx={{
                          px: 2,
                          py: 1.5,
                          textAlign: 'left',
                          typography: 'caption',
                          fontWeight: 700,
                          color: 'text.secondary',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          borderBottom: '1px solid',
                          borderColor: 'divider',
                        }}
                      >
                        {h}
                      </Box>
                    ))}
                  </Box>
                </Box>
                <Box component="tbody">
                  {schedules.length === 0 && (
                    <Box component="tr">
                      <Box component="td" colSpan={6} sx={{ textAlign: 'center', py: 4 }}>
                        <Typography color="text.secondary">No scheduled reports yet</Typography>
                      </Box>
                    </Box>
                  )}
                  {schedules.map((s) => (
                    <Box
                      component="tr"
                      key={s.id}
                      sx={{ '&:hover': { bgcolor: 'grey.50' }, borderBottom: '1px solid', borderColor: 'divider' }}
                    >
                      <Box component="td" sx={{ px: 2, py: 1.5 }}>
                        {REPORT_TYPES.find((t) => t.value === s.report_type)?.label ?? s.report_type}
                      </Box>
                      <Box component="td" sx={{ px: 2, py: 1.5 }}>
                        <Chip size="small" label={s.cadence} />
                      </Box>
                      <Box component="td" sx={{ px: 2, py: 1.5 }}>
                        {s.channel}
                      </Box>
                      <Box component="td" sx={{ px: 2, py: 1.5 }}>
                        {s.last_sent_at ? new Date(s.last_sent_at).toLocaleString('en-IN') : 'Never'}
                      </Box>
                      <Box component="td" sx={{ px: 2, py: 1.5 }}>
                        <Chip size="small" label={s.is_active ? 'Active' : 'Inactive'} color={s.is_active ? 'success' : 'default'} />
                      </Box>
                      <Box component="td" sx={{ px: 2, py: 1.5 }}>
                        {s.is_active && (
                          <Tooltip title="Deactivate">
                            <IconButton size="small" color="error" onClick={() => deactivateSchedule(s.id)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
                    </Box>
                  ))}
                </Box>
              </Box>
            </Box>
          </Card>
        </>
      )}
    </Box>
  )
}
