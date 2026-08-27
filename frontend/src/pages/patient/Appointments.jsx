import React, { useState, useMemo, useEffect } from 'react'
import {
  Box,
  Stack,
  Typography,
  Button,
  Chip,
  Divider,
  Avatar,
  Paper,
  Tab,
  Tabs,
  IconButton,
  Grid,
  TextField,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Rating,
} from '@mui/material'
import { StatusChip, EmptyState, AppointmentsListSkeleton } from '../../components/shared'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import LocationOnIcon from '@mui/icons-material/LocationOn'
import VideocamIcon from '@mui/icons-material/Videocam'
import CancelIcon from '@mui/icons-material/Cancel'
import DownloadIcon from '@mui/icons-material/Download'
import SearchIcon from '@mui/icons-material/Search'
import AddIcon from '@mui/icons-material/Add'
import EventRepeatIcon from '@mui/icons-material/EventRepeat'
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import StarIcon from '@mui/icons-material/Star'
import StarBorderIcon from '@mui/icons-material/StarBorder'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useSnackbar } from 'notistack'
import { useQuery, useMutation, gql } from '@apollo/client'
import dayjs from 'dayjs'
import { APPOINTMENT_FIELDS } from '../../graphql/queries'
import { CANCEL_APPOINTMENT_MUTATION, UPDATE_APPOINTMENT_MUTATION } from '../../graphql/mutations'

// P1-06 — has_review is deliberately NOT added to the shared AppointmentFields
// fragment (every consumer of APPOINTMENTS_QUERY would then pay for it, most
// of them with no use for it) — a local query composing the same fragment
// plus this one extra field, matching ARCH-15/Hard Rule 7's "match the
// contract, don't invent one" while keeping the shared fragment lean.
const MY_APPOINTMENTS_QUERY = gql`
  query Appointments($filters: AppointmentFilters, $first: Int = 20, $page: Int) {
    appointments(filters: $filters, first: $first, page: $page) {
      data {
        ...AppointmentFields
        has_review
      }
      paginatorInfo {
        count
        currentPage
        firstItem
        hasMorePages
        lastItem
        lastPage
        perPage
        total
      }
    }
  }
  ${APPOINTMENT_FIELDS}
`

const SUBMIT_REVIEW_MUTATION = gql`
  mutation SubmitReview($input: CreateReviewInput!) {
    submitReview(input: $input) {
      success
      review {
        id
        stars
        comment
      }
    }
  }
`

// REQ106 — self-scoped via the JWT's own patient_id (see waitlist.service.ts's
// own comment on myWaitlistEntries); never a client-supplied patient id.
const MY_WAITLIST_ENTRIES_QUERY = gql`
  query MyWaitlistEntries {
    myWaitlistEntries {
      id
      waitlist_date
      status
      position
      claim_expires_at
    }
  }
`
const CANCEL_WAITLIST_ENTRY_MUTATION = gql`
  mutation CancelWaitlistEntry($id: ID!) {
    cancelWaitlistEntry(id: $id) {
      success
      userErrors {
        message
      }
    }
  }
`

// F-18 / BUG009. This page rendered four hardcoded appointments while
// backend/src/appointments has been real and tested for months. The UI below is
// good and is kept as-is; only the data source was fabricated.
//
// The card and dialogs consume a flattened, display-ready shape, so rather than
// rewrite them this adapter maps the real GraphQL Appointment onto it. Every
// field comes from the server — including `type`, which drives the Join Call
// button and which the GraphQL layer did not expose until this change (the
// column existed all along; the page had been guessing).
function toCardShape(a) {
  const start = dayjs(a.start_datetime)
  const clinicianName = a.clinician?.full_name ?? 'Clinician'
  return {
    id: a.id,
    date: start.format('YYYY-MM-DD'),
    time: start.format('hh:mm A'),
    doctor: clinicianName,
    specialty: a.clinician?.clinician_type?.name ?? '',
    clinic: a.type === 'video' ? 'Online' : (a.clinic?.name ?? ''),
    type: a.type === 'video' ? 'video' : 'in-person',
    service: a.service?.name ?? 'Consultation',
    // Rupees — converted at the resolver boundary. Null is a real state ("Price
    // TBD"), not a zero.
    price: a.service?.price ?? null,
    status: a.status,
    // P1-06 — explicit boolean coalesce, not truthiness: has_review is a
    // real server-computed value, and BASE-3(d) treats `false` as
    // meaningfully different from "field wasn't selected".
    hasReview: a.has_review ?? false,
    initials: clinicianName
      .split(' ')
      .filter(Boolean)
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase(),
  }
}

