import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery } from '@apollo/client'
import { Helmet } from 'react-helmet-async'
import { useSnackbar } from 'notistack'
import {
  Box,
  Button,
  CircularProgress,
  FormControlLabel,
  Grid,
  IconButton,
  MenuItem,
  Paper,
  Skeleton,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded'
import EditRoundedIcon from '@mui/icons-material/EditRounded'
import SaveRoundedIcon from '@mui/icons-material/SaveRounded'
import { UPDATE_CLINIC_MUTATION } from '../../../graphql/mutations'
import { CLINIC_DETAIL_QUERY } from '../../../graphql/queries'

const TIMEZONES = [
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'America/New_York',
  'America/Los_Angeles',
  'Asia/Dubai',
  'Asia/Karachi',
  'Asia/Kolkata',
  'Australia/Sydney',
]

// FIX BUG-CLI-002 — mock clinic detail records for offline mode
// Keyed by clinic ID so any :id can resolve to a named clinic
const MOCK_CLINIC_BY_ID = {
  1: {
    id: '1',
    name: 'City Heart Clinic',
    address: '14 Harley Street',
    city: 'London',
    postcode: 'W1G 9PJ',
    phone: '+44 20 7946 0001',
    email: 'info@cityheartclinic.co.uk',
    timezone: 'Europe/London',
    is_active: true,
  },
  2: {
    id: '2',
    name: 'Central Medical Centre',
    address: '22 Brook Street',
    city: 'London',
    postcode: 'W1K 5DF',
    phone: '+44 20 7946 0022',
    email: 'admin@centralmedical.co.uk',
    timezone: 'Europe/London',
    is_active: true,
  },
  3: {
    id: '3',
    name: 'Family Health Hub',
    address: '8 Baker Street',
    city: 'London',
    postcode: 'NW1 6XE',
    phone: '+44 20 7946 0033',
    email: 'hello@familyhealthhub.co.uk',
    timezone: 'Europe/London',
    is_active: true,
  },
  4: {
    id: '4',
    name: 'Westside Physio & Sports',
    address: "5 King's Road",
    city: 'London',
    postcode: 'SW3 4ND',
    phone: '+44 20 7946 0044',
    email: 'info@westsidephysio.co.uk',
    timezone: 'Europe/London',
    is_active: false,
  },
}

const DEFAULT_MOCK_CLINIC = {
  id: '',
  name: 'Unknown Clinic',
  address: '',
  city: '',
  postcode: '',
  phone: '',
  email: '',
  timezone: 'Europe/London',
  is_active: true,
}

export default function EditClinicPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { enqueueSnackbar } = useSnackbar()
  const [form, setForm] = useState(null)
  const [errors, setErrors] = useState({}) // SUG-CLI-006 / SUG-CLI-003 (older file) — email validation

  // fetchPolicy: cache-first allows offline fallback via Apollo InMemoryCache
  // FIX BUG-CLI-002: changed from 'network-only' to 'cache-first' + mock data fallback
  const { data, loading: fetching } = useQuery(CLINIC_DETAIL_QUERY, {
    variables: { id },
    fetchPolicy: 'cache-first',
  })

  useEffect(() => {
    // Use live backend data if available, otherwise fall back to mock
    const c = data?.clinic ?? MOCK_CLINIC_BY_ID[id] ?? DEFAULT_MOCK_CLINIC
    setForm({
      name: c.name || '',
      address: c.address || '',
      city: c.city || '',
      postcode: c.postcode || '',
      state: c.state || '',
      gstin: c.gstin || '',
      phone: c.phone || '',
      email: c.email || '',
      timezone: c.timezone || 'Europe/London',
      is_active: c.is_active ?? true,
    })
  }, [data, id])

  const [updateClinic, { loading }] = useMutation(UPDATE_CLINIC_MUTATION, {
    onCompleted: () => {
      enqueueSnackbar('Clinic updated', { variant: 'success' })
      navigate(`/manager/clinics/${id}`)
    },
    onError: (err) => enqueueSnackbar(err.message, { variant: 'error' }),
  })

  if (fetching && !form)
    return (
      <Box>
        <Skeleton variant="rectangular" height={56} sx={{ borderRadius: 2, mb: 3 }} />
        <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 3 }} />
      </Box>
    )
  if (!form) return null

  const set = (f) => (e) => setForm((p) => ({ ...p, [f]: e.target.value }))

  // SUG-CLI-006 / SUG-CLI-003 (older file) — email format validation before save
  const handleSave = () => {
    const e = {}
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Invalid email format'
    setErrors(e)
    if (Object.keys(e).length) return
    updateClinic({ variables: { id, input: form } })
  }

  // Determine display name (live data → mock → id)
  const clinicName = data?.clinic?.name ?? MOCK_CLINIC_BY_ID[id]?.name ?? `Clinic ${id}`

  return (
    <Box className="page-enter">
      <Helmet>
        <title>Edit Clinic — MediBook</title>
      </Helmet>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3, flexWrap: 'wrap' }}>
        <IconButton
          onClick={() => navigate(`/manager/clinics/${id}`)}
          sx={{ bgcolor: 'action.hover', '&:hover': { bgcolor: 'action.selected' } }}
          aria-label="Back to clinic detail"
        >
          <ArrowBackRoundedIcon />
        </IconButton>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2.5,
              background: (t) => `linear-gradient(135deg, ${alpha(t.palette.warning.main, 0.24)}, ${alpha(t.palette.warning.light, 0.24)})`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <EditRoundedIcon sx={{ color: 'warning.main', fontSize: '1.2rem' }} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={800}>
              Edit — {clinicName}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Update clinic details
            </Typography>
          </Box>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            onClick={() => navigate(`/manager/clinics/${id}`)}
            sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 700 }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <SaveRoundedIcon />}
            onClick={handleSave}
            disabled={loading}
            sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 700, background: (t) => `linear-gradient(135deg,${t.palette.primary.light},${t.palette.primary.main})` }}
          >
            {loading ? 'Saving…' : 'Save Changes'}
          </Button>
        </Stack>
      </Box>
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #E8EAED', mb: 3 }}>
            <Typography variant="subtitle1" fontWeight={700} mb={2.5}>
              Clinic Details
            </Typography>
            <Grid container spacing={2.5}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Clinic Name *"
                  value={form.name}
                  onChange={set('name')}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Address"
                  value={form.address}
                  onChange={set('address')}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="City"
                  value={form.city}
                  onChange={set('city')}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Postcode"
                  value={form.postcode}
                  onChange={set('postcode')}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="State"
                  value={form.state}
                  onChange={set('state')}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="GSTIN"
                  value={form.gstin}
                  onChange={set('gstin')}
                  helperText="15-character GST registration number"
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Phone"
                  value={form.phone}
                  onChange={set('phone')}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Email"
                  value={form.email}
                  onChange={set('email')}
                  error={!!errors.email}
                  helperText={errors.email}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  select
                  fullWidth
                  label="Timezone"
                  value={form.timezone}
                  onChange={set('timezone')}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                >
                  {TIMEZONES.map((tz) => (
                    <MenuItem key={tz} value={tz}>
                      {tz}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
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
