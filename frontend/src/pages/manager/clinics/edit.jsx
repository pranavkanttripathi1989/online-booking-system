import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery } from '@apollo/client'
import { Helmet } from 'react-helmet-async'
import { useSnackbar } from 'notistack'
import {
  Box, Button, CircularProgress, FormControlLabel,
  Grid, IconButton, MenuItem, Paper, Skeleton, Stack,
  Switch, TextField, Typography,
} from '@mui/material'
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded'
import EditRoundedIcon      from '@mui/icons-material/EditRounded'
import SaveRoundedIcon      from '@mui/icons-material/SaveRounded'
import { UPDATE_CLINIC_MUTATION } from '../../../graphql/mutations'
import { CLINIC_DETAIL_QUERY }    from '../../../graphql/queries'

const TIMEZONES = ['Europe/London','Europe/Paris','Europe/Berlin','America/New_York','America/Los_Angeles','Asia/Dubai','Asia/Karachi','Asia/Kolkata','Australia/Sydney']

export default function EditClinicPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { enqueueSnackbar } = useSnackbar()
  const [form, setForm] = useState(null)

  const { data, loading: fetching } = useQuery(CLINIC_DETAIL_QUERY, { variables: { id }, fetchPolicy: 'network-only' })

  useEffect(() => {
    if (!data?.clinic) return
    const c = data.clinic
    setForm({ name: c.name||'', address: c.address||'', city: c.city||'', postcode: c.postcode||'', phone: c.phone||'', email: c.email||'', timezone: c.timezone||'Europe/London', is_active: c.is_active??true })
  }, [data])

  const [updateClinic, { loading }] = useMutation(UPDATE_CLINIC_MUTATION, {
    onCompleted: () => { enqueueSnackbar('Clinic updated', { variant:'success' }); navigate(`/manager/clinics/${id}`) },
    onError: (err) => enqueueSnackbar(err.message, { variant:'error' }),
  })

  if (fetching || !form) return <Box><Skeleton variant="rectangular" height={56} sx={{ borderRadius:2, mb:3 }} /><Skeleton variant="rectangular" height={400} sx={{ borderRadius:3 }} /></Box>

  const set = (f) => (e) => setForm(p => ({ ...p, [f]: e.target.value }))

  return (
    <Box className="page-enter">
      <Helmet><title>Edit Clinic — MediBook</title></Helmet>
      <Box sx={{ display:'flex', alignItems:'center', gap:1.5, mb:3, flexWrap:'wrap' }}>
        <IconButton onClick={() => navigate(`/manager/clinics/${id}`)} sx={{ bgcolor:'#F1F3F4','&:hover':{bgcolor:'#E8EAED'} }}><ArrowBackRoundedIcon /></IconButton>
        <Box sx={{ display:'flex', alignItems:'center', gap:1.5, flex:1 }}>
          <Box sx={{ width:40, height:40, borderRadius:2.5, background:'linear-gradient(135deg,#FEF7E0,#FEEFC3)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <EditRoundedIcon sx={{ color:'#F9AB00', fontSize:'1.2rem' }} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={800}>Edit — {data?.clinic?.name}</Typography>
            <Typography variant="body2" color="text.secondary">Update clinic details</Typography>
          </Box>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" onClick={() => navigate(`/manager/clinics/${id}`)} sx={{ borderRadius:2.5, textTransform:'none', fontWeight:700 }}>Cancel</Button>
          <Button variant="contained" startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <SaveRoundedIcon />}
            onClick={() => updateClinic({ variables: { id, input: form } })} disabled={loading}
            sx={{ borderRadius:2.5, textTransform:'none', fontWeight:700, background:'linear-gradient(135deg,#4285F4,#1A73E8)' }}>
            {loading ? 'Saving…' : 'Save Changes'}
          </Button>
        </Stack>
      </Box>
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper elevation={0} sx={{ p:3, borderRadius:3, border:'1px solid #E8EAED', mb:3 }}>
            <Typography variant="subtitle1" fontWeight={700} mb={2.5}>Clinic Details</Typography>
            <Grid container spacing={2.5}>
              <Grid item xs={12}><TextField fullWidth label="Clinic Name *" value={form.name} onChange={set('name')} sx={{ '& .MuiOutlinedInput-root':{borderRadius:2} }} /></Grid>
              <Grid item xs={12}><TextField fullWidth label="Address" value={form.address} onChange={set('address')} sx={{ '& .MuiOutlinedInput-root':{borderRadius:2} }} /></Grid>
              <Grid item xs={12} sm={6}><TextField fullWidth label="City" value={form.city} onChange={set('city')} sx={{ '& .MuiOutlinedInput-root':{borderRadius:2} }} /></Grid>
              <Grid item xs={12} sm={6}><TextField fullWidth label="Postcode" value={form.postcode} onChange={set('postcode')} sx={{ '& .MuiOutlinedInput-root':{borderRadius:2} }} /></Grid>
              <Grid item xs={12} sm={6}><TextField fullWidth label="Phone" value={form.phone} onChange={set('phone')} sx={{ '& .MuiOutlinedInput-root':{borderRadius:2} }} /></Grid>
              <Grid item xs={12} sm={6}><TextField fullWidth label="Email" value={form.email} onChange={set('email')} sx={{ '& .MuiOutlinedInput-root':{borderRadius:2} }} /></Grid>
              <Grid item xs={12}><TextField select fullWidth label="Timezone" value={form.timezone} onChange={set('timezone')} sx={{ '& .MuiOutlinedInput-root':{borderRadius:2} }}>{TIMEZONES.map(tz => <MenuItem key={tz} value={tz}>{tz}</MenuItem>)}</TextField></Grid>
            </Grid>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper elevation={0} sx={{ p:3, borderRadius:3, border:'1px solid #E8EAED' }}>
            <Typography variant="subtitle1" fontWeight={700} mb={1}>Status</Typography>
            <FormControlLabel
              control={<Switch checked={form.is_active} onChange={e => setForm(f => ({...f, is_active:e.target.checked}))} color="success" />}
              label={<Typography fontWeight={600} color={form.is_active?'success.main':'text.secondary'}>{form.is_active?'Active':'Inactive'}</Typography>}
            />
          </Paper>
        </Grid>
      </Grid>
    </Box>
  )
}
