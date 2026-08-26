import { render, screen, waitFor, fireEvent, within } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { MockedProvider } from '@apollo/client/testing'
import { HelmetProvider } from 'react-helmet-async'
import { SnackbarProvider } from 'notistack'
import { LocalizationProvider } from '@mui/x-date-pickers'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { GraphQLError } from 'graphql'
import EditAppointmentPage from './edit'
import { APPOINTMENT_DETAIL_QUERY, CLINICIANS_QUERY, ROOMS_QUERY } from '../../graphql/queries'
import { UPDATE_APPOINTMENT_MUTATION } from '../../graphql/mutations'

// BUG022's sibling finding (B-2) — this page previously fell back to
// fabricated MockStore data whenever a query returned a genuine empty/null
// result, and masked a real fetch error behind fake data entirely (it never
// even read `error` off the appointment query). These tests assert the
// fixed, error-gated behavior.

// 'appt-1' is a real seeded id in mocks/data/appointments.js — needed so the
// genuine-error test's MockStore.getAppointmentById() fallback actually
// resolves to a row, matching how this degraded mode behaves for real.
const APPT_ID = 'appt-1'

const apptResult = (overrides = {}) => ({
  __typename: 'Appointment',
  id: APPT_ID,
  tenant_id: null,
  start_datetime: '2026-09-01T09:00:00.000Z',
  end_datetime: '2026-09-01T09:30:00.000Z',
  duration_minutes: 30,
  status: 'scheduled',
  type: 'in_person',
  booking_mode: 'slot',
  token_no: null,
  notes: null,
  cancellation_reason: null,
  reminder_sent_at: null,
  created_at: '2026-08-01T00:00:00.000Z',
  updated_at: '2026-08-01T00:00:00.000Z',
  patient: {
    __typename: 'Patient',
    id: 'p1',
    first_name: 'Real',
    last_name: 'Patient',
    full_name: 'Real Patient',
    email: 'real@example.com',
    phone: '9000000000',
    date_of_birth: '1990-01-01',
    gender: null,
  },
  clinician: {
    __typename: 'AppointmentClinician',
    id: 'c1',
    first_name: 'Real',
    last_name: 'Clinician',
    full_name: 'Real Clinician',
    avatar_url: null,
    clinician_type: null,
  },
  clinic: { __typename: 'AppointmentClinic', id: 'clinic-1', name: 'Real Clinic', address: null, city: null, timezone: null },
  room: null,
  service: { __typename: 'AppointmentService', id: 'svc-1', name: 'Real Service', duration_minutes: 30, price: 500 },
  booked_by_user: null,
  status_logs: [],
  ...overrides,
})

const cliniciansMock = (
  result = {
    clinicians: {
      __typename: 'ClinicianPaginated',
      data: [{ __typename: 'Clinician', id: 'c1', first_name: 'Real', last_name: 'Clinician', full_name: 'Real Clinician' }],
    },
  },
) => ({
  request: { query: CLINICIANS_QUERY, variables: { first: 100, is_active: true } },
  result: { data: result },
})
const roomsMock = (result = { rooms: [] }) => ({
  request: { query: ROOMS_QUERY, variables: {} },
  result: { data: result },
})

function renderPage(mocks) {
  return render(
    <HelmetProvider>
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <SnackbarProvider>
          <MemoryRouter initialEntries={[`/appointments/${APPT_ID}/edit`]}>
            <MockedProvider mocks={mocks} addTypename={true}>
              <Routes>
                <Route path="/appointments/:id/edit" element={<EditAppointmentPage />} />
              </Routes>
            </MockedProvider>
          </MemoryRouter>
        </SnackbarProvider>
      </LocalizationProvider>
    </HelmetProvider>,
  )
}

