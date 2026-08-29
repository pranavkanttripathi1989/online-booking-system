import { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, gql } from '@apollo/client'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  Avatar,
  Rating,
  TextField,
  InputAdornment,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  CircularProgress,
  Alert,
} from '@mui/material'
import { alpha, useTheme } from '@mui/material/styles'
import { Helmet } from 'react-helmet-async'
import SearchRoundedIcon from '@mui/icons-material/SearchRounded'
import CloseRoundedIcon from '@mui/icons-material/CloseRounded'
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded'
import StarRoundedIcon from '@mui/icons-material/StarRounded'
import ReplyRoundedIcon from '@mui/icons-material/ReplyRounded'
import EditRoundedIcon from '@mui/icons-material/EditRounded'

const PAGE_SIZE = 10 // SUG-REV-007

// backend/src/reviews/** was built from scratch specifically to match this
// page's shape (patient_name/clinician_name/stars/comment/response/created_at)
// — see reviews/entities/review.entity.ts. Was never wired up; this page ran
// on mocks/store.js exclusively until now (context/frontend-integration-audit.md).
const GET_REVIEWS = gql`
  query GetReviews {
    reviews {
      id
      patient_name
      clinician_name
      stars
      comment
      response
      created_at
    }
  }
`
const RESPOND_TO_REVIEW = gql`
  mutation RespondToReview($id: ID!, $response: String!) {
    respondToReview(id: $id, response: $response) {
      success
      review {
        id
        response
      }
    }
  }
`
const DELETE_REVIEW = gql`
  mutation DeleteReview($id: ID!) {
    deleteReview(id: $id) {
      success
    }
  }
`

// ─── Helpers ─────────────────────────────────────────────────────────────────
function computeBreakdown(reviews) {
  const total = reviews.length
  return [5, 4, 3, 2, 1].map((stars) => {
    const count = reviews.filter((r) => r.stars === stars).length
    return { stars, count, pct: total ? Math.round((count / total) * 100) : 0 }
  })
}

