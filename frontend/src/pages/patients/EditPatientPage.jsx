import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery } from '@apollo/client'
import { Helmet } from 'react-helmet-async'
import { useSnackbar } from 'notistack'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import dayjs from 'dayjs'
import {
  Box, Button, CircularProgress, Grid, IconButton,
  MenuItem, Paper, Skeleton, Stack, TextField, Typography,
} from '@mui/material'
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded'
import EditRoundedIcon      from '@mui/icons-material/EditRounded'
import SaveRoundedIcon      from '@mui/icons-material/SaveRounded'

import { UPDATE_PATIENT_MUTATION }  from '../../graphql/mutations'
import { PATIENT_DETAIL_QUERY }     from '../../graphql/queries'

const GENDER_OPTIONS = ['male','female','other','prefer_not_to_say']

export default function EditPatientPage() {
  const { id }   = useParams()
  const navigate = useNavigate()
  const { enqueueSnackbar } = useSnackbar()
  const [form, setForm]     = useState(null)
  const [errors, setErrors] = useState({})

  const { data, loading: fetching } = useQuery(PATIENT_DETAIL_QUERY, { variables: { id }, fetchPolicy: 'network-only' })

  useEffect(() => {
    if (!data?.patient) return
    const p = data.patient
    setForm({
      first_name:    p.first_name    ?? '',
      last_name:     p.last_name     ?? '',
      email:         p.email         ?? '',
      phone:         p.phone         ?? '',
      gender:        p.gender        ?? '',
      address:       p.address       ?? '',
      notes:         p.notes         ?? '',
      date_of_birth: p.date_of_birth ? dayjs(p.date_of_birth) : null,
    })
  }, [data])

  const [updatePatient, { loading }] = useMutation(UPDATE_PATIENT_MUTATION, {
    onCompleted: () => {
      enqueueSnackbar('Patient updated successfully', { variant: 'success' })
      navigate(`/patients/${id}`)
    },
    onError: (err) => enqueueSnackbar(err.message, { variant: 'error' }),
  })

  if (fetching || !form) return (
    <Box><Skeleton variant="rectangular" height={56} sx={{ borderRadius: 2, mb: 3 }} />
      <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 3 }} /></Box>
  )

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }))

  const validate = () => {
    const e = {}
    if (!form.first_name.trim()) e.first_name = 'Required'
    if (!form.last_name.trim())  e.last_name  = 'Required'
    setErrors(e); return Object.keys(e).length === 0
  }

  const handleSubmit = () => {
    if (!validate()) return
    updatePatient({
      variables: {
        id,
        input: {
          first_name:    form.first_name,
          last_name:     form.last_name,
          email:         form.email   || undefined,
          phone:         form.phone   || undefined,
          gender:        form.gender  || undefined,
          address:       form.address || undefined,
          notes:         form.notes   || undefined,
          date_of_birth: form.date_of_birth ? dayjs(form.date_of_birth).format('YYYY-MM-DD') : undefined,
        }
      }
    })
  }

  return (
    <Box className="page-enter">
      <Helmet><title>Edit Patient — MediBook</title></Helmet>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3, flexWrap: 'wrap' }}>
        <IconButton onClick={() => navigate(`/patients/${id}`)} sx={{ bgcolor: '#F1F3F4', '&:hover': { bgcolor: '#E8EAED' } }}>
          <ArrowBackRoundedIcon />
        </IconButton>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1 }}>
          <Box sx={{ width: 40, height: 40, borderRadius: 2.5, background: 'linear-gradient(135deg,#FEF7E0,#FEEFC3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <EditRoundedIcon sx={{ color: '#F9AB00', fontSize: '1.2rem' }} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={800} color="#202124">Edit — {data?.patient?.full_name}</Typography>
            <Typography variant="body2" color="text.secondary">Update patient record</Typography>
          </Box>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" onClick={() => navigate(`/patients/${id}`)} sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 700 }}>Cancel</Button>
          <Button variant="contained" startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <SaveRoundedIcon />}
            onClick={handleSubmit} disabled={loading}
            sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 700, bgcolor: '#0F9D58', '&:hover': { bgcolor: '#0B8043' } }}>
            {loading ? 'Saving…' : 'Save Changes'}
          </Button>
        </Stack>
      </Box>
      <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #E8EAED' }}>
        <Typography variant="subtitle1" fontWeight={700} color="#202124" mb={2.5}>Personal Information</Typography>
        <Grid container spacing={2.5}>
          <Grid item xs={12} sm={6}><TextField fullWidth label="First Name *" value={form.first_name} onChange={set('first_name')} error={!!errors.first_name} helperText={errors.first_name} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} /></Grid>
          <Grid item xs={12} sm={6}><TextField fullWidth label="Last Name *" value={form.last_name} onChange={set('last_name')} error={!!errors.last_name} helperText={errors.last_name} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} /></Grid>
          <Grid item xs={12} sm={6}><TextField fullWidth label="Email" type="email" value={form.email} onChange={set('email')} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} /></Grid>
          <Grid item xs={12} sm={6}><TextField fullWidth label="Phone" value={form.phone} onChange={set('phone')} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} /></Grid>
          <Grid item xs={12} sm={6}>
            <DatePicker label="Date of Birth" value={form.date_of_birth} onChange={(v) => setForm(f => ({ ...f, date_of_birth: v }))}
              slotProps={{ textField: { fullWidth: true, sx: { '& .MuiOutlinedInput-root': { borderRadius: 2 } } } }} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField select fullWidth label="Gender" value={form.gender} onChange={set('gender')} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}>
              <MenuItem value="">Select gender</MenuItem>
              {GENDER_OPTIONS.map(g => <MenuItem key={g} value={g}>{g.replace('_', ' ')}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid item xs={12}><TextField fullWidth multiline rows={2} label="Address" value={form.address} onChange={set('address')} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} /></Grid>
          <Grid item xs={12}><TextField fullWidth multiline rows={3} label="Clinical Notes" value={form.notes} onChange={set('notes')} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} /></Grid>
        </Grid>
      </Paper>
    </Box>
  )
}
