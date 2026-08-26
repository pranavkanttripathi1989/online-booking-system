import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useSubscription, gql } from '@apollo/client'
import { useSnackbar } from 'notistack'
import {
  Alert, Autocomplete, Box, Button, Card, CardContent, Chip, Dialog, DialogActions,
  DialogContent, DialogTitle, Grid, IconButton, List, ListItem, ListItemText,
  Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField,
  Tooltip, Typography,
} from '@mui/material'
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded'
import ReplayRoundedIcon from '@mui/icons-material/ReplayRounded'
import SkipNextRoundedIcon from '@mui/icons-material/SkipNextRounded'
import SwapHorizRoundedIcon from '@mui/icons-material/SwapHorizRounded'
import TvRoundedIcon from '@mui/icons-material/TvRounded'
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded'
import { useAuth } from '../../hooks/useAuth'
import { CLINICIANS_QUERY } from '../../graphql/queries'

// ─── GraphQL (REQ019 P0) ────────────────────────────────────────────────────

const QUEUE_BOARD_QUERY = gql`
  query QueueBoard($clinician_id: ID!) {
    queueBoard(clinician_id: $clinician_id) {
      clinician_id
      clinician_name
      average_wait_minutes
      predicted_wait_minutes
      now_serving { id appointment_id patient_name token_no status called_at }
      waiting { id appointment_id patient_name token_no status checked_in_at }
    }
  }
`
const UNBILLED_VISITS_QUERY = gql`
  query UnbilledVisits($clinic_id: ID!) {
    unbilledVisits(clinic_id: $clinic_id) { appointment_id patient_name clinician_name appointment_time }
  }
`
const QUEUE_UPDATED_SUBSCRIPTION = gql`
  subscription QueueUpdated($clinic_id: ID!) { queueUpdated(clinic_id: $clinic_id) }
`
const CALL_NEXT = gql`mutation CallNext($clinician_id: ID!) { callNextInQueue(clinician_id: $clinician_id) { id } }`
const RECALL = gql`mutation Recall($id: ID!) { recallQueueEntry(id: $id) { id } }`
const SKIP = gql`mutation Skip($input: SkipQueueEntryInput!) { skipQueueEntry(input: $input) { id } }`
const TRANSFER = gql`mutation Transfer($input: TransferQueueEntryInput!) { transferQueueEntry(input: $input) { id } }`

function waitMinutes(checkedInAt) {
  return Math.max(0, Math.round((Date.now() - new Date(checkedInAt).getTime()) / 60000))
}

function QueueBoardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { enqueueSnackbar } = useSnackbar()

  const isClinician = user?.roles?.some((r) => r.name === 'clinician')
  const [selectedClinician, setSelectedClinician] = useState(
    isClinician ? { id: user?.clinician?.id, full_name: user?.clinician?.full_name } : null,
  )
  const [transferTarget, setTransferTarget] = useState(null)
  const [transferEntry, setTransferEntry] = useState(null)
  const [skipEntry, setSkipEntry] = useState(null)

  const { data: cliniciansData } = useQuery(CLINICIANS_QUERY, { variables: { first: 50 }, skip: isClinician })
  const clinicians = cliniciansData?.clinicians?.data ?? []
  const clinicId = isClinician
    ? user?.clinician?.clinics?.[0]?.id
    : clinicians.find((c) => c.id === selectedClinician?.id)?.clinics?.[0]?.id

  const clinicianId = selectedClinician?.id

  const { data: boardData, refetch: refetchBoard, error: boardError } = useQuery(QUEUE_BOARD_QUERY, {
    variables: { clinician_id: clinicianId },
    skip: !clinicianId,
    fetchPolicy: 'cache-and-network',
  })
  const { data: unbilledData, refetch: refetchUnbilled } = useQuery(UNBILLED_VISITS_QUERY, {
    variables: { clinic_id: clinicId },
    skip: !clinicId,
  })

  useSubscription(QUEUE_UPDATED_SUBSCRIPTION, {
    variables: { clinic_id: clinicId },
    skip: !clinicId,
    onData: () => { refetchBoard(); refetchUnbilled() },
  })

  const [callNext, { loading: calling }] = useMutation(CALL_NEXT, { onCompleted: () => refetchBoard() })
  const [recall] = useMutation(RECALL, { onCompleted: () => refetchBoard() })
  const [skip] = useMutation(SKIP, { onCompleted: () => refetchBoard() })
  const [transfer] = useMutation(TRANSFER, { onCompleted: () => refetchBoard() })

  const board = boardData?.queueBoard
  const unbilled = unbilledData?.unbilledVisits ?? []

  const handleCallNext = async () => {
    try {
      await callNext({ variables: { clinician_id: clinicianId } })
    } catch (err) {
      enqueueSnackbar(err?.graphQLErrors?.[0]?.message || 'Failed to call next patient', { variant: 'warning' })
    }
  }
  const handleRecall = async (id) => {
    try { await recall({ variables: { id } }) } catch (err) {
      enqueueSnackbar(err?.graphQLErrors?.[0]?.message || 'Failed to recall', { variant: 'error' })
    }
  }
  const handleSkip = async () => {
    try {
      await skip({ variables: { input: { queue_entry_id: skipEntry.id } } })
      setSkipEntry(null)
    } catch (err) {
      enqueueSnackbar(err?.graphQLErrors?.[0]?.message || 'Failed to skip', { variant: 'error' })
    }
  }
  const handleTransfer = async () => {
    try {
      await transfer({ variables: { input: { queue_entry_id: transferEntry.id, target_clinician_id: transferTarget.id } } })
      setTransferEntry(null)
      setTransferTarget(null)
    } catch (err) {
      enqueueSnackbar(err?.graphQLErrors?.[0]?.message || 'Failed to transfer', { variant: 'error' })
    }
  }

  return (
    <Box p={{ xs: 1.5, md: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" gap={1}>
        <Typography variant="h5" fontWeight={700}>Live Queue</Typography>
        {clinicianId && (
          <Button
            startIcon={<TvRoundedIcon />} variant="outlined"
            onClick={() => navigate(`/queue/display/${clinicianId}`)}
          >
            TV Display
          </Button>
        )}
      </Stack>

      {!isClinician && (
        <Autocomplete
          sx={{ maxWidth: 360, mb: 2 }}
          options={clinicians}
          getOptionLabel={(opt) => opt.full_name ?? ''}
          value={selectedClinician}
          onChange={(_, v) => setSelectedClinician(v)}
          renderInput={(params) => <TextField {...params} label="Clinician" placeholder="Select a clinician…" />}
          isOptionEqualToValue={(a, b) => a.id === b.id}
        />
      )}

      {!clinicianId && <Alert severity="info">Select a clinician to view their queue.</Alert>}
      {boardError && <Alert severity="error">{boardError.message}</Alert>}

      {board && (
        <Grid container spacing={2}>
          <Grid item xs={12} md={8}>
            <Card variant="outlined" sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary">Now serving</Typography>
                {board.now_serving ? (
                  <Stack direction="row" alignItems="center" spacing={2} mt={1}>
                    <Typography variant="h4" fontWeight={800}>
                      {board.now_serving.token_no ? `#${board.now_serving.token_no}` : '—'}
                    </Typography>
                    <Box>
                      <Typography variant="h6">{board.now_serving.patient_name}</Typography>
                      <Chip size="small" label={board.now_serving.status} color={board.now_serving.status === 'in_progress' ? 'success' : 'warning'} />
                    </Box>
                  </Stack>
                ) : (
                  <Typography variant="body2" color="text.secondary" mt={1}>No one currently being served.</Typography>
                )}
                <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                  <Button
                    variant="contained" startIcon={<PlayArrowRoundedIcon />}
                    onClick={handleCallNext} disabled={calling || board.waiting.length === 0}
                  >
                    Call Next
                  </Button>
                  {board.now_serving?.status === 'called' && (
                    <Button
                      variant="outlined" startIcon={<ReplayRoundedIcon />}
                      onClick={() => handleRecall(board.now_serving.id)}
                    >
                      Recall (stepped away)
                    </Button>
                  )}
                </Stack>
                {board.average_wait_minutes != null && (
                  <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 1 }}>
                    Average wait today: {board.average_wait_minutes} min
                  </Typography>
                )}
                {board.predicted_wait_minutes != null && (
                  <Typography variant="caption" display="block" color="text.secondary">
                    Predicted wait (last 14 days): {board.predicted_wait_minutes} min
                  </Typography>
                )}
              </CardContent>
            </Card>

            <Typography variant="subtitle1" fontWeight={700} mb={1}>Waiting ({board.waiting.length})</Typography>
            <TableContainer component={Card} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Token</TableCell>
                    <TableCell>Patient</TableCell>
                    <TableCell>Waiting since</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {board.waiting.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell>{e.token_no ?? '—'}</TableCell>
                      <TableCell>{e.patient_name}</TableCell>
                      <TableCell>{waitMinutes(e.checked_in_at)} min</TableCell>
                      <TableCell align="right">
                        <Tooltip title="Skip / park">
                          <IconButton size="small" onClick={() => setSkipEntry(e)}><SkipNextRoundedIcon fontSize="small" /></IconButton>
                        </Tooltip>
                        <Tooltip title="Transfer to another clinician">
                          <IconButton size="small" onClick={() => setTransferEntry(e)}><SwapHorizRoundedIcon fontSize="small" /></IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                  {board.waiting.length === 0 && (
                    <TableRow><TableCell colSpan={4}><Typography variant="body2" color="text.secondary">No one waiting.</Typography></TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card variant="outlined">
              <CardContent>
                <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                  <ReceiptLongRoundedIcon fontSize="small" />
                  <Typography variant="subtitle1" fontWeight={700}>Unbilled visits</Typography>
                </Stack>
                <List dense disablePadding>
                  {unbilled.map((v) => (
                    <ListItem key={v.appointment_id} disableGutters>
                      <ListItemText
                        primary={v.patient_name}
                        secondary={`${v.clinician_name} · ${new Date(v.appointment_time).toLocaleString('en-IN')}`}
                      />
                    </ListItem>
                  ))}
                  {unbilled.length === 0 && (
                    <Typography variant="body2" color="text.secondary">Nothing outstanding.</Typography>
                  )}
                </List>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Skip dialog — US-QUE-05: park and auto-return after N served. */}
      <Dialog open={!!skipEntry} onClose={() => setSkipEntry(null)}>
        <DialogTitle>Skip {skipEntry?.patient_name}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            They'll automatically return to the front of the queue after 3 other patients have been served.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSkipEntry(null)}>Cancel</Button>
          <Button variant="contained" onClick={handleSkip}>Skip</Button>
        </DialogActions>
      </Dialog>

      {/* Transfer dialog */}
      <Dialog open={!!transferEntry} onClose={() => setTransferEntry(null)} fullWidth maxWidth="sm">
        <DialogTitle>Transfer {transferEntry?.patient_name}</DialogTitle>
        <DialogContent>
          <Autocomplete
            sx={{ mt: 1 }}
            options={clinicians.filter((c) => c.id !== clinicianId)}
            getOptionLabel={(opt) => opt.full_name ?? ''}
            value={transferTarget}
            onChange={(_, v) => setTransferTarget(v)}
            renderInput={(params) => <TextField {...params} label="Transfer to" placeholder="Select a clinician…" />}
            isOptionEqualToValue={(a, b) => a.id === b.id}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTransferEntry(null)}>Cancel</Button>
          <Button variant="contained" onClick={handleTransfer} disabled={!transferTarget}>Transfer</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default QueueBoardPage
