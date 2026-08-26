import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material'
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded'
import MeetingRoomRoundedIcon from '@mui/icons-material/MeetingRoomRounded'
import SaveRoundedIcon from '@mui/icons-material/SaveRounded'
import { CREATE_ROOM_MUTATION } from '../../../graphql/mutations'
import { CLINICS_QUERY } from '../../../graphql/queries'

export default function CreateRoomPage() {
  const navigate = useNavigate()
  const { enqueueSnackbar, closeSnackbar } = useSnackbar()
  const [form, setForm] = useState({ name: '', capacity: '', clinic_id: '', is_active: true })
  const [errors, setErrors] = useState({})
  const { data: clinicsData } = useQuery(CLINICS_QUERY)
  const clinics = (clinicsData?.clinics ?? []).filter((c) => c.is_active)

  const [createRoom, { loading }] = useMutation(CREATE_ROOM_MUTATION, {
    onCompleted: (d) => {
      // SUG-RM-005 — after create we navigate to edit (so details can be added right away),
      // but offer a "View List" action for managers who'd rather go straight back to the list.
      enqueueSnackbar('Room created', {
        variant: 'success',
        action: (key) => (
          <Button
            size="small"
            sx={{ color: 'inherit', fontWeight: 700 }}
            onClick={() => {
              closeSnackbar(key)
              navigate('/manager/rooms')
            }}
          >
            View List
          </Button>
        ),
      })
      navigate(`/manager/rooms/${d.createRoom.id}/edit`)
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

  return (
    <Box className="page-enter">
      <Helmet>
        <title>New Room — MediBook</title>
      </Helmet>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3, flexWrap: 'wrap' }}>
        <IconButton onClick={() => navigate('/manager/rooms')} sx={{ bgcolor: '#F1F3F4' }}>
          <ArrowBackRoundedIcon />
        </IconButton>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2.5,
              background: 'linear-gradient(135deg,#E8F0FE,#C5D8FD)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <MeetingRoomRoundedIcon sx={{ color: '#1A73E8', fontSize: '1.2rem' }} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={800}>
              New Room
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Add a room to a clinic
            </Typography>
          </Box>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            onClick={() => navigate('/manager/rooms')}
            sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 700 }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <SaveRoundedIcon />}
            onClick={() => {
              if (validate())
                createRoom({
                  variables: {
                    input: {
                      name: form.name,
                      capacity: form.capacity ? parseInt(form.capacity) : undefined,
                      clinic_id: form.clinic_id || undefined,
                      is_active: form.is_active,
                    },
                  },
                })
            }}
            disabled={loading}
            sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 700, background: 'linear-gradient(135deg,#4285F4,#1A73E8)' }}
          >
            {loading ? 'Saving…' : 'Save Room'}
          </Button>
        </Stack>
      </Box>
      <Grid container spacing={3}>
        <Grid item xs={12} md={7}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #E8EAED' }}>
            <Typography variant="subtitle1" fontWeight={700} mb={2.5}>
              Room Details
            </Typography>
            <Grid container spacing={2.5}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Room Name *"
                  value={form.name}
                  onChange={set('name')}
                  error={!!errors.name}
                  helperText={errors.name}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Capacity"
                  type="number"
                  value={form.capacity}
                  onChange={set('capacity')}
                  inputProps={{ min: 0 }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  fullWidth
                  label="Clinic"
                  value={form.clinic_id}
                  onChange={set('clinic_id')}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                >
                  <MenuItem value="">No clinic</MenuItem>
                  {clinics.map((c) => (
                    <MenuItem key={c.id} value={c.id}>
                      {c.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
        <Grid item xs={12} md={5}>
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
