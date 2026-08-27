import React, { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, gql } from '@apollo/client'
import {
  Box,
  Stepper,
  Step,
  StepLabel,
  Button,
  Typography,
  Paper,
  Grid,
  TextField,
  ToggleButtonGroup,
  ToggleButton,
  Card,
  CardContent,
  Chip,
  Select,
  MenuItem,
  Alert,
  FormControlLabel,
  Checkbox,
  Avatar,
  CircularProgress,
  FormControl,
  InputLabel,
  Divider,
  Rating,
} from '@mui/material'
import { CheckCircle, RadioButtonChecked, RadioButtonUnchecked, Payment, LocalHospital, Videocam } from '@mui/icons-material'
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import dayjs from 'dayjs'
import { useSnackbar } from 'notistack'

import { useAuth } from '../../hooks/useAuth'

// India market — Razorpay for patient payments (CLAUDE.md's fixed-vendor
// rule; Stripe is reserved for tenant SaaS-subscription billing only).
// Loads Razorpay's own Checkout widget rather than collecting card details
// directly (REQ004) — no PCI card-data handling in this app's own code.
function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true)
      return
    }
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

const GET_CLINICIAN_AND_PRODUCTS = gql`
  query GetClinicianAndProducts($id: ID!) {
    getClinician(id: $id) {
      id
      name
      clinicianType
      rating
      reviews
      clinic {
        id
        name
      }
    }
    getClinicianAvailability(clinicianId: $id) {
      id
      dayOfWeek
      startTime
      endTime
      recurrenceType
      mode
    }
    getProducts(clinicianId: $id) {
      id
      name
      description
      price
      product_type
      variations {
        id
        name
        price
      }
      cancellation_rules {
        id
        hoursNoticeRequired
      }
    }
  }
`

const GET_APPOINTMENTS = gql`
  query GetAppointments($clinicianId: ID!, $date: String!) {
    getAppointments(clinicianId: $clinicianId, date: $date) {
      id
      startTime
      endTime
    }
  }
`

// REQ017 — session/token mode. A session/hybrid-mode day has no discrete
// slots to offer (see availability.service.ts's availableSlots(), which
// deliberately skips generating them for these windows); this is what
// drives the "join this session" card in place of the time-slot grid.
const SESSION_AVAILABILITY_QUERY = gql`
  query GetSessionAvailability($clinician_id: ID!, $date: Date!, $service_id: ID) {
    sessionAvailability(clinician_id: $clinician_id, date: $date, service_id: $service_id) {
      mode
      capacity
      overbookAllowance
      bookedCount
      remaining
      isFull
      estimatedWaitMinutes
      startTime
      endTime
    }
  }
`

// REQ105 — best-effort, UX-level origin check for an embedded ?widget=
// link. Not a security boundary (the real one would be a server-set
// X-Frame-Options/CSP frame-ancestors header, out of scope for this
// slice) — this only avoids a confusing broken-looking booking flow when
// a widget is loaded somewhere it was never allowlisted for.
const VALIDATE_BOOKING_WIDGET_EMBED = gql`
  query ValidateBookingWidgetEmbed($slug: String!, $origin: String!) {
    validateBookingWidgetEmbed(slug: $slug, origin: $origin)
  }
`

// Named bookPatientAppointment (not createAppointment) deliberately -- this
// page's camelCase input shape (clinicianId/productId/variationId/patientDetails)
// collides with the canonical snake_case createAppointment/AppointmentInput
// used by appointments/create.jsx's BookingWizard, which already has real
// production callers. GraphQL can't have two resolvers/input types sharing
// one name, so this page (which had zero backend before) got the new name
// instead of the already-live canonical mutation
// (context/backend-api-requirements-master-plan.md Phase P8).
const BOOK_PATIENT_APPOINTMENT = gql`
  mutation BookPatientAppointment($input: BookPatientAppointmentInput!) {
    bookPatientAppointment(input: $input) {
      id
    }
  }
`

// P1-05 (BOOK-2) — reserves a slot for this browser before the patient has
// finished the rest of the wizard. Deliberately not the correctness
// backstop (the backend's own EXCLUDE constraint is that) — held slots
// already come back disabled via getAppointments (BOOK-6's own "show as
// unavailable, don't hide" pattern), so this rejecting is a genuine race
// between two patients within the same polling window, not the common case.
const HOLD_PUBLIC_SLOT = gql`
  mutation HoldPublicSlot($clinicianId: ID!, $date: String!, $startTime: String!) {
    holdPublicSlot(clinicianId: $clinicianId, date: $date, startTime: $startTime) {
      holdToken
      expiresAt
    }
  }
`

const RELEASE_PUBLIC_SLOT = gql`
  mutation ReleasePublicSlot($clinicianId: ID!, $date: String!, $startTime: String!, $holdToken: String!) {
    releasePublicSlot(clinicianId: $clinicianId, date: $date, startTime: $startTime, holdToken: $holdToken)
  }
`

// P1-05 (BOOK-3, BOOK-18) — one idempotency key per in-progress booking
// attempt, persisted so a resubmit after a crash/reload (not just a
// same-session double-tap, which BOOK-4's own submit-disable already
// prevents) reuses it rather than minting a second one. Cleared once a
// booking actually succeeds (bookingComplete()) or the patient picks a
// different slot (a genuinely new attempt earns a genuinely new key).
const IDEMPOTENCY_KEY_STORAGE_KEY = 'medibook_booking_idempotency_key'

