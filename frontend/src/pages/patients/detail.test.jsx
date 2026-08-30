import { render, screen, waitFor, within, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { MockedProvider } from '@apollo/client/testing'
import { SnackbarProvider } from 'notistack'
import { ThemeProvider } from '@mui/material/styles'
import { gql } from '@apollo/client'
import { PATIENTS_QUERY, PATIENT_DETAIL_QUERY } from '../../graphql/queries'
import PatientDetailPage from './detail'
import { createAppTheme } from '../../theme'

// A-7 (project-plans/08-integration-gap-analysis.md) — the rest of this page
// is deliberately still mock-driven (context/open-questions.md #13); this
// spec covers only the new, real Insurance tab, scoped independently.
const GET_PATIENT_INSURANCE = gql`
  query GetPatientInsurance($patient_id: ID!) {
    payers(is_active: true) {
      id
      name
      payer_type
    }
    patientInsurancePolicies(patient_id: $patient_id) {
      id
      policy_number
      policy_holder_name
      valid_from
      valid_until
      is_active
      payer {
        id
        name
      }
    }
  }
`
const CREATE_PATIENT_INSURANCE_POLICY = gql`
  mutation CreatePatientInsurancePolicy($input: PatientInsurancePolicyInput!) {
    createPatientInsurancePolicy(input: $input) {
      id
    }
  }
`

// REQ110 — the Packages tab (real data, same "still-mock page, real tab"
// pattern as Insurance above). Query text must exactly match detail.jsx's
// own inline gql — Apollo's MockedProvider matches by query-AST equality.
const GET_PATIENT_PACKAGES = gql`
  query GetPatientPackages($patient_id: ID!) {
    patientPackages(patient_id: $patient_id) {
      id
      sittings_total
      sittings_remaining
      purchase_amount
      purchase_tender_type
      purchased_at
      expires_at
      is_expired
      package {
        id
        name
      }
    }
  }
`
const TRANSFER_PACKAGE = gql`
  mutation TransferPackage($input: TransferPackageInput!) {
    transferPackage(input: $input) {
      success
      userErrors {
        message
      }
    }
  }
`

// REQ115 — Sell Package dialog. Query/mutation text must exactly match
// detail.jsx's own inline gql — MockedProvider matches by query-AST equality.
const GET_SELLABLE_PACKAGES = gql`
  query GetSellablePackages {
    packages {
      id
      name
      total_sittings
      price
      validity_days
      is_active
    }
  }
`
const PURCHASE_PACKAGE = gql`
  mutation PurchasePackage($input: PurchasePackageInput!) {
    purchasePackage(input: $input) {
      success
      userErrors {
        message
      }
    }
  }
`

// A real, non-mock-recognized UUID — confirms this tab queries the real
// route :id even though the rest of the page falls back to a default mock.
const PATIENT_ID = '8e9ed6bf-daf0-49cb-84f3-82c8c4ba80e7'

function insuranceMock({ payers = [], policies = [] } = {}) {
  return {
    request: { query: GET_PATIENT_INSURANCE, variables: { patient_id: PATIENT_ID } },
    result: { data: { payers, patientInsurancePolicies: policies } },
  }
}

function packagesMock({ packages = [] } = {}) {
  return {
    request: { query: GET_PATIENT_PACKAGES, variables: { patient_id: PATIENT_ID } },
    result: { data: { patientPackages: packages } },
  }
}

// BUG055 -- every render of this page now needs PATIENT_DETAIL_QUERY to
// resolve before any tab is reachable at all (it drives identity + the
// Appointments tab). A default real-shaped patient, auto-prepended by
// renderPage() below, keeps every pre-existing Insurance/Packages test in
// this file working unmodified.
function patientDetailMock({ appointments = [], overrides = {} } = {}) {
  const sorted = [...appointments].sort((a, b) => new Date(b.start_datetime) - new Date(a.start_datetime))
  return {
    request: { query: PATIENT_DETAIL_QUERY, variables: { id: PATIENT_ID } },
    result: {
      data: {
        patient: {
          __typename: 'Patient',
          id: PATIENT_ID,
          first_name: 'Rohan',
          last_name: 'Verma',
          full_name: 'Rohan Verma',
          email: 'rohan.verma@example.com',
          phone: '+919810000000',
          date_of_birth: '1992-06-20T00:00:00.000Z',
          gender: 'male',
          address: 'Bengaluru, Karnataka',
          notes: '',
          created_at: '2026-01-01T00:00:00.000Z',
          ...overrides,
          appointments: {
            __typename: 'PatientAppointmentsPaginated',
            data: sorted,
            paginatorInfo: { __typename: 'PatientAppointmentPaginatorInfo', total: appointments.length, hasMorePages: false },
          },
        },
      },
    },
  }
}

function AppointmentDetailMarker() {
  const location = useLocation()
  return <div data-testid="appointment-detail-marker">{location.pathname}</div>
}

function renderPage(mocks, { patientMock } = {}) {
  return render(
    // UI-8 -- this page reads theme.palette.appointmentStatus (statusChipSx,
    // for the Appointments/Test Results status chips); a bare render with no
    // ThemeProvider silently falls back to MUI's stock default theme, which
    // has no appointmentStatus key at all.
    <ThemeProvider theme={createAppTheme('light')}>
      <HelmetProvider>
        <MemoryRouter initialEntries={[`/patients/${PATIENT_ID}`]}>
          <SnackbarProvider>
            <MockedProvider mocks={[patientMock ?? patientDetailMock(), ...mocks]}>
              <Routes>
                <Route path="/patients/:id" element={<PatientDetailPage />} />
                <Route path="/appointments/:id" element={<AppointmentDetailMarker />} />
              </Routes>
            </MockedProvider>
          </SnackbarProvider>
        </MemoryRouter>
      </HelmetProvider>
    </ThemeProvider>,
  )
}

// BUG055 -- the page now gates its entire render behind a real PATIENT_DETAIL_QUERY;
// findByRole (not getByRole) waits for that to resolve before the tab exists at all.
async function openInsuranceTab() {
  await userEvent.click(await screen.findByRole('tab', { name: /Insurance/ }))
}

async function openPackagesTab() {
  await userEvent.click(await screen.findByRole('tab', { name: /Packages/ }))
}

describe('patients/detail.jsx — Insurance tab (A-7)', () => {
  it('shows a real empty state when no policies are recorded', async () => {
    renderPage([insuranceMock(), packagesMock()])
    await openInsuranceTab()
    await waitFor(() => expect(screen.getByText('No insurance policies recorded for this patient yet.')).toBeInTheDocument())
  })

  it('renders real recorded policies', async () => {
    const policies = [
      {
        __typename: 'PatientInsurancePolicy',
        id: 'pol-1',
        policy_number: 'POL-9001',
        policy_holder_name: 'Rohan Verma',
        valid_from: '2026-01-01T00:00:00.000Z',
        valid_until: '2026-12-31T00:00:00.000Z',
        is_active: true,
        payer: { __typename: 'Payer', id: 'payer-1', name: 'Star Health' },
      },
    ]
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
        request: {
          query: CREATE_PATIENT_INSURANCE_POLICY,
          variables: {
            input: {
              patient_id: PATIENT_ID,
              payer_id: 'payer-1',
              policy_number: 'POL-9002',
              policy_holder_name: 'Rohan Verma',
              valid_from: '2026-01-15',
            },
          },
        },
        result: { data: { createPatientInsurancePolicy: { __typename: 'PatientInsurancePolicy', id: 'pol-2' } } },
      },
      insuranceMock({
        payers,
        policies: [
          {
            __typename: 'PatientInsurancePolicy',
            id: 'pol-2',
            policy_number: 'POL-9002',
            policy_holder_name: 'Rohan Verma',
            valid_from: '2026-01-15T00:00:00.000Z',
            valid_until: null,
            is_active: true,
            payer: { __typename: 'Payer', id: 'payer-1', name: 'Star Health' },
          },
        ],
      }),
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
    __typename: 'PatientPackage',
    id: 'pp-1',
    sittings_total: 10,
    sittings_remaining: 6,
    purchase_amount: 5000,
    purchase_tender_type: 'upi',
    purchased_at: '2026-06-01T00:00:00.000Z',
    expires_at: '2026-12-01T00:00:00.000Z',
    is_expired: false,
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
      __typename: 'Patient',
      id: 'patient-target',
      first_name: 'Anita',
      last_name: 'Sharma',
      full_name: 'Anita Sharma',
      email: 'anita@example.com',
      phone: null,
      date_of_birth: null,
      gender: null,
      address: null,
      notes: null,
      created_at: '2026-01-01T00:00:00.000Z',
    }
    renderPage([
      insuranceMock(),
      packagesMock({ packages: [activePackage] }),
      {
        request: { query: PATIENTS_QUERY, variables: { search: 'Anita', first: 20 } },
        result: {
          data: {
            patients: {
              __typename: 'PatientPaginator',
              data: [targetPatient],
              paginatorInfo: {
                __typename: 'PaginatorInfo',
                count: 1,
                currentPage: 1,
                hasMorePages: false,
                lastPage: 1,
                perPage: 20,
                total: 1,
              },
            },
          },
        },
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

  it('sells a package to this patient via the real purchasePackage mutation (REQ115)', async () => {
    const sellablePackage = {
      __typename: 'Package',
      id: 'pkg-2',
      name: 'Dental Whitening',
      total_sittings: 5,
      price: 3000,
      validity_days: 90,
      is_active: true,
    }
    renderPage([
      insuranceMock(),
      packagesMock(),
      { request: { query: GET_SELLABLE_PACKAGES }, result: { data: { packages: [sellablePackage] } } },
      {
        request: {
          query: PURCHASE_PACKAGE,
          variables: { input: { package_id: 'pkg-2', patient_id: PATIENT_ID, purchase_tender_type: 'cash', purchase_reference: 'REF1' } },
        },
        result: { data: { purchasePackage: { success: true, userErrors: [] } } },
      },
      packagesMock({ packages: [activePackage] }),
    ])
    await openPackagesTab()
    await waitFor(() => expect(screen.getByText('No packages purchased for this patient yet.')).toBeInTheDocument())

    await userEvent.click(screen.getByRole('button', { name: 'Sell Package' }))
    const dialog = await screen.findByRole('dialog')
    await waitFor(() => expect(within(dialog).getByLabelText('Package')).toBeInTheDocument())
    await userEvent.click(within(dialog).getByLabelText('Package'))
    await userEvent.click(await screen.findByRole('option', { name: /Dental Whitening/ }))
    await userEvent.type(within(dialog).getByLabelText('Reference (optional)'), 'REF1')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Sell' }))

    await waitFor(() => expect(screen.getByText('Physio 10-Sitting Pack')).toBeInTheDocument())
  }, 20000)
})

describe('patients/detail.jsx — real identity + Appointments tab (BUG055)', () => {
  const realAppt = {
    __typename: 'PatientAppointmentItem',
    id: 'appt-1',
    start_datetime: '2026-03-18T10:00:00.000Z',
    end_datetime: '2026-03-18T10:20:00.000Z',
    status: 'confirmed',
    clinician: { __typename: 'PatientAppointmentClinician', id: 'cln-1', full_name: 'Alex Clinician' },
    service: { __typename: 'PatientAppointmentService', id: 'svc-1', name: 'GP Consultation' },
    clinic: { __typename: 'PatientAppointmentClinic', id: 'clinic-1', name: 'City Heart Clinic' },
  }

  it('renders the real patient identity, never the fabricated default', async () => {
    renderPage([insuranceMock(), packagesMock()], { patientMock: patientDetailMock({ appointments: [realAppt] }) })
    await waitFor(() => expect(screen.getByText('Rohan Verma')).toBeInTheDocument())
    expect(screen.getByText(/rohan.verma@example.com/)).toBeInTheDocument()
    expect(screen.queryByText('John Michael Doe')).not.toBeInTheDocument()
  })

  it('renders real appointments on the Appointments tab, never the fabricated Dr. Jane Smith/Dr. Carlos Vega rows', async () => {
    renderPage([insuranceMock(), packagesMock()], { patientMock: patientDetailMock({ appointments: [realAppt] }) })
    await waitFor(() => expect(screen.getByText('Rohan Verma')).toBeInTheDocument())
    await userEvent.click(screen.getByRole('tab', { name: /Appointments/ }))
    await waitFor(() => expect(screen.getByText('Alex Clinician')).toBeInTheDocument())
    expect(screen.getByText('GP Consultation')).toBeInTheDocument()
    expect(screen.queryByText('Dr. Jane Smith')).not.toBeInTheDocument()
    expect(screen.queryByText('Dr. Carlos Vega')).not.toBeInTheDocument()
  })

  it('navigates to the real appointment detail page when a row is clicked', async () => {
    renderPage([insuranceMock(), packagesMock()], { patientMock: patientDetailMock({ appointments: [realAppt] }) })
    await waitFor(() => expect(screen.getByText('Rohan Verma')).toBeInTheDocument())
    await userEvent.click(screen.getByRole('tab', { name: /Appointments/ }))
    await waitFor(() => expect(screen.getByText('Alex Clinician')).toBeInTheDocument())

    await userEvent.click(screen.getByRole('button', { name: /View appointment on/ }))
    await waitFor(() => expect(screen.getByTestId('appointment-detail-marker')).toHaveTextContent(`/appointments/${realAppt.id}`))
  })

  it('derives Visits/Last visit from the real appointment data, and drops the fields with no real backing', async () => {
    renderPage([insuranceMock(), packagesMock()], { patientMock: patientDetailMock({ appointments: [realAppt] }) })
    await waitFor(() => expect(screen.getByText('Rohan Verma')).toBeInTheDocument())
    expect(screen.getByText('1 Visit')).toBeInTheDocument()
    expect(screen.getByText(/Last visit: 18 Mar 2026/)).toBeInTheDocument()
    // BUG055 -- these had zero real backing and must be genuinely absent,
    // not merely blank/"—".
    expect(screen.queryByText(/Balance/)).not.toBeInTheDocument()
    expect(screen.queryByText('Blood Type')).not.toBeInTheDocument()
    expect(screen.queryByText('Primary Clinician')).not.toBeInTheDocument()
  })

  it('shows a real not-found state when the patient does not exist / is not accessible', async () => {
    renderPage([], {
      patientMock: { request: { query: PATIENT_DETAIL_QUERY, variables: { id: PATIENT_ID } }, result: { data: { patient: null } } },
    })
    await waitFor(() => expect(screen.getByText('Patient not found.')).toBeInTheDocument())
  })

  it('shows a real error state with retry on a genuine query failure', async () => {
    const { GraphQLError } = require('graphql')
    renderPage([], {
      patientMock: { request: { query: PATIENT_DETAIL_QUERY, variables: { id: PATIENT_ID } }, result: { errors: [new GraphQLError('boom')] } },
    })
    await waitFor(() => expect(screen.getByText("Couldn't load this patient's record.")).toBeInTheDocument())
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
  })
})