// SUG-PTAPPT-003: Receipt handler (passed down from parent)
// SUG-PTAPPT-005: Price null guard
// SUG-PTAPPT-011 / SUG-PTDASH-011: Reschedule handler
// SUG-PTAPPT-012: onViewDetails opens the detail drawer/dialog
function AppointmentCard({ appt, onCancel, onJoinVideo, onReceipt, onReschedule, onViewDetails, onReview, highlighted }) {
  const isUpcoming = ['scheduled', 'confirmed'].includes(appt.status)
  const borderColor =
    appt.status === 'confirmed' ? '#2DC653' : appt.status === 'scheduled' ? '#006D77' : appt.status === 'cancelled' ? '#E63946' : '#D0E8EA'

  return (
    <Paper
      variant="outlined"
      onClick={() => onViewDetails(appt)}
      sx={{
        p: 2.5,
        borderLeft: `4px solid ${borderColor}`,
        borderRadius: 2,
        cursor: 'pointer',
        ...(highlighted ? { boxShadow: '0 0 0 2px #006D77', bgcolor: '#F0FBFB' } : {}),
      }}
    >
      <Grid container spacing={2} alignItems="center">
        <Grid item>
          <Avatar sx={{ width: 44, height: 44, bgcolor: '#006D77', fontWeight: 800 }}>{appt.initials}</Avatar>
        </Grid>
        <Grid item xs>
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }}>
            <Box>
              {/* SUG-PTAPPT-006: noWrap + maxWidth guard for long doctor names */}
              <Typography fontWeight={700} noWrap sx={{ maxWidth: 280 }}>
                {appt.doctor}
              </Typography>
              <Chip label={appt.specialty} size="small" color="primary" variant="outlined" sx={{ mt: 0.25, mr: 1 }} />
              <Chip
                icon={appt.type === 'video' ? <VideocamIcon /> : <LocationOnIcon />}
                label={appt.type === 'video' ? 'Video' : appt.clinic}
                size="small"
                variant="outlined"
                sx={{ mt: 0.25, color: appt.type === 'video' ? '#7C3AED' : undefined }}
              />
            </Box>
            <StatusChip status={appt.status} />
          </Stack>

          <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
            <Stack direction="row" spacing={0.5} alignItems="center">
              <CalendarMonthIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
              <Typography variant="body2" color="text.secondary">
                {appt.date}
              </Typography>
            </Stack>
            <Stack direction="row" spacing={0.5} alignItems="center">
              <AccessTimeIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
              <Typography variant="body2" color="text.secondary">
                {appt.time}
              </Typography>
            </Stack>
            {/* SUG-PTAPPT-005: Null guard for missing price */}
            <Typography variant="body2" color="primary" fontWeight={700}>
              {appt.price != null ? `₹${appt.price}` : 'Price TBD'}
            </Typography>
          </Stack>
        </Grid>

        {/* Actions */}
        <Grid item onClick={(e) => e.stopPropagation()}>
          <Stack direction={{ xs: 'row', sm: 'column' }} spacing={1} alignItems="flex-end">
            {appt.type === 'video' && isUpcoming && (
              <Button
                variant="contained"
                size="small"
                startIcon={<VideocamIcon />}
                onClick={() => onJoinVideo(appt.id)}
                sx={{ bgcolor: '#7C3AED', '&:hover': { bgcolor: '#6D28D9' }, whiteSpace: 'nowrap' }}
              >
                Join Call
              </Button>
            )}
            {/* SUG-PTAPPT-003: Receipt onClick handler */}
            {appt.status === 'completed' && (
              <Button
                variant="outlined"
                size="small"
                startIcon={<DownloadIcon />}
                aria-label={`Download receipt for ${appt.service}`}
                onClick={() => onReceipt(appt)}
              >
                Receipt
              </Button>
            )}
            {/* P1-06 — a submitted review has nothing left to do, so it's a
                status chip, not a disabled button (UI-11 exists to prevent
                a dead disabled button with no explanation; this isn't
                that — there is genuinely no further action here). */}
            {appt.status === 'completed' &&
              (appt.hasReview ? (
                <Chip icon={<StarIcon fontSize="small" />} label="Review submitted" size="small" color="success" variant="outlined" />
              ) : (
                <Button variant="outlined" size="small" startIcon={<StarBorderIcon />} onClick={() => onReview(appt)}>
                  Leave a Review
                </Button>
              ))}
            {/* SUG-PTAPPT-011 / SUG-PTDASH-011: Reschedule button for upcoming appointments */}
            {isUpcoming && (
              <Button
                variant="outlined"
                size="small"
                startIcon={<EventRepeatIcon />}
                onClick={() => onReschedule(appt)}
                aria-label={`Reschedule appointment with ${appt.doctor}`}
              >
                Reschedule
              </Button>
            )}
            {isUpcoming && (
              <Button
                variant="outlined"
                size="small"
                color="error"
                startIcon={<CancelIcon />}
                onClick={() => onCancel(appt.id)}
                aria-label={`Cancel appointment with ${appt.doctor}`}
              >
                Cancel
              </Button>
            )}
          </Stack>
        </Grid>
      </Grid>
    </Paper>
  )
}

