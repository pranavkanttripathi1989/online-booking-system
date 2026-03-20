import { useQuery } from '@apollo/client'
import dayjs from 'dayjs'
import {
  Box,
  Chip,
  Paper,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material'
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import CalendarTodayIcon from '@mui/icons-material/CalendarToday'
import EventBusyIcon from '@mui/icons-material/EventBusy'

import { AVAILABLE_SLOTS_QUERY } from '../../graphql/queries'

// ─── Mock slot generator (fallback when backend is offline) ──────────────────
function generateMockSlots(date, serviceId) {
  if (!date) return []
  const d = dayjs(date)
  const slots = []
  // Unavailable index positions (lunch 8-9, plus 2 random)
  const blocked = new Set([8, 9, Math.floor(Math.random() * 7), Math.floor(Math.random() * 8) + 10])
  const times = [
    '08:00','08:30','09:00','09:30','10:00','10:30','11:00','11:30',
    '12:00','12:30','13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30',
  ]
  times.forEach((t, idx) => {
    const [h, m] = t.split(':').map(Number)
    const start = d.hour(h).minute(m).second(0)
    const end   = start.add(30, 'minute')
    slots.push({
      id: `mock-slot-${idx}`,
      start_datetime: start.toISOString(),
      end_datetime:   end.toISOString(),
      is_available: !blocked.has(idx),
    })
  })
  return slots
}

function SlotChip({ slot, selected, onSelect }) {
  const isAvailable = slot.is_available !== false
  const time = dayjs(slot.start_datetime).format('h:mm A')

  return (
    <Chip
      label={time}
      onClick={isAvailable ? () => onSelect(slot) : undefined}
      disabled={!isAvailable}
      variant={selected ? 'filled' : 'outlined'}
      color={selected ? 'primary' : 'default'}
      sx={{
        fontWeight: selected ? 700 : 500,
        transition: 'all 0.15s ease',
        cursor: isAvailable ? 'pointer' : 'not-allowed',
        '&:hover': isAvailable ? {
          borderColor: 'primary.main',
          transform: 'scale(1.05)',
        } : {},
        ...(selected && {
          boxShadow: '0 4px 12px rgba(99,102,241,0.35)',
        }),
      }}
    />
  )
}

export default function BookingStep3Slot({ wizardData, updateWizard }) {
  const { clinician, service, slot: selectedSlot } = wizardData
  const selectedDate = wizardData.slotDate ?? null

  const { data, loading } = useQuery(AVAILABLE_SLOTS_QUERY, {
    variables: {
      clinician_id: clinician?.id,
      date: selectedDate ? dayjs(selectedDate).format('YYYY-MM-DD') : '',
      service_id: service?.id,
    },
    skip: !clinician?.id || !selectedDate,
    fetchPolicy: 'network-only',
  })

  const apiSlots = data?.availableSlots ?? []
  // Fall back to generated mock slots when backend is offline
  const slots = apiSlots.length > 0 ? apiSlots : generateMockSlots(selectedDate, service?.id)
  const availableCount = slots.filter((s) => s.is_available !== false).length

  const handleDateChange = (date) => {
    updateWizard({ slotDate: date, slot: null })
  }

  const handleSlotSelect = (slot) => {
    updateWizard({ slot })
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box>
        <Typography variant="h6" fontWeight={700} mb={0.5}>Choose Date & Time</Typography>
        <Typography variant="body2" color="text.secondary" mb={3}>
          Select an available date, then pick your preferred time slot.
        </Typography>

        <Box display="flex" flexWrap="wrap" gap={3} alignItems="flex-start">
          {/* Calendar */}
          <Paper
            elevation={0}
            sx={{
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 3,
              overflow: 'hidden',
              flexShrink: 0,
            }}
          >
            <DateCalendar
              value={selectedDate}
              onChange={handleDateChange}
              disablePast
              sx={{ m: 0 }}
            />
          </Paper>

          {/* Slots panel */}
          <Box flex={1} minWidth={220}>
            {!selectedDate ? (
              <Box
                display="flex"
                flexDirection="column"
                alignItems="center"
                justifyContent="center"
                py={6}
                color="text.disabled"
                gap={1}
              >
                <CalendarTodayIcon sx={{ fontSize: 48 }} />
                <Typography variant="body2">Select a date to see available slots</Typography>
              </Box>
            ) : loading ? (
              <Box>
                <Typography variant="subtitle2" fontWeight={700} color="text.secondary" mb={1.5}>
                  Loading slots…
                </Typography>
                <Box display="flex" flexWrap="wrap" gap={1}>
                  {[...Array(12)].map((_, i) => (
                    <Skeleton key={i} variant="rounded" width={72} height={32} sx={{ borderRadius: 4 }} />
                  ))}
                </Box>
              </Box>
            ) : slots.length === 0 ? (
              <Box
                display="flex"
                flexDirection="column"
                alignItems="center"
                py={6}
                color="text.disabled"
                gap={1}
              >
                <EventBusyIcon sx={{ fontSize: 48 }} />
                <Typography variant="body2">No slots available on this date</Typography>
                <Typography variant="caption">Please choose another date</Typography>
              </Box>
            ) : (
              <Box>
                <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1.5}>
                  <Typography variant="subtitle2" fontWeight={700} color="text.secondary">
                    {dayjs(selectedDate).format('dddd, DD MMM YYYY')}
                  </Typography>
                  <Typography variant="caption" color="text.disabled">
                    {availableCount} slot{availableCount !== 1 ? 's' : ''} available
                  </Typography>
                </Stack>
                <Box display="flex" flexWrap="wrap" gap={1}>
                  {slots.map((slot) => (
                    <SlotChip
                      key={slot.id}
                      slot={slot}
                      selected={selectedSlot?.id === slot.id}
                      onSelect={handleSlotSelect}
                    />
                  ))}
                </Box>
                {selectedSlot && (
                  <Box
                    mt={2}
                    p={1.5}
                    sx={{
                      borderRadius: 2,
                      background: 'linear-gradient(135deg, rgba(99,102,241,0.1) 0%, rgba(139,92,246,0.06) 100%)',
                      border: '1px solid rgba(99,102,241,0.3)',
                    }}
                  >
                    <Typography variant="body2" fontWeight={600} color="primary">
                      ✓ Selected: {dayjs(selectedSlot.start_datetime).format('h:mm A')} — {dayjs(selectedSlot.end_datetime).format('h:mm A')}
                    </Typography>
                  </Box>
                )}
              </Box>
            )}
          </Box>
        </Box>
      </Box>
    </LocalizationProvider>
  )
}
