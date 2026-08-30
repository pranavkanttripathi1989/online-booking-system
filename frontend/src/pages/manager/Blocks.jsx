import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, gql } from '@apollo/client'
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
  Alert,
  Tooltip,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import BlockIcon from '@mui/icons-material/Block'
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom'
import ConfirmDialog from '../../components/ConfirmDialog/ConfirmDialog'
import ErrorBoundary from '../../components/ErrorBoundary'

// ─── Mock constants (used when GraphQL backend is offline) ───────────────────

const MOCK_CLINICIANS = [
  { id: 'cln-1', first_name: 'Dr. Sarah', last_name: 'Mitchell', is_active: true },
  { id: 'cln-2', first_name: 'Dr. James', last_name: 'Okafor', is_active: true },
  { id: 'cln-3', first_name: 'Dr. Priya', last_name: 'Sharma', is_active: true },
]
const MOCK_CLINICS = [
  { id: 'cli-1', name: 'City Heart Clinic' },
  { id: 'cli-2', name: 'Central Medical Centre' },
  { id: 'cli-3', name: 'Family Health Hub' },
]
const MOCK_ROOMS = [
  { id: 'room-1', room_number: '1A', clinic_id: 'cli-1', is_active: true },
  { id: 'room-2', room_number: '2B', clinic_id: 'cli-1', is_active: true },
  { id: 'room-3', room_number: 'Suite A', clinic_id: 'cli-2', is_active: true },
  { id: 'room-4', room_number: '3C', clinic_id: 'cli-3', is_active: true },
]

// FIX GAP-BLK-005 — Mock spacer + room block records for offline testing
// These cover: with/without room, with/without reason, all recurrence types, 12hr display
const MOCK_SPACER_BLOCKS = [
  {
    id: 'sb-001',
    clinician: { id: 'cln-1', first_name: 'Dr. Sarah', last_name: 'Mitchell' },
    clinic: { id: 'cli-1', name: 'City Heart Clinic' },
    room: { id: 'room-1', room_number: '1A' },
    block_date: '2026-03-30',
    start_time: '10:00',
    end_time: '10:30',
    reason: 'Equipment setup',
    recurrence_type: 'single',
    recurrence_days: null,
    end_date: null,
  },
  {
    id: 'sb-002',
    clinician: { id: 'cln-2', first_name: 'Dr. James', last_name: 'Okafor' },
    clinic: { id: 'cli-1', name: 'City Heart Clinic' },
    room: null,
    block_date: null,
    start_time: '08:00',
    end_time: '08:30',
    reason: 'Staff meeting',
    recurrence_type: 'daily',
    recurrence_days: null,
    end_date: '2026-04-30',
  },
  {
    id: 'sb-003',
    clinician: { id: 'cln-3', first_name: 'Dr. Priya', last_name: 'Sharma' },
    clinic: { id: 'cli-2', name: 'Central Medical Centre' },
    room: { id: 'room-3', room_number: 'Suite A' },
    block_date: null,
    start_time: '14:00',
    end_time: '14:15',
    reason: null,
    recurrence_type: 'weekly',
    recurrence_days: null,
    end_date: null,
  },
  {
    id: 'sb-004',
    clinician: { id: 'cln-1', first_name: 'Dr. Sarah', last_name: 'Mitchell' },
    clinic: { id: 'cli-3', name: 'Family Health Hub' },
    room: null,
    block_date: null,
    start_time: '09:00',
    end_time: '09:45',
    reason: 'Training session',
    recurrence_type: 'custom',
    recurrence_days: [1, 3, 5],
    end_date: '2026-06-30',
  },
  {
    id: 'sb-005',
    clinician: { id: 'cln-2', first_name: 'Dr. James', last_name: 'Okafor' },
    clinic: { id: 'cli-2', name: 'Central Medical Centre' },
    room: null,
    block_date: null,
    start_time: '16:00',
    end_time: '16:30',
    reason: 'Monthly audit',
    recurrence_type: 'monthly',
    recurrence_days: null,
    end_date: null,
  },
]

