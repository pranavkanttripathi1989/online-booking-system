import { render, screen, waitFor } from '@testing-library/react'
import { MockedProvider } from '@apollo/client/testing'
import { gql } from '@apollo/client'
import ManagerReportsPage from './index'

// P2-04 — smoke coverage for the claim-analytics section this slice adds
// to an otherwise previously-untested page. Re-declares the page-local
// gql documents to match its own AST exactly, same convention as
// manager/claims/index.test.jsx. The page reads dates via its own
// daysAgoIso(30)/todayIso() helpers (dynamic, not fixed strings) --
// mirrored here so the mocked variables match exactly regardless of
// which real day the suite runs on.

const CLINICS_QUERY = gql`
  query Clinics {
    clinics {
      id
      name
      address
      city
      postcode
      phone
      email
      timezone
      is_active
      is_primary
    }
  }
`
const GET_PATIENT_REPORT_GROUP = gql`
  query GetPatientReportGroup($clinicId: ID, $startDate: String!, $endDate: String!, $lapsedLookbackDays: Int) {
    getPatientReportGroup(clinicId: $clinicId, startDate: $startDate, endDate: $endDate, lapsedLookbackDays: $lapsedLookbackDays) {
      newPatients
      repeatPatients
      acquisitionSourceBreakdown {
        source
        count
      }
      lapsedPatients {
        id
        full_name
        last_visit
      }
    }
  }
`
const GET_CLAIM_ANALYTICS = gql`
  query GetClaimAnalytics($clinicId: ID, $startDate: String!, $endDate: String!) {
    getClaimAnalytics(clinicId: $clinicId, startDate: $startDate, endDate: $endDate) {
      totalClaims
      approvedCount
      rejectedCount
      settledCount
      pendingCount
      approvalRate
      totalClaimAmount
      totalApprovedAmount
      recoveryRate
      denialCategoryBreakdown {
        category
        categoryLabel
        count
      }
      payerScorecards {
        payerId
        payerName
        totalClaims
        approvedCount
        rejectedCount
        pendingCount
        approvalRate
        avgDecisionDays
        totalClaimAmount
        totalApprovedAmount
        recoveryRate
      }
    }
  }
`
const GET_SCHEDULED_REPORTS = gql`
  query GetScheduledReports {
    scheduledReports {
      id
      report_type
      cadence
      channel
      is_active
      last_sent_at
      clinic_id
    }
  }
`

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}
function daysAgoIso(n) {
  return new Date(Date.now() - n * 86400000).toISOString().slice(0, 10)
}

const START_DATE = daysAgoIso(30)
const END_DATE = todayIso()

const emptyPatientGroupMock = {
  request: {
    query: GET_PATIENT_REPORT_GROUP,
    variables: { clinicId: undefined, startDate: START_DATE, endDate: END_DATE, lapsedLookbackDays: 90 },
  },
  result: { data: { getPatientReportGroup: { newPatients: 0, repeatPatients: 0, acquisitionSourceBreakdown: [], lapsedPatients: [] } } },
}
const emptyClinicsMock = { request: { query: CLINICS_QUERY }, result: { data: { clinics: [] } } }
const emptySchedulesMock = { request: { query: GET_SCHEDULED_REPORTS }, result: { data: { scheduledReports: [] } } }

function claimAnalyticsMock(overrides = {}) {
  return {
    request: { query: GET_CLAIM_ANALYTICS, variables: { clinicId: undefined, startDate: START_DATE, endDate: END_DATE } },
    result: {
      data: {
        getClaimAnalytics: {
          __typename: 'ClaimAnalytics',
          totalClaims: 0,
          approvedCount: 0,
          rejectedCount: 0,
          settledCount: 0,
          pendingCount: 0,
          approvalRate: 0,
          totalClaimAmount: 0,
          totalApprovedAmount: 0,
          recoveryRate: 0,
          denialCategoryBreakdown: [],
          payerScorecards: [],
          ...overrides,
        },
      },
    },
  }
}

