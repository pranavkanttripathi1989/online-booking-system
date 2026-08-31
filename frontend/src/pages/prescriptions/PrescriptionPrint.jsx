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

// Exported (not a local-only const) so PrescriptionPrint.test.jsx can
// import this verbatim instead of hand-copying it -- a hand-copied
// duplicate of this exact query already drifted out of sync once
// (BUG062, patient/Appointments.test.jsx) when the real query gained
// fields the test's own copy never did, breaking every test in that file
// with an opaque "Unable to find" error and no hint of the real cause.
export const PRINT_QUERY = gql`
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
          composition
        }
      }
      clinic {
        name
        logo_url
        contact_phone
        address
        email
        website
        alternate_phone
        appointment_note
        tagline
        primary_color
        secondary_color
      }
      clinician {
        full_name
        registration_number
        qualifications
      }
      doctors {
        full_name
        qualifications
        specialty_highlights
        registration_number
      }
      patient {
        full_name
        date_of_birth
        gender
      }
      encounter_context {
        complaints
        exam
        diagnosis
        advice
        follow_up
        investigations
        bp_systolic
        bp_diastolic
        height_cm
        weight_kg
        bmi
        lmp_date
        edd
        gestational_age_weeks
        gestational_age_days
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

  const { prescription, clinic, clinician, doctors, patient, encounter_context: ctx, is_reprint: isReprint } = payload

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

      {/* REQ170 -- clinic name/tagline/logo, full width. Address/phone only
          shown here when the clinic has no configured doctor roster (the
          pre-REQ170 layout) -- once doctors render below, the letterhead
          footer (bottom of page) is the address/phone's real home,
          matching the reference prescription's own layout. */}
      <Box sx={{ position: 'relative', zIndex: 1 }}>
        <Stack direction="row" alignItems="flex-start" spacing={1.5}>
          {clinic.logo_url && <img src={clinic.logo_url} alt={clinic.name} style={{ maxHeight: 56 }} />}
          <Box>
            <Typography variant="h6" fontWeight={700} sx={{ color: clinic.primary_color || undefined }}>
              {clinic.name}
            </Typography>
            {clinic.tagline && (
              <Typography variant="body2" fontWeight={700} color="text.secondary">
                {clinic.tagline}
              </Typography>
            )}
            {!doctors?.length && (
              <>
                {clinic.address && <Typography variant="body2">{clinic.address}</Typography>}
                {clinic.contact_phone && <Typography variant="body2">{clinic.contact_phone}</Typography>}
              </>
            )}
          </Box>
        </Stack>

        {/* REQ170 -- the clinic's own configured letterhead doctor roster,
            always shown regardless of who issued this specific
            prescription (the reference's two-doctor co-branding pattern).
            Falls back to [the issuing clinician] when the clinic never
            configured one, matching today's behaviour. */}
        {doctors?.length > 0 && (
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 1.5 }} flexWrap="wrap">
            {doctors.map((doctor, idx) => (
              <Box key={idx} sx={{ flex: '1 1 45%', minWidth: 220 }}>
                <Typography variant="body2" fontWeight={700}>
                  {doctor.full_name}
                </Typography>
                {doctor.qualifications && (
                  <Typography variant="caption" display="block">
                    {doctor.qualifications}
                  </Typography>
                )}
                {doctor.specialty_highlights &&
                  doctor.specialty_highlights
                    .split('\n')
                    .filter(Boolean)
                    .map((line, i) => (
                      <Typography key={i} variant="caption" display="block" color="text.secondary">
                        - {line}
                      </Typography>
                    ))}
                {doctor.registration_number && (
                  <Typography variant="caption" display="block">
                    {tDoc('prescription.regNo')}: {doctor.registration_number}
                  </Typography>
                )}
              </Box>
            ))}
          </Stack>
        )}
      </Box>

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

      {/* REQ171/REQ172 -- the same encounter's own clinical narrative. Every
          line only renders when its value is non-null -- a specialty/
          clinician that never records these keeps the pre-REQ171 layout
          exactly (nothing shown here). */}
      {ctx && (ctx.complaints || ctx.bp_systolic != null || ctx.height_cm != null || ctx.exam || ctx.diagnosis || ctx.lmp_date) && (
        <Box sx={{ position: 'relative', zIndex: 1, mb: 1 }}>
          {ctx.complaints && (
            <Typography variant="body2">
              <strong>{tDoc('prescription.complaints')}:</strong> {ctx.complaints}
            </Typography>
          )}
          {(ctx.bp_systolic != null ||
            ctx.height_cm != null ||
            ctx.weight_kg != null ||
            ctx.bmi != null ||
            ctx.lmp_date ||
            ctx.edd ||
            ctx.gestational_age_weeks != null) && (
            <Typography variant="body2">
              {[
                ctx.bp_systolic != null && ctx.bp_diastolic != null ? `${tDoc('prescription.bp')} ${ctx.bp_systolic}/${ctx.bp_diastolic} mmHg` : null,
                ctx.height_cm != null ? `${tDoc('prescription.height')} ${ctx.height_cm} cm` : null,
                ctx.weight_kg != null ? `${tDoc('prescription.weight')} ${ctx.weight_kg} kg` : null,
                ctx.bmi != null ? `${tDoc('prescription.bmi')} ${ctx.bmi} kg/m²` : null,
                ctx.lmp_date ? `${tDoc('prescription.lmp')} ${new Date(ctx.lmp_date).toLocaleDateString()}` : null,
                ctx.edd ? `${tDoc('prescription.edd')} ${new Date(ctx.edd).toLocaleDateString()}` : null,
                ctx.gestational_age_weeks != null
                  ? `${tDoc('prescription.gestationalAge')} ${ctx.gestational_age_weeks} ${tDoc('prescription.weeks')}${ctx.gestational_age_days ? ` ${ctx.gestational_age_days}d` : ''}`
                  : null,
              ]
                .filter(Boolean)
                .join('  |  ')}
            </Typography>
          )}
          {ctx.exam && (
            <Typography variant="body2">
              <strong>{tDoc('prescription.exam')}:</strong> {ctx.exam}
            </Typography>
          )}
          {ctx.diagnosis && (
            <Typography variant="body2" fontWeight={700} sx={{ textDecoration: 'underline' }}>
              {tDoc('prescription.diagnosis')}: {ctx.diagnosis}
            </Typography>
          )}
        </Box>
      )}

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
                <TableCell>
                  {item.drug_name}
                  {/* REQ171 -- Drugs.composition, a combination drug's own
                      ingredient breakdown. */}
                  {item.composition && (
                    <Typography variant="caption" display="block" color="text.secondary">
                      {tDoc('prescription.composition')}: {item.composition}
                    </Typography>
                  )}
                </TableCell>
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

      {/* REQ171 -- advice/follow-up/investigations, the same encounter's
          own free-text notes. Rendered only when set. */}
      {ctx && (ctx.advice || ctx.follow_up || ctx.investigations) && (
        <Box sx={{ mt: 1.5, position: 'relative', zIndex: 1 }}>
          {ctx.advice && (
            <Typography variant="body2">
              <strong>{tDoc('prescription.advice')}:</strong> {ctx.advice}
            </Typography>
          )}
          {ctx.follow_up && (
            <Typography variant="body2">
              <strong>{tDoc('prescription.followUp')}:</strong> {ctx.follow_up}
            </Typography>
          )}
          {ctx.investigations && (
            <Typography variant="body2">
              <strong>{tDoc('prescription.investigations')}:</strong> {ctx.investigations}
            </Typography>
          )}
        </Box>
      )}

      <Box sx={{ mt: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', position: 'relative', zIndex: 1 }}>
        <Box>
          {/* REQ170 -- the letterhead footer (address/phones/email/website),
              only rendered when the clinic has configured at least one of
              these -- absent entirely for a clinic that never touches this
              feature, matching the pre-REQ170 layout exactly. */}
          {(clinic.address || clinic.email || clinic.website || clinic.alternate_phone) && (
            <Box
              sx={{
                bgcolor: clinic.primary_color || '#006D77',
                color: '#fff',
                borderRadius: 1,
                px: 1.5,
                py: 1,
                maxWidth: 320,
                '@media print': { WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' },
              }}
            >
              {clinic.address && (
                <Typography variant="caption" display="block">
                  {clinic.address}
                </Typography>
              )}
              {(clinic.email || clinic.website) && (
                <Typography variant="caption" display="block">
                  {[clinic.email, clinic.website].filter(Boolean).join('   ·   ')}
                </Typography>
              )}
              {(clinic.contact_phone || clinic.alternate_phone) && (
                <Typography variant="caption" display="block">
                  {tDoc('prescription.forAppointment')}: {[clinic.contact_phone, clinic.alternate_phone].filter(Boolean).join(' / ')}
                  {clinic.appointment_note ? `   ·   ${clinic.appointment_note}` : ''}
                </Typography>
              )}
            </Box>
          )}
        </Box>
        <Box textAlign="center">
          <Divider sx={{ width: 200, mb: 0.5 }} />
          <Typography variant="body2" fontWeight={700}>
            {clinician.full_name}
          </Typography>
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
