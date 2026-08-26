import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, gql } from '@apollo/client'
import { useSnackbar } from 'notistack'
import {
  Alert, Autocomplete, Box, Button, Chip, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogContentText, DialogTitle, Divider, Grid, List,
  ListItemButton, ListItemText, Paper, Stack, TextField, Typography,
} from '@mui/material'
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded'
import LockRoundedIcon from '@mui/icons-material/LockRounded'
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded'
import NoteAddRoundedIcon from '@mui/icons-material/NoteAddRounded'
import AttachFileRoundedIcon from '@mui/icons-material/AttachFileRounded'
import DoneAllRoundedIcon from '@mui/icons-material/DoneAllRounded'
import MedicationRoundedIcon from '@mui/icons-material/MedicationRounded'
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded'
import BiotechRoundedIcon from '@mui/icons-material/BiotechRounded'
import ForwardToInboxRoundedIcon from '@mui/icons-material/ForwardToInboxRounded'
import { useAuth } from '../../hooks/useAuth'
import ErrorBoundary from '../../components/ErrorBoundary'
import { downloadAuthenticatedPdf } from '../../utils/documents'

// ─── GraphQL (REQ020 P0) ────────────────────────────────────────────────────
// A new domain, no pre-existing frontend contract to match (Hard Rule 7 is
// moot here) — defined inline, matching manager/resources/index.jsx's own
// established convention for a just-shipped backend module.

const GET_OR_CREATE_ENCOUNTER = gql`
  mutation GetOrCreateEncounter($appointment_id: ID!) {
    getOrCreateEncounter(appointment_id: $appointment_id) { id patient_id clinician_id }
  }
`

const ENCOUNTER_QUERY = gql`
  query Encounter($id: ID!) {
    encounter(id: $id) {
      id patient_id status locked signed_at
      notes { id section content version }
      addenda { id author_id content reason created_at }
      diagnoses { id type icd10_code text status created_at }
      attachments { id file_ref mime_type original_filename created_at }
      investigation_orders { id test_name test_type urgency status date_ordered }
      referrals { id referred_to_specialty referred_to_clinician_id reason urgency status created_at }
    }
  }
`

const PATIENT_ALLERGY_BANNER = gql`
  query PatientAllergyBanner($patient_id: ID!) {
    patientAllergyBanner(patient_id: $patient_id) { id text icd10_code }
  }
`

const PATIENT_TIMELINE = gql`
  query PatientTimeline($patient_id: ID!) {
    patientTimeline(patient_id: $patient_id) { id type date title summary encounter_id }
  }
`

const ENCOUNTER_TEMPLATES = gql`
  query EncounterTemplates { encounterTemplates { id name specialty sections_json } }
`

const SAVE_NOTE = gql`
  mutation SaveEncounterNote($input: SaveEncounterNoteInput!) {
    saveEncounterNote(input: $input) { id section content version }
  }
`
const ADD_ADDENDUM = gql`
  mutation AddEncounterAddendum($input: AddAddendumInput!) {
    addEncounterAddendum(input: $input) { id content reason created_at }
  }
`
const SIGN_ENCOUNTER = gql`
  mutation SignEncounter($encounter_id: ID!) { signEncounter(encounter_id: $encounter_id) { id locked signed_at } }
`
const APPLY_TEMPLATE = gql`
  mutation ApplyEncounterTemplate($input: ApplyTemplateInput!) {
    applyEncounterTemplate(input: $input) { id notes { id section content version } }
  }
`
const CREATE_ATTACHMENT = gql`
  mutation CreateEncounterAttachment($input: CreateAttachmentInput!) {
    createEncounterAttachment(input: $input) { id file_ref original_filename }
  }
`

