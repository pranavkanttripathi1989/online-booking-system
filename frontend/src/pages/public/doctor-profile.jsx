import React, { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, gql } from '@apollo/client'
import {
  Box,
  Typography,
  Grid,
  Paper,
  Avatar,
  Chip,
  Stack,
  Button,
  Card,
  CardContent,
  ToggleButtonGroup,
  ToggleButton,
  CircularProgress,
  Alert,
  Divider,
  Skeleton,
} from '@mui/material'
import { CalendarMonth, Videocam, LocationOn, VerifiedUser, LocalHospital, School, MedicalServices } from '@mui/icons-material'
import { Timeline, TimelineItem, TimelineSeparator, TimelineConnector, TimelineContent, TimelineDot } from '@mui/lab'
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import dayjs from 'dayjs'

const BRAND = '#006D77'

const GET_CLINICIAN_PROFILE = gql`
  query GetClinicianProfile($id: ID!) {
    getClinician(id: $id) {
      id
      name
      email
      clinicianType
      bio
      clinic {
        id
        name
        address
      }
      languages {
        id
        name
      }
      products {
        id
        name
        description
        price
      }
      education {
        id
        degree
        institution
        year
      }
    }
    getClinicianAvailability(clinicianId: $id) {
      id
      dayOfWeek
      startTime
      endTime
    }
  }
`

const GET_APPOINTMENTS = gql`
  query GetAppointments($clinicianId: ID!, $date: String!) {
    getAppointments(clinicianId: $clinicianId, date: $date) {
      id
      startTime
      endTime
    }
  }
`

