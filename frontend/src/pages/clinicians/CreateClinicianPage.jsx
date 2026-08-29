import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from '@apollo/client'
import { Helmet } from 'react-helmet-async'
import { useSnackbar } from 'notistack'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  FormControlLabel,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  OutlinedInput,
  Paper,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded'
import PersonAddRoundedIcon from '@mui/icons-material/PersonAddRounded'
import SaveRoundedIcon from '@mui/icons-material/SaveRounded'

import { CREATE_CLINICIAN_MUTATION } from '../../graphql/mutations'
import { CLINICS_QUERY, CLINICIAN_TYPES_QUERY, SERVICES_QUERY, CLINICIANS_QUERY } from '../../graphql/queries'
import * as MockStore from '../../mocks/store'
import ErrorBoundary from '../../components/ErrorBoundary'

const LANGUAGE_OPTIONS = ['English', 'Spanish', 'French', 'German', 'Arabic', 'Mandarin', 'Hindi', 'Urdu', 'Portuguese', 'Italian']
const GENDER_OPTIONS = ['male', 'female', 'other', 'prefer_not_to_say']

// ─── Validation (context/frontend-hard-rules.md §2.1) ─────────────────────────
const clinicianSchema = z
  .object({
    first_name: z.string().trim().min(1, 'Required'),
    last_name: z.string().trim().min(1, 'Required'),
    email: z.string().trim().min(1, 'Required').email('Invalid email format'),
    phone: z.string().optional(),
    gender: z.string().optional(),
    bio: z.string().optional(),
    consultation_fee: z.string().optional(),
    clinician_type_id: z.string().optional(),
    specialties: z.array(z.string()).default([]),
    qualifications: z.string().optional(),
    registration_number: z.string().optional(),
    clinic_ids: z.array(z.string()).default([]),
    service_ids: z.array(z.string()).default([]),
    languages: z.array(z.string()).default([]),
    is_active: z.boolean().default(true),
    is_locum: z.boolean().default(false),
    locum_for: z.string().optional(),
    locum_start_date: z.string().optional(),
    locum_end_date: z.string().optional(),
  })
  .refine((v) => !v.is_locum || !!v.locum_for, { message: 'Select who this locum is covering for', path: ['locum_for'] })

