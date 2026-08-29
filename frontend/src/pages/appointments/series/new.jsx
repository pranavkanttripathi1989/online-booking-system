import { useState, useMemo } from 'react'
import { useQuery, useMutation } from '@apollo/client'
import { useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { useSnackbar } from 'notistack'
import dayjs from 'dayjs'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  TextField,
  Autocomplete,
  MenuItem,
  Button,
  IconButton,
  Divider,
  Alert,
  Chip,
  Stack,
  ToggleButtonGroup,
  ToggleButton,
  CircularProgress,
} from '@mui/material'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded'
import EventRepeatRoundedIcon from '@mui/icons-material/EventRepeatRounded'
import { CLINICS_QUERY, CLINICIANS_QUERY, PATIENTS_QUERY } from '../../../graphql/queries'
import { CREATE_APPOINTMENT_SERIES_MUTATION } from '../../../graphql/mutations'

const FREQUENCIES = [
  { value: 'weekly', label: 'Weekly', days: 7 },
  { value: 'biweekly', label: 'Every 2 weeks', days: 14 },
  { value: 'monthly', label: 'Monthly', days: 30 },
]

// REQ163 (P2-10) — "Recurring" and "Treatment Plan" both converge on the
// same occurrences array before submitting; the mode toggle only changes
// how that array is authored, never the backend call.
export default function NewAppointmentSeriesPage() {
  const navigate = useNavigate()
  const { enqueueSnackbar } = useSnackbar()

  const [mode, setMode] = useState('recurring')
  const [name, setName] = useState('')
  const [patient, setPatient] = useState(null)
  const [clinic, setClinic] = useState(null)
  const [clinician, setClinician] = useState(null)
  const [patientSearch, setPatientSearch] = useState('')

  // Recurring-mode fields
  const [recurringService, setRecurringService] = useState(null)
  const [frequency, setFrequency] = useState('weekly')
  const [startDate, setStartDate] = useState(dayjs().add(1, 'day').hour(10).minute(0))
  const [occurrenceCount, setOccurrenceCount] = useState(4)

  // Treatment-plan-mode fields — each row is its own service + date
  const [planRows, setPlanRows] = useState([{ service_id: '', date: dayjs().add(1, 'day').hour(10).minute(0) }])

  const [submitResult, setSubmitResult] = useState(null)

  const { data: clinicsData } = useQuery(CLINICS_QUERY)
  const { data: patientsData, loading: loadingPatients } = useQuery(PATIENTS_QUERY, {
    variables: { search: patientSearch || undefined, first: 20 },
  })
  // first: 100 matches the established convention on appointments/{index,edit}.jsx
  // — the default first: 20 lets accumulated E2E-test clinician rows push a
  // real clinician off page 1, confirmed live against this exact dataset.
  const { data: cliniciansData } = useQuery(CLINICIANS_QUERY, {
    variables: { clinic_id: clinic?.id, is_active: true, first: 100 },
    skip: !clinic,
  })

  const [createSeries, { loading: submitting }] = useMutation(CREATE_APPOINTMENT_SERIES_MUTATION)

  const clinics = clinicsData?.clinics ?? []
  const patients = patientsData?.patients?.data ?? []
  const clinicians = cliniciansData?.clinicians?.data ?? []
  // ARCH-15 — matches BookingStep2Clinician.jsx's own established
  // contract exactly: a clinic can carry only org-level service masters
  // (clinic_id: null, per REQ055), so a clinic-scoped SERVICES_QUERY
  // legitimately returns nothing even when the clinic has real bookable
  // services — confirmed live. The correct, already-proven source is the
  // selected clinician's own `services` relation (CLINICIAN_FIELDS
  // already selects it), not a separate clinic-wide query.
  const services = clinician?.services ?? []

  // Client-side occurrence generation for "Recurring" mode — the one place
  // a subtle bug could hide with no backend safety net, kept as a small
  // pure computation for testability.
  const recurringOccurrences = useMemo(() => {
    if (mode !== 'recurring' || !recurringService || !startDate) return []
    const freq = FREQUENCIES.find((f) => f.value === frequency) ?? FREQUENCIES[0]
    return Array.from({ length: Math.max(0, occurrenceCount) }, (_, i) => ({
      start_datetime: startDate.add(i * freq.days, 'day').toISOString(),
      service_id: recurringService.id,
    }))
  }, [mode, recurringService, frequency, startDate, occurrenceCount])

  const planOccurrences = useMemo(
    () => planRows.filter((r) => r.service_id && r.date).map((r) => ({ start_datetime: r.date.toISOString(), service_id: r.service_id })),
    [planRows],
  )

  const occurrences = mode === 'recurring' ? recurringOccurrences : planOccurrences

  const canSubmit = name.trim() && patient && clinic && clinician && occurrences.length >= 2 && !submitting

  const addPlanRow = () => setPlanRows((rows) => [...rows, { service_id: '', date: dayjs().add(1, 'day').hour(10).minute(0) }])
  const removePlanRow = (index) => setPlanRows((rows) => rows.filter((_, i) => i !== index))
  const updatePlanRow = (index, field, value) =>
    setPlanRows((rows) => rows.map((r, i) => (i === index ? { ...r, [field]: value } : r)))

  const handleSubmit = async () => {
    setSubmitResult(null)
    try {
      const { data } = await createSeries({
        variables: {
          input: {
            name: name.trim(),
            patient_id: patient.id,
            clinic_id: clinic.id,
            clinician_id: clinician.id,
            series_type: mode === 'recurring' ? 'recurring' : 'treatment_plan',
            occurrences,
            idempotency_key: `series-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          },
        },
      })
      const result = data.createAppointmentSeries
      setSubmitResult(result)
      if (result.success) {
        enqueueSnackbar(
          result.failed_count > 0
            ? `${result.created_count} of ${result.attempted_count} appointments scheduled — see details below.`
            : `All ${result.created_count} appointments scheduled.`,
          { variant: result.failed_count > 0 ? 'warning' : 'success' },
        )
      } else {
        enqueueSnackbar('Could not schedule any appointment in this series.', { variant: 'error' })
      }
    } catch (err) {
      enqueueSnackbar(err.message || 'Could not create the series.', { variant: 'error' })
    }
  }

  return (
    <Box className="page-enter" p={{ xs: 2, md: 3 }} maxWidth="lg" mx="auto">
      <Helmet>
        <title>New Appointment Series — MediBook</title>
      </Helmet>
      <Box mb={3}>
        <Typography variant="h4" fontWeight={800} display="flex" alignItems="center" gap={1.5}>
          <EventRepeatRoundedIcon fontSize="large" sx={{ color: 'primary.main' }} />
          New Appointment Series
        </Typography>
        <Typography variant="body2" color="text.secondary" mt={0.5}>
          Schedule a recurring series or a multi-visit treatment plan for a patient in one action.
        </Typography>
      </Box>

      {submitResult && (
        <Alert
          severity={submitResult.failed_count > 0 ? 'warning' : submitResult.success ? 'success' : 'error'}
          sx={{ mb: 3 }}
          onClose={() => setSubmitResult(null)}
        >
          <Typography fontWeight={700} sx={{ mb: submitResult.failures?.length ? 1 : 0 }}>
            {submitResult.created_count} of {submitResult.attempted_count} appointments scheduled.
          </Typography>
          {submitResult.failures?.map((f) => (
            <Typography key={f.occurrence_index} variant="body2">
              Occurrence {f.occurrence_index + 1}: {f.message}
            </Typography>
          ))}
          {submitResult.series?.id && (
            <Button size="small" sx={{ mt: 1, textTransform: 'none' }} onClick={() => navigate(`/appointments/series/${submitResult.series.id}`)}>
              View series
            </Button>
          )}
        </Alert>
      )}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={700} mb={2}>
            Series details
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField label="Series name" fullWidth value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. 8-week physiotherapy program" />
            </Grid>
            <Grid item xs={12} md={6}>
              <Autocomplete
                options={patients}
                loading={loadingPatients}
                getOptionLabel={(p) => `${p.full_name} (${p.phone})`}
                value={patient}
                onChange={(_, v) => setPatient(v)}
                onInputChange={(_, v) => setPatientSearch(v)}
                renderInput={(params) => <TextField {...params} label="Patient" placeholder="Search by name or phone" />}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Autocomplete
                options={clinics}
                getOptionLabel={(c) => c.name}
                value={clinic}
                onChange={(_, v) => {
                  setClinic(v)
                  setClinician(null)
                }}
                renderInput={(params) => <TextField {...params} label="Clinic" />}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Autocomplete
                options={clinicians}
                getOptionLabel={(c) => c.full_name}
                value={clinician}
                onChange={(_, v) => {
                  setClinician(v)
                  setRecurringService(null)
                  setPlanRows([{ service_id: '', date: dayjs().add(1, 'day').hour(10).minute(0) }])
                }}
                disabled={!clinic}
                renderInput={(params) => <TextField {...params} label="Clinician" />}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="subtitle1" fontWeight={700}>
              Occurrences
            </Typography>
            <ToggleButtonGroup size="small" exclusive value={mode} onChange={(_, v) => v && setMode(v)}>
              <ToggleButton value="recurring" sx={{ textTransform: 'none' }}>
                Recurring
              </ToggleButton>
              <ToggleButton value="treatment_plan" sx={{ textTransform: 'none' }}>
                Treatment Plan
              </ToggleButton>
            </ToggleButtonGroup>
          </Stack>

          {mode === 'recurring' ? (
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <Autocomplete
                  options={services}
                  getOptionLabel={(s) => s.name}
                  value={recurringService}
                  onChange={(_, v) => setRecurringService(v)}
                  disabled={!clinician}
                  renderInput={(params) => <TextField {...params} label="Service" />}
                />
              </Grid>
              <Grid item xs={6} md={3}>
                <TextField select label="Frequency" fullWidth value={frequency} onChange={(e) => setFrequency(e.target.value)}>
                  {FREQUENCIES.map((f) => (
                    <MenuItem key={f.value} value={f.value}>
                      {f.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={6} md={2}>
                <TextField
                  type="number"
                  label="Occurrences"
                  fullWidth
                  value={occurrenceCount}
                  onChange={(e) => setOccurrenceCount(Math.max(2, Math.min(52, Number(e.target.value) || 2)))}
                  inputProps={{ min: 2, max: 52 }}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <DatePicker
                  label="First occurrence"
                  value={startDate}
                  onChange={(v) => v && setStartDate(v)}
                  disablePast
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </Grid>
              {recurringOccurrences.length > 0 && (
                <Grid item xs={12}>
                  <Stack direction="row" flexWrap="wrap" gap={1}>
                    {recurringOccurrences.map((o, i) => (
                      <Chip key={i} label={dayjs(o.start_datetime).format('ddd, D MMM YYYY, h:mm A')} size="small" />
                    ))}
                  </Stack>
                </Grid>
              )}
            </Grid>
          ) : (
            <Stack spacing={2}>
              {planRows.map((row, index) => (
                <Stack key={index} direction="row" spacing={2} alignItems="center">
                  <Autocomplete
                    sx={{ flex: 2 }}
                    options={services}
                    getOptionLabel={(s) => s.name}
                    value={services.find((s) => s.id === row.service_id) ?? null}
                    onChange={(_, v) => updatePlanRow(index, 'service_id', v?.id ?? '')}
                    disabled={!clinician}
                    renderInput={(params) => <TextField {...params} label={`Step ${index + 1} — Service`} />}
                  />
                  <DatePicker
                    label="Date"
                    value={row.date}
                    onChange={(v) => updatePlanRow(index, 'date', v)}
                    disablePast
                    slotProps={{ textField: { sx: { flex: 1 } } }}
                  />
                  <IconButton aria-label={`Remove step ${index + 1}`} onClick={() => removePlanRow(index)} disabled={planRows.length <= 1}>
                    <DeleteRoundedIcon fontSize="small" />
                  </IconButton>
                </Stack>
              ))}
              <Button startIcon={<AddRoundedIcon />} onClick={addPlanRow} sx={{ alignSelf: 'flex-start', textTransform: 'none' }}>
                Add step
              </Button>
            </Stack>
          )}
        </CardContent>
      </Card>

      <Divider sx={{ mb: 3 }} />

      <Stack direction="row" spacing={2} justifyContent="flex-end">
        <Button variant="outlined" onClick={() => navigate('/appointments')} sx={{ textTransform: 'none' }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={!canSubmit}
          startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : null}
          sx={{ textTransform: 'none', fontWeight: 700 }}
        >
          {submitting ? 'Scheduling…' : `Create Series (${occurrences.length} appointments)`}
        </Button>
      </Stack>
    </Box>
  )
}
