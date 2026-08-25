import { useState, useEffect } from 'react'
import { useQuery, gql } from '@apollo/client'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Autocomplete,
  Box,
  Checkbox,
  CircularProgress,
  Divider,
  FormControlLabel,
  Grid,
  MenuItem,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'
import PersonSearchIcon from '@mui/icons-material/PersonSearch'
import PersonAddIcon from '@mui/icons-material/PersonAdd'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import dayjs from 'dayjs'

import { PATIENTS_QUERY } from '../../graphql/queries'

// REQ052 (US-BOOK-06) — per-clinic (optionally per-service) configurable
// booking intake fields. Page-local gql const, matching this codebase's own
// established per-page convention (no shared query for this).
const INTAKE_FIELD_CONFIGS_QUERY = gql`
  query IntakeFieldConfigs($clinic_id: ID, $product_id: ID) {
    intakeFieldConfigs(clinic_id: $clinic_id, product_id: $product_id) {
      id
      key
      label
      field_type
      is_required
      sort_order
    }
  }
`

// ─── New patient validation schema ───────────────────────────────────────────
const newPatientSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().optional(),
  date_of_birth: z.any().optional(),
  gender: z.string().optional(),
})

const GENDER_OPTIONS = ['male', 'female', 'other', 'prefer_not_to_say']

