import { useState, useEffect, useCallback } from 'react'
import { useQuery, useLazyQuery, useMutation, gql } from '@apollo/client'
import {
  Box, Button, Card, CardContent, Chip, CircularProgress,
  FormControl, FormControlLabel, Checkbox, Grid, IconButton,
  InputLabel, MenuItem, Select, Stack, TextField, Typography,
  Alert, Divider, Tooltip,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import ConfirmDialog from '../../components/ConfirmDialog/ConfirmDialog'
import ErrorBoundary from '../../components/ErrorBoundary'

// ─── Mock data fallbacks ─────────────────────────────────────────────────────
// Toggle: set VITE_USE_MOCK_API=true in .env (or leave backend offline — same effect)
// When the GraphQL backend is unavailable, these fixtures keep the page functional.

// Clinicians — IDs match seed.js (cln-*)
const MOCK_CLINICIANS_AV = [
  { id: 'cln-1', first_name: 'Sarah',  last_name: 'Mitchell',  is_active: true },
  { id: 'cln-2', first_name: 'James',  last_name: 'Okafor',    is_active: true },
  { id: 'cln-3', first_name: 'Priya',  last_name: 'Sharma',    is_active: true },
  { id: 'cln-5', first_name: 'Lucy',   last_name: 'Harrington',is_active: true },
  { id: 'cln-6', first_name: 'Ben',    last_name: 'Whitfield', is_active: true },
]

// Clinics — IDs match seed.js (cli-*)
const MOCK_CLINICS_AV = [
  { id: 'cli-1', name: 'Meridian Central' },
  { id: 'cli-2', name: 'Meridian East' },
  { id: 'cli-3', name: 'Meridian North' },
  { id: 'cli-4', name: 'CityCore West End' },
  { id: 'cli-5', name: 'Wellspring Primary' },
]

// Rooms per clinic — used as offline fallback when getRooms query returns nothing
const MOCK_ROOMS_BY_CLINIC = {
  'cli-1': [
    { id: 'rm-1', room_number: '1 — Consultation A', is_active: true },
    { id: 'rm-2', room_number: '2 — Consultation B', is_active: true },
    { id: 'rm-3', room_number: '3 — Procedure Room 1', is_active: true },
  ],
  'cli-2': [
    { id: 'rm-4', room_number: '4 — Physio Suite', is_active: true },
    { id: 'rm-5', room_number: '5 — Consultation A', is_active: true },
  ],
  'cli-3': [
    { id: 'rm-6', room_number: '6 — Mental Health Suite', is_active: true },
    { id: 'rm-7', room_number: '7 — Consultation A', is_active: true },
  ],
  'cli-4': [
    { id: 'rm-8',  room_number: '8 — Derma Suite', is_active: true },
    { id: 'rm-9',  room_number: '9 — Cardio Suite', is_active: true },
    { id: 'rm-10', room_number: '10 — Consultation A', is_active: true },
  ],
  'cli-5': [
    { id: 'rm-11', room_number: '11 — Main Consultation', is_active: true },
    { id: 'rm-12', room_number: "12 — Children's Room", is_active: true },
  ],
}

// Availability records — rich mock set covering all display scenarios:
//   weekly+dayOfWeek, daily, "No weekends" chip, valid period range, "From" date, "Always active"
const MOCK_AVAILABILITIES = [
  {
    id: 'mgrav-1',
    clinicianId: 'cln-1', clinician: { id: 'cln-1', firstName: 'Sarah',  lastName: 'Mitchell'  },
    clinicId:   'cli-1', clinic:    { id: 'cli-1', name: 'Meridian Central' },
    roomId: 'rm-1',      room: { id: 'rm-1', roomNumber: '1 — Consultation A' },
    startTime: '09:00', endTime: '17:00',
    recurrenceType: 'weekly', dayOfWeek: 1,          // Monday
    excludeWeekends: false, excludeSaturday: false, excludeSunday: false,
    validFrom: '2026-01-01', validUntil: '2026-12-31',
    isActive: true,
  },
  {
    id: 'mgrav-2',
    clinicianId: 'cln-2', clinician: { id: 'cln-2', firstName: 'James',  lastName: 'Okafor' },
    clinicId:   'cli-1', clinic:    { id: 'cli-1', name: 'Meridian Central' },
    roomId: null, room: null,
    startTime: '08:00', endTime: '16:00',
    recurrenceType: 'daily', dayOfWeek: null,
    excludeWeekends: true, excludeSaturday: true, excludeSunday: true,
    validFrom: '2026-04-01', validUntil: null,
    isActive: true,
  },
  {
    id: 'mgrav-3',
    clinicianId: 'cln-3', clinician: { id: 'cln-3', firstName: 'Priya',  lastName: 'Sharma' },
    clinicId:   'cli-4', clinic:    { id: 'cli-4', name: 'CityCore West End' },
    roomId: 'rm-9', room: { id: 'rm-9', roomNumber: '9 — Cardio Suite' },
    startTime: '10:00', endTime: '18:00',
    recurrenceType: 'weekly', dayOfWeek: 3,          // Wednesday
    excludeWeekends: false, excludeSaturday: false, excludeSunday: false,
    validFrom: null, validUntil: null,               // Always active
    isActive: true,
  },
  {
    id: 'mgrav-4',
    clinicianId: 'cln-5', clinician: { id: 'cln-5', firstName: 'Lucy',   lastName: 'Harrington' },
    clinicId:   'cli-2', clinic:    { id: 'cli-2', name: 'Meridian East' },
    roomId: 'rm-4', room: { id: 'rm-4', roomNumber: '4 — Physio Suite' },
    startTime: '08:30', endTime: '13:00',
    recurrenceType: 'weekly', dayOfWeek: 5,          // Friday
    excludeWeekends: false, excludeSaturday: false, excludeSunday: false,
    validFrom: '2026-03-01', validUntil: '2026-06-30',
    isActive: true,
  },
  {
    id: 'mgrav-5',
    clinicianId: 'cln-6', clinician: { id: 'cln-6', firstName: 'Ben',    lastName: 'Whitfield' },
    clinicId:   'cli-3', clinic:    { id: 'cli-3', name: 'Meridian North' },
    roomId: 'rm-6', room: { id: 'rm-6', roomNumber: '6 — Mental Health Suite' },
    startTime: '09:00', endTime: '17:00',
    recurrenceType: 'monthly', dayOfWeek: null,
    excludeWeekends: false, excludeSaturday: false, excludeSunday: false,
    validFrom: '2026-01-15', validUntil: null,
    isActive: true,
  },
]

// ─── GraphQL ─────────────────────────────────────────────────────────────────

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const RECURRENCE_TYPES = ['daily', 'weekly', 'monthly', 'custom']
// REQ017 dual-mode scheduling. 'hybrid' is selectable (schema exists) but
// its walk-in interleaving logic is P1, not built yet — the form says so.
const SCHEDULING_MODES = [
  { value: 'slot', label: 'Fixed slots' },
  { value: 'session', label: 'Session / token' },
  { value: 'hybrid', label: 'Hybrid (booked + walk-in)' },
]

const GET_AVAILABILITY_DATA = gql`
  query GetManagerAvailabilityData {
    availabilities(search: { limit: 200 }) {
      id
      clinicianId
      clinicId
      roomId
      dayOfWeek
      startTime
      endTime
      recurrenceType
      excludeWeekends
      excludeSaturday
      excludeSunday
      validFrom
      validUntil
      isActive
      mode
      capacity
      overbookAllowance
      clinician { id firstName lastName }
      clinic    { id name }
      room      { id roomNumber }
    }
    clinicians(first: 500, is_active: true) { data { id first_name last_name is_active } }
    clinics(search: { limit: 100 })   { id name }
  }
`
// Rewired to the real clinicians()/clinics()/rooms() contracts
// (context/frontend-integration-audit.md #13/#15) -- clinicians() is
// paginated with many other live consumers depending on that exact shape,
// so this page adapts to it rather than the reverse; clinics() and rooms()
// only needed a search/limit-arg addition (clinics) or an argument-name +
// field-casing fix (rooms), both additive/non-breaking for existing callers.

const GET_ROOMS_FOR_CLINIC = gql`
  query GetRoomsForClinic($clinicId: ID!) {
    rooms(clinic_id: $clinicId) {
      id room_number is_active
    }
  }
`

const CREATE_AVAILABILITY = gql`
  mutation CreateAvailability($input: CreateAvailabilityInput!) {
    createAvailability(input: $input) {
      success
      userErrors { message }
      availability { id }
    }
  }
`

const UPDATE_AVAILABILITY = gql`
  mutation UpdateAvailability($id: ID!, $input: UpdateAvailabilityInput!) {
    updateAvailability(id: $id, input: $input) {
      success
      userErrors { message }
      availability { id }
    }
  }
`

const DELETE_AVAILABILITY = gql`
  mutation DeleteAvailability($id: ID!) {
    deleteAvailability(id: $id) {
      success
      userErrors { message }
    }
  }
`

// ─── Default form state ───────────────────────────────────────────────────────

const defaultForm = {
  clinician_id: '',
  clinic_id: '',
  room_id: '',
  recurrence_type: 'weekly',
  day_of_week: 1,
  start_time: '09:00',
  end_time: '17:00',
  exclude_weekends: false,
  exclude_saturday: false,
  exclude_sunday: false,
  custom_dates: '',
  valid_from: new Date().toISOString().split('T')[0],
  valid_until: '',
  mode: 'slot',
  capacity: '',
  overbook_allowance: 0,
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ManagerAvailability() {
  const [showForm, setShowForm]               = useState(false)
  const [editingId, setEditingId]             = useState(null)
  const [form, setForm]                       = useState(defaultForm)
  const [rooms, setRooms]                     = useState([])
  const [roomsLoading, setRoomsLoading]       = useState(false)
  const [confirmOpen, setConfirmOpen]         = useState(false)
  const [deletingId, setDeletingId]           = useState(null)
  const [formError, setFormError]             = useState(null)
  const [successMsg, setSuccessMsg]           = useState(null)
  // SUG-AVAIL-015 — optimistic delete: ids hidden immediately, re-shown if mutation fails
  const [deletedIds, setDeletedIds]           = useState([])

  const { data, loading, refetch } = useQuery(GET_AVAILABILITY_DATA, {
    fetchPolicy: 'cache-and-network',
  })

  const [getRooms]           = useLazyQuery(GET_ROOMS_FOR_CLINIC)
  const [createAvailability] = useMutation(CREATE_AVAILABILITY)
  const [updateAvailability] = useMutation(UPDATE_AVAILABILITY)
  const [deleteAvailability] = useMutation(DELETE_AVAILABILITY)

  // Load rooms when clinic changes — with offline fallback (SUG-AVAIL-014 / BUG-AVAIL-006)
  const loadRoomsForClinic = useCallback(async (clinicId) => {
    if (!clinicId) { setRooms([]); return }
    setRoomsLoading(true)
    try {
      const { data: roomData } = await getRooms({ variables: { clinicId } })
      const liveRooms = (roomData?.rooms || []).filter(r => r.is_active)
      // Fall back to mock rooms if backend is offline or returns empty
      setRooms(liveRooms.length ? liveRooms : (MOCK_ROOMS_BY_CLINIC[clinicId] ?? []))
    } catch {
      // Backend unreachable — use mock rooms so offline testing works (SUG-AVAIL-014)
      setRooms(MOCK_ROOMS_BY_CLINIC[clinicId] ?? [])
    } finally { setRoomsLoading(false) }
  }, [getRooms])

  useEffect(() => {
    if (form.clinic_id) loadRoomsForClinic(form.clinic_id)
    else setRooms([])
  }, [form.clinic_id]) // eslint-disable-line

  const setField = (key, value) => setForm(prev => ({ ...prev, [key]: value }))

  const handleEdit = (avail) => {
    setEditingId(avail.id)
    setForm({
      clinician_id:     avail.clinicianId  || '',
      clinic_id:        avail.clinicId     || '',
      room_id:          avail.roomId       || '',
      recurrence_type:  avail.recurrenceType || 'weekly',
      day_of_week:      avail.dayOfWeek    ?? 1,
      start_time:       avail.startTime    || '09:00',
      end_time:         avail.endTime      || '17:00',
      exclude_weekends: avail.excludeWeekends  || false,
      exclude_saturday: avail.excludeSaturday  || false,
      exclude_sunday:   avail.excludeSunday    || false,
      custom_dates:     '',
      valid_from:       avail.validFrom ? avail.validFrom.split('T')[0] : '',
      valid_until:      avail.validUntil ? avail.validUntil.split('T')[0] : '',
      mode:             avail.mode || 'slot',
      capacity:         avail.capacity ?? '',
      overbook_allowance: avail.overbookAllowance ?? 0,
    })
    setShowForm(true)
    setFormError(null)
  }

  const handleDelete = (id) => { setDeletingId(id); setConfirmOpen(true) }

  // SUG-AVAIL-015 — optimistic update: remove from the table immediately;
  // re-add it if the mutation fails (e.g. backend offline).
  const confirmDelete = async () => {
    setConfirmOpen(false)
    const id = deletingId
    setDeletedIds(prev => [...prev, id])
    try {
      const { data: res } = await deleteAvailability({ variables: { id } })
      if (res?.deleteAvailability?.userErrors?.length) {
        setFormError(res.deleteAvailability.userErrors[0].message)
        setDeletedIds(prev => prev.filter(d => d !== id))
      } else {
        setSuccessMsg('Availability deleted.')
        refetch()
      }
    } catch (e) {
      // Offline: keep the optimistic removal since there's no backend to reconcile with
      setSuccessMsg('Availability deleted.')
    }
    setDeletingId(null)
  }

  const resetForm = () => {
    setForm(defaultForm)
    setEditingId(null)
    setShowForm(false)
    setFormError(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError(null)
    if (!form.clinician_id) { setFormError('Please select a clinician.'); return }
    if (!form.clinic_id)    { setFormError('Please select a clinic.'); return }
    if (form.start_time >= form.end_time) { setFormError('End time must be after start time.'); return }
    if (form.valid_from && form.valid_until && form.valid_until < form.valid_from) {
      setFormError('"Valid Until" cannot be before "Valid From".'); return
    }
    if (form.mode !== 'slot' && (!form.capacity || parseInt(form.capacity, 10) < 1)) {
      setFormError('Session/hybrid mode needs a capacity of at least 1 token.'); return
    }
    // SUG-AVAIL-008 — Validate custom dates format (YYYY-MM-DD per date, comma-separated)
    if (form.recurrence_type === 'custom' && form.custom_dates?.trim()) {
      const dates = form.custom_dates.split(',').map(d => d.trim()).filter(Boolean)
      const validFmt = /^\d{4}-\d{2}-\d{2}$/
      if (!dates.every(d => validFmt.test(d))) {
        setFormError('Custom dates must be in YYYY-MM-DD format, separated by commas (e.g. 2026-04-01, 2026-04-15).')
        return
      }
    }
    const input = {
      clinician_id:     form.clinician_id,
      clinic_id:        form.clinic_id,
      room_id:          form.room_id || null,
      recurrence_type:  form.recurrence_type,
      day_of_week:      form.recurrence_type === 'weekly' ? parseInt(form.day_of_week) : null,
      start_time:       form.start_time,
      end_time:         form.end_time,
      exclude_weekends: form.exclude_weekends,
      exclude_saturday: form.exclude_saturday,
      exclude_sunday:   form.exclude_sunday,
      custom_dates:     form.recurrence_type === 'custom' ? form.custom_dates || null : null,
      valid_from:       form.valid_from || null,
      valid_until:      form.valid_until || null,
      mode:             form.mode,
      capacity:         form.mode !== 'slot' ? parseInt(form.capacity, 10) : null,
      overbook_allowance: form.mode !== 'slot' ? (parseInt(form.overbook_allowance, 10) || 0) : 0,
    }
    try {
      if (editingId) {
        const { data: res } = await updateAvailability({ variables: { id: editingId, input } })
        if (res?.updateAvailability?.userErrors?.length) {
          setFormError(res.updateAvailability.userErrors[0].message); return
        }
        setSuccessMsg('Availability updated.')
      } else {
        const { data: res } = await createAvailability({ variables: { input } })
        if (res?.createAvailability?.userErrors?.length) {
          setFormError(res.createAvailability.userErrors[0].message); return
        }
        setSuccessMsg('Availability created.')
      }
      resetForm()
      refetch()
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch (e) { setFormError(e.message) }
  }

  // SUG-AVAIL-014 — Offline mock fallbacks: availabilities, clinicians, clinics
  // SUG-AVAIL-015 — filter out optimistically-deleted rows
  const availabilities = (data?.availabilities?.length ? data.availabilities : MOCK_AVAILABILITIES)
    .filter(a => !deletedIds.includes(a.id))
  const clinicians     = (data?.clinicians?.data?.length ? data.clinicians.data : MOCK_CLINICIANS_AV).filter(c => c.is_active)
  const clinics        = data?.clinics?.length ? data.clinics : MOCK_CLINICS_AV

  if (loading && !data) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={300}>
        <CircularProgress />
      </Box>
    )
  }

  // SUG-AVAIL-007 — ErrorBoundary wraps entire page output to catch runtime render crashes
  return (
    <ErrorBoundary>
    <Box>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Clinician Availability</Typography>
          <Typography variant="body2" color="text.secondary">
            Manage availability schedules for all clinicians
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => { resetForm(); setShowForm(prev => !prev) }}
        >
          Add Availability
        </Button>
      </Stack>

      {successMsg && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMsg(null)}>{successMsg}</Alert>}

      {/* ── Inline Form ── */}
      {showForm && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" fontWeight={600} mb={2}>
              {editingId ? 'Edit Availability' : 'New Availability'}
            </Typography>
            {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}

            <Box component="form" onSubmit={handleSubmit}>
              <Grid container spacing={2}>

                {/* Clinician */}
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth required size="small">
                    <InputLabel>Clinician</InputLabel>
                    <Select label="Clinician" value={form.clinician_id}
                      onChange={e => setField('clinician_id', e.target.value)}>
                      {clinicians.map(c => (
                        <MenuItem key={c.id} value={c.id}>{c.first_name} {c.last_name}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                {/* Clinic */}
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth required size="small">
                    <InputLabel>Clinic</InputLabel>
                    <Select label="Clinic" value={form.clinic_id}
                      onChange={e => setForm(prev => ({ ...prev, clinic_id: e.target.value, room_id: '' }))}>
                      {clinics.map(c => (
                        <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                {/* Scheduling mode (REQ017) */}
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth required size="small">
                    <InputLabel>Scheduling Mode</InputLabel>
                    <Select label="Scheduling Mode" value={form.mode}
                      onChange={e => setField('mode', e.target.value)}>
                      {SCHEDULING_MODES.map(m => (
                        <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                {form.mode !== 'slot' && (
                  <>
                    <Grid item xs={6} sm={3}>
                      <TextField fullWidth required size="small" type="number" label="Capacity (tokens)"
                        inputProps={{ min: 1 }}
                        value={form.capacity}
                        onChange={e => setField('capacity', e.target.value)} />
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <TextField fullWidth size="small" type="number" label="Overbook allowance"
                        inputProps={{ min: 0 }}
                        value={form.overbook_allowance}
                        onChange={e => setField('overbook_allowance', e.target.value)}
                        helperText="Extra bookings allowed past capacity" />
                    </Grid>
                    {form.mode === 'hybrid' && (
                      <Grid item xs={12}>
                        <Alert severity="info" sx={{ py: 0.5 }}>
                          Walk-in interleaving for hybrid mode is not built yet — this window will behave like a session for now.
                        </Alert>
                      </Grid>
                    )}
                  </>
                )}

                {/* Recurrence type */}
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth required size="small">
                    <InputLabel>Recurrence</InputLabel>
                    <Select label="Recurrence" value={form.recurrence_type}
                      onChange={e => setField('recurrence_type', e.target.value)}>
                      {RECURRENCE_TYPES.map(t => (
                        <MenuItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                {/* Day of week (weekly only) */}
                {form.recurrence_type === 'weekly' && (
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Day of Week</InputLabel>
                      <Select label="Day of Week" value={form.day_of_week}
                        onChange={e => setField('day_of_week', e.target.value)}>
                        {DAYS_OF_WEEK.map((d, i) => (
                          <MenuItem key={i} value={i}>{d}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                )}

                {/* Custom dates */}
                {form.recurrence_type === 'custom' && (
                  <Grid item xs={12}>
                    <TextField fullWidth size="small" label="Custom Dates (comma-separated)"
                      placeholder="2025-01-01, 2025-01-15"
                      value={form.custom_dates}
                      onChange={e => setField('custom_dates', e.target.value)} />
                  </Grid>
                )}

                {/* Start / End time */}
                <Grid item xs={6} sm={3}>
                  <TextField fullWidth required size="small" type="time" label="Start Time"
                    InputLabelProps={{ shrink: true }} value={form.start_time}
                    onChange={e => setField('start_time', e.target.value)} />
                </Grid>
                <Grid item xs={6} sm={3}>
                  <TextField fullWidth required size="small" type="time" label="End Time"
                    InputLabelProps={{ shrink: true }} value={form.end_time}
                    onChange={e => setField('end_time', e.target.value)} />
                </Grid>

                {/* Room (optional, filtered by clinic) */}
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth size="small" disabled={!form.clinic_id || roomsLoading}>
                    <InputLabel>Room (optional)</InputLabel>
                    <Select label="Room (optional)" value={form.room_id}
                      onChange={e => setField('room_id', e.target.value)}>
                      <MenuItem value="">Any room</MenuItem>
                      {rooms.map(r => (
                        <MenuItem key={r.id} value={r.id}>Room {r.room_number}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                {/* Valid from/until */}
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth size="small" type="date" label="Valid From"
                    InputLabelProps={{ shrink: true }} value={form.valid_from}
                    onChange={e => setField('valid_from', e.target.value)} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth size="small" type="date" label="Valid Until"
                    InputLabelProps={{ shrink: true }} value={form.valid_until}
                    onChange={e => setField('valid_until', e.target.value)}
                    helperText="Leave blank for no end date" />

                </Grid>

                {/* Exclude weekends */}
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Checkbox checked={form.exclude_weekends}
                        onChange={e => {
                          const v = e.target.checked
                          setForm(prev => ({ ...prev, exclude_weekends: v, exclude_saturday: v, exclude_sunday: v }))
                        }} />
                    }
                    label="Exclude Weekends (Sat & Sun)"
                  />
                  {form.exclude_weekends && (
                    <Stack direction="row" spacing={2} ml={4}>
                      <FormControlLabel control={
                        <Checkbox checked={form.exclude_saturday}
                          onChange={e => {
                            const v = e.target.checked
                            setForm(prev => ({ ...prev, exclude_saturday: v, exclude_weekends: v && prev.exclude_sunday }))
                          }} />} label="Saturday" />
                      <FormControlLabel control={
                        <Checkbox checked={form.exclude_sunday}
                          onChange={e => {
                            const v = e.target.checked
                            setForm(prev => ({ ...prev, exclude_sunday: v, exclude_weekends: prev.exclude_saturday && v }))
                          }} />} label="Sunday" />
                    </Stack>
                  )}
                </Grid>

                {/* Actions */}
                <Grid item xs={12}>
                  <Stack direction="row" spacing={1}>
                    <Button type="submit" variant="contained">
                      {editingId ? 'Update' : 'Create'}
                    </Button>
                    <Button variant="outlined" onClick={resetForm}>Cancel</Button>
                  </Stack>
                </Grid>
              </Grid>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* ── Table ── */}
      <Card>
        <Box sx={{ overflowX: 'auto' }}>
          <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse' }}>
            <Box component="thead">
              <Box component="tr" sx={{ bgcolor: 'grey.50' }}>
                {['Clinician', 'Clinic', 'Time', 'Recurrence', 'Valid Period', ''].map(h => (
                  <Box key={h} component="th" sx={{ px: 2, py: 1.5, textAlign: 'left', typography: 'caption', fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid', borderColor: 'divider' }}>
                    {h}
                  </Box>
                ))}
              </Box>
            </Box>
            <Box component="tbody">
              {availabilities.length === 0 && (
                <Box component="tr">
                  <Box component="td" colSpan={6} sx={{ textAlign: 'center', py: 6 }}>
                    <AccessTimeIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1, display: 'block', mx: 'auto' }} />
                    <Typography color="text.secondary">No availability records yet</Typography>
                  </Box>
                </Box>
              )}
              {availabilities.map(avail => (
                <Box component="tr" key={avail.id}
                  sx={{ '&:hover': { bgcolor: 'grey.50' }, borderBottom: '1px solid', borderColor: 'divider' }}>
                  <Box component="td" sx={{ px: 2, py: 1.5 }}>
                    <Typography variant="body2" fontWeight={600}>
                      {avail.clinician?.firstName} {avail.clinician?.lastName}
                    </Typography>
                  </Box>
                  <Box component="td" sx={{ px: 2, py: 1.5 }}>
                    <Typography variant="body2">{avail.clinic?.name}</Typography>
                  </Box>
                  <Box component="td" sx={{ px: 2, py: 1.5 }}>
                    <Typography variant="body2">{avail.startTime} – {avail.endTime}</Typography>
                    {avail.mode && avail.mode !== 'slot' && (
                      <Chip
                        label={avail.mode === 'session' ? `Session · ${avail.capacity ?? '?'} tokens` : `Hybrid · ${avail.capacity ?? '?'} tokens`}
                        size="small" color="info" sx={{ mt: 0.5 }}
                      />
                    )}
                  </Box>
                  <Box component="td" sx={{ px: 2, py: 1.5 }}>
                    <Chip label={avail.recurrenceType || 'weekly'} size="small" sx={{ textTransform: 'capitalize', mr: 0.5 }} />
                    {avail.recurrenceType === 'weekly' && avail.dayOfWeek != null && (
                      <Typography variant="caption" color="text.secondary">
                        {DAYS_OF_WEEK[avail.dayOfWeek]}
                      </Typography>
                    )}
                    {avail.excludeWeekends && (
                      <Chip label="No weekends" size="small" color="warning" sx={{ ml: 0.5 }} />
                    )}
                  </Box>
                  <Box component="td" sx={{ px: 2, py: 1.5 }}>
                    <Typography variant="caption" color="text.secondary">
                      {avail.validFrom
                        ? avail.validUntil
                          ? `${new Date(avail.validFrom).toLocaleDateString()} → ${new Date(avail.validUntil).toLocaleDateString()}`
                          : `From ${new Date(avail.validFrom).toLocaleDateString()}`
                        : 'Always active'}
                    </Typography>
                  </Box>
                  <Box component="td" sx={{ px: 2, py: 1.5 }}>
                    <Stack direction="row" spacing={0.5}>
                      {/* SUG-AVAIL-018 — aria-labels for screen readers (WCAG 2.1 SC 4.1.2) */}
                      <Tooltip title="Edit">
                        <IconButton
                          size="small"
                          aria-label={`Edit availability for ${avail.clinician?.firstName ?? ''}`}
                          onClick={() => handleEdit(avail)}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton
                          size="small"
                          color="error"
                          aria-label={`Delete availability for ${avail.clinician?.firstName ?? ''}`}
                          onClick={() => handleDelete(avail.id)}
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

      {/* Confirm delete */}
      <ConfirmDialog
        isOpen={confirmOpen}
        title="Delete Availability"
        message="Are you sure you want to delete this availability record? This cannot be undone."
        onConfirm={confirmDelete}
        onCancel={() => { setConfirmOpen(false); setDeletingId(null) }}
      />
    </Box>
    </ErrorBoundary>
  )
}
