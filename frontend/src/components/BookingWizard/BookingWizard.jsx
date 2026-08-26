import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, Button, Paper, Step, StepLabel, Stepper, Typography, useMediaQuery, useTheme } from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'

import BookingStep1Clinic from './BookingStep1Clinic'
import BookingStep2Clinician from './BookingStep2Clinician'
import BookingStep3Slot from './BookingStep3Slot'
import BookingStep4Patient from './BookingStep4Patient'
import BookingStep5Confirm from './BookingStep5Confirm'

const STEPS = ['Select Clinic', 'Clinician & Service', 'Date & Time', 'Patient Details', 'Confirm & Book']

// ─── Initial wizard state ─────────────────────────────────────────────────────
const INITIAL_STATE = {
  clinic: null, // { id, name, address, city, phone }
  clinician: null, // { id, full_name, avatar_url, clinician_type, ... }
  service: null, // { id, name, duration_minutes, price }
  slot: null, // { id, start_datetime, end_datetime }
  patientMode: 'existing', // 'existing' | 'new'
  patient: null, // existing patient object
  newPatient: null, // new patient form data
  notes: '',
}

// ─── BookingWizard ─────────────────────────────────────────────────────────────
export default function BookingWizard() {
  const navigate = useNavigate()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  const [activeStep, setActiveStep] = useState(0)
  const [wizardData, setWizardData] = useState(INITIAL_STATE)

  const updateWizard = useCallback((patch) => {
    setWizardData((prev) => ({ ...prev, ...patch }))
  }, [])

  // ── Step validity guards ──────────────────────────────────────────────────
  const canProceed = () => {
    switch (activeStep) {
      case 0:
        return !!wizardData.clinic
      case 1:
        return !!wizardData.clinician && !!wizardData.service
      case 2:
        return !!wizardData.slot
      case 3: {
        const patientOk = wizardData.patientMode === 'existing' ? !!wizardData.patient : !!wizardData.newPatient
        // REQ052 (US-BOOK-06) — undefined (config hasn't loaded/no fields
        // configured yet) is treated as valid, matching this step's own
        // "nothing required until proven otherwise" default.
        return patientOk && wizardData.intakeFieldsValid !== false
      }
      case 4:
        return true
      default:
        return false
    }
  }

  const handleNext = () => setActiveStep((s) => Math.min(s + 1, STEPS.length - 1))
  const handleBack = () => setActiveStep((s) => Math.max(s - 1, 0))

  // ── Render active step ────────────────────────────────────────────────────
  const renderStep = () => {
    const props = { wizardData, updateWizard, onNext: handleNext }
    switch (activeStep) {
      case 0:
        return <BookingStep1Clinic {...props} />
      case 1:
        return <BookingStep2Clinician {...props} />
      case 2:
        return <BookingStep3Slot {...props} />
      case 3:
        return <BookingStep4Patient {...props} />
      case 4:
        return <BookingStep5Confirm {...props} wizardData={wizardData} navigate={navigate} />
      default:
        return null
    }
  }

  const isLastStep = activeStep === STEPS.length - 1

  return (
    <Box maxWidth={900} mx="auto">
      {/* Stepper */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2, md: 3 },
          mb: 3,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 3,
          background: 'linear-gradient(135deg, rgba(99,102,241,0.06) 0%, rgba(139,92,246,0.03) 100%)',
        }}
      >
        <Stepper activeStep={activeStep} orientation={isMobile ? 'vertical' : 'horizontal'} alternativeLabel={!isMobile}>
          {STEPS.map((label, idx) => (
            <Step key={label} completed={idx < activeStep}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      </Paper>

      {/* Step content */}
      <Box mb={3}>{renderStep()}</Box>

      {/* Navigation buttons — hidden on last step (BookingStep5Confirm handles its own) */}
      {!isLastStep && (
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={activeStep === 0 ? () => navigate('/appointments') : handleBack}
          >
            {activeStep === 0 ? 'Back to Appointments' : 'Back'}
          </Button>
          <Button variant="contained" endIcon={<ArrowForwardIcon />} disabled={!canProceed()} onClick={handleNext} sx={{ px: 3.5 }}>
            {activeStep === STEPS.length - 2 ? 'Review Booking' : 'Next'}
          </Button>
        </Box>
      )}
    </Box>
  )
}
