import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { MockedProvider } from '@apollo/client/testing'
import { SnackbarProvider } from 'notistack'
import { ThemeProvider } from '@mui/material/styles'
import { gql } from '@apollo/client'
import AppointmentDetailPage from './detail'
import { useAuth } from '../../hooks/useAuth'
import { createAppTheme } from '../../theme'
import { APPOINTMENT_DETAIL_QUERY } from '../../graphql/queries'

// Reported live: a completed appointment gave no way back to its own
// consultation notes/prescriptions. Covers the new "View Consultation"
// button only — not the rest of this large, previously-untested page.

jest.mock('../../hooks/useAuth', () => ({
  useAuth: jest.fn(),
}))

const APPOINTMENT_ID = 'appt-real-1'

// Local re-declarations matching detail.jsx's own inline gql exactly
// (query-AST equality, not import identity) — these two aren't exported
// from graphql/queries.js.
const CHECKLIST_ITEMS_QUERY = gql`
  query ChecklistItems($clinic_id: ID) {
    checklistItems(clinic_id: $clinic_id) {
      id
      product_id
      label
      is_required
      sort_order
    }
  }
`
const CHECKLIST_COMPLETIONS_QUERY = gql`
  query ChecklistCompletions($appointment_id: ID!) {
    checklistCompletions(appointment_id: $appointment_id) {
      id
      checklist_item_id
    }
  }
`

function appointment(overrides = {}) {
  return {
    __typename: 'Appointment',
    id: APPOINTMENT_ID,
    tenant_id: 'org-1',
    start_datetime: '2026-08-30T09:30:00.000Z',
    end_datetime: '2026-08-30T09:50:00.000Z',
    duration_minutes: 20,
    status: 'completed',
    type: 'in_person',
    booking_mode: 'slot',
    token_no: null,
    series_id: null,
    series_occurrence_no: null,
    notes: null,
    cancellation_reason: null,
    reminder_sent_at: null,
    created_at: '2026-08-20T00:00:00.000Z',
    updated_at: '2026-08-30T09:50:00.000Z',
    patient: {
      __typename: 'Patient',
      id: 'pat-1',
      first_name: 'Priya',
      last_name: 'Patient',
      full_name: 'Priya Patient',
      email: 'patient@medibook.dev',
      phone: '+919810000005',
      date_of_birth: '1992-06-20T00:00:00.000Z',
      gender: 'female',
    },
    clinician: {
      __typename: 'Clinician',
      id: 'cln-1',
      first_name: 'Alex',
      last_name: 'Clinician',
      full_name: 'Alex Clinician',
      avatar_url: null,
      clinician_type: { __typename: 'ClinicianType', id: 'ct-1', name: 'General Physician' },
    },
    clinic: { __typename: 'Clinic', id: 'clinic-1', name: 'City Heart Clinic', address: null, city: 'Bengaluru', timezone: 'Asia/Kolkata' },
    room: null,
    service: { __typename: 'Service', id: 'svc-1', name: 'GP Consultation', duration_minutes: 20, price: 50000 },
    booked_by_user: null,
    status_logs: [],
    ...overrides,
  }
}

function baseMocks(apt) {
  return [
    { request: { query: APPOINTMENT_DETAIL_QUERY, variables: { id: APPOINTMENT_ID } }, result: { data: { appointment: apt } } },
    { request: { query: CHECKLIST_ITEMS_QUERY, variables: { clinic_id: apt.clinic?.id } }, result: { data: { checklistItems: [] } } },
    {
      request: { query: CHECKLIST_COMPLETIONS_QUERY, variables: { appointment_id: apt.id } },
      result: { data: { checklistCompletions: [] } },
    },
  ]
}

function EncounterMarker() {
  const location = useLocation()
  return <div data-testid="encounter-marker">{location.pathname}</div>
}

function renderPage(mocks) {
  const theme = createAppTheme('light')
  return render(
    <ThemeProvider theme={theme}>
      <HelmetProvider>
        <MemoryRouter initialEntries={[`/appointments/${APPOINTMENT_ID}`]}>
          <SnackbarProvider>
            <MockedProvider mocks={mocks} addTypename={false}>
              <Routes>
                <Route path="/appointments/:id" element={<AppointmentDetailPage />} />
                <Route path="/clinician/encounters/:appointmentId" element={<EncounterMarker />} />
              </Routes>
            </MockedProvider>
          </SnackbarProvider>
        </MemoryRouter>
      </HelmetProvider>
    </ThemeProvider>,
  )
}

describe('appointments/detail.jsx — "View Consultation" on a completed appointment', () => {
  it('shows and navigates via "View Consultation" for a clinician on a completed appointment', async () => {
    useAuth.mockReturnValue({ hasRole: (r) => r === 'clinician' })
    renderPage(baseMocks(appointment()))
    await waitFor(() => expect(screen.getByRole('button', { name: 'View Consultation' })).toBeInTheDocument())

    await userEvent.click(screen.getByRole('button', { name: 'View Consultation' }))
    await waitFor(() => expect(screen.getByTestId('encounter-marker')).toHaveTextContent(`/clinician/encounters/${APPOINTMENT_ID}`))
  })

  it('hides "View Consultation" for a non-clinician role', async () => {
    useAuth.mockReturnValue({ hasRole: () => false })
    renderPage(baseMocks(appointment()))
    await waitFor(() => expect(screen.getByText('Priya Patient')).toBeInTheDocument())
    expect(screen.queryByRole('button', { name: 'View Consultation' })).not.toBeInTheDocument()
  })

  it('hides "View Consultation" for a non-completed (e.g. confirmed) appointment', async () => {
    useAuth.mockReturnValue({ hasRole: (r) => r === 'clinician' })
    renderPage(baseMocks(appointment({ status: 'confirmed' })))
    await waitFor(() => expect(screen.getByText('Priya Patient')).toBeInTheDocument())
    expect(screen.queryByRole('button', { name: 'View Consultation' })).not.toBeInTheDocument()
    // The non-terminal Actions card's own "Start Consultation" takes its place instead.
    expect(screen.getByRole('button', { name: 'Start Consultation' })).toBeInTheDocument()
  })
})
