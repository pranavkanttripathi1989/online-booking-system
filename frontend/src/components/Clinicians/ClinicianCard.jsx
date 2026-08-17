import { memo, useMemo } from 'react'
import { useMutation } from '@apollo/client'
import {
  Avatar,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  FormControlLabel,
  Stack,
  Switch,
  Tooltip,
  Typography,
  useMediaQuery,
} from '@mui/material'
import { useTheme, alpha } from '@mui/material/styles'
import AttachMoneyIcon from '@mui/icons-material/AttachMoney'
import OpenInDrawerIcon from '@mui/icons-material/OpenInNew'

import { TOGGLE_CLINICIAN_ACTIVE_MUTATION } from '../../graphql/mutations'

// ─── Avatar colour derived from name ─────────────────────────────────────────
// Teal-family palette matching app brand (#006D77)
const NAME_COLOURS = [
  '#006D77', '#0E9F9F', '#14B8A6', '#0D9488',
  '#0F766E', '#1CBFBF', '#2D8A8A', '#047857',
]
function nameColour(name = '') {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return NAME_COLOURS[h % NAME_COLOURS.length]
}

function initials(name = '') {
  return name.split(' ').slice(0, 2).map((p) => p[0]).join('').toUpperCase()
}

// ─── 7-day Availability Heatmap ───────────────────────────────────────────────
const DAYS       = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']
const FULL_DAYS  = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] // SUG-016
// day_of_week: 0=Sun in some APIs; FullCalendar uses 1=Mon. We'll treat 0=Mon here.
function AvailabilityHeatmap({ templates = [] }) {
  // Build a set of which days (0=Mon…6=Sun) have active templates
  const activeDays = new Set(
    templates.filter((t) => t.is_active).map((t) => {
      // day_of_week 1=Mon…7=Sun → 0-index Mon=0
      const d = Number(t.day_of_week)
      return d === 0 ? 6 : d - 1
    })
  )
  return (
    <Box>
      <Typography variant="caption" sx={{ color: '#5F6368' }} fontWeight={600} mb={0.5} display="block">
        Availability
      </Typography>
      <Stack direction="row" spacing={0.5}>
        {DAYS.map((label, idx) => (
          <Tooltip key={label} title={FULL_DAYS[idx]} placement="top" arrow>
            <Box
              sx={{
                width: 22,
                height: 22,
                borderRadius: 1,
                bgcolor: activeDays.has(idx) ? '#0F9D58' : '#F1F3F4',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'transform 0.15s',
                '&:hover': { transform: 'scale(1.2)' },
              }}
            >
              <Typography variant="caption" sx={{ fontSize: 8, color: activeDays.has(idx) ? '#FFFFFF' : '#9AA0A6', fontWeight: 700 }}>
                {label[0]}
              </Typography>
            </Box>
          </Tooltip>
        ))}
      </Stack>
    </Box>
  )
}

