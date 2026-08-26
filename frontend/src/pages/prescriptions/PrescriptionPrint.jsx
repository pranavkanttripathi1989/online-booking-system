import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, gql } from '@apollo/client'
import { useSnackbar } from 'notistack'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import PrintRoundedIcon from '@mui/icons-material/PrintRounded'
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded'
import WhatsAppIcon from '@mui/icons-material/WhatsApp'
import VerifiedRoundedIcon from '@mui/icons-material/VerifiedRounded'
import { downloadAuthenticatedPdf } from '../../utils/documents'

// REQ109 — {success, userErrors} only, no entity (this mutation has
// nothing to return beyond the outcome itself).
const SHARE_VIA_WHATSAPP = gql`
  mutation SharePrescriptionViaWhatsapp($id: ID!) {
    sharePrescriptionViaWhatsapp(id: $id) {
      success
      userErrors {
        message
      }
      phone_last_two
    }
  }
`

// REQ021 US-RX-03/06 -- one rendering path for both on-screen preview and
// window.print(), the only print precedent this codebase has
// (appointments/detail.jsx, finances/index.jsx both use window.print()
// directly rather than a separate PDF pipeline). See PLAN057 for why this
// satisfies FR-RX-06's engineering intent without a new PDF dependency.

// REQ129 (US-RX-08) -- mirrors backend/src/documents/documents.service.ts's
// own formatVerificationCode() verbatim; both must derive the identical
// display string from the same pdf_hash for a printed copy to be checkable
// against the app.
function formatVerificationCode(hash) {
  return hash
    .slice(0, 12)
    .toUpperCase()
    .match(/.{1,4}/g)
    .join('-')
}

const PRINT_QUERY = gql`
  query PrintPrescription($id: ID!) {
    printPrescription(id: $id) {
      is_reprint
      prescription {
        id
        mode
        issued_at
        language
        pdf_hash
        items {
          drug_name
          dose
          frequency
          route
          duration_days
          qty
          instructions
          substitutable
        }
      }
      clinic {
        name
        logo_url
        contact_phone
        address
      }
      clinician {
        full_name
        registration_number
        qualifications
      }
      patient {
        full_name
        date_of_birth
        gender
      }
    }
  }
`

