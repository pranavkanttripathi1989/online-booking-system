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
import * as MockStore from '../../mocks/store'

const LANGUAGE_OPTIONS = ['English','Spanish','French','German','Arabic','Mandarin','Hindi','Urdu','Portuguese','Italian']
const GENDER_OPTIONS   = ['male','female','other','prefer_not_to_say']

// BUG-CLIN-006 fix: Local offline fallback that mirrors the mock clinicians from index.jsx.
// MockStore.getClinicianById searches store.clinicians (ids: "clin-X") but URL params
// can be "c1", "c2" etc. — so we keep a parallel map keyed by those short ids.
const MOCK_EDIT_DATA = {
  c1: { first_name: 'Jane',    last_name: 'Smith',    email: 'jane.smith@medibook.com',   phone: '+44 7700 900001', gender: 'female', bio: 'Experienced General Practitioner with 10+ years in primary care.', consultation_fee: '80',  is_active: true,  clinician_type: { id: 'ct1', name: 'General Practitioner' }, clinics: [{ id: 'cl1' }], services: [{ id: 'sv1' }, { id: 'sv2' }], languages: ['English'] },
  c2: { first_name: 'Carlos',  last_name: 'Vega',     email: 'carlos.vega@medibook.com',  phone: '+44 7700 900002', gender: 'male',   bio: 'Consultant Cardiologist specialising in interventional cardiology.', consultation_fee: '120', is_active: true,  clinician_type: { id: 'ct2', name: 'Cardiologist' }, clinics: [{ id: 'cl1' }], services: [{ id: 'sv3' }], languages: ['English', 'Spanish'] },
  c3: { first_name: 'Amy',     last_name: 'Chen',     email: 'amy.chen@medibook.com',     phone: '+44 7700 900003', gender: 'female', bio: 'Neurologist with expertise in headache disorders and epilepsy.', consultation_fee: '150', is_active: true,  clinician_type: { id: 'ct3', name: 'Neurologist' }, clinics: [{ id: 'cl2' }], services: [{ id: 'sv5' }], languages: ['English', 'Mandarin'] },
  c4: { first_name: 'Michael', last_name: 'Patel',    email: 'michael.patel@medibook.com',phone: '+44 7700 900004', gender: 'male',   bio: 'Cardiologist focusing on preventive cardiology.', consultation_fee: '130', is_active: true,  clinician_type: { id: 'ct2', name: 'Cardiologist' }, clinics: [{ id: 'cl2' }], services: [{ id: 'sv3' }], languages: ['English', 'Hindi'] },
  c5: { first_name: 'Sarah',   last_name: 'Williams', email: 'sarah.williams@medibook.com',phone: '+44 7700 900005', gender: 'female', bio: 'Physiotherapist with a strong background in musculoskeletal rehabilitation.', consultation_fee: '70',  is_active: true,  clinician_type: { id: 'ct4', name: 'Physiotherapist' }, clinics: [{ id: 'cl1' }], services: [{ id: 'sv7' }, { id: 'sv8' }], languages: ['English'] },
  c6: { first_name: 'Omar',    last_name: 'Hassan',   email: 'omar.hassan@medibook.com',   phone: '+44 7700 900006', gender: 'male',   bio: 'Senior Radiologist specialised in CT and MRI imaging.', consultation_fee: '0',   is_active: false, clinician_type: { id: 'ct5', name: 'Radiologist' }, clinics: [{ id: 'cl3' }], services: [], languages: ['English', 'Arabic'] },
  c7: { first_name: 'Sarah',   last_name: 'Mitchell', email: 'sarah.mitchell@medibook.com',phone: '+44 7700 900007', gender: 'female', bio: 'GP with special interest in women\'s health and family medicine.', consultation_fee: '85',  is_active: true,  clinician_type: { id: 'ct1', name: 'General Practitioner' }, clinics: [{ id: 'cl1' }], services: [{ id: 'sv1' }], languages: ['English'] },
  c8: { first_name: 'Priya',   last_name: 'Sharma',   email: 'priya.sharma@medibook.com',  phone: '+44 7700 900008', gender: 'female', bio: 'Consultant Dermatologist with expertise in skin cancer screening.', consultation_fee: '110', is_active: true,  clinician_type: { id: 'ct6', name: 'Dermatologist' }, clinics: [{ id: 'cl3' }], services: [{ id: 'sv9' }, { id: 'sv10' }], languages: ['English', 'Hindi'] },
}
// Also support "clin-X" format IDs from MockStore
;['1','2','3','4','5','6','7','8'].forEach(n => {
  if (MOCK_EDIT_DATA[`c${n}`]) MOCK_EDIT_DATA[`clin-${n}`] = MOCK_EDIT_DATA[`c${n}`]
})



