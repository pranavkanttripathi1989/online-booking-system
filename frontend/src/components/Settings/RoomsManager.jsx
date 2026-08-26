import { useState } from 'react'
import { useQuery, useMutation } from '@apollo/client'
import { useSnackbar } from 'notistack'
import { gql } from '@apollo/client'
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  FormControlLabel,
  IconButton,
  MenuItem,
  Paper,
  Skeleton,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import CheckIcon from '@mui/icons-material/Check'
import CloseIcon from '@mui/icons-material/Close'
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom'

import { ROOMS_QUERY, CLINICS_QUERY } from '../../graphql/queries'

// ─── Inline GQL ───────────────────────────────────────────────────────────────
const CREATE_ROOM_MUTATION = gql`
  mutation CreateRoom($input: RoomInput!) {
    createRoom(input: $input) {
      id
      name
      capacity
      is_active
      clinic {
        id
        name
      }
    }
  }
`
const UPDATE_ROOM_MUTATION = gql`
  mutation UpdateRoom($id: ID!, $input: RoomInput!) {
    updateRoom(id: $id, input: $input) {
      id
      name
      capacity
      is_active
    }
  }
`
const DELETE_ROOM_MUTATION = gql`
  mutation DeleteRoom($id: ID!) {
    deleteRoom(id: $id)
  }
`

// ─── Room row ─────────────────────────────────────────────────────────────────
function RoomRow({ room, onSave, onDelete }) {
  const [editing, setEditing] = useState(false)
  const [vals, setVals] = useState({ name: room.name, capacity: room.capacity ?? 1 })
  const set = (k) => (e) => setVals((v) => ({ ...v, [k]: e.target.value }))
  const handleSave = () => {
    onSave(room.id, vals)
    setEditing(false)
  }

  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={1.5}
      alignItems={{ sm: 'center' }}
      sx={{ py: 1.25, px: 2, borderRadius: 2, '&:hover': { bgcolor: 'action.hover' }, transition: '0.15s' }}
    >
      <MeetingRoomIcon sx={{ color: 'primary.light', flexShrink: 0 }} />

      {editing ? (
        <>
          <TextField size="small" value={vals.name} onChange={set('name')} label="Room name" sx={{ flex: 2 }} autoFocus />
          <TextField size="small" value={vals.capacity} onChange={set('capacity')} label="Capacity" type="number" sx={{ width: 100 }} />
          <Stack direction="row" spacing={0.5}>
            <IconButton size="small" color="primary" onClick={handleSave}>
              <CheckIcon fontSize="small" />
            </IconButton>
            <IconButton size="small" onClick={() => setEditing(false)}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Stack>
        </>
      ) : (
        <>
          <Box flex={2}>
            <Typography variant="body2" fontWeight={600}>
              {room.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Capacity: {room.capacity ?? 1}
            </Typography>
          </Box>
          <Chip
            label={room.is_active ? 'Available' : 'Unavailable'}
            color={room.is_active ? 'success' : 'default'}
            size="small"
            sx={{ fontWeight: 600, height: 22, fontSize: 11 }}
          />
          <Stack direction="row" spacing={0.25}>
            <Tooltip title="Edit">
              <IconButton size="small" onClick={() => setEditing(true)}>
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete">
              <IconButton size="small" color="error" onClick={() => onDelete(room.id)}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        </>
      )}
    </Stack>
  )
}

// ─── Add room inline ──────────────────────────────────────────────────────────
function AddRoomRow({ clinicId, onAdd, onCancel }) {
  const [vals, setVals] = useState({ name: '', capacity: 1 })
  const set = (k) => (e) => setVals((v) => ({ ...v, [k]: e.target.value }))
  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }} sx={{ py: 1.25, px: 2 }}>
      <TextField size="small" value={vals.name} onChange={set('name')} label="Room name *" autoFocus sx={{ flex: 2 }} />
      <TextField size="small" value={vals.capacity} onChange={set('capacity')} label="Capacity" type="number" sx={{ width: 100 }} />
      <Stack direction="row" spacing={0.5}>
        <IconButton size="small" color="primary" disabled={!vals.name} onClick={() => onAdd(vals)}>
          <CheckIcon fontSize="small" />
        </IconButton>
        <IconButton size="small" onClick={onCancel}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Stack>
    </Stack>
  )
}

