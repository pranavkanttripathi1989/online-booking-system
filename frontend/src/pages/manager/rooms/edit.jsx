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
import { UPDATE_ROOM_MUTATION } from '../../../graphql/mutations'
import { ROOM_DETAIL_QUERY, CLINICS_QUERY } from '../../../graphql/queries'

export default function EditRoomPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { enqueueSnackbar } = useSnackbar()
  const [form, setForm] = useState(null)
  const { data, loading: fetching } = useQuery(ROOM_DETAIL_QUERY, { variables: { id }, fetchPolicy: 'network-only' })
  const { data: clinicsData } = useQuery(CLINICS_QUERY)
  const clinics = (clinicsData?.clinics ?? []).filter((c) => c.is_active)

  useEffect(() => {
    if (!data?.room) return
    const r = data.room
    setForm({ name: r.name || '', capacity: r.capacity?.toString() || '', clinic_id: r.clinic?.id || '', is_active: r.is_active ?? true })
  }, [data])

  const [updateRoom, { loading }] = useMutation(UPDATE_ROOM_MUTATION, {
    onCompleted: () => {
      enqueueSnackbar('Room updated', { variant: 'success' })
      navigate('/manager/rooms')
    },
    onError: (err) => enqueueSnackbar(err.message, { variant: 'error' }),
  })

  // BUG-RM-002 FIX: always render a minimal back-button header so user isn't navigation-trapped
  if (fetching || !form)
    return (
      <Box className="page-enter">
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
          <IconButton onClick={() => navigate('/manager/rooms')} sx={{ bgcolor: 'action.hover' }} aria-label="Back to rooms">
            <ArrowBackRoundedIcon />
          </IconButton>
          <Typography variant="h5" fontWeight={800} color="text.secondary">
            Edit Room
          </Typography>
        </Box>
        <Skeleton variant="rectangular" height={56} sx={{ borderRadius: 2, mb: 3 }} />
        <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 3 }} />
      </Box>
    )

  const set = (f) => (e) => setForm((p) => ({ ...p, [f]: e.target.value }))

  return (
    <Box className="page-enter">
      <Helmet>
        <title>Edit Room — MediBook</title>
      </Helmet>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3, flexWrap: 'wrap' }}>
        <IconButton onClick={() => navigate('/manager/rooms')} sx={{ bgcolor: 'action.hover' }}>
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
              Edit — {data?.room?.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Update room details
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
            onClick={() =>
              updateRoom({
                variables: {
                  id,
                  input: {
                    name: form.name,
                    capacity: form.capacity ? parseInt(form.capacity) : undefined,
                    clinic_id: form.clinic_id || undefined,
                    is_active: form.is_active,
                  },
                },
              })
            }
            disabled={loading}
            sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 700, background: (t) => `linear-gradient(135deg,${t.palette.primary.light},${t.palette.primary.main})` }}
          >
            {loading ? 'Saving…' : 'Save Changes'}
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
