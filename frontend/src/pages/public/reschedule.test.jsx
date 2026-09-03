import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { MockedProvider } from '@apollo/client/testing'
import { gql } from '@apollo/client'
import { GraphQLError } from 'graphql'
import ReschedulePage from './reschedule'
import { expectNoA11yViolations } from '../../test/a11y'

// Re-declared to match reschedule.jsx's own gql documents exactly (query
// AST equality), same convention as every other page test in this
// codebase.
const GET_RESCHEDULE_CONTEXT = gql`
  query GetRescheduleContext($token: String!) {
    getRescheduleContext(token: $token) {
      clinician_id
      clinician_name
      service_name
      current_start_datetime
      duration_minutes
      booking_mode
    }
  }
`
const GET_CLINICIAN_AVAILABILITY = gql`
  query GetClinicianAvailabilityForReschedule($id: ID!) {
    getClinicianAvailability(clinicianId: $id) {
      id
      dayOfWeek
      startTime
      endTime
      recurrenceType
      mode
    }
  }
`
const GET_APPOINTMENTS = gql`
  query GetAppointmentsForReschedule($clinicianId: ID!, $date: String!) {
    getAppointments(clinicianId: $clinicianId, date: $date) {
      id
      startTime
    }
  }
`
const RESCHEDULE_PUBLIC_APPOINTMENT = gql`
  mutation ReschedulePublicAppointment($token: String!, $new_start_datetime: String!) {
    reschedulePublicAppointment(token: $token, new_start_datetime: $new_start_datetime) {
      id
      start_datetime
      reschedule_fee_amount
    }
  }
`

const baseContext = {
  __typename: 'RescheduleContext',
  clinician_id: 'cln-1',
  clinician_name: 'Dr. Real',
  service_name: 'GP Consultation',
  current_start_datetime: '2026-09-10T09:00:00.000Z',
  duration_minutes: 30,
  booking_mode: 'slot',
}

function renderAt(path, mocks = []) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <MockedProvider mocks={mocks} addTypename={false}>
        <Routes>
          <Route path="/reschedule/:token" element={<ReschedulePage />} />
        </Routes>
      </MockedProvider>
    </MemoryRouter>,
  )
}

describe('reschedule — invalid/expired/used token states (P2-16)', () => {
  it('surfaces the real backend message for an invalid token', async () => {
    const mocks = [
      {
        request: { query: GET_RESCHEDULE_CONTEXT, variables: { token: 'bad-token' } },
        result: { errors: [new GraphQLError('Invalid reschedule link')] },
      },
    ]
    renderAt('/reschedule/bad-token', mocks)
    await waitFor(() => expect(screen.getByText("This reschedule link isn't valid")).toBeInTheDocument())
    expect(screen.getByText('Invalid reschedule link')).toBeInTheDocument()
  })

  it('shows a contact-the-clinic message for a non-slot-mode appointment', async () => {
    const mocks = [
      {
        request: { query: GET_RESCHEDULE_CONTEXT, variables: { token: 'session-token' } },
        result: { data: { getRescheduleContext: { ...baseContext, booking_mode: 'session' } } },
      },
    ]
    renderAt('/reschedule/session-token', mocks)
    await waitFor(() => expect(screen.getByText('Please contact the clinic to reschedule')).toBeInTheDocument())
  })
})