function initials(name = '') {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

const STAR_FILTERS = ['all', '5', '4', '3', '2', '1']

export default function ReviewsPage() {
  const theme = useTheme()
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [replyDialog, setReplyDialog] = useState({ open: false, id: null, text: '', editing: false })
  const [confirmDeleteId, setConfirmDeleteId] = useState(null) // SUG-REV-004: delete confirm dialog
  const [page, setPage] = useState(1) // SUG-REV-007: pagination / load-more

  // REQ121 (F-21) — was cache-first; a new review left elsewhere or another
  // staff member's response/delete could go unseen on this page indefinitely.
  const { data, loading, error, refetch } = useQuery(GET_REVIEWS, { fetchPolicy: 'cache-and-network' })
  const [respondToReviewMutation] = useMutation(RESPOND_TO_REVIEW)
  const [deleteReviewMutation] = useMutation(DELETE_REVIEW)
  const reviews = data?.reviews || []

  const filtered = reviews.filter((r) => {
    if (filter !== 'all' && String(r.stars) !== filter) return false
    if (search) {
      const q = search.toLowerCase()
      if (!r.patient_name?.toLowerCase().includes(q) && !r.clinician_name?.toLowerCase().includes(q)) return false
    }
    return true
  })

  // SUG-REV-007: reset to page 1 whenever the filter/search set changes so we
  // don't strand the user on a page past the end of a newly-narrowed result set.
  useEffect(() => {
    setPage(1)
  }, [filter, search])
  const paged = filtered.slice(0, page * PAGE_SIZE)

  const avgRating = reviews.length ? (reviews.reduce((s, r) => s + r.stars, 0) / reviews.length).toFixed(1) : '0.0'
  const totalReviews = reviews.length
  const breakdown = useMemo(() => computeBreakdown(reviews), [reviews])

  const handleReply = async () => {
    await respondToReviewMutation({ variables: { id: replyDialog.id, response: replyDialog.text } })
    await refetch()
    setReplyDialog({ open: false, id: null, text: '', editing: false })
  }
  const handleDelete = async (id) => {
    await deleteReviewMutation({ variables: { id } })
    await refetch()
    setConfirmDeleteId(null)
  }

  return (
    <Box className="page-enter" sx={{ pb: 4 }}>
      <Helmet>
        <title>Reviews — MediBook</title>
      </Helmet>

      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight={800} sx={{ color: 'text.primary' }}>
          Reviews
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Platform-wide patient feedback — {totalReviews} total
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
          Failed to load reviews: {error.message}
        </Alert>
      )}

      {loading && !data ? (
        <Box display="flex" justifyContent="center" py={8}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* Stats Row */}
          <Grid container spacing={2.5} mb={3}>
            {/* Average Rating */}
            <Grid item xs={12} md={4}>
              <Card sx={{ borderRadius: 3, height: '100%' }}>
                <CardContent
                  sx={{
                    p: '24px !important',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 1,
                  }}
                >
                  <Typography variant="overline" sx={{ color: 'text.secondary', letterSpacing: '0.12em' }}>
                    Platform Average
                  </Typography>
                  <Typography fontWeight={800} sx={{ fontSize: '4rem', color: 'text.primary', lineHeight: 1, letterSpacing: '-2px' }}>
                    {avgRating}
                  </Typography>
                  <Rating
                    value={parseFloat(avgRating)}
                    readOnly
                    precision={0.1}
                    icon={<StarRoundedIcon fontSize="inherit" />}
                    emptyIcon={<StarRoundedIcon fontSize="inherit" />}
                    sx={{ '& .MuiRating-iconFilled': { color: 'warning.main' }, '& .MuiRating-iconEmpty': { color: 'divider' } }}
                  />
                  <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                    Based on {totalReviews} reviews
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* Breakdown */}
            <Grid item xs={12} md={8}>
              <Card sx={{ borderRadius: 3, height: '100%' }}>
                <CardContent sx={{ p: '24px !important' }}>
                  <Typography fontWeight={700} sx={{ color: 'text.primary', mb: 2 }}>
                    Rating Breakdown
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {breakdown.map(({ stars, pct, count }) => (
                      <Box key={stars} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3, width: 60, flexShrink: 0 }}>
                          <Typography variant="caption" fontWeight={700} sx={{ color: 'text.primary', minWidth: 8 }}>
                            {stars}
                          </Typography>
                          <StarRoundedIcon sx={{ color: 'warning.main', fontSize: '0.85rem' }} />
                        </Box>
                        <Box sx={{ flex: 1, bgcolor: 'action.hover', borderRadius: 2, height: 8, overflow: 'hidden' }}>
                          <Box
                            sx={{
                              width: `${pct}%`,
                              height: '100%',
                              bgcolor: stars >= 4 ? theme.palette.success.main : stars === 3 ? theme.palette.warning.main : theme.palette.error.main,
                              borderRadius: 2,
                              transition: 'width 0.6s ease',
                            }}
                          />
                        </Box>
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, minWidth: 56, textAlign: 'right' }}>
                          {pct}% ({count})
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Filter + Search */}
          <Box
            sx={{
              display: 'flex',
              gap: 1.5,
              alignItems: { xs: 'stretch', sm: 'center' },
              flexDirection: { xs: 'column', sm: 'row' },
              flexWrap: 'wrap',
              mb: 2.5,
            }}
          >
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {STAR_FILTERS.map((f) => (
                <Chip
                  key={f}
                  label={f === 'all' ? 'All Stars' : `${f} ★`}
                  onClick={() => setFilter(f)}
                  sx={{
                    fontWeight: 700,
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '0.78rem',
                    bgcolor: filter === f ? (t) => alpha(t.palette.primary.main, 0.12) : 'action.hover',
                    color: filter === f ? 'primary.main' : 'text.secondary',
                    border: (t) => `1.5px solid ${filter === f ? alpha(t.palette.primary.main, 0.3) : t.palette.divider}`,
                    '&:hover': { bgcolor: filter === f ? (t) => alpha(t.palette.primary.main, 0.12) : 'action.hover' },
                  }}
                />
              ))}
            </Box>
            <TextField
              size="small"
              placeholder="Search by patient or clinician…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchRoundedIcon fontSize="small" sx={{ color: 'text.disabled' }} />
                  </InputAdornment>
                ),
                // SUG-REV-005: Clear button in search field
                endAdornment: search ? (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setSearch('')} aria-label="Clear search">
                      <CloseRoundedIcon fontSize="small" sx={{ color: 'text.disabled' }} />
                    </IconButton>
                  </InputAdornment>
                ) : null,
              }}
              sx={{ flex: 1, minWidth: { xs: '100%', sm: 220 }, '& .MuiOutlinedInput-root': { borderRadius: 2.5, bgcolor: 'background.paper' } }}
            />
          </Box>

          {/* Review Cards */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {paged.map((review) => (
              <Card
                key={review.id}
                sx={{
                  borderRadius: 3,
                  border: (t) => (review.stars <= 2 ? `1.5px solid ${alpha(t.palette.error.main, 0.3)}` : review.stars === 3 ? `1.5px solid ${alpha(t.palette.warning.main, 0.3)}` : `1px solid ${t.palette.divider}`),
                  transition: 'box-shadow 0.2s, transform 0.2s',
                  '&:hover': { boxShadow: '0 4px 12px rgba(32,33,36,0.12)', transform: 'translateY(-2px)' },
                }}
              >
                <CardContent sx={{ p: '20px !important' }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, flexWrap: 'wrap' }}>
                    <Avatar sx={{ width: 44, height: 44, bgcolor: (t) => alpha(t.palette.primary.main, 0.12), color: 'primary.main', fontWeight: 700, flexShrink: 0 }}>
                      {initials(review.patient_name)}
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', mb: 0.5 }}>
                        <Typography fontWeight={700} sx={{ color: 'text.primary' }}>
                          {review.patient_name}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                          →
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'primary.main', fontWeight: 600 }}>
                          {review.clinician_name}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.disabled', ml: 'auto' }}>
                          {/* SUG-REV-002: Null guard for missing created_at */}
                          {review.created_at
                            ? new Date(review.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                            : 'Date unknown'}
                        </Typography>
                      </Box>
                      <Rating
                        value={review.stars}
                        readOnly
                        size="small"
                        icon={<StarRoundedIcon fontSize="inherit" />}
                        emptyIcon={<StarRoundedIcon fontSize="inherit" />}
                        sx={{ mb: 1, '& .MuiRating-iconFilled': { color: 'warning.main' }, '& .MuiRating-iconEmpty': { color: 'divider' } }}
                      />
                      <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.7 }}>
                        {review.comment}
                      </Typography>
                      {review.response && (
                        <Box sx={{ mt: 1.5, pl: 2, borderLeft: '3px solid', borderLeftColor: 'primary.main', bgcolor: 'action.hover', borderRadius: 1, p: 1.5 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <Typography variant="caption" fontWeight={700} sx={{ color: 'primary.main' }}>
                              Manager Response
                            </Typography>
                            {/* SUG-REV-006: Edit existing response — reopens the reply dialog pre-filled */}
                            <Tooltip title="Edit response">
                              <IconButton
                                size="small"
                                aria-label={`Edit response to ${review.patient_name}`}
                                onClick={() => setReplyDialog({ open: true, id: review.id, text: review.response, editing: true })}
                                sx={{ color: 'primary.main', p: 0.4, ml: 1 }}
                              >
                                <EditRoundedIcon sx={{ fontSize: '0.9rem' }} />
                              </IconButton>
                            </Tooltip>
                          </Box>
                          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                            {review.response}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                    {/* Actions */}
                    <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
                      {!review.response && (
                        <Tooltip title="Reply">
                          <IconButton
                            size="small"
                            onClick={() => setReplyDialog({ open: true, id: review.id, text: '', editing: false })}
                            sx={{ color: 'primary.main', bgcolor: (t) => alpha(t.palette.primary.main, 0.12), borderRadius: '8px', '&:hover': { bgcolor: (t) => alpha(t.palette.primary.main, 0.24) } }}
                          >
                            <ReplyRoundedIcon sx={{ fontSize: '1.05rem' }} />
                          </IconButton>
                        </Tooltip>
                      )}
                      <Tooltip title="Delete">
                        {/* SUG-REV-004: Open confirm dialog instead of instant delete */}
                        <IconButton
                          size="small"
                          onClick={() => setConfirmDeleteId(review.id)}
                          aria-label={`Delete review by ${review.patient_name}`}
                          sx={{ color: 'error.dark', bgcolor: (t) => alpha(t.palette.error.main, 0.12), borderRadius: '8px', '&:hover': { bgcolor: (t) => alpha(t.palette.error.main, 0.24) } }}
                        >
                          <DeleteOutlineRoundedIcon sx={{ fontSize: '1.05rem' }} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            ))}

            {filtered.length === 0 && (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <StarRoundedIcon sx={{ fontSize: 56, color: 'divider', mb: 1 }} />
                <Typography fontWeight={600} sx={{ color: 'text.secondary' }}>
                  No reviews found
                </Typography>
              </Box>
            )}

            {/* SUG-REV-007: Load more instead of rendering the full result set at once */}
            {paged.length < filtered.length && (
              <Button
                variant="outlined"
                onClick={() => setPage((p) => p + 1)}
                sx={{ alignSelf: 'center', mt: 1, borderRadius: 2.5, textTransform: 'none', fontWeight: 700 }}
              >
                Load more ({filtered.length - paged.length} remaining)
              </Button>
            )}
          </Box>
        </>
      )}

      {/* Reply Dialog — also used to edit an existing response (SUG-REV-006) */}
      <Dialog
        open={replyDialog.open}
        onClose={() => setReplyDialog({ open: false, id: null, text: '', editing: false })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle fontWeight={700}>{replyDialog.editing ? 'Edit Response' : 'Reply to Review'}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={4}
            autoFocus
            label="Your response"
            value={replyDialog.text}
            onChange={(e) => setReplyDialog((d) => ({ ...d, text: e.target.value }))}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setReplyDialog({ open: false, id: null, text: '', editing: false })}>Cancel</Button>
          <Button variant="contained" disabled={!replyDialog.text.trim()} onClick={handleReply}>
            {replyDialog.editing ? 'Save Changes' : 'Submit Response'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* SUG-REV-004: Delete Confirmation Dialog */}
      <Dialog open={Boolean(confirmDeleteId)} onClose={() => setConfirmDeleteId(null)} maxWidth="xs" fullWidth>
        <DialogTitle fontWeight={700}>Delete Review?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Are you sure you want to delete this review? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setConfirmDeleteId(null)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={() => handleDelete(confirmDeleteId)}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
