import { useParams } from 'react-router-dom'
import { useQuery, gql } from '@apollo/client'
import { Alert, Box, CircularProgress, Stack, Typography } from '@mui/material'

// REQ019 US-QUE-03 — large-type TV/waiting-room display, a distinct
// rendering mode of the same queueBoard data the staff page uses. Bare
// route (no AppShell chrome), same "protected but bare" shape as
// /video/:id and /prescriptions/:id/print.

const QUEUE_BOARD_QUERY = gql`
  query QueueBoardDisplay($clinician_id: ID!) {
    queueBoard(clinician_id: $clinician_id) {
      clinician_name
      now_serving {
        token_no
        patient_name
      }
      waiting {
        token_no
        patient_name
      }
    }
  }
`
function QueueDisplay() {
  const { clinicianId } = useParams()
  // Polling, not the queueUpdated subscription — this query has no
  // clinic_id in its own payload to filter that subscription on. The
  // interactive staff board (index.jsx) uses the real subscription and
  // meets the PRD's "< 2s" update-latency NFR; this passive, read-from-
  // across-the-room display trades that for simplicity, deliberately, not
  // by oversight.
  const { data, loading, error } = useQuery(QUEUE_BOARD_QUERY, {
    variables: { clinician_id: clinicianId },
    pollInterval: 15000,
  })
  const board = data?.queueBoard

  if (loading && !board)
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}>
        <CircularProgress size={64} />
      </Box>
    )
  if (error)
    return (
      <Box p={4}>
        <Alert severity="error">{error.message}</Alert>
      </Box>
    )

  return (
    <Box sx={{ bgcolor: '#0b1220', color: '#fff', minHeight: '100vh', p: { xs: 3, md: 6 } }}>
      <Typography variant="h4" fontWeight={700} mb={4} textAlign="center">
        {board?.clinician_name}
      </Typography>

      <Box sx={{ textAlign: 'center', mb: 6 }}>
        <Typography variant="h6" color="grey.400">
          NOW SERVING
        </Typography>
        {board?.now_serving ? (
          <Typography sx={{ fontSize: { xs: '4rem', md: '8rem' }, fontWeight: 900, lineHeight: 1 }}>
            {board.now_serving.token_no ? `#${board.now_serving.token_no}` : board.now_serving.patient_name}
          </Typography>
        ) : (
          <Typography variant="h3" color="grey.500">
            —
          </Typography>
        )}
      </Box>

      <Typography variant="h6" color="grey.400" textAlign="center" mb={2}>
        UP NEXT
      </Typography>
      <Stack direction="row" spacing={3} justifyContent="center" flexWrap="wrap">
        {(board?.waiting ?? []).slice(0, 5).map((e, i) => (
          <Box key={i} sx={{ textAlign: 'center', minWidth: 120 }}>
            <Typography sx={{ fontSize: '3rem', fontWeight: 800 }}>{e.token_no ?? '—'}</Typography>
            <Typography variant="body1" color="grey.400">
              {e.patient_name}
            </Typography>
          </Box>
        ))}
        {(board?.waiting ?? []).length === 0 && (
          <Typography variant="h5" color="grey.600">
            Queue is empty
          </Typography>
        )}
      </Stack>
    </Box>
  )
}

export default QueueDisplay