const MOCK_ROOM_BLOCKS = [
  {
    id: 'rb-001',
    room: { id: 'room-1', room_number: '1A' },
    clinic: { id: 'cli-1', name: 'City Heart Clinic' },
    block_date: '2026-03-31',
    start_time: '08:00',
    end_time: '12:00',
    reason: 'Deep cleaning',
    recurrence_type: 'single',
    recurrence_days: null,
    end_date: null,
  },
  {
    id: 'rb-002',
    room: { id: 'room-3', room_number: 'Suite A' },
    clinic: { id: 'cli-2', name: 'Central Medical Centre' },
    block_date: null,
    start_time: '07:00',
    end_time: '08:00',
    reason: 'Maintenance',
    recurrence_type: 'weekly',
    recurrence_days: null,
    end_date: '2026-05-31',
  },
  {
    id: 'rb-003',
    room: { id: 'room-4', room_number: '3C' },
    clinic: { id: 'cli-3', name: 'Family Health Hub' },
    block_date: null,
    start_time: '13:00',
    end_time: '14:00',
    reason: null,
    recurrence_type: 'daily',
    recurrence_days: null,
    end_date: null,
  },
]

const RECURRENCE_OPTIONS = [
  { value: 'single', label: 'Single (One-time)' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'custom', label: 'Custom Days' },
]
const WEEK_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const REASON_MAX = 500

// ─── GraphQL ─────────────────────────────────────────────────────────────────

const GET_BLOCKS_DATA = gql`
  query GetBlocksData {
    spacerBlocks(search: { limit: 500 }) {
      id
      clinician_id
      clinic_id
      room_id
      block_date
      start_time
      end_time
      reason
      recurrence_type
      recurrence_days
      end_date
      clinician {
        id
        first_name
        last_name
      }
      clinic {
        id
        name
      }
      room {
        id
        room_number
      }
    }
    roomBlocks(search: { limit: 500 }) {
      id
      room_id
      clinic_id
      block_date
      start_time
      end_time
      reason
      recurrence_type
      recurrence_days
      end_date
      room {
        id
        room_number
      }
      clinic {
        id
        name
      }
    }
    clinicians(first: 500, is_active: true) {
      data {
        id
        first_name
        last_name
        is_active
      }
    }
    clinics(search: { limit: 100 }) {
      id
      name
    }
    rooms {
      id
      room_number
      is_active
      clinic {
        id
      }
    }
  }
`

const CREATE_SPACER_BLOCK = gql`
  mutation CreateSpacerBlock($input: CreateSpacerBlockInput!) {
    createSpacerBlock(input: $input) {
      success
      userErrors {
        message
      }
      spacerBlock {
        id
      }
    }
  }
`
const DELETE_SPACER_BLOCK = gql`
  mutation DeleteSpacerBlock($id: ID!) {
    deleteSpacerBlock(id: $id) {
      success
      userErrors {
        message
      }
    }
  }
`
const CREATE_ROOM_BLOCK = gql`
  mutation CreateRoomBlock($input: CreateRoomBlockInput!) {
    createRoomBlock(input: $input) {
      success
      userErrors {
        message
      }
      roomBlock {
        id
      }
    }
  }
`
const DELETE_ROOM_BLOCK = gql`
  mutation DeleteRoomBlock($id: ID!) {
    deleteRoomBlock(id: $id) {
      success
      userErrors {
        message
      }
    }
  }
`
// SUG-BLK-009 — edit/update support
const UPDATE_SPACER_BLOCK = gql`
  mutation UpdateSpacerBlock($id: ID!, $input: CreateSpacerBlockInput!) {
    updateSpacerBlock(id: $id, input: $input) {
      success
      userErrors {
        message
      }
      spacerBlock {
        id
      }
    }
  }
`
const UPDATE_ROOM_BLOCK = gql`
  mutation UpdateRoomBlock($id: ID!, $input: CreateRoomBlockInput!) {
    updateRoomBlock(id: $id, input: $input) {
      success
      userErrors {
        message
      }
      roomBlock {
        id
      }
    }
  }
`

// ─── Default forms ────────────────────────────────────────────────────────────

