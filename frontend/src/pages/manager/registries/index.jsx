import { useState, useEffect, useCallback } from 'react'
import { useApolloClient, gql } from '@apollo/client'
import { useTheme, alpha } from '@mui/material/styles'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Tooltip,
  Typography,
  Paper,
} from '@mui/material'
import MonitorHeartRoundedIcon from '@mui/icons-material/MonitorHeartRounded'
import dayjs from 'dayjs'
import ErrorBoundary from '../../../components/ErrorBoundary'

// ─── GraphQL ─────────────────────────────────────────────────────────────────
// REQ168 (P2-12) — chronic-disease registries (diabetes/HTN) + recall.
// Mirrors manager/memberships/index.jsx's own client.query/client.mutate
// structure exactly (this repo's established manager-admin-page pattern).

const CONDITIONS = [
  { value: 'diabetes', label: 'Diabetes' },
  { value: 'hypertension', label: 'Hypertension' },
]

const GET_REGISTRY_ENROLLMENTS = gql`
  query GetRegistryEnrollments($condition: String) {
    registryEnrollments(condition: $condition) {
      id
      patient_id
      patient_name
      condition
      status
      enrolled_at
      enrolled_by_name
      last_reviewed_at
      notes
      recall_status
    }
  }
`
const GET_CHRONIC_REGISTRY_SUGGESTIONS = gql`
  query GetChronicRegistrySuggestions($condition: String!) {
    chronicRegistrySuggestions(condition: $condition) {
      patient_id
      patient_name
      matched_icd10_code
      matched_diagnosis_text
    }
  }
`
const ENROLL_IN_REGISTRY = gql`
  mutation EnrollInRegistry($input: EnrollInRegistryInput!) {
    enrollInRegistry(input: $input) {
      id
    }
  }
`
const MARK_REGISTRY_REVIEWED = gql`
  mutation MarkRegistryReviewed($input: MarkRegistryReviewedInput!) {
    markRegistryReviewed(input: $input) {
      id
    }
  }
`
const RESOLVE_REGISTRY_ENROLLMENT = gql`
  mutation ResolveRegistryEnrollment($input: ResolveRegistryEnrollmentInput!) {
    resolveRegistryEnrollment(input: $input) {
      id
    }
  }
`

// Different status vocabulary from theme.palette.appointmentStatus (same
// reasoning as patients/detail.jsx's own immunizationStatusChipSx) — a
// small local helper rather than forcing it into that palette.
const RECALL_STATUS_META = {
  overdue: { color: 'error', label: 'Overdue' },
  due_soon: { color: 'warning', label: 'Due Soon' },
  upcoming: { color: 'info', label: 'Upcoming' },
}
function recallStatusChipSx(theme, status) {
  const color = RECALL_STATUS_META[status]?.color ?? 'default'
  if (color === 'default') return {}
  return {
    bgcolor: alpha(theme.palette[color].main, theme.palette.mode === 'dark' ? 0.18 : 0.12),
    color: theme.palette[color].main,
    border: `1px solid ${alpha(theme.palette[color].main, 0.4)}`,
  }
}