describe('reschedule — slot picking and confirmation (P2-16)', () => {
  const validContextMock = {
    request: { query: GET_RESCHEDULE_CONTEXT, variables: { token: 'good-token' } },
    result: { data: { getRescheduleContext: baseContext } },
  }
  const availabilityMock = {
    request: { query: GET_CLINICIAN_AVAILABILITY, variables: { id: 'cln-1' } },
    result: {
      data: {
        getClinicianAvailability: [
          { id: 'a1', dayOfWeek: null, startTime: '09:00', endTime: '10:00', recurrenceType: 'daily', mode: 'slot' },
        ],
      },
    },
  }
  function appointmentsMock(date, rows = []) {
    return {
      request: { query: GET_APPOINTMENTS, variables: { clinicianId: 'cln-1', date } },
      result: { data: { getAppointments: rows } },
    }
  }

  it('shows the current appointment summary once the context loads', async () => {
    renderAt('/reschedule/good-token', [validContextMock, availabilityMock, appointmentsMock(expect.any(String))])
    await waitFor(() => expect(screen.getByText('Reschedule your appointment')).toBeInTheDocument())
    expect(screen.getByText(/Dr\. Real/)).toBeInTheDocument()
  })

  it('disables an already-booked slot instead of hiding it (BOOK-6)', async () => {
    // Use a fixed, deterministic "tomorrow" date the component itself
    // will request, matching MockedProvider's exact-variable-match
    // requirement — read via the component's own default (today + 1).
    const dayjs = require('dayjs')
    const tomorrow = dayjs().add(1, 'day').format('YYYY-MM-DD')
    // Built the same way the component's own newStart is (local-timezone
    // aware via dayjs(...).toISOString()), not a hardcoded "Z"-suffixed
    // literal — a literal UTC 09:00 renders as a different local hour on
    // an IST host, the same class of bug context/open-questions.md #15
    // and this codebase's own CLAUDE.md history have hit before.
    const bookedStart = dayjs(`${tomorrow}T09:00`).toISOString()
    const mocks = [validContextMock, availabilityMock, appointmentsMock(tomorrow, [{ id: 'x', startTime: bookedStart }])]
    renderAt('/reschedule/good-token', mocks)
    await waitFor(() => expect(screen.getByText('9:00 AM')).toBeInTheDocument())
    expect(screen.getByRole('button', { name: '9:00 AM' })).toBeDisabled()
  })

  it('confirms the reschedule and shows the new time on success', async () => {
    const dayjs = require('dayjs')
    const tomorrow = dayjs().add(1, 'day').format('YYYY-MM-DD')
    const newStart = dayjs(`${tomorrow}T09:00`).toISOString()
    const mocks = [
      validContextMock,
      availabilityMock,
      appointmentsMock(tomorrow, []),
      {
        request: { query: RESCHEDULE_PUBLIC_APPOINTMENT, variables: { token: 'good-token', new_start_datetime: newStart } },
        result: { data: { reschedulePublicAppointment: { id: 'appt-1', start_datetime: newStart, reschedule_fee_amount: null } } },
      },
    ]
    renderAt('/reschedule/good-token', mocks)
    await waitFor(() => expect(screen.getByText('9:00 AM')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: '9:00 AM' }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirm new time' }))
    await waitFor(() => expect(screen.getByText("You're rescheduled")).toBeInTheDocument())
  })

  it('surfaces a reschedule fee in the success message when one applies', async () => {
    const dayjs = require('dayjs')
    const tomorrow = dayjs().add(1, 'day').format('YYYY-MM-DD')
    const newStart = dayjs(`${tomorrow}T09:00`).toISOString()
    const mocks = [
      validContextMock,
      availabilityMock,
      appointmentsMock(tomorrow, []),
      {
        request: { query: RESCHEDULE_PUBLIC_APPOINTMENT, variables: { token: 'good-token', new_start_datetime: newStart } },
        result: { data: { reschedulePublicAppointment: { id: 'appt-1', start_datetime: newStart, reschedule_fee_amount: 200 } } },
      },
    ]
    renderAt('/reschedule/good-token', mocks)
    await waitFor(() => expect(screen.getByText('9:00 AM')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: '9:00 AM' }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirm new time' }))
    await waitFor(() => expect(screen.getByText(/₹200\.00/)).toBeInTheDocument())
  })

  it('surfaces a real slot-conflict error and lets the patient pick another slot', async () => {
    const dayjs = require('dayjs')
    const tomorrow = dayjs().add(1, 'day').format('YYYY-MM-DD')
    const newStart = dayjs(`${tomorrow}T09:00`).toISOString()
    const mocks = [
      validContextMock,
      availabilityMock,
      appointmentsMock(tomorrow, []),
      {
        request: { query: RESCHEDULE_PUBLIC_APPOINTMENT, variables: { token: 'good-token', new_start_datetime: newStart } },
        result: { errors: [new GraphQLError('This time slot is no longer available')] },
      },
    ]
    renderAt('/reschedule/good-token', mocks)
    await waitFor(() => expect(screen.getByText('9:00 AM')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: '9:00 AM' }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirm new time' }))
    await waitFor(() => expect(screen.getByText('This time slot is no longer available')).toBeInTheDocument())
    // The picker itself is still there, not a dead end.
    expect(screen.getByRole('button', { name: '9:00 AM' })).toBeInTheDocument()
  })
})

describe('reschedule — accessibility', () => {
  it('has zero axe-core violations on the invalid-token state', async () => {
    const mocks = [
      {
        request: { query: GET_RESCHEDULE_CONTEXT, variables: { token: 'bad-token' } },
        result: { errors: [new GraphQLError('Invalid reschedule link')] },
      },
    ]
    const { container } = renderAt('/reschedule/bad-token', mocks)
    await waitFor(() => expect(screen.getByText("This reschedule link isn't valid")).toBeInTheDocument())
    await expectNoA11yViolations(container)
  })
})
