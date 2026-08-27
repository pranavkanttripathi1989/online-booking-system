/**
 * Patient Data Importer — P2-05 (project-plans/phase-plans/02-phase2-win-the-midmarket.md).
 * Upload -> column mapping preview -> dry-run diff -> commit, with a
 * clear per-row error report at every stage. Desktop-dense tier (an
 * admin/manager back-office tool, not a patient-facing screen) — verify
 * at 1280/1440, per FRONTEND_RULES §5's own tiering table.
 *
 * The file itself never leaves the browser except as plain text sent to
 * the backend, which re-validates it fresh at both dryRunImport() and
 * commitImport() — this page never trusts its own earlier preview as
 * proof anything downstream is safe to skip re-checking (DATA-13's own
 * "never trust a client-supplied claim" spirit).
 */
import { useState, useCallback } from 'react'
import { useLazyQuery, useMutation, gql } from '@apollo/client'
import { useSnackbar } from 'notistack'
import {
  Box,
  Container,
  Paper,
  Stepper,
  Step,
  StepLabel,
  Typography,
  Button,
  Card,
  Chip,
  Stack,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  MenuItem,
  TextField,
  Grid,
} from '@mui/material'
import UploadFileRoundedIcon from '@mui/icons-material/UploadFileRounded'
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded'
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded'
import ErrorBoundary from '../../../components/ErrorBoundary'

const STEPS = ['Upload', 'Map columns', 'Dry run', 'Commit']

const TARGET_FIELD_LABELS = {
  first_name: 'First name',
  last_name: 'Last name',
  full_name: 'Full name',
  email: 'Email',
  phone: 'Phone',
  gender: 'Gender',
  address: 'Address',
  date_of_birth: 'Date of birth',
  medical_notes: 'Medical notes / history',
}

const PARSE_IMPORT_PREVIEW = gql`
  query ParseImportPreview($input: ParseImportPreviewInput!) {
    parseImportPreview(input: $input) {
      headers
      sampleRows {
        values
      }
      suggestedMapping {
        sourceColumn
        targetField
      }
      totalRows
    }
  }
`
const DRY_RUN_IMPORT = gql`
  query DryRunImport($input: DryRunImportInput!) {
    dryRunImport(input: $input) {
      totalRows
      validRows
      errorRows
      rowErrors {
        rowNumber
        errors
      }
      sampleValidRows {
        rowNumber
        first_name
        last_name
        email
        phone
        date_of_birth
      }
    }
  }
`
const COMMIT_IMPORT = gql`
  mutation CommitImport($input: CommitImportInput!) {
    commitImport(input: $input) {
      importJobId
      totalRows
      importedRows
      errorRows
      rowErrors {
        rowNumber
        errors
      }
    }
  }
`

export default function PatientImportPage() {
  return (
    <ErrorBoundary>
      <ImportWizard />
    </ErrorBoundary>
  )
}

