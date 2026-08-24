import { useState, useEffect } from 'react'
import { useApolloClient, gql } from '@apollo/client'
import {
  Alert, Box, Button, Card, Chip, CircularProgress, Dialog, DialogActions,
  DialogContent, DialogTitle, MenuItem, Stack, TextField, Typography,
} from '@mui/material'
import GavelIcon from '@mui/icons-material/Gavel'

// REQ034 — the staff-facing review queue for data-subject rights requests.
// Real backend from day one, same convention as admin/Departments.jsx.
// Resolving a request here is deliberately just a status change with a
// note (see consent.service.ts's own comment) — this page never performs
// an automated erasure/export action itself.
const GET_RIGHTS_REQUESTS = gql`
  query GetRightsRequests($status: String) {
    rightsRequests(status: $status) { id type status sla_due_at resolved_at notes created_at }
  }
`
const RESOLVE_RIGHTS_REQUEST = gql`
  mutation ResolveRightsRequest($id: ID!, $input: ResolveRightsRequestInput!) {
    resolveRightsRequest(id: $id, input: $input) { id status resolved_at }
  }
`

const STATUS_FILTERS = ['pending', 'approved', 'rejected', 'completed']
const STATUS_COLOR = { pending: 'warning', approved: 'info', rejected: 'error', completed: 'success' }
const TYPE_LABEL = { access: 'Data Access', correction: 'Correction', erasure: 'Erasure' }

function isOverdue(request) {
  return request.status === 'pending' && new Date(request.sla_due_at).getTime() < Date.now()
}

export default function AdminRightsRequests() {
  const client = useApolloClient()
  const [requests, setRequests] = useState([])
  const [statusFilter, setStatusFilter] = useState('pending')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [resolving, setResolving] = useState(null)
  const [resolveStatus, setResolveStatus] = useState('completed')
  const [resolveNotes, setResolveNotes] = useState('')
  const [formError, setFormError] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const load = async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const { data } = await client.query({ query: GET_RIGHTS_REQUESTS, variables: { status: statusFilter || undefined }, fetchPolicy: 'network-only' })
      setRequests(data?.rightsRequests ?? [])
    } catch (err) {
      setLoadError(err.message)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [statusFilter]) // eslint-disable-line

  const showSuccess = (msg) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(null), 3000) }

  const openResolve = (request) => { setResolving(request); setResolveStatus('completed'); setResolveNotes('') }

  const submitResolve = async () => {
    setSubmitting(true)
    setFormError(null)
    try {
      await client.mutate({ mutation: RESOLVE_RIGHTS_REQUEST, variables: { id: resolving.id, input: { status: resolveStatus, notes: resolveNotes || undefined } } })
      showSuccess('Request updated.')
      setResolving(null)
      load()
    } catch (err) {
      setFormError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={1}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Data Rights Requests</Typography>
          <Typography variant="body2" color="text.secondary">DPDP access / correction / erasure requests — review and resolve by hand</Typography>
        </Box>
        <TextField select size="small" label="Status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} sx={{ minWidth: 160 }}>
          <MenuItem value="">All</MenuItem>
          {STATUS_FILTERS.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
        </TextField>
      </Stack>

      {loadError && <Alert severity="warning" sx={{ mb: 2 }} action={<Button size="small" onClick={load}>Retry</Button>}>Failed to load: {loadError}</Alert>}
      {successMsg && <Alert severity="success" sx={{ mb: 2 }}>{successMsg}</Alert>}

      {loading ? (
        <Box display="flex" justifyContent="center" py={6}><CircularProgress /></Box>
      ) : (
        <Card>
          <Box sx={{ overflowX: 'auto' }}>
            <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse' }}>
              <Box component="thead">
                <Box component="tr" sx={{ bgcolor: 'grey.50' }}>
                  {['Type', 'Requested', 'SLA Due', 'Status', 'Notes', 'Actions'].map((h) => (
                    <Box key={h} component="th" sx={{ px: 2, py: 1.5, textAlign: 'left', typography: 'caption', fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid', borderColor: 'divider' }}>{h}</Box>
                  ))}
                </Box>
              </Box>
              <Box component="tbody">
                {requests.length === 0 && (
                  <Box component="tr"><Box component="td" colSpan={6} sx={{ textAlign: 'center', py: 6 }}>
                    <GavelIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1, display: 'block', mx: 'auto' }} />
                    <Typography color="text.secondary">No requests {statusFilter ? `with status "${statusFilter}"` : ''}</Typography>
                  </Box></Box>
                )}
                {requests.map((r) => (
                  <Box component="tr" key={r.id} sx={{ '&:hover': { bgcolor: 'grey.50' }, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Box component="td" sx={{ px: 2, py: 1.5 }}><Typography fontWeight={600}>{TYPE_LABEL[r.type] ?? r.type}</Typography></Box>
                    <Box component="td" sx={{ px: 2, py: 1.5 }}>{new Date(r.created_at).toLocaleDateString('en-IN')}</Box>
                    <Box component="td" sx={{ px: 2, py: 1.5 }}>
                      <Typography variant="body2" color={isOverdue(r) ? 'error.main' : 'text.primary'} fontWeight={isOverdue(r) ? 700 : 400}>
                        {new Date(r.sla_due_at).toLocaleDateString('en-IN')}{isOverdue(r) ? ' (overdue)' : ''}
                      </Typography>
                    </Box>
                    <Box component="td" sx={{ px: 2, py: 1.5 }}><Chip size="small" label={r.status} color={STATUS_COLOR[r.status]} /></Box>
                    <Box component="td" sx={{ px: 2, py: 1.5, maxWidth: 240 }}><Typography variant="body2" color="text.secondary" noWrap title={r.notes}>{r.notes ?? '—'}</Typography></Box>
                    <Box component="td" sx={{ px: 2, py: 1.5 }}>
                      {r.status === 'pending' && <Button size="small" variant="outlined" onClick={() => openResolve(r)}>Resolve</Button>}
                    </Box>
                  </Box>
                ))}
              </Box>
            </Box>
          </Box>
        </Card>
      )}

      <Dialog open={!!resolving} onClose={() => setResolving(null)} fullWidth maxWidth="sm">
        <DialogTitle>Resolve {resolving ? TYPE_LABEL[resolving.type] : ''} Request</DialogTitle>
        <DialogContent>
          {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}
          <Stack spacing={2} mt={1}>
            <TextField select fullWidth size="small" label="New Status" value={resolveStatus} onChange={(e) => setResolveStatus(e.target.value)}>
              <MenuItem value="approved">Approved</MenuItem>
              <MenuItem value="rejected">Rejected</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
            </TextField>
            <TextField fullWidth multiline rows={3} size="small" label="Notes (what was done / why)" value={resolveNotes} onChange={(e) => setResolveNotes(e.target.value)} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResolving(null)}>Cancel</Button>
          <Button variant="contained" disabled={submitting} onClick={submitResolve}>Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
