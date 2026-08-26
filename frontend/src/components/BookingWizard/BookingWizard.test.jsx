import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import BookingWizard from './BookingWizard'

// F-24 (project-plans/02-findings-register.md) — this is the internal
// staff/patient booking wizard (components/BookingWizard/*, used by
// pages/appointments/create.jsx), a real, live, and previously completely
// untested component tree distinct from the already-well-covered public
// wizard (pages/booking/index.test.jsx). Its own canProceed() step-gating
// switch (BookingWizard.jsx) is exactly the "booking wizard's step
// validation" F-24 named as a specific, unconfirmed risk — this closes it.
//
// Each real sub-step (Step1Clinic..Step5Confirm) has its own heavy
// GraphQL/auth dependencies unrelated to what this file is testing — the
// wizard's own step-advancement gate, not any one step's internal UI.
// Mocking each to a minimal stub that calls the real updateWizard/onNext
// props isolates that gate without re-deriving five separate GraphQL mocks.
jest.mock('./BookingStep1Clinic', () => function Step1({ updateWizard }) {
  return <button onClick={() => updateWizard({ clinic: { id: 'clinic-1', name: 'MG Road Clinic' } })}>pick-clinic</button>
})
jest.mock('./BookingStep2Clinician', () => function Step2({ updateWizard }) {
  return (
    <>
      <button onClick={() => updateWizard({ clinician: { id: 'clin-1', full_name: 'Dr. Sarah Mitchell' } })}>pick-clinician</button>
      <button onClick={() => updateWizard({ service: { id: 'svc-1', name: 'GP Consultation' } })}>pick-service</button>
    </>
  )
})
jest.mock('./BookingStep3Slot', () => function Step3({ updateWizard }) {
  return <button onClick={() => updateWizard({ slot: { id: 'slot-1', start_datetime: '2026-09-01T09:00:00Z' } })}>pick-slot</button>
})
jest.mock('./BookingStep4Patient', () => function Step4({ updateWizard }) {
  return (
    <>
      <button onClick={() => updateWizard({ patientMode: 'existing', patient: { id: 'pat-1', full_name: 'Anita Sharma' } })}>pick-patient</button>
      <button onClick={() => updateWizard({ intakeFieldsValid: false })}>fail-intake</button>
      <button onClick={() => updateWizard({ intakeFieldsValid: true })}>pass-intake</button>
    </>
  )
})
jest.mock('./BookingStep5Confirm', () => function Step5() {
  return <div>Confirm step reached</div>
})

function renderWizard() {
  return render(
    <MemoryRouter>
      <BookingWizard />
    </MemoryRouter>,
  )
}

describe('BookingWizard — canProceed() step-gating (F-24)', () => {
  it('Step 0 (Select Clinic): Next is disabled until a clinic is chosen', async () => {
    renderWizard()
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()
    await userEvent.click(screen.getByText('pick-clinic'))
    expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled()
  })

  it('Step 1 (Clinician & Service): requires BOTH clinician and service, not either alone', async () => {
    renderWizard()
    await userEvent.click(screen.getByText('pick-clinic'))
    await userEvent.click(screen.getByRole('button', { name: 'Next' }))

    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()
    await userEvent.click(screen.getByText('pick-clinician'))
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()
    await userEvent.click(screen.getByText('pick-service'))
    expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled()
  })

  it('Step 2 (Date & Time): Next is disabled until a slot is chosen', async () => {
    renderWizard()
    await userEvent.click(screen.getByText('pick-clinic'))
    await userEvent.click(screen.getByRole('button', { name: 'Next' }))
    await userEvent.click(screen.getByText('pick-clinician'))
    await userEvent.click(screen.getByText('pick-service'))
    await userEvent.click(screen.getByRole('button', { name: 'Next' }))

    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()
    await userEvent.click(screen.getByText('pick-slot'))
    expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled()
  })

  it('Step 3 (Patient Details): requires a patient AND intakeFieldsValid !== false', async () => {
    renderWizard()
    await userEvent.click(screen.getByText('pick-clinic'))
    await userEvent.click(screen.getByRole('button', { name: 'Next' }))
    await userEvent.click(screen.getByText('pick-clinician'))
    await userEvent.click(screen.getByText('pick-service'))
    await userEvent.click(screen.getByRole('button', { name: 'Next' }))
    await userEvent.click(screen.getByText('pick-slot'))
    await userEvent.click(screen.getByRole('button', { name: 'Next' }))
    // Now on step 3 (Patient Details) — its own Next button reads "Review
    // Booking" (the second-to-last step, one before the confirm step).

    expect(screen.getByRole('button', { name: 'Review Booking' })).toBeDisabled()
    await userEvent.click(screen.getByText('pick-patient'))
    expect(screen.getByRole('button', { name: 'Review Booking' })).toBeEnabled()

    // undefined (config never loaded) is treated as valid — the step's own
    // documented "nothing required until proven otherwise" default.
    await userEvent.click(screen.getByText('fail-intake'))
    expect(screen.getByRole('button', { name: 'Review Booking' })).toBeDisabled()
    await userEvent.click(screen.getByText('pass-intake'))
    expect(screen.getByRole('button', { name: 'Review Booking' })).toBeEnabled()
  })

  it('advances all the way to the confirm step, which owns its own navigation (no Next/Back shown)', async () => {
    renderWizard()
    await userEvent.click(screen.getByText('pick-clinic'))
    await userEvent.click(screen.getByRole('button', { name: 'Next' }))
    await userEvent.click(screen.getByText('pick-clinician'))
    await userEvent.click(screen.getByText('pick-service'))
    await userEvent.click(screen.getByRole('button', { name: 'Next' }))
    await userEvent.click(screen.getByText('pick-slot'))
    await userEvent.click(screen.getByRole('button', { name: 'Next' }))
    await userEvent.click(screen.getByText('pick-patient'))
    await userEvent.click(screen.getByRole('button', { name: 'Review Booking' }))

    expect(screen.getByText('Confirm step reached')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Next|Review Booking/ })).not.toBeInTheDocument()
  })

  it('Back on step 0 navigates to /appointments instead of decrementing', async () => {
    renderWizard()
    expect(screen.getByRole('button', { name: 'Back to Appointments' })).toBeInTheDocument()
  })
})
