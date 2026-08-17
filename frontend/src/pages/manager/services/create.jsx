import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@apollo/client'
import { Helmet } from 'react-helmet-async'
import { useSnackbar } from 'notistack'
import {
  Box, Button, CircularProgress, FormControlLabel,
  Grid, IconButton, InputAdornment, Paper, Stack, Switch, TextField, Typography,
} from '@mui/material'
import ArrowBackRoundedIcon  from '@mui/icons-material/ArrowBackRounded'
import MedicalServicesRoundedIcon from '@mui/icons-material/MedicalServicesRounded'
import SaveRoundedIcon       from '@mui/icons-material/SaveRounded'
import { CREATE_SERVICE_MUTATION } from '../../../graphql/mutations'

export default function CreateServicePage() {
  const navigate = useNavigate()
  const { enqueueSnackbar } = useSnackbar()
  const [form, setForm] = useState({ name:'', description:'', duration_minutes:'30', price:'', category:'', is_active:true })
  const [errors, setErrors] = useState({})

  const [createService, { loading }] = useMutation(CREATE_SERVICE_MUTATION, {
    onCompleted: (d) => { enqueueSnackbar('Service created', { variant:'success' }); navigate('/manager/services') },
    onError: (err) => enqueueSnackbar(err.message, { variant:'error' }),
  })

  const set = (f) => (e) => setForm(p => ({...p, [f]: e.target.value}))
  const validate = () => { const e={}; if (!form.name.trim()) e.name='Required'; setErrors(e); return !Object.keys(e).length }

  return (
    <Box className="page-enter">
      <Helmet><title>New Service — MediBook</title></Helmet>
      <Box sx={{ display:'flex', alignItems:'center', gap:1.5, mb:3, flexWrap:'wrap' }}>
        <IconButton onClick={() => navigate('/manager/services')} sx={{ bgcolor:'#F1F3F4' }} aria-label="Back to services"><ArrowBackRoundedIcon /></IconButton>
        <Box sx={{ display:'flex', alignItems:'center', gap:1.5, flex:1 }}>
          <Box sx={{ width:40, height:40, borderRadius:2.5, background:'linear-gradient(135deg,#E6F4EA,#B7DFC1)', display:'flex', alignItems:'center', justifyContent:'center' }}><MedicalServicesRoundedIcon sx={{ color:'#137333', fontSize:'1.2rem' }} /></Box>
          <Box><Typography variant="h5" fontWeight={800}>New Service</Typography><Typography variant="body2" color="text.secondary">Add a clinical service to the catalogue</Typography></Box>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" onClick={() => navigate('/manager/services')} sx={{ borderRadius:2.5, textTransform:'none', fontWeight:700 }}>Cancel</Button>
          <Button variant="contained" startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <SaveRoundedIcon />}
            onClick={() => { if(validate()) createService({ variables:{ input:{ name:form.name, description:form.description||undefined, duration_minutes:parseInt(form.duration_minutes)||30, price:form.price?parseFloat(form.price):undefined, is_active:form.is_active } } }) }}
            disabled={loading} sx={{ borderRadius:2.5, textTransform:'none', fontWeight:700, bgcolor:'#0F9D58','&:hover':{bgcolor:'#0B8043'} }}>
            {loading ? 'Saving…' : 'Save Service'}
          </Button>
        </Stack>
      </Box>
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper elevation={0} sx={{ p:3, borderRadius:3, border:'1px solid #E8EAED' }}>
            <Typography variant="subtitle1" fontWeight={700} mb={2.5}>Service Details</Typography>
            <Grid container spacing={2.5}>
              <Grid item xs={12}><TextField fullWidth label="Service Name *" value={form.name} onChange={set('name')} error={!!errors.name} helperText={errors.name} sx={{ '& .MuiOutlinedInput-root':{borderRadius:2} }} /></Grid>
              <Grid item xs={12}><TextField fullWidth multiline rows={3} label="Description" value={form.description} onChange={set('description')} sx={{ '& .MuiOutlinedInput-root':{borderRadius:2} }} /></Grid>
              <Grid item xs={12} sm={6}><TextField fullWidth label="Duration (minutes)" type="number" value={form.duration_minutes} onChange={set('duration_minutes')} inputProps={{ min: 1 }} sx={{ '& .MuiOutlinedInput-root':{borderRadius:2} }} /></Grid>
              <Grid item xs={12} sm={6}><TextField fullWidth label="Price" type="number" value={form.price} onChange={set('price')} inputProps={{ min: 0, step: 0.01 }} InputProps={{ startAdornment:<InputAdornment position="start">₹</InputAdornment> }} sx={{ '& .MuiOutlinedInput-root':{borderRadius:2} }} /></Grid>
              <Grid item xs={12}><TextField fullWidth label="Category" value={form.category} onChange={set('category')} sx={{ '& .MuiOutlinedInput-root':{borderRadius:2} }} /></Grid>
            </Grid>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper elevation={0} sx={{ p:3, borderRadius:3, border:'1px solid #E8EAED' }}>
            <Typography variant="subtitle1" fontWeight={700} mb={1}>Status</Typography>
            <FormControlLabel control={<Switch checked={form.is_active} onChange={e => setForm(f => ({...f,is_active:e.target.checked}))} color="success" />}
              label={<Typography fontWeight={600} color={form.is_active?'success.main':'text.secondary'}>{form.is_active?'Active':'Inactive'}</Typography>} />
          </Paper>
        </Grid>
      </Grid>
    </Box>
  )
}
