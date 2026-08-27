import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MockedProvider } from '@apollo/client/testing'
import { SnackbarProvider } from 'notistack'
import { gql } from '@apollo/client'
import RevenueSharePage from './index'

// REQ158 (P2-06) — re-declares the page's own gql documents to match
// their AST exactly, same convention as manager/imports/index.test.jsx
// and manager/reports/index.test.jsx.

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

const CLINICIAN_FIELDS = gql`
  fragment ClinicianFields on Clinician {
    id
    first_name
    last_name
    full_name
    bio
    avatar_url
    consultation_fee
    is_active
    gender
    languages
    clinician_type {
      id
      name
      description
    }
  }
`
const CLINICIANS_QUERY = gql`
  query Clinicians($clinic_id: ID, $is_active: Boolean, $first: Int = 20, $page: Int) {
    clinicians(clinic_id: $clinic_id, is_active: $is_active, first: $first, page: $page) {
      data {
        ...ClinicianFields
      }
      paginatorInfo {
        count
        currentPage
        hasMorePages
        lastPage
        perPage
        total
      }
    }
  }
  ${CLINICIAN_FIELDS}
`

const GET_REVENUE_SHARE_RULES = gql`
  query GetRevenueShareRules($clinicId: ID) {
    revenueShareRules(clinicId: $clinicId) {
      id
      scope
      clinic_id
      clinician_id
      share_percentage
      clinic_name
      clinician_name
    }
  }
`

const SET_REVENUE_SHARE_RULE = gql`
  mutation SetRevenueShareRule($input: RevenueShareRuleInput!) {
    setRevenueShareRule(input: $input) {
      success
      userErrors
      rule {
        id
      }
    }
  }
`

const GET_PAYOUTS = gql`
  query GetPayouts($clinicId: ID, $year: Int, $month: Int) {
    payouts(clinicId: $clinicId, year: $year, month: $month) {
      id
      clinician_id
      clinician_name
      period_start
      period_end
      gross_amount
      share_percentage_used
      payout_amount
      appointment_count
      status
      approved_at
    }
  }
`

const COMPUTE_MONTHLY_PAYOUTS = gql`
  mutation ComputeMonthlyPayouts($input: ComputeMonthlyPayoutsInput!) {
    computeMonthlyPayouts(input: $input) {
      success
      userErrors
      skippedClinicianNames
      payouts {
        id
      }
    }
  }
`

const APPROVE_PAYOUT = gql`
  mutation ApprovePayout($id: ID!) {
    approvePayout(id: $id) {
      id
      status
    }
  }
`

const clinicA = {
  __typename: 'Clinic', id: 'clinic-a', name: 'MG Road Clinic', address: '1 MG Road', city: 'Bengaluru',
  postcode: '560001', phone: '9000000000', email: 'a@x.com', timezone: 'Asia/Kolkata', is_active: true, is_primary: true,
}

const clinicianA1 = {
  __typename: 'Clinician', id: 'clin-a1', first_name: 'Asha', last_name: 'Rao', full_name: 'Asha Rao',
  bio: '', avatar_url: null, consultation_fee: 50000, is_active: true, gender: 'female', languages: [], clinician_type: null,
}

const now = new Date()
const YEAR = now.getFullYear()
const MONTH = now.getMonth() + 1

const clinicsMock = { request: { query: CLINICS_QUERY }, result: { data: { clinics: [clinicA] } } }
const cliniciansMock = {
  request: { query: CLINICIANS_QUERY, variables: { clinic_id: 'clinic-a', is_active: true, first: 100 } },
  result: { data: { clinicians: { __typename: 'ClinicianPaginator', data: [clinicianA1], paginatorInfo: { __typename: 'PaginatorInfo', count: 1, currentPage: 1, hasMorePages: false, lastPage: 1, perPage: 100, total: 1 } } } },
}
const emptyRulesMock = { request: { query: GET_REVENUE_SHARE_RULES, variables: { clinicId: 'clinic-a' } }, result: { data: { revenueShareRules: [] } } }
const emptyPayoutsMock = { request: { query: GET_PAYOUTS, variables: { clinicId: 'clinic-a', year: YEAR, month: MONTH } }, result: { data: { payouts: [] } } }

function renderPage(mocks) {
  return render(
    <SnackbarProvider>
      <MockedProvider mocks={mocks} addTypename={false}>
        <RevenueSharePage />
      </MockedProvider>
    </SnackbarProvider>,
  )
}