// ─── RoomsManager ─────────────────────────────────────────────────────────────
export default function RoomsManager() {
  const { enqueueSnackbar } = useSnackbar()
  const [filterClinic, setFilterClinic] = useState('')
  const [adding, setAdding] = useState(false)

  const { data: clinicsData } = useQuery(CLINICS_QUERY)
  const { data, loading, refetch } = useQuery(ROOMS_QUERY, {
    variables: filterClinic ? { clinic_id: filterClinic } : {},
    fetchPolicy: 'cache-and-network',
  })

  const clinics = (clinicsData?.clinics ?? []).filter((c) => c.is_active)
  const rooms = data?.rooms ?? []

  const [createRoom] = useMutation(CREATE_ROOM_MUTATION, {
    onCompleted: () => {
      enqueueSnackbar('Room created', { variant: 'success' })
      refetch()
      setAdding(false)
    },
    onError: (e) => enqueueSnackbar(e.message, { variant: 'error' }),
  })
  const [updateRoom] = useMutation(UPDATE_ROOM_MUTATION, {
    onCompleted: () => enqueueSnackbar('Room updated', { variant: 'success' }),
    onError: (e) => enqueueSnackbar(e.message, { variant: 'error' }),
  })
  const [deleteRoom] = useMutation(DELETE_ROOM_MUTATION, {
    onCompleted: () => {
      enqueueSnackbar('Room deleted', { variant: 'info' })
      refetch()
    },
    onError: (e) => enqueueSnackbar(e.message, { variant: 'error' }),
  })

  const handleAdd = (vals) => {
    createRoom({
      variables: {
        input: {
          name: vals.name,
          capacity: Number(vals.capacity),
          clinic_id: filterClinic || clinics[0]?.id,
          is_active: true,
        },
      },
    })
  }
  const handleSave = (id, vals) => {
    updateRoom({ variables: { id, input: { name: vals.name, capacity: Number(vals.capacity) } } })
  }

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-end" mb={3}>
        <Box>
          <Typography variant="h6" fontWeight={800}>
            Rooms
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage consultation and treatment rooms per clinic.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setAdding(true)} sx={{ borderRadius: 2 }}>
          Add Room
        </Button>
      </Stack>

      {/* Clinic filter */}
      <TextField
        select
        size="small"
        label="Filter by Clinic"
        value={filterClinic}
        sx={{ mb: 3, minWidth: 220 }}
        onChange={(e) => setFilterClinic(e.target.value)}
      >
        <MenuItem value="">All Clinics</MenuItem>
        {clinics.map((c) => (
          <MenuItem key={c.id} value={c.id}>
            {c.name}
          </MenuItem>
        ))}
      </TextField>

      <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
        {loading ? (
          <Stack p={2} spacing={1}>
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} variant="rounded" height={52} sx={{ borderRadius: 1.5 }} />
            ))}
          </Stack>
        ) : rooms.length === 0 ? (
          <Box textAlign="center" py={6}>
            <MeetingRoomIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
            <Typography color="text.secondary">No rooms found.</Typography>
          </Box>
        ) : (
          rooms.map((room, idx) => (
            <Box key={room.id}>
              <RoomRow room={room} onSave={handleSave} onDelete={(id) => deleteRoom({ variables: { id } })} />
              {idx < rooms.length - 1 && <Divider sx={{ mx: 2 }} />}
            </Box>
          ))
        )}

        {adding && (
          <>
            <Divider />
            <AddRoomRow clinicId={filterClinic || clinics[0]?.id} onAdd={handleAdd} onCancel={() => setAdding(false)} />
          </>
        )}
      </Paper>
    </Box>
  )
}
