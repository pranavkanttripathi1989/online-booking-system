import { useState, useEffect } from 'react'
import { useApolloClient, gql } from '@apollo/client'
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Grid,
  IconButton,
  Stack,
  Switch,
  TextField,
  Typography,
  Tooltip,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom'
import ConfirmDialog from '../../components/ConfirmDialog/ConfirmDialog'

const GET_ROOM_TYPES = gql`
  query GetRoomTypes {
    roomTypes {
      id
      name
      description
      is_active
    }
  }
`
const CREATE_RT = gql`
  mutation CreateRoomType($input: CreateRoomTypeInput!) {
    createRoomType(input: $input) {
      success
      userErrors {
        message
      }
    }
  }
`
const UPDATE_RT = gql`
  mutation UpdateRoomType($id: ID!, $input: UpdateRoomTypeInput!) {
    updateRoomType(id: $id, input: $input) {
      success
      userErrors {
        message
      }
    }
  }
`
const DELETE_RT = gql`
  mutation DeleteRoomType($id: ID!) {
    deleteRoomType(id: $id) {
      success
      userErrors {
        message
      }
    }
  }
`

const defaultForm = { name: '', description: '', is_active: true }

// ─── Mock fallback (NEW-ADMIN-001) ─────────────────────────────────────────
const MOCK_ROOM_TYPES = [
  { id: 'rt-1', name: 'Consultation Room', description: 'Standard GP / specialist consultation', is_active: true },
  { id: 'rt-2', name: 'Procedure Room', description: 'Minor surgical and clinical procedures', is_active: true },
  { id: 'rt-3', name: 'Video Suite', description: 'Dedicated remote / video consultation room', is_active: true },
  { id: 'rt-4', name: 'Waiting Area Annex', description: 'Overflow waiting space for busy clinics', is_active: true },
  { id: 'rt-5', name: 'Therapy Room', description: 'Physiotherapy and occupational therapy', is_active: false },
]

