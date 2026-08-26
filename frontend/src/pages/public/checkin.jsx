import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useMutation, gql } from '@apollo/client'
import { Box, Paper, Typography, CircularProgress, Button, Stack } from '@mui/material'
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

export default function CheckinPage() {
  const { token } = useParams()
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
            <Typography variant="body1" color="text.secondary">Checking you in…</Typography>
          </Stack>
        ) : error ? (
          <Stack spacing={2} alignItems="center">
            <ErrorOutlineRoundedIcon sx={{ fontSize: 56, color: 'error.main' }} />
            <Typography variant="h6" fontWeight={800}>Couldn't check you in</Typography>
            <Typography variant="body2" color="text.secondary">
              {error.graphQLErrors?.[0]?.message || 'Something went wrong. Please see reception for help.'}
            </Typography>
          </Stack>
        ) : data?.checkInWithQrToken ? (
          <Stack spacing={2} alignItems="center">
            <CheckCircleRoundedIcon sx={{ fontSize: 56, color: 'success.main' }} />
            <Typography variant="h6" fontWeight={800}>You're checked in</Typography>
            <Typography variant="body2" color="text.secondary">Please take a seat — you'll be called shortly.</Typography>
          </Stack>
        ) : null}
        <Button sx={{ mt: 3, textTransform: 'none', fontWeight: 700 }} onClick={() => navigate('/')}>
          Back to home
        </Button>
      </Paper>
    </Box>
  )
}