// A-5/A-6 (project-plans/08-integration-gap-analysis.md) — both real,
// tested mutations with no UI at all: diagnoses were queried but never
// once rendered (not even read-only), and encounterTemplates' own
// "No templates yet." empty state could never resolve itself through the
// app since nothing ever called createEncounterTemplate.
const CREATE_DIAGNOSIS = gql`
  mutation CreateDiagnosis($input: CreateDiagnosisInput!) {
    createDiagnosis(input: $input) { id type icd10_code text status created_at }
  }
`
// REQ127 (FR-EMR-08) — structured investigation orders, distinct from the
// pre-existing free-text "Investigations" note SECTION above.
const ORDER_INVESTIGATION = gql`
  mutation OrderInvestigation($input: OrderInvestigationInput!) {
    orderInvestigation(input: $input) { id test_name test_type urgency status date_ordered }
  }
`
// REQ128 (FR-EMR-10)
const CREATE_REFERRAL = gql`
  mutation CreateReferral($input: CreateReferralInput!) {
    createReferral(input: $input) { id referred_to_specialty referred_to_clinician_id reason urgency status created_at }
  }
`
const CREATE_ENCOUNTER_TEMPLATE = gql`
  mutation CreateEncounterTemplate($input: CreateEncounterTemplateInput!) {
    createEncounterTemplate(input: $input) { id name specialty sections_json }
  }
`
// REQ108 — platform reference data (ungated, like clinicianTypes/roomTypes).
const ICD10_SEARCH_QUERY = gql`
  query Icd10Codes($search: String) {
    icd10Codes(search: $search) { id code description category }
  }
`

const SECTIONS = [
  { key: 'complaints', label: 'Chief Complaints' },
  { key: 'history', label: 'History' },
  { key: 'exam', label: 'Examination' },
  { key: 'vitals', label: 'Vitals' },
  { key: 'diagnosis', label: 'Diagnosis' },
  { key: 'investigations', label: 'Investigations' },
  { key: 'advice', label: 'Advice' },
  { key: 'follow_up', label: 'Follow-up' },
]

function sectionContent(notes, key) {
  return notes?.find((n) => n.section === key)?.content ?? ''
}

// ─── Left pane: patient timeline ───────────────────────────────────────────
function TimelinePane({ patientId }) {
  const { data, loading } = useQuery(PATIENT_TIMELINE, { variables: { patient_id: patientId }, skip: !patientId })
  const events = data?.patientTimeline ?? []
  return (
    <Paper variant="outlined" sx={{ p: 2, height: '100%', overflowY: 'auto' }}>
      <Typography variant="subtitle2" fontWeight={700} mb={1.5}>Patient Timeline</Typography>
      {loading && <CircularProgress size={20} />}
      {!loading && events.length === 0 && (
        <Typography variant="body2" color="text.secondary">No history yet.</Typography>
      )}
      <Stack spacing={1.5}>
        {events.map((e) => (
          <Box key={`${e.type}-${e.id}`}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Chip size="small" label={e.type.replace('_', ' ')} />
              <Typography variant="caption" color="text.secondary">
                {new Date(e.date).toLocaleDateString()}
              </Typography>
            </Stack>
            <Typography variant="body2" fontWeight={600}>{e.title}</Typography>
            {e.summary && <Typography variant="caption" color="text.secondary">{e.summary}</Typography>}
          </Box>
        ))}
      </Stack>
    </Paper>
  )
}