describe('manager/revenue-share — doctor revenue-share & payouts (P2-06)', () => {
  it('loads the selected clinic, its share rules, and this month\'s payouts', async () => {
    const rulesMock = {
      request: { query: GET_REVENUE_SHARE_RULES, variables: { clinicId: 'clinic-a' } },
      result: { data: { revenueShareRules: [{ __typename: 'RevenueShareRuleType', id: 'r1', scope: 'org', clinic_id: null, clinician_id: null, share_percentage: 60, clinic_name: null, clinician_name: null }] } },
    }
    renderPage([clinicsMock, cliniciansMock, rulesMock, emptyPayoutsMock])

    await waitFor(() => expect(screen.getByText('Org')).toBeInTheDocument())
    expect(screen.getByText('60%')).toBeInTheDocument()
    expect(screen.getByText(/No payouts computed for this month yet/)).toBeInTheDocument()
  })

  it('saves an org-level share rule and refreshes the rules table', async () => {
    const setRuleMock = {
      request: { query: SET_REVENUE_SHARE_RULE, variables: { input: { scope: 'org', clinic_id: undefined, clinician_id: undefined, share_percentage: 55 } } },
      result: { data: { setRevenueShareRule: { __typename: 'RevenueShareMutationResultType', success: true, userErrors: [], rule: { __typename: 'RevenueShareRuleType', id: 'r1' } } } },
    }
    const refreshedRulesMock = {
      request: { query: GET_REVENUE_SHARE_RULES, variables: { clinicId: 'clinic-a' } },
      result: { data: { revenueShareRules: [{ __typename: 'RevenueShareRuleType', id: 'r1', scope: 'org', clinic_id: null, clinician_id: null, share_percentage: 55, clinic_name: null, clinician_name: null }] } },
    }
    renderPage([clinicsMock, cliniciansMock, emptyRulesMock, emptyPayoutsMock, setRuleMock, refreshedRulesMock])

    await waitFor(() => expect(screen.getByText(/No share rules configured yet/)).toBeInTheDocument())

    await userEvent.type(screen.getByLabelText("Doctor's share %"), '55')
    await userEvent.click(screen.getByRole('button', { name: 'Save rule' }))

    await waitFor(() => expect(screen.getByText('55%')).toBeInTheDocument())
  })

  it('runs the monthly payout computation and shows the result', async () => {
    const computeMock = {
      request: { query: COMPUTE_MONTHLY_PAYOUTS, variables: { input: { clinic_id: 'clinic-a', year: YEAR, month: MONTH } } },
      result: { data: { computeMonthlyPayouts: { __typename: 'ComputePayoutsResultType', success: true, userErrors: [], skippedClinicianNames: [], payouts: [{ __typename: 'PayoutType', id: 'po1' }] } } },
    }
    const refreshedPayoutsMock = {
      request: { query: GET_PAYOUTS, variables: { clinicId: 'clinic-a', year: YEAR, month: MONTH } },
      result: {
        data: {
          payouts: [{
            __typename: 'PayoutType', id: 'po1', clinician_id: 'clin-a1', clinician_name: 'Asha Rao',
            period_start: '2026-08-01T00:00:00.000Z', period_end: '2026-09-01T00:00:00.000Z',
            gross_amount: 5000, share_percentage_used: 60, payout_amount: 3000, appointment_count: 2,
            status: 'pending_approval', approved_at: null,
          }],
        },
      },
    }
    renderPage([clinicsMock, cliniciansMock, emptyRulesMock, emptyPayoutsMock, computeMock, refreshedPayoutsMock])

    await waitFor(() => expect(screen.getByText(/No payouts computed for this month yet/)).toBeInTheDocument())
    await userEvent.click(screen.getByRole('button', { name: /Run Payouts/ }))

    await waitFor(() => expect(screen.getByText('Asha Rao')).toBeInTheDocument())
    expect(screen.getByText('Pending approval')).toBeInTheDocument()
  })

  it('approves a pending payout', async () => {
    const pendingPayoutsMock = {
      request: { query: GET_PAYOUTS, variables: { clinicId: 'clinic-a', year: YEAR, month: MONTH } },
      result: {
        data: {
          payouts: [{
            __typename: 'PayoutType', id: 'po1', clinician_id: 'clin-a1', clinician_name: 'Asha Rao',
            period_start: '2026-08-01T00:00:00.000Z', period_end: '2026-09-01T00:00:00.000Z',
            gross_amount: 5000, share_percentage_used: 60, payout_amount: 3000, appointment_count: 2,
            status: 'pending_approval', approved_at: null,
          }],
        },
      },
    }
    const approveMock = {
      request: { query: APPROVE_PAYOUT, variables: { id: 'po1' } },
      result: { data: { approvePayout: { __typename: 'PayoutType', id: 'po1', status: 'approved' } } },
    }
    const approvedPayoutsMock = {
      request: { query: GET_PAYOUTS, variables: { clinicId: 'clinic-a', year: YEAR, month: MONTH } },
      result: {
        data: {
          payouts: [{
            __typename: 'PayoutType', id: 'po1', clinician_id: 'clin-a1', clinician_name: 'Asha Rao',
            period_start: '2026-08-01T00:00:00.000Z', period_end: '2026-09-01T00:00:00.000Z',
            gross_amount: 5000, share_percentage_used: 60, payout_amount: 3000, appointment_count: 2,
            status: 'approved', approved_at: '2026-08-28T00:00:00.000Z',
          }],
        },
      },
    }
    renderPage([clinicsMock, cliniciansMock, emptyRulesMock, pendingPayoutsMock, approveMock, approvedPayoutsMock])

    await waitFor(() => expect(screen.getByRole('button', { name: 'Approve' })).toBeInTheDocument())
    await userEvent.click(screen.getByRole('button', { name: 'Approve' }))

    await waitFor(() => expect(screen.getByText('Approved')).toBeInTheDocument())
  })
})
