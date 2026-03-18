import { Box, Typography } from '@mui/material'
import { Helmet } from 'react-helmet-async'
import BookingWizard from '../../components/BookingWizard/BookingWizard'

export default function NewAppointmentPage() {
  return (
    <Box className="page-enter" p={{ xs: 2, md: 3 }}>
      <Helmet>
        <title>New Appointment — MediBook</title>
      </Helmet>
      <Box mb={4}>
        <Typography variant="h4" fontWeight={800}>
          New Appointment
        </Typography>
        <Typography variant="body2" color="text.secondary" mt={0.5}>
          Follow the steps below to book an appointment for a patient.
        </Typography>
      </Box>
      <BookingWizard />
    </Box>
  )
}
