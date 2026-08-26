import { useState } from 'react'
import { useQuery, useMutation, gql } from '@apollo/client'
import { Helmet } from 'react-helmet-async'
import { useSnackbar } from 'notistack'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import dayjs from 'dayjs'
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import PersonAddRoundedIcon from '@mui/icons-material/PersonAddRounded'
import FamilyRestroomRoundedIcon from '@mui/icons-material/FamilyRestroomRounded'

// REQ018 US-BOOK-02 — one phone-verified login managing multiple patient
// profiles with a relationship label. Booking/viewing appointments for a
// dependant is already supported (createAppointment/patients() both accept
// a dependant's patient_id for a 'patient'-role caller — see PLAN059);
// this page is where a dependant is first added and listed.

const MY_DEPENDANTS_QUERY = gql`
  query MyDependants {
    myDependants {
      id
      relation
      patient {
        id
        full_name
        date_of_birth
        gender
      }
    }
  }
`
const ADD_DEPENDANT_MUTATION = gql`
  mutation AddDependant($input: AddDependantInput!) {
    addDependant(input: $input) {
      id
      relation
      patient {
        id
        full_name
        date_of_birth
        gender
      }
    }
  }
`

const RELATION_OPTIONS = ['child', 'spouse', 'parent', 'sibling', 'other']
const GENDER_OPTIONS = ['male', 'female', 'other', 'prefer_not_to_say']
const EMPTY_FORM = { first_name: '', last_name: '', date_of_birth: null, gender: '', relation: 'child' }

function Family() {
  const { enqueueSnackbar } = useSnackbar()
  const { data, loading, error, refetch } = useQuery(MY_DEPENDANTS_QUERY)
  const [addOpen, setAddOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)

  const [addDependant, { loading: adding }] = useMutation(ADD_DEPENDANT_MUTATION, {
    onCompleted: () => {
      enqueueSnackbar('Dependant added', { variant: 'success' })
      setAddOpen(false)
      setForm(EMPTY_FORM)
      refetch()
    },
    onError: (err) => enqueueSnackbar(err.message, { variant: 'error' }),
  })

  const dependants = data?.myDependants ?? []
  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  const handleAdd = () => {
    if (!form.first_name.trim() || !form.last_name.trim() || !form.date_of_birth) {
      enqueueSnackbar('Name and date of birth are required', { variant: 'warning' })
      return
    }
    addDependant({
      variables: {
        input: {
          first_name: form.first_name,
          last_name: form.last_name,
          date_of_birth: dayjs(form.date_of_birth).format('YYYY-MM-DD'),
          gender: form.gender || undefined,
          relation: form.relation,
        },
      },
    })
  }

  return (
    <Box p={{ xs: 1.5, md: 3 }}>
      <Helmet>
        <title>My Family — MediBook</title>
      </Helmet>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" gap={1}>
        <Box>
          <Typography variant="h5" fontWeight={700}>
            My Family
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Book appointments and view records for a child or other dependant, all under your own login.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<PersonAddRoundedIcon />} onClick={() => setAddOpen(true)}>
          Add Dependant
        </Button>
      </Stack>

      {error && <Alert severity="error">{error.message}</Alert>}
      {!loading && dependants.length === 0 && (
        <Alert severity="info" icon={<FamilyRestroomRoundedIcon />}>
          No dependants added yet. Add a child or family member to book and view their appointments from here.
        </Alert>
      )}

      <Grid container spacing={2}>
        {dependants.map((d) => (
          <Grid item xs={12} sm={6} md={4} key={d.id}>
            <Card variant="outlined">
              <CardContent>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Avatar>{d.patient.full_name.charAt(0)}</Avatar>
                  <Box>
                    <Typography variant="subtitle1" fontWeight={700}>
                      {d.patient.full_name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
                      {d.relation} · {new Date(d.patient.date_of_birth).toLocaleDateString()}
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Dialog open={addOpen} onClose={() => setAddOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Add a Dependant</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={6}>
              <TextField fullWidth label="First name" value={form.first_name} onChange={set('first_name')} />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="Last name" value={form.last_name} onChange={set('last_name')} />
            </Grid>
            <Grid item xs={6}>
              <DatePicker
                label="Date of birth"
                value={form.date_of_birth}
                onChange={(v) => setForm((f) => ({ ...f, date_of_birth: v }))}
                slotProps={{ textField: { fullWidth: true } }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField select fullWidth label="Gender" value={form.gender} onChange={set('gender')}>
                <MenuItem value="">Not specified</MenuItem>
                {GENDER_OPTIONS.map((g) => (
                  <MenuItem key={g} value={g}>
                    {g.replace('_', ' ')}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField select fullWidth label="Relationship" value={form.relation} onChange={set('relation')}>
                {RELATION_OPTIONS.map((r) => (
                  <MenuItem key={r} value={r} sx={{ textTransform: 'capitalize' }}>
                    {r}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAdd} disabled={adding}>
            Add
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default Family
