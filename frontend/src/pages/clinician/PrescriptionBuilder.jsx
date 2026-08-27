import { useState, useMemo } from 'react'
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom'
import { useQuery, useMutation, useLazyQuery, gql } from '@apollo/client'
import { useSnackbar } from 'notistack'
import { alpha } from '@mui/material'
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  Grid,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded'
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded'
import BookmarkRoundedIcon from '@mui/icons-material/BookmarkRounded'

// ─── GraphQL (REQ021 P0) ────────────────────────────────────────────────────

const DRUGS_QUERY = gql`
  query SearchDrugs($search: String) {
    drugs(search: $search) {
      id
      name
      strength
      form
      composition
    }
  }
`
// REQ159 (P2-07) — same query EncounterWorkspace.jsx's own persistent
// allergy banner already uses (patientAllergyBanner), reused verbatim
// here rather than re-declared with different fields.
const PATIENT_ALLERGY_BANNER = gql`
  query PatientAllergyBanner($patient_id: ID!) {
    patientAllergyBanner(patient_id: $patient_id) {
      id
      text
      icd10_code
    }
  }
`
const PATIENT_PRESCRIPTIONS_QUERY = gql`
  query PatientPrescriptions($patient_id: ID!) {
    patientPrescriptions(patient_id: $patient_id) {
      id
      issued_at
      items {
        drug_name
        dose
        frequency
      }
    }
  }
`
const PRESCRIPTION_SETS_QUERY = gql`
  query PrescriptionSets {
    prescriptionSets {
      id
      name
      specialty
    }
  }
`
const REPEAT_PRESCRIPTION_QUERY = gql`
  query RepeatPrescription($source_id: ID!) {
    repeatPrescription(source_id: $source_id) {
      items {
        drug_id
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
  }
`
const APPLY_SET_QUERY = gql`
  query ApplyPrescriptionSet($set_id: ID!) {
    applyPrescriptionSet(set_id: $set_id) {
      drug_id
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
`
const CREATE_PRESCRIPTION = gql`
  mutation CreatePrescription($input: CreatePrescriptionInput!) {
    createPrescription(input: $input) {
      id
    }
  }
`
const CREATE_PRESCRIPTION_SET = gql`
  mutation CreatePrescriptionSet($input: CreatePrescriptionSetInput!) {
    createPrescriptionSet(input: $input) {
      id
    }
  }
`

const FREQUENCIES = ['OD', 'BD', 'TDS', 'QID', 'HS', 'SOS']
const FREQUENCY_PER_DAY = { OD: 1, BD: 2, TDS: 3, QID: 4, HS: 1, SOS: null }

function computeQty(frequency, durationDays) {
  const perDay = FREQUENCY_PER_DAY[frequency]
  if (perDay == null || !durationDays) return ''
  return perDay * durationDays
}

function emptyLine() {
  return { drug: null, dose: '', frequency: 'OD', route: '', duration_days: '', qty: '', instructions: '', substitutable: true }
}

// REQ159 (P2-07) — a client-side mirror of the backend's own
// findAllergyConflict() (allergy-check.ts): the same bidirectional
// substring check, so the warning shown here matches exactly what the
// real hard-stop enforces server-side. This page's own check is UX
// only (SEC-18: a frontend check is never the security boundary) — the
// backend rejects the mutation regardless of what this function finds.
function findAllergyConflict(drug, allergies) {
  if (!drug?.name) return null
  const drugName = drug.name.toLowerCase().trim()
  const drugText = `${drug.name} ${drug.composition ?? ''}`.toLowerCase().trim()
  for (const allergy of allergies) {
    const allergyText = (allergy.text ?? '').toLowerCase().trim()
    if (allergyText.length < 3) continue
    if (drugText.includes(allergyText) || allergyText.includes(drugName)) return allergy
  }
  return null
}