export default function EditClinicianPage() {
  const { id }     = useParams()
  const navigate   = useNavigate()
  const { enqueueSnackbar } = useSnackbar()
  const [form, setForm] = useState(null)
  const [errors, setErrors] = useState({})

  const { data, loading: fetching } = useQuery(CLINICIAN_DETAIL_QUERY, { variables: { id }, fetchPolicy: 'cache-and-network' })
  const { data: clinicsData }       = useQuery(CLINICS_QUERY)
  const { data: typesData }         = useQuery(CLINICIAN_TYPES_QUERY)
  const { data: servicesData }      = useQuery(SERVICES_QUERY)
  // BUG-CLIN-006 fix: fall back to MockStore for dropdown options when backend offline
  const clinics  = (clinicsData?.clinics?.length ? clinicsData.clinics : MockStore.getClinics()).filter(c => c.is_active)
  const types    = typesData?.clinicianTypes ?? MockStore.getClinicianTypes()
  const services = servicesData?.services ?? MockStore.getServices()

  // BUG-CLIN-006 fix: three-tier lookup:
  //   1. Live GraphQL data  2. MockStore (clin-X ids)  3. MOCK_EDIT_DATA (c1..c8 ids)
  const mockClinicianRaw = MockStore.getClinicianById(id) ?? MockStore.getClinicianById(`clin-${id}`) ?? MOCK_EDIT_DATA[id] ?? null

  // Populate form once data loads (or from mock fallback)
  useEffect(() => {
    const c = data?.clinician ?? mockClinicianRaw
    if (!c) return
    setForm({
      first_name:        c.first_name ?? '',
      last_name:         c.last_name  ?? '',
      email:             c.email      ?? '',
      phone:             c.phone      ?? c.phone_number ?? '',
      gender:            c.gender     ?? '',
      bio:               c.bio        ?? '',
      consultation_fee:  c.consultation_fee?.toString() ?? '',
      clinician_type_id: c.clinician_type?.id ?? '',
      clinic_ids:        (c.clinics   ?? []).map(x => x.id),
      service_ids:       (c.services  ?? []).map(x => x.id),
      languages:         c.languages  ?? [],
      is_active:         c.is_active  ?? true,
    })
  }, [data?.clinician?.id, id]) // eslint-disable-line

  const [updateClinician, { loading }] = useMutation(UPDATE_CLINICIAN_MUTATION, {
    onCompleted: () => {
      enqueueSnackbar('Clinician updated successfully', { variant: 'success' })
      navigate(`/clinicians/${id}`)
    },
    onError: (err) => enqueueSnackbar(err.message, { variant: 'error' }),
  })

  // BUG-CLIN-006: only show skeleton if truly loading AND no mock fallback available (inc. MOCK_EDIT_DATA)
  if (fetching && !form && !mockClinicianRaw && !MOCK_EDIT_DATA[id]) {
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
  if (!form) return null

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
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Invalid email format'  // BUG-CLIN-005 fix
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
              Edit — {(data?.clinician ?? mockClinicianRaw)?.full_name ?? `${form.first_name} ${form.last_name}`.trim() || 'Clinician'}
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
