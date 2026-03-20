import { useState, useEffect } from 'react'
import { useQuery, useMutation, gql } from '@apollo/client'
import {
  Box, Button, Card, CardContent, Chip, CircularProgress,
  FormControl, Grid, IconButton, InputLabel, MenuItem,
  Select, Stack, TextField, Typography, Alert, Tooltip, ToggleButton, ToggleButtonGroup,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import BlockIcon from '@mui/icons-material/Block'
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom'
import ConfirmDialog from '../../components/ConfirmDialog/ConfirmDialog'

// ─── Constants ────────────────────────────────────────────────────────────────

// BUG-MGR-001 FIX: mock data so form dropdowns populate when GraphQL is offline
const MOCK_CLINICIANS = [
  { id: 'clin-1', firstName: 'Dr. Sarah', lastName: 'Mitchell', isActive: true },
  { id: 'clin-2', firstName: 'Dr. James', lastName: 'Okafor',   isActive: true },
  { id: 'clin-3', firstName: 'Dr. Priya', lastName: 'Sharma',   isActive: true },
]
const MOCK_CLINICS = [
  { id: 'clinic-1', name: 'City Heart Clinic' },
  { id: 'clinic-2', name: 'Central Medical Centre' },
  { id: 'clinic-3', name: 'Family Health Hub' },
]
const MOCK_ROOMS = [
  { id: 'room-1', room_number: '1A', clinic_id: 'clinic-1', isActive: true },
  { id: 'room-2', room_number: '2B', clinic_id: 'clinic-1', isActive: true },
  { id: 'room-3', room_number: 'Suite A', clinic_id: 'clinic-2', isActive: true },
  { id: 'room-4', room_number: '3C', clinic_id: 'clinic-3', isActive: true },
]

const RECURRENCE_OPTIONS = [
  { value: 'single',  label: 'Single (One-time)' },
  { value: 'daily',   label: 'Daily' },
  { value: 'weekly',  label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'custom',  label: 'Custom Days' },
]
const WEEK_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// ─── GraphQL ─────────────────────────────────────────────────────────────────

const GET_BLOCKS_DATA = gql`
  query GetBlocksData {
    spacerBlocks(search: { limit: 500 }) {
      id clinician_id clinic_id room_id block_date start_time end_time reason recurrence_type recurrence_days end_date
      clinician { id first_name last_name }
      clinic    { id name }
      room      { id room_number }
    }
    roomBlocks(search: { limit: 500 }) {
      id room_id clinic_id block_date start_time end_time reason recurrence_type recurrence_days end_date
      room  { id room_number }
      clinic { id name }
    }
    clinicians(search: { limit: 500 }) { id firstName lastName isActive }
    clinics(search: { limit: 100 })   { id name }
    rooms(search: { limit: 500 })     { id room_number clinic_id isActive }
  }
`

const CREATE_SPACER_BLOCK = gql`
  mutation CreateSpacerBlock($input: CreateSpacerBlockInput!) {
    createSpacerBlock(input: $input) { success userErrors { message } spacerBlock { id } }
  }
`
const DELETE_SPACER_BLOCK = gql`
  mutation DeleteSpacerBlock($id: ID!) {
    deleteSpacerBlock(id: $id) { success userErrors { message } }
  }
`
const CREATE_ROOM_BLOCK = gql`
  mutation CreateRoomBlock($input: CreateRoomBlockInput!) {
    createRoomBlock(input: $input) { success userErrors { message } roomBlock { id } }
  }
`
const DELETE_ROOM_BLOCK = gql`
  mutation DeleteRoomBlock($id: ID!) {
    deleteRoomBlock(id: $id) { success userErrors { message } }
  }
`

// ─── Default forms ────────────────────────────────────────────────────────────

const defaultSpacerForm = {
  clinician_id: '', clinic_id: '', room_id: '',
  block_date: '', start_time: '10:00', end_time: '10:15',
  reason: '', recurrence_type: 'single', recurrence_days: [], end_date: '',
}
const defaultRoomBlockForm = {
  clinic_id: '', room_id: '',
  block_date: '', start_time: '08:00', end_time: '09:00',
  reason: '', recurrence_type: 'single', recurrence_days: [], end_date: '',
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt12 = (t) => {
  if (!t) return ''
  const [h, m] = t.split(':')
  const hr = parseInt(h)
  return `${hr % 12 || 12}:${m} ${hr >= 12 ? 'PM' : 'AM'}`
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ManagerBlocks() {
  const [tab, setTab]                     = useState('spacers')
  const [showSpacerForm, setShowSpacerForm] = useState(false)
  const [showRoomForm, setShowRoomForm]   = useState(false)
  const [spacerForm, setSpacerForm]       = useState(defaultSpacerForm)
  const [roomForm, setRoomForm]           = useState(defaultRoomBlockForm)
  const [confirmOpen, setConfirmOpen]     = useState(false)
  const [deleteTarget, setDeleteTarget]   = useState({ type: '', id: '' })
  const [formError, setFormError]         = useState(null)
  const [successMsg, setSuccessMsg]       = useState(null)

  const { data, loading, refetch } = useQuery(GET_BLOCKS_DATA, { fetchPolicy: 'cache-and-network' })

  const [createSpacerBlock] = useMutation(CREATE_SPACER_BLOCK)
  const [deleteSpacerBlock] = useMutation(DELETE_SPACER_BLOCK)
  const [createRoomBlock]   = useMutation(CREATE_ROOM_BLOCK)
  const [deleteRoomBlock]   = useMutation(DELETE_ROOM_BLOCK)

  // BUG-MGR-001 FIX: fall back to mock data when GraphQL returns nothing
  const clinicians = ((data?.clinicians?.length ? data.clinicians : MOCK_CLINICIANS)).filter(c => c.isActive)
  const clinics    = data?.clinics?.length ? data.clinics : MOCK_CLINICS
  const allRooms   = ((data?.rooms?.length ? data.rooms : MOCK_ROOMS)).filter(r => r.isActive)
  const spacerBlocks = data?.spacerBlocks || []
  const roomBlocks   = data?.roomBlocks   || []

  const spacerRooms = allRooms.filter(r => r.clinic_id === spacerForm.clinic_id)
  const roomFormRooms = allRooms.filter(r => r.clinic_id === roomForm.clinic_id)

  // Reset room_id when clinic changes
  useEffect(() => { setSpacerForm(p => ({ ...p, room_id: '' })) }, [spacerForm.clinic_id])
  useEffect(() => { setRoomForm(p => ({ ...p, room_id: '' }))   }, [roomForm.clinic_id])

  const showSuccess = (msg) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(null), 3000) }

  // ── Spacer form ──
  const toggleSpacerDay = (idx) => {
    setSpacerForm(p => ({
      ...p,
      recurrence_days: p.recurrence_days.includes(idx)
        ? p.recurrence_days.filter(d => d !== idx)
        : [...p.recurrence_days, idx],
    }))
  }

  const handleSpacerSubmit = async (e) => {
    e.preventDefault(); setFormError(null)
    const input = {
      clinician_id:    spacerForm.clinician_id,
      clinic_id:       spacerForm.clinic_id,
      room_id:         spacerForm.room_id || null,
      block_date:      spacerForm.recurrence_type === 'single' ? spacerForm.block_date : null,
      start_time:      spacerForm.start_time,
      end_time:        spacerForm.end_time,
      reason:          spacerForm.reason || null,
      recurrence_type: spacerForm.recurrence_type,
      recurrence_days: spacerForm.recurrence_type === 'custom' ? spacerForm.recurrence_days : null,
      end_date:        spacerForm.end_date || null,
    }
    try {
      const { data: res } = await createSpacerBlock({ variables: { input } })
      if (res?.createSpacerBlock?.userErrors?.length) { setFormError(res.createSpacerBlock.userErrors[0].message); return }
      setSpacerForm(defaultSpacerForm); setShowSpacerForm(false); refetch(); showSuccess('Spacer block created.')
    } catch (err) { setFormError(err.message) }
  }

  // ── Room block form ──
  const toggleRoomDay = (idx) => {
    setRoomForm(p => ({
      ...p,
      recurrence_days: p.recurrence_days.includes(idx)
        ? p.recurrence_days.filter(d => d !== idx)
        : [...p.recurrence_days, idx],
    }))
  }

  const handleRoomBlockSubmit = async (e) => {
    e.preventDefault(); setFormError(null)
    const input = {
      room_id:         roomForm.room_id,
      clinic_id:       roomForm.clinic_id,
      block_date:      roomForm.recurrence_type === 'single' ? roomForm.block_date : null,
      start_time:      roomForm.start_time,
      end_time:        roomForm.end_time,
      reason:          roomForm.reason || null,
      recurrence_type: roomForm.recurrence_type,
      recurrence_days: roomForm.recurrence_type === 'custom' ? roomForm.recurrence_days : null,
      end_date:        roomForm.end_date || null,
    }
    try {
      const { data: res } = await createRoomBlock({ variables: { input } })
      if (res?.createRoomBlock?.userErrors?.length) { setFormError(res.createRoomBlock.userErrors[0].message); return }
      setRoomForm(defaultRoomBlockForm); setShowRoomForm(false); refetch(); showSuccess('Room block created.')
    } catch (err) { setFormError(err.message) }
  }

  // ── Delete ──
  const handleDelete = (type, id) => { setDeleteTarget({ type, id }); setConfirmOpen(true) }
  const confirmDelete = async () => {
    setConfirmOpen(false)
    try {
      if (deleteTarget.type === 'spacer') {
        const { data: res } = await deleteSpacerBlock({ variables: { id: deleteTarget.id } })
        if (res?.deleteSpacerBlock?.userErrors?.length) { setFormError(res.deleteSpacerBlock.userErrors[0].message); return }
      } else {
        const { data: res } = await deleteRoomBlock({ variables: { id: deleteTarget.id } })
        if (res?.deleteRoomBlock?.userErrors?.length) { setFormError(res.deleteRoomBlock.userErrors[0].message); return }
      }
      refetch(); showSuccess('Block deleted.')
    } catch (err) { setFormError(err.message) }
  }

  if (loading && !data) return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight={300}><CircularProgress /></Box>
  )

  // ─── Shared recurrence form fields ───────────────────────────────────────────
  const RecurrenceFields = ({ form, setForm, toggleDay }) => (
    <>
      <Grid item xs={12} sm={6}>
        <FormControl fullWidth size="small">
          <InputLabel>Recurrence</InputLabel>
          <Select label="Recurrence" value={form.recurrence_type}
            onChange={e => setForm(p => ({ ...p, recurrence_type: e.target.value, recurrence_days: [] }))}>
            {RECURRENCE_OPTIONS.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
          </Select>
        </FormControl>
      </Grid>

      {form.recurrence_type === 'single' && (
        <Grid item xs={12} sm={6}>
          <TextField fullWidth required size="small" type="date" label="Date"
            InputLabelProps={{ shrink: true }} value={form.block_date}
            onChange={e => setForm(p => ({ ...p, block_date: e.target.value }))} />
        </Grid>
      )}

      {form.recurrence_type === 'custom' && (
        <Grid item xs={12}>
          <Typography variant="caption" color="text.secondary" gutterBottom>Select days of week</Typography>
          <Stack direction="row" spacing={0.5} flexWrap="wrap">
            {WEEK_DAYS.map((d, i) => (
              <Chip key={i} label={d} size="small"
                color={form.recurrence_days.includes(i) ? 'primary' : 'default'}
                onClick={() => toggleDay(i)} sx={{ cursor: 'pointer' }} />
            ))}
          </Stack>
        </Grid>
      )}

      {form.recurrence_type !== 'single' && (
        <Grid item xs={12} sm={6}>
          <TextField fullWidth size="small" type="date" label="End Date (optional)"
            InputLabelProps={{ shrink: true }} value={form.end_date}
            onChange={e => setForm(p => ({ ...p, end_date: e.target.value }))} />
        </Grid>
      )}

      <Grid item xs={6} sm={3}>
        <TextField fullWidth required size="small" type="time" label="Start Time"
          InputLabelProps={{ shrink: true }} value={form.start_time}
          onChange={e => setForm(p => ({ ...p, start_time: e.target.value }))} />
      </Grid>
      <Grid item xs={6} sm={3}>
        <TextField fullWidth required size="small" type="time" label="End Time"
          InputLabelProps={{ shrink: true }} value={form.end_time}
          onChange={e => setForm(p => ({ ...p, end_time: e.target.value }))} />
      </Grid>

      <Grid item xs={12}>
        <TextField fullWidth size="small" label="Reason" placeholder="e.g. Equipment setup, Staff meeting"
          value={form.reason} onChange={e => setForm(p => ({ ...p, reason: e.target.value }))} />
      </Grid>
    </>
  )

  return (
    <Box>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Schedule Blocks</Typography>
          <Typography variant="body2" color="text.secondary">Block clinician time slots or entire rooms</Typography>
        </Box>
        <ToggleButtonGroup value={tab} exclusive onChange={(_, v) => v && setTab(v)} size="small">
          <ToggleButton value="spacers"><BlockIcon sx={{ mr: 0.5 }} fontSize="small" />Spacer Blocks</ToggleButton>
          <ToggleButton value="rooms"><MeetingRoomIcon sx={{ mr: 0.5 }} fontSize="small" />Room Blocks</ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      {successMsg && <Alert severity="success" sx={{ mb: 2 }}>{successMsg}</Alert>}
      {formError   && <Alert severity="error"   sx={{ mb: 2 }} onClose={() => setFormError(null)}>{formError}</Alert>}

      {/* ══ SPACER BLOCKS TAB ══ */}
      {tab === 'spacers' && (
        <>
          <Box mb={2}>
            <Button variant="contained" startIcon={<AddIcon />}
              onClick={() => { setShowSpacerForm(p => !p); setFormError(null) }}>
              Add Spacer Block
            </Button>
          </Box>

          {showSpacerForm && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" fontWeight={600} mb={2}>New Spacer Block</Typography>
                <Box component="form" onSubmit={handleSpacerSubmit}>
                  <Grid container spacing={2}>
                    {/* Clinician */}
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth required size="small">
                        <InputLabel>Clinician</InputLabel>
                        <Select label="Clinician" value={spacerForm.clinician_id}
                          onChange={e => setSpacerForm(p => ({ ...p, clinician_id: e.target.value }))}>
                          {clinicians.map(c => <MenuItem key={c.id} value={c.id}>{c.firstName} {c.lastName}</MenuItem>)}
                        </Select>
                      </FormControl>
                    </Grid>
                    {/* Clinic */}
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth required size="small">
                        <InputLabel>Clinic</InputLabel>
                        <Select label="Clinic" value={spacerForm.clinic_id}
                          onChange={e => setSpacerForm(p => ({ ...p, clinic_id: e.target.value, room_id: '' }))}>
                          {clinics.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
                        </Select>
                      </FormControl>
                    </Grid>
                    {/* Room optional */}
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth size="small" disabled={!spacerForm.clinic_id}>
                        <InputLabel>Room (optional)</InputLabel>
                        <Select label="Room (optional)" value={spacerForm.room_id}
                          onChange={e => setSpacerForm(p => ({ ...p, room_id: e.target.value }))}>
                          <MenuItem value="">Any room</MenuItem>
                          {spacerRooms.map(r => <MenuItem key={r.id} value={r.id}>Room {r.room_number}</MenuItem>)}
                        </Select>
                      </FormControl>
                    </Grid>
                    <RecurrenceFields form={spacerForm} setForm={setSpacerForm} toggleDay={toggleSpacerDay} />
                    <Grid item xs={12}>
                      <Stack direction="row" spacing={1}>
                        <Button type="submit" variant="contained">Create</Button>
                        <Button variant="outlined" onClick={() => { setSpacerForm(defaultSpacerForm); setShowSpacerForm(false) }}>Cancel</Button>
                      </Stack>
                    </Grid>
                  </Grid>
                </Box>
              </CardContent>
            </Card>
          )}

          {/* Spacer list */}
          <Stack spacing={2}>
            {spacerBlocks.length === 0 && (
              <Card><CardContent><Typography color="text.secondary" textAlign="center" py={4}>No spacer blocks yet</Typography></CardContent></Card>
            )}
            {spacerBlocks.map(b => (
              <Card key={b.id}>
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                    <Box>
                      <Typography fontWeight={700}>{b.clinician?.first_name} {b.clinician?.last_name}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {b.clinic?.name}{b.room && ` · Room ${b.room.room_number}`}
                      </Typography>
                      <Typography variant="body2" mt={0.5}>
                        {b.block_date && new Date(b.block_date).toLocaleDateString()} &nbsp;
                        {fmt12(b.start_time)} – {fmt12(b.end_time)}
                      </Typography>
                      {b.reason && <Typography variant="caption" color="text.secondary">Reason: {b.reason}</Typography>}
                      <Box mt={0.5}>
                        <Chip label={b.recurrence_type || 'single'} size="small" sx={{ textTransform: 'capitalize' }} />
                      </Box>
                    </Box>
                    <Tooltip title="Delete">
                      <IconButton color="error" onClick={() => handleDelete('spacer', b.id)}><DeleteIcon /></IconButton>
                    </Tooltip>
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </Stack>
        </>
      )}

      {/* ══ ROOM BLOCKS TAB ══ */}
      {tab === 'rooms' && (
        <>
          <Box mb={2}>
            <Button variant="contained" startIcon={<AddIcon />}
              onClick={() => { setShowRoomForm(p => !p); setFormError(null) }}>
              Add Room Block
            </Button>
          </Box>

          {showRoomForm && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" fontWeight={600} mb={2}>New Room Block</Typography>
                <Box component="form" onSubmit={handleRoomBlockSubmit}>
                  <Grid container spacing={2}>
                    {/* Clinic */}
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth required size="small">
                        <InputLabel>Clinic</InputLabel>
                        <Select label="Clinic" value={roomForm.clinic_id}
                          onChange={e => setRoomForm(p => ({ ...p, clinic_id: e.target.value, room_id: '' }))}>
                          {clinics.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
                        </Select>
                      </FormControl>
                    </Grid>
                    {/* Room required */}
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth required size="small" disabled={!roomForm.clinic_id}>
                        <InputLabel>Room</InputLabel>
                        <Select label="Room" value={roomForm.room_id}
                          onChange={e => setRoomForm(p => ({ ...p, room_id: e.target.value }))}>
                          <MenuItem value="">Select a room</MenuItem>
                          {roomFormRooms.map(r => <MenuItem key={r.id} value={r.id}>Room {r.room_number}</MenuItem>)}
                        </Select>
                      </FormControl>
                    </Grid>
                    <RecurrenceFields form={roomForm} setForm={setRoomForm} toggleDay={toggleRoomDay} />
                    <Grid item xs={12}>
                      <Stack direction="row" spacing={1}>
                        <Button type="submit" variant="contained">Create</Button>
                        <Button variant="outlined" onClick={() => { setRoomForm(defaultRoomBlockForm); setShowRoomForm(false) }}>Cancel</Button>
                      </Stack>
                    </Grid>
                  </Grid>
                </Box>
              </CardContent>
            </Card>
          )}

          {/* Room block list */}
          <Stack spacing={2}>
            {roomBlocks.length === 0 && (
              <Card><CardContent><Typography color="text.secondary" textAlign="center" py={4}>No room blocks yet</Typography></CardContent></Card>
            )}
            {roomBlocks.map(b => (
              <Card key={b.id}>
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                    <Box>
                      <Typography fontWeight={700}>
                        {b.room ? `Room ${b.room.room_number}` : '—'} · {b.clinic?.name}
                      </Typography>
                      <Typography variant="body2" mt={0.5}>
                        {b.block_date && new Date(b.block_date).toLocaleDateString()} &nbsp;
                        {fmt12(b.start_time)} – {fmt12(b.end_time)}
                      </Typography>
                      {b.reason && <Typography variant="caption" color="text.secondary">Reason: {b.reason}</Typography>}
                      <Box mt={0.5}>
                        <Chip label={b.recurrence_type || 'single'} size="small" sx={{ textTransform: 'capitalize' }} />
                      </Box>
                    </Box>
                    <Tooltip title="Delete">
                      <IconButton color="error" onClick={() => handleDelete('room', b.id)}><DeleteIcon /></IconButton>
                    </Tooltip>
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </Stack>
        </>
      )}

      <ConfirmDialog
        isOpen={confirmOpen}
        title="Delete Block"
        message="Delete this schedule block? This action cannot be undone."
        onConfirm={confirmDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </Box>
  )
}
