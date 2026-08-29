import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { MockedProvider } from '@apollo/client/testing'
import { ThemeProvider } from '@mui/material/styles'
import { gql } from '@apollo/client'
import Dashboard from './Dashboard'
import { useAuth } from '../../hooks/useAuth'
import { createAppTheme } from '../../theme'

jest.mock('../../hooks/useAuth', () => ({
  useAuth: jest.fn(),
}))

// BUG021 regression coverage: re-declared to match Dashboard.jsx's own gql
// documents exactly (query AST equality, not import identity — MockedProvider
// matches this way, same convention as pages/booking/index.test.jsx).
const GET_MY_CLINICIAN_PROFILE = gql`
  query GetMyClinicianProfileForDashboard {
    me {
      clinician {
        id
        full_name
        clinician_type {
          name
        }
      }
    }
  }
`
const GET_MY_CLINICIAN_CLINIC = gql`
  query GetMyClinicianClinicForDashboard($id: ID!) {
    clinician(id: $id) {
      id
      clinics {
        id
        name
      }
    }
  }
`
const GET_TODAY_APPOINTMENTS = gql`
  query GetTodayAppointmentsForDashboard($dateFrom: String!, $dateTo: String!) {
    appointments(filters: { date_from: $dateFrom, date_to: $dateTo }, first: 200) {
      data {
        id
        start_datetime
        end_datetime
        duration_minutes
        status
        type
        patient {
          id
          full_name
        }
        service {
          name
        }
      }
    }
  }
`
const GET_SPACER_BLOCKS = gql`
  query GetMySpacerBlocksForDashboard($clinicianId: ID!, $date: String!) {
    getSpacerBlocks(clinicianId: $clinicianId, date: $date) {
      id
      startTime
      endTime
      duration
      reason
    }
  }
`
const GET_LUNCH_BREAKS = gql`
  query GetMyLunchBreaksForDashboard($clinicianId: ID!) {
    getLunchBreaks(clinicianId: $clinicianId) {
      id
      startTime
      endTime
      duration
    }
  }
`

const CLINICIAN_ID = 'cln-1'
const TODAY = require('dayjs')().format('YYYY-MM-DD')

const profileMock = (clinician) => ({
  request: { query: GET_MY_CLINICIAN_PROFILE },
  result: { data: { me: { clinician } } },
})
const clinicMock = () => ({
  request: { query: GET_MY_CLINICIAN_CLINIC, variables: { id: CLINICIAN_ID } },
  result: { data: { clinician: { id: CLINICIAN_ID, clinics: [{ id: 'clinic-1', name: 'MG Road Clinic' }] } } },
})
const appointmentsMock = (data) => ({
  request: { query: GET_TODAY_APPOINTMENTS, variables: { dateFrom: TODAY, dateTo: TODAY } },
  result: { data: { appointments: { data } } },
})
const spacersMock = () => ({
  request: { query: GET_SPACER_BLOCKS, variables: { clinicianId: CLINICIAN_ID, date: TODAY } },
  result: { data: { getSpacerBlocks: [] } },
})
const lunchMock = () => ({
  request: { query: GET_LUNCH_BREAKS, variables: { clinicianId: CLINICIAN_ID } },
  result: { data: { getLunchBreaks: [] } },
})

function renderDashboard(mocks, theme) {
  const body = (
    <MemoryRouter>
      <MockedProvider mocks={mocks} addTypename={false}>
        <Dashboard />
      </MockedProvider>
    </MemoryRouter>
  )
  return render(theme ? <ThemeProvider theme={theme}>{body}</ThemeProvider> : body)
}

function cssRulesText() {
  return Array.from(document.styleSheets)
    .flatMap((sheet) => {
      try {
        return Array.from(sheet.cssRules).map((r) => r.cssText)
      } catch {
        return []
      }
    })
    .join('\n')
}