function ManagerRegistries() {
  const client = useApolloClient()
  const theme = useTheme()

  const [condition, setCondition] = useState('diabetes')
  const [enrollments, setEnrollments] = useState([])
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)
  const [actionError, setActionError] = useState(null)
  const [busyId, setBusyId] = useState(null)

  const showSuccess = (msg) => {
    setSuccessMsg(msg)
    setTimeout(() => setSuccessMsg(null), 3000)
  }

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const [{ data: enrollmentData }, { data: suggestionData }] = await Promise.all([
        client.query({ query: GET_REGISTRY_ENROLLMENTS, variables: { condition }, fetchPolicy: 'network-only' }),
        client.query({ query: GET_CHRONIC_REGISTRY_SUGGESTIONS, variables: { condition }, fetchPolicy: 'network-only' }),
      ])
      setEnrollments(enrollmentData?.registryEnrollments || [])
      setSuggestions(suggestionData?.chronicRegistrySuggestions || [])
    } catch (err) {
      setLoadError(err.message)
    } finally {
      setLoading(false)
    }
  }, [client, condition])

  useEffect(() => {
    load()
  }, [load])

  const handleEnroll = async (patientId) => {
    setBusyId(patientId)
    setActionError(null)
    try {
      const { data } = await client.mutate({ mutation: ENROLL_IN_REGISTRY, variables: { input: { patient_id: patientId, condition } } })
      if (!data?.enrollInRegistry?.id) throw new Error('Enroll failed')
      showSuccess('Patient enrolled in registry.')
      load()
    } catch (err) {
      setActionError(err.message)
    } finally {
      setBusyId(null)
    }
  }

  const handleMarkReviewed = async (enrollmentId) => {
    setBusyId(enrollmentId)
    setActionError(null)
    try {
      const { data } = await client.mutate({ mutation: MARK_REGISTRY_REVIEWED, variables: { input: { enrollment_id: enrollmentId } } })
      if (!data?.markRegistryReviewed?.id) throw new Error('Failed to mark reviewed')
      showSuccess('Review recorded.')
      load()
    } catch (err) {
      setActionError(err.message)
    } finally {
      setBusyId(null)
    }
  }

  const handleResolve = async (enrollmentId) => {
    setBusyId(enrollmentId)
    setActionError(null)
    try {
      const { data } = await client.mutate({ mutation: RESOLVE_REGISTRY_ENROLLMENT, variables: { input: { enrollment_id: enrollmentId } } })
      if (!data?.resolveRegistryEnrollment?.id) throw new Error('Failed to resolve')
      showSuccess('Enrollment resolved.')
      load()
    } catch (err) {
      setActionError(err.message)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" gap={1.5}>
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Chronic-Disease Registries
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Track diabetes and hypertension patients due for a recall review
          </Typography>
        </Box>
      </Stack>

      {successMsg && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {successMsg}
        </Alert>
      )}
      {actionError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setActionError(null)}>
          {actionError}
        </Alert>
      )}

      <Tabs value={condition} onChange={(_, v) => setCondition(v)} sx={{ mb: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
        {CONDITIONS.map((c) => (
          <Tab key={c.value} value={c.value} label={c.label} />
        ))}
      </Tabs>

      {loading ? (
        <Box display="flex" justifyContent="center" py={6}>
          <CircularProgress />
        </Box>
      ) : loadError ? (
        <Alert severity="error">Couldn't load registry data: {loadError}</Alert>
      ) : (
        <Stack spacing={3}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={700} mb={2}>
                Enrolled Patients
              </Typography>
              {enrollments.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No patients enrolled in this registry yet.
                </Typography>
              ) : (
                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Patient</TableCell>
                        <TableCell>Enrolled</TableCell>
                        <TableCell>Last Reviewed</TableCell>
                        <TableCell>Recall Status</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {enrollments.map((e) => (
                        <TableRow key={e.id}>
                          <TableCell>{e.patient_name}</TableCell>
                          <TableCell>{dayjs(e.enrolled_at).format('DD MMM YYYY')}</TableCell>
                          <TableCell>{dayjs(e.last_reviewed_at).format('DD MMM YYYY')}</TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              label={RECALL_STATUS_META[e.recall_status]?.label ?? e.recall_status}
                              sx={recallStatusChipSx(theme, e.recall_status)}
                            />
                          </TableCell>
                          <TableCell align="right">
                            <Stack direction="row" spacing={1} justifyContent="flex-end">
                              <Button size="small" variant="outlined" disabled={busyId === e.id} onClick={() => handleMarkReviewed(e.id)}>
                                Mark Reviewed
                              </Button>
                              <Button size="small" color="inherit" disabled={busyId === e.id} onClick={() => handleResolve(e.id)}>
                                Resolve
                              </Button>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={700} mb={1}>
                Suggested Candidates
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={2}>
                Patients with a matching diagnosis who aren't enrolled yet. Confirm before enrolling — a suggestion is never automatic.
              </Typography>
              {suggestions.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No new candidates found.
                </Typography>
              ) : (
                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Patient</TableCell>
                        <TableCell>Matched Diagnosis</TableCell>
                        <TableCell>ICD-10</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {suggestions.map((s) => (
                        <TableRow key={s.patient_id}>
                          <TableCell>{s.patient_name}</TableCell>
                          <TableCell>{s.matched_diagnosis_text}</TableCell>
                          <TableCell>{s.matched_icd10_code}</TableCell>
                          <TableCell align="right">
                            <Tooltip title="Enroll this patient in the registry">
                              <span>
                                <Button
                                  size="small"
                                  variant="contained"
                                  startIcon={<MonitorHeartRoundedIcon fontSize="small" />}
                                  disabled={busyId === s.patient_id}
                                  onClick={() => handleEnroll(s.patient_id)}
                                >
                                  Enroll
                                </Button>
                              </span>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </Stack>
      )}
    </Box>
  )
}

export default function ManagerRegistriesWithBoundary() {
  return (
    <ErrorBoundary>
      <ManagerRegistries />
    </ErrorBoundary>
  )
}