function CreateClinicianPageContent() {
  const navigate = useNavigate()
  const { enqueueSnackbar } = useSnackbar()

  const { data: clinicsData, error: clinicsError } = useQuery(CLINICS_QUERY)
  const { data: typesData, error: typesError } = useQuery(CLINICIAN_TYPES_QUERY)
  const { data: servicesData, error: servicesError } = useQuery(SERVICES_QUERY)
  // Real clinicians list, for the "who is this locum covering for" picker
  // below -- this used to be a useMockData() hook with zero real GraphQL
  // call at all, so that dropdown always showed fabricated names regardless
  // of the org's actual clinicians.
  const { data: cliniciansData, error: cliniciansError } = useQuery(CLINICIANS_QUERY, { variables: { first: 100 } })
  // Fall back to mock data for dropdowns only on a real query error.
  const clinics = (clinicsError ? MockStore.getClinics() : (clinicsData?.clinics ?? [])).filter((c) => c.is_active)
  const types = typesError ? MockStore.getClinicianTypes() : (typesData?.clinicianTypes ?? [])
  const services = servicesError ? MockStore.getServices() : (servicesData?.services ?? [])
  const allClinicians = cliniciansError ? MockStore.getClinicians() : (cliniciansData?.clinicians?.data ?? [])

  const [createClinician, { loading }] = useMutation(CREATE_CLINICIAN_MUTATION, {
    onCompleted: (d) => {
      enqueueSnackbar('Clinician created successfully', { variant: 'success' })
      navigate(`/clinicians/${d.createClinician.id}`)
    },
    onError: (err) => enqueueSnackbar(err.message, { variant: 'error' }),
  })

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(clinicianSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      gender: '',
      bio: '',
      consultation_fee: '',
      clinician_type_id: '',
      specialties: [],
      qualifications: '',
      registration_number: '',
      clinic_ids: [],
      service_ids: [],
      languages: [],
      is_active: true,
      is_locum: false,
      locum_for: '',
      locum_start_date: '',
      locum_end_date: '',
    },
  })

  const isLocum = watch('is_locum')

  // Priority 3 mock-removal sweep (2026-08-22) — this handler previously had
  // `const useMock = true // always use mock in dev for now` unconditionally
  // short-circuiting to MockStore.createClinician(), leaving the real
  // createClinician mutation right below it as dead, unreachable code: every
  // "new clinician" created through this page never actually existed in the
  // real database, despite a real success toast and navigation to a
  // (fake-id) detail URL. is_locum/locum_for/locum_start_date/locum_end_date
  // are collected by this form but CreateClinicianInput has no matching
  // fields on the backend yet -- a real, separate, pre-existing gap (not
  // introduced by this fix), logged in context/open-questions.md rather than
  // silently dropped from the input payload or silently kept as if it worked.
  const onSubmit = (form) => {
    createClinician({
      variables: {
        input: {
          first_name: form.first_name,
          last_name: form.last_name,
          email: form.email,
          phone: form.phone || undefined,
          gender: form.gender || undefined,
          bio: form.bio || undefined,
          consultation_fee: form.consultation_fee ? parseFloat(form.consultation_fee) : undefined,
          clinician_type_id: form.clinician_type_id || undefined,
          clinic_ids: form.clinic_ids.length > 0 ? form.clinic_ids : undefined,
          service_ids: form.service_ids.length > 0 ? form.service_ids : undefined,
          languages: form.languages.length > 0 ? form.languages : undefined,
          is_active: form.is_active,
        },
      },
    })
  }

  return (
    <Box className="page-enter">
      <Helmet>
        <title>New Clinician — MediBook</title>
      </Helmet>

      {/* ── Header ── */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3, flexWrap: 'wrap' }}>
        <IconButton
          onClick={() => navigate('/clinicians')}
          sx={{ bgcolor: 'action.hover', '&:hover': { bgcolor: 'action.selected' } }}
          aria-label="Back to clinicians"
        >
          <ArrowBackRoundedIcon />
        </IconButton>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2.5,
              background: (t) => `linear-gradient(135deg, ${alpha(t.palette.primary.main, 0.18)}, ${alpha(t.palette.primary.light, 0.24)})`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <PersonAddRoundedIcon sx={{ color: 'primary.main', fontSize: '1.2rem' }} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={800} color="text.primary">
              New Clinician
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Fill in the details to add a new clinician
            </Typography>
          </Box>
        </Box>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ width: { xs: '100%', sm: 'auto' } }}>
          <Button
            variant="outlined"
            onClick={() => navigate('/clinicians')}
            sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 700 }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <SaveRoundedIcon />}
            onClick={handleSubmit(onSubmit)}
            disabled={loading}
            sx={{
              borderRadius: 2.5,
              textTransform: 'none',
              fontWeight: 700,
              background: (t) => `linear-gradient(135deg, ${t.palette.primary.light}, ${t.palette.primary.main})`,
              '&:hover': { background: (t) => `linear-gradient(135deg, ${t.palette.primary.main}, ${t.palette.primary.dark})` },
            }}
          >
            {loading ? 'Saving…' : 'Save Clinician'}
          </Button>
        </Stack>
      </Box>

      {/* ── Form ── */}
      <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <Grid container spacing={3}>
          {/* Personal Info */}
          <Grid item xs={12} md={8}>
            <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider', mb: 3 }}>
              <Typography variant="subtitle1" fontWeight={700} color="text.primary" mb={2.5}>
                Personal Information
              </Typography>
              <Grid container spacing={2.5}>
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="first_name"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label="First Name *"
                        error={!!errors.first_name}
                        helperText={errors.first_name?.message}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
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
                        fullWidth
                        label="Last Name *"
                        error={!!errors.last_name}
                        helperText={errors.last_name?.message}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
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
                        fullWidth
                        label="Email *"
                        type="email"
                        error={!!errors.email}
                        helperText={errors.email?.message}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="phone"
                    control={control}
                    render={({ field }) => (
                      <TextField {...field} fullWidth label="Phone" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="gender"
                    control={control}
                    render={({ field }) => (
                      <TextField {...field} select fullWidth label="Gender" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}>
                        <MenuItem value="">Select gender</MenuItem>
                        {GENDER_OPTIONS.map((g) => (
                          <MenuItem key={g} value={g}>
                            {g.replace('_', ' ')}
                          </MenuItem>
                        ))}
                      </TextField>
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="consultation_fee"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label="Consultation Fee (₹)"
                        type="number"
                        InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Controller
                    name="bio"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        multiline
                        rows={3}
                        label="Bio / Professional Summary"
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                      />
                    )}
                  />
                </Grid>
              </Grid>
            </Paper>

            {/* Professional Credentials — requirements/semble-competitive-gap-analysis-requirements.md Phase 1 */}
            <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider', mb: 3 }}>
              <Typography variant="subtitle1" fontWeight={700} color="text.primary" mb={2.5}>
                Professional Credentials
              </Typography>
              <Grid container spacing={2.5}>
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="qualifications"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label="Qualifications"
                        placeholder="MBBS, MD (Cardiology)"
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="registration_number"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label="Medical Registration Number"
                        helperText="Required for India Telemedicine Practice Guidelines compliance"
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Controller
                    name="specialties"
                    control={control}
                    render={({ field }) => (
                      <FormControl fullWidth>
                        <InputLabel>Additional Specialties</InputLabel>
                        <Select
                          multiple
                          {...field}
                          input={<OutlinedInput label="Additional Specialties" />}
                          sx={{ borderRadius: 2 }}
                          renderValue={(selected) => (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                              {selected.map((id) => {
                                const t = types.find((x) => x.id === id)
                                return <Chip key={id} label={t?.name ?? id} size="small" />
                              })}
                            </Box>
                          )}
                        >
                          {types.map((t) => (
                            <MenuItem key={t.id} value={t.id}>
                              {t.name}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    )}
                  />
                </Grid>
              </Grid>
            </Paper>

            {/* Locum coverage */}
            <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider', mb: 3 }}>
              <Controller
                name="is_locum"
                control={control}
                render={({ field }) => (
                  <FormControlLabel
                    control={<Switch checked={field.value} onChange={(e) => field.onChange(e.target.checked)} />}
                    label={<Typography fontWeight={600}>This clinician is a locum (temporary covering clinician)</Typography>}
                  />
                )}
              />
              {isLocum && (
                <Grid container spacing={2.5} sx={{ mt: 0.5 }}>
                  <Grid item xs={12} sm={6}>
                    <Controller
                      name="locum_for"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          select
                          fullWidth
                          label="Covering for *"
                          error={!!errors.locum_for}
                          helperText={errors.locum_for?.message}
                          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                        >
                          <MenuItem value="">Select clinician</MenuItem>
                          {(allClinicians ?? []).map((c) => (
                            <MenuItem key={c.id} value={c.id}>
                              {c.full_name}
                            </MenuItem>
                          ))}
                        </TextField>
                      )}
                    />
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Controller
                      name="locum_start_date"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          type="date"
                          label="Start date"
                          InputLabelProps={{ shrink: true }}
                          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                        />
                      )}
                    />
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Controller
                      name="locum_end_date"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          fullWidth
                          type="date"
                          label="End date"
                          InputLabelProps={{ shrink: true }}
                          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                        />
                      )}
                    />
                  </Grid>
                </Grid>
              )}
            </Paper>

            {/* Clinics & Services */}
            <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
              <Typography variant="subtitle1" fontWeight={700} color="text.primary" mb={2.5}>
                Assignments
              </Typography>
              <Grid container spacing={2.5}>
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="clinic_ids"
                    control={control}
                    render={({ field }) => (
                      <FormControl fullWidth>
                        <InputLabel>Clinics</InputLabel>
                        <Select
                          multiple
                          {...field}
                          input={<OutlinedInput label="Clinics" />}
                          sx={{ borderRadius: 2 }}
                          renderValue={(selected) => (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                              {selected.map((id) => {
                                const c = clinics.find((x) => x.id === id)
                                return <Chip key={id} label={c?.name ?? id} size="small" />
                              })}
                            </Box>
                          )}
                        >
                          {clinics.map((c) => (
                            <MenuItem key={c.id} value={c.id}>
                              {c.name}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="service_ids"
                    control={control}
                    render={({ field }) => (
                      <FormControl fullWidth>
                        <InputLabel>Services</InputLabel>
                        <Select
                          multiple
                          {...field}
                          input={<OutlinedInput label="Services" />}
                          sx={{ borderRadius: 2 }}
                          renderValue={(selected) => (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                              {selected.map((id) => {
                                const s = services.find((x) => x.id === id)
                                return <Chip key={id} label={s?.name ?? id} size="small" />
                              })}
                            </Box>
                          )}
                        >
                          {services.map((s) => (
                            <MenuItem key={s.id} value={s.id}>
                              {s.name}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    )}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Controller
                    name="languages"
                    control={control}
                    render={({ field }) => (
                      <FormControl fullWidth>
                        <InputLabel>Languages Spoken</InputLabel>
                        <Select
                          multiple
                          {...field}
                          input={<OutlinedInput label="Languages Spoken" />}
                          sx={{ borderRadius: 2 }}
                          renderValue={(selected) => (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                              {selected.map((l) => (
                                <Chip key={l} label={l} size="small" />
                              ))}
                            </Box>
                          )}
                        >
                          {LANGUAGE_OPTIONS.map((l) => (
                            <MenuItem key={l} value={l}>
                              {l}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    )}
                  />
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          {/* Sidebar */}
          <Grid item xs={12} md={4}>
            <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider', mb: 3 }}>
              <Typography variant="subtitle1" fontWeight={700} color="text.primary" mb={2.5}>
                Primary Specialisation
              </Typography>
              <Controller
                name="clinician_type_id"
                control={control}
                render={({ field }) => (
                  <TextField {...field} select fullWidth label="Clinician Type" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}>
                    <MenuItem value="">Select type</MenuItem>
                    {types.map((t) => (
                      <MenuItem key={t.id} value={t.id}>
                        {t.name}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />
            </Paper>

            <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
              <Typography variant="subtitle1" fontWeight={700} color="text.primary" mb={1}>
                Status
              </Typography>
              <Controller
                name="is_active"
                control={control}
                render={({ field }) => (
                  <FormControlLabel
                    control={<Switch checked={field.value} onChange={(e) => field.onChange(e.target.checked)} color="success" />}
                    label={
                      <Typography fontWeight={600} color={field.value ? 'success.main' : 'text.secondary'}>
                        {field.value ? 'Active' : 'Inactive'}
                      </Typography>
                    }
                  />
                )}
              />
              <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
                Inactive clinicians won't appear in booking flows
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Box>
  )
}

export default function CreateClinicianPage() {
  return (
    <ErrorBoundary>
      <CreateClinicianPageContent />
    </ErrorBoundary>
  )
}