// ─── ClinicianCard ────────────────────────────────────────────────────────────
export default function ClinicianCard({ clinician, isAdmin, onViewProfile }) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const [toggleActive] = useMutation(TOGGLE_CLINICIAN_ACTIVE_MUTATION, {
    optimisticResponse: {
      toggleClinicianActive: { __typename: 'Clinician', id: clinician.id, is_active: !clinician.is_active },
    },
  })

  const avatarColour = nameColour(clinician.full_name)
  const templates = clinician.availability_templates ?? []

  return (
    <Card
      elevation={0}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        border: '1px solid',
        borderColor: clinician.is_active ? '#E8EAED' : '#F5C6C2',
        borderRadius: 3,
        transition: 'all 0.25s ease',
        '&:hover': {
          transform: 'translateY(-3px)',
          boxShadow: '0 8px 24px rgba(26,115,232,0.14)',
          borderColor: '#AECBFA',
        },
        opacity: clinician.is_active ? 1 : 0.75,
      }}
    >
      <CardContent sx={{ flex: 1 }}>
        {/* Avatar + name — horizontal on mobile */}
        <Stack direction={{ xs: 'row', sm: 'row' }} spacing={1.5} alignItems="center" mb={1.5}>
          <Avatar
            src={clinician.avatar_url}
            sx={{
              width: { xs: 52, sm: 64 },
              height: { xs: 52, sm: 64 },
              bgcolor: avatarColour,
              fontWeight: 700,
              fontSize: { xs: 18, sm: 20 },
              flexShrink: 0,
              boxShadow: '0 0 0 3px rgba(26,115,232,0.12)',
            }}
          >
            {!clinician.avatar_url && initials(clinician.full_name)}
          </Avatar>
          <Box flex={1} minWidth={0}>
            <Typography fontWeight={700} noWrap sx={{ color: '#202124' }}>{clinician.full_name}</Typography>
            {clinician.clinician_type && (
              <Chip
                label={clinician.clinician_type.name}
                size="small"
                sx={{ bgcolor: '#E8F0FE', color: '#1557B0', border: '1px solid #AECBFA', borderRadius: '8px', height: 22, fontSize: '0.70rem', fontWeight: 700, mt: 0.25 }}
              />
            )}
          </Box>
          {!clinician.is_active && (
            <Chip label="Inactive" size="small" sx={{ fontSize: 10, height: 18, bgcolor: '#FCE8E6', color: '#A50E0E' }} />
          )}
        </Stack>

        {/* Fee */}
        {clinician.consultation_fee && (
          <Stack direction="row" spacing={0.5} alignItems="center" mb={1}>
            <AttachMoneyIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
            <Typography variant="caption" color="text.secondary">
              ₹{Number(clinician.consultation_fee).toFixed(2)} per consultation
            </Typography>
          </Stack>
        )}

        {/* Services */}
        {clinician.services?.length > 0 && (
          <Box mb={1.5}>
            <Typography variant="caption" sx={{ color: '#5F6368' }} fontWeight={600} display="block" mb={0.5}>
              Services
            </Typography>
            <Stack direction="row" flexWrap="wrap" gap={0.5}>
              {clinician.services.slice(0, 4).map((s) => (
                <Chip key={s.id} label={s.name} size="small" sx={{ bgcolor: '#F8F9FA', color: '#5F6368', border: '1px solid #E8EAED', borderRadius: '6px', height: 20, fontSize: '0.68rem' }} />
              ))}
              {clinician.services.length > 4 && (
                <Chip label={`+${clinician.services.length - 4}`} size="small" variant="outlined" sx={{ fontSize: 10, height: 20 }} />
              )}
            </Stack>
          </Box>
        )}

        {/* Availability heatmap */}
        <AvailabilityHeatmap templates={templates} />

        {/* Active toggle (admin only) */}
        {isAdmin && (
          <FormControlLabel
            sx={{ mt: 1.5, ml: 0 }}
            control={
              <Switch
                checked={clinician.is_active}
                size="small"
                color={clinician.is_active ? 'success' : 'default'}
                onChange={() => toggleActive({ variables: { id: clinician.id } })}
              />
            }
            label={
              <Typography variant="caption" color="text.secondary">
                {clinician.is_active ? 'Active' : 'Inactive'}
              </Typography>
            }
          />
        )}
      </CardContent>

      <CardActions sx={{ px: 2, pb: 2 }}>
        <Button
          fullWidth
          variant="outlined"
          size="small"
          startIcon={<OpenInDrawerIcon fontSize="small" />}
          onClick={() => onViewProfile(clinician)}
          sx={{
            borderColor: '#AECBFA', color: '#1A73E8',
            fontWeight: 700, borderRadius: 2,
            '&:hover': { bgcolor: '#E8F0FE', borderColor: '#1A73E8' },
          }}
        >
          View Profile
        </Button>
      </CardActions>
    </Card>
  )
}