describe('appointments/edit (B-2)', () => {
  it('renders the real fetched appointment, never fabricated mock patient data', async () => {
    const mocks = [
      { request: { query: APPOINTMENT_DETAIL_QUERY, variables: { id: APPT_ID } }, result: { data: { appointment: apptResult() } } },
      cliniciansMock(),
      roomsMock(),
    ]
    renderPage(mocks)
    await waitFor(() => expect(screen.getAllByText('Real Patient').length).toBeGreaterThan(0))
    expect(screen.getAllByText('Real Clinician').length).toBeGreaterThan(0)
  })

  it('a genuine empty clinicians/rooms result renders empty dropdowns, not fabricated mock rows', async () => {
    const mocks = [
      { request: { query: APPOINTMENT_DETAIL_QUERY, variables: { id: APPT_ID } }, result: { data: { appointment: apptResult() } } },
      cliniciansMock({ clinicians: { data: [] } }),
      roomsMock({ rooms: [] }),
    ]
    renderPage(mocks)
    await waitFor(() => expect(screen.getAllByText('Real Patient').length).toBeGreaterThan(0))
    // Open the Clinician select — "No clinician" must be the only option;
    // no fabricated MockStore names appear now that the empty result is
    // handled as a genuine empty list, not a cue to substitute mock rows.
    fireEvent.mouseDown(screen.getByLabelText('Clinician'))
    const listbox = within(screen.getByRole('listbox'))
    expect(listbox.getAllByRole('option')).toHaveLength(1)
    expect(listbox.getByText('No clinician')).toBeInTheDocument()
  })

  it('a genuinely nonexistent appointment (real success, appointment: null) shows a real not-found state, not an infinite skeleton', async () => {
    const mocks = [
      { request: { query: APPOINTMENT_DETAIL_QUERY, variables: { id: APPT_ID } }, result: { data: { appointment: null } } },
      cliniciansMock(),
      roomsMock(),
    ]
    renderPage(mocks)
    await waitFor(() => expect(screen.getByText('This appointment could not be found.')).toBeInTheDocument())
  })

  it('a real backend "Appointment not found" GraphQL error shows the not-found state, not an infinite skeleton or a MockStore fallback', async () => {
    const mocks = [
      {
        request: { query: APPOINTMENT_DETAIL_QUERY, variables: { id: APPT_ID } },
        result: { errors: [new GraphQLError('Appointment not found')] },
      },
      cliniciansMock(),
      roomsMock(),
    ]
    renderPage(mocks)
    await waitFor(() => expect(screen.getByText('This appointment could not be found.')).toBeInTheDocument())
  })

  it('saves without end_datetime — AppointmentUpdateInput has no such field and rejects the whole mutation if sent', async () => {
    // Regression test: this exact scenario (a real edit, real fetched
    // data, Save Changes clicked) previously always failed live —
    // form.end is always populated from the loaded appointment, so every
    // save sent end_datetime, which AppointmentUpdateInput doesn't define,
    // rejecting the mutation with a GraphQL variable-coercion error before
    // it ever reached the resolver. MockedProvider only matches a mock
    // whose variables match exactly, so if the fixed code still sent
    // end_datetime, this mock simply wouldn't match and the test would
    // time out waiting for the update to complete.
    const updateMock = {
      request: {
        query: UPDATE_APPOINTMENT_MUTATION,
        variables: {
          id: APPT_ID,
          input: { status: 'scheduled', start_datetime: '2026-09-01T09:00:00.000Z', clinician_id: 'c1', notes: 'Updated note' },
        },
      },
      result: { data: { updateAppointment: { ...apptResult(), notes: 'Updated note' } } },
    }
    const mocks = [
      { request: { query: APPOINTMENT_DETAIL_QUERY, variables: { id: APPT_ID } }, result: { data: { appointment: apptResult() } } },
      cliniciansMock(),
      roomsMock(),
      updateMock,
    ]
    renderPage(mocks)
    await waitFor(() => expect(screen.getAllByText('Real Patient').length).toBeGreaterThan(0))

    fireEvent.change(screen.getByLabelText('Notes'), { target: { value: 'Updated note' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }))

    await waitFor(() => expect(screen.getByText('Appointment updated successfully')).toBeInTheDocument())
  })

  it('the End Date & Time field is disabled — not independently editable on this backend', async () => {
    const mocks = [
      { request: { query: APPOINTMENT_DETAIL_QUERY, variables: { id: APPT_ID } }, result: { data: { appointment: apptResult() } } },
      cliniciansMock(),
      roomsMock(),
    ]
    renderPage(mocks)
    await waitFor(() => expect(screen.getAllByText('Real Patient').length).toBeGreaterThan(0))
    expect(screen.getByLabelText(/^End Date & Time/)).toBeDisabled()
  })

  it('a genuine query error falls back to mock data (documented degradation), not a silent crash', async () => {
    const mocks = [
      { request: { query: APPOINTMENT_DETAIL_QUERY, variables: { id: APPT_ID } }, error: new GraphQLError('network down') },
      cliniciansMock(),
      roomsMock(),
    ]
    renderPage(mocks)
    // The page must render *something* usable rather than crash or hang —
    // exact mock content isn't asserted here, only that it recovers.
    await waitFor(() => expect(screen.getByRole('button', { name: 'Save Changes' })).toBeInTheDocument())
  })
})