export default function PatientAppointments() {
  const navigate = useNavigate()
  const { enqueueSnackbar } = useSnackbar()
  const [searchParams, setSearchParams] = useSearchParams()
  const [tab, setTab] = useState(0)
  const [search, setSearch] = useState('')

  // SUG-PTAPPT-002: Controlled sort state
  const [sortBy, setSortBy] = useState('date')
  // SUG-PTAPPT-008: Sort direction toggle (asc/desc)
  const [sortDir, setSortDir] = useState('asc')

  const [cancelId, setCancelId] = useState(null)

  // REQ106 — Waitlist tab (real data; see MY_WAITLIST_ENTRIES_QUERY's own comment).
  const {
    data: waitlistData,
    loading: waitlistLoading,
    refetch: refetchWaitlist,
  } = useQuery(MY_WAITLIST_ENTRIES_QUERY, {
    fetchPolicy: 'cache-and-network',
  })
  const waitlistEntries = waitlistData?.myWaitlistEntries ?? []
  const [cancelWaitlistEntry, { loading: cancellingWaitlistEntry }] = useMutation(CANCEL_WAITLIST_ENTRY_MUTATION)
  const handleCancelWaitlistEntry = async (id) => {
    try {
      const { data: result } = await cancelWaitlistEntry({ variables: { id } })
      if (result?.cancelWaitlistEntry?.success) {
        enqueueSnackbar('Removed from waitlist', { variant: 'success' })
        await refetchWaitlist()
      } else {
        enqueueSnackbar(result?.cancelWaitlistEntry?.userErrors?.[0]?.message || 'Failed to cancel', { variant: 'error' })
      }
    } catch (e) {
      enqueueSnackbar(e.message || 'Failed to cancel', { variant: 'error' })
    }
  }

  // Self-scoped server-side: appointments.service.ts narrows a `patient` caller
  // to their own patient_id from the JWT, so this returns only this patient's
  // records without the page passing an id (and without being able to ask for
  // anyone else's).
  const { data, loading, error, refetch } = useQuery(MY_APPOINTMENTS_QUERY, {
    variables: { first: 100, page: 1 },
    fetchPolicy: 'cache-and-network',
  })
  const [cancelAppointment, { loading: cancelling }] = useMutation(CANCEL_APPOINTMENT_MUTATION)
  const [updateAppointment, { loading: rescheduling }] = useMutation(UPDATE_APPOINTMENT_MUTATION)

  // No mock fallback: an empty list is a real answer for a patient with no
  // bookings, and must render as such rather than as someone else's data.
  const appointments = useMemo(() => (data?.appointments?.data ?? []).map(toCardShape), [data])

  // SUG-PTAPPT-011 / SUG-PTDASH-011: Reschedule dialog state + query-param handoff from Dashboard
  const [rescheduleAppt, setRescheduleAppt] = useState(null)
  const [rescheduleDate, setRescheduleDate] = useState('')
  const [rescheduleTime, setRescheduleTime] = useState('')
  const [highlightId, setHighlightId] = useState(null)

  // SUG-PTAPPT-012: Appointment detail dialog state
  const [detailAppt, setDetailAppt] = useState(null)

  // P1-06: review submission dialog state
  const [reviewAppt, setReviewAppt] = useState(null)
  const [reviewStars, setReviewStars] = useState(0)
  const [reviewComment, setReviewComment] = useState('')
  const [submitReview, { loading: submittingReview }] = useMutation(SUBMIT_REVIEW_MUTATION)

  // SUG-PTDASH-011: /patient/appointments?reschedule=:id opens the reschedule dialog for that appointment
  useEffect(() => {
    const rescheduleId = searchParams.get('reschedule')
    if (rescheduleId) {
      const target = appointments.find((a) => String(a.id) === String(rescheduleId))
      if (target) {
        setTab(0)
        setRescheduleAppt(target)
        setRescheduleDate(target.date)
        setRescheduleTime(target.time)
        setHighlightId(target.id)
      }
      // Clear the param so refresh/back doesn't keep re-opening the dialog
      setSearchParams(
        (prev) => {
          const p = new URLSearchParams(prev)
          p.delete('reschedule')
          return p
        },
        { replace: true },
      )
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // P1-06: /patient/appointments?review=:id (the post-visit notification's
  // own action_url) opens the review dialog for that appointment directly.
  useEffect(() => {
    const reviewId = searchParams.get('review')
    if (reviewId) {
      const target = appointments.find((a) => String(a.id) === String(reviewId))
      if (target && !target.hasReview) {
        setTab(1)
        setReviewAppt(target)
        setHighlightId(target.id)
      }
      setSearchParams(
        (prev) => {
          const p = new URLSearchParams(prev)
          p.delete('review')
          return p
        },
        { replace: true },
      )
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSubmitReview = async () => {
    if (!reviewAppt || reviewStars < 1) return
    try {
      await submitReview({
        variables: { input: { appointment_id: reviewAppt.id, stars: reviewStars, comment: reviewComment } },
      })
      enqueueSnackbar('Thanks for your feedback!', { variant: 'success' })
      setReviewAppt(null)
      setReviewStars(0)
      setReviewComment('')
      await refetch() // DATA-9 — has_review must reflect the just-submitted review
    } catch (err) {
      enqueueSnackbar(err?.graphQLErrors?.[0]?.message || err.message || 'Could not submit your review', { variant: 'error' })
    }
  }

  const upcoming = appointments.filter((a) => ['scheduled', 'confirmed'].includes(a.status))
  const past = appointments.filter((a) => ['completed', 'cancelled'].includes(a.status))

  const handleCancel = async (id) => {
    try {
      await cancelAppointment({ variables: { id, reason: 'Cancelled by patient' } })
      enqueueSnackbar('Appointment cancelled', { variant: 'success' })
      await refetch()
    } catch (e) {
      // Surface the real reason. A cancellation-policy window or a
      // already-completed appointment are both legitimate server refusals, and
      // the patient needs to see which.
      enqueueSnackbar(e.message || 'Could not cancel this appointment', { variant: 'error' })
    } finally {
      setCancelId(null)
    }
  }

  // SUG-PTAPPT-003: Receipt handler — navigate to receipt page
  const handleReceipt = (appt) => {
    navigate(`/patient/appointments/${appt.id}/receipt`)
  }

  // SUG-PTAPPT-011 / SUG-PTDASH-011: Reschedule handlers
  const handleRescheduleConfirm = async () => {
    if (!rescheduleAppt || !rescheduleDate || !rescheduleTime) return
    // There is no rescheduleAppointment mutation on the backend — the frontend's
    // RESCHEDULE_APPOINTMENT_MUTATION is dead code against the real schema.
    // updateAppointment takes an ISO start_datetime and is the real path.
    const iso = dayjs(`${rescheduleDate} ${rescheduleTime}`, ['YYYY-MM-DD hh:mm A', 'YYYY-MM-DD HH:mm']).toISOString()
    try {
      await updateAppointment({ variables: { id: rescheduleAppt.id, input: { start_datetime: iso } } })
      enqueueSnackbar(`Appointment with ${rescheduleAppt.doctor} rescheduled`, { variant: 'success' })
      await refetch()
      setRescheduleAppt(null)
      setHighlightId(null)
    } catch (e) {
      // Left open on failure so the patient can adjust rather than losing input.
      enqueueSnackbar(e.message || 'Could not reschedule — that slot may no longer be free', { variant: 'error' })
    }
  }

  // SUG-PTAPPT-002 + SUG-PTAPPT-004: search resets on tab change; sort applied via useMemo
  const handleTabChange = (_, v) => {
    setTab(v)
    setSearch('') // Clear search on tab switch (E4 fix)
  }

  const filtered = useMemo(() => {
    const base = (tab === 0 ? upcoming : past).filter(
      (a) => !search || a.doctor.toLowerCase().includes(search.toLowerCase()) || a.specialty.toLowerCase().includes(search.toLowerCase()),
    )
    // SUG-PTAPPT-002: Apply sort
    const sorted = [...base].sort((a, b) => {
      if (sortBy === 'doctor') return a.doctor.localeCompare(b.doctor)
      if (sortBy === 'price') return (a.price ?? 0) - (b.price ?? 0)
      return new Date(a.date) - new Date(b.date) // default: date ascending
    })
    // SUG-PTAPPT-008: Sort direction toggle
    return sortDir === 'desc' ? sorted.reverse() : sorted
  }, [tab, upcoming, past, search, sortBy, sortDir])

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h2" fontWeight={700}>
            My Appointments
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {upcoming.length} upcoming · {past.length} past
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/appointments/book')}>
          Book Appointment
        </Button>
      </Stack>

      {/* Tabs — search resets on switch (SUG-PTAPPT-004) */}
      <Tabs value={tab} onChange={handleTabChange} sx={{ borderBottom: '1px solid #D0E8EA', mb: 2 }}>
        <Tab label={`Upcoming (${upcoming.length})`} />
        <Tab label={`Past (${past.length})`} />
        <Tab label={`Waitlist (${waitlistEntries.length})`} />
      </Tabs>

      {/* REQ106 — Waitlist tab has its own list, not the search/sort/
          AppointmentCard machinery below (a waitlist entry isn't an
          appointment). */}
      {tab === 2 ? (
        waitlistLoading ? (
          <AppointmentsListSkeleton />
        ) : waitlistEntries.length === 0 ? (
          <EmptyState
            icon={CalendarMonthIcon}
            title="No waitlist entries"
            subtitle="When a clinician's date is fully booked, you can join the waitlist from the booking page."
          />
        ) : (
          <Stack spacing={2}>
            {waitlistEntries.map((entry) => (
              <Paper key={entry.id} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography variant="subtitle2" fontWeight={700}>
                      {dayjs(entry.waitlist_date).format('DD MMM YYYY')} — #{entry.position} in queue
                    </Typography>
                    <Chip
                      size="small"
                      sx={{ mt: 0.5, textTransform: 'capitalize' }}
                      label={entry.status}
                      color={entry.status === 'notified' ? 'success' : entry.status === 'waiting' ? 'default' : 'default'}
                    />
                    {entry.status === 'notified' && entry.claim_expires_at && (
                      <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.5 }}>
                        A slot is open — book by {dayjs(entry.claim_expires_at).format('hh:mm A, DD MMM')}
                      </Typography>
                    )}
                  </Box>
                  {['waiting', 'notified'].includes(entry.status) && (
                    <Button
                      size="small"
                      color="error"
                      disabled={cancellingWaitlistEntry}
                      onClick={() => handleCancelWaitlistEntry(entry.id)}
                    >
                      Cancel
                    </Button>
                  )}
                </Stack>
              </Paper>
            ))}
          </Stack>
        )
      ) : null}

      {/* Search + sort — sort is now controlled (SUG-PTAPPT-002) */}
      {tab !== 2 && (
        <>
          <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
            <TextField
              size="small"
              placeholder="Search by doctor or specialty..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ fontSize: 18 }} />
                  </InputAdornment>
                ),
              }}
              sx={{ width: 280 }}
            />
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Sort by</InputLabel>
              <Select value={sortBy} onChange={(e) => setSortBy(e.target.value)} label="Sort by">
                <MenuItem value="date">Date</MenuItem>
                <MenuItem value="doctor">Doctor</MenuItem>
                <MenuItem value="price">Price</MenuItem>
              </Select>
            </FormControl>
            {/* SUG-PTAPPT-008: Sort direction toggle */}
            <IconButton
              size="small"
              onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
              aria-label={sortDir === 'asc' ? 'Sort ascending — click for descending' : 'Sort descending — click for ascending'}
              sx={{ border: '1px solid #D0E8EA', borderRadius: 1.5 }}
            >
              {sortDir === 'asc' ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />}
            </IconButton>
          </Stack>

          {/* List */}
          {error && (
            <Alert
              severity="error"
              sx={{ mb: 2 }}
              action={
                <Button size="small" onClick={() => refetch()}>
                  Retry
                </Button>
              }
            >
              Could not load your appointments: {error.message}
            </Alert>
          )}

          {/* Loading is distinct from empty. Showing the "no appointments — book
          your first" empty state while the query is still in flight would tell a
          patient with a full calendar that they have none. */}
          {loading && appointments.length === 0 ? (
            <AppointmentsListSkeleton />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={CalendarMonthIcon}
              title={tab === 0 ? 'No upcoming appointments' : 'No past appointments'}
              subtitle={tab === 0 ? 'Book your first appointment to get started.' : 'Your completed appointments will appear here.'}
              actionLabel={tab === 0 ? 'Book Appointment' : undefined}
              onAction={tab === 0 ? () => navigate('/appointments/book') : undefined}
            />
          ) : (
            <Stack spacing={2}>
              {filtered.map((appt) => (
                <AppointmentCard
                  key={appt.id}
                  appt={appt}
                  onCancel={(id) => setCancelId(id)} // SUG-PTAPPT-001
                  onJoinVideo={(id) => navigate(`/video/${id}`)}
                  onReceipt={handleReceipt} // SUG-PTAPPT-003
                  onReschedule={(a) => {
                    setRescheduleAppt(a)
                    setRescheduleDate(a.date)
                    setRescheduleTime(a.time)
                  }} // SUG-PTAPPT-011
                  onViewDetails={(a) => setDetailAppt(a)} // SUG-PTAPPT-012
                  onReview={(a) => setReviewAppt(a)} // P1-06
                  highlighted={highlightId === appt.id}
                />
              ))}
            </Stack>
          )}
        </>
      )}

      {/* SUG-PTAPPT-001: Cancel Confirm Dialog */}
      <Dialog open={Boolean(cancelId)} onClose={() => setCancelId(null)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>Cancel Appointment?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Are you sure you want to cancel this appointment? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setCancelId(null)} sx={{ textTransform: 'none' }}>
            Keep Appointment
          </Button>
          <Button
            id="confirm-cancel-btn"
            color="error"
            variant="contained"
            disabled={cancelling}
            onClick={() => handleCancel(cancelId)}
            sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
          >
            Yes, Cancel
          </Button>
        </DialogActions>
      </Dialog>

      {/* SUG-PTAPPT-011 / SUG-PTDASH-011: Reschedule Dialog */}
      <Dialog
        open={Boolean(rescheduleAppt)}
        onClose={() => {
          setRescheduleAppt(null)
          setHighlightId(null)
        }}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ fontWeight: 800 }}>Reschedule Appointment</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {rescheduleAppt && `Currently ${rescheduleAppt.date} at ${rescheduleAppt.time} with ${rescheduleAppt.doctor}.`}
          </Typography>
          <Stack spacing={2}>
            <TextField
              label="New Date"
              type="date"
              fullWidth
              size="small"
              InputLabelProps={{ shrink: true }}
              value={rescheduleDate}
              onChange={(e) => setRescheduleDate(e.target.value)}
            />
            <TextField
              label="New Time"
              type="time"
              fullWidth
              size="small"
              InputLabelProps={{ shrink: true }}
              value={rescheduleTime}
              onChange={(e) => setRescheduleTime(e.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => {
              setRescheduleAppt(null)
              setHighlightId(null)
            }}
            sx={{ textTransform: 'none' }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={!rescheduleDate || !rescheduleTime || rescheduling}
            onClick={handleRescheduleConfirm}
            sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
          >
            Confirm Reschedule
          </Button>
        </DialogActions>
      </Dialog>

      {/* P1-06 — Review Submission Dialog */}
      <Dialog
        open={Boolean(reviewAppt)}
        onClose={() => {
          setReviewAppt(null)
          setReviewStars(0)
          setReviewComment('')
          setHighlightId(null)
        }}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ fontWeight: 800 }}>How was your visit?</DialogTitle>
        <DialogContent>
          {reviewAppt && (
            <>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {reviewAppt.doctor} · {reviewAppt.date}
              </Typography>
              <Stack alignItems="center" sx={{ my: 2 }}>
                <Rating
                  size="large"
                  value={reviewStars}
                  onChange={(_e, value) => setReviewStars(value || 0)}
                  aria-label="Rate your visit out of 5 stars"
                />
              </Stack>
              <TextField
                fullWidth
                multiline
                minRows={3}
                label="Tell us about your visit"
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                inputProps={{ maxLength: 1000 }}
              />
              {/* UI-11 — never a dead disabled button with no explanation */}
              {(reviewStars < 1 || !reviewComment.trim()) && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  {reviewStars < 1 ? 'Select a star rating to continue.' : 'Add a few words about your visit to continue.'}
                </Typography>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => {
              setReviewAppt(null)
              setReviewStars(0)
              setReviewComment('')
              setHighlightId(null)
            }}
            sx={{ textTransform: 'none' }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={reviewStars < 1 || !reviewComment.trim() || submittingReview}
            onClick={handleSubmitReview}
            sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
          >
            Submit Review
          </Button>
        </DialogActions>
      </Dialog>

      {/* SUG-PTAPPT-012: Appointment Detail Dialog */}
      <Dialog
        open={Boolean(detailAppt)}
        onClose={() => setDetailAppt(null)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
          <InfoOutlinedIcon fontSize="small" /> Appointment Details
        </DialogTitle>
        <DialogContent dividers>
          {detailAppt && (
            <Stack spacing={1.5}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Avatar sx={{ bgcolor: '#006D77', fontWeight: 800 }}>{detailAppt.initials}</Avatar>
                <Box>
                  <Typography fontWeight={700}>{detailAppt.doctor}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {detailAppt.specialty}
                  </Typography>
                </Box>
              </Stack>
              <Divider />
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">
                  Service
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {detailAppt.service}
                </Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">
                  Date
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {detailAppt.date}
                </Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">
                  Time
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {detailAppt.time}
                </Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">
                  Location
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {detailAppt.type === 'video' ? 'Video Consultation' : detailAppt.clinic}
                </Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">
                  Price
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {detailAppt.price != null ? `₹${detailAppt.price}` : 'Price TBD'}
                </Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="body2" color="text.secondary">
                  Status
                </Typography>
                <StatusChip status={detailAppt.status} />
              </Stack>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDetailAppt(null)} sx={{ textTransform: 'none', fontWeight: 700 }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