describe('clinician/Dashboard (BUG021)', () => {
  beforeEach(() => {
    useAuth.mockReturnValue({ user: { id: 'u-1', name: 'Sarah' } })
  })

  it('renders real appointment data, never the literal fabricated mock names', async () => {
    const linkedClinician = { id: CLINICIAN_ID, full_name: 'Sarah Mitchell', clinician_type: { name: 'General Physician' } }
    const realAppt = {
      id: 'appt-real-1',
      start_datetime: `${TODAY}T09:00:00.000Z`,
      end_datetime: `${TODAY}T09:30:00.000Z`,
      duration_minutes: 30,
      status: 'scheduled',
      type: 'in_person',
      patient: { id: 'pat-1', full_name: 'Rohan Verma' },
      service: { name: 'General Consultation' },
    }
    renderDashboard([profileMock(linkedClinician), clinicMock(), appointmentsMock([realAppt]), spacersMock(), lunchMock()])

    await waitFor(() => expect(screen.getAllByText('Rohan Verma').length).toBeGreaterThan(0))
    expect(screen.queryByText('Emma Wilson')).not.toBeInTheDocument()
    expect(screen.queryByText(/Offline.*demo data/)).not.toBeInTheDocument()
  })

  it('shows a real "not linked" state when the account has no clinician profile, not fabricated data', async () => {
    renderDashboard([
      profileMock(null),
      appointmentsMock([]),
      // getSpacerBlocks/getLunchBreaks are skipped (no clinicianId) — no mocks needed
    ])

    await waitFor(() => expect(screen.getByText(/isn't linked to a clinician profile/i)).toBeInTheDocument())
    expect(screen.queryByText('Emma Wilson')).not.toBeInTheDocument()
  })

  it('shows a real error state (with retry) on a genuine query failure, not fabricated data', async () => {
    const { GraphQLError } = require('graphql')
    renderDashboard([
      { request: { query: GET_MY_CLINICIAN_PROFILE }, result: { errors: [new GraphQLError('boom')] } },
      appointmentsMock([]),
    ])

    await waitFor(() => expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument())
    expect(screen.queryByText('Emma Wilson')).not.toBeInTheDocument()
  })

  it('renders a genuine empty day as "No more appointments today", not mock appointments', async () => {
    const linkedClinician = { id: CLINICIAN_ID, full_name: 'Sarah Mitchell', clinician_type: { name: 'General Physician' } }
    renderDashboard([profileMock(linkedClinician), clinicMock(), appointmentsMock([]), spacersMock(), lunchMock()])

    await waitFor(() => expect(screen.getByText('No more appointments today.')).toBeInTheDocument())
    expect(screen.queryByText('Emma Wilson')).not.toBeInTheDocument()
  })

  it('counts a "confirmed" appointment as upcoming, not just "scheduled"', async () => {
    const linkedClinician = { id: CLINICIAN_ID, full_name: 'Sarah Mitchell', clinician_type: { name: 'General Physician' } }
    const confirmedAppt = {
      id: 'appt-confirmed-1',
      start_datetime: require('dayjs')().add(1, 'hour').toISOString(),
      end_datetime: require('dayjs')().add(1.5, 'hour').toISOString(),
      duration_minutes: 30,
      status: 'confirmed',
      type: 'in_person',
      patient: { id: 'pat-2', full_name: 'Priya Nair' },
      service: { name: 'Follow-up' },
    }
    renderDashboard([profileMock(linkedClinician), clinicMock(), appointmentsMock([confirmedAppt]), spacersMock(), lunchMock()])

    await waitFor(() => expect(screen.getAllByText('Priya Nair').length).toBeGreaterThan(0))
  })
})

describe('clinician/Dashboard — greeting banner tracks the org accent (BUG053)', () => {
  it('renders from theme.palette.primary, not a fixed teal literal', async () => {
    const linkedClinician = { id: CLINICIAN_ID, full_name: 'Sarah Mitchell', clinician_type: { name: 'General Physician' } }
    const accentTheme = createAppTheme('light', { accentColor: '#080075' })
    renderDashboard([profileMock(linkedClinician), clinicMock(), appointmentsMock([]), spacersMock(), lunchMock()], accentTheme)

    await waitFor(() => expect(screen.getByText('No more appointments today.')).toBeInTheDocument())
    const css = cssRulesText().toLowerCase()
    expect(css).toContain('#080075')
    expect(css).not.toContain('#006d77')
  })
})
