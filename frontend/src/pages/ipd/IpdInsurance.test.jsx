import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { MockedProvider } from '@apollo/client/testing'
import { gql } from '@apollo/client'
import IpdInsurance from './IpdInsurance'
import { CLINICS_QUERY } from '../../graphql/queries'

// REQ179 (IPD slice 5) — first coverage for the TPA cashless console:
// renders real data (not mock) across both tabs.

const ENHANCEMENT_FIELDS = `
  id sequence_no requested_amount approved_amount status bill_amount_at_request
  reason rejection_reason requested_by_name requested_at decided_at
`
const PREAUTH_FIELDS = `
  id clinic_id patient_id patient_name payer_id payer_name policy_id
  admission_id admission_number status requested_amount approved_amount
  authorized_total preauth_number valid_until rejection_reason notes
  requested_by_name requested_at decided_at
  diagnosis_codes { code description } procedure_codes { code description }
  enhancements { ${ENHANCEMENT_FIELDS} }
  created_at
`
const PREAUTHS_QUERY = gql`
  query IpdPreAuthsList($clinic_id: ID, $status: String) {
    preAuthorizations(clinic_id: $clinic_id, status: $status) { ${PREAUTH_FIELDS} }
  }
`
const PAYERS_QUERY = gql`
  query PayersForInsurance {
    payers(is_active: true) { id name payer_type }
  }
`

const clinicA = { __typename: 'Clinic', id: 'clinic-a', name: 'City Care Clinic', address: '1 Road', city: null, postcode: null, phone: '1', email: 'a@a.com', timezone: 'Asia/Kolkata', is_active: true, is_primary: true }

function baseMocks(preauths = []) {
  return [
    { request: { query: CLINICS_QUERY }, result: { data: { clinics: [clinicA] } } },
    { request: { query: PAYERS_QUERY }, result: { data: { payers: [{ __typename: 'Payer', id: 'payer-1', name: 'Star Health', payer_type: 'insurer' }] } } },
    {
      request: { query: PREAUTHS_QUERY, variables: { clinic_id: 'clinic-a', status: undefined } },
      result: { data: { preAuthorizations: preauths.map((p) => ({ __typename: 'PreAuthorization', enhancements: [], diagnosis_codes: [], procedure_codes: [], ...p })) } },
    },
  ]
}

function renderPage(mocks) {
  return render(
    <MemoryRouter>
      <MockedProvider mocks={mocks} addTypename={false}>
        <IpdInsurance />
      </MockedProvider>
    </MemoryRouter>,
  )
}

describe('ipd/IpdInsurance', () => {
  it('renders the empty state when the clinic has no pre-authorizations', async () => {
    renderPage(baseMocks([]))
    await waitFor(() => expect(screen.getByText(/no pre-authorizations match this filter/i)).toBeInTheDocument())
  })

  it('renders a real pre-authorization with its patient and authorized total, not mock data', async () => {
    renderPage(
      baseMocks([
        {
          id: 'pa-1', clinic_id: 'clinic-a', patient_id: 'pat-1', patient_name: 'Jane Doe', payer_id: 'payer-1', payer_name: 'Star Health',
          policy_id: null, admission_id: null, admission_number: null, status: 'approved', requested_amount: 5000, approved_amount: 4000,
          authorized_total: 4200, preauth_number: 'PA-REF-1', valid_until: null, rejection_reason: null, notes: null,
          requested_by_name: 'Front Desk', requested_at: '2026-09-01T00:00:00.000Z', decided_at: '2026-09-01T00:00:00.000Z', created_at: '2026-09-01T00:00:00.000Z',
        },
      ]),
    )
    await waitFor(() => expect(screen.getByText('Jane Doe')).toBeInTheDocument())
    expect(screen.getByText('Star Health')).toBeInTheDocument()
    expect(screen.getByText('₹4,200.00')).toBeInTheDocument()
  })
})
