import { Box, TextField, Typography, IconButton, InputAdornment, Stack } from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'

/**
 * PaginationBar
 *
 * Props:
 *   searchTerm        string
 *   onSearchChange    (value: string) => void
 *   searchPlaceholder string
 *   currentPage       number
 *   totalPages        number
 *   total             number
 *   limit             number
 *   offset            number
 *   onPreviousPage    () => void
 *   onNextPage        () => void
 *   onGoToPage        (page: number) => void   (optional)
 *   loading           boolean
 */
export default function PaginationBar({
  searchTerm,
  onSearchChange,
  searchPlaceholder = 'Search…',
  currentPage,
  totalPages,
  total,
  limit,
  offset,
  onPreviousPage,
  onNextPage,
  loading,
}) {
  const from = total === 0 ? 0 : offset + 1
  const to = Math.min(offset + limit, total)

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 2,
        py: 1.5,
        px: 0,
      }}
    >
      {/* Search */}
      <TextField
        size="small"
        variant="outlined"
        placeholder={searchPlaceholder}
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        disabled={loading}
        sx={{ minWidth: 240, maxWidth: 360 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" color="action" />
            </InputAdornment>
          ),
        }}
      />

      {/* Pagination controls */}
      <Stack direction="row" alignItems="center" spacing={1}>
        <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
          {total === 0 ? 'No results' : `Showing ${from}–${to} of ${total}`}
        </Typography>

        <IconButton size="small" onClick={onPreviousPage} disabled={loading || currentPage <= 1} aria-label="Previous page">
          <ChevronLeftIcon />
        </IconButton>

        <Typography variant="body2" sx={{ minWidth: 60, textAlign: 'center' }}>
          {totalPages > 0 ? `${currentPage} / ${totalPages}` : '—'}
        </Typography>

        <IconButton size="small" onClick={onNextPage} disabled={loading || currentPage >= totalPages} aria-label="Next page">
          <ChevronRightIcon />
        </IconButton>
      </Stack>
    </Box>
  )
}