export default function BookingStep4Patient({ wizardData, updateWizard }) {
  const [patientMode, setPatientMode] = useState(wizardData.patientMode ?? 'existing')
  const [searchInput, setSearchInput] = useState('')
  const [selectedPatient, setSelectedPatient] = useState(wizardData.patient ?? null)

  const { data: patientsData, loading: loadingPatients } = useQuery(PATIENTS_QUERY, {
    variables: { search: searchInput, first: 20 },
    skip: patientMode !== 'existing' || searchInput.length < 2,
    fetchPolicy: 'network-only',
  })

  const patients = patientsData?.patients?.data ?? []

  // REQ052 (US-BOOK-06) — clinic is known from step 1, service from step 2;
  // both are already in wizardData by the time this step renders.
  const { data: intakeData } = useQuery(INTAKE_FIELD_CONFIGS_QUERY, {
    variables: { clinic_id: wizardData.clinic?.id, product_id: wizardData.service?.id },
    skip: !wizardData.clinic?.id,
    fetchPolicy: 'network-only',
  })
  const rawIntakeFields = intakeData?.intakeFieldConfigs
  const intakeFields = [...(rawIntakeFields ?? [])].sort((a, b) => a.sort_order - b.sort_order)

  const [intakeAnswers, setIntakeAnswers] = useState(() => {
    const initial = {}
    ;(wizardData.intake_responses ?? []).forEach((r) => { initial[r.key] = r.value })
    return initial
  })

  // Recompute validity once the field config loads (or changes) — separate
  // from handleIntakeChange below, which keeps validity current as the user
  // types. Both write intakeFieldsValid so BookingWizard's canProceed() can
  // gate the Next button without re-fetching the config itself.
  useEffect(() => {
    if (!rawIntakeFields) return
    const allRequiredFilled = rawIntakeFields.every((f) => !f.is_required || (intakeAnswers[f.key] ?? '') !== '')
    updateWizard({ intakeFieldsValid: allRequiredFilled })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawIntakeFields])

  const handleIntakeChange = (key, value) => {
    const next = { ...intakeAnswers, [key]: value }
    setIntakeAnswers(next)
    const responses = Object.entries(next)
      .filter(([, v]) => v !== undefined && v !== '')
      .map(([k, v]) => ({ key: k, value: v }))
    const allRequiredFilled = intakeFields.every((f) => !f.is_required || (next[f.key] ?? '') !== '')
    updateWizard({ intake_responses: responses, intakeFieldsValid: allRequiredFilled })
  }

  const { control, handleSubmit, getValues, formState: { errors }, reset } = useForm({
    resolver: zodResolver(newPatientSchema),
    defaultValues: wizardData.newPatient ?? {
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      date_of_birth: null,
      gender: '',
    },
  })

  const handleModeChange = (_, val) => {
    if (!val) return
    setPatientMode(val)
    updateWizard({ patientMode: val, patient: null, newPatient: null })
  }

  const handleExistingPatientChange = (_, patient) => {
    setSelectedPatient(patient)
    updateWizard({ patient })
  }

  // Sync new patient form changes up to wizard state on every change
  const syncNewPatient = () => {
    const vals = getValues()
    updateWizard({ newPatient: Object.values(vals).some(Boolean) ? vals : null })
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box>
        <Typography variant="h6" fontWeight={700} mb={0.5}>Patient Details</Typography>
        <Typography variant="body2" color="text.secondary" mb={3}>
          Search for an existing patient or register a new one.
        </Typography>

        {/* Mode toggle */}
        <ToggleButtonGroup
          value={patientMode}
          exclusive
          onChange={handleModeChange}
          size="small"
          sx={{ mb: 3 }}
        >
          <ToggleButton value="existing">
            <PersonSearchIcon fontSize="small" sx={{ mr: 0.75 }} />
            Existing Patient
          </ToggleButton>
          <ToggleButton value="new">
            <PersonAddIcon fontSize="small" sx={{ mr: 0.75 }} />
            New Patient
          </ToggleButton>
        </ToggleButtonGroup>

        {/* Existing patient autocomplete */}
        {patientMode === 'existing' && (
          <Autocomplete
            value={selectedPatient}
            inputValue={searchInput}
            onInputChange={(_, val) => setSearchInput(val)}
            onChange={handleExistingPatientChange}
            options={patients}
            getOptionLabel={(p) => `${p.full_name} (${p.email ?? p.phone ?? ''})`}
            isOptionEqualToValue={(opt, val) => opt.id === val.id}
            loading={loadingPatients}
            noOptionsText={searchInput.length < 2 ? 'Type at least 2 characters…' : 'No patients found'}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Search patient by name or email"
                placeholder="Type to search…"
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <>
                      {loadingPatients ? <CircularProgress size={18} /> : null}
                      {params.InputProps.endAdornment}
                    </>
                  ),
                }}
              />
            )}
          />
        )}

        {/* New patient form */}
        {patientMode === 'new' && (
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Controller
                name="first_name"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="First Name *"
                    fullWidth
                    error={!!errors.first_name}
                    helperText={errors.first_name?.message}
                    onChange={(e) => { field.onChange(e); syncNewPatient() }}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Controller
                name="last_name"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Last Name *"
                    fullWidth
                    error={!!errors.last_name}
                    helperText={errors.last_name?.message}
                    onChange={(e) => { field.onChange(e); syncNewPatient() }}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Controller
                name="email"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Email"
                    fullWidth
                    error={!!errors.email}
                    helperText={errors.email?.message}
                    onChange={(e) => { field.onChange(e); syncNewPatient() }}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Controller
                name="phone"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Phone"
                    fullWidth
                    onChange={(e) => { field.onChange(e); syncNewPatient() }}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Controller
                name="date_of_birth"
                control={control}
                render={({ field }) => (
                  <DatePicker
                    label="Date of Birth"
                    value={field.value}
                    onChange={(val) => { field.onChange(val); syncNewPatient() }}
                    disableFuture
                    slotProps={{ textField: { fullWidth: true } }}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Controller
                name="gender"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    select
                    label="Gender"
                    fullWidth
                    onChange={(e) => { field.onChange(e); syncNewPatient() }}
                  >
                    <MenuItem value="">Prefer not to say</MenuItem>
                    {GENDER_OPTIONS.map((g) => (
                      <MenuItem key={g} value={g} sx={{ textTransform: 'capitalize' }}>
                        {g.replace(/_/g, ' ')}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />
            </Grid>
          </Grid>
        )}

        {/* REQ052 (US-BOOK-06) — clinic-configured intake fields */}
        {intakeFields.length > 0 && (
          <Box mt={3}>
            <Divider sx={{ mb: 2 }} />
            <Typography variant="subtitle2" fontWeight={700} mb={1.5}>
              Additional Information
            </Typography>
            <Grid container spacing={2}>
              {intakeFields.map((f) => (
                <Grid item xs={12} sm={f.field_type === 'textarea' ? 12 : 6} key={f.id}>
                  {f.field_type === 'boolean' ? (
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={intakeAnswers[f.key] === 'true'}
                          onChange={(e) => handleIntakeChange(f.key, e.target.checked ? 'true' : 'false')}
                        />
                      }
                      label={f.is_required ? `${f.label} *` : f.label}
                    />
                  ) : (
                    <TextField
                      label={f.is_required ? `${f.label} *` : f.label}
                      fullWidth
                      type={f.field_type === 'number' ? 'number' : 'text'}
                      multiline={f.field_type === 'textarea'}
                      rows={f.field_type === 'textarea' ? 3 : undefined}
                      value={intakeAnswers[f.key] ?? ''}
                      onChange={(e) => handleIntakeChange(f.key, e.target.value)}
                      required={f.is_required}
                    />
                  )}
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        {/* Internal notes */}
        <Box mt={3}>
          <TextField
            label="Internal notes (optional)"
            multiline
            rows={3}
            fullWidth
            value={wizardData.notes ?? ''}
            onChange={(e) => updateWizard({ notes: e.target.value })}
            placeholder="e.g. Patient has needle phobia, please note for clinical team."
          />
        </Box>
      </Box>
    </LocalizationProvider>
  )
}
