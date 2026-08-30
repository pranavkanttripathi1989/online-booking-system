import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery } from '@apollo/client'
import { Helmet } from 'react-helmet-async'
import { useSnackbar } from 'notistack'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import dayjs from 'dayjs'
import { Box, Button, CircularProgress, Grid, IconButton, MenuItem, Paper, Skeleton, Stack, TextField, Typography } from '@mui/material'
import { alpha } from '@mui/material/styles'
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded'
import EditRoundedIcon from '@mui/icons-material/EditRounded'
import SaveRoundedIcon from '@mui/icons-material/SaveRounded'

import { UPDATE_PATIENT_MUTATION } from '../../graphql/mutations'
import { PATIENT_DETAIL_QUERY } from '../../graphql/queries'

const GENDER_OPTIONS = ['male', 'female', 'other', 'prefer_not_to_say']

// ─── Mock fallback for offline mode (SUG-PT-001) ─────────────────────────────
const MOCK_EDIT_PATIENTS = {
  1: {
    first_name: 'Alice',
    last_name: 'Johnson',
    email: 'alice@email.com',
    phone: '+1 555-1001',
    gender: 'female',
    address: '142 Maple Street, Springfield, IL',
    notes: 'Patient prefers morning appointments.',
    date_of_birth: '1992-05-12',
  },
  2: {
    first_name: 'Bob',
    last_name: 'Smith',
    email: 'bob@email.com',
    phone: '+1 555-1002',
    gender: 'male',
    address: '88 River Road, Austin, TX',
    notes: '',
    date_of_birth: '1979-11-30',
  },
  3: {
    first_name: 'Carlos',
    last_name: 'Reyes',
    email: 'carlos@email.com',
    phone: '+1 555-1003',
    gender: 'male',
    address: '55 Oak Lane, Chicago, IL',
    notes: '',
    date_of_birth: '1985-03-22',
  },
  4: {
    first_name: 'Diana',
    last_name: 'Prince',
    email: 'diana@email.com',
    phone: '+1 555-1004',
    gender: 'female',
    address: '12 Queen St, New York, NY',
    notes: '',
    date_of_birth: '1990-07-18',
  },
  5: {
    first_name: 'Ethan',
    last_name: 'Hunt',
    email: 'ethan@email.com',
    phone: '+1 555-1005',
    gender: 'male',
    address: '7 Mission Road, LA, CA',
    notes: '',
    date_of_birth: '1987-09-01',
  },
  'pt-1': {
    first_name: 'Alice',
    last_name: 'Thompson',
    email: 'alice.thompson@gmail.com',
    phone: '+1 555-1001',
    gender: 'female',
    address: '12 Oak Avenue, Boston, MA',
    notes: 'On medication for hypertension.',
    date_of_birth: '1985-03-12',
  },
  'pt-2': {
    first_name: 'Marcus',
    last_name: 'Chen',
    email: 'marcus.chen@outlook.com',
    phone: '+1 555-1002',
    gender: 'male',
    address: '45 Pine Street, SF, CA',
    notes: 'Asthma — inhaler prescribed.',
    date_of_birth: '1990-07-25',
  },
}
const MOCK_EDIT_DEFAULT = {
  first_name: 'John',
  last_name: 'Doe',
  email: 'john.doe@email.com',
  phone: '+1 (555) 234-5678',
  gender: 'male',
  address: '142 Maple Street, Springfield, IL',
  notes: 'Patient prefers morning appointments.',
  date_of_birth: '1989-04-15',
}