function PrescriptionPrint() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { enqueueSnackbar } = useSnackbar()
  const [downloading, setDownloading] = useState(false)
  const { data, loading, error } = useQuery(PRINT_QUERY, { variables: { id }, fetchPolicy: 'network-only' })
  const payload = data?.printPrescription

  // REQ057 (US-PAT-02) — real server-side PDF, separate rendering path from
  // this page's own window.print() (see PLAN080 for why the two aren't unified).
  const handleDownload = async () => {
    setDownloading(true)
    try {
      await downloadAuthenticatedPdf(`/documents/prescriptions/${id}/pdf`, `prescription-${id}.pdf`)
    } catch (err) {
      enqueueSnackbar(err?.message || 'Failed to download prescription PDF', { variant: 'error' })
    } finally {
      setDownloading(false)
    }
  }

  // REQ109 — a link (WhatsApp) + a separate one-time code (SMS), to the
  // patient's own registered phone. Only the last 2 digits of that number
  // are ever echoed back into this toast — avoids an unnecessary PHI echo.
  const [shareViaWhatsapp, { loading: sharing }] = useMutation(SHARE_VIA_WHATSAPP)
  const handleShare = async () => {
    try {
      const { data: result } = await shareViaWhatsapp({ variables: { id } })
      if (result?.sharePrescriptionViaWhatsapp?.success) {
        const lastTwo = result.sharePrescriptionViaWhatsapp.phone_last_two
        enqueueSnackbar(`Link and verification code sent to the number ending in ${lastTwo ?? '••'}.`, { variant: 'success' })
      } else {
        enqueueSnackbar(result?.sharePrescriptionViaWhatsapp?.userErrors?.[0]?.message || 'Failed to share prescription', {
          variant: 'error',
        })
      }
    } catch (err) {
      enqueueSnackbar(err?.graphQLErrors?.[0]?.message || err.message, { variant: 'error' })
    }
  }

  if (loading)
    return (
      <Box p={4}>
        <CircularProgress />
      </Box>
    )
  if (error)
    return (
      <Box p={4}>
        <Alert severity="error">{error.message}</Alert>
      </Box>
    )
  if (!payload)
    return (
      <Box p={4}>
        <Alert severity="warning">Prescription not found.</Alert>
      </Box>
    )

  const { prescription, clinic, clinician, patient, is_reprint: isReprint } = payload

  return (
    <Box
      sx={{
        maxWidth: '210mm',
        mx: 'auto',
        p: 4,
        bgcolor: '#fff',
        color: '#000',
        position: 'relative',
        '@media print': { p: 0, maxWidth: 'none' },
      }}
    >
      <Box sx={{ '@media print': { display: 'none' }, mb: 2 }}>
        <Stack direction="row" spacing={1.5}>
          <Button variant="contained" startIcon={<PrintRoundedIcon />} onClick={() => window.print()}>
            Print
          </Button>
          <Button
            variant="outlined"
            startIcon={downloading ? <CircularProgress size={16} /> : <DownloadRoundedIcon />}
            onClick={handleDownload}
            disabled={downloading}
          >
            {downloading ? 'Preparing PDF…' : 'Download PDF'}
          </Button>
          <Button
            variant="outlined"
            startIcon={sharing ? <CircularProgress size={16} /> : <WhatsAppIcon />}
            onClick={handleShare}
            disabled={sharing}
          >
            {sharing ? 'Sending…' : 'Share via WhatsApp'}
          </Button>
          <Button variant="outlined" startIcon={<VerifiedRoundedIcon />} onClick={() => navigate(`/prescriptions/verify?id=${id}`)}>
            Verify
          </Button>
        </Stack>
      </Box>

      {isReprint && (
        <Typography
          sx={{
            position: 'absolute',
            top: '40%',
            left: '50%',
            transform: 'translate(-50%,-50%) rotate(-30deg)',
            fontSize: '4rem',
            fontWeight: 900,
            color: 'rgba(200,0,0,0.15)',
            letterSpacing: 4,
            pointerEvents: 'none',
            userSelect: 'none',
            zIndex: 0,
          }}
        >
          DUPLICATE
        </Typography>
      )}

      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ position: 'relative', zIndex: 1 }}>
        <Box>
          {clinic.logo_url && <img src={clinic.logo_url} alt={clinic.name} style={{ maxHeight: 56, marginBottom: 8 }} />}
          <Typography variant="h6" fontWeight={700}>
            {clinic.name}
          </Typography>
          {clinic.address && <Typography variant="body2">{clinic.address}</Typography>}
          {clinic.contact_phone && <Typography variant="body2">{clinic.contact_phone}</Typography>}
        </Box>
        <Box textAlign="right">
          <Typography variant="body2" fontWeight={700}>
            {clinician.full_name}
          </Typography>
          {clinician.qualifications && (
            <Typography variant="caption" display="block">
              {clinician.qualifications}
            </Typography>
          )}
          {clinician.registration_number && (
            <Typography variant="caption" display="block">
              Reg. No: {clinician.registration_number}
            </Typography>
          )}
        </Box>
      </Stack>

      <Divider sx={{ my: 2 }} />

      <Stack direction="row" justifyContent="space-between" sx={{ position: 'relative', zIndex: 1 }}>
        <Box>
          <Typography variant="body2">
            <strong>Patient:</strong> {patient.full_name}
          </Typography>
          {patient.date_of_birth && (
            <Typography variant="body2">
              <strong>DOB:</strong> {new Date(patient.date_of_birth).toLocaleDateString()}
              {patient.gender ? ` · ${patient.gender}` : ''}
            </Typography>
          )}
        </Box>
        <Typography variant="body2">
          <strong>Date:</strong> {new Date(prescription.issued_at).toLocaleDateString()}
        </Typography>
      </Stack>

      <Divider sx={{ my: 2 }} />

      <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1, position: 'relative', zIndex: 1 }}>
        ℞
      </Typography>
      <TableContainer sx={{ position: 'relative', zIndex: 1 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Drug</TableCell>
              <TableCell>Dose</TableCell>
              <TableCell>Frequency</TableCell>
              <TableCell>Route</TableCell>
              <TableCell>Duration</TableCell>
              <TableCell>Qty</TableCell>
              <TableCell>Instructions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {prescription.items.map((item, idx) => (
              <TableRow key={idx}>
                <TableCell>{item.drug_name}</TableCell>
                <TableCell>{item.dose}</TableCell>
                <TableCell>{item.frequency}</TableCell>
                <TableCell>{item.route || '—'}</TableCell>
                <TableCell>{item.duration_days ? `${item.duration_days} days` : '—'}</TableCell>
                <TableCell>{item.qty ?? '—'}</TableCell>
                <TableCell>{item.instructions || '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Box sx={{ mt: 6, display: 'flex', justifyContent: 'flex-end', position: 'relative', zIndex: 1 }}>
        <Box textAlign="center">
          <Divider sx={{ width: 200, mb: 0.5 }} />
          <Typography variant="caption">Signature</Typography>
          {prescription.pdf_hash && (
            <Typography variant="caption" color="text.secondary" display="block">
              Verification code: {formatVerificationCode(prescription.pdf_hash)}
            </Typography>
          )}
        </Box>
      </Box>
    </Box>
  )
}

export default PrescriptionPrint
