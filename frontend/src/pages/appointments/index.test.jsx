import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { MockedProvider } from '@apollo/client/testing'
import { HelmetProvider } from 'react-helmet-async'
import { SnackbarProvider } from 'notistack'
import { gql } from '@apollo/client'
import AppointmentsListPage from './index'
import { APPOINTMENT_FIELDS, CLINICIANS_QUERY } from '../../graphql/queries'
import { useAuth } from '../../hooks/useAuth'

jest.mock('../../hooks/useAuth', () => ({
  useAuth: jest.fn(),
}))

// MUI DataGrid measures its container via ResizeObserver, which jsdom
// doesn't implement -- same class of gap EncounterWorkspace.test.jsx's own
// recharts stub documents; without it the grid never renders any row.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.ResizeObserver = ResizeObserverStub

// P1-17 — re-declared to match index.jsx's own page-local
// APPOINTMENTS_WITH_RISK_QUERY exactly (query AST equality).
const APPOINTMENTS_WITH_RISK_QUERY = gql`
  query AppointmentsWithRisk($filters: AppointmentFilters, $first: Int = 20, $page: Int) {
    appointments(filters: $filters, first: $first, page: $page) {
      data {
        ...AppointmentFields
        no_show_risk {
          score
          level
          reasons
        }
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

function apptRow(overrides = {}) {
  return {
    __typename: 'Appointment',
    id: 'appt-1',
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
    patient: { __typename: 'Patient', id: 'p1', first_name: 'Real', last_name: 'Patient', full_name: 'Real Patient', email: 'real@example.com', phone: null, date_of_birth: null, gender: null },
    clinician: { __typename: 'AppointmentClinician', id: 'c1', first_name: 'Real', last_name: 'Clinician', full_name: 'Real Clinician', avatar_url: null, clinician_type: null },
    clinic: { __typename: 'AppointmentClinic', id: 'clinic-1', name: 'Real Clinic', address: null, city: null, timezone: null },
    room: null,
    service: { __typename: 'AppointmentService', id: 'svc-1', name: 'GP Consult', duration_minutes: 30, price: 50000 },
    booked_by_user: null,
    status_logs: [],
    no_show_risk: { __typename: 'NoShowRisk', score: 10, level: 'low', reasons: [] },
    ...overrides,
  }
}

function baseMocks(rows = [apptRow()]) {
  return [
    {
      // The page defaults to the 'upcoming' tab, which builds a real
      // {date_from: <today>} filter -- computed from dayjs() at render
      // time, not a fixed value this mock can predict. A variableMatcher
      // avoids reverse-engineering that exact shape, same technique used
      // in video/index.test.jsx for the identical "now"-dependent problem.
      request: { query: APPOINTMENTS_WITH_RISK_QUERY },
      variableMatcher: () => true,
      result: {
        data: {
          appointments: {
            __typename: 'AppointmentPaginated',
            data: rows,
            paginatorInfo: { __typename: 'AppointmentPaginatorInfo', count: rows.length, currentPage: 1, firstItem: 1, hasMorePages: false, lastItem: rows.length, lastPage: 1, perPage: 20, total: rows.length },
          },
        },
      },
    },
    {
      request: { query: CLINICIANS_QUERY, variables: { first: 100, is_active: true } },
      result: { data: { clinicians: { __typename: 'ClinicianPaginated', data: [] } } },
    },
  ]
}

function renderPage(mocks) {
  useAuth.mockReturnValue({ hasRole: () => true })
  return render(
    <HelmetProvider>
      <MemoryRouter>
        <SnackbarProvider>
          <MockedProvider mocks={mocks}>
            <AppointmentsListPage />
          </MockedProvider>
        </SnackbarProvider>
      </MemoryRouter>
    </HelmetProvider>,
  )
}

describe('AppointmentsListPage — no-show risk indicator (P1-17)', () => {
  it('shows a high-risk chip with an icon, not colour alone (A11Y-3)', async () => {
    renderPage(baseMocks([apptRow({ no_show_risk: { __typename: 'NoShowRisk', score: 85, level: 'high', reasons: ['5 prior no-shows'] } })]))
    await waitFor(() => expect(screen.getByText('High risk')).toBeInTheDocument())
    expect(screen.getByTestId('ErrorRoundedIcon')).toBeInTheDocument()
  })

  it('shows a low-risk chip with its own distinct icon for a clean-history booking', async () => {
    renderPage(baseMocks([apptRow({ no_show_risk: { __typename: 'NoShowRisk', score: 5, level: 'low', reasons: [] } })]))
    await waitFor(() => expect(screen.getByText('Low risk')).toBeInTheDocument())
    expect(screen.getByTestId('CheckCircleOutlineRoundedIcon')).toBeInTheDocument()
  })

  it('surfaces the real risk reasons in a tooltip, not a generic label', async () => {
    renderPage(baseMocks([apptRow({ no_show_risk: { __typename: 'NoShowRisk', score: 85, level: 'high', reasons: ['3 prior no-shows', 'Booked far in advance'] } })]))
    await waitFor(() => expect(screen.getByText('High risk')).toBeInTheDocument())
    await userEvent.hover(screen.getByText('High risk'))
    expect(await screen.findByText('3 prior no-shows, Booked far in advance')).toBeInTheDocument()
  }, 20000)
})
