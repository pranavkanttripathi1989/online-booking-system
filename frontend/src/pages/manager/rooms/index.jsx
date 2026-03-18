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
const CREATE_ROOM = gql`
  mutation CreateRoom($input: CreateRoomInput!) {
    createRoom(input: $input) { success userErrors { message } room { id } }
  }
`
const UPDATE_ROOM = gql`
  mutation UpdateRoom($id: ID!, $input: UpdateRoomInput!) {
    updateRoom(id: $id, input: $input) { success userErrors { message } room { id } }
  }
`
const DELETE_ROOM = gql`
  mutation DeleteRoom($id: ID!) {
    deleteRoom(id: $id) { success userErrors { message } }
  }
`

// ─── Default form ─────────────────────────────────────────────────────────────

const defaultForm = { clinicId: '', roomNumber: '', roomType: '', clinicianType: '' }

// ─── Component ────────────────────────────────────────────────────────────────

export default function ManagerRooms() {
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
    const { data } = await client.query({
      query: GET_ROOMS_PAGINATED,
      variables: { search: { search, limit, offset } },
      fetchPolicy: 'network-only',
    })
    return data?.roomsPaginated
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

  const handleSubmit = async (e) => {
    e.preventDefault(); setSubmitting(true); setFormError(null)
    try {
      if (editingRoom) {
        const { data: res } = await client.mutate({ mutation: UPDATE_ROOM, variables: { id: editingRoom.id, input: form } })
        if (!res?.updateRoom?.success) { setFormError(res?.updateRoom?.userErrors?.[0]?.message || 'Update failed'); return }
        showSuccess('Room updated.')
      } else {
        const { data: res } = await client.mutate({ mutation: CREATE_ROOM, variables: { input: form } })
        if (!res?.createRoom?.success) { setFormError(res?.createRoom?.userErrors?.[0]?.message || 'Create failed'); return }
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
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => handleEdit(room)}><EditIcon fontSize="small" /></IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton size="small" color="error" onClick={() => handleDelete(room.id)}><DeleteIcon fontSize="small" /></IconButton>
                      </Tooltip>
                    </Stack>
                  </Stack>

                  <Typography variant="h6" fontWeight={700}>Room {room.room_number}</Typography>
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
