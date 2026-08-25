import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { MockedProvider } from '@apollo/client/testing'
import { SnackbarProvider } from 'notistack'
import { gql } from '@apollo/client'
import PatientDetailPage from './detail'

// A-7 (project-plans/08-integration-gap-analysis.md) — the rest of this page
// is deliberately still mock-driven (context/open-questions.md #13); this
// spec covers only the new, real Insurance tab, scoped independently.
const GET_PATIENT_INSURANCE = gql`
  query GetPatientInsurance($patient_id: ID!) {
    payers(is_active: true) { id name payer_type }
    patientInsurancePolicies(patient_id: $patient_id) {
      id policy_number policy_holder_name valid_from valid_until is_active
      payer { id name }
    }
  }
`
const CREATE_PATIENT_INSURANCE_POLICY = gql`
  mutation CreatePatientInsurancePolicy($input: PatientInsurancePolicyInput!) {
    createPatientInsurancePolicy(input: $input) { id }
  }
`

// A real, non-mock-recognized UUID — confirms this tab queries the real
// route :id even though the rest of the page falls back to a default mock.
const PATIENT_ID = '8e9ed6bf-daf0-49cb-84f3-82c8c4ba80e7'

function insuranceMock({ payers = [], policies = [] } = {}) {
  return { request: { query: GET_PATIENT_INSURANCE, variables: { patient_id: PATIENT_ID } }, result: { data: { payers, patientInsurancePolicies: policies } } }
}

function renderPage(mocks) {
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[`/patients/${PATIENT_ID}`]}>
        <SnackbarProvider>
          <MockedProvider mocks={mocks}>
            <Routes>
              <Route path="/patients/:id" element={<PatientDetailPage />} />
            </Routes>
          </MockedProvider>
        </SnackbarProvider>
      </MemoryRouter>
    </HelmetProvider>
  )
}

async function openInsuranceTab() {
  await userEvent.click(screen.getByRole('tab', { name: /Insurance/ }))
}

describe('patients/detail.jsx — Insurance tab (A-7)', () => {
  it('shows a real empty state when no policies are recorded', async () => {
    renderPage([insuranceMock()])
    await openInsuranceTab()
    await waitFor(() => expect(screen.getByText('No insurance policies recorded for this patient yet.')).toBeInTheDocument())
  })

  it('renders real recorded policies', async () => {
    const policies = [{
      __typename: 'PatientInsurancePolicy', id: 'pol-1', policy_number: 'POL-9001', policy_holder_name: 'Rohan Verma',
      valid_from: '2026-01-01T00:00:00.000Z', valid_until: '2026-12-31T00:00:00.000Z', is_active: true,
      payer: { __typename: 'Payer', id: 'payer-1', name: 'Star Health' },
    }]
    renderPage([insuranceMock({ policies })])
    await openInsuranceTab()
    await waitFor(() => expect(screen.getByText('Star Health')).toBeInTheDocument())
    expect(screen.getByText('POL-9001')).toBeInTheDocument()
    expect(screen.getByText('Active')).toBeInTheDocument()
  })

  it('records a new policy via the real createPatientInsurancePolicy mutation', async () => {
    const payers = [{ __typename: 'Payer', id: 'payer-1', name: 'Star Health', payer_type: 'insurer' }]
    renderPage([
      insuranceMock({ payers }),
      {
        request: { query: CREATE_PATIENT_INSURANCE_POLICY, variables: { input: { patient_id: PATIENT_ID, payer_id: 'payer-1', policy_number: 'POL-9002', policy_holder_name: 'Rohan Verma', valid_from: '2026-01-15' } } },
        result: { data: { createPatientInsurancePolicy: { __typename: 'PatientInsurancePolicy', id: 'pol-2' } } },
      },
      insuranceMock({ payers, policies: [{ __typename: 'PatientInsurancePolicy', id: 'pol-2', policy_number: 'POL-9002', policy_holder_name: 'Rohan Verma', valid_from: '2026-01-15T00:00:00.000Z', valid_until: null, is_active: true, payer: { __typename: 'Payer', id: 'payer-1', name: 'Star Health' } }] }),
    ])
    await openInsuranceTab()
    await waitFor(() => expect(screen.getByText('No insurance policies recorded for this patient yet.')).toBeInTheDocument())

    await userEvent.click(screen.getByRole('button', { name: 'Add Policy' }))
    const dialog = await screen.findByRole('dialog')
    await userEvent.click(within(dialog).getByLabelText(/^Payer/))
    await userEvent.click(await screen.findByRole('option', { name: 'Star Health' }))
    await userEvent.type(within(dialog).getByLabelText(/^Policy Number/), 'POL-9002')
    await userEvent.type(within(dialog).getByLabelText(/^Policy Holder Name/), 'Rohan Verma')
    const validFrom = within(dialog).getByLabelText(/^Valid From/)
    await userEvent.clear(validFrom)
    await userEvent.type(validFrom, '2026-01-15')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(screen.getByText('POL-9002')).toBeInTheDocument())
  }, 20000)
})
