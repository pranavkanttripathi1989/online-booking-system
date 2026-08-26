import { useState, useCallback } from 'react'
import { useQuery, useMutation, useLazyQuery, gql } from '@apollo/client'
import { useSnackbar } from 'notistack'
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Paper,
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
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import PolicyRoundedIcon from '@mui/icons-material/PolicyRounded'
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded'
import ErrorBoundary from '../../../components/ErrorBoundary'
import { downloadAuthenticatedPdf } from '../../../utils/documents'

// REQ131 (REQ031's own explicit P2 follow-on) -- a basic OPD cashless
// claim-tracking desk. Manual/portal-assist per the PRD's own R11 risk
// mitigation: no real payer API, so submission and status transitions are
// both driven by a human here, not automated.

const GET_CLAIMS = gql`
  query GetClaims($status: String) {
    claims(status: $status) {
      id
      patient_id
      patient_name
      appointment_id
      appointment_date
      payer {
        id
        name
      }
      claim_amount
      approved_amount
      status
      rejection_reason
      submitted_at
      decided_at
      settled_at
      notes
    }
  }
`
const SEARCH_APPOINTMENTS = gql`
  query SearchAppointmentsForClaim($patient_name: String!) {
    appointments(filters: { patient_name: $patient_name }, first: 10, page: 1) {
      data {
        id
        start_datetime
        patient {
          id
          full_name
        }
        clinic {
          id
          name
        }
      }
    }
  }
`
const GET_PAYERS_FOR_CLAIM = gql`
  query GetPayersForClaim {
    payers(is_active: true) {
      id
      name
      payer_type
    }
  }
`
const GET_PATIENT_POLICIES_FOR_CLAIM = gql`
  query GetPatientPoliciesForClaim($patient_id: ID!) {
    patientInsurancePolicies(patient_id: $patient_id) {
      id
      policy_number
      payer {
        id
        name
      }
    }
  }
`
const SUBMIT_CLAIM = gql`
  mutation SubmitClaim($input: SubmitClaimInput!) {
    submitClaim(input: $input) {
      id
      status
    }
  }
`
const UPDATE_CLAIM_STATUS = gql`
  mutation UpdateClaimStatus($id: ID!, $input: UpdateClaimStatusInput!) {
    updateClaimStatus(id: $id, input: $input) {
      id
      status
    }
  }
`

const STATUS_COLOR = { submitted: 'default', under_review: 'warning', approved: 'info', rejected: 'error', settled: 'success' }
const STATUS_LABEL = {
  submitted: 'Submitted',
  under_review: 'Under Review',
  approved: 'Approved',
  rejected: 'Rejected',
  settled: 'Settled',
}

