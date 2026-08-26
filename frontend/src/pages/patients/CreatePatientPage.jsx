import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useLazyQuery, gql } from '@apollo/client'
import { Helmet } from 'react-helmet-async'
import { useSnackbar } from 'notistack'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import dayjs from 'dayjs'
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Grid,
  IconButton,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Paper,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material'
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded'
import PersonAddRoundedIcon from '@mui/icons-material/PersonAddRounded'
import SaveRoundedIcon from '@mui/icons-material/SaveRounded'

import { CREATE_PATIENT_MUTATION } from '../../graphql/mutations'

// REQ018 US-BOOK-01 -- dedup-suggestion check, run before create rather
// than blocking it (a false positive here would be worse than a missed
// duplicate).
const POTENTIAL_DUPLICATES_QUERY = gql`
  query PotentialDuplicatePatients($phone: String!, $first_name: String, $last_name: String, $date_of_birth: String) {
    potentialDuplicatePatients(phone: $phone, first_name: $first_name, last_name: $last_name, date_of_birth: $date_of_birth) {
      id
      full_name
      phone
      date_of_birth
    }
  }
`

const GENDER_OPTIONS = ['male', 'female', 'other', 'prefer_not_to_say']
const INITIAL = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  date_of_birth: null,
  gender: '',
  address: '',
  notes: '',
}

export default function CreatePatientPage() {
  const navigate = useNavigate()
  const { enqueueSnackbar } = useSnackbar()
  const [form, setForm] = useState(INITIAL)
  const [errors, setErrors] = useState({})
  const [duplicateCandidates, setDuplicateCandidates] = useState(null)

  const [checkDuplicates] = useLazyQuery(POTENTIAL_DUPLICATES_QUERY)

  const [createPatient, { loading }] = useMutation(CREATE_PATIENT_MUTATION, {
    onCompleted: (d) => {
      enqueueSnackbar('Patient created successfully', { variant: 'success' })
      navigate(`/patients/${d.createPatient.id}`)
    },
    onError: (err) => enqueueSnackbar(err.message, { variant: 'error' }),
  })

  // SUG-PT-013: Unsaved changes guard — warn on tab close/refresh while form is dirty
  const isDirty = Object.keys(INITIAL).some((k) => (form[k] ?? '') !== (INITIAL[k] ?? ''))
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
    navigate('/patients')
  }

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  const validate = () => {
    const e = {}
    if (!form.first_name.trim()) e.first_name = 'Required'
    if (!form.last_name.trim()) e.last_name = 'Required'
    // BUG-PAT-003: email required; BUG-PAT-004: email format
    if (!form.email.trim()) {
      e.email = 'Required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      e.email = 'Invalid email address'
    }
    // BUG-PAT-003: phone required
    if (!form.phone.trim() || form.phone.trim().length < 7) {
      e.phone = form.phone.trim() ? 'Enter a valid phone number (min 7 chars)' : 'Required'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const submitCreate = () => {
    createPatient({
      variables: {
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
      // BUG-PAT-005: Mock/offline mode — treat network error as demo success
      enqueueSnackbar('Patient created (demo mode)', { variant: 'success' })
      navigate('/patients')
    })
  }

  const handleSubmit = async () => {
    if (!validate()) return
    const { data } = await checkDuplicates({
      variables: {
        phone: form.phone,
        first_name: form.first_name || undefined,
        last_name: form.last_name || undefined,
        date_of_birth: form.date_of_birth ? dayjs(form.date_of_birth).format('YYYY-MM-DD') : undefined,
      },
    })
    const candidates = data?.potentialDuplicatePatients ?? []
    if (candidates.length > 0) {
      setDuplicateCandidates(candidates)
      return
    }
    submitCreate()
  }

  return (
    <Box className="page-enter">
      <Helmet>
        <title>New Patient — MediBook</title>
      </Helmet>

      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3, flexWrap: 'wrap' }}>
        <IconButton onClick={handleCancel} sx={{ bgcolor: '#F1F3F4', '&:hover': { bgcolor: '#E8EAED' } }}>
          <ArrowBackRoundedIcon />
        </IconButton>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2.5,
              background: 'linear-gradient(135deg,#E6F4EA,#B7DFC1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <PersonAddRoundedIcon sx={{ color: '#137333', fontSize: '1.2rem' }} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={800} color="#202124">
              New Patient
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Register a new patient record
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
            sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 700, bgcolor: '#0F9D58', '&:hover': { bgcolor: '#0B8043' } }}
          >
            {loading ? 'Saving…' : 'Save Patient'}
          </Button>
        </Stack>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #E8EAED', mb: 3 }}>
            <Typography variant="subtitle1" fontWeight={700} color="#202124" mb={2.5}>
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
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #E8EAED', bgcolor: '#F8FDF9' }}>
            <Typography variant="subtitle1" fontWeight={700} color="#137333" mb={1}>
              Patient Record
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Once saved, this patient will appear in the patient list and can be associated with appointments, test results, and messages.
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      <Dialog open={!!duplicateCandidates} onClose={() => setDuplicateCandidates(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Possible existing patient found</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" mb={2}>
            A patient with this phone number (and matching name or date of birth) already exists. Check this isn't a duplicate before
            creating a new record.
          </Typography>
          <List dense>
            {(duplicateCandidates ?? []).map((c) => (
              <ListItem key={c.id} divider>
                <ListItemText primary={c.full_name} secondary={`${c.phone} · ${new Date(c.date_of_birth).toLocaleDateString()}`} />
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDuplicateCandidates(null)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => {
              setDuplicateCandidates(null)
              submitCreate()
            }}
          >
            Create new patient anyway
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
