import { render, screen, waitFor, within, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { MockedProvider } from '@apollo/client/testing'
import { SnackbarProvider } from 'notistack'
import { gql } from '@apollo/client'
import { PATIENTS_QUERY } from '../../graphql/queries'
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

// REQ110 — the Packages tab (real data, same "still-mock page, real tab"
// pattern as Insurance above). Query text must exactly match detail.jsx's
// own inline gql — Apollo's MockedProvider matches by query-AST equality.
const GET_PATIENT_PACKAGES = gql`
  query GetPatientPackages($patient_id: ID!) {
    patientPackages(patient_id: $patient_id) {
      id sittings_total sittings_remaining purchase_amount purchase_tender_type
      purchased_at expires_at is_expired
      package { id name }
    }
  }
`
const TRANSFER_PACKAGE = gql`
  mutation TransferPackage($input: TransferPackageInput!) {
    transferPackage(input: $input) {
      success
      userErrors { message }
    }
  }
`

// A real, non-mock-recognized UUID — confirms this tab queries the real
// route :id even though the rest of the page falls back to a default mock.
const PATIENT_ID = '8e9ed6bf-daf0-49cb-84f3-82c8c4ba80e7'

function insuranceMock({ payers = [], policies = [] } = {}) {
  return { request: { query: GET_PATIENT_INSURANCE, variables: { patient_id: PATIENT_ID } }, result: { data: { payers, patientInsurancePolicies: policies } } }
}

function packagesMock({ packages = [] } = {}) {
  return { request: { query: GET_PATIENT_PACKAGES, variables: { patient_id: PATIENT_ID } }, result: { data: { patientPackages: packages } } }
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

async function openPackagesTab() {
  await userEvent.click(screen.getByRole('tab', { name: /Packages/ }))
}

describe('patients/detail.jsx — Insurance tab (A-7)', () => {
  it('shows a real empty state when no policies are recorded', async () => {
    renderPage([insuranceMock(), packagesMock()])
    await openInsuranceTab()
    await waitFor(() => expect(screen.getByText('No insurance policies recorded for this patient yet.')).toBeInTheDocument())
  })

  it('renders real recorded policies', async () => {
    const policies = [{
      __typename: 'PatientInsurancePolicy', id: 'pol-1', policy_number: 'POL-9001', policy_holder_name: 'Rohan Verma',
      valid_from: '2026-01-01T00:00:00.000Z', valid_until: '2026-12-31T00:00:00.000Z', is_active: true,
      payer: { __typename: 'Payer', id: 'payer-1', name: 'Star Health' },
    }]
    renderPage([insuranceMock({ policies }), packagesMock()])
    await openInsuranceTab()
    await waitFor(() => expect(screen.getByText('Star Health')).toBeInTheDocument())
    expect(screen.getByText('POL-9001')).toBeInTheDocument()
    expect(screen.getByText('Active')).toBeInTheDocument()
  })

  it('records a new policy via the real createPatientInsurancePolicy mutation', async () => {
    const payers = [{ __typename: 'Payer', id: 'payer-1', name: 'Star Health', payer_type: 'insurer' }]
    renderPage([
      insuranceMock({ payers }),
      packagesMock(),
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

describe('patients/detail.jsx — Packages tab (REQ110)', () => {
  const activePackage = {
    __typename: 'PatientPackage', id: 'pp-1', sittings_total: 10, sittings_remaining: 6,
    purchase_amount: 5000, purchase_tender_type: 'upi',
    purchased_at: '2026-06-01T00:00:00.000Z', expires_at: '2026-12-01T00:00:00.000Z', is_expired: false,
    package: { __typename: 'Package', id: 'pkg-1', name: 'Physio 10-Sitting Pack' },
  }

  it('shows a real empty state when no packages are purchased', async () => {
    renderPage([insuranceMock(), packagesMock()])
    await openPackagesTab()
    await waitFor(() => expect(screen.getByText('No packages purchased for this patient yet.')).toBeInTheDocument())
  })

  it('renders a real purchased package with remaining sittings', async () => {
    renderPage([insuranceMock(), packagesMock({ packages: [activePackage] })])
    await openPackagesTab()
    await waitFor(() => expect(screen.getByText('Physio 10-Sitting Pack')).toBeInTheDocument())
    expect(screen.getByText('6 / 10')).toBeInTheDocument()
    expect(screen.getByText('Active')).toBeInTheDocument()
  })

  it('disables the transfer action for a fully-redeemed package', async () => {
    renderPage([insuranceMock(), packagesMock({ packages: [{ ...activePackage, sittings_remaining: 0 }] })])
    await openPackagesTab()
    await waitFor(() => expect(screen.getByText('Fully Redeemed')).toBeInTheDocument())
    expect(screen.getByRole('button', { name: /Transfer Physio 10-Sitting Pack/ })).toBeDisabled()
  })

  it('transfers a package to another patient via the real transferPackage mutation', async () => {
    const targetPatient = {
      __typename: 'Patient', id: 'patient-target', first_name: 'Anita', last_name: 'Sharma', full_name: 'Anita Sharma',
      email: 'anita@example.com', phone: null, date_of_birth: null, gender: null, address: null, notes: null, created_at: '2026-01-01T00:00:00.000Z',
    }
    renderPage([
      insuranceMock(),
      packagesMock({ packages: [activePackage] }),
      {
        request: { query: PATIENTS_QUERY, variables: { search: 'Anita', first: 20 } },
        result: { data: { patients: { __typename: 'PatientPaginator', data: [targetPatient], paginatorInfo: { __typename: 'PaginatorInfo', count: 1, currentPage: 1, hasMorePages: false, lastPage: 1, perPage: 20, total: 1 } } } },
      },
      {
        request: { query: TRANSFER_PACKAGE, variables: { input: { patient_package_id: 'pp-1', to_patient_id: 'patient-target' } } },
        result: { data: { transferPackage: { success: true, userErrors: [] } } },
      },
      packagesMock({ packages: [] }),
    ])
    await openPackagesTab()
    await waitFor(() => expect(screen.getByText('Physio 10-Sitting Pack')).toBeInTheDocument())

    await userEvent.click(screen.getByRole('button', { name: /Transfer Physio 10-Sitting Pack/ }))
    const dialog = await screen.findByRole('dialog')
    const targetPatientInput = within(dialog).getByLabelText(/^Target Patient/)
    await userEvent.click(targetPatientInput)
    // A single fireEvent.change (not userEvent.type's per-keystroke firing)
    // so exactly one PATIENTS_QUERY request goes out, matching the one mock above.
    fireEvent.change(targetPatientInput, { target: { value: 'Anita' } })
    await userEvent.click(await screen.findByRole('option', { name: /Anita Sharma/ }))
    await userEvent.click(within(dialog).getByRole('button', { name: 'Transfer' }))

    await waitFor(() => expect(screen.getByText('No packages purchased for this patient yet.')).toBeInTheDocument())
  }, 20000)
})