function ImportWizard() {
  const { enqueueSnackbar } = useSnackbar()
  const [activeStep, setActiveStep] = useState(0)
  const [fileName, setFileName] = useState('')
  const [csvContent, setCsvContent] = useState('')
  const [mapping, setMapping] = useState({}) // { sourceColumn: targetField | '' }
  const [preview, setPreview] = useState(null)
  const [dryRunResult, setDryRunResult] = useState(null)
  const [commitResult, setCommitResult] = useState(null)

  const [runPreview, { loading: previewLoading }] = useLazyQuery(PARSE_IMPORT_PREVIEW, { fetchPolicy: 'network-only' })
  const [runDryRun, { loading: dryRunLoading }] = useLazyQuery(DRY_RUN_IMPORT, { fetchPolicy: 'network-only' })
  const [commitImportMutation, { loading: committing }] = useMutation(COMMIT_IMPORT)

  const resetAll = () => {
    setActiveStep(0)
    setFileName('')
    setCsvContent('')
    setMapping({})
    setPreview(null)
    setDryRunResult(null)
    setCommitResult(null)
  }

  const handleFileSelected = useCallback(
    async (e) => {
      const file = e.target.files?.[0]
      if (!file) return
      setFileName(file.name)
      const text = await file.text()
      setCsvContent(text)
      try {
        const { data } = await runPreview({ variables: { input: { csvContent: text } } })
        const result = data?.parseImportPreview
        setPreview(result)
        const initialMapping = {}
        for (const s of result?.suggestedMapping ?? []) {
          initialMapping[s.sourceColumn] = s.targetField ?? ''
        }
        setMapping(initialMapping)
        setActiveStep(1)
      } catch (err) {
        enqueueSnackbar(err?.graphQLErrors?.[0]?.message || err.message || 'Failed to read this file', { variant: 'error' })
      }
    },
    [runPreview, enqueueSnackbar],
  )

  const mappingEntries = (preview?.headers ?? [])
    .map((sourceColumn) => ({ sourceColumn, targetField: mapping[sourceColumn] ?? '' }))
    .filter((m) => m.targetField)

  const handleDryRun = async () => {
    try {
      const { data } = await runDryRun({ variables: { input: { csvContent, mapping: mappingEntries } } })
      setDryRunResult(data?.dryRunImport ?? null)
      setActiveStep(2)
    } catch (err) {
      enqueueSnackbar(err?.graphQLErrors?.[0]?.message || err.message || 'Dry run failed', { variant: 'error' })
    }
  }

  const handleCommit = async () => {
    try {
      const { data } = await commitImportMutation({ variables: { input: { csvContent, mapping: mappingEntries } } })
      setCommitResult(data?.commitImport ?? null)
      setActiveStep(3)
      enqueueSnackbar('Import complete.', { variant: 'success' })
    } catch (err) {
      enqueueSnackbar(err?.graphQLErrors?.[0]?.message || err.message || 'Import failed', { variant: 'error' })
    }
  }

  return (
    <Container maxWidth="lg">
      <Box py={3}>
        <Stack direction="row" spacing={1} alignItems="center" mb={1}>
          <UploadFileRoundedIcon color="primary" />
          <Typography variant="h5" fontWeight={700}>
            Patient Data Import
          </Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary" mb={3}>
          Upload a CSV export from another system, map its columns, review a dry run, then commit.
        </Typography>

        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {STEPS.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        <Paper variant="outlined" sx={{ p: 3 }}>
          {activeStep === 0 && (
            <Stack spacing={2} alignItems="flex-start">
              <Typography variant="body2">
                Choose a CSV file exported from your previous system. If your export is an Excel workbook, save it as CSV
                first (File → Save As → CSV).
              </Typography>
              <Button variant="contained" component="label" startIcon={previewLoading ? <CircularProgress size={16} /> : <UploadFileRoundedIcon />} disabled={previewLoading}>
                {previewLoading ? 'Reading file…' : 'Choose CSV file'}
                <input type="file" accept=".csv,text/csv" hidden onChange={handleFileSelected} />
              </Button>
            </Stack>
          )}

          {activeStep === 1 && preview && (
            <Stack spacing={3}>
              <Alert severity="info">
                {fileName} — {preview.totalRows} row{preview.totalRows === 1 ? '' : 's'} found. Map each column you want to
                import; leave a column set to "Don't import" to skip it.
              </Alert>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Source column</TableCell>
                      <TableCell>Sample value</TableCell>
                      <TableCell>Maps to</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {preview.headers.map((header, colIndex) => (
                      <TableRow key={header}>
                        <TableCell>{header}</TableCell>
                        <TableCell>
                          <Typography variant="caption" color="text.secondary">
                            {preview.sampleRows[0]?.values?.[colIndex] || '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <TextField
                            select
                            size="small"
                            fullWidth
                            value={mapping[header] ?? ''}
                            onChange={(e) => setMapping((m) => ({ ...m, [header]: e.target.value }))}
                          >
                            <MenuItem value="">Don't import</MenuItem>
                            {Object.entries(TARGET_FIELD_LABELS).map(([value, label]) => (
                              <MenuItem key={value} value={value}>
                                {label}
                              </MenuItem>
                            ))}
                          </TextField>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <Stack direction="row" spacing={1}>
                <Button onClick={resetAll}>Start over</Button>
                <Button
                  variant="contained"
                  disabled={mappingEntries.length === 0 || dryRunLoading}
                  startIcon={dryRunLoading ? <CircularProgress size={16} /> : null}
                  onClick={handleDryRun}
                >
                  {dryRunLoading ? 'Checking…' : 'Run dry run'}
                </Button>
              </Stack>
            </Stack>
          )}

          {activeStep === 2 && dryRunResult && (
            <Stack spacing={3}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <Card sx={{ p: 2 }}>
                    <Typography variant="caption" color="text.secondary">
                      Total rows
                    </Typography>
                    <Typography variant="h5" fontWeight={800}>
                      {dryRunResult.totalRows}
                    </Typography>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Card sx={{ p: 2 }}>
                    <Typography variant="caption" color="text.secondary">
                      Ready to import
                    </Typography>
                    <Typography variant="h5" fontWeight={800} color="success.main">
                      {dryRunResult.validRows}
                    </Typography>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Card sx={{ p: 2 }}>
                    <Typography variant="caption" color="text.secondary">
                      Will be skipped (errors)
                    </Typography>
                    <Typography variant="h5" fontWeight={800} color={dryRunResult.errorRows > 0 ? 'error.main' : 'text.primary'}>
                      {dryRunResult.errorRows}
                    </Typography>
                  </Card>
                </Grid>
              </Grid>

              {dryRunResult.rowErrors.length > 0 && (
                <Box>
                  <Typography variant="subtitle2" fontWeight={700} mb={1}>
                    Row errors {dryRunResult.errorRows > dryRunResult.rowErrors.length && `(first ${dryRunResult.rowErrors.length} shown)`}
                  </Typography>
                  <TableContainer sx={{ maxHeight: 300 }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell>Row</TableCell>
                          <TableCell>Errors</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {dryRunResult.rowErrors.map((re) => (
                          <TableRow key={re.rowNumber}>
                            <TableCell>{re.rowNumber}</TableCell>
                            <TableCell>
                              <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                                {re.errors.map((msg) => (
                                  <Chip key={msg} size="small" color="error" variant="outlined" label={msg} />
                                ))}
                              </Stack>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )}

              {dryRunResult.sampleValidRows.length > 0 && (
                <Box>
                  <Typography variant="subtitle2" fontWeight={700} mb={1}>
                    <AutoAwesomeRoundedIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
                    Preview of patients that will be created
                  </Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Name</TableCell>
                          <TableCell>Email</TableCell>
                          <TableCell>Phone</TableCell>
                          <TableCell>Date of birth</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {dryRunResult.sampleValidRows.map((p) => (
                          <TableRow key={p.rowNumber}>
                            <TableCell>
                              {p.first_name} {p.last_name}
                            </TableCell>
                            <TableCell>{p.email}</TableCell>
                            <TableCell>{p.phone}</TableCell>
                            <TableCell>{p.date_of_birth}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )}

              <Stack direction="row" spacing={1}>
                <Button onClick={() => setActiveStep(1)}>Back to mapping</Button>
                <Button
                  variant="contained"
                  color="success"
                  disabled={dryRunResult.validRows === 0 || committing}
                  startIcon={committing ? <CircularProgress size={16} /> : <CheckCircleRoundedIcon />}
                  onClick={handleCommit}
                >
                  {committing ? 'Importing…' : `Import ${dryRunResult.validRows} patient${dryRunResult.validRows === 1 ? '' : 's'}`}
                </Button>
              </Stack>
            </Stack>
          )}

          {activeStep === 3 && commitResult && (
            <Stack spacing={2} alignItems="flex-start">
              <Alert severity="success" sx={{ width: '100%' }}>
                Imported {commitResult.importedRows} of {commitResult.totalRows} rows.
                {commitResult.errorRows > 0 && ` ${commitResult.errorRows} row(s) were skipped — see below.`}
              </Alert>
              {commitResult.rowErrors.length > 0 && (
                <TableContainer sx={{ maxHeight: 300, width: '100%' }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>Row</TableCell>
                        <TableCell>Errors</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {commitResult.rowErrors.map((re) => (
                        <TableRow key={re.rowNumber}>
                          <TableCell>{re.rowNumber}</TableCell>
                          <TableCell>{re.errors.join(', ')}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
              <Button variant="outlined" onClick={resetAll}>
                Start a new import
              </Button>
            </Stack>
          )}
        </Paper>
      </Box>
    </Container>
  )
}