function PrescriptionBuilder() {
  const [searchParams] = useSearchParams()
  const encounterId = searchParams.get('encounterId')
  const patientId = searchParams.get('patientId')
  const navigate = useNavigate()
  const location = useLocation()
  const { enqueueSnackbar } = useSnackbar()

  // P1-12 (FR-AI-04, "Voice-to-Rx") — EncounterWorkspace's AI Scribe panel
  // navigates here with draft items in router state (never a committed
  // prescription, never auto-submitted — the clinician still reviews and
  // hits Issue). Read once via useState's lazy initializer, so a later
  // in-page navigation (e.g. Back then forward) doesn't silently re-import.
  const importedAiDraftCount = location.state?.aiDraftItems?.length ?? 0
  const [lines, setLines] = useState(() => {
    const draft = location.state?.aiDraftItems
    if (!Array.isArray(draft) || draft.length === 0) return [emptyLine()]
    return draft.map((i) => {
      const frequency = i.frequency && FREQUENCY_PER_DAY[i.frequency] !== undefined ? i.frequency : 'OD'
      // P1-12's own exit criterion: voice-to-Rx reuses REQ021's existing
      // auto-quantity arithmetic rather than a second copy of it.
      const qty = computeQty(frequency, Number(i.duration_days))
      return {
        drug: i.drug_id ? { id: i.drug_id, name: i.matched_drug_name } : null,
        dose: i.dose ?? '',
        frequency,
        route: '',
        duration_days: i.duration_days ?? '',
        qty,
        instructions: i.drug_id ? '' : `AI-transcribed as "${i.drug_name_text}" — confirm the drug before issuing`,
        substitutable: true,
      }
    })
  })
  const [drugSearch, setDrugSearch] = useState('')
  const [historyOpen, setHistoryOpen] = useState(false)
  const [saveSetOpen, setSaveSetOpen] = useState(false)
  const [setName, setSetName] = useState('')

  const { data: drugsData } = useQuery(DRUGS_QUERY, { variables: { search: drugSearch }, skip: drugSearch.length < 2 })
  const { data: allergyData } = useQuery(PATIENT_ALLERGY_BANNER, { variables: { patient_id: patientId }, skip: !patientId })
  const allergies = useMemo(() => allergyData?.patientAllergyBanner ?? [], [allergyData])
  const { data: historyData } = useQuery(PATIENT_PRESCRIPTIONS_QUERY, {
    variables: { patient_id: patientId },
    skip: !patientId || !historyOpen,
  })
  const { data: setsData, refetch: refetchSets } = useQuery(PRESCRIPTION_SETS_QUERY)
  const [fetchRepeat] = useLazyQuery(REPEAT_PRESCRIPTION_QUERY)
  const [fetchApplySet] = useLazyQuery(APPLY_SET_QUERY)
  const [createPrescription, { loading: issuing }] = useMutation(CREATE_PRESCRIPTION)
  const [createPrescriptionSet] = useMutation(CREATE_PRESCRIPTION_SET)

  const drugOptions = drugsData?.drugs ?? []
  const sets = setsData?.prescriptionSets ?? []

  const updateLine = (idx, patch) => {
    setLines((prev) =>
      prev.map((l, i) => {
        if (i !== idx) return l
        const next = { ...l, ...patch }
        if ('frequency' in patch || 'duration_days' in patch) {
          next.qty = computeQty(next.frequency, Number(next.duration_days))
        }
        return next
      }),
    )
  }

  const addLine = () => setLines((prev) => [...prev, emptyLine()])
  const removeLine = (idx) => setLines((prev) => prev.filter((_, i) => i !== idx))

  const applyFetchedItems = (items) => {
    setLines(
      items.map((i) => ({
        drug: { id: i.drug_id, name: i.drug_name },
        dose: i.dose,
        frequency: i.frequency,
        route: i.route ?? '',
        duration_days: i.duration_days ?? '',
        qty: i.qty ?? '',
        instructions: i.instructions ?? '',
        substitutable: i.substitutable ?? true,
      })),
    )
  }

  const handleRepeat = async (sourceId) => {
    const { data } = await fetchRepeat({ variables: { source_id: sourceId } })
    if (data?.repeatPrescription?.items) applyFetchedItems(data.repeatPrescription.items)
    setHistoryOpen(false)
  }

  const handleApplySet = async (setId) => {
    const { data } = await fetchApplySet({ variables: { set_id: setId } })
    if (data?.applyPrescriptionSet) applyFetchedItems(data.applyPrescriptionSet)
  }

  const validLines = useMemo(() => lines.filter((l) => l.drug && l.dose && l.frequency), [lines])
  const lineConflicts = useMemo(() => lines.map((l) => (l.drug ? findAllergyConflict(l.drug, allergies) : null)), [lines, allergies])
  const hasAllergyConflict = lineConflicts.some(Boolean)

  const buildItemsInput = () =>
    validLines.map((l) => ({
      drug_id: l.drug.id,
      dose: l.dose,
      frequency: l.frequency,
      route: l.route || undefined,
      duration_days: l.duration_days ? Number(l.duration_days) : undefined,
      instructions: l.instructions || undefined,
      substitutable: l.substitutable,
    }))

  const handleIssue = async () => {
    if (validLines.length === 0) {
      enqueueSnackbar('Add at least one drug line before issuing', { variant: 'warning' })
      return
    }
    if (hasAllergyConflict) {
      enqueueSnackbar('Resolve the allergy conflict shown below before issuing', { variant: 'error' })
      return
    }
    try {
      const { data } = await createPrescription({
        variables: { input: { encounter_id: encounterId, items: buildItemsInput() } },
      })
      const id = data?.createPrescription?.id
      if (id) navigate(`/prescriptions/${id}/print`)
    } catch (err) {
      enqueueSnackbar(err?.graphQLErrors?.[0]?.message || err.message || 'Failed to issue prescription', { variant: 'error' })
    }
  }

  const handleSaveSet = async () => {
    if (!setName.trim() || validLines.length === 0) return
    try {
      await createPrescriptionSet({ variables: { input: { name: setName.trim(), items: buildItemsInput() } } })
      await refetchSets()
      enqueueSnackbar('Saved as a favourite set', { variant: 'success' })
      setSaveSetOpen(false)
      setSetName('')
    } catch (err) {
      enqueueSnackbar(err?.graphQLErrors?.[0]?.message || err.message || 'Failed to save set', { variant: 'error' })
    }
  }

  if (!encounterId) {
    return (
      <Box p={3}>
        <Alert severity="error">No encounter specified — open this page from a consultation.</Alert>
      </Box>
    )
  }

  return (
    <Box p={{ xs: 1.5, md: 3 }}>
      <Stack direction="row" spacing={1.5} alignItems="center" mb={2}>
        <Button startIcon={<ArrowBackRoundedIcon />} onClick={() => navigate(-1)}>
          Back
        </Button>
        <Typography variant="h6" fontWeight={700}>
          New Prescription
        </Typography>
      </Stack>

      {importedAiDraftCount > 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Imported {importedAiDraftCount} draft item{importedAiDraftCount === 1 ? '' : 's'} from AI Scribe — review each drug and dose
          before issuing. Nothing here has been saved yet.
        </Alert>
      )}

      <Grid container spacing={2}>
        <Grid item xs={12} md={8}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Drug</TableCell>
                    <TableCell>Dose</TableCell>
                    <TableCell>Frequency</TableCell>
                    <TableCell>Route</TableCell>
                    <TableCell>Duration (days)</TableCell>
                    <TableCell>Qty</TableCell>
                    <TableCell>Instructions</TableCell>
                    <TableCell />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {lines.map((line, idx) => (
                    <TableRow
                      key={idx}
                      sx={lineConflicts[idx] ? { bgcolor: (theme) => alpha(theme.palette.error.main, 0.08) } : undefined}
                    >
                      <TableCell sx={{ minWidth: 200 }}>
                        <Autocomplete
                          size="small"
                          options={drugOptions}
                          getOptionLabel={(opt) => (opt.name ? `${opt.name}${opt.strength ? ` (${opt.strength})` : ''}` : '')}
                          value={line.drug}
                          onChange={(_, v) => updateLine(idx, { drug: v })}
                          onInputChange={(_, v) => setDrugSearch(v)}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              placeholder="Search drug…"
                              error={Boolean(lineConflicts[idx])}
                              helperText={lineConflicts[idx] ? `Allergy: ${lineConflicts[idx].text}` : undefined}
                            />
                          )}
                          isOptionEqualToValue={(opt, val) => opt.id === val.id}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          value={line.dose}
                          onChange={(e) => updateLine(idx, { dose: e.target.value })}
                          placeholder="500mg"
                        />
                      </TableCell>
                      <TableCell>
                        <FormControl size="small" sx={{ minWidth: 90 }}>
                          <Select
                            inputProps={{ 'aria-label': 'Frequency' }}
                            value={line.frequency}
                            onChange={(e) => updateLine(idx, { frequency: e.target.value })}
                          >
                            {FREQUENCIES.map((f) => (
                              <MenuItem key={f} value={f}>
                                {f}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          value={line.route}
                          onChange={(e) => updateLine(idx, { route: e.target.value })}
                          placeholder="Oral"
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          type="number"
                          value={line.duration_days}
                          onChange={(e) => updateLine(idx, { duration_days: e.target.value })}
                          sx={{ width: 90 }}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          type="number"
                          value={line.qty}
                          onChange={(e) => updateLine(idx, { qty: e.target.value })}
                          sx={{ width: 70 }}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          value={line.instructions}
                          onChange={(e) => updateLine(idx, { instructions: e.target.value })}
                          placeholder="After food"
                        />
                      </TableCell>
                      <TableCell>
                        <IconButton size="small" onClick={() => removeLine(idx)} disabled={lines.length === 1}>
                          <DeleteRoundedIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <Button startIcon={<AddRoundedIcon />} onClick={addLine} sx={{ mt: 1.5 }}>
              Add Line
            </Button>

            <Divider sx={{ my: 2 }} />

            {hasAllergyConflict && (
              <Alert severity="error" sx={{ mb: 2 }}>
                One or more drugs above conflict with this patient's recorded allergies — resolve before issuing.
              </Alert>
            )}

            <Stack direction="row" spacing={1.5}>
              <Button variant="contained" onClick={handleIssue} disabled={issuing || validLines.length === 0 || hasAllergyConflict}>
                Issue Prescription
              </Button>
              <Button variant="outlined" onClick={() => setSaveSetOpen(true)} disabled={validLines.length === 0}>
                Save as Favourite Set
              </Button>
              {patientId && (
                <Button variant="outlined" startIcon={<HistoryRoundedIcon />} onClick={() => setHistoryOpen(true)}>
                  Repeat from History
                </Button>
              )}
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="subtitle2" fontWeight={700} mb={1}>
              Favourite Sets
            </Typography>
            <List dense disablePadding>
              {sets.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  No favourite sets yet.
                </Typography>
              )}
              {sets.map((s) => (
                <ListItemButton key={s.id} onClick={() => handleApplySet(s.id)} sx={{ borderRadius: 1, mb: 0.5 }}>
                  <BookmarkRoundedIcon fontSize="small" sx={{ mr: 1 }} />
                  <ListItemText primary={s.name} secondary={s.specialty || undefined} />
                </ListItemButton>
              ))}
            </List>
          </Paper>
        </Grid>
      </Grid>

      <Dialog open={historyOpen} onClose={() => setHistoryOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Repeat from History</DialogTitle>
        <DialogContent>
          <List dense>
            {(historyData?.patientPrescriptions ?? []).map((p) => (
              <ListItemButton key={p.id} onClick={() => handleRepeat(p.id)}>
                <ListItemText
                  primary={new Date(p.issued_at).toLocaleDateString()}
                  secondary={p.items.map((i) => `${i.drug_name} (${i.frequency})`).join(', ')}
                />
              </ListItemButton>
            ))}
            {(historyData?.patientPrescriptions ?? []).length === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
                No prior prescriptions.
              </Typography>
            )}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHistoryOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={saveSetOpen} onClose={() => setSaveSetOpen(false)}>
        <DialogTitle>Save as Favourite Set</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            sx={{ mt: 1 }}
            label="Set name"
            value={setName}
            onChange={(e) => setSetName(e.target.value)}
            placeholder="URI adult set"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSaveSetOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveSet} disabled={!setName.trim()}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default PrescriptionBuilder
