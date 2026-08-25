import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, gql } from '@apollo/client'
import { useSnackbar } from 'notistack'
import {
  Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions,
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
function NotesPane({ encounter, onSaveNote, onAddAddendum }) {
  const [drafts, setDrafts] = useState({})
  const [addendumOpen, setAddendumOpen] = useState(false)
  const [addendumText, setAddendumText] = useState('')

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
    </Paper>
  )
}

// ─── Right pane: templates, attachments, sign-off ──────────────────────────
function ActionsPane({ encounter, onApplyTemplate, onSign, onUpload, onNewPrescription }) {
  const { data: templatesData } = useQuery(ENCOUNTER_TEMPLATES)
  const templates = templatesData?.encounterTemplates ?? []
  const [signOpen, setSignOpen] = useState(false)
  const [downloadingSummary, setDownloadingSummary] = useState(false)
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
      <Typography variant="subtitle2" fontWeight={700} mb={1}>Templates</Typography>
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
              <NotesPane encounter={encounter} onSaveNote={handleSaveNote} onAddAddendum={handleAddAddendum} />
            </Grid>
            <Grid item xs={12} md={3}>
              <ActionsPane
                encounter={encounter}
                onApplyTemplate={handleApplyTemplate}
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
