import React, { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, gql } from '@apollo/client'
import {
  Box,
  Grid,
  Paper,
  Typography,
  Button,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Chip,
  FormControl,
  RadioGroup,
  FormControlLabel,
  Radio,
  TextField,
  Stack,
  ToggleButtonGroup,
  ToggleButton,
  Switch,
  FormGroup,
  CircularProgress,
  Alert,
  Tooltip,
} from '@mui/material'
import { Add, Close, Edit, DeleteOutline, Alarm } from '@mui/icons-material'
import { alpha } from '@mui/material/styles'
import { TimePicker } from '@mui/x-date-pickers/TimePicker'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import dayjs from 'dayjs'
import { useSnackbar } from 'notistack'
import { useAuth } from '../../hooks/useAuth'
import ConfirmDialog from '../../components/ConfirmDialog/ConfirmDialog'

// ─── GraphQL ────────────────────────────────────────────────────────────────

// LOGIN_MUTATION never selects user.clinician, so a freshly-logged-in
// session's cached copy is undefined -- same AuthContext gap worked
// around in clinician/Dashboard.jsx (BUG021) and patient/Profile.jsx. A
// dedicated network-only re-fetch resolves the real link instead of
// silently falling through to the 'clin-1' dev/demo fallback, which
// previously made a real clinician's first-login save/delete of their
// own schedule get rejected outright by the backend's own self-scope
// check (availability.service.ts's assertClinicianAccess).
const GET_MY_CLINICIAN_LINK = gql`
  query GetMyClinicianLinkForAvailability {
    me {
      clinician {
        id
      }
    }
  }
`

const GET_AVAILABILITY_DATA = gql`
  query GetAvailabilityData($clinicianId: ID!) {
    getClinicianAvailability(clinicianId: $clinicianId) {
      id
      dayOfWeek
      startTime
      endTime
      recurrenceType
      validFrom
      validUntil
      roomId
      mode
      capacity
    }
    getLunchBreaks(clinicianId: $clinicianId) {
      id
      dayOfWeek
      startTime
      endTime
    }
    getClinician(id: $clinicianId) {
      id
      clinic {
        id
      }
    }
  }
`

const GET_ROOMS = gql`
  query GetRooms($clinicId: ID!) {
    getRooms(clinicId: $clinicId) {
      id
      name
      roomNumber
    }
  }
`

const SAVE_AVAILABILITY = gql`
  mutation SaveAvailability($input: ClinicianAvailabilityInput!) {
    saveClinicianAvailability(input: $input) {
      id
    }
  }
`

const DELETE_AVAILABILITY = gql`
  mutation DeleteAvailability($id: ID!) {
    deleteClinicianAvailability(id: $id)
  }
`

const SAVE_LUNCH_BREAK = gql`
  mutation SaveLunchBreak($input: LunchBreakInput!) {
    saveLunchBreak(input: $input) {
      id
    }
  }
`

const DELETE_LUNCH_BREAK = gql`
  mutation DeleteLunchBreak($id: ID!) {
    deleteLunchBreak(id: $id)
  }
`

// ─── Constants ─────────────────────────────────────────────────────────────

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

// Day labels: disambiguated with 2-letter codes (SUG-CLAVAIL-010)
const DAY_LABELS = ['M', 'Tu', 'W', 'Th', 'F', 'Sa', 'Su']
const DAY_FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

