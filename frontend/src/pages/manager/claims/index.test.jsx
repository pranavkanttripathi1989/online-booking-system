import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MockedProvider } from '@apollo/client/testing'
import { SnackbarProvider } from 'notistack'
import { gql } from '@apollo/client'
import ClaimsDesk from './index'
import { downloadAuthenticatedPdf } from '../../../utils/documents'

// REQ138 — downloadAuthenticatedPdf does a real fetch(), not a GraphQL
// operation MockedProvider can intercept; mocked at the module boundary,
// the first precedent for testing this download helper's call site in
// this codebase (no page currently asserts on it further than this).
jest.mock('../../../utils/documents', () => ({
  downloadAuthenticatedPdf: jest.fn().mockResolvedValue(undefined),
}))

// REQ131 (REQ031's own explicit P2 follow-on) — smoke coverage for the
// claim list, real submitClaim end-to-end, and the updateClaimStatus state
// machine's approve path. Re-declares the page-local gql documents to match
// its own AST exactly, same convention as manager/pharmacy/index.test.jsx.
//
// GET_CLAIMS uses fetchPolicy: 'network-only', which writes through and
// reads back from the cache even on a first fetch -- addTypename (default
// true) + explicit __typename on every mock object avoids Apollo silently
// dropping nested fields on readback, the same fix manager/pharmacy's own
// test file already established for the identical root cause.

const GET_CLAIMS = gql`
  query GetClaims($status: String) {
    claims(status: $status) {
      id
      patient_id
      patient_name
      appointment_id
      appointment_date
      payer {
        id
        name
      }
      claim_amount
      approved_amount
      status
      rejection_reason
      submitted_at
      decided_at
      settled_at
      notes
    }
  }
`
const SEARCH_APPOINTMENTS = gql`
  query SearchAppointmentsForClaim($patient_name: String!) {
    appointments(filters: { patient_name: $patient_name }, first: 10, page: 1) {
      data {
        id
        start_datetime
        patient {
          id
          full_name
        }
        clinic {
          id
          name
        }
      }
    }
  }
`
const GET_PAYERS_FOR_CLAIM = gql`
  query GetPayersForClaim {
    payers(is_active: true) {
      id
      name
      payer_type
    }
  }
`
const GET_PATIENT_POLICIES_FOR_CLAIM = gql`
  query GetPatientPoliciesForClaim($patient_id: ID!) {
    patientInsurancePolicies(patient_id: $patient_id) {
      id
      policy_number
      payer {
        id
        name
      }
    }
  }
`
const SUBMIT_CLAIM = gql`
  mutation SubmitClaim($input: SubmitClaimInput!) {
    submitClaim(input: $input) {
      id
      status
    }
  }
`
const UPDATE_CLAIM_STATUS = gql`
  mutation UpdateClaimStatus($id: ID!, $input: UpdateClaimStatusInput!) {
    updateClaimStatus(id: $id, input: $input) {
      id
      status
    }
  }
`
// P2-03
const SUGGEST_CLAIM_CODES = gql`
  query SuggestClaimCodes($appointment_id: ID!) {
    suggestClaimCodes(appointment_id: $appointment_id) {
      diagnosis_suggestions {
        code
        description
        matched_terms
      }
      procedure_suggestions {
        code
        description
        matched_terms
      }
    }
  }
`
const GET_CLAIM_APPEAL = gql`
  query GetClaimAppeal($claim_id: ID!) {
    claimAppeal(claim_id: $claim_id) {
      id
      denial_category
      draft_content
      status
      approved_at
    }
  }
`
const APPROVE_CLAIM_APPEAL = gql`
  mutation ApproveClaimAppeal($id: ID!, $input: ApproveClaimAppealInput!) {
    approveClaimAppeal(id: $id, input: $input) {
      id
      status
      draft_content
      approved_at
    }
  }
`

function claimsMock(claims) {
  return { request: { query: GET_CLAIMS, variables: { status: undefined } }, result: { data: { claims } } }
}

// P2-03
function suggestClaimCodesMock(appointmentId, diagnosisSuggestions = [], procedureSuggestions = []) {
  return {
    request: { query: SUGGEST_CLAIM_CODES, variables: { appointment_id: appointmentId } },
    result: { data: { suggestClaimCodes: { diagnosis_suggestions: diagnosisSuggestions, procedure_suggestions: procedureSuggestions } } },
  }
}

function makeClaim(overrides = {}) {
  return {
    __typename: 'Claim',
    id: 'claim-1',
    patient_id: 'pat-1',
    patient_name: 'Anita Sharma',
    appointment_id: 'appt-1',
    appointment_date: '2026-08-20T09:00:00.000Z',
    payer: { __typename: 'Payer', id: 'payer-1', name: 'Star Health' },
    claim_amount: 5000,
    approved_amount: null,
    status: 'submitted',
    rejection_reason: null,
    submitted_at: '2026-08-26T10:00:00.000Z',
    decided_at: null,
    settled_at: null,
    notes: null,
    ...overrides,
  }
}

