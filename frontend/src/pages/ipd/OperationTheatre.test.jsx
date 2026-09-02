import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { MockedProvider } from '@apollo/client/testing'
import { gql } from '@apollo/client'
import OperationTheatre from './OperationTheatre'
import { CLINICS_QUERY } from '../../graphql/queries'

// REQ179 (IPD slice 3) — first coverage for the OT schedule page: renders
// real data (not mock), and the "New Booking" affordance is disabled until
// at least one theatre exists for the selected clinic.

const THEATRES_QUERY = gql`
  query OtTheatres($clinic_id: ID) {
    operationTheatres(clinic_id: $clinic_id) { id name default_turnaround_minutes is_active }
  }
`
const SCHEDULE_QUERY = gql`
  query OtSchedule($theatre_id: ID, $clinic_id: ID, $from: String!, $to: String!) {
    otSchedule(theatre_id: $theatre_id, clinic_id: $clinic_id, from: $from, to: $to) {
      id theatre_id theatre_name admission_id admission_number patient_name procedure_name
      primary_surgeon_name anesthetist_name start_at end_at turnaround_minutes status cancel_reason
    }
  }
`

const clinicA = { __typename: 'Clinic', id: 'clinic-a', name: 'City Care Clinic', address: '1 Road', city: null, postcode: null, phone: '1', email: 'a@a.com', timezone: 'Asia/Kolkata', is_active: true, is_primary: true }

function baseMocks(theatres = [], bookings = []) {
  return [
    { request: { query: CLINICS_QUERY }, result: { data: { clinics: [clinicA] } } },
    { request: { query: THEATRES_QUERY, variables: { clinic_id: 'clinic-a' } }, result: { data: { operationTheatres: theatres.map((t) => ({ __typename: 'OperationTheatre', ...t })) } } },
    {
      // from/to are derived from `new Date()` at render time — a dynamic
      // matcher tolerates that instead of asserting an exact ISO string.
      request: { query: SCHEDULE_QUERY },
      variableMatcher: (variables) => variables.clinic_id === 'clinic-a' && typeof variables.from === 'string' && typeof variables.to === 'string',
      result: { data: { otSchedule: bookings.map((b) => ({ __typename: 'OtBooking', ...b })) } },
    },
  ]
}

function renderPage(mocks) {
  return render(
    <MemoryRouter>
      <MockedProvider mocks={mocks} addTypename={false}>
        <OperationTheatre />
      </MockedProvider>
    </MemoryRouter>,
  )
}

describe('ipd/OperationTheatre', () => {
  it('renders the empty state when no bookings fall in the window', async () => {
    renderPage(baseMocks([{ id: 'theatre-a', name: 'OT-1', default_turnaround_minutes: 30, is_active: true }], []))
    await waitFor(() => expect(screen.getByText(/no bookings in this window/i)).toBeInTheDocument())
  })

  it('disables "New Booking" until a theatre exists for the clinic', async () => {
    renderPage(baseMocks([], []))
    await waitFor(() => expect(screen.getByText(/no bookings in this window/i)).toBeInTheDocument())
    expect(screen.getByRole('button', { name: /new booking/i })).toBeDisabled()
  })

  it('renders a real scheduled booking with its patient and surgeon, not mock data', async () => {
    renderPage(
      baseMocks(
        [{ id: 'theatre-a', name: 'OT-1', default_turnaround_minutes: 30, is_active: true }],
        [
          {
            id: 'booking-1', theatre_id: 'theatre-a', theatre_name: 'OT-1', admission_id: 'adm-1', admission_number: 'ADM/2026-27/00001',
            patient_name: 'Jane Doe', procedure_name: 'Appendectomy', primary_surgeon_name: 'Sam Rao', anesthetist_name: null,
            start_at: '2026-09-05T09:00:00.000Z', end_at: '2026-09-05T11:00:00.000Z', turnaround_minutes: 30, status: 'scheduled', cancel_reason: null,
          },
        ],
      ),
    )
    await waitFor(() => expect(screen.getByText('Jane Doe')).toBeInTheDocument())
    expect(screen.getByText('Appendectomy')).toBeInTheDocument()
    expect(screen.getByText('Sam Rao')).toBeInTheDocument()
  })
})
