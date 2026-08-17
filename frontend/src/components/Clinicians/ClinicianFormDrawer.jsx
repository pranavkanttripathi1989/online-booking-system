import { useEffect } from 'react'
import { useQuery, useMutation } from '@apollo/client'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Drawer,
  FormHelperText,
  IconButton,
  MenuItem,
  OutlinedInput,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import SaveIcon from '@mui/icons-material/Save'

import { CLINICIANS_QUERY, CLINICS_QUERY, SERVICES_QUERY } from '../../graphql/queries'
import {
  CREATE_CLINICIAN_MUTATION,
  UPDATE_CLINICIAN_MUTATION,
} from '../../graphql/mutations'

// ─── Zod schema ───────────────────────────────────────────────────────────────
const schema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  clinician_type_id: z.string().optional(),
  bio: z.string().optional(),
  consultation_fee: z.string().optional(),
  gender: z.string().optional(),
  languages: z.array(z.string()).optional(),
  clinic_ids: z.array(z.string()).min(1, 'Select at least one clinic'),
  service_ids: z.array(z.string()).optional(),
})

const GENDER_OPTIONS = ['male', 'female', 'other', 'prefer_not_to_say']
const LANG_OPTIONS = ['English', 'Spanish', 'French', 'Mandarin', 'Arabic', 'Portuguese', 'Hindi', 'Urdu', 'Bengali', 'German']

