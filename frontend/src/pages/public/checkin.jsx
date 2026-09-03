import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useMutation, gql } from '@apollo/client'
import { Box, Paper, Typography, CircularProgress, Button, Stack } from '@mui/material'
import QrCodeScannerRoundedIcon from '@mui/icons-material/QrCodeScannerRounded'
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded'
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded'

// REQ107 — @Public(), no ambient identity: the opaque token in the URL is
// the sole authority. Same canonical dialect (snake_case,
// {success, userErrors}-free — this mutation throws on rejection rather
// than returning a result wrapper) as the other REQ106/REQ110 additions
// this session, matching AppointmentType's own existing shape.
const CHECK_IN_WITH_QR_TOKEN = gql`
  mutation CheckInWithQrToken($token: String!) {
    checkInWithQrToken(token: $token) {
      id
      status
    }
  }
`

// P2-15 — the QR always encodes the full "${origin}/checkin/:token" URL
// (BookingStep5Confirm.jsx). A keyboard-wedge scanner "types" whatever it
// reads verbatim, so a scan at the kiosk arrives as that same URL string
// rather than a bare token; extract the token from either shape.
function extractToken(scanned) {
  const trimmed = scanned.trim()
  const match = trimmed.match(/\/checkin\/([^/?#\s]+)/)
  return match ? match[1] : trimmed
}

export default function CheckinPage() {
  const { token } = useParams()
  return token ? <PersonalCheckin token={token} /> : <KioskCheckin />
}

// The existing REQ107 flow, unchanged: a patient's own phone scans the QR
// on their confirmation and its camera app navigates straight to this URL,
// so the token is already in the route and check-in fires immediately.
function PersonalCheckin({ token }) {
  const navigate = useNavigate()
  const [checkIn, { data, error, loading }] = useMutation(CHECK_IN_WITH_QR_TOKEN)
  const [attempted, setAttempted] = useState(false)

  useEffect(() => {
    if (token && !attempted) {
      setAttempted(true)
      checkIn({ variables: { token } }).catch(() => {}) // surfaced via `error` below
    }
  }, [token, attempted, checkIn])

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh', px: 2 }}>
      <Paper elevation={0} sx={{ p: 4, maxWidth: 420, width: '100%', textAlign: 'center', border: '1px solid #E2E8F0', borderRadius: 3 }}>
        {loading || !attempted ? (
          <Stack spacing={2} alignItems="center">
            <CircularProgress />
            <Typography variant="body1" color="text.secondary">
              Checking you in…
            </Typography>
          </Stack>
        ) : error ? (
          <Stack spacing={2} alignItems="center">
            <ErrorOutlineRoundedIcon sx={{ fontSize: 56, color: 'error.main' }} />
            <Typography variant="h6" fontWeight={800}>
              Couldn't check you in
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {error.graphQLErrors?.[0]?.message || 'Something went wrong. Please see reception for help.'}
            </Typography>
          </Stack>
        ) : data?.checkInWithQrToken ? (
          <Stack spacing={2} alignItems="center">
            <CheckCircleRoundedIcon sx={{ fontSize: 56, color: 'success.main' }} />
            <Typography variant="h6" fontWeight={800}>
              You're checked in
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Please take a seat — you'll be called shortly.
            </Typography>
          </Stack>
        ) : null}
        <Button sx={{ mt: 3, textTransform: 'none', fontWeight: 700 }} onClick={() => navigate('/')}>
          Back to home
        </Button>
      </Paper>
    </Box>
  )
}

// P2-15 — kiosk mode: a shared front-desk device parked on the bare
// "/checkin" route (no token in the URL), waiting for a walk-up patient to
// scan their own confirmation QR at an attached scanner. No camera/decode
// library is added (BASE-5) — a real self-check-in kiosk's scanner is
// standard keyboard-wedge hardware, so an always-focused, visually hidden
// text input receives the scanned string, submitted on the scanner's own
// trailing Enter. After a result is shown for a few seconds the screen
// resets to idle on its own — a shared device must never leave one
// patient's result on screen for the next person in line to see.
const RESET_DELAY_MS = 6000
const REFOCUS_INTERVAL_MS = 1500

function KioskCheckin() {
  const [checkIn, { data, error, loading, reset }] = useMutation(CHECK_IN_WITH_QR_TOKEN)
  const [scanned, setScanned] = useState(false)
  const inputRef = useRef(null)
  const resetTimerRef = useRef(null)

  const focusInput = useCallback(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    focusInput()
    const interval = setInterval(focusInput, REFOCUS_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [focusInput])

  useEffect(() => {
    if (!scanned || loading) return undefined
    resetTimerRef.current = setTimeout(() => {
      setScanned(false)
      reset()
      if (inputRef.current) inputRef.current.value = ''
      focusInput()
    }, RESET_DELAY_MS)
    return () => clearTimeout(resetTimerRef.current)
  }, [scanned, loading, reset, focusInput])

  const handleScan = (raw) => {
    const token = extractToken(raw)
    if (!token) return
    setScanned(true)
    checkIn({ variables: { token } }).catch(() => {}) // surfaced via `error` below
  }

  return (
    <Box
      onClick={focusInput}
      sx={{
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        px: 3,
      }}
    >
      {/* Captures the scanner's keystrokes; never meant to be seen or
          typed into by a person, so it carries no visible label. */}
      <input
        ref={inputRef}
        aria-hidden="true"
        tabIndex={-1}
        onBlur={focusInput}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            handleScan(e.currentTarget.value)
            e.currentTarget.value = ''
          }
        }}
        style={{ position: 'absolute', opacity: 0, height: 0, width: 0, padding: 0, border: 'none', pointerEvents: 'none' }}
      />
      <Paper
        elevation={0}
        sx={{ p: { xs: 4, sm: 6 }, maxWidth: 480, width: '100%', textAlign: 'center', border: '1px solid', borderColor: 'divider', borderRadius: 4 }}
      >
        <Box role="status" aria-live="polite">
          {!scanned ? (
            <Stack spacing={3} alignItems="center">
              <QrCodeScannerRoundedIcon sx={{ fontSize: 96, color: 'primary.main' }} />
              <Typography variant="h4" fontWeight={800}>
                Scan your appointment QR code
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Hold the QR code from your booking confirmation up to the scanner to check in.
              </Typography>
            </Stack>
          ) : loading ? (
            <Stack spacing={2} alignItems="center">
              <CircularProgress size={64} />
              <Typography variant="h6" fontWeight={700}>
                Checking you in…
              </Typography>
            </Stack>
          ) : error ? (
            <Stack spacing={2} alignItems="center">
              <ErrorOutlineRoundedIcon sx={{ fontSize: 72, color: 'error.main' }} />
              <Typography variant="h5" fontWeight={800}>
                Couldn't check you in
              </Typography>
              <Typography variant="body1" color="text.secondary">
                {error.graphQLErrors?.[0]?.message || 'Please see reception for help.'}
              </Typography>
            </Stack>
          ) : data?.checkInWithQrToken ? (
            <Stack spacing={2} alignItems="center">
              <CheckCircleRoundedIcon sx={{ fontSize: 72, color: 'success.main' }} />
              <Typography variant="h5" fontWeight={800}>
                You're checked in
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Please take a seat — you'll be called shortly.
              </Typography>
            </Stack>
          ) : null}
        </Box>
      </Paper>
    </Box>
  )
}