// NEW-CLAVAIL-014: Format duration from HH:mm strings (e.g. '09:00' → '17:00' = '8h')
function formatDuration(startTime, endTime) {
  const [sh, sm] = startTime.split(':').map(Number)
  const [eh, em] = endTime.split(':').map(Number)
  const totalMins = eh * 60 + em - (sh * 60 + sm)
  if (totalMins <= 0) return null
  const h = Math.floor(totalMins / 60)
  const m = totalMins % 60
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

// ─── Mock Data (BUG-CLAVAIL-001 / SUG-CLAVAIL-002) ─────────────────────────
// Items are tagged with _type so the grid can distinguish slots from lunches
// without relying on fragile ID-substring checks (ISSUE-S3-003 fix)
const MOCK_AVAILABILITY = [
  {
    _type: 'slot',
    id: 'av-mock-1',
    dayOfWeek: '0',
    startTime: '09:00',
    endTime: '17:00',
    recurrenceType: 'weekly',
    validFrom: null,
    validUntil: null,
    roomId: null,
  },
  {
    _type: 'slot',
    id: 'av-mock-2',
    dayOfWeek: '1',
    startTime: '09:00',
    endTime: '17:00',
    recurrenceType: 'weekly',
    validFrom: null,
    validUntil: null,
    roomId: null,
  },
  {
    _type: 'slot',
    id: 'av-mock-3',
    dayOfWeek: '2',
    startTime: '09:00',
    endTime: '13:00',
    recurrenceType: 'weekly',
    validFrom: null,
    validUntil: null,
    roomId: null,
  },
  {
    _type: 'slot',
    id: 'av-mock-4',
    dayOfWeek: '3',
    startTime: '10:00',
    endTime: '18:00',
    recurrenceType: 'weekly',
    validFrom: null,
    validUntil: null,
    roomId: null,
  },
  {
    _type: 'slot',
    id: 'av-mock-5',
    dayOfWeek: '4',
    startTime: '09:00',
    endTime: '15:00',
    recurrenceType: 'weekly',
    validFrom: null,
    validUntil: null,
    roomId: null,
  },
]
const MOCK_LUNCHES = [{ _type: 'lunch', id: 'lunch-mock-1', dayOfWeek: 'daily', startTime: '12:30', endTime: '13:30' }]

// ─── Overlap Detection Helper (SUG-CLAVAIL-007) ─────────────────────────────
// Returns the first conflicting slot object (or null) so we can show its details (SUG-CLAVAIL-012)
function findOverlap(newSlot, existingSlots) {
  return (
    existingSlots.find((slot) => {
      if (slot.id === newSlot.id) return false
      // slot.dayOfWeek is a real number (backend Int); newSlot.dayOfWeek comes
      // from formData.day_of_week, a string -- Number() both sides so this
      // conflict check actually fires instead of silently never matching.
      const sameDay =
        Number(slot.dayOfWeek) === Number(newSlot.dayOfWeek) || slot.recurrenceType === 'daily' || newSlot.recurrenceType === 'daily'
      if (!sameDay) return false
      return newSlot.startTime < slot.endTime && newSlot.endTime > slot.startTime
    }) || null
  )
}

// ─── Default form states ────────────────────────────────────────────────────
const defaultSlotForm = () => ({
  recurrence_type: 'weekly',
  day_of_week: '0',
  start_time: dayjs().hour(9).minute(0),
  end_time: dayjs().hour(17).minute(0),
  room_id: '',
  valid_from: null,
  valid_until: null,
  exclude_weekends: false,
  mode: 'slot',
  capacity: '',
  overbook_allowance: 0,
})

const defaultLunchForm = () => ({
  day_of_week: 'daily',
  start_time: dayjs().hour(12).minute(30),
  end_time: dayjs().hour(13).minute(30),
})

// ─── Helper: tag API response items with _type ──────────────────────────────
// Ensures grid type detection is reliable regardless of ID format (ISSUE-S3-003 fix)
const tagSlots = (arr) => (arr || []).map((s) => ({ ...s, _type: 'slot' }))
const tagLunches = (arr) => (arr || []).map((l) => ({ ...l, _type: 'lunch' }))

// ─── Component ──────────────────────────────────────────────────────────────

export default function ClinicianAvailability() {
  const { user } = useAuth()
  const { enqueueSnackbar } = useSnackbar()

  // SUG-CLAVAIL-008: Minimum spinner visibility
  const [minSpinnerDone, setMinSpinnerDone] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setMinSpinnerDone(true), 300)
    return () => clearTimeout(t)
  }, [])

  // ── Slot drawer state ──────────────────────────────────────────────────
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editSlot, setEditSlot] = useState(null)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState(defaultSlotForm())

  // BUG-CLAVAIL-003: MUI ConfirmDialog state for slot delete
  const [deleteSlotTarget, setDeleteSlotTarget] = useState(null)

  // ── Lunch break state ────────────────────────────────────────────────
  const [lunchDrawerOpen, setLunchDrawerOpen] = useState(false)
  const [editLunch, setEditLunch] = useState(null)
  const [savingLunch, setSavingLunch] = useState(false)
  const [lunchForm, setLunchForm] = useState(defaultLunchForm())
  const [deleteLunchTarget, setDeleteLunchTarget] = useState(null)

  // ── Queries ────────────────────────────────────────────────────────────
  // Real fix (found during REQ013/PLAN023 Phase A re-audit): this used to read
  // user?.id, which is the caller's own UserProfiles id (the JWT subject) --
  // never the same value as Clinicians.id (its own independent UUID PK, see
  // schema.prisma). Every real, linked clinician's Availability page was
  // silently querying/writing under the wrong id: getClinicianAvailability
  // returned a real, empty (not mocked) result for a real clinician with real
  // configured availability, live-confirmed via a real login (Sarah Mitchell,
  // 2 real slots) -- user.id got 0 rows, user.clinician.id got both. The
  // 'clin-1' dev/demo fallback (for a non-clinician role, e.g. an admin
  // visiting this route) is kept as the final fallback only, after a real
  // network re-fetch has had a chance to resolve the caller's own link.
  const { data: myLinkData } = useQuery(GET_MY_CLINICIAN_LINK, { fetchPolicy: 'network-only', skip: !!user?.clinician?.id })
  const clinicianId = user?.clinician?.id ?? myLinkData?.me?.clinician?.id ?? 'clin-1'
  const {
    data: avData,
    loading: avLoading,
    error: avError,
    refetch,
  } = useQuery(GET_AVAILABILITY_DATA, {
    variables: { clinicianId },
    fetchPolicy: 'cache-and-network',
  })

  const clinicId = avData?.getClinician?.clinic?.id

  const { data: roomData } = useQuery(GET_ROOMS, {
    variables: { clinicId },
    skip: !clinicId,
  })

  // ── Mutations ──────────────────────────────────────────────────────────
  const [saveAvailability] = useMutation(SAVE_AVAILABILITY)
  const [deleteAvailability] = useMutation(DELETE_AVAILABILITY)
  const [saveLunchBreak] = useMutation(SAVE_LUNCH_BREAK)
  const [deleteLunchBreak] = useMutation(DELETE_LUNCH_BREAK)

  // ── Derived data (BUG-CLAVAIL-001: mock fallback on error) ─────────────
  // ISSUE-S3-003 fix: tag items with _type so grid detection is reliable
  // BUG-CLIN-007 fix: use mock when data is absent (error OR silent timeout)
  const useMockAvData = avError || (!avLoading && !avData)
  const availabilities = useMemo(
    () => (useMockAvData ? MOCK_AVAILABILITY : tagSlots(avData?.getClinicianAvailability)),
    [avData, useMockAvData],
  )

  const lunchBreaks = useMemo(() => (useMockAvData ? MOCK_LUNCHES : tagLunches(avData?.getLunchBreaks)), [avData, useMockAvData])

  const rooms = useMemo(() => roomData?.getRooms ?? [], [roomData])

  // ── Slot overlap check (SUG-CLAVAIL-007 + SUG-CLAVAIL-012) ─────────────
  const conflictingSlot = useMemo(() => {
    if (!drawerOpen) return null
    const newSlot = {
      id: editSlot?.id ?? null,
      dayOfWeek: formData.day_of_week,
      startTime: formData.start_time?.format('HH:mm') ?? '00:00',
      endTime: formData.end_time?.format('HH:mm') ?? '00:00',
      recurrenceType: formData.recurrence_type,
    }
    return findOverlap(newSlot, availabilities)
  }, [drawerOpen, formData, availabilities, editSlot])

  // ── Validity range cross-validation (SUG-CLAVAIL-004) ─────────────────
  const isDateRangeInvalid = useMemo(
    () => !!(formData.valid_from && formData.valid_until && formData.valid_until.isBefore(formData.valid_from)),
    [formData.valid_from, formData.valid_until],
  )

  // ── End time check ────────────────────────────────────────────────────
  const isEndBeforeStart = formData.end_time && formData.start_time && formData.end_time.isBefore(formData.start_time)

  // ── Slot drawer handlers ───────────────────────────────────────────────
  const handleOpenDrawer = (dayIndex = 0, slot = null) => {
    if (slot) {
      setEditSlot(slot)
      setFormData({
        recurrence_type: slot.recurrenceType || 'weekly',
        day_of_week: slot.dayOfWeek,
        start_time: dayjs(`2024-01-01T${slot.startTime}`),
        end_time: dayjs(`2024-01-01T${slot.endTime}`),
        room_id: slot.roomId || '',
        valid_from: slot.validFrom ? dayjs(slot.validFrom) : null,
        valid_until: slot.validUntil ? dayjs(slot.validUntil) : null,
        exclude_weekends: false,
        mode: slot.mode || 'slot',
        capacity: slot.capacity ?? '',
        overbook_allowance: 0,
      })
    } else {
      setEditSlot(null)
      setFormData((prev) => ({
        ...defaultSlotForm(),
        // SUG-CLAVAIL-013: preserve last-selected day_of_week across calls
        day_of_week: String(dayIndex),
        room_id: rooms.length > 0 ? rooms[0].id : '',
      }))
    }
    setDrawerOpen(true)
  }

  const handleCloseDrawer = () => {
    setDrawerOpen(false)
    setEditSlot(null)
  }

  const handleChange = (field, value) => setFormData((prev) => ({ ...prev, [field]: value }))

  // SUG-CLAVAIL-013: When recurrence type changes, preserve day_of_week
  const handleRecurrenceChange = (newType) => {
    setFormData((prev) => ({ ...prev, recurrence_type: newType }))
    // day_of_week is preserved because we only update recurrence_type
  }

  const handleSave = async () => {
    if (formData.mode !== 'slot' && (!formData.capacity || Number(formData.capacity) < 1)) {
      enqueueSnackbar('Session/hybrid mode needs a capacity of at least 1 token.', { variant: 'error' })
      return
    }
    setSaving(true)
    try {
      const input = {
        clinicianId,
        recurrenceType: formData.recurrence_type,
        dayOfWeek: formData.day_of_week,
        startTime: formData.start_time.format('HH:mm'),
        endTime: formData.end_time.format('HH:mm'),
        roomId: formData.room_id || null,
        validFrom: formData.valid_from ? formData.valid_from.format('YYYY-MM-DD') : null,
        validUntil: formData.valid_until ? formData.valid_until.format('YYYY-MM-DD') : null,
        mode: formData.mode,
        capacity: formData.mode !== 'slot' ? Number(formData.capacity) : null,
        overbookAllowance: formData.mode !== 'slot' ? Number(formData.overbook_allowance) || 0 : 0,
      }
      if (editSlot) input.id = editSlot.id
      await saveAvailability({ variables: { input } })
      await refetch()
      handleCloseDrawer()
      enqueueSnackbar('Availability slot saved successfully.', { variant: 'success' })
    } catch (err) {
      console.error(err)
      enqueueSnackbar('Failed to save availability: ' + (err.message || 'Unknown error'), { variant: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteSlot = (id) => setDeleteSlotTarget(id)

  const confirmDeleteSlot = async () => {
    try {
      await deleteAvailability({ variables: { id: deleteSlotTarget } })
      await refetch()
      // ISSUE-S3-008 fix: close drawer after successful delete
      if (editSlot?.id === deleteSlotTarget) handleCloseDrawer()
      enqueueSnackbar('Slot deleted.', { variant: 'info' })
    } catch (err) {
      console.error(err)
      enqueueSnackbar('Failed to delete slot.', { variant: 'error' })
    } finally {
      setDeleteSlotTarget(null)
    }
  }

  // ── Lunch break handlers (BUG-CLAVAIL-002) ────────────────────────────
  const handleOpenLunchDrawer = (lb = null) => {
    if (lb) {
      setEditLunch(lb)
      setLunchForm({
        day_of_week: lb.dayOfWeek,
        start_time: dayjs(`2024-01-01T${lb.startTime}`),
        end_time: dayjs(`2024-01-01T${lb.endTime}`),
      })
    } else {
      setEditLunch(null)
      setLunchForm(defaultLunchForm())
    }
    setLunchDrawerOpen(true)
  }

  const handleCloseLunchDrawer = () => {
    setLunchDrawerOpen(false)
    setEditLunch(null)
  }

  const handleSaveLunch = async () => {
    setSavingLunch(true)
    try {
      const input = {
        clinicianId,
        dayOfWeek: lunchForm.day_of_week,
        startTime: lunchForm.start_time.format('HH:mm'),
        endTime: lunchForm.end_time.format('HH:mm'),
      }
      if (editLunch) input.id = editLunch.id
      await saveLunchBreak({ variables: { input } })
      await refetch()
      handleCloseLunchDrawer()
      enqueueSnackbar('Lunch break saved.', { variant: 'success' })
    } catch (err) {
      console.error(err)
      enqueueSnackbar('Failed to save lunch break: ' + (err.message || 'Unknown error'), { variant: 'error' })
    } finally {
      setSavingLunch(false)
    }
  }

  const handleDeleteLunch = (id) => setDeleteLunchTarget(id)

  const confirmDeleteLunch = async () => {
    try {
      await deleteLunchBreak({ variables: { id: deleteLunchTarget } })
      await refetch()
      // ISSUE-S3-008 fix: close lunch drawer if we deleted the item we were editing
      if (editLunch?.id === deleteLunchTarget) handleCloseLunchDrawer()
      enqueueSnackbar('Lunch break deleted.', { variant: 'info' })
    } catch (err) {
      console.error(err)
      enqueueSnackbar('Failed to delete lunch break.', { variant: 'error' })
    } finally {
      setDeleteLunchTarget(null)
    }
  }

  const isLunchEndBeforeStart = lunchForm.end_time && lunchForm.start_time && lunchForm.end_time.isBefore(lunchForm.start_time)

  // ── Render helpers ────────────────────────────────────────────────────
  // Real fix (found during REQ013/PLAN023 Phase A re-audit): dayOfWeek comes
  // back from the real backend as a nullable Int (ClinicianAvailabilitySlotType/
  // LunchBreakSlotType), never as the stringified digit or 'daily' sentinel
  // used only on the *write* side (ClinicianAvailabilityInput/LunchBreakInput,
  // both plain String). The old String(dayIndex)/dayName/'daily' comparisons
  // never matched real numeric data at all -- every weekly (non-daily)
  // availability slot silently never appeared in this grid, live-confirmed via
  // a real linked clinician login (2 real weekly slots, day_of_week 1 and 2,
  // neither rendered). A lunch break's "every day" is dayOfWeek: null on read
  // (see saveLunchBreak: isDaily ? null : parseInt(...)) -- availability slots
  // instead carry an explicit, independently-set recurrenceType for that.
  const renderDaySchedule = (dayName, dayIndex) => {
    const matchingAvails = availabilities.filter((a) => a.recurrenceType === 'daily' || a.dayOfWeek === dayIndex)
    const matchingLunches = lunchBreaks.filter((lb) => lb.dayOfWeek == null || lb.dayOfWeek === dayIndex)
    const sortedItems = [...matchingAvails, ...matchingLunches].sort((a, b) => a.startTime.localeCompare(b.startTime))

    return (
      <Grid item xs={1} key={dayIndex} sx={{ minWidth: 140 }}>
        <Paper
          elevation={0}
          sx={{
            p: 1.5,
            height: '100%',
            minHeight: 280,
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 2,
            bgcolor: 'action.hover',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Typography
            variant="subtitle2"
            fontWeight={800}
            color="text.secondary"
            mb={2}
            align="center"
            sx={{ textTransform: 'uppercase', letterSpacing: 1 }}
          >
            {dayName}
          </Typography>
          <Box flexGrow={1}>
            {sortedItems.map((item, idx) => {
              // ISSUE-S3-003 fix: use _type field instead of fragile id-substring check
              if (item._type === 'lunch') {
                return (
                  <Box
                    key={`lb-${idx}`}
                    sx={{
                      bgcolor: 'warning.light',
                      border: '1px dashed',
                      borderColor: 'warning.main',
                      borderRadius: 1.5,
                      p: 1,
                      mb: 1,
                    }}
                  >
                    <Typography variant="caption" color="warning.dark" fontWeight={700} display="block">
                      LUNCH
                    </Typography>
                    <Typography variant="caption" color="warning.dark" fontWeight={600}>
                      {dayjs(`2000-01-01T${item.startTime}`).format('h:mm A')} – {dayjs(`2000-01-01T${item.endTime}`).format('h:mm A')}
                    </Typography>
                  </Box>
                )
              }
              // SUG-CLAVAIL-009: null guard for room name
              const roomObj = rooms.find((r) => r.id === item.roomId)
              const roomName = roomObj ? (roomObj.name || 'Unnamed Room') + ` (Room ${roomObj.roomNumber})` : 'Consulting Room'

              // NEW-CLAVAIL-014: compute duration for badge
              const durationLabel = formatDuration(item.startTime, item.endTime)
              return (
                <Tooltip
                  key={item.id}
                  title={`Edit ${dayjs(`2000-01-01T${item.startTime}`).format('h:mm A')} – ${dayjs(`2000-01-01T${item.endTime}`).format('h:mm A')} · ${roomName}`}
                  placement="top"
                >
                  <Box
                    sx={{
                      bgcolor: 'primary.main',
                      color: 'white',
                      borderRadius: 1.5,
                      p: 1.5,
                      mb: 1,
                      cursor: 'pointer',
                      transition: 'transform 0.1s, box-shadow 0.1s',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                      '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 4px 8px rgba(0,0,0,0.15)', opacity: 0.95 },
                    }}
                    onClick={() => handleOpenDrawer(dayIndex, item)}
                  >
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={0.5}>
                      <Typography variant="body2" fontWeight={800} letterSpacing={0.5}>
                        {dayjs(`2000-01-01T${item.startTime}`).format('h:mm A')} — {dayjs(`2000-01-01T${item.endTime}`).format('h:mm A')}
                      </Typography>
                      {/* NEW-CLAVAIL-014: duration badge */}
                      {durationLabel && (
                        <Typography
                          variant="caption"
                          sx={{
                            bgcolor: 'rgba(255,255,255,0.2)',
                            borderRadius: 1,
                            px: 0.75,
                            py: '2px',
                            fontWeight: 700,
                            lineHeight: 1.4,
                            flexShrink: 0,
                            ml: 0.5,
                          }}
                        >
                          {durationLabel}
                        </Typography>
                      )}
                    </Box>
                    <Typography variant="caption" sx={{ opacity: 0.85, display: 'block', lineHeight: 1.2 }}>
                      {roomName}
                    </Typography>
                  </Box>
                </Tooltip>
              )
            })}
          </Box>
          <Button
            size="small"
            startIcon={<Add />}
            onClick={() => handleOpenDrawer(dayIndex)}
            fullWidth
            variant="outlined"
            sx={{ mt: 2, bgcolor: 'white', borderStyle: 'dashed' }}
          >
            Add Slot
          </Button>
        </Paper>
      </Grid>
    )
  }

  // ── Early returns ─────────────────────────────────────────────────────
  // SUG-CLAVAIL-008: minimum 300ms spinner
  if (avLoading || !minSpinnerDone) {
    return (
      <Box p={4} display="flex" justifyContent="center" alignItems="center" minHeight={300}>
        <CircularProgress />
      </Box>
    )
  }

  // NEW-CLAVAIL-016: Total slot + lunch break count for summary header
  const totalSlots = availabilities.filter((a) => a._type === 'slot').length
  const totalLunches = lunchBreaks.length

  // ── Main render ───────────────────────────────────────────────────────
  return (
    <Box p={{ xs: 2, md: 4 }} maxWidth="xl" mx="auto">
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Box>
          <Typography variant="h4" fontWeight={800} gutterBottom>
            Availability Setup
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Configure your working hours, recurring blocks, and lunch breaks.
          </Typography>
          {/* NEW-CLAVAIL-016: at-a-glance summary */}
          <Box display="flex" gap={1} mt={1}>
            <Chip
              size="small"
              label={`${totalSlots} slot${totalSlots !== 1 ? 's' : ''}`}
              sx={{ bgcolor: 'primary.light', color: 'primary.dark', fontWeight: 700, fontSize: '0.72rem' }}
            />
            <Chip
              size="small"
              label={`${totalLunches} lunch break${totalLunches !== 1 ? 's' : ''}`}
              sx={{ bgcolor: 'warning.light', color: 'warning.dark', fontWeight: 700, fontSize: '0.72rem' }}
            />
          </Box>
        </Box>
      </Box>

      {/* BUG-CLAVAIL-001: Soft warning banner instead of full-page error */}
      {avError && (
        <Alert
          severity="warning"
          sx={{ mb: 3, borderRadius: 2 }}
          action={
            <Button size="small" color="inherit" onClick={() => refetch()}>
              Retry
            </Button>
          }
        >
          <strong>Offline mode</strong> — could not connect to server ({avError.message}). Showing demo data — changes will not be saved
          until reconnected.
        </Alert>
      )}

      {/* 7-DAY GRID */}
      <Box sx={{ overflowX: 'auto', pb: 2 }}>
        <Grid container spacing={2} sx={{ width: 'max-content', minWidth: '100%' }}>
          {DAYS.map((dayName, dayIndex) => renderDaySchedule(dayName, dayIndex))}
        </Grid>
      </Box>

      {/* LUNCH BREAKS SECTION */}
      <Paper elevation={0} sx={{ p: 3, mt: 4, border: '1px solid', borderColor: 'divider', borderRadius: 3, maxWidth: 600 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6" fontWeight={700}>
            Standard Lunch Breaks
          </Typography>
          <Button size="small" variant="text" startIcon={<Add />} onClick={() => handleOpenLunchDrawer()}>
            Add Break
          </Button>
        </Box>

        {/* SUG-CLAVAIL-011: proper empty state */}
        {lunchBreaks.length === 0 ? (
          <Box
            sx={{
              textAlign: 'center',
              py: 4,
              px: 2,
              border: '1.5px dashed',
              borderColor: 'divider',
              borderRadius: 2,
              bgcolor: 'action.hover',
            }}
          >
            <Alarm sx={{ fontSize: 36, color: 'text.disabled', mb: 1 }} />
            <Typography variant="body2" color="text.secondary" fontWeight={600}>
              No lunch breaks configured
            </Typography>
            <Typography variant="caption" color="text.disabled" display="block" mb={2}>
              Add a recurring lunch break to block off time during the day.
            </Typography>
            <Button size="small" variant="outlined" startIcon={<Add />} onClick={() => handleOpenLunchDrawer()}>
              Add First Break
            </Button>
          </Box>
        ) : (
          <List disablePadding>
            {lunchBreaks.map((lb, idx) => (
              <ListItem key={lb.id} divider={idx !== lunchBreaks.length - 1} sx={{ px: 0 }}>
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: 'warning.light', color: 'warning.dark' }}>
                    <Alarm />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Typography variant="subtitle2" fontWeight={600}>
                      {dayjs(`2000-01-01T${lb.startTime}`).format('h:mm A')} — {dayjs(`2000-01-01T${lb.endTime}`).format('h:mm A')}
                    </Typography>
                  }
                  secondary={
                    <Typography variant="caption" color="text.secondary">
                      Every {lb.dayOfWeek == null ? 'Day' : (DAYS[lb.dayOfWeek] ?? lb.dayOfWeek)}
                    </Typography>
                  }
                />
                <Chip size="small" label="Recurring" color="default" variant="outlined" />
                <IconButton size="small" sx={{ ml: 2 }} onClick={() => handleOpenLunchDrawer(lb)}>
                  <Edit fontSize="small" />
                </IconButton>
                <IconButton size="small" color="error" onClick={() => handleDeleteLunch(lb.id)}>
                  <DeleteOutline fontSize="small" />
                </IconButton>
              </ListItem>
            ))}
          </List>
        )}
      </Paper>

      {/* ── SLOT DRAWER ────────────────────────────────────────────── */}
      {/* ISSUE-S3-007 fix: drawer uses flex column layout so buttons stay at bottom */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={handleCloseDrawer}
        PaperProps={{
          sx: {
            width: { xs: '100%', sm: 480 },
            p: 3,
            borderRadius: '24px 0 0 24px',
            display: 'flex',
            flexDirection: 'column',
          },
        }}
      >
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
          <Typography variant="h5" fontWeight={800}>
            {editSlot ? 'Edit Slot' : 'New Availability Slot'}
          </Typography>
          <IconButton onClick={handleCloseDrawer}>
            <Close />
          </IconButton>
        </Box>

        {/* Scrollable form body */}
        <Box sx={{ flex: 1, overflowY: 'auto', pr: 0.5 }}>
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <Stack spacing={4}>
              {/* 1. Recurrence */}
              <FormControl>
                <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                  1. Recurrence Pattern
                </Typography>
                <RadioGroup
                  row
                  value={formData.recurrence_type}
                  onChange={(e) => handleRecurrenceChange(e.target.value)}
                  sx={{
                    bgcolor: 'action.hover',
                    p: 1,
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                    '& .MuiFormControlLabel-root': { flex: 1, m: 0 },
                  }}
                >
                  <FormControlLabel value="single" control={<Radio size="small" />} label={<Typography variant="body2">Once</Typography>} />
                  <FormControlLabel value="daily" control={<Radio size="small" />} label={<Typography variant="body2">Daily</Typography>} />
                  <FormControlLabel
                    value="weekly"
                    control={<Radio size="small" />}
                    label={
                      <Typography variant="body2" fontWeight={600}>
                        Weekly
                      </Typography>
                    }
                  />
                  <FormControlLabel
                    value="monthly"
                    control={<Radio size="small" />}
                    label={<Typography variant="body2">Monthly</Typography>}
                  />
                </RadioGroup>
              </FormControl>

              {/* 2. Day selector (weekly only) — SUG-CLAVAIL-010 + SUG-CLAVAIL-013 */}
              {formData.recurrence_type === 'weekly' && (
                <Box>
                  <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                    Select Repeat Day
                  </Typography>
                  <ToggleButtonGroup
                    value={formData.day_of_week}
                    exclusive
                    size="small"
                    fullWidth
                    onChange={(e, val) => val && handleChange('day_of_week', val)}
                  >
                    {DAY_LABELS.map((label, i) => (
                      <Tooltip key={i} title={DAY_FULL[i]} placement="top">
                        <ToggleButton value={String(i)}>{label}</ToggleButton>
                      </Tooltip>
                    ))}
                  </ToggleButtonGroup>
                </Box>
              )}

              {/* 3. Time Block */}
              <Box>
                <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                  2. Time Block
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <TimePicker
                      label="Start Time"
                      value={formData.start_time}
                      onChange={(val) => handleChange('start_time', val)}
                      sx={{ width: '100%' }}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TimePicker
                      label="End Time"
                      value={formData.end_time}
                      onChange={(val) => handleChange('end_time', val)}
                      sx={{ width: '100%' }}
                    />
                  </Grid>
                </Grid>
                {isEndBeforeStart && (
                  <Alert severity="error" sx={{ mt: 1, py: 0 }}>
                    End time must be after start time
                  </Alert>
                )}
                {/* SUG-CLAVAIL-007 + SUG-CLAVAIL-012: show conflicting slot's times */}
                {conflictingSlot && !isEndBeforeStart && (
                  <Alert severity="warning" sx={{ mt: 1, py: 0 }}>
                    Overlaps with existing slot {dayjs(`2000-01-01T${conflictingSlot.startTime}`).format('h:mm A')}–
                    {dayjs(`2000-01-01T${conflictingSlot.endTime}`).format('h:mm A')}
                    {conflictingSlot.dayOfWeek !== 'any'
                      ? ` (${DAYS[Number(conflictingSlot.dayOfWeek)] || conflictingSlot.dayOfWeek})`
                      : ''}
                    . You can still save.
                  </Alert>
                )}
                {/* SUG-DT-006: live 12h preview — shows selected times in h:mm A format */}
                {(formData.start_time || formData.end_time) && !isEndBeforeStart && (
                  <Box sx={{ mt: 1, px: 1.5, py: 0.75, bgcolor: (t) => alpha(t.palette.primary.main, 0.08), borderRadius: 2, border: '1px solid', borderColor: (t) => alpha(t.palette.primary.main, 0.3) }}>
                    <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 700 }}>
                      Selected: {formData.start_time ? formData.start_time.format('h:mm A') : '—'}
                      {' – '}
                      {formData.end_time ? formData.end_time.format('h:mm A') : '—'}
                    </Typography>
                  </Box>
                )}
              </Box>

              {/* REQ017: scheduling mode */}
              <Box>
                <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                  Scheduling Mode
                </Typography>
                <RadioGroup
                  row
                  value={formData.mode}
                  onChange={(e) => handleChange('mode', e.target.value)}
                  sx={{
                    bgcolor: 'action.hover',
                    p: 1,
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                    '& .MuiFormControlLabel-root': { flex: 1, m: 0 },
                  }}
                >
                  <FormControlLabel
                    value="slot"
                    control={<Radio size="small" />}
                    label={<Typography variant="body2">Fixed slots</Typography>}
                  />
                  <FormControlLabel
                    value="session"
                    control={<Radio size="small" />}
                    label={<Typography variant="body2">Session / token</Typography>}
                  />
                </RadioGroup>
                {formData.mode === 'session' && (
                  <Grid container spacing={2} sx={{ mt: 0.5 }}>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        size="small"
                        type="number"
                        label="Capacity (tokens)"
                        inputProps={{ min: 1 }}
                        value={formData.capacity}
                        onChange={(e) => handleChange('capacity', e.target.value)}
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        size="small"
                        type="number"
                        label="Overbook allowance"
                        inputProps={{ min: 0 }}
                        value={formData.overbook_allowance}
                        onChange={(e) => handleChange('overbook_allowance', e.target.value)}
                      />
                    </Grid>
                  </Grid>
                )}
              </Box>

              {/* 4. Location */}
              <Box>
                <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                  3. Location
                </Typography>
                <TextField
                  select
                  fullWidth
                  label="Consulting Room"
                  value={formData.room_id}
                  onChange={(e) => handleChange('room_id', e.target.value)}
                  SelectProps={{ native: true }}
                >
                  <option value="" disabled>
                    Select a room...
                  </option>
                  {rooms.map((r) => (
                    // SUG-CLAVAIL-009: null guard
                    <option key={r.id} value={r.id}>
                      {r.name || 'Unnamed Room'} (Room {r.roomNumber})
                    </option>
                  ))}
                </TextField>
              </Box>

              {/* 5. Validity Period (non-single) */}
              {formData.recurrence_type !== 'single' && (
                <Box>
                  <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                    4. Validity Range (Optional)
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <DatePicker
                        label="Valid From"
                        value={formData.valid_from}
                        onChange={(val) => handleChange('valid_from', val)}
                        slotProps={{ textField: { fullWidth: true } }}
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <DatePicker
                        label="Valid Until"
                        value={formData.valid_until}
                        onChange={(val) => handleChange('valid_until', val)}
                        slotProps={{ textField: { fullWidth: true } }}
                      />
                    </Grid>
                  </Grid>
                  {/* SUG-CLAVAIL-004: cross-date validation */}
                  {isDateRangeInvalid && (
                    <Alert severity="error" sx={{ mt: 1, py: 0 }}>
                      "Valid Until" must be after "Valid From"
                    </Alert>
                  )}

                  {formData.recurrence_type === 'daily' && (
                    <FormGroup sx={{ mt: 2 }}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={formData.exclude_weekends}
                            onChange={(e) => handleChange('exclude_weekends', e.target.checked)}
                          />
                        }
                        label={<Typography variant="body2">Exclude Weekends</Typography>}
                      />
                    </FormGroup>
                  )}
                </Box>
              )}
            </Stack>
          </LocalizationProvider>
        </Box>

        {/* Sticky action row — ISSUE-S3-007 fix: pinned at bottom via flex layout */}
        <Stack
          direction="row"
          justifyContent="space-between"
          sx={{ mt: 3, pt: 3, borderTop: '1px solid', borderColor: 'divider', flexShrink: 0 }}
        >
          {editSlot ? (
            <Button color="error" onClick={() => handleDeleteSlot(editSlot.id)} disabled={saving}>
              Delete
            </Button>
          ) : (
            <Box />
          )}
          <Stack direction="row" gap={2}>
            <Button onClick={handleCloseDrawer} disabled={saving} variant="outlined">
              Cancel
            </Button>
            <Button variant="contained" onClick={handleSave} disabled={saving || isEndBeforeStart || isDateRangeInvalid}>
              {saving ? 'Saving…' : 'Save Slot'}
            </Button>
          </Stack>
        </Stack>
      </Drawer>

      {/* ── LUNCH BREAK DRAWER ────────────────────────────────────── */}
      {/* ISSUE-S3-007 fix: flex column for proper sticky buttons */}
      <Drawer
        anchor="right"
        open={lunchDrawerOpen}
        onClose={handleCloseLunchDrawer}
        PaperProps={{
          sx: {
            width: { xs: '100%', sm: 400 },
            p: 3,
            borderRadius: '24px 0 0 24px',
            display: 'flex',
            flexDirection: 'column',
          },
        }}
      >
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
          <Typography variant="h5" fontWeight={800}>
            {editLunch ? 'Edit Lunch Break' : 'New Lunch Break'}
          </Typography>
          <IconButton onClick={handleCloseLunchDrawer}>
            <Close />
          </IconButton>
        </Box>

        <Box sx={{ flex: 1, overflowY: 'auto', pr: 0.5 }}>
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <Stack spacing={3}>
              <Box>
                <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                  Applies To
                </Typography>
                <TextField
                  select
                  fullWidth
                  label="Day"
                  value={lunchForm.day_of_week}
                  onChange={(e) => setLunchForm((p) => ({ ...p, day_of_week: e.target.value }))}
                  SelectProps={{ native: true }}
                >
                  <option value="daily">Every Day</option>
                  {DAYS.map((d, i) => (
                    <option key={i} value={String(i)}>
                      {d}
                    </option>
                  ))}
                </TextField>
              </Box>
              <Box>
                <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                  Time Block
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <TimePicker
                      label="Start Time"
                      value={lunchForm.start_time}
                      onChange={(val) => setLunchForm((p) => ({ ...p, start_time: val }))}
                      sx={{ width: '100%' }}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TimePicker
                      label="End Time"
                      value={lunchForm.end_time}
                      onChange={(val) => setLunchForm((p) => ({ ...p, end_time: val }))}
                      sx={{ width: '100%' }}
                    />
                  </Grid>
                </Grid>
                {isLunchEndBeforeStart && (
                  <Alert severity="error" sx={{ mt: 1, py: 0 }}>
                    End time must be after start time
                  </Alert>
                )}
              </Box>
            </Stack>
          </LocalizationProvider>
        </Box>

        {/* NEW-CLAVAIL-015: Delete button in lunch edit drawer action row */}
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          sx={{ mt: 3, pt: 3, borderTop: '1px solid', borderColor: 'divider', flexShrink: 0 }}
        >
          {editLunch ? (
            <Button color="error" onClick={() => handleDeleteLunch(editLunch.id)} disabled={savingLunch}>
              Delete
            </Button>
          ) : (
            <Box />
          )}
          <Stack direction="row" gap={2}>
            <Button onClick={handleCloseLunchDrawer} disabled={savingLunch} variant="outlined">
              Cancel
            </Button>
            <Button variant="contained" onClick={handleSaveLunch} disabled={savingLunch || isLunchEndBeforeStart}>
              {savingLunch ? 'Saving…' : 'Save Break'}
            </Button>
          </Stack>
        </Stack>
      </Drawer>

      {/* ── CONFIRM DIALOGS (BUG-CLAVAIL-003) ─────────────────────── */}
      <ConfirmDialog
        isOpen={!!deleteSlotTarget}
        title="Delete Availability Slot"
        message="Are you sure you want to delete this availability slot? This action cannot be undone."
        onConfirm={confirmDeleteSlot}
        onCancel={() => setDeleteSlotTarget(null)}
      />
      <ConfirmDialog
        isOpen={!!deleteLunchTarget}
        title="Delete Lunch Break"
        message="Are you sure you want to delete this lunch break?"
        onConfirm={confirmDeleteLunch}
        onCancel={() => setDeleteLunchTarget(null)}
      />
    </Box>
  )
}
