import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, gql } from '@apollo/client'
import { useTranslation } from 'react-i18next'
import { useSnackbar } from 'notistack'
import { useScopedTranslation } from '../../i18n/useScopedTranslation'
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
  // P2-08 (US-RX-07) -- `t` (the app's own current UI language) covers this
  // page's own chrome (toolbar buttons, toast messages) -- whoever is
  // viewing this screen keeps their own language there regardless of which
  // language the prescription itself was issued in. `tDoc` is locked to the
  // prescription's own `language` field and covers only the physical
  // document content below (the part a patient would actually read/print),
  // per useScopedTranslation's own doc comment.
  const { t } = useTranslation()
  const { t: tDoc } = useScopedTranslation(payload?.prescription?.language)

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
        <Alert severity="warning">{t('prescription.notFound')}</Alert>
      </Box>
    )

  const { prescription, clinic, clinician, patient, is_reprint: isReprint } = payload

  return (
    <Box
      // Deliberate literal exception (FRONTEND_RULES.md UI-2/§22 precedent, SURF-13):
      // this renders a physical paper document (screen preview shares the same
      // rendering path as window.print()) -- always white paper with black ink,
      // independent of the app's own light/dark toggle.
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
            {t('prescription.print')}
          </Button>
          <Button
            variant="outlined"
            startIcon={downloading ? <CircularProgress size={16} /> : <DownloadRoundedIcon />}
            onClick={handleDownload}
            disabled={downloading}
          >
            {downloading ? t('prescription.preparingPdf') : t('prescription.downloadPdf')}
          </Button>
          <Button
            variant="outlined"
            startIcon={sharing ? <CircularProgress size={16} /> : <WhatsAppIcon />}
            onClick={handleShare}
            disabled={sharing}
          >
            {sharing ? t('prescription.sending') : t('prescription.shareViaWhatsapp')}
          </Button>
          <Button variant="outlined" startIcon={<VerifiedRoundedIcon />} onClick={() => navigate(`/prescriptions/verify?id=${id}`)}>
            {t('prescription.verify')}
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
          {tDoc('prescription.duplicate')}
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
              {tDoc('prescription.regNo')}: {clinician.registration_number}
            </Typography>
          )}
        </Box>
      </Stack>

      <Divider sx={{ my: 2 }} />

      <Stack direction="row" justifyContent="space-between" sx={{ position: 'relative', zIndex: 1 }}>
        <Box>
          <Typography variant="body2">
            <strong>{tDoc('prescription.patient')}:</strong> {patient.full_name}
          </Typography>
          {patient.date_of_birth && (
            <Typography variant="body2">
              <strong>{tDoc('prescription.dob')}:</strong> {new Date(patient.date_of_birth).toLocaleDateString()}
              {patient.gender ? ` · ${patient.gender}` : ''}
            </Typography>
          )}
        </Box>
        <Typography variant="body2">
          <strong>{tDoc('prescription.date')}:</strong> {new Date(prescription.issued_at).toLocaleDateString()}
        </Typography>
      </Stack>

      <Divider sx={{ my: 2 }} />

      {/* Universal pharmacy symbol, not translated -- stays as-is in every language. */}
      <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1, position: 'relative', zIndex: 1 }}>
        ℞
      </Typography>
      <TableContainer sx={{ position: 'relative', zIndex: 1 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{tDoc('prescription.drug')}</TableCell>
              <TableCell>{tDoc('prescription.dose')}</TableCell>
              <TableCell>{tDoc('prescription.frequency')}</TableCell>
              <TableCell>{tDoc('prescription.route')}</TableCell>
              <TableCell>{tDoc('prescription.duration')}</TableCell>
              <TableCell>{tDoc('prescription.qty')}</TableCell>
              <TableCell>{tDoc('prescription.instructions')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {prescription.items.map((item, idx) => (
              <TableRow key={idx}>
                <TableCell>{item.drug_name}</TableCell>
                <TableCell>{item.dose}</TableCell>
                {/* PrescriptionItems.frequency is a closed 6-value clinical
                    shorthand enum (OD|BD|TDS|QID|HS|SOS) -- safe to translate
                    via a fixed lookup, unlike route/instructions below which
                    are clinician-authored free text and stay exactly as
                    entered (translating those automatically would be a real
                    clinical-safety risk, not just a cosmetic gap). */}
                <TableCell>{tDoc(`prescription.frequencyCode.${item.frequency}`, { defaultValue: item.frequency })}</TableCell>
                <TableCell>{item.route || '—'}</TableCell>
                <TableCell>{item.duration_days ? `${item.duration_days} ${tDoc('prescription.days')}` : '—'}</TableCell>
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
          <Typography variant="caption">{tDoc('prescription.signature')}</Typography>
          {prescription.pdf_hash && (
            <Typography variant="caption" color="text.secondary" display="block">
              {tDoc('prescription.verificationCode')}: {formatVerificationCode(prescription.pdf_hash)}
            </Typography>
          )}
        </Box>
      </Box>
    </Box>
  )
}

export default PrescriptionPrint