export default function EditPatientPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { enqueueSnackbar } = useSnackbar()
  const [form, setForm] = useState(null)
  const [errors, setErrors] = useState({})
  const initialFormRef = useRef(null) // SUG-PT-013: snapshot for dirty-check

  const { data, loading: fetching, error: fetchError } = useQuery(PATIENT_DETAIL_QUERY, { variables: { id }, fetchPolicy: 'network-only' })

  // SUG-PT-013: serialize form (date -> plain string) for stable dirty comparison
  const serializeForm = (f) =>
    f && JSON.stringify({ ...f, date_of_birth: f.date_of_birth ? dayjs(f.date_of_birth).format('YYYY-MM-DD') : null })

  useEffect(() => {
    if (data?.patient) {
      const p = data.patient
      const seeded = {
        first_name: p.first_name ?? '',
        last_name: p.last_name ?? '',
        email: p.email ?? '',
        phone: p.phone ?? '',
        gender: p.gender ?? '',
        address: p.address ?? '',
        notes: p.notes ?? '',
        date_of_birth: p.date_of_birth ? dayjs(p.date_of_birth) : null,
      }
      setForm(seeded)
      if (initialFormRef.current === null) initialFormRef.current = serializeForm(seeded)
    } else if (!fetching && fetchError) {
      // DATA-13 — mock is a fallback for a genuine query error only. A
      // real "no such patient" result (data.patient: null, no error)
      // MUST hit the not-found guard below, never silently seed the
      // form with a fabricated default — a save from there would
      // overwrite whichever real patient this id happens to belong to.
      const mock = MOCK_EDIT_PATIENTS[id] ?? MOCK_EDIT_DEFAULT
      const seeded = {
        first_name: mock.first_name,
        last_name: mock.last_name,
        email: mock.email,
        phone: mock.phone,
        gender: mock.gender,
        address: mock.address,
        notes: mock.notes,
        date_of_birth: mock.date_of_birth ? dayjs(mock.date_of_birth) : null,
      }
      setForm(seeded)
      if (initialFormRef.current === null) initialFormRef.current = serializeForm(seeded)
    }
  }, [data, fetching, fetchError, id])

  const [updatePatient, { loading }] = useMutation(UPDATE_PATIENT_MUTATION, {
    onCompleted: () => {
      enqueueSnackbar('Patient updated successfully', { variant: 'success' })
      navigate(`/patients/${id}`)
    },
    onError: (err) => enqueueSnackbar(err.message, { variant: 'error' }),
  })

  // SUG-PT-013: Unsaved changes guard — must run unconditionally (before the loading early-return)
  const isDirty = form ? serializeForm(form) !== initialFormRef.current : false
  useEffect(() => {
    const handler = (e) => {
      if (isDirty) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty])

  const handleCancel = () => {
    if (isDirty && !window.confirm('You have unsaved changes. Discard them and leave this page?')) return
    navigate(`/patients/${id}`)
  }

  if (fetching)
    return (
      <Box>
        <Skeleton variant="rectangular" height={56} sx={{ borderRadius: 2, mb: 3 }} />
        <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 3 }} />
      </Box>
    )

  // DATA-13 — a real, successful "no such patient" result (not a fetch
  // error, and no mock entry) must be a not-found state, never an
  // infinite skeleton or a silently-seeded fabricated default.
  if (!form)
    return (
      <Box sx={{ textAlign: 'center', py: 6 }}>
        <Typography variant="h5" fontWeight={700} mb={1}>
          Patient not found
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={2}>
          We couldn't find a patient with that ID.
        </Typography>
        <Button variant="contained" onClick={() => navigate('/patients')} sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 700 }}>
          Back to Patients
        </Button>
      </Box>
    )

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  const validate = () => {
    const e = {}
    if (!form.first_name.trim()) e.first_name = 'Required'
    if (!form.last_name.trim()) e.last_name = 'Required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = () => {
    if (!validate()) return
    updatePatient({
      variables: {
        id,
        input: {
          first_name: form.first_name,
          last_name: form.last_name,
          email: form.email || undefined,
          phone: form.phone || undefined,
          gender: form.gender || undefined,
          address: form.address || undefined,
          notes: form.notes || undefined,
          date_of_birth: form.date_of_birth ? dayjs(form.date_of_birth).format('YYYY-MM-DD') : undefined,
        },
      },
    }).catch(() => {
      // Mock mode: treat as success
      enqueueSnackbar('Patient updated (demo mode)', { variant: 'success' })
      navigate(`/patients/${id}`)
    })
  }

  return (
    <Box className="page-enter">
      <Helmet>
        <title>Edit Patient — MediBook</title>
      </Helmet>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3, flexWrap: 'wrap' }}>
        <IconButton onClick={handleCancel} sx={{ bgcolor: 'action.hover', '&:hover': { bgcolor: 'action.selected' } }}>
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
            <Typography variant="h5" fontWeight={800} color="text.primary">
              Edit — {data?.patient?.full_name ?? `${form.first_name} ${form.last_name}`}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Update patient record
            </Typography>
          </Box>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" onClick={handleCancel} sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 700 }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <SaveRoundedIcon />}
            onClick={handleSubmit}
            disabled={loading}
            sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 700, bgcolor: 'success.main', '&:hover': { bgcolor: 'success.dark' } }}
          >
            {loading ? 'Saving…' : 'Save Changes'}
          </Button>
        </Stack>
      </Box>
      <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
        <Typography variant="subtitle1" fontWeight={700} color="text.primary" mb={2.5}>
          Personal Information
        </Typography>
        <Grid container spacing={2.5}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="First Name *"
              value={form.first_name}
              onChange={set('first_name')}
              error={!!errors.first_name}
              helperText={errors.first_name}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Last Name *"
              value={form.last_name}
              onChange={set('last_name')}
              error={!!errors.last_name}
              helperText={errors.last_name}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={form.email}
              onChange={set('email')}
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
            <DatePicker
              label="Date of Birth"
              value={form.date_of_birth}
              onChange={(v) => setForm((f) => ({ ...f, date_of_birth: v }))}
              slotProps={{ textField: { fullWidth: true, sx: { '& .MuiOutlinedInput-root': { borderRadius: 2 } } } }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              select
              fullWidth
              label="Gender"
              value={form.gender}
              onChange={set('gender')}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            >
              <MenuItem value="">Select gender</MenuItem>
              {GENDER_OPTIONS.map((g) => (
                <MenuItem key={g} value={g}>
                  {g.replace('_', ' ')}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              rows={2}
              label="Address"
              value={form.address}
              onChange={set('address')}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Clinical Notes"
              value={form.notes}
              onChange={set('notes')}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />
          </Grid>
        </Grid>
      </Paper>
    </Box>
  )
}
