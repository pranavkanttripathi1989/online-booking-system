import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useLazyQuery, gql } from '@apollo/client'
import { Helmet } from 'react-helmet-async'
import { Alert, Box, Button, Card, CardContent, CircularProgress, Stack, TextField, Typography } from '@mui/material'
import VerifiedRoundedIcon from '@mui/icons-material/VerifiedRounded'
import GppGoodRoundedIcon from '@mui/icons-material/GppGoodRounded'
import GppMaybeRoundedIcon from '@mui/icons-material/GppMaybeRounded'

// REQ136 — a real frontend surface for the already-built, already-tested
// verifyPrescriptionIntegrity query (REQ129). Deliberately a standalone
// utility page, not attached to a specific prescription's own print view:
// the real use case named in REQ129's own doc is a pharmacist or patient
// checking a printed/physical copy, who has only the prescription id
// (and its printed verification code) on paper in front of them, not an
// active app session already viewing that record.
const VERIFY_PRESCRIPTION = gql`
  query VerifyPrescription($id: ID!) {
    verifyPrescriptionIntegrity(id: $id) {
      prescription_id
      valid
      stored_hash
      computed_hash
    }
  }
`

// Mirrors backend/src/documents/documents.service.ts's own
// formatVerificationCode() and PrescriptionPrint.jsx's own copy verbatim —
// all three must derive the identical display string from the same hash
// for a printed code to be checkable against this page.
function formatVerificationCode(hash) {
  if (!hash) return null
  return hash.slice(0, 12).toUpperCase().match(/.{1,4}/g).join('-')
}

export default function VerifyPrescription() {
  const [searchParams] = useSearchParams()
  const [prescriptionId, setPrescriptionId] = useState(searchParams.get('id') || '')
  const [runVerify, { data, loading, error }] = useLazyQuery(VERIFY_PRESCRIPTION, { fetchPolicy: 'network-only' })

  const handleVerify = (e) => {
    e.preventDefault()
    if (!prescriptionId.trim()) return
    runVerify({ variables: { id: prescriptionId.trim() } })
  }

  const result = data?.verifyPrescriptionIntegrity

  return (
    <Box sx={{ maxWidth: 560, mx: 'auto', py: 4 }}>
      <Helmet><title>Verify Prescription — MediBook</title></Helmet>

      <Stack direction="row" spacing={1.5} alignItems="center" mb={1}>
        <VerifiedRoundedIcon color="primary" fontSize="large" />
        <Typography variant="h5" fontWeight={800}>Verify a Prescription</Typography>
      </Stack>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Enter the prescription ID from a printed or shared copy to confirm its
        contents match what was originally signed.
      </Typography>

      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Box component="form" onSubmit={handleVerify}>
            <Stack direction="row" spacing={1.5}>
              <TextField
                fullWidth label="Prescription ID" value={prescriptionId}
                onChange={(e) => setPrescriptionId(e.target.value)}
                placeholder="e.g. the ID printed on the prescription"
              />
              <Button type="submit" variant="contained" disabled={!prescriptionId.trim() || loading} sx={{ px: 3, whiteSpace: 'nowrap' }}>
                {loading ? <CircularProgress size={20} /> : 'Verify'}
              </Button>
            </Stack>
          </Box>
        </CardContent>
      </Card>

      {error && <Alert severity="error">{error.graphQLErrors?.[0]?.message || error.message}</Alert>}

      {result && (
        <Alert
          severity={result.valid ? 'success' : 'error'}
          icon={result.valid ? <GppGoodRoundedIcon /> : <GppMaybeRoundedIcon />}
        >
          <Typography fontWeight={700}>
            {result.valid ? 'This prescription is authentic.' : 'This prescription could not be verified.'}
          </Typography>
          <Typography variant="body2" sx={{ mt: 0.5 }}>
            {result.valid
              ? 'The content matches what was originally signed — no tampering detected.'
              : 'The content on file does not match a signed original. Do not rely on this copy — contact the issuing clinic.'}
          </Typography>
          {result.stored_hash && (
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
              Verification code on file: {formatVerificationCode(result.stored_hash)}
            </Typography>
          )}
          {!result.stored_hash && (
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
              This prescription has no verification code on file (issued before this feature existed).
            </Typography>
          )}
        </Alert>
      )}
    </Box>
  )
}
