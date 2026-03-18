import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery } from '@apollo/client'
import { Helmet } from 'react-helmet-async'
import { useSnackbar } from 'notistack'
import {
  Box, Button, Chip, CircularProgress, FormControl, FormControlLabel,
  Grid, IconButton, InputAdornment, InputLabel, MenuItem, OutlinedInput,
  Paper, Select, Skeleton, Stack, Switch, TextField, Typography,
} from '@mui/material'
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded'
import EditRoundedIcon      from '@mui/icons-material/EditRounded'
import SaveRoundedIcon      from '@mui/icons-material/SaveRounded'

import { UPDATE_CLINICIAN_MUTATION }  from '../../graphql/mutations'
import { CLINICIAN_DETAIL_QUERY, CLINICS_QUERY, CLINICIAN_TYPES_QUERY, SERVICES_QUERY } from '../../graphql/queries'

const LANGUAGE_OPTIONS = ['English','Spanish','French','German','Arabic','Mandarin','Hindi','Urdu','Portuguese','Italian']
const GENDER_OPTIONS   = ['male','female','other','prefer_not_to_say']

export default function EditClinicianPage() {
  const { id }     = useParams()
  const navigate   = useNavigate()
  const { enqueueSnackbar } = useSnackbar()
  const [form, setForm] = useState(null)
  const [errors, setErrors] = useState({})

  const { data, loading: fetching } = useQuery(CLINICIAN_DETAIL_QUERY, { variables: { id }, fetchPolicy: 'network-only' })
  const { data: clinicsData }       = useQuery(CLINICS_QUERY)
  const { data: typesData }         = useQuery(CLINICIAN_TYPES_QUERY)
  const { data: servicesData }      = useQuery(SERVICES_QUERY)
  const clinics  = (clinicsData?.clinics ?? []).filter(c => c.is_active)
  const types    = typesData?.clinicianTypes ?? []
  const services = servicesData?.services ?? []

  // Populate form once data loads
  useEffect(() => {
    if (!data?.clinician) return
    const c = data.clinician
    setForm({
      first_name:        c.first_name ?? '',
      last_name:         c.last_name  ?? '',
      email:             c.email      ?? '',
      phone:             c.phone      ?? '',
      gender:            c.gender     ?? '',
      bio:               c.bio        ?? '',
      consultation_fee:  c.consultation_fee?.toString() ?? '',
      clinician_type_id: c.clinician_type?.id ?? '',
      clinic_ids:        (c.clinics   ?? []).map(x => x.id),
      service_ids:       (c.services  ?? []).map(x => x.id),
      languages:         c.languages  ?? [],
      is_active:         c.is_active  ?? true,
    })
  }, [data])

  const [updateClinician, { loading }] = useMutation(UPDATE_CLINICIAN_MUTATION, {
    onCompleted: () => {
      enqueueSnackbar('Clinician updated successfully', { variant: 'success' })
      navigate(`/clinicians/${id}`)
    },
    onError: (err) => enqueueSnackbar(err.message, { variant: 'error' }),
  })

  if (fetching || !form) {
    return (
      <Box>
        <Skeleton variant="rectangular" height={56} sx={{ borderRadius: 2, mb: 3 }} />
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}><Skeleton variant="rectangular" height={400} sx={{ borderRadius: 3 }} /></Grid>
          <Grid item xs={12} md={4}><Skeleton variant="rectangular" height={200} sx={{ borderRadius: 3 }} /></Grid>
        </Grid>
      </Box>
    )
  }

  const set      = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }))
  const setMulti = (field) => (e) => {
    const val = typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value
    setForm(f => ({ ...f, [field]: val }))
  }

  const validate = () => {
    const e = {}
    if (!form.first_name.trim()) e.first_name = 'Required'
    if (!form.last_name.trim())  e.last_name  = 'Required'
    if (!form.email.trim())      e.email      = 'Required'
    setErrors(e); return Object.keys(e).length === 0
  }

  const handleSubmit = () => {
    if (!validate()) return
    updateClinician({
      variables: {
        id,
        input: {
          first_name: form.first_name, last_name: form.last_name,
          email: form.email, phone: form.phone || undefined,
          gender: form.gender || undefined, bio: form.bio || undefined,
          consultation_fee: form.consultation_fee ? parseFloat(form.consultation_fee) : undefined,
          clinician_type_id: form.clinician_type_id || undefined,
          clinic_ids:  form.clinic_ids.length > 0  ? form.clinic_ids  : undefined,
          service_ids: form.service_ids.length > 0 ? form.service_ids : undefined,
          languages:   form.languages.length > 0   ? form.languages   : undefined,
          is_active:   form.is_active,
        }
      }
    })
  }

  return (
    <Box className="page-enter">
      <Helmet><title>Edit Clinician — MediBook</title></Helmet>

      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3, flexWrap: 'wrap' }}>
        <IconButton onClick={() => navigate(`/clinicians/${id}`)} sx={{ bgcolor: '#F1F3F4', '&:hover': { bgcolor: '#E8EAED' } }}>
          <ArrowBackRoundedIcon />
        </IconButton>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1 }}>
          <Box sx={{ width: 40, height: 40, borderRadius: 2.5, background: 'linear-gradient(135deg,#FEF7E0,#FEEFC3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <EditRoundedIcon sx={{ color: '#F9AB00', fontSize: '1.2rem' }} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={800} color="#202124">
              Edit — {data?.clinician?.full_name}
            </Typography>
            <Typography variant="body2" color="text.secondary">Update clinician details</Typography>
          </Box>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" onClick={() => navigate(`/clinicians/${id}`)} sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 700 }}>Cancel</Button>
          <Button variant="contained" startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <SaveRoundedIcon />}
            onClick={handleSubmit} disabled={loading}
            sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 700, background: 'linear-gradient(135deg,#4285F4,#1A73E8)', '&:hover': { background: 'linear-gradient(135deg,#1A73E8,#1557B0)' } }}
          >
            {loading ? 'Saving…' : 'Save Changes'}
          </Button>
        </Stack>
      </Box>

      {/* Form - same structure as Create */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #E8EAED', mb: 3 }}>
            <Typography variant="subtitle1" fontWeight={700} color="#202124" mb={2.5}>Personal Information</Typography>
            <Grid container spacing={2.5}>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="First Name *" value={form.first_name} onChange={set('first_name')} error={!!errors.first_name} helperText={errors.first_name} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Last Name *" value={form.last_name} onChange={set('last_name')} error={!!errors.last_name} helperText={errors.last_name} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Email *" type="email" value={form.email} onChange={set('email')} error={!!errors.email} helperText={errors.email} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Phone" value={form.phone} onChange={set('phone')} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField select fullWidth label="Gender" value={form.gender} onChange={set('gender')} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}>
                  <MenuItem value="">Select gender</MenuItem>
                  {GENDER_OPTIONS.map(g => <MenuItem key={g} value={g}>{g.replace('_', ' ')}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Consultation Fee (£)" type="number" value={form.consultation_fee} onChange={set('consultation_fee')}
                  InputProps={{ startAdornment: <InputAdornment position="start">£</InputAdornment> }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth multiline rows={3} label="Bio / Professional Summary" value={form.bio} onChange={set('bio')} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
              </Grid>
            </Grid>
          </Paper>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #E8EAED' }}>
            <Typography variant="subtitle1" fontWeight={700} color="#202124" mb={2.5}>Assignments</Typography>
            <Grid container spacing={2.5}>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Clinics</InputLabel>
                  <Select multiple value={form.clinic_ids} onChange={setMulti('clinic_ids')} input={<OutlinedInput label="Clinics" />} sx={{ borderRadius: 2 }}
                    renderValue={(sel) => <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>{sel.map(id => { const c = clinics.find(x => x.id === id); return <Chip key={id} label={c?.name ?? id} size="small" /> })}</Box>}
                  >
                    {clinics.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Services</InputLabel>
                  <Select multiple value={form.service_ids} onChange={setMulti('service_ids')} input={<OutlinedInput label="Services" />} sx={{ borderRadius: 2 }}
                    renderValue={(sel) => <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>{sel.map(id => { const s = services.find(x => x.id === id); return <Chip key={id} label={s?.name ?? id} size="small" /> })}</Box>}
                  >
                    {services.map(s => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Languages Spoken</InputLabel>
                  <Select multiple value={form.languages} onChange={setMulti('languages')} input={<OutlinedInput label="Languages Spoken" />} sx={{ borderRadius: 2 }}
                    renderValue={(sel) => <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>{sel.map(l => <Chip key={l} label={l} size="small" />)}</Box>}
                  >
                    {LANGUAGE_OPTIONS.map(l => <MenuItem key={l} value={l}>{l}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #E8EAED', mb: 3 }}>
            <Typography variant="subtitle1" fontWeight={700} color="#202124" mb={2.5}>Specialisation</Typography>
            <TextField select fullWidth label="Clinician Type" value={form.clinician_type_id} onChange={set('clinician_type_id')} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}>
              <MenuItem value="">Select type</MenuItem>
              {types.map(t => <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>)}
            </TextField>
          </Paper>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #E8EAED' }}>
            <Typography variant="subtitle1" fontWeight={700} color="#202124" mb={1}>Status</Typography>
            <FormControlLabel
              control={<Switch checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} color="success" />}
              label={<Typography fontWeight={600} color={form.is_active ? 'success.main' : 'text.secondary'}>{form.is_active ? 'Active' : 'Inactive'}</Typography>}
            />
          </Paper>
        </Grid>
      </Grid>
    </Box>
  )
}