function renderPage(mocks) {
  return render(
    <MockedProvider mocks={mocks} addTypename={false}>
      <ManagerReportsPage />
    </MockedProvider>,
  )
}

describe('manager/reports — claim analytics (P2-04)', () => {
  it('renders real claim analytics summary figures, not fabricated data', async () => {
    renderPage([
      emptyClinicsMock,
      emptyPatientGroupMock,
      claimAnalyticsMock({ totalClaims: 12, approvalRate: 66.7, recoveryRate: 80, totalApprovedAmount: 45000 }),
      emptySchedulesMock,
    ])

    await waitFor(() => expect(screen.getByText('Claim Analytics')).toBeInTheDocument())
    expect(screen.getByText('12')).toBeInTheDocument()
    expect(screen.getByText('66.7%')).toBeInTheDocument()
    expect(screen.getByText('80.0%')).toBeInTheDocument()
    expect(screen.getByText('₹45,000')).toBeInTheDocument()
  })

  it('shows an honest empty state when there are no claims in range', async () => {
    renderPage([emptyClinicsMock, emptyPatientGroupMock, claimAnalyticsMock(), emptySchedulesMock])

    await waitFor(() => expect(screen.getByText('Claim Analytics')).toBeInTheDocument())
    expect(screen.getByText('No claims submitted in this range')).toBeInTheDocument()
    expect(screen.getByText('No rejected claims with a drafted appeal in range')).toBeInTheDocument()
  })

  it('renders the real denial category breakdown as chips', async () => {
    renderPage([
      emptyClinicsMock,
      emptyPatientGroupMock,
      claimAnalyticsMock({
        denialCategoryBreakdown: [
          { category: 'missing_documentation', categoryLabel: 'Missing documentation', count: 3 },
          { category: 'coding_mismatch', categoryLabel: 'Coding mismatch', count: 1 },
        ],
      }),
      emptySchedulesMock,
    ])

    await waitFor(() => expect(screen.getByText('Missing documentation: 3')).toBeInTheDocument())
    expect(screen.getByText('Coding mismatch: 1')).toBeInTheDocument()
  })

  it('renders one real payer scorecard row per payer', async () => {
    renderPage([
      emptyClinicsMock,
      emptyPatientGroupMock,
      claimAnalyticsMock({
        payerScorecards: [
          {
            __typename: 'PayerScorecard',
            payerId: 'payer-1',
            payerName: 'Star Health',
            totalClaims: 5,
            approvedCount: 3,
            rejectedCount: 1,
            pendingCount: 1,
            approvalRate: 75,
            avgDecisionDays: 2.5,
            totalClaimAmount: 25000,
            totalApprovedAmount: 20000,
            recoveryRate: 80,
          },
        ],
      }),
      emptySchedulesMock,
    ])

    await waitFor(() => expect(screen.getByText('Star Health')).toBeInTheDocument())
    expect(screen.getByText('2.5')).toBeInTheDocument()
  })

  it('shows an em dash, not a fabricated zero, when a payer has no decided claims yet', async () => {
    renderPage([
      emptyClinicsMock,
      emptyPatientGroupMock,
      claimAnalyticsMock({
        payerScorecards: [
          {
            __typename: 'PayerScorecard',
            payerId: 'payer-1',
            payerName: 'Star Health',
            totalClaims: 1,
            approvedCount: 0,
            rejectedCount: 0,
            pendingCount: 1,
            approvalRate: 0,
            avgDecisionDays: null,
            totalClaimAmount: 5000,
            totalApprovedAmount: 0,
            recoveryRate: 0,
          },
        ],
      }),
      emptySchedulesMock,
    ])

    await waitFor(() => expect(screen.getByText('Star Health')).toBeInTheDocument())
    expect(screen.getByText('—')).toBeInTheDocument()
  })
})