function getOrCreateIdempotencyKey() {
  try {
    const existing = window.localStorage.getItem(IDEMPOTENCY_KEY_STORAGE_KEY)
    if (existing) return existing
    const fresh =
      window.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`
    window.localStorage.setItem(IDEMPOTENCY_KEY_STORAGE_KEY, fresh)
    return fresh
  } catch {
    // localStorage can throw (private-mode Safari, storage disabled) — a
    // same-session-only key still stops a same-session double-tap via
    // BOOK-4's own submit-disable; only cross-reload resumability is lost.
    return window.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`
  }
}

function clearIdempotencyKey() {
  try {
    window.localStorage.removeItem(IDEMPOTENCY_KEY_STORAGE_KEY)
  } catch {
    // Nothing to clean up if it never persisted in the first place.
  }
}

// P1-05 (BOOK-2) — "Slot held for 9:45", ticking every second from a real
// server-issued expiry, never a client-only guess.
function HoldCountdown({ expiresAt, onExpire }) {
  const [remainingMs, setRemainingMs] = useState(() => expiresAt.getTime() - Date.now())

  useEffect(() => {
    const tick = () => setRemainingMs(expiresAt.getTime() - Date.now())
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [expiresAt])

  useEffect(() => {
    if (remainingMs <= 0) onExpire?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remainingMs <= 0])

  const totalSeconds = Math.max(0, Math.floor(remainingMs / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return (
    <Alert severity={totalSeconds <= 60 ? 'warning' : 'info'} sx={{ mb: 2 }}>
      Slot held for {minutes}:{String(seconds).padStart(2, '0')} — complete your booking before it's released.
    </Alert>
  )
}

const CREATE_RAZORPAY_ORDER = gql`
  mutation CreateRazorpayOrder($appointmentId: ID!) {
    createRazorpayOrder(appointmentId: $appointmentId) {
      razorpay_order_id
      amount
      currency
      razorpay_key_id
    }
  }
`

const VERIFY_RAZORPAY_PAYMENT = gql`
  mutation VerifyRazorpayPayment($input: VerifyRazorpayPaymentInput!) {
    verifyRazorpayPayment(input: $input) {
      success
      message
    }
  }
`

// REQ106 — canonical/admin dialect (snake_case, {success, userErrors, entity}),
// same as every other new domain module this session — deliberately not the
// public camelCase dialect the rest of this page uses, since joining a
// waitlist requires a real, authenticated patient account (see REQ106's own
// "deliberately NOT anonymous" scope note), the same boundary every other
// canonical-dialect operation in this codebase sits behind.
const JOIN_WAITLIST = gql`
  mutation JoinWaitlist($input: JoinWaitlistInput!) {
    joinWaitlist(input: $input) {
      success
      userErrors {
        message
      }
      waitlistEntry {
        id
        position
      }
    }
  }
`

function CustomStepIcon(props) {
  const { active, completed, className } = props

  if (completed) {
    return <CheckCircle color="primary" className={className} />
  }
  if (active) {
    return <RadioButtonChecked color="primary" className={className} />
  }
  return <RadioButtonUnchecked color="disabled" className={className} />
}

const steps = ['Select Time', 'Your Details', 'Choose Service', 'Review and Pay']

const PaymentForm = ({ bookingData, clinician, handleBack, price, holdToken, onBookingSuccess }) => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [razorpayReady, setRazorpayReady] = useState(false)
  const [acceptedPolicy, setAcceptedPolicy] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  // P1-05 (BOOK-3, BOOK-18) — stable for this mount, and reused across a
  // retry of this exact flow (e.g. Razorpay verification fails and the
  // patient hits "Pay" again) so createAppointment's own idempotency
  // no-op returns the SAME appointment rather than a duplicate.
  const idempotencyKey = useMemo(() => getOrCreateIdempotencyKey(), [])

  const [bookPatientAppointment] = useMutation(BOOK_PATIENT_APPOINTMENT)
  const [createRazorpayOrder] = useMutation(CREATE_RAZORPAY_ORDER)
  const [verifyRazorpayPayment] = useMutation(VERIFY_RAZORPAY_PAYMENT)

  useEffect(() => {
    loadRazorpayScript().then(setRazorpayReady)
  }, [])

  const handlePayAndBook = async () => {
    setLoading(true)
    setErrorMsg('')

    try {
      // 1. Book Appointment
      const apptRes = await bookPatientAppointment({
        variables: {
          input: {
            clinicianId: clinician.id,
            productId: bookingData.product.id,
            variationId: bookingData.variation?.id,
            date: bookingData.date.format('YYYY-MM-DD'),
            startTime: bookingData.slot,
            endTime: dayjs(`${bookingData.date.format('YYYY-MM-DD')}T${bookingData.slot}`)
              .add(30, 'minute')
              .format('HH:mm'),
            // BookPatientAppointmentInput.type only accepts in_person/video/
            // home_visit; the toggle group's own local value is 'inperson'
            // (no underscore), which always failed this DTO's @IsIn check.
            type: bookingData.appointmentType === 'inperson' ? 'in_person' : bookingData.appointmentType,
            // PatientDetailsInput only defines firstName/lastName/email/phone —
            // dateOfBirth/reason/notes have nowhere to go on the real schema
            // (the resolver hardcodes reason: '' server-side either way) and
            // GraphQL rejects any extra key on an input object outright, so
            // sending bookingData.patient verbatim broke every real booking.
            patientDetails: {
              firstName: bookingData.patient.firstName,
              lastName: bookingData.patient.lastName,
              email: bookingData.patient.email,
              phone: bookingData.patient.phone,
            },
            idempotencyKey,
            holdToken: holdToken || undefined,
          },
        },
      })
      const appointmentId = apptRes.data.bookPatientAppointment.id

      // 2. Create a real Razorpay order (amount is derived server-side from
      // the appointment's product price, never sent from the client).
      const orderRes = await createRazorpayOrder({ variables: { appointmentId } })
      const order = orderRes.data.createRazorpayOrder

      // 3. Open Razorpay's own Checkout widget — card/UPI/wallet details
      // never touch this app's own code (no PCI scope here).
      await new Promise((resolve, reject) => {
        const rzp = new window.Razorpay({
          key: order.razorpay_key_id,
          order_id: order.razorpay_order_id,
          amount: order.amount,
          currency: order.currency,
          name: 'HealthSync',
          description: bookingData.product?.name,
          prefill: {
            name: `${bookingData.patient.firstName} ${bookingData.patient.lastName}`.trim(),
            email: bookingData.patient.email,
            contact: bookingData.patient.phone,
          },
          handler: async (response) => {
            try {
              // 4. Server-side HMAC verification — never trust the
              // client-reported "payment succeeded" state.
              const verifyRes = await verifyRazorpayPayment({
                variables: {
                  input: {
                    razorpay_order_id: response.razorpay_order_id,
                    razorpay_payment_id: response.razorpay_payment_id,
                    razorpay_signature: response.razorpay_signature,
                  },
                },
              })
              if (!verifyRes.data.verifyRazorpayPayment.success) {
                reject(new Error(verifyRes.data.verifyRazorpayPayment.message || 'Payment verification failed'))
                return
              }
              resolve()
            } catch (err) {
              reject(err)
            }
          },
          modal: { ondismiss: () => reject(new Error('Payment cancelled')) },
        })
        rzp.open()
      })

      // Success — only now is this booking attempt truly done, so only now
      // does the idempotency key (and the hold, already consumed
      // server-side) get retired; a retry of an earlier failed step (order
      // creation, verification) up to this point correctly reused both.
      onBookingSuccess?.()
      navigate('/patient/appointments', { state: { bookingSuccess: true } })
    } catch (err) {
      setErrorMsg(err.message || 'Payment failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box>
      <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Review Booking
        </Typography>
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={6}>
            <Typography variant="body2" color="text.secondary">
              Date & Time
            </Typography>
            <Typography variant="body1" fontWeight={500}>
              {bookingData.date.format('DD/MM/YYYY')} at {bookingData.slot ? dayjs(`2000-01-01T${bookingData.slot}`).format('h:mm A') : ''}
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body2" color="text.secondary">
              Clinician
            </Typography>
            <Typography variant="body1" fontWeight={500}>
              {clinician.name}
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body2" color="text.secondary">
              Clinic
            </Typography>
            <Typography variant="body1" fontWeight={500}>
              {clinician.clinic?.name || 'Online'}
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body2" color="text.secondary">
              Service
            </Typography>
            <Typography variant="body1" fontWeight={500}>
              {bookingData.product?.name}
            </Typography>
          </Grid>
          <Grid item xs={12}>
            <Divider sx={{ my: 1 }} />
            <Box display="flex" justifyContent="space-between" alignItems="center" mt={1}>
              <Typography variant="subtitle1" fontWeight={600}>
                Total Due
              </Typography>
              <Typography variant="h5" color="primary.main" fontWeight={700}>
                ₹{price}
              </Typography>
            </Box>
          </Grid>
        </Grid>

        <Typography variant="subtitle2" gutterBottom>
          Payment
        </Typography>
        <Alert severity="info" sx={{ mb: 2 }}>
          You'll be prompted to pay ₹{price} via Razorpay's secure checkout (cards, UPI, wallets) — card and UPI details are entered on
          Razorpay's own screen, never on this page.
        </Alert>

        {errorMsg && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {errorMsg}
          </Alert>
        )}

        <FormControlLabel
          control={<Checkbox checked={acceptedPolicy} onChange={(e) => setAcceptedPolicy(e.target.checked)} />}
          label="I accept the cancellation policy"
        />
      </Paper>

      <Box display="flex" justifyContent="space-between" mt={4}>
        <Button onClick={handleBack} disabled={loading} variant="outlined">
          Back
        </Button>
        <Button
          variant="contained"
          size="large"
          startIcon={<Payment />}
          onClick={handlePayAndBook}
          disabled={!razorpayReady || !acceptedPolicy || loading}
        >
          {loading ? <CircularProgress size={24} color="inherit" /> : `Confirm and Pay ₹${price}`}
        </Button>
      </Box>
    </Box>
  )
}

export default function BookingWizard() {
  // BUG011: '/appointments/book' has no :clinicianId route segment (see
  // App.jsx) -- useParams().clinicianId was always undefined here, so this
  // page always fell back to a hardcoded mock clinician regardless of which
  // real doctor the visitor was sent to book. The real, only-ever-supplied
  // identifier is the ?doctor= query string (DoctorProfile's "Book
  // Appointment" button, and every direct/shared booking link).
  const { clinicianId: routeClinicianId } = useParams()
  const [searchParams] = useSearchParams()
  const clinicianId = routeClinicianId || searchParams.get('doctor') || undefined
  const location = useLocation()
  const { user, isAuthenticated, hasRole } = useAuth()
  const navigate = useNavigate()
  const { enqueueSnackbar } = useSnackbar()

  // REQ106 — waitlist join state, only ever reachable for an authenticated
  // patient (see JOIN_WAITLIST's own comment on why this is the canonical
  // dialect, not the public one the rest of this page uses).
  const [joinWaitlist, { loading: joiningWaitlist }] = useMutation(JOIN_WAITLIST)
  const [waitlistJoinedFor, setWaitlistJoinedFor] = useState(null) // `${clinicianId}:${date}` once joined
  const handleJoinWaitlist = async () => {
    const dateStr = bookingData.date.format('YYYY-MM-DD')
    try {
      const { data } = await joinWaitlist({ variables: { input: { clinician_id: clinicianId, date: dateStr } } })
      if (data?.joinWaitlist?.success) {
        setWaitlistJoinedFor(`${clinicianId}:${dateStr}`)
        enqueueSnackbar(`You're #${data.joinWaitlist.waitlistEntry.position} on the waitlist for this date.`, { variant: 'success' })
      } else {
        enqueueSnackbar(data?.joinWaitlist?.userErrors?.[0]?.message || 'Failed to join waitlist', { variant: 'error' })
      }
    } catch (err) {
      enqueueSnackbar(err?.graphQLErrors?.[0]?.message || err.message, { variant: 'error' })
    }
  }

  const [activeStep, setActiveStep] = useState(0)
  const [bookingData, setBookingData] = useState({
    date: dayjs(),
    slot: null,
    appointmentType: 'inperson',
    patient: {
      firstName: '',
      lastName: '',
      dateOfBirth: null,
      email: '',
      phone: '',
      reason: '',
      notes: '',
    },
    product: null,
    variation: null,
  })

  // P1-05 (BOOK-2) — the currently-held slot, if any. Cleared (and the hold
  // released) whenever the patient picks a different slot, on successful
  // booking, or on unmount.
  const [hold, setHold] = useState(null) // { token, expiresAt: Date, clinicianId, date, startTime } | null
  const [holdMutation] = useMutation(HOLD_PUBLIC_SLOT)
  const [releaseMutation] = useMutation(RELEASE_PUBLIC_SLOT)

  const releaseHold = (target) => {
    if (!target) return
    releaseMutation({
      variables: { clinicianId: target.clinicianId, date: target.date, startTime: target.startTime, holdToken: target.token },
    }).catch(() => {
      // Best-effort — the TTL is the real backstop (BOOK-2's own comment
      // above), so a failed release is never worth surfacing to the patient.
    })
  }

  const selectSlot = async (slot) => {
    releaseHold(hold)
    setHold(null)
    setBookingData((prev) => ({ ...prev, slot }))
    try {
      const dateStr = bookingData.date.format('YYYY-MM-DD')
      const { data } = await holdMutation({ variables: { clinicianId, date: dateStr, startTime: slot } })
      const result = data?.holdPublicSlot
      if (result) {
        setHold({ token: result.holdToken, expiresAt: new Date(result.expiresAt), clinicianId, date: dateStr, startTime: slot })
      }
    } catch (err) {
      // Someone else took it in the gap between the last poll and this
      // click — a genuine race, not a bug. The slot stays selected in the
      // UI (harmless) but with no hold behind it; the real backstop is
      // still the EXCLUDE constraint at booking time, so this is a
      // heads-up, not a block.
      enqueueSnackbar(err?.graphQLErrors?.[0]?.message || "That slot was just taken — you can still try it, or pick another.", {
        variant: 'warning',
      })
    }
  }

  // Release on unmount (covers navigating away within the SPA) — best
  // effort, matching BOOK-2's own "UX, not correctness" framing; a hard
  // tab close is caught by the server-side TTL instead, not this.
  useEffect(() => {
    return () => releaseHold(hold)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hold])

  const handleHoldExpired = () => {
    setHold(null)
    setBookingData((prev) => ({ ...prev, slot: null }))
    setActiveStep(0)
    enqueueSnackbar('Your held slot expired — please choose another time.', { variant: 'warning' })
  }

  // Pre-fill state from location.state if navigated from DoctorProfile
  useEffect(() => {
    if (location.state && location.state.clinicianId === clinicianId) {
      setBookingData((prev) => ({
        ...prev,
        date: location.state.date ? dayjs(location.state.date) : dayjs(),
        slot: location.state.time || null,
        appointmentType: location.state.type || 'inperson',
      }))
    }
  }, [location.state, clinicianId])

  // Pre-fill user data if authenticated
  useEffect(() => {
    if (user && activeStep === 1 && !bookingData.patient.firstName) {
      setBookingData((prev) => ({
        ...prev,
        patient: {
          ...prev.patient,
          firstName: user.firstName || user.name?.split(' ')[0] || '',
          lastName: user.lastName || user.name?.split(' ').slice(1).join(' ') || '',
          email: user.email || '',
          phone: user.phone || '',
        },
      }))
    }
  }, [user, activeStep])

  const {
    data: qData,
    loading: qLoading,
    error: qError,
  } = useQuery(GET_CLINICIAN_AND_PRODUCTS, {
    variables: { id: clinicianId },
    skip: !clinicianId,
  })

  const { data: aData } = useQuery(GET_APPOINTMENTS, {
    variables: { clinicianId, date: bookingData.date.format('YYYY-MM-DD') },
    skip: !clinicianId || !bookingData.date || activeStep !== 0,
  })

  // REQ017: does the selected date fall on a session/hybrid-mode window for
  // this clinician? availableSlots-style day-of-week matching, mirroring
  // availability.service.ts's own filter so the two never disagree.
  const isSessionDay = useMemo(() => {
    if (!qData?.getClinicianAvailability?.length) return false
    const dow = bookingData.date.day()
    return qData.getClinicianAvailability.some(
      (a) => (Number(a.dayOfWeek) === dow || a.recurrenceType === 'daily') && a.mode && a.mode !== 'slot',
    )
  }, [qData, bookingData.date])

  const { data: sessionData, loading: sessionLoading } = useQuery(SESSION_AVAILABILITY_QUERY, {
    variables: { clinician_id: clinicianId, date: bookingData.date.format('YYYY-MM-DD'), service_id: bookingData.product?.id },
    skip: !clinicianId || !bookingData.date || activeStep !== 0 || !isSessionDay,
    fetchPolicy: 'network-only',
  })

  // REQ105 — only relevant when actually iframed with a ?widget= slug.
  // document.referrer is empty for a direct visit (not embedded) and can
  // also be empty inside a real iframe if the parent page sets a strict
  // referrer-policy — that's a known, accepted limitation (skip, don't
  // block) rather than a false-positive rejection.
  const widgetSlug = searchParams.get('widget')
  const isEmbedded = typeof window !== 'undefined' && window.self !== window.top
  const embedOrigin = useMemo(() => {
    if (!document.referrer) return null
    try {
      return new URL(document.referrer).origin
    } catch {
      return null
    }
  }, [])
  const { data: embedValidation, loading: embedValidationLoading } = useQuery(VALIDATE_BOOKING_WIDGET_EMBED, {
    variables: { slug: widgetSlug, origin: embedOrigin },
    skip: !isEmbedded || !widgetSlug || !embedOrigin,
  })
  const embedBlocked =
    isEmbedded && widgetSlug && embedOrigin && !embedValidationLoading && embedValidation?.validateBookingWidgetEmbed === false

  const handleNext = () => setActiveStep((prev) => prev + 1)
  const handleBack = () => setActiveStep((prev) => prev - 1)

  const handlePatientChange = (field, value) => {
    setBookingData((prev) => ({
      ...prev,
      patient: { ...prev.patient, [field]: value },
    }))
  }

  const getStepContent = (step) => {
    switch (step) {
      case 0:
        return renderStep0()
      case 1:
        return renderStep1()
      case 2:
        return renderStep2()
      case 3:
        return renderStep3()
      default:
        return 'Unknown step'
    }
  }

  // REQ017 US-CAL-01/02/03 — session/token mode has no discrete time slot to
  // pick; the patient joins the session and gets a token number once
  // booked, with a simple booked-count-based wait estimate shown up front
  // (the more sophisticated live-throughput ETA needs REQ019/REQ020's real
  // checked_in→completed data and is out of scope for this slice).
  const renderSessionCard = () => {
    const session = sessionData?.sessionAvailability
    if (sessionLoading) {
      return (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress size={28} />
        </Box>
      )
    }
    if (!session) {
      return (
        <Alert severity="info" sx={{ mt: 1 }}>
          No session available on this date. Please select another date.
        </Alert>
      )
    }
    const joined = bookingData.slot === session.startTime
    return (
      <Card variant="outlined" sx={{ borderRadius: 3, borderColor: joined ? 'primary.main' : 'divider' }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={700}>
            {dayjs(`2000-01-01T${session.startTime}`).format('h:mm A')} – {dayjs(`2000-01-01T${session.endTime}`).format('h:mm A')} session
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Token-based — you'll get a queue number, not a fixed appointment time
          </Typography>
          <Box display="flex" gap={1} mb={2} flexWrap="wrap">
            <Chip
              size="small"
              label={session.isFull ? 'Fully booked' : `${session.remaining} spot${session.remaining === 1 ? '' : 's'} left`}
              color={session.isFull ? 'error' : 'success'}
            />
            {!session.isFull && (
              <Chip
                size="small"
                variant="outlined"
                label={`Token #${session.bookedCount + 1} · ~${session.estimatedWaitMinutes} min wait`}
              />
            )}
          </Box>
          <Button
            fullWidth
            variant={joined ? 'contained' : 'outlined'}
            disabled={session.isFull}
            // P1-05 — deliberately not holdSlot()'d: a session/hybrid window
            // shares one time across many patients under a capacity count,
            // not an exclusive reservation, so an exclusive hold here would
            // wrongly serialize concurrent joins for no reason. Matches the
            // backend's own "slot mode only" scope for both the hold and the
            // EXCLUDE constraint it backstops.
            onClick={() => setBookingData({ ...bookingData, slot: session.startTime })}
          >
            {session.isFull ? 'Session full' : joined ? 'Session selected' : 'Join this session'}
          </Button>
        </CardContent>
      </Card>
    )
  }

  const renderStep0 = () => {
    // clinicianId is always real by this point -- the top-level !clinicianId
    // guard above returns before the stepper ever renders.
    const clinician = qData?.getClinician
    if (!clinician) return <Alert severity="warning">Clinician not found</Alert>

    const availableSlots = () => {
      if (!qData?.getClinicianAvailability?.length) return []
      // BUG011: getClinicianAvailability returns dayOfWeek as a real Int
      // (0=Sunday..6=Saturday, matching dayjs().day() and the backend's own
      // availableSlots() getUTCDay() convention) -- this used to compare it
      // against a day-NAME string ('Monday', etc) with ===, which a number
      // can never strictly equal. Real availability never matched, for any
      // clinician, on any day; every booking silently used the hardcoded
      // 09:00-17:00 mock fallback above instead.
      const dow = bookingData.date.day()
      const dayAvailabilities = qData.getClinicianAvailability.filter((a) => Number(a.dayOfWeek) === dow || a.recurrenceType === 'daily')

      let slots = []
      dayAvailabilities.forEach((avail) => {
        let current = dayjs(`${bookingData.date.format('YYYY-MM-DD')}T${avail.startTime}`)
        const end = dayjs(`${bookingData.date.format('YYYY-MM-DD')}T${avail.endTime}`)
        while (current.isBefore(end)) {
          slots.push(current.format('HH:mm'))
          current = current.add(30, 'minute')
        }
      })
      return slots
    }

    const slots = availableSlots()
    const existingApps = aData?.getAppointments?.map((a) => dayjs(a.startTime).format('HH:mm')) || []

    return (
      <Box>
        <Paper
          elevation={0}
          sx={{ p: 2, mb: 4, display: 'flex', alignItems: 'center', gap: 2, border: '1px solid', borderColor: 'divider', borderRadius: 3 }}
        >
          <Avatar
            src={`https://www.gravatar.com/avatar/${clinician.id}?d=mp&s=100`}
            alt={`${clinician.name}'s profile photo`}
            sx={{ width: 64, height: 64 }}
          />
          <Box>
            {/* P1-03 (CI-7, A11Y) — this page has no other heading before
                it anywhere in the DOM; axe-core's real heading-order check
                flagged the h6 default as skipping straight past h1-h5.
                component="h1" keeps the h6 visual size while making this
                the page's real, single top-level heading. */}
            <Typography variant="h6" component="h1" fontWeight={700}>
              {clinician.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {clinician.clinicianType || 'Doctor'}
            </Typography>
            {/* P1-06 — absent, not a fake "0.0", when nobody has reviewed yet */}
            {clinician.reviews > 0 && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
                <Rating value={clinician.rating ?? 0} precision={0.1} readOnly size="small" aria-label={`Rated ${clinician.rating} out of 5 stars`} />
                <Typography variant="caption" color="text.secondary">
                  ({clinician.reviews})
                </Typography>
              </Box>
            )}
          </Box>
        </Paper>

        <Typography variant="subtitle1" gutterBottom fontWeight={600}>
          Consultation Type
        </Typography>
        <ToggleButtonGroup
          fullWidth
          value={bookingData.appointmentType}
          exclusive
          onChange={(e, val) => val && setBookingData({ ...bookingData, appointmentType: val, slot: null })}
          sx={{ mb: 4 }}
        >
          <ToggleButton value="inperson">
            <LocalHospital sx={{ mr: 1 }} fontSize="small" /> In-Person
          </ToggleButton>
          <ToggleButton value="video">
            <Videocam sx={{ mr: 1 }} fontSize="small" /> Video Consultation
          </ToggleButton>
        </ToggleButtonGroup>

        <Typography variant="subtitle1" gutterBottom fontWeight={600}>
          Select Date & Time
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, p: 1 }}>
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DateCalendar
                  value={bookingData.date}
                  onChange={(newDate) => setBookingData({ ...bookingData, date: newDate, slot: null })}
                />
              </LocalizationProvider>
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Box>
              {isSessionDay ? (
                renderSessionCard()
              ) : slots.length > 0 ? (
                <Grid container spacing={1}>
                  {slots.map((slot) => (
                    <Grid item xs={4} sm={3} md={4} key={slot}>
                      <Button
                        fullWidth
                        variant={bookingData.slot === slot ? 'contained' : 'outlined'}
                        size="medium"
                        onClick={() => selectSlot(slot)}
                        disabled={existingApps.includes(slot)}
                        sx={{ py: 1 }}
                      >
                        {dayjs(`2000-01-01T${slot}`).format('h:mm A')}
                      </Button>
                    </Grid>
                  ))}
                </Grid>
              ) : (
                <Alert severity="info" sx={{ mt: 1 }}>
                  No availability for this date. Please select another date.
                  {/* REQ106 -- deliberately NOT anonymous (see JOIN_WAITLIST's own
                      comment): a real patient-linked account is required, so an
                      anonymous visitor sees a login prompt instead of the action. */}
                  {clinicianId &&
                    (isAuthenticated && hasRole('patient') ? (
                      waitlistJoinedFor === `${clinicianId}:${bookingData.date.format('YYYY-MM-DD')}` ? (
                        <Box sx={{ mt: 1 }}>
                          <Chip label="You're on the waitlist for this date" size="small" color="success" />
                        </Box>
                      ) : (
                        <Box sx={{ mt: 1 }}>
                          <Button size="small" variant="outlined" disabled={joiningWaitlist} onClick={handleJoinWaitlist}>
                            Join Waitlist
                          </Button>
                        </Box>
                      )
                    ) : (
                      <Box sx={{ mt: 1 }}>
                        <Button size="small" variant="text" onClick={() => navigate('/login', { state: { from: location } })}>
                          Log in to join the waitlist
                        </Button>
                      </Box>
                    ))}
                </Alert>
              )}
            </Box>
          </Grid>
        </Grid>
      </Box>
    )
  }

  const renderStep1 = () => (
    <Box>
      <Typography variant="h6" fontWeight={700} mb={3}>
        Patient Details
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="First Name"
            value={bookingData.patient.firstName}
            onChange={(e) => handlePatientChange('firstName', e.target.value)}
            required
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Last Name"
            value={bookingData.patient.lastName}
            onChange={(e) => handlePatientChange('lastName', e.target.value)}
            required
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DatePicker
              label="Date of Birth"
              value={bookingData.patient.dateOfBirth}
              onChange={(val) => handlePatientChange('dateOfBirth', val)}
              format="DD/MM/YYYY"
              slotProps={{ textField: { fullWidth: true } }}
            />
          </LocalizationProvider>
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Email Address"
            type="email"
            value={bookingData.patient.email}
            onChange={(e) => handlePatientChange('email', e.target.value)}
            required
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Phone Number"
            value={bookingData.patient.phone}
            onChange={(e) => handlePatientChange('phone', e.target.value)}
            required
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Reason for visit"
            multiline
            rows={3}
            value={bookingData.patient.reason}
            onChange={(e) => handlePatientChange('reason', e.target.value)}
            required
            placeholder="Briefly describe your symptoms or reason for visit..."
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Additional Notes (Optional)"
            multiline
            rows={2}
            value={bookingData.patient.notes}
            onChange={(e) => handlePatientChange('notes', e.target.value)}
          />
        </Grid>
      </Grid>
    </Box>
  )

  const renderStep2 = () => {
    // Previously fell back to 3 fake services (ids 'svc-1'/'svc-2'/'svc-3',
    // none of which exist in the database) whenever this real clinician had
    // zero linked products -- an empty real result, not an error, silently
    // treated as "backend unavailable". Selecting one of those and
    // continuing always failed at the final step with "Product not found",
    // the same failure class as the clinicianId bug above.
    const products = qData?.getProducts ?? []

    if (!products.length) {
      return <Alert severity="info">This doctor has no bookable services configured yet.</Alert>
    }

    return (
      <Box>
        <Typography variant="h6" fontWeight={700} mb={3}>
          Select a Service
        </Typography>
        <Grid container spacing={3}>
          {products.map((prod) => {
            const isSelected = bookingData.product?.id === prod.id

            return (
              <Grid item xs={12} sm={6} key={prod.id}>
                <Card
                  elevation={isSelected ? 3 : 0}
                  sx={{
                    border: '2px solid',
                    borderColor: isSelected ? 'primary.main' : 'divider',
                    cursor: 'pointer',
                    height: '100%',
                    transition: 'all 0.2s',
                    '&:hover': { borderColor: isSelected ? 'primary.main' : 'primary.light', transform: 'translateY(-2px)' },
                    borderRadius: 3,
                  }}
                  onClick={() => setBookingData({ ...bookingData, product: prod, variation: null })}
                >
                  <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                      <Chip label={prod.product_type} size="small" color={prod.product_type === 'variable' ? 'secondary' : 'default'} />
                      <Typography variant="h5" color="primary.main" fontWeight={800}>
                        ₹{prod.price}
                      </Typography>
                    </Box>
                    <Typography variant="h6" gutterBottom fontWeight={700}>
                      {prod.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {prod.description}
                    </Typography>

                    {isSelected && prod.product_type === 'variable' && prod.variations?.length > 0 && (
                      <FormControl fullWidth sx={{ mt: 2 }} size="small" onClick={(e) => e.stopPropagation()}>
                        <InputLabel>Select Option</InputLabel>
                        <Select
                          value={bookingData.variation?.id || ''}
                          label="Select Option"
                          onChange={(e) => {
                            const variation = prod.variations.find((v) => v.id === e.target.value)
                            setBookingData({ ...bookingData, variation })
                          }}
                        >
                          {prod.variations.map((vari) => (
                            <MenuItem key={vari.id} value={vari.id}>
                              {vari.name} — ₹{vari.price}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    )}

                    {isSelected && prod.cancellation_rules && prod.cancellation_rules.hoursNoticeRequired && (
                      <Alert severity="warning" sx={{ mt: 3, fontSize: '0.8rem', py: 0 }}>
                        Cancellation: {prod.cancellation_rules.hoursNoticeRequired} hours notice required
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            )
          })}
        </Grid>
      </Box>
    )
  }

  const renderStep3 = () => {
    // clinicianId is always real by this point -- see the top-level
    // !clinicianId guard.
    const clinician = qData?.getClinician

    const price = bookingData.variation ? bookingData.variation.price : bookingData.product?.price || 0

    return (
      <PaymentForm
        bookingData={bookingData}
        clinician={clinician}
        handleBack={handleBack}
        price={price}
        holdToken={hold?.token}
        onBookingSuccess={() => {
          clearIdempotencyKey()
          setHold(null)
        }}
      />
    )
  }

  const isNextDisabled = () => {
    if (activeStep === 0) return !bookingData.slot
    if (activeStep === 1)
      return !bookingData.patient.firstName || !bookingData.patient.lastName || !bookingData.patient.email || !bookingData.patient.reason
    if (activeStep === 2) {
      if (!bookingData.product) return true
      if (bookingData.product.product_type === 'variable' && !bookingData.variation) return true
      return false
    }
    return false
  }

  const activePrice = bookingData.variation ? bookingData.variation.price : bookingData.product?.price || 0

  // No ?doctor= id at all -- this route is only ever meant to be reached
  // with one (from DoctorProfile's "Book Appointment" button, or a shared
  // booking link). Previously fell through to a hardcoded 'mock-clinician'/
  // 'Dr. Sarah Mitchell' object that let a visitor complete the entire
  // wizard and only fail at the final "Confirm and Pay" step
  // (bookPatientAppointment rejecting the fake id with "Clinician not
  // found") -- every field filled in for nothing. Stop before the wizard
  // starts instead.
  if (!clinicianId) {
    return (
      <Box p={4} maxWidth="sm" mx="auto" textAlign="center">
        <Alert severity="warning" sx={{ mb: 3 }}>
          No doctor selected. Please choose a doctor to book an appointment with.
        </Alert>
        <Button variant="contained" onClick={() => navigate('/')}>
          Find a Doctor
        </Button>
      </Box>
    )
  }

  if (embedBlocked) {
    return (
      <Box p={4}>
        <Alert severity="error">This booking widget is not authorized to be embedded on this site.</Alert>
      </Box>
    )
  }

  if (qLoading)
    return (
      <Box p={5} display="flex" justifyContent="center">
        <CircularProgress />
      </Box>
    )
  if (qError)
    return (
      <Box p={4}>
        <Alert severity="error">Failed to load data: {qError.message}</Alert>
      </Box>
    )

  return (
    <Box p={{ xs: 2, md: 4 }} maxWidth="lg" mx="auto">
      <Typography variant="h4" fontWeight={800} gutterBottom>
        Book Appointment
      </Typography>

      <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: { xs: 4, md: 6 }, mt: 3 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel StepIconComponent={CustomStepIcon}>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      <Grid container spacing={4}>
        {/* Main Content Area */}
        <Grid item xs={12} md={8}>
          {/* P1-05 (BOOK-2) — visible once past the slot picker, through the
              rest of the wizard, so the countdown stays honest right up to
              payment. Step 0 doesn't need it: the picker itself already
              shows the held slot selected. */}
          {hold && activeStep > 0 && <HoldCountdown expiresAt={hold.expiresAt} onExpire={handleHoldExpired} />}
          <Box minHeight={400}>{getStepContent(activeStep)}</Box>

          {activeStep < 3 && (
            <Box display="flex" justifyContent="space-between" mt={4}>
              <Button disabled={activeStep === 0} onClick={handleBack} variant="outlined">
                Back
              </Button>
              <Button variant="contained" size="large" onClick={handleNext} disabled={isNextDisabled()}>
                Next Step
              </Button>
            </Box>
          )}
        </Grid>

        {/* Right Sidebar - Sticky Summary */}
        <Grid item xs={12} md={4} sx={{ display: { xs: 'none', md: 'block' } }}>
          <Box position="sticky" top={100}>
            <Paper elevation={0} sx={{ p: 4, border: '1px solid', borderColor: 'divider', borderRadius: 4, bgcolor: '#f8fafc' }}>
              <Typography variant="h6" gutterBottom fontWeight={800}>
                Booking Summary
              </Typography>

              <Box my={3}>
                <Typography variant="body2" color="text.secondary" fontWeight={600} gutterBottom>
                  TIME
                </Typography>
                <Typography variant="body1" fontWeight={500}>
                  {bookingData.slot
                    ? `${bookingData.date.format('dddd, DD/MM/YYYY')} at ${dayjs(`2000-01-01T${bookingData.slot}`).format('h:mm A')}`
                    : 'Not selected yet'}
                </Typography>
                <Typography variant="body2" sx={{ mt: 0.5, textTransform: 'capitalize', color: 'primary.main', fontWeight: 600 }}>
                  {bookingData.appointmentType} Consultation
                </Typography>
              </Box>

              <Divider sx={{ my: 2 }} />

              <Box my={3}>
                <Typography variant="body2" color="text.secondary" fontWeight={600} gutterBottom>
                  SERVICE
                </Typography>
                <Typography variant="body1" fontWeight={500}>
                  {bookingData.product?.name || 'Not selected yet'}
                </Typography>
                {bookingData.variation && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    Option: {bookingData.variation.name}
                  </Typography>
                )}
              </Box>

              <Divider sx={{ my: 2 }} />

              <Box display="flex" justifyContent="space-between" alignItems="center" mt={3}>
                <Typography variant="subtitle1" fontWeight={700}>
                  Total Due
                </Typography>
                <Typography variant="h5" color="primary.main" fontWeight={800}>
                  ₹{activePrice}
                </Typography>
              </Box>
            </Paper>
          </Box>
        </Grid>
      </Grid>
    </Box>
  )
}
