import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@apollo/client'
import { Helmet } from 'react-helmet-async'
import { useSnackbar } from 'notistack'
import {
  Box,
  Button,
  CircularProgress,
  FormControlLabel,
  Grid,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded'
import MedicalServicesRoundedIcon from '@mui/icons-material/MedicalServicesRounded'
import SaveRoundedIcon from '@mui/icons-material/SaveRounded'
import { CREATE_SERVICE_MUTATION } from '../../../graphql/mutations'

// REQ016 (US-CAT-04) — corporate/staff/camp only; 'general' is omitted
// deliberately, since the base Price field above already IS the general
// rate (an explicit 'general' override would just duplicate it).
const CATEGORY_OVERRIDE_FIELDS = [
  { key: 'corporate', label: 'Corporate rate' },
  { key: 'staff', label: 'Staff rate' },
  { key: 'camp', label: 'Camp rate' },
]
const CHANNEL_OVERRIDE_FIELDS = [
  { key: 'online', label: 'Online rate' },
  { key: 'walkin', label: 'Walk-in rate' },
]

export default function CreateServicePage() {
  const navigate = useNavigate()
  const { enqueueSnackbar } = useSnackbar()
  const [form, setForm] = useState({
    name: '',
    description: '',
    duration_minutes: '30',
    price: '',
    category: '',
    is_active: true,
    prepayment_policy: 'none',
  })
  const [categoryPricing, setCategoryPricing] = useState({ corporate: '', staff: '', camp: '' })
  const [channelPricing, setChannelPricing] = useState({ online: '', walkin: '' })
  const [errors, setErrors] = useState({})

  const [createService, { loading }] = useMutation(CREATE_SERVICE_MUTATION, {
    onCompleted: (d) => {
      enqueueSnackbar('Service created', { variant: 'success' })
      navigate('/manager/services')
    },
    onError: (err) => enqueueSnackbar(err.message, { variant: 'error' }),
  })

  const set = (f) => (e) => setForm((p) => ({ ...p, [f]: e.target.value }))
  const validate = () => {
    const e = {}
    if (!form.name.trim()) e.name = 'Required'
    setErrors(e)
    return !Object.keys(e).length
  }

  // Only fields the manager actually entered are sent -- an entirely-empty
  // overrides object still replaces whatever's stored (see ServiceInput's
  // own doc comment), so omit the whole key rather than send {}.
  const overridesToInput = (obj) => {
    const entries = Object.entries(obj)
      .filter(([, v]) => v !== '' && v != null)
      .map(([k, v]) => [k, parseFloat(v)])
    return entries.length ? Object.fromEntries(entries) : undefined
  }

  return (
    <Box className="page-enter">
      <Helmet>
        <title>New Service — MediBook</title>
      </Helmet>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3, flexWrap: 'wrap' }}>
        <IconButton onClick={() => navigate('/manager/services')} sx={{ bgcolor: 'action.hover' }} aria-label="Back to services">
          <ArrowBackRoundedIcon />
        </IconButton>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2.5,
              background: (t) => `linear-gradient(135deg, ${alpha(t.palette.success.main, 0.18)}, ${alpha(t.palette.success.light, 0.24)})`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <MedicalServicesRoundedIcon sx={{ color: 'success.main', fontSize: '1.2rem' }} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={800}>
              New Service
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Add a clinical service to the catalogue
            </Typography>
          </Box>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            onClick={() => navigate('/manager/services')}
            sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 700 }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <SaveRoundedIcon />}
            onClick={() => {
              if (validate())
                createService({
                  variables: {
                    input: {
                      name: form.name,
                      description: form.description || undefined,
                      duration_minutes: parseInt(form.duration_minutes) || 30,
                      price: form.price ? parseFloat(form.price) : undefined,
                      is_active: form.is_active,
                      category_pricing: overridesToInput(categoryPricing),
                      channel_pricing: overridesToInput(channelPricing),
                      prepayment_policy: form.prepayment_policy,
                    },
                  },
                })
            }}
            disabled={loading}
            sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 700, bgcolor: 'success.main', '&:hover': { bgcolor: 'success.dark' } }}
          >
            {loading ? 'Saving…' : 'Save Service'}
          </Button>
        </Stack>
      </Box>
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #E8EAED' }}>
            <Typography variant="subtitle1" fontWeight={700} mb={2.5}>
              Service Details
            </Typography>
            <Grid container spacing={2.5}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Service Name *"
                  value={form.name}
                  onChange={set('name')}
                  error={!!errors.name}
                  helperText={errors.name}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Description"
                  value={form.description}
                  onChange={set('description')}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Duration (minutes)"
                  type="number"
                  value={form.duration_minutes}
                  onChange={set('duration_minutes')}
                  inputProps={{ min: 1 }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Price"
                  type="number"
                  value={form.price}
                  onChange={set('price')}
                  inputProps={{ min: 0, step: 0.01 }}
                  InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Category"
                  value={form.category}
                  onChange={set('category')}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              </Grid>
              {/* REQ018 (US-BOOK-03) */}
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  fullWidth
                  label="Prepayment policy"
                  value={form.prepayment_policy}
                  onChange={set('prepayment_policy')}
                  helperText="Required: booking doesn't confirm until payment succeeds"
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                >
                  <MenuItem value="none">None (confirm immediately)</MenuItem>
                  <MenuItem value="optional">Optional</MenuItem>
                  <MenuItem value="required">Required</MenuItem>
                </TextField>
              </Grid>
            </Grid>
          </Paper>

          {/* REQ016 (US-CAT-04) */}
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #E8EAED', mt: 3 }}>
            <Typography variant="subtitle1" fontWeight={700} mb={0.5}>
              Pricing Overrides
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Leave blank to use the base Price above. A patient-category rate always wins over a channel rate when both would apply.
            </Typography>
            <Grid container spacing={2.5}>
              {CATEGORY_OVERRIDE_FIELDS.map(({ key, label }) => (
                <Grid item xs={12} sm={4} key={key}>
                  <TextField
                    fullWidth
                    label={label}
                    type="number"
                    value={categoryPricing[key]}
                    onChange={(e) => setCategoryPricing((p) => ({ ...p, [key]: e.target.value }))}
                    inputProps={{ min: 0, step: 0.01 }}
                    InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                  />
                </Grid>
              ))}
              {CHANNEL_OVERRIDE_FIELDS.map(({ key, label }) => (
                <Grid item xs={12} sm={6} key={key}>
                  <TextField
                    fullWidth
                    label={label}
                    type="number"
                    value={channelPricing[key]}
                    onChange={(e) => setChannelPricing((p) => ({ ...p, [key]: e.target.value }))}
                    inputProps={{ min: 0, step: 0.01 }}
                    InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                  />
                </Grid>
              ))}
            </Grid>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #E8EAED' }}>
            <Typography variant="subtitle1" fontWeight={700} mb={1}>
              Status
            </Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={form.is_active}
                  onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                  color="success"
                />
              }
              label={
                <Typography fontWeight={600} color={form.is_active ? 'success.main' : 'text.secondary'}>
                  {form.is_active ? 'Active' : 'Inactive'}
                </Typography>
              }
            />
          </Paper>
        </Grid>
      </Grid>
    </Box>
  )
}