function renderPage(mocks) {
  return render(
    <SnackbarProvider>
      <MockedProvider mocks={mocks} addTypename>
        <ClaimsDesk />
      </MockedProvider>
    </SnackbarProvider>,
  )
}

describe('manager/claims (REQ131)', () => {
  it('renders real claims, not fabricated data', async () => {
    renderPage([claimsMock([makeClaim()])])
    await waitFor(() => expect(screen.getByText('Anita Sharma')).toBeInTheDocument())
    expect(screen.getByText('Star Health')).toBeInTheDocument()
    expect(screen.getByText('₹5000.00')).toBeInTheDocument()
    expect(screen.getByText('Submitted')).toBeInTheDocument()
  })

  it('shows an honest empty state when there are no claims yet', async () => {
    renderPage([claimsMock([])])
    await waitFor(() => expect(screen.getByText('No claims submitted yet.')).toBeInTheDocument())
  })

  it('submits a claim end-to-end via the real submitClaim mutation and refetches', async () => {
    renderPage([
      claimsMock([]),
      {
        request: { query: SEARCH_APPOINTMENTS, variables: { patient_name: 'Anita' } },
        result: {
          data: {
            appointments: {
              data: [
                {
                  __typename: 'Appointment',
                  id: 'appt-1',
                  start_datetime: '2026-08-20T09:00:00.000Z',
                  patient: { __typename: 'AppointmentPatient', id: 'pat-1', full_name: 'Anita Sharma' },
                  clinic: { __typename: 'AppointmentClinic', id: 'clinic-1', name: 'MG Road Clinic' },
                },
              ],
            },
          },
        },
      },
      {
        request: { query: GET_PAYERS_FOR_CLAIM },
        result: { data: { payers: [{ __typename: 'Payer', id: 'payer-1', name: 'Star Health', payer_type: 'insurer' }] } },
      },
      {
        request: { query: GET_PATIENT_POLICIES_FOR_CLAIM, variables: { patient_id: 'pat-1' } },
        result: { data: { patientInsurancePolicies: [] } },
      },
      suggestClaimCodesMock('appt-1'),
      {
        request: {
          query: SUBMIT_CLAIM,
          variables: {
            input: { appointment_id: 'appt-1', payer_id: 'payer-1', policy_id: undefined, claim_amount: 5000, notes: undefined },
          },
        },
        result: { data: { submitClaim: { __typename: 'Claim', id: 'claim-1', status: 'submitted' } } },
      },
      claimsMock([makeClaim()]),
    ])

    await waitFor(() => expect(screen.getByText('No claims submitted yet.')).toBeInTheDocument())
    await userEvent.click(screen.getByRole('button', { name: 'Submit Claim' }))
    const dialog = await screen.findByRole('dialog')
    await userEvent.type(within(dialog).getByLabelText('Search patient by name'), 'Anita')
    const apptCard = await screen.findByText('Anita Sharma')
    await userEvent.click(apptCard)

    await userEvent.click(within(dialog).getByLabelText('Payer'))
    const option = await screen.findByRole('option', { name: 'Star Health' })
    await userEvent.click(option)
    await userEvent.type(within(dialog).getByLabelText('Claim amount (₹)'), '5000')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Submit' }))

    await waitFor(() => expect(screen.queryByText('No claims submitted yet.')).not.toBeInTheDocument())
  }, 20000)

  it('approves an under_review claim via the real updateClaimStatus mutation and refetches', async () => {
    const underReview = makeClaim({ status: 'under_review' })
    const approved = makeClaim({ status: 'approved', approved_amount: 4500 })
    renderPage([
      claimsMock([underReview]),
      {
        request: {
          query: UPDATE_CLAIM_STATUS,
          variables: { id: 'claim-1', input: { status: 'approved', approved_amount: 4500, rejection_reason: undefined } },
        },
        result: { data: { updateClaimStatus: { __typename: 'Claim', id: 'claim-1', status: 'approved' } } },
      },
      claimsMock([approved]),
    ])

    await waitFor(() => expect(screen.getByText('Under Review')).toBeInTheDocument())
    await userEvent.click(screen.getByRole('button', { name: 'Approve' }))
    const dialog = await screen.findByRole('dialog')
    await userEvent.type(within(dialog).getByLabelText('Approved amount (₹)'), '4500')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Approve' }))

    // "Approved" also appears as the table's own column header — scope to
    // the status chip specifically, and confirm the row's action button
    // advanced to the next legal transition (Mark Settled), the strongest
    // proof the real mutation + refetch actually landed the new status.
    await waitFor(() => expect(screen.getByRole('button', { name: 'Mark Settled' })).toBeInTheDocument())
    expect(screen.getByText('₹4500.00')).toBeInTheDocument()
  }, 20000)

  // REQ138 (US-INS-06's own follow-on)
  it('downloads the reimbursement pack via the real authenticated PDF endpoint', async () => {
    renderPage([claimsMock([makeClaim()])])
    await waitFor(() => expect(screen.getByText('Anita Sharma')).toBeInTheDocument())

    await userEvent.click(screen.getByRole('button', { name: /Pack/ }))

    await waitFor(() =>
      expect(downloadAuthenticatedPdf).toHaveBeenCalledWith(
        '/documents/claims/claim-1/reimbursement-pack/pdf',
        'reimbursement-pack-claim-1.pdf',
      ),
    )
  })

  // P2-03 — "auto-populate": accepting a suggestion attaches its real code
  // to the real submitClaim call, never silently on its own.
  it('accepts an AI-suggested code and attaches it to the real submitClaim call', async () => {
    renderPage([
      claimsMock([]),
      {
        request: { query: SEARCH_APPOINTMENTS, variables: { patient_name: 'Anita' } },
        result: {
          data: {
            appointments: {
              data: [
                {
                  __typename: 'Appointment',
                  id: 'appt-1',
                  start_datetime: '2026-08-20T09:00:00.000Z',
                  patient: { __typename: 'AppointmentPatient', id: 'pat-1', full_name: 'Anita Sharma' },
                  clinic: { __typename: 'AppointmentClinic', id: 'clinic-1', name: 'MG Road Clinic' },
                },
              ],
            },
          },
        },
      },
      {
        request: { query: GET_PAYERS_FOR_CLAIM },
        result: { data: { payers: [{ __typename: 'Payer', id: 'payer-1', name: 'Star Health', payer_type: 'insurer' }] } },
      },
      {
        request: { query: GET_PATIENT_POLICIES_FOR_CLAIM, variables: { patient_id: 'pat-1' } },
        result: { data: { patientInsurancePolicies: [] } },
      },
      suggestClaimCodesMock(
        'appt-1',
        [{ __typename: 'CodeSuggestion', code: 'J06.9', description: 'Acute URI', matched_terms: ['acute'] }],
        [],
      ),
      {
        request: {
          query: SUBMIT_CLAIM,
          variables: {
            input: {
              appointment_id: 'appt-1',
              payer_id: 'payer-1',
              policy_id: undefined,
              claim_amount: 5000,
              notes: undefined,
              diagnosis_codes: [{ code: 'J06.9', description: 'Acute URI' }],
              procedure_codes: undefined,
            },
          },
        },
        result: { data: { submitClaim: { __typename: 'Claim', id: 'claim-1', status: 'submitted' } } },
      },
      claimsMock([makeClaim()]),
    ])

    await waitFor(() => expect(screen.getByText('No claims submitted yet.')).toBeInTheDocument())
    await userEvent.click(screen.getByRole('button', { name: 'Submit Claim' }))
    const dialog = await screen.findByRole('dialog')
    await userEvent.type(within(dialog).getByLabelText('Search patient by name'), 'Anita')
    await userEvent.click(await screen.findByText('Anita Sharma'))

    await userEvent.click(within(dialog).getByLabelText('Payer'))
    await userEvent.click(await screen.findByRole('option', { name: 'Star Health' }))
    await userEvent.type(within(dialog).getByLabelText('Claim amount (₹)'), '5000')

    const suggestionChip = await screen.findByText('J06.9 — Acute URI')
    await userEvent.click(suggestionChip)
    expect(await screen.findByText('Codes to attach: J06.9')).toBeInTheDocument()

    await userEvent.click(within(dialog).getByRole('button', { name: 'Submit' }))

    await waitFor(() => expect(screen.queryByText('No claims submitted yet.')).not.toBeInTheDocument())
  }, 20000)

  // P2-03 — the agent's own drafted appeal, reviewed and approved by a
  // real human via the real approveClaimAppeal mutation.
  it('shows the AI-drafted appeal for a rejected claim and approves it', async () => {
    const rejected = makeClaim({ status: 'rejected', rejection_reason: 'Documentation was missing' })
    renderPage([
      claimsMock([rejected]),
      {
        request: { query: GET_CLAIM_APPEAL, variables: { claim_id: 'claim-1' } },
        result: {
          data: {
            claimAppeal: {
              __typename: 'ClaimAppeal',
              id: 'appeal-1',
              denial_category: 'missing_documentation',
              draft_content: 'Appeal — Claim claim-1\n...',
              status: 'draft',
              approved_at: null,
            },
          },
        },
      },
      {
        request: {
          query: APPROVE_CLAIM_APPEAL,
          variables: { id: 'appeal-1', input: { content: undefined } },
        },
        result: {
          data: {
            approveClaimAppeal: {
              __typename: 'ClaimAppeal',
              id: 'appeal-1',
              status: 'approved',
              draft_content: 'Appeal — Claim claim-1\n...',
              approved_at: '2026-08-27T10:00:00.000Z',
            },
          },
        },
      },
    ])

    await waitFor(() => expect(screen.getByText('Rejected')).toBeInTheDocument())
    await userEvent.click(screen.getByRole('button', { name: 'Appeal' }))

    const dialog = await screen.findByRole('dialog')
    await waitFor(() => expect(within(dialog).getByText('Missing documentation')).toBeInTheDocument())
    expect(within(dialog).getByDisplayValue(/Appeal — Claim claim-1/)).toBeInTheDocument()

    await userEvent.click(within(dialog).getByRole('button', { name: 'Approve' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  }, 20000)
})
