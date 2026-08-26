import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Box, Paper, Typography, TextField, Button, CircularProgress, Stack } from '@mui/material'
import LocalHospitalRoundedIcon from '@mui/icons-material/LocalHospitalRounded'
import { downloadPdfViaPost } from '../../utils/documents'

// REQ109 — genuinely public: no login at all. The signed link token in
// the URL (from the WhatsApp message) plus the OTP the patient types
// (from the separate SMS) together are the only access control — see
// documents.controller.ts's own comment on why this is a real @Public()
// case, not a shortcut.
export default function PrescriptionOtpPage() {
  const { token } = useParams()
  const [otp, setOtp] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [done, setDone] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await downloadPdfViaPost('/documents/prescriptions/share-verify', { token, otp }, 'prescription.pdf')
      setDone(true)
    } catch (err) {
      setError(err.message || 'Failed to verify code')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh', px: 2 }}>
      <Paper elevation={0} sx={{ p: 4, maxWidth: 420, width: '100%', border: '1px solid #E2E8F0', borderRadius: 3 }}>
        <Stack spacing={1} alignItems="center" sx={{ mb: 3 }}>
          <LocalHospitalRoundedIcon sx={{ fontSize: 40, color: 'primary.main' }} />
          <Typography variant="h6" fontWeight={800}>
            Verify to view your prescription
          </Typography>
          <Typography variant="body2" color="text.secondary" textAlign="center">
            Enter the 6-digit code sent to your phone by SMS.
          </Typography>
        </Stack>

        {done ? (
          <Typography variant="body2" color="success.main" textAlign="center">
            Verified — your download should start automatically.
          </Typography>
        ) : (
          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="6-digit code"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              inputProps={{ inputMode: 'numeric', maxLength: 6 }}
              error={Boolean(error)}
              helperText={error}
              sx={{ mb: 2 }}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={submitting || otp.length !== 6}
              startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : null}
            >
              {submitting ? 'Verifying…' : 'View Prescription'}
            </Button>
          </Box>
        )}
      </Paper>
    </Box>
  )
}
