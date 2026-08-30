import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { MockedProvider } from '@apollo/client/testing'
import { gql } from '@apollo/client'
import { SnackbarProvider } from 'notistack'
import PatientAppointments from './Appointments'
import { expectNoA11yViolations } from '../../test/a11y'
import { APPOINTMENT_FIELDS } from '../../graphql/queries'

// P1-06 — the "Leave a Review" / "Review submitted" flow this slice added.
// Re-declares the page's own query/mutation documents verbatim (this file's
// own established convention, see appointments/index.test.jsx's identical
// note) since importing the page's internal, unexported consts isn't
// possible. APPOINTMENT_FIELDS itself, though, is imported from the real
// shared graphql/queries.js rather than hand-copied -- a hand-copied
// fragment silently drifted out of sync with the real one once series_id/
// series_occurrence_no were added there (P2-10), producing a different
// query document than the real component sends and making MockedProvider
// reject every request in this file with "no more mocked responses" (all
// 5 tests failed with an empty appointments list, not a crash). Importing
// the real fragment, matching appointments/index.test.jsx's own established
// pattern, makes this drift impossible to reintroduce.

const MY_WAITLIST_ENTRIES_QUERY = gql`
  query MyWaitlistEntries {
    myWaitlistEntries {
      id
      waitlist_date
      status
      position
      claim_expires_at
    }
  }
`

const MY_APPOINTMENTS_QUERY = gql`
  query Appointments($filters: AppointmentFilters, $first: Int = 20, $page: Int) {
    appointments(filters: $filters, first: $first, page: $page) {
      data {
        ...AppointmentFields
        has_review
      }
      paginatorInfo {
        count
        currentPage
        firstItem
        hasMorePages
        lastItem
        lastPage
        perPage
        total
      }
    }
  }
  ${APPOINTMENT_FIELDS}
`

const SUBMIT_REVIEW_MUTATION = gql`
  mutation SubmitReview($input: CreateReviewInput!) {
    submitReview(input: $input) {
      success
      review {
        id
        stars
        comment
      }
    }
  }
`

const baseAppointment = (overrides) => ({
  __typename: 'Appointment',
  id: 'appt-1',
  tenant_id: null,
  start_datetime: '2026-08-01T09:00:00.000Z',
  end_datetime: '2026-08-01T09:30:00.000Z',
  duration_minutes: 30,
  status: 'completed',
  type: 'in_person',
  booking_mode: 'slot',
  token_no: null,
  series_id: null,
  series_occurrence_no: null,
  notes: '',
  cancellation_reason: null,
  reminder_sent_at: null,
  created_at: '2026-07-01T00:00:00.000Z',
  updated_at: '2026-07-01T00:00:00.000Z',
  has_review: false,
  patient: { __typename: 'AppointmentPatient', id: 'pat-1', first_name: 'Priya', last_name: 'Shah', full_name: 'Priya Shah', email: 'p@example.test', phone: '9999999999', date_of_birth: null, gender: null },
  clinician: { __typename: 'AppointmentClinician', id: 'cln-1', first_name: 'Sarah', last_name: 'Mitchell', full_name: 'Sarah Mitchell', avatar_url: null, clinician_type: { __typename: 'ClinicianTypeInfo', id: 'gp', name: 'General Physician' } },
  clinic: { __typename: 'AppointmentClinic', id: 'clinic-1', name: 'MG Road Clinic', address: '1 MG Road', city: 'Bengaluru', timezone: 'Asia/Kolkata' },
  room: { __typename: 'AppointmentRoom', id: 'room-1', name: 'Room 1' },
  service: { __typename: 'AppointmentService', id: 'svc-1', name: 'GP Consultation', duration_minutes: 30, price: 500 },
  booked_by_user: null,
  ...overrides,
})

function appointmentsMock(appointments) {
  return {
    request: { query: MY_APPOINTMENTS_QUERY, variables: { first: 100, page: 1 } },
    result: {
      data: {
        appointments: {
          data: appointments,
          paginatorInfo: { count: appointments.length, currentPage: 1, firstItem: 1, hasMorePages: false, lastItem: appointments.length, lastPage: 1, perPage: 100, total: appointments.length },
        },
      },
    },
  }
}