function ClaimsDesk() {
  const { enqueueSnackbar } = useSnackbar()
  const { data, loading, error, refetch } = useQuery(GET_CLAIMS, { variables: { status: undefined }, fetchPolicy: 'network-only' })
  const claims = data?.claims ?? []

  const [submitOpen, setSubmitOpen] = useState(false)
  const [patientSearch, setPatientSearch] = useState('')
  const [selectedAppointment, setSelectedAppointment] = useState(null)
  const [claimForm, setClaimForm] = useState({ payer_id: '', policy_id: '', claim_amount: '', notes: '' })
  const [downloadingId, setDownloadingId] = useState(null)

  const [searchAppointments, { data: apptData, loading: apptLoading }] = useLazyQuery(SEARCH_APPOINTMENTS)
  const { data: payersData } = useQuery(GET_PAYERS_FOR_CLAIM, { skip: !submitOpen })
  const [loadPolicies, { data: policiesData }] = useLazyQuery(GET_PATIENT_POLICIES_FOR_CLAIM)
  const [submitClaimMutation, { loading: submitting }] = useMutation(SUBMIT_CLAIM)
  const [updateStatus] = useMutation(UPDATE_CLAIM_STATUS)

  const [decisionDialog, setDecisionDialog] = useState(null) // { claim, targetStatus }
  const [decisionForm, setDecisionForm] = useState({ approved_amount: '', rejection_reason: '' })

  const handleSelectAppointment = useCallback(
    (appt) => {
      setSelectedAppointment(appt)
      if (appt) loadPolicies({ variables: { patient_id: appt.patient.id } })
    },
    [loadPolicies],
  )

  const resetSubmitForm = () => {
    setPatientSearch('')
    setSelectedAppointment(null)
    setClaimForm({ payer_id: '', policy_id: '', claim_amount: '', notes: '' })
  }

  const handleSubmitClaim = async () => {
    try {
      await submitClaimMutation({
        variables: {
          input: {
            appointment_id: selectedAppointment.id,
            payer_id: claimForm.payer_id,
            policy_id: claimForm.policy_id || undefined,
            claim_amount: Number(claimForm.claim_amount),
            notes: claimForm.notes || undefined,
          },
        },
      })
      enqueueSnackbar('Claim submitted.', { variant: 'success' })
      setSubmitOpen(false)
      resetSubmitForm()
      refetch()
    } catch (err) {
      enqueueSnackbar(err?.graphQLErrors?.[0]?.message || err.message || 'Failed to submit claim', { variant: 'error' })
    }
  }

  const NEXT_STATUS = { submitted: 'under_review', under_review: null, approved: 'settled' }

  const handleAdvance = async (claim) => {
    if (claim.status === 'under_review') {
      setDecisionDialog({ claim, targetStatus: null })
      return
    }
    const target = NEXT_STATUS[claim.status]
    if (!target) return
    try {
      await updateStatus({ variables: { id: claim.id, input: { status: target } } })
      refetch()
    } catch (err) {
      enqueueSnackbar(err?.graphQLErrors?.[0]?.message || err.message || 'Failed to update claim', { variant: 'error' })
    }
  }

  const handleDecision = async (targetStatus) => {
    try {
      await updateStatus({
        variables: {
          id: decisionDialog.claim.id,
          input: {
            status: targetStatus,
            approved_amount: targetStatus === 'approved' ? Number(decisionForm.approved_amount) : undefined,
            rejection_reason: targetStatus === 'rejected' ? decisionForm.rejection_reason : undefined,
          },
        },
      })
      setDecisionDialog(null)
      setDecisionForm({ approved_amount: '', rejection_reason: '' })
      refetch()
    } catch (err) {
      enqueueSnackbar(err?.graphQLErrors?.[0]?.message || err.message || 'Failed to record decision', { variant: 'error' })
    }
  }

  // REQ138 (US-INS-06's own follow-on) — the claim's own supporting
  // prescriptions (REQ137) plus its tracking details, as one PDF a
  // payer/TPA can be handed. Available at any status, not just
  // approved/settled — evidence is real as soon as the appointment's
  // encounter exists, regardless of where the claim itself has reached.
  const handleDownloadPack = async (claim) => {
    setDownloadingId(claim.id)
    try {
      await downloadAuthenticatedPdf(`/documents/claims/${claim.id}/reimbursement-pack/pdf`, `reimbursement-pack-${claim.id}.pdf`)
    } catch (err) {
      enqueueSnackbar(err?.message || 'Failed to download reimbursement pack', { variant: 'error' })
    } finally {
      setDownloadingId(null)
    }
  }

  return (
    <ErrorBoundary>
      <Box p={{ xs: 1.5, md: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" gap={1}>
          <Stack direction="row" spacing={1} alignItems="center">
            <PolicyRoundedIcon color="primary" />
            <Typography variant="h6" fontWeight={700}>
              Insurance Claims
            </Typography>
          </Stack>
          <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => setSubmitOpen(true)}>
            Submit Claim
          </Button>
        </Stack>

        {loading && <CircularProgress />}
        {error && <Alert severity="error">{error.message}</Alert>}

        {!loading && !error && claims.length === 0 && <Alert severity="info">No claims submitted yet.</Alert>}

        {!loading && !error && claims.length > 0 && (
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Patient</TableCell>
                  <TableCell>Payer</TableCell>
                  <TableCell>Visit Date</TableCell>
                  <TableCell align="right">Claim Amount</TableCell>
                  <TableCell align="right">Approved</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {claims.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>{c.patient_name}</TableCell>
                    <TableCell>{c.payer.name}</TableCell>
                    <TableCell>{new Date(c.appointment_date).toLocaleDateString('en-IN')}</TableCell>
                    <TableCell align="right">₹{c.claim_amount.toFixed(2)}</TableCell>
                    <TableCell align="right">{c.approved_amount != null ? `₹${c.approved_amount.toFixed(2)}` : '—'}</TableCell>
                    <TableCell>
                      <Chip size="small" label={STATUS_LABEL[c.status]} color={STATUS_COLOR[c.status]} />
                      {c.status === 'rejected' && c.rejection_reason && (
                        <Typography variant="caption" color="text.secondary" display="block">
                          {c.rejection_reason}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        {c.status === 'submitted' && (
                          <Button size="small" onClick={() => handleAdvance(c)}>
                            Move to Under Review
                          </Button>
                        )}
                        {c.status === 'under_review' && (
                          <>
                            <Button size="small" color="success" onClick={() => setDecisionDialog({ claim: c, targetStatus: 'approved' })}>
                              Approve
                            </Button>
                            <Button size="small" color="error" onClick={() => setDecisionDialog({ claim: c, targetStatus: 'rejected' })}>
                              Reject
                            </Button>
                          </>
                        )}
                        {c.status === 'approved' && (
                          <Button size="small" onClick={() => handleAdvance(c)}>
                            Mark Settled
                          </Button>
                        )}
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={downloadingId === c.id ? <CircularProgress size={14} /> : <DownloadRoundedIcon />}
                          disabled={downloadingId === c.id}
                          onClick={() => handleDownloadPack(c)}
                        >
                          Pack
                        </Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>

      {/* ── Submit Claim dialog ─────────────────────────────────────────── */}
      <Dialog
        open={submitOpen}
        onClose={() => {
          setSubmitOpen(false)
          resetSubmitForm()
        }}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Submit Claim</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {!selectedAppointment ? (
              <>
                <TextField
                  fullWidth
                  label="Search patient by name"
                  value={patientSearch}
                  onChange={(e) => {
                    setPatientSearch(e.target.value)
                    if (e.target.value.trim().length >= 2) searchAppointments({ variables: { patient_name: e.target.value.trim() } })
                  }}
                />
                {apptLoading && <CircularProgress size={20} />}
                <Stack spacing={1}>
                  {(apptData?.appointments?.data ?? []).map((appt) => (
                    <Paper
                      key={appt.id}
                      variant="outlined"
                      sx={{ p: 1.5, cursor: 'pointer' }}
                      onClick={() => handleSelectAppointment(appt)}
                    >
                      <Typography variant="body2" fontWeight={700}>
                        {appt.patient.full_name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {appt.clinic.name} — {new Date(appt.start_datetime).toLocaleDateString('en-IN')}
                      </Typography>
                    </Paper>
                  ))}
                </Stack>
              </>
            ) : (
              <>
                <Alert severity="info" onClose={() => handleSelectAppointment(null)}>
                  Claiming for {selectedAppointment.patient.full_name}'s visit on{' '}
                  {new Date(selectedAppointment.start_datetime).toLocaleDateString('en-IN')}
                </Alert>
                <Autocomplete
                  options={payersData?.payers ?? []}
                  getOptionLabel={(o) => o.name}
                  onChange={(_, value) => setClaimForm((f) => ({ ...f, payer_id: value?.id ?? '' }))}
                  renderInput={(params) => <TextField {...params} label="Payer" />}
                />
                {(policiesData?.patientInsurancePolicies?.length ?? 0) > 0 && (
                  <TextField
                    select
                    fullWidth
                    label="Policy (optional)"
                    value={claimForm.policy_id}
                    onChange={(e) => setClaimForm((f) => ({ ...f, policy_id: e.target.value }))}
                  >
                    <MenuItem value="">None</MenuItem>
                    {policiesData.patientInsurancePolicies.map((p) => (
                      <MenuItem key={p.id} value={p.id}>
                        {p.policy_number} ({p.payer.name})
                      </MenuItem>
                    ))}
                  </TextField>
                )}
                <TextField
                  fullWidth
                  type="number"
                  label="Claim amount (₹)"
                  value={claimForm.claim_amount}
                  onChange={(e) => setClaimForm((f) => ({ ...f, claim_amount: e.target.value }))}
                />
                <TextField
                  fullWidth
                  multiline
                  minRows={2}
                  label="Notes (optional)"
                  value={claimForm.notes}
                  onChange={(e) => setClaimForm((f) => ({ ...f, notes: e.target.value }))}
                />
              </>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setSubmitOpen(false)
              resetSubmitForm()
            }}
          >
            Cancel
          </Button>
          {selectedAppointment && (
            <Button variant="contained" disabled={!claimForm.payer_id || !claimForm.claim_amount || submitting} onClick={handleSubmitClaim}>
              {submitting ? 'Submitting…' : 'Submit'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* ── Approve/Reject decision dialog ──────────────────────────────── */}
      <Dialog open={!!decisionDialog} onClose={() => setDecisionDialog(null)} fullWidth maxWidth="xs">
        <DialogTitle>
          {decisionDialog?.targetStatus === 'approved'
            ? 'Approve Claim'
            : decisionDialog?.targetStatus === 'rejected'
              ? 'Reject Claim'
              : 'Decide Claim'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {decisionDialog?.targetStatus == null && (
              <Stack direction="row" spacing={1}>
                <Button color="success" variant="outlined" onClick={() => setDecisionDialog((d) => ({ ...d, targetStatus: 'approved' }))}>
                  Approve
                </Button>
                <Button color="error" variant="outlined" onClick={() => setDecisionDialog((d) => ({ ...d, targetStatus: 'rejected' }))}>
                  Reject
                </Button>
              </Stack>
            )}
            {decisionDialog?.targetStatus === 'approved' && (
              <TextField
                fullWidth
                type="number"
                label="Approved amount (₹)"
                value={decisionForm.approved_amount}
                onChange={(e) => setDecisionForm((f) => ({ ...f, approved_amount: e.target.value }))}
              />
            )}
            {decisionDialog?.targetStatus === 'rejected' && (
              <TextField
                fullWidth
                multiline
                minRows={2}
                label="Rejection reason"
                value={decisionForm.rejection_reason}
                onChange={(e) => setDecisionForm((f) => ({ ...f, rejection_reason: e.target.value }))}
              />
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDecisionDialog(null)}>Cancel</Button>
          {decisionDialog?.targetStatus === 'approved' && (
            <Button variant="contained" color="success" disabled={!decisionForm.approved_amount} onClick={() => handleDecision('approved')}>
              Approve
            </Button>
          )}
          {decisionDialog?.targetStatus === 'rejected' && (
            <Button
              variant="contained"
              color="error"
              disabled={!decisionForm.rejection_reason.trim()}
              onClick={() => handleDecision('rejected')}
            >
              Reject
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </ErrorBoundary>
  )
}

export default ClaimsDesk
