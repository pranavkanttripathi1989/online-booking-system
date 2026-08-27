import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MockedProvider } from '@apollo/client/testing'
import BookingStep5Confirm from './BookingStep5Confirm'
import { CREATE_APPOINTMENT_MUTATION } from '../../graphql/mutations'

// P1-17 / BOOK-14 / BOOK-19 — a booking that actually landed
// awaiting_payment (prepayment_policy: 'required', or now a high
// no-show-risk score) must never show the "Booked! 🎉" success screen —
// confirmed nothing anywhere handled this before this fix.

const wizardData = {
  clinic: { id: 'clinic-1', name: 'Real Clinic' },
  clinician: { id: 'cln-1', full_name: 'Dr. Real' },
  service: { id: 'svc-1', name: 'GP Consult', duration_minutes: 30, price: 50000 },
  slot: { id: 'slot-1', start_datetime: '2026-09-05T09:00:00.000Z', end_datetime: '2026-09-05T09:30:00.000Z' },
  patient: { id: 'pat-1', full_name: 'Real Patient' },
  patientMode: 'existing',
  notes: '',
}

function appointmentResult(overrides = {}) {
  return {
    __typename: 'Appointment',
    id: 'appt-new',
    start_datetime: '2026-09-05T09:00:00.000Z',
    end_datetime: '2026-09-05T09:30:00.000Z',
    status: 'scheduled',
    patient: { __typename: 'AppointmentPatient', id: 'pat-1', full_name: 'Real Patient', email: 'real@example.com' },
    clinician: { __typename: 'AppointmentClinician', id: 'cln-1', full_name: 'Dr. Real' },
    service: { __typename: 'AppointmentService', id: 'svc-1', name: 'GP Consult', duration_minutes: 30, price: 50000 },
    clinic: { __typename: 'AppointmentClinic', id: 'clinic-1', name: 'Real Clinic' },
    room: null,
    checkin_token: null,
    no_show_risk: { __typename: 'NoShowRisk', score: 10, level: 'low', reasons: [] },
    ...overrides,
  }
}

function renderStep(mocks) {
  const navigate = jest.fn()
  const utils = render(
    <MockedProvider mocks={mocks}>
      <BookingStep5Confirm wizardData={wizardData} navigate={navigate} />
    </MockedProvider>,
  )
  return { ...utils, navigate }
}

describe('BookingStep5Confirm — awaiting_payment handling (P1-17/BOOK-14/BOOK-19)', () => {
  it('shows the real success screen for a normal, confirmed booking', async () => {
    const mocks = [
      {
        request: {
          query: CREATE_APPOINTMENT_MUTATION,
          variables: { input: { patient_id: 'pat-1', clinician_id: 'cln-1', service_id: 'svc-1', clinic_id: 'clinic-1', slot_id: 'slot-1', start_datetime: '2026-09-05T09:00:00.000Z', notes: undefined, intake_responses: [] } },
        },
        result: { data: { createAppointment: appointmentResult() } },
      },
    ]
    renderStep(mocks)
    await userEvent.click(screen.getByRole('button', { name: 'Book Appointment' }))
    await waitFor(() => expect(screen.getByText('Appointment Booked! 🎉')).toBeInTheDocument())
    expect(screen.queryByText('Prepayment Required to Confirm')).not.toBeInTheDocument()
  })

  it('never shows the success screen for a booking that actually landed awaiting_payment', async () => {
    const mocks = [
      {
        request: {
          query: CREATE_APPOINTMENT_MUTATION,
          variables: { input: { patient_id: 'pat-1', clinician_id: 'cln-1', service_id: 'svc-1', clinic_id: 'clinic-1', slot_id: 'slot-1', start_datetime: '2026-09-05T09:00:00.000Z', notes: undefined, intake_responses: [] } },
        },
        result: { data: { createAppointment: appointmentResult({ status: 'awaiting_payment' }) } },
      },
    ]
    renderStep(mocks)
    await userEvent.click(screen.getByRole('button', { name: 'Book Appointment' }))
    await waitFor(() => expect(screen.getByText('Prepayment Required to Confirm')).toBeInTheDocument())
    expect(screen.queryByText('Appointment Booked! 🎉')).not.toBeInTheDocument()
    expect(screen.getByText(/This service requires prepayment/)).toBeInTheDocument()
  })

  it('explains a risk-driven prepayment with the real reasons, not a generic message', async () => {
    const mocks = [
      {
        request: {
          query: CREATE_APPOINTMENT_MUTATION,
          variables: { input: { patient_id: 'pat-1', clinician_id: 'cln-1', service_id: 'svc-1', clinic_id: 'clinic-1', slot_id: 'slot-1', start_datetime: '2026-09-05T09:00:00.000Z', notes: undefined, intake_responses: [] } },
        },
        result: {
          data: {
            createAppointment: appointmentResult({
              status: 'awaiting_payment',
              no_show_risk: { __typename: 'NoShowRisk', score: 85, level: 'high', reasons: ['3 prior no-shows'] },
            }),
          },
        },
      },
    ]
    renderStep(mocks)
    await userEvent.click(screen.getByRole('button', { name: 'Book Appointment' }))
    await waitFor(() => expect(screen.getByText(/3 prior no-shows/)).toBeInTheDocument())
  })

  it('sends staff straight to the real Take Payment action on the appointment detail page', async () => {
    const mocks = [
      {
        request: {
          query: CREATE_APPOINTMENT_MUTATION,
          variables: { input: { patient_id: 'pat-1', clinician_id: 'cln-1', service_id: 'svc-1', clinic_id: 'clinic-1', slot_id: 'slot-1', start_datetime: '2026-09-05T09:00:00.000Z', notes: undefined, intake_responses: [] } },
        },
        result: { data: { createAppointment: appointmentResult({ status: 'awaiting_payment' }) } },
      },
    ]
    const { navigate } = renderStep(mocks)
    await userEvent.click(screen.getByRole('button', { name: 'Book Appointment' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Collect Payment Now' })).toBeInTheDocument())
    await userEvent.click(screen.getByRole('button', { name: 'Collect Payment Now' }))
    expect(navigate).toHaveBeenCalledWith('/appointments/appt-new')
  })
})
