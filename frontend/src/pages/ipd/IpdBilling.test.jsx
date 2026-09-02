import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { MockedProvider } from '@apollo/client/testing'
import { gql } from '@apollo/client'
import IpdBilling from './IpdBilling'
import { CLINICS_QUERY } from '../../graphql/queries'

// REQ179 (IPD slice 4) — first coverage for the billing console: renders a
// real bill list (not mock), and the empty state when a clinic has none.

const BILLS_QUERY = gql`
  query IpdBillsList($clinic_id: ID, $status: String) {
    ipdBills(clinic_id: $clinic_id, status: $status) {
      id admission_id admission_number patient_name bill_number status package_id package_name
      gross paid balance finalized_at finalized_by_name created_at
      charges {
        id charge_type description service_date product_id quantity unit_price total
        gst_rate gst_amount is_reversed is_package_inclusive posted_by_name created_at
      }
      payments {
        id payment_type amount tenders { tender_type amount reference } receipt_number notes recorded_by_name created_at
      }
    }
  }
`

const clinicA = { __typename: 'Clinic', id: 'clinic-a', name: 'City Care Clinic', address: '1 Road', city: null, postcode: null, phone: '1', email: 'a@a.com', timezone: 'Asia/Kolkata', is_active: true, is_primary: true }

function baseMocks(bills = []) {
  return [
    { request: { query: CLINICS_QUERY }, result: { data: { clinics: [clinicA] } } },
    {
      request: { query: BILLS_QUERY, variables: { clinic_id: 'clinic-a', status: undefined } },
      result: { data: { ipdBills: bills.map((b) => ({ __typename: 'IpdBill', charges: [], payments: [], ...b })) } },
    },
  ]
}

function renderPage(mocks) {
  return render(
    <MemoryRouter>
      <MockedProvider mocks={mocks} addTypename={false}>
        <IpdBilling />
      </MockedProvider>
    </MemoryRouter>,
  )
}

describe('ipd/IpdBilling', () => {
  it('renders the empty state when the clinic has no bills', async () => {
    renderPage(baseMocks([]))
    await waitFor(() => expect(screen.getByText(/no bills match this filter/i)).toBeInTheDocument())
  })

  it('renders a real bill with its patient and balance, not mock data', async () => {
    renderPage(
      baseMocks([
        {
          id: 'bill-1', admission_id: 'adm-1', admission_number: 'ADM/2026-27/00001', patient_name: 'Jane Doe',
          bill_number: null, status: 'open', package_id: null, package_name: null,
          gross: 1200, paid: 500, balance: 700, finalized_at: null, finalized_by_name: null, created_at: '2026-09-01T00:00:00.000Z',
        },
      ]),
    )
    await waitFor(() => expect(screen.getByText('Jane Doe')).toBeInTheDocument())
    expect(screen.getByText('ADM/2026-27/00001')).toBeInTheDocument()
    expect(screen.getByText('₹700.00')).toBeInTheDocument()
  })
})
