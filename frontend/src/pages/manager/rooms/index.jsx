import { useState, useEffect, useCallback } from 'react'
import { useApolloClient, gql } from '@apollo/client'
import {
  Alert, Box, Button, Card, CardContent, Chip, CircularProgress,
  FormControl, Grid, IconButton, InputLabel, MenuItem,
  Select, Stack, TextField, Typography, Tooltip,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom'
import PaginationBar from '../../../components/PaginationBar/PaginationBar'
import ConfirmDialog from '../../../components/ConfirmDialog/ConfirmDialog'
import { usePagination } from '../../../hooks/usePagination'
import ErrorBoundary from '../../../components/ErrorBoundary'

// ─── GraphQL ─────────────────────────────────────────────────────────────────

const GET_ROOMS_PAGINATED = gql`
  query GetRoomsPaginated($search: SearchInput) {
    roomsPaginated(search: $search) {
      data {
        id room_number room_type roomTypeName clinician_type clinicianTypeName is_active
        clinic { id name }
      }
      pageInfo { total limit offset hasNextPage hasPreviousPage }
    }
  }
`
const GET_METADATA = gql`
  query GetRoomsMetadata {
    clinics          { id name }
    clinicianTypes   { id name }
    roomTypes        { id name }
  }
`
// Rewired to the canonical RoomInput/direct-return shape that
// rooms/create.jsx and rooms/edit.jsx already use successfully — this
// page's own CreateRoomInput/UpdateRoomInput/{success,userErrors,room}
// wrapper never existed on the backend (context/frontend-integration-audit.md
// #20); room_type/clinician_type were added to the real RoomInput instead of
// inventing a second contract for the same mutation names.
const CREATE_ROOM = gql`
  mutation CreateRoom($input: RoomInput!) {
    createRoom(input: $input) { id }
  }
`
const UPDATE_ROOM = gql`
  mutation UpdateRoom($id: ID!, $input: RoomInput!) {
    updateRoom(id: $id, input: $input) { id }
  }
`
const DELETE_ROOM = gql`
  mutation DeleteRoom($id: ID!) {
    deleteRoom(id: $id) { success userErrors { message } }
  }
`

// ─── Mock data (offline fallback) ──────────────────────────────────────────

const MOCK_ROOMS = [
  { id: 'rm-1', room_number: '101', room_type: 'rt-1', roomTypeName: 'Consultation', clinician_type: 'ct-1', clinicianTypeName: 'GP', is_active: true,  clinic: { id: 'cl-1', name: 'London Central Clinic' } },
  { id: 'rm-2', room_number: '102', room_type: 'rt-1', roomTypeName: 'Consultation', clinician_type: 'ct-1', clinicianTypeName: 'GP', is_active: true,  clinic: { id: 'cl-1', name: 'London Central Clinic' } },
  { id: 'rm-3', room_number: '201', room_type: 'rt-2', roomTypeName: 'Therapy',      clinician_type: 'ct-2', clinicianTypeName: 'Therapist', is_active: false, clinic: { id: 'cl-2', name: 'Midlands Health Hub'   } },
]
const MOCK_METADATA = {
  clinics:        [{ id: 'cl-1', name: 'London Central Clinic' }, { id: 'cl-2', name: 'Midlands Health Hub' }],
  roomTypes:      [{ id: 'rt-1', name: 'Consultation' }, { id: 'rt-2', name: 'Therapy' }],
  clinicianTypes: [{ id: 'ct-1', name: 'GP' }, { id: 'ct-2', name: 'Therapist' }],
}

// ─── Default form ─────────────────────────────────────────────────────────────

const defaultForm = { clinicId: '', roomNumber: '', roomType: '', clinicianType: '' }

// ─── Component ────────────────────────────────────────────────────────────────

function ManagerRooms() {
  const client = useApolloClient()

  const [metadata, setMetadata]       = useState({ clinics: [], clinicianTypes: [], roomTypes: [] })
  const [showForm, setShowForm]       = useState(false)
  const [editingRoom, setEditingRoom] = useState(null)
  const [form, setForm]               = useState(defaultForm)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deletingId, setDeletingId]   = useState(null)
  const [formError, setFormError]     = useState(null)
  const [successMsg, setSuccessMsg]   = useState(null)
  const [submitting, setSubmitting]   = useState(false)

  // ── Pagination hook ──
  const fetchFn = useCallback(async ({ search, limit, offset }) => {
    try {
      const { data } = await client.query({
        query: GET_ROOMS_PAGINATED,
        variables: { search: { search, limit, offset } },
        fetchPolicy: 'network-only',
      })
      return data?.roomsPaginated
    } catch {
      // Mock fallback when backend offline
      const filtered = MOCK_ROOMS.filter(r =>
        !search || r.room_number.toLowerCase().includes(search.toLowerCase()) ||
        r.roomTypeName.toLowerCase().includes(search.toLowerCase())
      )
      return { data: filtered, pageInfo: { total: filtered.length, limit, offset, hasNextPage: false, hasPreviousPage: false } }
    }
  }, [client])

  const { data: rooms, pagination, searchTerm, loading, handleSearch, nextPage, previousPage, currentPage, totalPages, loadData } = usePagination(fetchFn)

  // Load metadata once
  useEffect(() => {
    client.query({ query: GET_METADATA }).then(({ data }) => {
      setMetadata({
        clinics:        data?.clinics        || [],
        clinicianTypes: data?.clinicianTypes || [],
        roomTypes:      data?.roomTypes      || [],
      })
      setForm(prev => ({
        ...prev,
        roomType:      data?.roomTypes?.[0]?.id      || '',
        clinicianType: data?.clinicianTypes?.[0]?.id || '',
      }))
    }).catch(() => {
      // Mock metadata fallback
      setMetadata(MOCK_METADATA)
      setForm(prev => ({ ...prev, roomType: MOCK_METADATA.roomTypes[0].id, clinicianType: MOCK_METADATA.clinicianTypes[0].id }))
    })
    loadData(0)
  }, []) // eslint-disable-line

  const showSuccess = (msg) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(null), 3000) }
  const setField = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const resetForm = () => {
    setForm({
      ...defaultForm,
      roomType:      metadata.roomTypes?.[0]?.id      || '',
      clinicianType: metadata.clinicianTypes?.[0]?.id || '',
    })
    setEditingRoom(null)
    setShowForm(false)
    setFormError(null)
  }

  const handleEdit = (room) => {
    setEditingRoom(room)
    const r = room
    setForm({
      clinicId:      r.clinic?.id || '',
      roomNumber:    r.room_number || '',
      roomType:      r.room_type   || '',
      clinicianType: r.clinician_type || '',
    })
    setShowForm(true)
    setFormError(null)
  }

  // form's own field names (clinicId/roomNumber/roomType/clinicianType) stay
  // as local UI state — only the wire payload maps onto the real RoomInput
  // shape (name/clinic_id/room_type/clinician_type), avoiding an otherwise
  // unnecessary rename of every field binding below.
  const toRoomInput = (f) => ({
    name: f.roomNumber,
    clinic_id: f.clinicId,
    room_type: f.roomType || undefined,
    clinician_type: f.clinicianType || undefined,
  })

  const handleSubmit = async (e) => {
    e.preventDefault(); setSubmitting(true); setFormError(null)
    try {
      if (editingRoom) {
        await client.mutate({ mutation: UPDATE_ROOM, variables: { id: editingRoom.id, input: toRoomInput(form) } })
        showSuccess('Room updated.')
      } else {
        await client.mutate({ mutation: CREATE_ROOM, variables: { input: toRoomInput(form) } })
        showSuccess('Room created.')
      }
      resetForm(); loadData(0)
    } catch (err) { setFormError(err.message) }
    finally { setSubmitting(false) }
  }

  const handleDelete = (id) => { setDeletingId(id); setConfirmOpen(true) }
  const confirmDelete = async () => {
    setConfirmOpen(false)
    try {
      const { data: res } = await client.mutate({ mutation: DELETE_ROOM, variables: { id: deletingId } })
      if (!res?.deleteRoom?.success) { setFormError(res?.deleteRoom?.userErrors?.[0]?.message || 'Delete failed'); return }
      showSuccess('Room deleted.'); loadData(0)
    } catch (err) { setFormError(err.message) }
    setDeletingId(null)
  }

  return (
    <Box>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Rooms</Typography>
          <Typography variant="body2" color="text.secondary">Manage clinic rooms and their types</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => { resetForm(); setShowForm(p => !p) }}>
          Add Room
        </Button>
      </Stack>

      {successMsg && <Alert severity="success" sx={{ mb: 2 }}>{successMsg}</Alert>}
      {formError   && <Alert severity="error"   sx={{ mb: 2 }} onClose={() => setFormError(null)}>{formError}</Alert>}

      {/* ── Form ── */}
      {showForm && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" fontWeight={600} mb={2}>{editingRoom ? 'Edit Room' : 'New Room'}</Typography>
            <Box component="form" onSubmit={handleSubmit}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth required size="small">
                    <InputLabel>Clinic</InputLabel>
                    <Select label="Clinic" value={form.clinicId} onChange={e => setField('clinicId', e.target.value)}>
                      <MenuItem value="">Select clinic</MenuItem>
                      {metadata.clinics.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField fullWidth required size="small" label="Room Number"
                    value={form.roomNumber} onChange={e => setField('roomNumber', e.target.value)} />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth required size="small">
                    <InputLabel>Room Type</InputLabel>
                    <Select label="Room Type" value={form.roomType} onChange={e => setField('roomType', e.target.value)}>
                      <MenuItem value="">Select room type</MenuItem>
                      {metadata.roomTypes.map(t => <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth required size="small">
                    <InputLabel>Clinician Type</InputLabel>
                    <Select label="Clinician Type" value={form.clinicianType} onChange={e => setField('clinicianType', e.target.value)}>
                      <MenuItem value="">Select clinician type</MenuItem>
                      {metadata.clinicianTypes.map(t => <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12}>
                  <Stack direction="row" spacing={1}>
                    <Button type="submit" variant="contained" disabled={submitting}>
                      {submitting ? 'Saving…' : editingRoom ? 'Update' : 'Create'}
                    </Button>
                    <Button variant="outlined" onClick={resetForm}>Cancel</Button>
                  </Stack>
                </Grid>
              </Grid>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* ── Search + Pagination bar ── */}
      {!loading && (
        <PaginationBar
          searchTerm={searchTerm}
          onSearchChange={handleSearch}
          searchPlaceholder="Search rooms…"
          currentPage={currentPage}
          totalPages={totalPages}
          total={pagination.total}
          limit={pagination.limit}
          offset={pagination.offset}
          onPreviousPage={previousPage}
          onNextPage={nextPage}
          loading={loading}
        />
      )}

      {/* ── Grid ── */}
      {loading ? (
        <Box display="flex" justifyContent="center" py={6}><CircularProgress /></Box>
      ) : (
        <Grid container spacing={2} mt={0.5}>
          {rooms.length === 0 && (
            <Grid item xs={12}>
              <Card>
                <CardContent sx={{ textAlign: 'center', py: 6 }}>
                  <MeetingRoomIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                  <Typography color="text.secondary">No rooms found. Try adjusting your search.</Typography>
                </CardContent>
              </Card>
            </Grid>
          )}
          {rooms.map(room => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={room.id}>
              <Card sx={{ height: '100%', '&:hover': { boxShadow: 4 }, transition: 'box-shadow 0.2s' }}>
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1}>
                    <Box sx={{ bgcolor: 'success.50', borderRadius: 1, p: 1 }}>
                      <MeetingRoomIcon color="success" />
                    </Box>
                    <Stack direction="row" spacing={0.5}>
                      {/* SUG-RM-003 FIX: aria-labels on card icon buttons */}
                      <Tooltip title="Edit">
                        <IconButton size="small" aria-label={`Edit room ${room.room_number}`} onClick={() => handleEdit(room)}><EditIcon fontSize="small" /></IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton size="small" color="error" aria-label={`Delete room ${room.room_number}`} onClick={() => handleDelete(room.id)}><DeleteIcon fontSize="small" /></IconButton>
                      </Tooltip>
                    </Stack>
                  </Stack>

                  {/* SUG-RM-002 FIX: noWrap + ellipsis prevents long room numbers overflowing card */}
                  <Typography variant="h6" fontWeight={700} noWrap sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>Room {room.room_number}</Typography>
                  <Typography variant="body2" color="text.secondary">{room.roomTypeName || room.room_type}</Typography>
                  <Typography variant="caption" color="text.secondary">{room.clinic?.name}</Typography>

                  <Box mt={1.5}>
                    <Chip
                      label={room.is_active ? 'Active' : 'Inactive'}
                      size="small"
                      color={room.is_active ? 'success' : 'error'}
                    />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <ConfirmDialog
        isOpen={confirmOpen}
        title="Delete Room"
        message="Delete this room permanently? This cannot be undone."
        onConfirm={confirmDelete}
        onCancel={() => { setConfirmOpen(false); setDeletingId(null) }}
      />
    </Box>
  )
}

// SUG-RM-005 FIX: ErrorBoundary wrapper for crash resilience
export default function ManagerRoomsWithBoundary() {
  return <ErrorBoundary><ManagerRooms /></ErrorBoundary>
}