export default function AdminRoomTypes() {
  const client = useApolloClient()
  const [types, setTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm] = useState(defaultForm)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [formError, setFormError] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [isMockMode, setIsMockMode] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await client.query({ query: GET_ROOM_TYPES, fetchPolicy: 'network-only' })
      setTypes(data?.roomTypes || [])
      setIsMockMode(false)
    } catch {
      // NEW-ADMIN-001: seed mock data when backend is offline
      setTypes(MOCK_ROOM_TYPES)
      setIsMockMode(true)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    load()
  }, []) // eslint-disable-line

  const showSuccess = (msg) => {
    setSuccessMsg(msg)
    setTimeout(() => setSuccessMsg(null), 3000)
  }
  const setField = (k, v) => setForm((p) => ({ ...p, [k]: v }))
  const reset = () => {
    setForm(defaultForm)
    setEditItem(null)
    setShowForm(false)
    setFormError(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setFormError(null)
    try {
      if (editItem) {
        const { data: r } = await client.mutate({ mutation: UPDATE_RT, variables: { id: editItem.id, input: form } })
        if (!r?.updateRoomType?.success) throw new Error(r?.updateRoomType?.userErrors?.[0]?.message)
        showSuccess('Room type updated.')
      } else {
        const { data: r } = await client.mutate({ mutation: CREATE_RT, variables: { input: form } })
        if (!r?.createRoomType?.success) throw new Error(r?.createRoomType?.userErrors?.[0]?.message)
        showSuccess('Room type created.')
      }
      reset()
      load()
    } catch (err) {
      setFormError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggle = async (item) => {
    try {
      await client.mutate({ mutation: UPDATE_RT, variables: { id: item.id, input: { is_active: !item.is_active } } })
      load()
    } catch (err) {
      setFormError(err.message)
    }
  }

  const confirmDelete = async () => {
    setConfirmOpen(false)
    try {
      const { data: r } = await client.mutate({ mutation: DELETE_RT, variables: { id: deletingId } })
      if (!r?.deleteRoomType?.success) throw new Error(r?.deleteRoomType?.userErrors?.[0]?.message)
      showSuccess('Deleted.')
      load()
    } catch (err) {
      setFormError(err.message)
    }
    setDeletingId(null)
  }

  if (loading)
    return (
      <Box display="flex" justifyContent="center" py={6}>
        <CircularProgress />
      </Box>
    )

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Room Types
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Define room categories used when creating clinic rooms
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
            reset()
            setShowForm((p) => !p)
          }}
        >
          Add Room Type
        </Button>
      </Stack>

      {isMockMode && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Offline — showing demo room types. Changes will not persist until backend is available.
        </Alert>
      )}
      {successMsg && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {successMsg}
        </Alert>
      )}
      {formError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setFormError(null)}>
          {formError}
        </Alert>
      )}

      {showForm && (
        <Card sx={{ mb: 3, p: 2 }}>
          <Typography variant="h6" fontWeight={600} mb={2}>
            {editItem ? 'Edit Room Type' : 'New Room Type'}
          </Typography>
          <Box component="form" onSubmit={handleSubmit}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  required
                  size="small"
                  label="Name"
                  value={form.name}
                  onChange={(e) => setField('name', e.target.value)}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  size="small"
                  label="Description"
                  multiline
                  rows={2}
                  value={form.description}
                  onChange={(e) => setField('description', e.target.value)}
                />
              </Grid>
              <Grid item xs={12}>
                <Stack direction="row" spacing={1}>
                  <Button type="submit" variant="contained" disabled={submitting}>
                    {editItem ? 'Update' : 'Create'}
                  </Button>
                  <Button variant="outlined" onClick={reset}>
                    Cancel
                  </Button>
                </Stack>
              </Grid>
            </Grid>
          </Box>
        </Card>
      )}

      <Card>
        <Box sx={{ overflowX: 'auto' }}>
          <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse' }}>
            <Box component="thead">
              <Box component="tr" sx={{ bgcolor: 'grey.50' }}>
                {['Name', 'Description', 'Status', 'Actions'].map((h) => (
                  <Box
                    key={h}
                    component="th"
                    sx={{
                      px: 2,
                      py: 1.5,
                      textAlign: 'left',
                      typography: 'caption',
                      fontWeight: 700,
                      color: 'text.secondary',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                    }}
                  >
                    {h}
                  </Box>
                ))}
              </Box>
            </Box>
            <Box component="tbody">
              {types.length === 0 && (
                <Box component="tr">
                  <Box component="td" colSpan={4} sx={{ textAlign: 'center', py: 6 }}>
                    <MeetingRoomIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1, display: 'block', mx: 'auto' }} />
                    <Typography color="text.secondary">No room types yet</Typography>
                  </Box>
                </Box>
              )}
              {types.map((item) => (
                <Box
                  component="tr"
                  key={item.id}
                  sx={{ '&:hover': { bgcolor: 'grey.50' }, borderBottom: '1px solid', borderColor: 'divider' }}
                >
                  <Box component="td" sx={{ px: 2, py: 1.5 }}>
                    <Typography fontWeight={600}>{item.name}</Typography>
                  </Box>
                  <Box component="td" sx={{ px: 2, py: 1.5 }}>
                    <Typography variant="body2" color="text.secondary">
                      {item.description || '—'}
                    </Typography>
                  </Box>
                  <Box component="td" sx={{ px: 2, py: 1.5 }}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Switch size="small" checked={!!item.is_active} onChange={() => handleToggle(item)} />
                      <Chip label={item.is_active ? 'Active' : 'Inactive'} size="small" color={item.is_active ? 'success' : 'default'} />
                    </Stack>
                  </Box>
                  <Box component="td" sx={{ px: 2, py: 1.5 }}>
                    <Stack direction="row" spacing={0.5}>
                      <Tooltip title="Edit">
                        <IconButton
                          size="small"
                          aria-label={`Edit ${item.name}`}
                          onClick={() => {
                            setEditItem(item)
                            setForm({ name: item.name, description: item.description || '', is_active: item.is_active })
                            setShowForm(true)
                          }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton
                          size="small"
                          color="error"
                          aria-label={`Delete ${item.name}`}
                          onClick={() => {
                            setDeletingId(item.id)
                            setConfirmOpen(true)
                          }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
      </Card>

      <ConfirmDialog
        isOpen={confirmOpen}
        title="Delete Room Type"
        message="Delete this room type? This may affect rooms using it."
        onConfirm={confirmDelete}
        onCancel={() => {
          setConfirmOpen(false)
          setDeletingId(null)
        }}
      />
    </Box>
  )
}
