import { useEffect } from 'react'
import { useQuery, useMutation } from '@apollo/client'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useSnackbar } from 'notistack'
import { Alert, Box, Button, CircularProgress, Divider, Grid, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material'
import { gql } from '@apollo/client'
import SaveIcon from '@mui/icons-material/Save'
import { CLINICS_QUERY } from '../../graphql/queries'

// ─── Mutation (inline — not yet in mutations.js) ──────────────────────────────
const UPDATE_CLINIC_MUTATION = gql`
  mutation UpdateClinic($id: ID!, $input: ClinicInput!) {
    updateClinic(id: $id, input: $input) {
      id
      name
      address
      city
      postcode
      phone
      email
      timezone
      is_active
    }
  }
`

// ─── IANA timezone list (curated) ────────────────────────────────────────────
const TIMEZONES = [
  'UTC',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Madrid',
  'Europe/Rome',
  'Europe/Amsterdam',
  'Europe/Brussels',
  'Europe/Vienna',
  'Europe/Zurich',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Toronto',
  'America/Vancouver',
  'America/Sao_Paulo',
  'America/Mexico_City',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Seoul',
  'Asia/Bangkok',
  'Asia/Jakarta',
  'Asia/Karachi',
  'Australia/Sydney',
  'Australia/Melbourne',
  'Australia/Perth',
  'Pacific/Auckland',
  'Africa/Lagos',
  'Africa/Nairobi',
  'Africa/Johannesburg',
]

const schema = z.object({
  name: z.string().min(1, 'Clinic name is required'),
  address: z.string().optional(),
  city: z.string().optional(),
  postcode: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  timezone: z.string().optional(),
})

export default function ClinicProfileForm() {
  const { enqueueSnackbar } = useSnackbar()

  const { data, loading, error } = useQuery(CLINICS_QUERY)
  const clinic = data?.clinics?.[0] // manage the first (active) clinic

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { name: '', address: '', city: '', postcode: '', phone: '', email: '', timezone: 'UTC' },
  })

  useEffect(() => {
    if (clinic) {
      reset({
        name: clinic.name ?? '',
        address: clinic.address ?? '',
        city: clinic.city ?? '',
        postcode: clinic.postcode ?? '',
        phone: clinic.phone ?? '',
        email: clinic.email ?? '',
        timezone: clinic.timezone ?? 'UTC',
      })
    }
  }, [clinic, reset])

  const [updateClinic] = useMutation(UPDATE_CLINIC_MUTATION, {
    refetchQueries: [{ query: CLINICS_QUERY }],
    onCompleted: () => enqueueSnackbar('Clinic profile saved!', { variant: 'success' }),
    onError: (e) => enqueueSnackbar(e.message, { variant: 'error' }),
  })

  const onSubmit = async (values) => {
    if (!clinic?.id) return
    await updateClinic({ variables: { id: clinic.id, input: values } })
  }

  return (
    <Box>
      <Typography variant="h6" fontWeight={800} mb={0.5}>
        Clinic Profile
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Update your clinic's public information and settings.
      </Typography>

      {error && (
        <Alert severity="warning" sx={{ mb: 3, borderRadius: 2 }}>
          Could not connect to backend. You can still edit the form below; changes will sync when the connection is restored.
        </Alert>
      )}
      {loading ? (
        <Typography color="text.secondary">Loading clinic data…</Typography>
      ) : (
        <Stack spacing={3} component="form" onSubmit={handleSubmit(onSubmit)} maxWidth={680}>
          {/* Basic Info */}
          <Paper elevation={0} sx={{ p: 2.5, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            <Typography variant="subtitle2" fontWeight={700} color="text.secondary" mb={2}>
              Basic Information
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Controller
                  name="name"
                  control={control}
                  render={({ field }) => (
                    <TextField {...field} label="Clinic Name *" fullWidth error={!!errors.name} helperText={errors.name?.message} />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller name="phone" control={control} render={({ field }) => <TextField {...field} label="Phone" fullWidth />} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="email"
                  control={control}
                  render={({ field }) => (
                    <TextField {...field} label="Email" fullWidth type="email" error={!!errors.email} helperText={errors.email?.message} />
                  )}
                />
              </Grid>
            </Grid>
          </Paper>

          {/* Address */}
          <Paper elevation={0} sx={{ p: 2.5, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            <Typography variant="subtitle2" fontWeight={700} color="text.secondary" mb={2}>
              Address
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Controller
                  name="address"
                  control={control}
                  render={({ field }) => <TextField {...field} label="Street Address" fullWidth />}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller name="city" control={control} render={({ field }) => <TextField {...field} label="City" fullWidth />} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="postcode"
                  control={control}
                  render={({ field }) => <TextField {...field} label="Postcode / ZIP" fullWidth />}
                />
              </Grid>
            </Grid>
          </Paper>

          {/* Timezone */}
          <Paper elevation={0} sx={{ p: 2.5, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            <Typography variant="subtitle2" fontWeight={700} color="text.secondary" mb={2}>
              Localisation
            </Typography>
            <Controller
              name="timezone"
              control={control}
              render={({ field }) => (
                <TextField {...field} select label="Timezone" fullWidth>
                  {TIMEZONES.map((tz) => (
                    <MenuItem key={tz} value={tz}>
                      {tz.replace(/_/g, ' ')}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
          </Paper>

          {/* Save */}
          <Box>
            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={isSubmitting || !isDirty}
              startIcon={isSubmitting ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
              sx={{ borderRadius: 2, px: 4 }}
            >
              Save Changes
            </Button>
          </Box>
        </Stack>
      )}
    </Box>
  )
}
