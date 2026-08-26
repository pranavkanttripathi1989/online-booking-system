import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MockedProvider } from '@apollo/client/testing'
import BookingStep4Patient from './BookingStep4Patient'
import { useAuth } from '../../hooks/useAuth'

jest.mock('../../hooks/useAuth', () => ({ useAuth: jest.fn() }))

// F-24 (project-plans/02-findings-register.md) — the zod schema this step
// validates new-patient entry against (newPatientSchema, module-private).
// A real, previously-undetected bug found while writing this coverage:
// useForm() had no explicit mode, and nothing in the component ever calls
// handleSubmit — RHF's default 'onSubmit' mode meant formState.errors
// could never populate through any real user interaction, so the
// error/helperText props already wired into every Controller were dead
// code. Fixed with mode: 'onChange' (see BookingStep4Patient.jsx's own
// comment); this file proves the fix, not just the pre-existing behavior.
//
// PATIENTS_QUERY/INTAKE_FIELD_CONFIGS_QUERY are both skip:'d for every
// case here (search stays under 2 chars in 'existing' mode; no clinic_id
// on the passed-in wizardData) -- no network mocks needed for either.

function renderStep(wizardData = {}, updateWizard = jest.fn()) {
  return render(
    <MockedProvider mocks={[]} addTypename={false}>
      <BookingStep4Patient wizardData={wizardData} updateWizard={updateWizard} />
    </MockedProvider>,
  )
}

describe('BookingStep4Patient — new-patient zod validation (F-24)', () => {
  beforeEach(() => {
    useAuth.mockReturnValue({ hasRole: () => false }) // staff/front-desk caller
  })

  it('shows the existing-patient search by default, not the new-patient form', () => {
    renderStep()
    expect(screen.getByLabelText('Search patient by name or email')).toBeInTheDocument()
    expect(screen.queryByLabelText('First Name *')).not.toBeInTheDocument()
  })

  it('switching to New Patient reveals the form with no errors shown yet', async () => {
    renderStep()
    await userEvent.click(screen.getByRole('button', { name: /New Patient/i }))
    expect(screen.getByLabelText('First Name *')).toBeInTheDocument()
    expect(screen.queryByText('First name is required')).not.toBeInTheDocument()
  })

  it('typing then clearing First Name surfaces the real zod validation error', async () => {
    renderStep()
    await userEvent.click(screen.getByRole('button', { name: /New Patient/i }))
    const firstName = screen.getByLabelText('First Name *')
    await userEvent.type(firstName, 'A')
    await userEvent.clear(firstName)
    await waitFor(() => expect(screen.getByText('First name is required')).toBeInTheDocument())
  })

  it('a valid email is accepted; an invalid one surfaces its own zod message', async () => {
    renderStep()
    await userEvent.click(screen.getByRole('button', { name: /New Patient/i }))
    const email = screen.getByLabelText('Email')
    await userEvent.type(email, 'not-an-email')
    await waitFor(() => expect(screen.getByText('Invalid email')).toBeInTheDocument())
    await userEvent.clear(email)
    await userEvent.type(email, 'anita@example.com')
    await waitFor(() => expect(screen.queryByText('Invalid email')).not.toBeInTheDocument())
  })

  it('syncs the typed values up into wizardData.newPatient on every change', async () => {
    const updateWizard = jest.fn()
    renderStep({}, updateWizard)
    await userEvent.click(screen.getByRole('button', { name: /New Patient/i }))
    await userEvent.type(screen.getByLabelText('First Name *'), 'Anita')
    await waitFor(() => expect(updateWizard).toHaveBeenCalledWith(
      expect.objectContaining({ newPatient: expect.objectContaining({ first_name: 'Anita' }) }),
    ))
  })
})
