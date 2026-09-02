import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, gql } from '@apollo/client'
import { alpha, useTheme } from '@mui/material/styles'
import {
  Alert,
  Box,
  Card,
  Chip,
  CircularProgress,
  Grid,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import HotelIcon from '@mui/icons-material/Hotel'
import AddIcon from '@mui/icons-material/Add'
import RefreshIcon from '@mui/icons-material/Refresh'
import { CLINICS_QUERY } from '../../graphql/queries'
import { formatDate } from '../../utils/dateTime'

// REQ179 (IPD slice 1) — the live bed board. Polling, not a subscription
// (deliberately cut from this slice — pubsub.module.ts makes a real
// subscription cheap later; DATA-12 caps polling at no faster than 10s,
// which is exactly what this uses).

const BED_BOARD_QUERY = gql`
  query BedBoard($filter: BedBoardFilterInput!) {
    bedBoard(filter: $filter) {
      summary {
        total
        occupied
        available
        reserved
        cleaning
        blocked
        occupancy_rate
      }
      entries {
        bed_id
        bed_number
        status
        ward_id
        ward_name
        ward_type
        floor
        admission_id
        admission_number
        patient_id
        patient_name
        attending_clinician_name
        admitted_at
        expected_discharge_at
        is_mlc
        is_critical
        hold_reason
        hold_until
      }
    }
  }
`
const WARDS_QUERY = gql`
  query WardsForBoard($clinic_id: ID) {
    wards(clinic_id: $clinic_id) {
      id
      name
      ward_type
    }
  }
`

const POLL_INTERVAL_MS = 10_000

// theme.palette.appointmentStatus covers appointment statuses only — a bed's
// own five-value status is a genuinely different domain (UI-8's own
// documented fallback: a small local helper built from alpha(palette.X.main),
// never a hand-picked hex).
function bedStatusStyle(theme, status) {
  const map = {
    available: theme.palette.success,
    occupied: theme.palette.error,
    reserved: theme.palette.info,
    cleaning: theme.palette.warning,
    blocked: theme.palette.grey,
  }
  const c = map[status] ?? theme.palette.grey
  const main = c.main ?? c[600] ?? theme.palette.grey[600]
  return {
    bgcolor: alpha(main, theme.palette.mode === 'dark' ? 0.22 : 0.12),
    borderColor: alpha(main, 0.4),
    color: main,
  }
}

export default function IpdBedBoard() {
  const theme = useTheme()
  const navigate = useNavigate()
  const [clinicId, setClinicId] = useState('')
  const [wardId, setWardId] = useState('')

  const { data: clinicsData } = useQuery(CLINICS_QUERY, { fetchPolicy: 'cache-first' })
  const clinics = useMemo(() => (clinicsData?.clinics ?? []).filter((c) => c.is_active), [clinicsData])

  // Default to the org's primary clinic once clinics load, matching
  // manager/pharmacy/index.jsx's own established pattern for a page-level
  // clinic selector.
  useMemo(() => {
    if (!clinicId && clinics.length > 0) {
      setClinicId(clinics.find((c) => c.is_primary)?.id ?? clinics[0].id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clinics])

  const { data: wardsData } = useQuery(WARDS_QUERY, {
    variables: { clinic_id: clinicId || undefined },
    skip: !clinicId,
    fetchPolicy: 'cache-first',
  })
  const wards = wardsData?.wards ?? []

  const { data, loading, error, refetch } = useQuery(BED_BOARD_QUERY, {
    variables: { filter: { clinic_id: clinicId, ward_id: wardId || undefined } },
    skip: !clinicId,
    pollInterval: POLL_INTERVAL_MS,
    fetchPolicy: 'network-only',
    notifyOnNetworkStatusChange: true,
  })
  const board = data?.bedBoard

  const grouped = useMemo(() => {
    const entries = board?.entries ?? []
    const byWard = new Map()
    for (const e of entries) {
      if (!byWard.has(e.ward_id)) byWard.set(e.ward_id, { ward_name: e.ward_name, ward_type: e.ward_type, beds: [] })
      byWard.get(e.ward_id).beds.push(e)
    }
    return Array.from(byWard.values())
  }, [board])

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={1}>
        <Box>
          <Typography variant="h5" fontWeight={700}>
            IPD Bed Board
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Live occupancy across wards — refreshes every 10 seconds
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <TextField
            select
            size="small"
            label="Clinic"
            value={clinicId}
            onChange={(e) => {
              setClinicId(e.target.value)
              setWardId('')
            }}
            sx={{ minWidth: 200 }}
          >
            {clinics.map((c) => (
              <MenuItem key={c.id} value={c.id}>
                {c.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField select size="small" label="Ward" value={wardId} onChange={(e) => setWardId(e.target.value)} sx={{ minWidth: 160 }}>
            <MenuItem value="">All wards</MenuItem>
            {wards.map((w) => (
              <MenuItem key={w.id} value={w.id}>
                {w.name}
              </MenuItem>
            ))}
          </TextField>
          <Tooltip title="Refresh now">
            <IconButton aria-label="Refresh bed board" onClick={() => refetch()} disabled={loading}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>

      {error && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Failed to load the bed board: {error.message}
        </Alert>
      )}

      {loading && !board && (
        <Box display="flex" justifyContent="center" py={6}>
          <CircularProgress />
        </Box>
      )}

      {!clinicId && !loading && (
        <Alert severity="info">Pick a clinic to see its bed board.</Alert>
      )}

      {board && (
        <>
          <Grid container spacing={2} mb={3}>
            {[
              ['Total beds', board.summary.total, 'text.primary'],
              ['Occupied', board.summary.occupied, 'error.main'],
              ['Available', board.summary.available, 'success.main'],
              ['Cleaning', board.summary.cleaning, 'warning.main'],
              ['Blocked', board.summary.blocked, 'text.disabled'],
              ['Occupancy', `${board.summary.occupancy_rate}%`, 'info.main'],
            ].map(([label, value, color]) => (
              <Grid item xs={6} sm={4} md={2} key={label}>
                <Card sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="h5" fontWeight={700} color={color}>
                    {value}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {label}
                  </Typography>
                </Card>
              </Grid>
            ))}
          </Grid>

          {grouped.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <HotelIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
              <Typography color="text.secondary">No wards set up for this clinic yet.</Typography>
            </Box>
          )}

          <Stack spacing={3}>
            {grouped.map((group) => (
              <Card key={group.ward_name} sx={{ p: 2 }}>
                <Typography variant="subtitle1" fontWeight={700} mb={1.5} sx={{ textTransform: 'capitalize' }}>
                  {group.ward_name}{' '}
                  <Typography component="span" variant="body2" color="text.secondary">
                    ({group.ward_type.replace(/_/g, ' ')})
                  </Typography>
                </Typography>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                    gap: 1.5,
                  }}
                >
                  {group.beds.map((bed) => {
                    const style = bedStatusStyle(theme, bed.status)
                    return (
                      <Tooltip
                        key={bed.bed_id}
                        title={
                          bed.status === 'occupied'
                            ? `${bed.patient_name} — ${bed.admission_number}${bed.attending_clinician_name ? ` — Dr. ${bed.attending_clinician_name}` : ''}`
                            : bed.hold_reason || bed.status
                        }
                      >
                        <Box
                          role="button"
                          tabIndex={0}
                          onClick={() =>
                            bed.status === 'occupied' && bed.admission_id
                              ? navigate(`/ipd/admissions?open=${bed.admission_id}`)
                              : bed.status === 'available'
                                ? navigate(`/ipd/admissions?bed=${bed.bed_id}`)
                                : undefined
                          }
                          sx={{
                            border: '1px solid',
                            borderRadius: 2,
                            p: 1.5,
                            minHeight: 96,
                            cursor: bed.status === 'occupied' || bed.status === 'available' ? 'pointer' : 'default',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 0.5,
                            ...style,
                            '&:focus-visible': { outline: `2px solid ${theme.palette.primary.main}`, outlineOffset: 2 },
                          }}
                        >
                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Typography variant="body2" fontWeight={700}>
                              {bed.bed_number}
                            </Typography>
                            {bed.is_mlc && <Chip size="small" label="MLC" color="error" sx={{ height: 18, fontSize: 10 }} />}
                            {bed.is_critical && !bed.is_mlc && (
                              <Chip size="small" label="Critical" color="warning" sx={{ height: 18, fontSize: 10 }} />
                            )}
                          </Stack>
                          <Chip
                            size="small"
                            label={bed.status}
                            sx={{ alignSelf: 'flex-start', textTransform: 'capitalize', bgcolor: 'transparent', border: `1px solid ${style.color}`, color: style.color }}
                          />
                          {bed.status === 'occupied' && (
                            <Box>
                              <Typography variant="caption" display="block" noWrap>
                                {bed.patient_name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" display="block">
                                since {formatDate(bed.admitted_at)}
                              </Typography>
                            </Box>
                          )}
                          {bed.status === 'available' && (
                            <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mt: 'auto' }}>
                              <AddIcon fontSize="inherit" />
                              <Typography variant="caption">Admit here</Typography>
                            </Stack>
                          )}
                        </Box>
                      </Tooltip>
                    )
                  })}
                </Box>
              </Card>
            ))}
          </Stack>
        </>
      )}
    </Box>
  )
}
