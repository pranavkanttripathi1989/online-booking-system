import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import { MockedProvider } from '@apollo/client/testing'
import { ThemeProvider } from '@mui/material/styles'
import { gql } from '@apollo/client'
import ClinicianCalendar from './Calendar'
import { useAuth } from '../../hooks/useAuth'
import { createAppTheme } from '../../theme'

// REQ164: covers the two new Drawer-footer actions added to the appointment
// detail panel ("Start Consultation", "Open Appointment Detail") alongside
// the pre-existing "View Patient" button.

jest.mock('../../hooks/useAuth', () => ({
  useAuth: jest.fn(),
}))

// Re-declared to match Calendar.jsx's own gql documents exactly (query AST
// equality is how MockedProvider matches, not import identity — same
// convention as pages/clinician/Dashboard.test.jsx).
const GET_WEEK_APPOINTMENTS = gql`
  query GetWeekAppointments($dateFrom: String!, $dateTo: String!) {
    appointments(filters: { date_from: $dateFrom, date_to: $dateTo }, first: 200) {
      data {
        id
        start_datetime
        end_datetime
        status
        duration_minutes
        patient {
          id
          full_name
        }
        service {
          name
        }
        room {
          name
        }
      }
    }
  }
`
const GET_LUNCH_BREAKS = gql`
  query GetLunchBreaksForCalendar($clinicianId: ID!) {
    getLunchBreaks(clinicianId: $clinicianId) {
      id
      dayOfWeek
      startTime
      endTime
    }
  }
`

const CLINICIAN_ID = 'cln-1'
const APPOINTMENT_ID = 'appt-real-9'

// Anchored to "now" (not a fixed clock hour) so the appointment always falls
// within the calendar's own current week regardless of when the suite runs —
// the exact class of timezone/date-boundary trap already documented in this
// codebase's own fixture conventions.
function todayAt(hour) {
  const d = new Date()
  d.setHours(hour, 0, 0, 0)
  return d.toISOString()
}

function appointmentsMock(status) {
  return {
    request: { query: GET_WEEK_APPOINTMENTS },
    variableMatcher: () => true,
    result: {
      data: {
        appointments: {
          data: [
            {
              id: APPOINTMENT_ID,
              start_datetime: todayAt(10),
              end_datetime: todayAt(11),
              status,
              duration_minutes: 60,
              patient: { id: 'pat-9', full_name: 'Rohan Verma' },
              service: { name: 'General Consultation' },
              room: null,
            },
          ],
        },
      },
    },
  }
}
const lunchMock = {
  request: { query: GET_LUNCH_BREAKS },
  variableMatcher: () => true,
  result: { data: { getLunchBreaks: [] } },
}

// Marker routes so the test can assert both the destination URL and that a
// real navigation actually happened, without mounting the much heavier real
// destination pages — same pattern as EncounterWorkspace.test.jsx's own
// PrescriptionBuilderMarker.
function EncounterMarker() {
  const location = useLocation()
  return <div data-testid="encounter-marker">{location.pathname}</div>
}
function AppointmentDetailMarker() {
  const location = useLocation()
  return <div data-testid="appointment-detail-marker">{location.pathname}</div>
}

function renderCalendar(mocks) {
  const theme = createAppTheme('light')
  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter initialEntries={['/clinician/calendar']}>
        <MockedProvider mocks={mocks} addTypename={false}>
          <Routes>
            <Route path="/clinician/calendar" element={<ClinicianCalendar />} />
            <Route path="/clinician/encounters/:appointmentId" element={<EncounterMarker />} />
            <Route path="/appointments/:id" element={<AppointmentDetailMarker />} />
          </Routes>
        </MockedProvider>
      </MemoryRouter>
    </ThemeProvider>,
  )
}

async function openDrawer() {
  await waitFor(() => expect(screen.getByText('Rohan Verma')).toBeInTheDocument())
  await userEvent.click(screen.getByText('Rohan Verma'))
  await waitFor(() => expect(screen.getByRole('button', { name: /Open Appointment Detail/ })).toBeInTheDocument())
}

describe('clinician/Calendar — appointment Drawer actions (REQ164)', () => {
  it('shows and navigates via "Start Consultation" for a clinician on a non-terminal appointment', async () => {
    useAuth.mockReturnValue({ user: { id: 'u-1', clinician: { id: CLINICIAN_ID } }, hasRole: (r) => r === 'clinician' })
    renderCalendar([appointmentsMock('confirmed'), lunchMock])
    await openDrawer()

    const startBtn = screen.getByRole('button', { name: /Start Consultation/ })
    await userEvent.click(startBtn)

    await waitFor(() => expect(screen.getByTestId('encounter-marker')).toHaveTextContent(`/clinician/encounters/${APPOINTMENT_ID}`))
  })

  it('shows and navigates via "Open Appointment Detail" regardless of role', async () => {
    useAuth.mockReturnValue({ user: { id: 'u-1', clinician: { id: CLINICIAN_ID } }, hasRole: () => false })
    renderCalendar([appointmentsMock('confirmed'), lunchMock])
    await openDrawer()

    await userEvent.click(screen.getByRole('button', { name: /Open Appointment Detail/ }))

    await waitFor(() => expect(screen.getByTestId('appointment-detail-marker')).toHaveTextContent(`/appointments/${APPOINTMENT_ID}`))
  })

  it('hides "Start Consultation" for a non-clinician role', async () => {
    useAuth.mockReturnValue({ user: { id: 'u-1', clinician: { id: CLINICIAN_ID } }, hasRole: () => false })
    renderCalendar([appointmentsMock('confirmed'), lunchMock])
    await openDrawer()

    expect(screen.queryByRole('button', { name: /Start Consultation/ })).not.toBeInTheDocument()
  })

  it('hides "Start Consultation" for a terminal (completed) appointment even for a clinician', async () => {
    useAuth.mockReturnValue({ user: { id: 'u-1', clinician: { id: CLINICIAN_ID } }, hasRole: (r) => r === 'clinician' })
    renderCalendar([appointmentsMock('completed'), lunchMock])
    await openDrawer()

    expect(screen.queryByRole('button', { name: /Start Consultation/ })).not.toBeInTheDocument()
    // "Open Appointment Detail" and "View Patient" remain available even on a terminal appointment.
    expect(screen.getByRole('button', { name: /Open Appointment Detail/ })).toBeInTheDocument()
  })
})