const waitlistMock = {
  request: { query: MY_WAITLIST_ENTRIES_QUERY },
  result: { data: { myWaitlistEntries: [] } },
}

function renderPage(mocks) {
  return render(
    <MockedProvider mocks={mocks} addTypename={false}>
      <SnackbarProvider>
        <MemoryRouter initialEntries={['/patient/appointments']}>
          <PatientAppointments />
        </MemoryRouter>
      </SnackbarProvider>
    </MockedProvider>,
  )
}

describe('PatientAppointments — review submission (P1-06)', () => {
  it('shows "Leave a Review" for a completed appointment without one, and opens the dialog', async () => {
    renderPage([appointmentsMock([baseAppointment()]), waitlistMock])
    fireEvent.click(await screen.findByRole('tab', { name: /Past/ }))
    const reviewButton = await screen.findByRole('button', { name: 'Leave a Review' })
    fireEvent.click(reviewButton)
    expect(await screen.findByText('How was your visit?')).toBeInTheDocument()
  })

  it('shows a "Review submitted" chip, not a button, when has_review is already true', async () => {
    renderPage([appointmentsMock([baseAppointment({ has_review: true })]), waitlistMock])
    fireEvent.click(await screen.findByRole('tab', { name: /Past/ }))
    await screen.findByText('Review submitted')
    expect(screen.queryByRole('button', { name: 'Leave a Review' })).not.toBeInTheDocument()
  })

  it('keeps Submit Review disabled until a star rating and a comment are both given (UI-11)', async () => {
    renderPage([appointmentsMock([baseAppointment()]), waitlistMock])
    fireEvent.click(await screen.findByRole('tab', { name: /Past/ }))
    fireEvent.click(await screen.findByRole('button', { name: 'Leave a Review' }))
    await screen.findByText('How was your visit?')
    const submitButton = screen.getByRole('button', { name: 'Submit Review' })
    expect(submitButton).toBeDisabled()
    expect(screen.getByText('Select a star rating to continue.')).toBeInTheDocument()

    fireEvent.click(screen.getAllByRole('radio', { name: '5 Stars' })[0])
    expect(submitButton).toBeDisabled()
    expect(screen.getByText('Add a few words about your visit to continue.')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Tell us about your visit'), { target: { value: 'Excellent care' } })
    expect(submitButton).toBeEnabled()
  })

  it('the open review dialog has zero axe-core violations', async () => {
    const { container } = renderPage([appointmentsMock([baseAppointment()]), waitlistMock])
    fireEvent.click(await screen.findByRole('tab', { name: /Past/ }))
    fireEvent.click(await screen.findByRole('button', { name: 'Leave a Review' }))
    await screen.findByText('How was your visit?')
    await expectNoA11yViolations(container)
  }, 15000)

  it('submits the review with the right variables and shows success feedback', async () => {
    const appt = baseAppointment()
    const submitMock = {
      request: { query: SUBMIT_REVIEW_MUTATION, variables: { input: { appointment_id: 'appt-1', stars: 5, comment: 'Excellent care' } } },
      result: { data: { submitReview: { success: true, review: { id: 'rev-new', stars: 5, comment: 'Excellent care' } } } },
    }
    renderPage([appointmentsMock([appt]), waitlistMock, submitMock, appointmentsMock([{ ...appt, has_review: true }])])
    fireEvent.click(await screen.findByRole('tab', { name: /Past/ }))
    fireEvent.click(await screen.findByRole('button', { name: 'Leave a Review' }))
    await screen.findByText('How was your visit?')
    fireEvent.click(screen.getAllByRole('radio', { name: '5 Stars' })[0])
    fireEvent.change(screen.getByLabelText('Tell us about your visit'), { target: { value: 'Excellent care' } })
    fireEvent.click(screen.getByRole('button', { name: 'Submit Review' }))
    await waitFor(() => expect(screen.queryByText('How was your visit?')).not.toBeInTheDocument())
    await screen.findByText('Thanks for your feedback!')
  })
})