// ─── Center pane: structured note sections ─────────────────────────────────
function NotesPane({ encounter, onSaveNote, onAddAddendum, onAddDiagnosis, onAddInvestigation, onAddReferral }) {
  const [drafts, setDrafts] = useState({})
  const [addendumOpen, setAddendumOpen] = useState(false)
  const [addendumText, setAddendumText] = useState('')
  const [diagnosisOpen, setDiagnosisOpen] = useState(false)
  const [diagnosisForm, setDiagnosisForm] = useState({ type: 'diagnosis', text: '', icd10_code: '' })
  const [investigationOpen, setInvestigationOpen] = useState(false)
  const [investigationForm, setInvestigationForm] = useState({ test_name: '', test_type: '', urgency: 'routine' })
  const [referralOpen, setReferralOpen] = useState(false)
  const [referralForm, setReferralForm] = useState({ referred_to_specialty: '', reason: '', urgency: 'routine' })

  // REQ108 — ICD-10 type-ahead search, freeSolo (a clinician can still type
  // free text or leave it blank — soft validation only, per REQ108's own
  // scope). 300ms debounce, same pattern as patients/index.jsx's own search.
  const [icd10Search, setIcd10Search] = useState('')
  const [icd10Debounced, setIcd10Debounced] = useState('')
  useEffect(() => {
    const t = setTimeout(() => setIcd10Debounced(icd10Search), 300)
    return () => clearTimeout(t)
  }, [icd10Search])
  const { data: icd10Data, loading: icd10Loading } = useQuery(ICD10_SEARCH_QUERY, {
    variables: { search: icd10Debounced || undefined },
    skip: !diagnosisOpen,
  })
  const icd10Options = icd10Data?.icd10Codes ?? []

  useEffect(() => {
    const next = {}
    SECTIONS.forEach((s) => { next[s.key] = sectionContent(encounter?.notes, s.key) })
    setDrafts(next)
  }, [encounter?.notes])

  const locked = !!encounter?.locked

  return (
    <Paper variant="outlined" sx={{ p: 2, height: '100%', overflowY: 'auto' }}>
      {locked && (
        <Alert severity="info" icon={<LockRoundedIcon />} sx={{ mb: 2 }}>
          This encounter has been signed and is read-only.
          <Button size="small" sx={{ ml: 2 }} onClick={() => setAddendumOpen(true)}>Add Addendum</Button>
        </Alert>
      )}
      <Stack spacing={2.5}>
        {SECTIONS.map((s) => (
          <Box key={s.key}>
            <Typography variant="subtitle2" fontWeight={700} mb={0.5} id={`section-label-${s.key}`}>{s.label}</Typography>
            <TextField
              fullWidth multiline minRows={2}
              inputProps={{ 'aria-labelledby': `section-label-${s.key}` }}
              value={drafts[s.key] ?? ''}
              disabled={locked}
              onChange={(e) => setDrafts((d) => ({ ...d, [s.key]: e.target.value }))}
              onBlur={() => {
                if ((drafts[s.key] ?? '') !== sectionContent(encounter?.notes, s.key)) {
                  onSaveNote(s.key, drafts[s.key] ?? '')
                }
              }}
            />
          </Box>
        ))}

        <Box>
          <Divider sx={{ my: 1 }} />
          <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1}>
            <Typography variant="subtitle2" fontWeight={700}>Diagnoses</Typography>
            {!locked && (
              <Button size="small" startIcon={<MedicationRoundedIcon fontSize="small" />} onClick={() => setDiagnosisOpen(true)}>
                Add Diagnosis
              </Button>
            )}
          </Stack>
          {(encounter?.diagnoses?.length ?? 0) === 0 ? (
            <Typography variant="body2" color="text.secondary">No diagnoses recorded yet.</Typography>
          ) : (
            <Stack spacing={1}>
              {encounter.diagnoses.map((d) => (
                <Paper key={d.id} variant="outlined" sx={{ p: 1.5, bgcolor: d.type === 'allergy' ? '#FFF4E5' : '#FAFAFA' }}>
                  <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
                    <Chip size="small" label={d.type} sx={{ textTransform: 'capitalize' }} />
                    {d.status && <Chip size="small" label={d.status} variant="outlined" sx={{ textTransform: 'capitalize' }} />}
                    {d.icd10_code && <Typography variant="caption" color="text.secondary">{d.icd10_code}</Typography>}
                  </Stack>
                  <Typography variant="body2">{d.text}</Typography>
                </Paper>
              ))}
            </Stack>
          )}
        </Box>

        <Box>
          <Divider sx={{ my: 1 }} />
          <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1}>
            <Typography variant="subtitle2" fontWeight={700}>Investigations</Typography>
            {!locked && (
              <Button size="small" startIcon={<BiotechRoundedIcon fontSize="small" />} onClick={() => setInvestigationOpen(true)}>
                Order Investigation
              </Button>
            )}
          </Stack>
          {(encounter?.investigation_orders?.length ?? 0) === 0 ? (
            <Typography variant="body2" color="text.secondary">No investigations ordered yet.</Typography>
          ) : (
            <Stack spacing={1}>
              {encounter.investigation_orders.map((o) => (
                <Paper key={o.id} variant="outlined" sx={{ p: 1.5, bgcolor: 'grey.50' }}>
                  <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
                    <Chip size="small" label={o.test_type} sx={{ textTransform: 'capitalize' }} />
                    <Chip size="small" label={o.urgency} color={o.urgency === 'stat' ? 'error' : o.urgency === 'urgent' ? 'warning' : 'default'} variant="outlined" sx={{ textTransform: 'capitalize' }} />
                    <Chip size="small" label={o.status} variant="outlined" sx={{ textTransform: 'capitalize' }} />
                  </Stack>
                  <Typography variant="body2">{o.test_name}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Ordered {new Date(o.date_ordered).toLocaleDateString()}
                  </Typography>
                </Paper>
              ))}
            </Stack>
          )}
        </Box>

        <Box>
          <Divider sx={{ my: 1 }} />
          <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1}>
            <Typography variant="subtitle2" fontWeight={700}>Referrals</Typography>
            {!locked && (
              <Button size="small" startIcon={<ForwardToInboxRoundedIcon fontSize="small" />} onClick={() => setReferralOpen(true)}>
                Refer Patient
              </Button>
            )}
          </Stack>
          {(encounter?.referrals?.length ?? 0) === 0 ? (
            <Typography variant="body2" color="text.secondary">No referrals made yet.</Typography>
          ) : (
            <Stack spacing={1}>
              {encounter.referrals.map((r) => (
                <Paper key={r.id} variant="outlined" sx={{ p: 1.5, bgcolor: 'grey.50' }}>
                  <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
                    <Chip size="small" label={r.referred_to_specialty} />
                    <Chip size="small" label={r.urgency} color={r.urgency === 'urgent' ? 'warning' : 'default'} variant="outlined" sx={{ textTransform: 'capitalize' }} />
                    <Chip size="small" label={r.status} variant="outlined" sx={{ textTransform: 'capitalize' }} />
                  </Stack>
                  <Typography variant="body2">{r.reason}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Referred {new Date(r.created_at).toLocaleDateString()}
                  </Typography>
                </Paper>
              ))}
            </Stack>
          )}
        </Box>

        {encounter?.addenda?.length > 0 && (
          <Box>
            <Divider sx={{ my: 1 }} />
            <Typography variant="subtitle2" fontWeight={700} mb={1}>Addenda</Typography>
            <Stack spacing={1}>
              {encounter.addenda.map((a) => (
                <Paper key={a.id} variant="outlined" sx={{ p: 1.5, bgcolor: '#FAFAFA' }}>
                  <Typography variant="body2">{a.content}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(a.created_at).toLocaleString()}{a.reason ? ` — ${a.reason}` : ''}
                  </Typography>
                </Paper>
              ))}
            </Stack>
          </Box>
        )}
      </Stack>

      <Dialog open={addendumOpen} onClose={() => setAddendumOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Add Addendum</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth multiline minRows={3} sx={{ mt: 1 }}
            label="Addendum" value={addendumText} onChange={(e) => setAddendumText(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddendumOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!addendumText.trim()}
            onClick={async () => {
              await onAddAddendum(addendumText.trim())
              setAddendumText('')
              setAddendumOpen(false)
            }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={diagnosisOpen} onClose={() => setDiagnosisOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Add Diagnosis</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              select fullWidth label="Type" value={diagnosisForm.type}
              onChange={(e) => setDiagnosisForm((f) => ({ ...f, type: e.target.value }))}
              SelectProps={{ native: true }}
            >
              <option value="diagnosis">Diagnosis</option>
              <option value="allergy">Allergy</option>
            </TextField>
            <TextField
              fullWidth multiline minRows={2} label="Description" value={diagnosisForm.text}
              onChange={(e) => setDiagnosisForm((f) => ({ ...f, text: e.target.value }))}
            />
            <Autocomplete
              freeSolo
              fullWidth
              options={icd10Options}
              loading={icd10Loading}
              inputValue={diagnosisForm.icd10_code}
              onInputChange={(_, value, reason) => {
                setIcd10Search(value)
                // 'reason' distinguishes real typing from MUI's own
                // programmatic sync of the input text after a selection
                // (reason: 'reset') or a clear (reason: 'clear') — only
                // real typing should write free text here, otherwise this
                // clobbers the clean code onChange just set below with the
                // selected option's full rendered label.
                if (reason === 'input') setDiagnosisForm((f) => ({ ...f, icd10_code: value }))
              }}
              onChange={(_, value) => {
                // A selected option is an { id, code, ... } object; a
                // freeSolo Enter/blur with no selection passes the raw
                // string (or null on clear) instead — store just the code
                // string either way, matching the field's existing shape.
                const code = value && typeof value === 'object' ? value.code : (value ?? '')
                setDiagnosisForm((f) => ({ ...f, icd10_code: code }))
              }}
              getOptionLabel={(option) => (typeof option === 'string' ? option : `${option.code} — ${option.description}`)}
              isOptionEqualToValue={(option, value) => option.code === (typeof value === 'string' ? value : value?.code)}
              noOptionsText={icd10Search.length < 1 ? 'Start typing a code or description…' : 'No match — you can still save this as free text'}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="ICD-10 code (optional)"
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {icd10Loading ? <CircularProgress size={16} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDiagnosisOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!diagnosisForm.text.trim()}
            onClick={async () => {
              await onAddDiagnosis({ type: diagnosisForm.type, text: diagnosisForm.text.trim(), icd10_code: diagnosisForm.icd10_code.trim() || undefined })
              setDiagnosisForm({ type: 'diagnosis', text: '', icd10_code: '' })
              setDiagnosisOpen(false)
            }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={investigationOpen} onClose={() => setInvestigationOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Order Investigation</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              fullWidth label="Test name" value={investigationForm.test_name}
              onChange={(e) => setInvestigationForm((f) => ({ ...f, test_name: e.target.value }))}
            />
            <TextField
              fullWidth label="Test type" placeholder="e.g. Blood, Imaging, Urine"
              value={investigationForm.test_type}
              onChange={(e) => setInvestigationForm((f) => ({ ...f, test_type: e.target.value }))}
            />
            <TextField
              select fullWidth label="Urgency" value={investigationForm.urgency}
              onChange={(e) => setInvestigationForm((f) => ({ ...f, urgency: e.target.value }))}
              SelectProps={{ native: true }}
            >
              <option value="routine">Routine</option>
              <option value="urgent">Urgent</option>
              <option value="stat">STAT</option>
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInvestigationOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!investigationForm.test_name.trim() || !investigationForm.test_type.trim()}
            onClick={async () => {
              await onAddInvestigation({
                test_name: investigationForm.test_name.trim(),
                test_type: investigationForm.test_type.trim(),
                urgency: investigationForm.urgency,
              })
              setInvestigationForm({ test_name: '', test_type: '', urgency: 'routine' })
              setInvestigationOpen(false)
            }}
          >
            Order
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={referralOpen} onClose={() => setReferralOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Refer Patient</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              fullWidth label="Refer to specialty" placeholder="e.g. Cardiology, Orthopaedics"
              value={referralForm.referred_to_specialty}
              onChange={(e) => setReferralForm((f) => ({ ...f, referred_to_specialty: e.target.value }))}
            />
            <TextField
              fullWidth multiline minRows={2} label="Reason for referral" value={referralForm.reason}
              onChange={(e) => setReferralForm((f) => ({ ...f, reason: e.target.value }))}
            />
            <TextField
              select fullWidth label="Urgency" value={referralForm.urgency}
              onChange={(e) => setReferralForm((f) => ({ ...f, urgency: e.target.value }))}
              SelectProps={{ native: true }}
            >
              <option value="routine">Routine</option>
              <option value="urgent">Urgent</option>
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReferralOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!referralForm.referred_to_specialty.trim() || !referralForm.reason.trim()}
            onClick={async () => {
              await onAddReferral({
                referred_to_specialty: referralForm.referred_to_specialty.trim(),
                reason: referralForm.reason.trim(),
                urgency: referralForm.urgency,
              })
              setReferralForm({ referred_to_specialty: '', reason: '', urgency: 'routine' })
              setReferralOpen(false)
            }}
          >
            Refer
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  )
}

// ─── Right pane: templates, attachments, sign-off ──────────────────────────
function ActionsPane({ encounter, onApplyTemplate, onSaveAsTemplate, onSign, onUpload, onNewPrescription }) {
  const { data: templatesData, refetch: refetchTemplates } = useQuery(ENCOUNTER_TEMPLATES)
  const templates = templatesData?.encounterTemplates ?? []
  const [signOpen, setSignOpen] = useState(false)
  const [downloadingSummary, setDownloadingSummary] = useState(false)
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false)
  const [templateForm, setTemplateForm] = useState({ name: '', specialty: '' })
  const { enqueueSnackbar } = useSnackbar()
  const locked = !!encounter?.locked

  // REQ057 (US-PAT-02) — real server-side PDF, not window.print().
  const handleDownloadSummary = useCallback(async () => {
    if (!encounter?.id) return
    setDownloadingSummary(true)
    try {
      await downloadAuthenticatedPdf(`/documents/visit-summaries/${encounter.id}/pdf`, `visit-summary-${encounter.id}.pdf`)
    } catch (err) {
      enqueueSnackbar(err?.message || 'Failed to download visit summary', { variant: 'error' })
    } finally {
      setDownloadingSummary(false)
    }
  }, [encounter?.id, enqueueSnackbar])

  return (
    <Paper variant="outlined" sx={{ p: 2, height: '100%', overflowY: 'auto' }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1}>
        <Typography variant="subtitle2" fontWeight={700}>Templates</Typography>
        <Button size="small" disabled={locked} onClick={() => setSaveTemplateOpen(true)}>Save as template</Button>
      </Stack>
      <List dense disablePadding>
        {templates.length === 0 && (
          <Typography variant="body2" color="text.secondary">No templates yet.</Typography>
        )}
        {templates.map((t) => (
          <ListItemButton
            key={t.id} disabled={locked}
            onClick={() => onApplyTemplate(t.id)}
            sx={{ borderRadius: 1, mb: 0.5 }}
          >
            <NoteAddRoundedIcon fontSize="small" sx={{ mr: 1 }} />
            <ListItemText primary={t.name} secondary={t.specialty || undefined} />
          </ListItemButton>
        ))}
      </List>

      <Dialog open={saveTemplateOpen} onClose={() => setSaveTemplateOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Save Current Note as Template</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Saves this encounter's current section content as a reusable, org-shared template.
          </DialogContentText>
          <Stack spacing={2}>
            <TextField fullWidth label="Template Name" value={templateForm.name} onChange={(e) => setTemplateForm((f) => ({ ...f, name: e.target.value }))} />
            <TextField fullWidth label="Specialty (optional)" value={templateForm.specialty} onChange={(e) => setTemplateForm((f) => ({ ...f, specialty: e.target.value }))} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSaveTemplateOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!templateForm.name.trim()}
            onClick={async () => {
              await onSaveAsTemplate({ name: templateForm.name.trim(), specialty: templateForm.specialty.trim() || undefined })
              setTemplateForm({ name: '', specialty: '' })
              setSaveTemplateOpen(false)
              refetchTemplates()
            }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Divider sx={{ my: 2 }} />

      <Typography variant="subtitle2" fontWeight={700} mb={1}>Attachments</Typography>
      <Button
        component="label" fullWidth variant="outlined" startIcon={<AttachFileRoundedIcon />}
        disabled={locked} sx={{ mb: 1 }}
      >
        Upload File
        <input type="file" hidden accept="image/png,image/jpeg,application/pdf" onChange={onUpload} />
      </Button>
      <Stack spacing={0.5}>
        {(encounter?.attachments ?? []).map((a) => (
          <Typography key={a.id} variant="caption" component="a" href={a.file_ref} target="_blank" rel="noreferrer">
            {a.original_filename}
          </Typography>
        ))}
      </Stack>

      <Divider sx={{ my: 2 }} />

      {/* REQ021: prescription builder entry point. Independent of the
          encounter's own lock state -- issuing a script and signing the
          encounter are separate actions (see PLAN057). */}
      <Button
        fullWidth variant="outlined" startIcon={<MedicationRoundedIcon />}
        onClick={onNewPrescription}
        sx={{ mb: 1 }}
      >
        New Prescription
      </Button>

      <Button
        fullWidth variant="outlined" startIcon={downloadingSummary ? <CircularProgress size={16} /> : <DownloadRoundedIcon />}
        onClick={handleDownloadSummary}
        disabled={downloadingSummary}
        sx={{ mb: 2 }}
      >
        {downloadingSummary ? 'Preparing PDF…' : 'Download Visit Summary PDF'}
      </Button>

      <Button
        fullWidth variant="contained" color="success" startIcon={<DoneAllRoundedIcon />}
        disabled={locked}
        onClick={() => setSignOpen(true)}
      >
        {locked ? 'Signed' : 'Sign Encounter'}
      </Button>

      <Dialog open={signOpen} onClose={() => setSignOpen(false)}>
        <DialogTitle>Sign this encounter?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Once signed, the notes and diagnoses on this encounter become read-only.
            This cannot be undone — corrections after this point go through an addendum.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSignOpen(false)}>Cancel</Button>
          <Button variant="contained" color="success" onClick={async () => { await onSign(); setSignOpen(false) }}>
            Sign
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  )
}

function EncounterWorkspace() {
  const { appointmentId } = useParams()
  const navigate = useNavigate()
  const { hasRole } = useAuth()
  const isClinician = hasRole('clinician')
  const { enqueueSnackbar } = useSnackbar()

  const [encounterId, setEncounterId] = useState(null)
  const [initError, setInitError] = useState(null)

  const [getOrCreateEncounter] = useMutation(GET_OR_CREATE_ENCOUNTER)
  const { data, loading, error, refetch } = useQuery(ENCOUNTER_QUERY, {
    variables: { id: encounterId }, skip: !encounterId, fetchPolicy: 'network-only',
  })
  const encounter = data?.encounter

  useEffect(() => {
    let cancelled = false
    getOrCreateEncounter({ variables: { appointment_id: appointmentId } })
      .then(({ data: d }) => { if (!cancelled) setEncounterId(d?.getOrCreateEncounter?.id ?? null) })
      .catch((err) => { if (!cancelled) setInitError(err?.graphQLErrors?.[0]?.message || err.message) })
    return () => { cancelled = true }
  }, [appointmentId, getOrCreateEncounter])

  const [saveNote] = useMutation(SAVE_NOTE)
  const [addAddendum] = useMutation(ADD_ADDENDUM)
  const [signEncounter] = useMutation(SIGN_ENCOUNTER)
  const [applyTemplate] = useMutation(APPLY_TEMPLATE)
  const [createAttachment] = useMutation(CREATE_ATTACHMENT)
  const [createDiagnosis] = useMutation(CREATE_DIAGNOSIS)
  const [orderInvestigationMutation] = useMutation(ORDER_INVESTIGATION)
  const [createReferralMutation] = useMutation(CREATE_REFERRAL)
  const [createEncounterTemplate] = useMutation(CREATE_ENCOUNTER_TEMPLATE)

  const { data: allergyData } = useQuery(PATIENT_ALLERGY_BANNER, {
    variables: { patient_id: encounter?.patient_id }, skip: !encounter?.patient_id,
  })

  // A save that fails silently is a data-loss bug in a clinical note --
  // found live (BUG020): saveEncounterNote's content field was un-validated
  // and the pipe rejected it, but nothing surfaced that to the clinician, so
  // a typed note looked saved and was gone on reload. Every mutation here
  // now reports its own failure rather than letting the caller forget to.
  const reportError = useCallback((err, fallback) => {
    enqueueSnackbar(err?.graphQLErrors?.[0]?.message || err?.message || fallback, { variant: 'error' })
  }, [enqueueSnackbar])

  const handleSaveNote = useCallback(async (section, content) => {
    try {
      await saveNote({ variables: { input: { encounter_id: encounterId, section, content } } })
      refetch()
    } catch (err) { reportError(err, 'Failed to save note') }
  }, [saveNote, encounterId, refetch, reportError])

  const handleAddAddendum = useCallback(async (content) => {
    try {
      await addAddendum({ variables: { input: { encounter_id: encounterId, content } } })
      refetch()
    } catch (err) { reportError(err, 'Failed to add addendum') }
  }, [addAddendum, encounterId, refetch, reportError])

  const handleSign = useCallback(async () => {
    try {
      await signEncounter({ variables: { encounter_id: encounterId } })
      refetch()
    } catch (err) { reportError(err, 'Failed to sign encounter') }
  }, [signEncounter, encounterId, refetch, reportError])

  const handleApplyTemplate = useCallback(async (templateId) => {
    try {
      await applyTemplate({ variables: { input: { encounter_id: encounterId, template_id: templateId } } })
      refetch()
    } catch (err) { reportError(err, 'Failed to apply template') }
  }, [applyTemplate, encounterId, refetch, reportError])

  const handleAddDiagnosis = useCallback(async (input) => {
    try {
      await createDiagnosis({ variables: { input: { encounter_id: encounterId, ...input } } })
      refetch()
    } catch (err) { reportError(err, 'Failed to add diagnosis') }
  }, [createDiagnosis, encounterId, refetch, reportError])

  const handleAddInvestigation = useCallback(async (input) => {
    try {
      await orderInvestigationMutation({ variables: { input: { encounter_id: encounterId, ...input } } })
      refetch()
    } catch (err) { reportError(err, 'Failed to order investigation') }
  }, [orderInvestigationMutation, encounterId, refetch, reportError])

  const handleAddReferral = useCallback(async (input) => {
    try {
      await createReferralMutation({ variables: { input: { encounter_id: encounterId, ...input } } })
      refetch()
    } catch (err) { reportError(err, 'Failed to refer patient') }
  }, [createReferralMutation, encounterId, refetch, reportError])

  const handleSaveAsTemplate = useCallback(async ({ name, specialty }) => {
    try {
      const sections = {}
      SECTIONS.forEach((s) => { sections[s.key] = sectionContent(encounter?.notes, s.key) })
      await createEncounterTemplate({ variables: { input: { name, specialty, sections_json: JSON.stringify(sections), org_shared: true } } })
      enqueueSnackbar('Template saved.', { variant: 'success' })
    } catch (err) { reportError(err, 'Failed to save template') }
  }, [createEncounterTemplate, encounter?.notes, enqueueSnackbar, reportError])

  const handleUpload = useCallback(async (e) => {
    const file = e.target.files?.[0]
    if (!file || !encounterId) return
    const token = localStorage.getItem('medibook_token') || sessionStorage.getItem('medibook_token')
    const apiBase = (import.meta.env.VITE_GRAPHQL_URL || 'http://localhost:4000/graphql').replace(/\/graphql$/, '')
    const formData = new FormData()
    formData.append('file', file)
    const res = await fetch(`${apiBase}/encounter-attachments/upload`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: formData,
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) { enqueueSnackbar(body?.message || 'Failed to upload file', { variant: 'error' }); return }
    try {
      await createAttachment({
        variables: { input: { encounter_id: encounterId, file_ref: body.file_ref, mime_type: body.mime_type, original_filename: file.name } },
      })
      refetch()
    } catch (err) { reportError(err, 'Failed to save attachment') }
  }, [encounterId, createAttachment, refetch, enqueueSnackbar, reportError])

  if (initError) {
    return (
      <Box p={3}>
        <Button startIcon={<ArrowBackRoundedIcon />} onClick={() => navigate(-1)}>Back</Button>
        <Alert severity="error" sx={{ mt: 2 }}>{initError}</Alert>
      </Box>
    )
  }

  if (!isClinician) {
    return (
      <Box p={3}>
        <Alert severity="warning">Only clinicians may open the consultation workspace.</Alert>
      </Box>
    )
  }

  return (
    <ErrorBoundary>
      <Box p={{ xs: 1.5, md: 3 }}>
        <Stack direction="row" spacing={1.5} alignItems="center" mb={2}>
          <Button startIcon={<ArrowBackRoundedIcon />} onClick={() => navigate(`/appointments/${appointmentId}`)}>Back</Button>
          <Typography variant="h6" fontWeight={700}>Consultation</Typography>
          {encounter?.locked && <Chip size="small" color="success" icon={<LockRoundedIcon />} label="Signed" />}
        </Stack>

        {(allergyData?.patientAllergyBanner ?? []).length > 0 && (
          <Alert severity="warning" icon={<WarningAmberRoundedIcon />} sx={{ mb: 2 }}>
            Allergies: {allergyData.patientAllergyBanner.map((a) => a.text).join(', ')}
          </Alert>
        )}

        {loading && <CircularProgress />}
        {error && <Alert severity="error">{error.message}</Alert>}

        {encounter && (
          <Grid container spacing={2} sx={{ minHeight: '70vh' }}>
            <Grid item xs={12} md={3}>
              <TimelinePane patientId={encounter.patient_id} />
            </Grid>
            <Grid item xs={12} md={6}>
              <NotesPane encounter={encounter} onSaveNote={handleSaveNote} onAddAddendum={handleAddAddendum} onAddDiagnosis={handleAddDiagnosis} onAddInvestigation={handleAddInvestigation} onAddReferral={handleAddReferral} />
            </Grid>
            <Grid item xs={12} md={3}>
              <ActionsPane
                encounter={encounter}
                onApplyTemplate={handleApplyTemplate}
                onSaveAsTemplate={handleSaveAsTemplate}
                onSign={handleSign}
                onUpload={handleUpload}
                onNewPrescription={() => navigate(`/clinician/prescriptions/new?encounterId=${encounter.id}&patientId=${encounter.patient_id}`)}
              />
            </Grid>
          </Grid>
        )}
      </Box>
    </ErrorBoundary>
  )
}

export default EncounterWorkspace