const defaultSpacerForm = {
  clinician_id: '',
  clinic_id: '',
  room_id: '',
  block_date: '',
  start_time: '10:00',
  end_time: '10:15',
  reason: '',
  recurrence_type: 'single',
  recurrence_days: [],
  end_date: '',
}
const defaultRoomBlockForm = {
  clinic_id: '',
  room_id: '',
  block_date: '',
  start_time: '08:00',
  end_time: '09:00',
  reason: '',
  recurrence_type: 'single',
  recurrence_days: [],
  end_date: '',
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt12 = (t) => {
  if (!t) return ''
  const [h, m] = t.split(':')
  const hr = parseInt(h)
  return `${hr % 12 || 12}:${m} ${hr >= 12 ? 'PM' : 'AM'}`
}

/** FIX GAP-BLK-001 — return error string if end_time ≤ start_time */
const validateTimes = (start, end) => {
  if (!start || !end) return null
  return start >= end ? 'End time must be after start time.' : null
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ManagerBlocks() {
  const [tab, setTab] = useState('spacers')
  const [showSpacerForm, setShowSpacerForm] = useState(false)
  const [showRoomForm, setShowRoomForm] = useState(false)
  const [spacerForm, setSpacerForm] = useState(defaultSpacerForm)
  const [roomForm, setRoomForm] = useState(defaultRoomBlockForm)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState({ type: '', id: '' })
  const [formError, setFormError] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)

  // SUG-BLK-009 — edit/update support: which block (if any) is being edited,
  // plus a local overlay so edits are visible immediately even when the
  // backend mutation can't be reached (offline / mock mode).
  const [editingSpacerId, setEditingSpacerId] = useState(null)
  const [editingRoomId, setEditingRoomId] = useState(null)
  const [spacerOverrides, setSpacerOverrides] = useState({})
  const [roomOverrides, setRoomOverrides] = useState({})

  // FIX GAP-BLK-004 — close open forms when switching tabs
  const handleTabChange = (_, newTab) => {
    if (!newTab) return
    setTab(newTab)
    setShowSpacerForm(false)
    setShowRoomForm(false)
    setFormError(null)
    setSpacerForm(defaultSpacerForm)
    setRoomForm(defaultRoomBlockForm)
    setEditingSpacerId(null)
    setEditingRoomId(null)
  }

  const { data, loading, error, refetch } = useQuery(GET_BLOCKS_DATA, { fetchPolicy: 'cache-and-network' })

  const [createSpacerBlock] = useMutation(CREATE_SPACER_BLOCK)
  const [deleteSpacerBlock] = useMutation(DELETE_SPACER_BLOCK)
  const [createRoomBlock] = useMutation(CREATE_ROOM_BLOCK)
  const [deleteRoomBlock] = useMutation(DELETE_ROOM_BLOCK)
  const [updateSpacerBlock] = useMutation(UPDATE_SPACER_BLOCK)
  const [updateRoomBlock] = useMutation(UPDATE_ROOM_BLOCK)

  // DATA-13 — mock is a fallback for a genuine query error only; a real,
  // legitimate empty result must render as empty, never as fabricated data.
  const clinicians = (error ? MOCK_CLINICIANS : (data?.clinicians?.data ?? [])).filter((c) => c.is_active)
  const clinics = error ? MOCK_CLINICS : (data?.clinics ?? [])
  const allRooms = (error ? MOCK_ROOMS : (data?.rooms ?? []))
    .filter((r) => r.is_active)
    .map((r) => ({ ...r, clinic_id: r.clinic_id ?? r.clinic?.id }))
  // SUG-BLK-009 — merge in any local edits so updates are visible immediately (offline-safe)
  const spacerBlocks = (error ? MOCK_SPACER_BLOCKS : (data?.spacerBlocks ?? [])).map((b) =>
    spacerOverrides[b.id] ? { ...b, ...spacerOverrides[b.id] } : b,
  )
  const roomBlocks = (error ? MOCK_ROOM_BLOCKS : (data?.roomBlocks ?? [])).map((b) =>
    roomOverrides[b.id] ? { ...b, ...roomOverrides[b.id] } : b,
  )

  const spacerRooms = allRooms.filter((r) => r.clinic_id === spacerForm.clinic_id)
  const roomFormRooms = allRooms.filter((r) => r.clinic_id === roomForm.clinic_id)

  // Reset room_id when clinic changes (skipped once when pre-filling an edit — SUG-BLK-009)
  const skipSpacerRoomReset = useRef(false)
  const skipRoomFormRoomReset = useRef(false)
  useEffect(() => {
    if (skipSpacerRoomReset.current) {
      skipSpacerRoomReset.current = false
      return
    }
    setSpacerForm((p) => ({ ...p, room_id: '' }))
  }, [spacerForm.clinic_id])
  useEffect(() => {
    if (skipRoomFormRoomReset.current) {
      skipRoomFormRoomReset.current = false
      return
    }
    setRoomForm((p) => ({ ...p, room_id: '' }))
  }, [roomForm.clinic_id])

  const showSuccess = (msg) => {
    setSuccessMsg(msg)
    setTimeout(() => setSuccessMsg(null), 3000)
  }

  // ── Spacer form ──
  const toggleSpacerDay = (idx) => {
    setSpacerForm((p) => ({
      ...p,
      recurrence_days: p.recurrence_days.includes(idx) ? p.recurrence_days.filter((d) => d !== idx) : [...p.recurrence_days, idx],
    }))
  }

  const handleSpacerSubmit = async (e) => {
    e.preventDefault()
    setFormError(null)
    // FIX GAP-BLK-001 — frontend time validation
    const timeErr = validateTimes(spacerForm.start_time, spacerForm.end_time)
    if (timeErr) {
      setFormError(timeErr)
      return
    }
    // SUG-BLK-010 — end date cannot be in the past
    if (spacerForm.end_date && new Date(spacerForm.end_date) < new Date(new Date().toDateString())) {
      setFormError('"End Date" cannot be in the past.')
      return
    }
    // SUG-BLK-011 — custom recurrence requires at least one day selected
    if (spacerForm.recurrence_type === 'custom' && spacerForm.recurrence_days.length === 0) {
      setFormError('Please select at least one day for custom recurrence.')
      return
    }
    const input = {
      clinician_id: spacerForm.clinician_id,
      clinic_id: spacerForm.clinic_id,
      room_id: spacerForm.room_id || null,
      block_date: spacerForm.recurrence_type === 'single' ? spacerForm.block_date : null,
      start_time: spacerForm.start_time,
      end_time: spacerForm.end_time,
      reason: spacerForm.reason || null,
      recurrence_type: spacerForm.recurrence_type,
      recurrence_days: spacerForm.recurrence_type === 'custom' ? spacerForm.recurrence_days : null,
      end_date: spacerForm.end_date || null,
    }

    // SUG-BLK-009 — edit/update flow
    if (editingSpacerId) {
      const clinician = clinicians.find((c) => c.id === input.clinician_id)
      const clinic = clinics.find((c) => c.id === input.clinic_id)
      const room = allRooms.find((r) => r.id === input.room_id)
      // Optimistic local overlay so the change is visible immediately (offline-safe)
      setSpacerOverrides((prev) => ({
        ...prev,
        [editingSpacerId]: {
          ...input,
          clinician: clinician ? { id: clinician.id, first_name: clinician.first_name, last_name: clinician.last_name } : undefined,
          clinic: clinic ? { id: clinic.id, name: clinic.name } : undefined,
          room: room ? { id: room.id, room_number: room.room_number } : null,
        },
      }))
      try {
        await updateSpacerBlock({ variables: { id: editingSpacerId, input } })
        refetch()
      } catch {
        /* offline — overlay above already applied */
      }
      setSpacerForm(defaultSpacerForm)
      setShowSpacerForm(false)
      setEditingSpacerId(null)
      showSuccess('Spacer block updated.')
      return
    }

    try {
      const { data: res } = await createSpacerBlock({ variables: { input } })
      if (res?.createSpacerBlock?.userErrors?.length) {
        setFormError(res.createSpacerBlock.userErrors[0].message)
        return
      }
      setSpacerForm(defaultSpacerForm)
      setShowSpacerForm(false)
      refetch()
      showSuccess('Spacer block created.')
    } catch (err) {
      setFormError(err.message)
    }
  }

  /** SUG-BLK-009 — open the spacer form pre-populated for editing */
  const handleEditSpacer = (b) => {
    skipSpacerRoomReset.current = true
    setSpacerForm({
      clinician_id: b.clinician?.id ?? '',
      clinic_id: b.clinic?.id ?? '',
      room_id: b.room?.id ?? '',
      block_date: b.block_date ?? '',
      start_time: b.start_time,
      end_time: b.end_time,
      reason: b.reason ?? '',
      recurrence_type: b.recurrence_type ?? 'single',
      recurrence_days: b.recurrence_days ?? [],
      end_date: b.end_date ?? '',
    })
    setEditingSpacerId(b.id)
    setShowSpacerForm(true)
    setFormError(null)
  }

  // ── Room block form ──
  const toggleRoomDay = (idx) => {
    setRoomForm((p) => ({
      ...p,
      recurrence_days: p.recurrence_days.includes(idx) ? p.recurrence_days.filter((d) => d !== idx) : [...p.recurrence_days, idx],
    }))
  }

  const handleRoomBlockSubmit = async (e) => {
    e.preventDefault()
    setFormError(null)
    // FIX GAP-BLK-001 — frontend time validation
    const timeErr = validateTimes(roomForm.start_time, roomForm.end_time)
    if (timeErr) {
      setFormError(timeErr)
      return
    }
    // SUG-BLK-010 — end date cannot be in the past
    if (roomForm.end_date && new Date(roomForm.end_date) < new Date(new Date().toDateString())) {
      setFormError('"End Date" cannot be in the past.')
      return
    }
    // SUG-BLK-011 — custom recurrence requires at least one day selected
    if (roomForm.recurrence_type === 'custom' && roomForm.recurrence_days.length === 0) {
      setFormError('Please select at least one day for custom recurrence.')
      return
    }
    const input = {
      room_id: roomForm.room_id,
      clinic_id: roomForm.clinic_id,
      block_date: roomForm.recurrence_type === 'single' ? roomForm.block_date : null,
      start_time: roomForm.start_time,
      end_time: roomForm.end_time,
      reason: roomForm.reason || null,
      recurrence_type: roomForm.recurrence_type,
      recurrence_days: roomForm.recurrence_type === 'custom' ? roomForm.recurrence_days : null,
      end_date: roomForm.end_date || null,
    }

    // SUG-BLK-009 — edit/update flow
    if (editingRoomId) {
      const clinic = clinics.find((c) => c.id === input.clinic_id)
      const room = allRooms.find((r) => r.id === input.room_id)
      setRoomOverrides((prev) => ({
        ...prev,
        [editingRoomId]: {
          ...input,
          clinic: clinic ? { id: clinic.id, name: clinic.name } : undefined,
          room: room ? { id: room.id, room_number: room.room_number } : undefined,
        },
      }))
      try {
        await updateRoomBlock({ variables: { id: editingRoomId, input } })
        refetch()
      } catch {
        /* offline — overlay above already applied */
      }
      setRoomForm(defaultRoomBlockForm)
      setShowRoomForm(false)
      setEditingRoomId(null)
      showSuccess('Room block updated.')
      return
    }

    try {
      const { data: res } = await createRoomBlock({ variables: { input } })
      if (res?.createRoomBlock?.userErrors?.length) {
        setFormError(res.createRoomBlock.userErrors[0].message)
        return
      }
      setRoomForm(defaultRoomBlockForm)
      setShowRoomForm(false)
      refetch()
      showSuccess('Room block created.')
    } catch (err) {
      setFormError(err.message)
    }
  }

  /** SUG-BLK-009 — open the room block form pre-populated for editing */
  const handleEditRoom = (b) => {
    skipRoomFormRoomReset.current = true
    setRoomForm({
      clinic_id: b.clinic?.id ?? '',
      room_id: b.room?.id ?? '',
      block_date: b.block_date ?? '',
      start_time: b.start_time,
      end_time: b.end_time,
      reason: b.reason ?? '',
      recurrence_type: b.recurrence_type ?? 'single',
      recurrence_days: b.recurrence_days ?? [],
      end_date: b.end_date ?? '',
    })
    setEditingRoomId(b.id)
    setShowRoomForm(true)
    setFormError(null)
  }

  // ── Delete ──
  const handleDelete = (type, id) => {
    setDeleteTarget({ type, id })
    setConfirmOpen(true)
  }
  const confirmDelete = async () => {
    setConfirmOpen(false)
    try {
      if (deleteTarget.type === 'spacer') {
        const { data: res } = await deleteSpacerBlock({ variables: { id: deleteTarget.id } })
        if (res?.deleteSpacerBlock?.userErrors?.length) {
          setFormError(res.deleteSpacerBlock.userErrors[0].message)
          return
        }
      } else {
        const { data: res } = await deleteRoomBlock({ variables: { id: deleteTarget.id } })
        if (res?.deleteRoomBlock?.userErrors?.length) {
          setFormError(res.deleteRoomBlock.userErrors[0].message)
          return
        }
      }
      refetch()
      showSuccess('Block deleted.')
    } catch (err) {
      setFormError(err.message)
    }
  }

  if (loading && !data)
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={300}>
        <CircularProgress />
      </Box>
    )

  // ─── Shared recurrence form fields ───────────────────────────────────────────
  const RecurrenceFields = ({ form, setForm, toggleDay }) => (
    <>
      <Grid item xs={12} sm={6}>
        <FormControl fullWidth size="small">
          <InputLabel>Recurrence</InputLabel>
          <Select
            label="Recurrence"
            value={form.recurrence_type}
            onChange={(e) => setForm((p) => ({ ...p, recurrence_type: e.target.value, recurrence_days: [] }))}
          >
            {RECURRENCE_OPTIONS.map((o) => (
              <MenuItem key={o.value} value={o.value}>
                {o.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>

      {form.recurrence_type === 'single' && (
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            required
            size="small"
            type="date"
            label="Date"
            InputLabelProps={{ shrink: true }}
            value={form.block_date}
            onChange={(e) => setForm((p) => ({ ...p, block_date: e.target.value }))}
          />
        </Grid>
      )}

      {form.recurrence_type === 'custom' && (
        <Grid item xs={12}>
          <Typography variant="caption" color="text.secondary" gutterBottom>
            Select days of week
          </Typography>
          <Stack direction="row" spacing={0.5} flexWrap="wrap">
            {WEEK_DAYS.map((d, i) => (
              <Chip
                key={i}
                label={d}
                size="small"
                color={form.recurrence_days.includes(i) ? 'primary' : 'default'}
                onClick={() => toggleDay(i)}
                sx={{ cursor: 'pointer' }}
              />
            ))}
          </Stack>
        </Grid>
      )}

      {form.recurrence_type !== 'single' && (
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            size="small"
            type="date"
            label="End Date (optional)"
            InputLabelProps={{ shrink: true }}
            value={form.end_date}
            onChange={(e) => setForm((p) => ({ ...p, end_date: e.target.value }))}
          />
        </Grid>
      )}

      <Grid item xs={6} sm={3}>
        <TextField
          fullWidth
          required
          size="small"
          type="time"
          label="Start Time"
          InputLabelProps={{ shrink: true }}
          value={form.start_time}
          onChange={(e) => setForm((p) => ({ ...p, start_time: e.target.value }))}
        />
      </Grid>
      <Grid item xs={6} sm={3}>
        <TextField
          fullWidth
          required
          size="small"
          type="time"
          label="End Time"
          InputLabelProps={{ shrink: true }}
          value={form.end_time}
          onChange={(e) => setForm((p) => ({ ...p, end_time: e.target.value }))}
        />
      </Grid>

      {/* FIX GAP-BLK-003 — maxLength + character counter on Reason field */}
      <Grid item xs={12}>
        <TextField
          fullWidth
          size="small"
          label="Reason"
          placeholder="e.g. Equipment setup, Staff meeting"
          value={form.reason}
          inputProps={{ maxLength: REASON_MAX }}
          helperText={`${form.reason.length} / ${REASON_MAX}`}
          onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))}
        />
      </Grid>
    </>
  )

  return (
    <ErrorBoundary>
      <Box>
        {/* Header */}
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
          <Box>
            <Typography variant="h5" fontWeight={700}>
              Schedule Blocks
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Block clinician time slots or entire rooms
            </Typography>
          </Box>
          {/* FIX GAP-BLK-004 — close forms on tab switch */}
          <ToggleButtonGroup value={tab} exclusive onChange={handleTabChange} size="small">
            <ToggleButton value="spacers">
              <BlockIcon sx={{ mr: 0.5 }} fontSize="small" />
              Spacer Blocks
            </ToggleButton>
            <ToggleButton value="rooms">
              <MeetingRoomIcon sx={{ mr: 0.5 }} fontSize="small" />
              Room Blocks
            </ToggleButton>
          </ToggleButtonGroup>
        </Stack>

        {successMsg && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMsg(null)}>
            {successMsg}
          </Alert>
        )}
        {formError && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setFormError(null)}>
            {formError}
          </Alert>
        )}

        {/* ══ SPACER BLOCKS TAB ══ */}
        {tab === 'spacers' && (
          <>
            <Box mb={2}>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => {
                  setEditingSpacerId(null)
                  setSpacerForm(defaultSpacerForm)
                  setShowSpacerForm((p) => !p)
                  setFormError(null)
                }}
              >
                Add Spacer Block
              </Button>
            </Box>

            {showSpacerForm && (
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Typography variant="h6" fontWeight={600} mb={2}>
                    {editingSpacerId ? 'Edit Spacer Block' : 'New Spacer Block'}
                  </Typography>
                  <Box component="form" onSubmit={handleSpacerSubmit}>
                    <Grid container spacing={2}>
                      {/* Clinician */}
                      <Grid item xs={12} sm={6}>
                        <FormControl fullWidth required size="small">
                          <InputLabel>Clinician</InputLabel>
                          <Select
                            label="Clinician"
                            value={spacerForm.clinician_id}
                            onChange={(e) => setSpacerForm((p) => ({ ...p, clinician_id: e.target.value }))}
                          >
                            {clinicians.map((c) => (
                              <MenuItem key={c.id} value={c.id}>
                                {c.first_name} {c.last_name}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>
                      {/* Clinic */}
                      <Grid item xs={12} sm={6}>
                        <FormControl fullWidth required size="small">
                          <InputLabel>Clinic</InputLabel>
                          <Select
                            label="Clinic"
                            value={spacerForm.clinic_id}
                            onChange={(e) => setSpacerForm((p) => ({ ...p, clinic_id: e.target.value, room_id: '' }))}
                          >
                            {clinics.map((c) => (
                              <MenuItem key={c.id} value={c.id}>
                                {c.name}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>
                      {/* Room optional */}
                      <Grid item xs={12} sm={6}>
                        <FormControl fullWidth size="small" disabled={!spacerForm.clinic_id}>
                          <InputLabel>Room (optional)</InputLabel>
                          <Select
                            label="Room (optional)"
                            value={spacerForm.room_id}
                            onChange={(e) => setSpacerForm((p) => ({ ...p, room_id: e.target.value }))}
                          >
                            <MenuItem value="">Any room</MenuItem>
                            {spacerRooms.map((r) => (
                              <MenuItem key={r.id} value={r.id}>
                                Room {r.room_number}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>
                      <RecurrenceFields form={spacerForm} setForm={setSpacerForm} toggleDay={toggleSpacerDay} />
                      <Grid item xs={12}>
                        <Stack direction="row" spacing={1}>
                          <Button type="submit" variant="contained">
                            {editingSpacerId ? 'Save Changes' : 'Create'}
                          </Button>
                          <Button
                            variant="outlined"
                            onClick={() => {
                              setSpacerForm(defaultSpacerForm)
                              setShowSpacerForm(false)
                              setEditingSpacerId(null)
                            }}
                          >
                            Cancel
                          </Button>
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
                <Card>
                  <CardContent>
                    <Typography color="text.secondary" textAlign="center" py={4}>
                      No spacer blocks yet
                    </Typography>
                  </CardContent>
                </Card>
              )}
              {spacerBlocks.map((b) => (
                <Card key={b.id}>
                  <CardContent>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                      <Box>
                        <Typography fontWeight={700}>
                          {b.clinician?.first_name} {b.clinician?.last_name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {b.clinic?.name}
                          {b.room && ` · Room ${b.room.room_number}`}
                        </Typography>
                        <Typography variant="body2" mt={0.5}>
                          {b.block_date && new Date(b.block_date).toLocaleDateString()}&nbsp;
                          {fmt12(b.start_time)} – {fmt12(b.end_time)}
                        </Typography>
                        {b.reason && (
                          <Typography variant="caption" color="text.secondary">
                            Reason: {b.reason}
                          </Typography>
                        )}
                        <Box mt={0.5}>
                          <Chip label={b.recurrence_type || 'single'} size="small" sx={{ textTransform: 'capitalize' }} />
                        </Box>
                      </Box>
                      <Stack direction="row">
                        {/* SUG-BLK-009 — edit block */}
                        <Tooltip title="Edit block">
                          <IconButton
                            aria-label={`Edit spacer block for ${b.clinician?.first_name} ${b.clinician?.last_name}`}
                            onClick={() => handleEditSpacer(b)}
                          >
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        {/* FIX — aria-label on delete icon button */}
                        <Tooltip title="Delete block">
                          <IconButton
                            color="error"
                            aria-label={`Delete spacer block for ${b.clinician?.first_name} ${b.clinician?.last_name}`}
                            onClick={() => handleDelete('spacer', b.id)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </Stack>
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
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => {
                  setEditingRoomId(null)
                  setRoomForm(defaultRoomBlockForm)
                  setShowRoomForm((p) => !p)
                  setFormError(null)
                }}
              >
                Add Room Block
              </Button>
            </Box>

            {showRoomForm && (
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Typography variant="h6" fontWeight={600} mb={2}>
                    {editingRoomId ? 'Edit Room Block' : 'New Room Block'}
                  </Typography>
                  <Box component="form" onSubmit={handleRoomBlockSubmit}>
                    <Grid container spacing={2}>
                      {/* Clinic */}
                      <Grid item xs={12} sm={6}>
                        <FormControl fullWidth required size="small">
                          <InputLabel>Clinic</InputLabel>
                          <Select
                            label="Clinic"
                            value={roomForm.clinic_id}
                            onChange={(e) => setRoomForm((p) => ({ ...p, clinic_id: e.target.value, room_id: '' }))}
                          >
                            {clinics.map((c) => (
                              <MenuItem key={c.id} value={c.id}>
                                {c.name}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>
                      {/* Room required */}
                      <Grid item xs={12} sm={6}>
                        <FormControl fullWidth required size="small" disabled={!roomForm.clinic_id}>
                          <InputLabel>Room</InputLabel>
                          <Select
                            label="Room"
                            value={roomForm.room_id}
                            onChange={(e) => setRoomForm((p) => ({ ...p, room_id: e.target.value }))}
                          >
                            <MenuItem value="">Select a room</MenuItem>
                            {roomFormRooms.map((r) => (
                              <MenuItem key={r.id} value={r.id}>
                                Room {r.room_number}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>
                      <RecurrenceFields form={roomForm} setForm={setRoomForm} toggleDay={toggleRoomDay} />
                      <Grid item xs={12}>
                        <Stack direction="row" spacing={1}>
                          <Button type="submit" variant="contained">
                            {editingRoomId ? 'Save Changes' : 'Create'}
                          </Button>
                          <Button
                            variant="outlined"
                            onClick={() => {
                              setRoomForm(defaultRoomBlockForm)
                              setShowRoomForm(false)
                              setEditingRoomId(null)
                            }}
                          >
                            Cancel
                          </Button>
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
                <Card>
                  <CardContent>
                    <Typography color="text.secondary" textAlign="center" py={4}>
                      No room blocks yet
                    </Typography>
                  </CardContent>
                </Card>
              )}
              {roomBlocks.map((b) => (
                <Card key={b.id}>
                  <CardContent>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                      <Box>
                        <Typography fontWeight={700}>
                          {b.room ? `Room ${b.room.room_number}` : '—'} · {b.clinic?.name}
                        </Typography>
                        <Typography variant="body2" mt={0.5}>
                          {b.block_date && new Date(b.block_date).toLocaleDateString()}&nbsp;
                          {fmt12(b.start_time)} – {fmt12(b.end_time)}
                        </Typography>
                        {b.reason && (
                          <Typography variant="caption" color="text.secondary">
                            Reason: {b.reason}
                          </Typography>
                        )}
                        <Box mt={0.5}>
                          <Chip label={b.recurrence_type || 'single'} size="small" sx={{ textTransform: 'capitalize' }} />
                        </Box>
                      </Box>
                      <Stack direction="row">
                        {/* SUG-BLK-009 — edit block */}
                        <Tooltip title="Edit block">
                          <IconButton
                            aria-label={`Edit room block for Room ${b.room?.room_number} at ${b.clinic?.name}`}
                            onClick={() => handleEditRoom(b)}
                          >
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        {/* FIX — aria-label on delete icon button */}
                        <Tooltip title="Delete block">
                          <IconButton
                            color="error"
                            aria-label={`Delete room block for Room ${b.room?.room_number} at ${b.clinic?.name}`}
                            onClick={() => handleDelete('room', b.id)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </Stack>
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
          confirmLabel="Delete"
          confirmColor="error"
        />
      </Box>
    </ErrorBoundary>
  )
}