export default function DoctorProfile() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [appointmentType, setAppointmentType] = useState('inperson')
  const [selectedDate, setSelectedDate] = useState(dayjs())
  const [selectedSlot, setSelectedSlot] = useState(null)

  const { data, loading, error } = useQuery(GET_CLINICIAN_PROFILE, {
    variables: { id },
    skip: !id,
  })

  const { data: appointmentsData } = useQuery(GET_APPOINTMENTS, {
    variables: { clinicianId: id, date: selectedDate.format('YYYY-MM-DD') },
    skip: !id || !selectedDate,
  })

  const handleAppointmentTypeChange = (event, newType) => {
    if (newType !== null) {
      setAppointmentType(newType)
    }
    setSelectedSlot(null)
  }

  const handleDateChange = (newDate) => {
    setSelectedDate(newDate)
    setSelectedSlot(null)
  }

  const handleSlotClick = (slot) => {
    setSelectedSlot(slot)
  }

  const navigateToBooking = () => {
    // BUG011: this used to navigate to '/booking', a path no route matches
    // (only '/appointments/book' and the redirect-only '/booking/search'
    // exist) -- every real "Book Appointment" click on a real doctor profile
    // 404'd. '/appointments/book' itself has no :clinicianId route param, so
    // the id has to travel as the ?doctor= query string that page actually
    // reads, with router state kept only for the date/time/type pre-fill.
    navigate(`/appointments/book?doctor=${id}`, {
      state: {
        clinicianId: id,
        date: selectedDate.format('YYYY-MM-DD'),
        time: selectedSlot,
        type: appointmentType,
      },
    })
  }

  const availableSlots = useMemo(() => {
    if (!data?.getClinicianAvailability || !selectedDate) return []

    // BUG011: dayOfWeek is a real Int (0=Sunday..6=Saturday) from the
    // backend, not a day-name string -- this comparison could never match.
    const dow = selectedDate.day()
    const dayAvailabilities = data.getClinicianAvailability.filter((a) => Number(a.dayOfWeek) === dow || a.recurrenceType === 'daily')

    let slots = []
    dayAvailabilities.forEach((avail) => {
      let current = dayjs(`${selectedDate.format('YYYY-MM-DD')}T${avail.startTime}`)
      const end = dayjs(`${selectedDate.format('YYYY-MM-DD')}T${avail.endTime}`)

      while (current.isBefore(end)) {
        slots.push(current.format('HH:mm'))
        current = current.add(30, 'minute')
      }
    })

    return slots
  }, [data?.getClinicianAvailability, selectedDate])

  const existingAppointments = useMemo(() => {
    if (!appointmentsData?.getAppointments) return []
    return appointmentsData.getAppointments.map((app) => dayjs(app.startTime).format('HH:mm'))
  }, [appointmentsData])

  // Render skeleton while loading instead of blocking the entire page
  if (loading && !data?.getClinician) {
    return (
      <Box p={{ xs: 2, md: 4 }} maxWidth="xl" mx="auto">
        <Paper elevation={0} sx={{ p: 4, borderRadius: 3, border: '1px solid #E2E8F0', mb: 3 }}>
          <Stack direction="row" gap={3} alignItems="center">
            <Skeleton variant="circular" width={120} height={120} />
            <Box flex={1}>
              <Skeleton variant="text" width="40%" height={48} />
              <Skeleton variant="text" width="25%" height={28} />
              <Skeleton variant="text" width="35%" height={24} sx={{ mt: 1 }} />
            </Box>
            <Box width={180}>
              <Skeleton variant="rounded" height={48} sx={{ mb: 1.5 }} />
              <Skeleton variant="rounded" height={48} />
            </Box>
          </Stack>
        </Paper>
        <Grid container spacing={3}>
          <Grid item xs={12} md={7}>
            <Skeleton variant="rounded" height={120} sx={{ borderRadius: 3, mb: 2 }} />
            <Skeleton variant="rounded" height={80} sx={{ borderRadius: 3, mb: 2 }} />
            <Skeleton variant="rounded" height={200} sx={{ borderRadius: 3 }} />
          </Grid>
          <Grid item xs={12} md={5}>
            <Skeleton variant="rounded" height={500} sx={{ borderRadius: 3 }} />
          </Grid>
        </Grid>
      </Box>
    )
  }

  if (error)
    return (
      <Box p={4}>
        <Alert severity="error">{error.message}</Alert>
      </Box>
    )
  if (!data?.getClinician)
    return (
      <Box p={4}>
        <Alert severity="warning">Clinician not found</Alert>
      </Box>
    )

  const clinician = data.getClinician

  return (
    <Box p={{ xs: 2, md: 4 }} maxWidth="xl" mx="auto">
      {/* DOCTOR HEADER CARD — Stitch style */}
      <Paper elevation={0} sx={{ p: 4, borderRadius: 3, border: '1px solid #E2E8F0', mb: 3 }}>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md="auto">
            <Box sx={{ position: 'relative', width: 120, height: 120 }}>
              <Avatar
                src={`https://www.gravatar.com/avatar/${clinician.id}?d=mp&s=200`}
                sx={{
                  width: 120,
                  height: 120,
                  border: `3px solid ${BRAND}`,
                  boxShadow: `0 0 0 6px ${BRAND}18`,
                }}
              />
            </Box>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="h4" fontWeight={800} color="text.primary">
              {clinician.name}
            </Typography>
            <Chip
              label={clinician.clinicianType || 'Doctor'}
              size="small"
              sx={{ bgcolor: `${BRAND}15`, color: BRAND, fontWeight: 700, fontSize: '0.75rem', height: 24, borderRadius: '6px', mt: 0.75 }}
            />
            <Stack direction="row" gap={1} mt={1.25} alignItems="center">
              <LocationOn fontSize="small" sx={{ color: '#94A3B8' }} />
              <Typography variant="body2" color="text.secondary">
                {clinician.clinic?.address || clinician.clinic?.name || 'Location'}
              </Typography>
            </Stack>
            <Stack direction="row" gap={1} mt={0.5} alignItems="center">
              <VerifiedUser fontSize="small" sx={{ color: '#10B981' }} />
              <Typography variant="body2" sx={{ color: '#10B981', fontWeight: 600 }}>
                Verified Practitioner
              </Typography>
            </Stack>
            <Divider sx={{ my: 1.5 }} />
            <Stack direction="row" flexWrap="wrap" gap={0.75}>
              {clinician.languages?.map((lang, index) => (
                <Chip
                  key={index}
                  label={lang.name}
                  size="small"
                  sx={{ bgcolor: '#F1F5F9', color: 'text.secondary', fontWeight: 600, fontSize: '0.7rem', height: 22, borderRadius: '6px' }}
                />
              ))}
            </Stack>
          </Grid>
          <Grid item xs={12} md="auto" sx={{ ml: 'auto', textAlign: { xs: 'left', md: 'right' } }}>
            <Button
              variant="contained"
              size="large"
              startIcon={<CalendarMonth />}
              sx={{
                bgcolor: BRAND,
                '&:hover': { bgcolor: '#005B64' },
                borderRadius: 2,
                fontWeight: 700,
                mb: 1.5,
                display: 'block',
                width: '100%',
              }}
            >
              Book Appointment
            </Button>
            <Button
              variant="outlined"
              size="large"
              startIcon={<Videocam />}
              sx={{
                borderColor: BRAND,
                color: BRAND,
                '&:hover': { bgcolor: `${BRAND}08` },
                borderRadius: 2,
                fontWeight: 600,
                width: '100%',
              }}
            >
              Video Consultation
            </Button>
          </Grid>
        </Grid>
      </Paper>

      <Grid container spacing={3}>
        <Grid item xs={12} md={7}>
          {/* About — Stitch section title pattern */}
          <Card elevation={0} sx={{ border: '1px solid #E2E8F0', borderRadius: 3, mb: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Stack direction="row" alignItems="center" gap={1} mb={1.5}>
                <MedicalServices sx={{ color: BRAND, fontSize: 18 }} />
                <Typography variant="overline" fontWeight={800} color={BRAND} letterSpacing={1}>
                  About
                </Typography>
              </Stack>
              <Typography variant="body1" color="text.secondary" lineHeight={1.8}>
                {clinician.bio || 'No bio available.'}
              </Typography>
            </CardContent>
          </Card>

          {/* Services */}
          <Card elevation={0} sx={{ border: '1px solid #E2E8F0', borderRadius: 3, mb: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Stack direction="row" alignItems="center" gap={1} mb={2}>
                <LocalHospital sx={{ color: BRAND, fontSize: 18 }} />
                <Typography variant="overline" fontWeight={800} color={BRAND} letterSpacing={1}>
                  Services
                </Typography>
              </Stack>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {clinician.products?.map((product) => (
                  <Chip
                    key={product.id}
                    label={product.name}
                    size="small"
                    sx={{
                      bgcolor: `${BRAND}10`,
                      color: BRAND,
                      fontWeight: 600,
                      fontSize: '0.75rem',
                      height: 26,
                      borderRadius: 1.5,
                      border: `1px solid ${BRAND}30`,
                    }}
                  />
                ))}
              </Box>
            </CardContent>
          </Card>

          {/* Education */}
          <Card elevation={0} sx={{ border: '1px solid #E2E8F0', borderRadius: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Stack direction="row" alignItems="center" gap={1} mb={2}>
                <School sx={{ color: BRAND, fontSize: 18 }} />
                <Typography variant="overline" fontWeight={800} color={BRAND} letterSpacing={1}>
                  Education & Experience
                </Typography>
              </Stack>
              {clinician.education && clinician.education.length > 0 ? (
                <Timeline position="right" sx={{ p: 0, m: 0 }}>
                  {clinician.education.map((edu, index) => (
                    <TimelineItem key={edu.id || index} sx={{ minHeight: 'auto', '&::before': { display: 'none' } }}>
                      <TimelineSeparator>
                        <TimelineDot color="primary" />
                        {index < clinician.education.length - 1 && <TimelineConnector />}
                      </TimelineSeparator>
                      <TimelineContent sx={{ py: '12px', px: 2 }}>
                        <Typography variant="subtitle1" fontWeight="bold">
                          {edu.degree}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {edu.institution} • {edu.year}
                        </Typography>
                      </TimelineContent>
                    </TimelineItem>
                  ))}
                </Timeline>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No education details available.
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={5}>
          <Box position="sticky" top={80}>
            <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
              <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                Select appointment
              </Typography>

              <ToggleButtonGroup fullWidth value={appointmentType} exclusive onChange={handleAppointmentTypeChange} sx={{ mb: 2 }}>
                <ToggleButton value="inperson">
                  <LocalHospital sx={{ mr: 1 }} fontSize="small" />
                  In-Person
                </ToggleButton>
                <ToggleButton value="video">
                  <Videocam sx={{ mr: 1 }} fontSize="small" />
                  Video
                </ToggleButton>
              </ToggleButtonGroup>

              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DateCalendar value={selectedDate} onChange={handleDateChange} />
              </LocalizationProvider>

              <Box mt={2} id="slot-container">
                {availableSlots.length > 0 ? (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                    {availableSlots.map((slot) => {
                      const isTaken = existingAppointments.includes(slot)
                      const isSelected = slot === selectedSlot
                      return (
                        <Button
                          key={slot}
                          variant={isSelected ? 'contained' : 'outlined'}
                          size="small"
                          onClick={() => handleSlotClick(slot)}
                          disabled={isTaken}
                          sx={{
                            minWidth: 64,
                            borderRadius: 1.5,
                            fontWeight: 600,
                            fontSize: '0.78rem',
                            bgcolor: isSelected ? BRAND : 'transparent',
                            borderColor: isSelected ? BRAND : '#E2E8F0',
                            color: isSelected ? 'white' : 'text.primary',
                            '&:hover': { bgcolor: isSelected ? '#005B64' : `${BRAND}08`, borderColor: BRAND },
                          }}
                        >
                          {slot}
                        </Button>
                      )
                    })}
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary" textAlign="center" py={2}>
                    No slots available on this date.
                  </Typography>
                )}
              </Box>

              {selectedSlot && (
                <Box sx={{ bgcolor: `${BRAND}0A`, border: `1px solid ${BRAND}30`, borderRadius: 2, p: 2 }}>
                  <Typography variant="body2" color={BRAND} gutterBottom fontWeight={600}>
                    {selectedDate.format('DD/MM/YYYY')} at {selectedSlot} — {appointmentType === 'inperson' ? 'In-Person' : 'Video'}
                  </Typography>
                  <Button
                    variant="contained"
                    fullWidth
                    sx={{ mt: 1, bgcolor: BRAND, '&:hover': { bgcolor: '#005B64' }, borderRadius: 2, fontWeight: 700, py: 1.25 }}
                    onClick={navigateToBooking}
                  >
                    Continue to Book
                  </Button>
                </Box>
              )}
            </Paper>
          </Box>
        </Grid>
      </Grid>
    </Box>
  )
}
