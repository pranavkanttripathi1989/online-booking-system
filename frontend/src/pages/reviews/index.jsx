import { useState, useMemo } from 'react'
import {
  Box, Typography, Card, CardContent, Grid, Chip, Avatar,
  Rating, TextField, InputAdornment, IconButton, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
} from '@mui/material'
import { Helmet } from 'react-helmet-async'
import SearchRoundedIcon       from '@mui/icons-material/SearchRounded'
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded'
import StarRoundedIcon          from '@mui/icons-material/StarRounded'
import ReplyRoundedIcon         from '@mui/icons-material/ReplyRounded'
import * as MockStore from '../../mocks/store'

// ─── Helpers ─────────────────────────────────────────────────────────────────
function computeBreakdown(reviews) {
  const total = reviews.length
  return [5,4,3,2,1].map(stars => {
    const count = reviews.filter(r => r.stars === stars).length
    return { stars, count, pct: total ? Math.round(count / total * 100) : 0 }
  })
}

function initials(name = '') {
  return name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase()
}

const STAR_FILTERS = ['all','5','4','3','2','1']

export default function ReviewsPage() {
  const [filter,         setFilter]         = useState('all')
  const [search,         setSearch]         = useState('')
  const [reviews,        setReviews]        = useState(() => MockStore.getReviews())
  const [replyDialog,    setReplyDialog]    = useState({ open: false, id: null, text: '' })

  const filtered = reviews.filter(r => {
    if (filter !== 'all' && String(r.stars) !== filter) return false
    if (search) {
      const q = search.toLowerCase()
      if (!r.patient_name?.toLowerCase().includes(q) && !r.clinician_name?.toLowerCase().includes(q)) return false
    }
    return true
  })

  const avgRating   = reviews.length ? (reviews.reduce((s, r) => s + r.stars, 0) / reviews.length).toFixed(1) : '0.0'
  const totalReviews = reviews.length
  const breakdown    = useMemo(() => computeBreakdown(reviews), [reviews])

  const handleReply = () => {
    MockStore.respondToReview(replyDialog.id, replyDialog.text)
    setReviews(MockStore.getReviews())
    setReplyDialog({ open: false, id: null, text: '' })
  }
  const handleDelete = (id) => {
    // Local state only (mock) — BACKEND SWAP: call DELETE mutation
    setReviews(prev => prev.filter(r => r.id !== id))
  }

  return (
    <Box className="page-enter" sx={{ pb: 4 }}>
      <Helmet><title>Reviews — MediBook</title></Helmet>

      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight={800} sx={{ color: '#0D1B2E' }}>Reviews</Typography>
        <Typography variant="body2" sx={{ color: '#7A96AE' }}>Platform-wide patient feedback — {totalReviews} total</Typography>
      </Box>

      {/* Stats Row */}
      <Grid container spacing={2.5} mb={3}>
        {/* Average Rating */}
        <Grid item xs={12} md={4}>
          <Card sx={{ borderRadius: 3, height: '100%' }}>
            <CardContent sx={{ p: '24px !important', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
              <Typography variant="overline" sx={{ color: '#7A96AE', letterSpacing: '0.12em' }}>Platform Average</Typography>
              <Typography fontWeight={800} sx={{ fontSize: '4rem', color: '#0D1B2E', lineHeight: 1, letterSpacing: '-2px' }}>{avgRating}</Typography>
              <Rating value={parseFloat(avgRating)} readOnly precision={0.1}
                icon={<StarRoundedIcon fontSize="inherit" />}
                emptyIcon={<StarRoundedIcon fontSize="inherit" />}
                sx={{ '& .MuiRating-iconFilled': { color: '#F9AB00' }, '& .MuiRating-iconEmpty': { color: '#E8EAED' } }} />
              <Typography variant="body2" sx={{ color: '#7A96AE', fontWeight: 500 }}>Based on {totalReviews} reviews</Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Breakdown */}
        <Grid item xs={12} md={8}>
          <Card sx={{ borderRadius: 3, height: '100%' }}>
            <CardContent sx={{ p: '24px !important' }}>
              <Typography fontWeight={700} sx={{ color: '#0D1B2E', mb: 2 }}>Rating Breakdown</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {breakdown.map(({ stars, pct, count }) => (
                  <Box key={stars} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3, width: 60, flexShrink: 0 }}>
                      <Typography variant="caption" fontWeight={700} sx={{ color: '#202124', minWidth: 8 }}>{stars}</Typography>
                      <StarRoundedIcon sx={{ color: '#F9AB00', fontSize: '0.85rem' }} />
                    </Box>
                    <Box sx={{ flex: 1, bgcolor: '#F1F3F4', borderRadius: 2, height: 8, overflow: 'hidden' }}>
                      <Box sx={{ width: `${pct}%`, height: '100%', bgcolor: stars >= 4 ? '#0F9D58' : stars === 3 ? '#F9AB00' : '#D93025', borderRadius: 2, transition: 'width 0.6s ease' }} />
                    </Box>
                    <Typography variant="caption" sx={{ color: '#7A96AE', fontWeight: 600, minWidth: 56, textAlign: 'right' }}>
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
      <Box sx={{ display: 'flex', gap: 1.5, alignItems: { xs: 'stretch', sm: 'center' }, flexDirection: { xs: 'column', sm: 'row' }, flexWrap: 'wrap', mb: 2.5 }}>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {STAR_FILTERS.map(f => (
            <Chip key={f} label={f === 'all' ? 'All Stars' : `${f} ★`} onClick={() => setFilter(f)}
              sx={{
                fontWeight: 700, borderRadius: '8px', cursor: 'pointer', fontSize: '0.78rem',
                bgcolor: filter === f ? '#E8F0FE' : '#F8F9FA',
                color:   filter === f ? '#1A73E8' : '#5F6368',
                border: `1.5px solid ${filter === f ? '#AECBFA' : '#E8EAED'}`,
                '&:hover': { bgcolor: filter === f ? '#E8F0FE' : '#F1F3F4' },
              }} />
          ))}
        </Box>
        <TextField size="small" placeholder="Search by patient or clinician…" value={search} onChange={e => setSearch(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchRoundedIcon fontSize="small" sx={{ color: '#9AA0A6' }} /></InputAdornment> }}
          sx={{ flex: 1, minWidth: { xs: '100%', sm: 220 }, '& .MuiOutlinedInput-root': { borderRadius: 2.5, bgcolor: '#fff' } }} />
      </Box>

      {/* Review Cards */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {filtered.map(review => (
          <Card key={review.id} sx={{
            borderRadius: 3,
            border: review.stars <= 2 ? '1.5px solid #F5C6C2' : review.stars === 3 ? '1.5px solid #FDD663' : '1px solid #E8EAED',
            transition: 'box-shadow 0.2s, transform 0.2s',
            '&:hover': { boxShadow: '0 4px 12px rgba(32,33,36,0.12)', transform: 'translateY(-2px)' },
          }}>
            <CardContent sx={{ p: '20px !important' }}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, flexWrap: 'wrap' }}>
                <Avatar sx={{ width: 44, height: 44, bgcolor: '#EEF4FF', color: '#1565C7', fontWeight: 700, flexShrink: 0 }}>
                  {initials(review.patient_name)}
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', mb: 0.5 }}>
                    <Typography fontWeight={700} sx={{ color: '#0D1B2E' }}>{review.patient_name}</Typography>
                    <Typography variant="caption" sx={{ color: '#B8C6D4' }}>→</Typography>
                    <Typography variant="body2" sx={{ color: '#1565C7', fontWeight: 600 }}>{review.clinician_name}</Typography>
                    <Typography variant="caption" sx={{ color: '#B8C6D4', ml: 'auto' }}>
                      {new Date(review.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </Typography>
                  </Box>
                  <Rating value={review.stars} readOnly size="small"
                    icon={<StarRoundedIcon fontSize="inherit" />} emptyIcon={<StarRoundedIcon fontSize="inherit" />}
                    sx={{ mb: 1, '& .MuiRating-iconFilled': { color: '#F9AB00' }, '& .MuiRating-iconEmpty': { color: '#E8EAED' } }} />
                  <Typography variant="body2" sx={{ color: '#3D5A72', lineHeight: 1.7 }}>{review.comment}</Typography>
                  {review.response && (
                    <Box sx={{ mt: 1.5, pl: 2, borderLeft: '3px solid #1A73E8', bgcolor: '#F8F9FA', borderRadius: 1, p: 1.5 }}>
                      <Typography variant="caption" fontWeight={700} sx={{ color: '#1A73E8' }}>Manager Response</Typography>
                      <Typography variant="body2" sx={{ color: '#5F6368', mt: 0.5 }}>{review.response}</Typography>
                    </Box>
                  )}
                </Box>
                {/* Actions */}
                <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
                  {!review.response && (
                    <Tooltip title="Reply">
                      <IconButton size="small" onClick={() => setReplyDialog({ open: true, id: review.id, text: '' })}
                        sx={{ color: '#1A73E8', bgcolor: '#E8F0FE', borderRadius: '8px', '&:hover': { bgcolor: '#AECBFA' } }}>
                        <ReplyRoundedIcon sx={{ fontSize: '1.05rem' }} />
                      </IconButton>
                    </Tooltip>
                  )}
                  <Tooltip title="Delete">
                    <IconButton size="small" onClick={() => handleDelete(review.id)}
                      sx={{ color: '#A50E0E', bgcolor: '#FCE8E6', borderRadius: '8px', '&:hover': { bgcolor: '#F5C6C2' } }}>
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
            <StarRoundedIcon sx={{ fontSize: 56, color: '#E2E8F0', mb: 1 }} />
            <Typography fontWeight={600} sx={{ color: '#7A96AE' }}>No reviews found</Typography>
          </Box>
        )}
      </Box>

      {/* Reply Dialog */}
      <Dialog open={replyDialog.open} onClose={() => setReplyDialog({ open: false, id: null, text: '' })} maxWidth="sm" fullWidth>
        <DialogTitle fontWeight={700}>Reply to Review</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth multiline rows={4} autoFocus
            label="Your response" value={replyDialog.text}
            onChange={e => setReplyDialog(d => ({ ...d, text: e.target.value }))}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setReplyDialog({ open: false, id: null, text: '' })}>Cancel</Button>
          <Button variant="contained" disabled={!replyDialog.text.trim()} onClick={handleReply}>Submit Response</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