export default function ClinicianFormDrawer({ open, clinician, onClose, onSuccess }) {
  const isEdit = !!clinician?.id

  // Fetch dropdowns
  const { data: clinicsData } = useQuery(CLINICS_QUERY)
  const { data: servicesData } = useQuery(SERVICES_QUERY, { variables: { is_active: true } })

  const clinics = (clinicsData?.clinics ?? []).filter((c) => c.is_active)
  const services = servicesData?.services ?? []

  const { control, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      first_name: '', last_name: '', clinician_type_id: '',
      bio: '', consultation_fee: '', gender: '',
      languages: [], clinic_ids: [], service_ids: [],
    },
  })

  // Populate form on edit
  useEffect(() => {
    if (clinician) {
      reset({
        first_name: clinician.first_name ?? '',
        last_name: clinician.last_name ?? '',
        clinician_type_id: clinician.clinician_type?.id ?? '',
        bio: clinician.bio ?? '',
        consultation_fee: clinician.consultation_fee ? String(clinician.consultation_fee) : '',
        gender: clinician.gender ?? '',
        languages: clinician.languages ?? [],
        clinic_ids: clinician.clinics?.map((c) => c.id) ?? [],
        service_ids: clinician.services?.map((s) => s.id) ?? [],
      })
    } else {
      reset({ first_name:'',last_name:'',clinician_type_id:'',bio:'',consultation_fee:'',gender:'',languages:[],clinic_ids:[],service_ids:[] })
    }
  }, [clinician, reset])

  const [createClinician] = useMutation(CREATE_CLINICIAN_MUTATION, {
    refetchQueries: [{ query: CLINICIANS_QUERY, variables: { first: 50 } }],
    onCompleted: () => { onSuccess?.(); onClose() },
  })
  const [updateClinician] = useMutation(UPDATE_CLINICIAN_MUTATION, {
    onCompleted: () => { onSuccess?.(); onClose() },
  })

  const onSubmit = async (values) => {
    const input = {
      first_name: values.first_name,
      last_name: values.last_name,
      bio: values.bio || undefined,
      consultation_fee: values.consultation_fee ? parseFloat(values.consultation_fee) : undefined,
      gender: values.gender || undefined,
      languages: values.languages?.length ? values.languages : undefined,
      clinic_ids: values.clinic_ids,
      service_ids: values.service_ids?.length ? values.service_ids : undefined,
    }
    if (isEdit) {
      await updateClinician({ variables: { id: clinician.id, input } })
    } else {
      await createClinician({ variables: { input } })
    }
  }

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
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid',
          borderColor: 'divider',
          background: 'linear-gradient(135deg, rgba(99,102,241,0.1) 0%, rgba(139,92,246,0.05) 100%)',
          flexShrink: 0,
        }}
      >
        <Typography variant="h6" fontWeight={800}>
          {isEdit ? 'Edit Clinician' : 'Add Clinician'}
        </Typography>
        <IconButton size="small" onClick={onClose}><CloseIcon /></IconButton>
      </Box>

      {/* Form body */}
      <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ flex: 1, overflowY: 'auto', p: 2.5 }}>
        <Stack spacing={2.5}>

          {/* Name */}
          <Stack direction="row" spacing={2}>
            <Controller name="first_name" control={control} render={({ field }) => (
              <TextField {...field} label="First Name *" fullWidth error={!!errors.first_name} helperText={errors.first_name?.message} />
            )} />
            <Controller name="last_name" control={control} render={({ field }) => (
              <TextField {...field} label="Last Name *" fullWidth error={!!errors.last_name} helperText={errors.last_name?.message} />
            )} />
          </Stack>

          {/* Gender */}
          <Controller name="gender" control={control} render={({ field }) => (
            <TextField {...field} select label="Gender" fullWidth>
              <MenuItem value="">Prefer not to say</MenuItem>
              {GENDER_OPTIONS.map((g) => (
                <MenuItem key={g} value={g} sx={{ textTransform: 'capitalize' }}>{g.replace(/_/g,' ')}</MenuItem>
              ))}
            </TextField>
          )} />

          {/* Fee */}
          <Controller name="consultation_fee" control={control} render={({ field }) => (
            <TextField {...field} label="Consultation Fee (₹)" type="number" fullWidth
              InputProps={{ inputProps: { min: 0, step: 0.01 } }}
            />
          )} />

          <Divider />

          {/* Languages */}
          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight={700} display="block" mb={0.75}>Languages</Typography>
            <Controller name="languages" control={control} render={({ field }) => (
              <Select
                multiple
                fullWidth
                value={field.value ?? []}
                onChange={field.onChange}
                input={<OutlinedInput size="small" />}
                renderValue={(selected) => (
                  <Stack direction="row" flexWrap="wrap" gap={0.5}>
                    {selected.map((v) => <Chip key={v} label={v} size="small" />)}
                  </Stack>
                )}
              >
                {LANG_OPTIONS.map((l) => <MenuItem key={l} value={l}>{l}</MenuItem>)}
              </Select>
            )} />
          </Box>

          {/* Clinics */}
          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight={700} display="block" mb={0.75}>Clinics *</Typography>
            <Controller name="clinic_ids" control={control} render={({ field }) => (
              <>
                <Select
                  multiple
                  fullWidth
                  value={field.value ?? []}
                  onChange={field.onChange}
                  input={<OutlinedInput size="small" />}
                  renderValue={(selected) => (
                    <Stack direction="row" flexWrap="wrap" gap={0.5}>
                      {selected.map((id) => {
                        const c = clinics.find((x) => x.id === id)
                        return <Chip key={id} label={c?.name ?? id} size="small" />
                      })}
                    </Stack>
                  )}
                >
                  {clinics.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
                </Select>
                {errors.clinic_ids && <FormHelperText error>{errors.clinic_ids.message}</FormHelperText>}
              </>
            )} />
          </Box>

          {/* Services */}
          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight={700} display="block" mb={0.75}>Services</Typography>
            <Controller name="service_ids" control={control} render={({ field }) => (
              <Select
                multiple
                fullWidth
                value={field.value ?? []}
                onChange={field.onChange}
                input={<OutlinedInput size="small" />}
                renderValue={(selected) => (
                  <Stack direction="row" flexWrap="wrap" gap={0.5}>
                    {selected.map((id) => {
                      const s = services.find((x) => x.id === id)
                      return <Chip key={id} label={s?.name ?? id} size="small" />
                    })}
                  </Stack>
                )}
              >
                {services.map((s) => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
              </Select>
            )} />
          </Box>

          {/* Bio */}
          <Controller name="bio" control={control} render={({ field }) => (
            <TextField {...field} label="Bio" multiline rows={3} fullWidth placeholder="Short professional biography…" />
          )} />
        </Stack>
      </Box>

      {/* Footer */}
      <Box sx={{ p: 2.5, borderTop: '1px solid', borderColor: 'divider', flexShrink: 0 }}>
        <Stack direction="row" spacing={1.5} justifyContent="flex-end">
          <Button variant="outlined" onClick={onClose}>Cancel</Button>
          <Button
            variant="contained"
            startIcon={isSubmitting ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
            onClick={handleSubmit(onSubmit)}
            disabled={isSubmitting}
            sx={{ px: 3 }}
          >
            {isEdit ? 'Save Changes' : 'Add Clinician'}
          </Button>
        </Stack>
      </Box>
    </Drawer>
  )
}
