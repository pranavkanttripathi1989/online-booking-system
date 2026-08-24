import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { MockedProvider } from '@apollo/client/testing'
import { gql } from '@apollo/client'
import PrescriptionPrint from './PrescriptionPrint'

const PRINT_QUERY = gql`
  query PrintPrescription($id: ID!) {
    printPrescription(id: $id) {
      is_reprint
      prescription { id mode issued_at language items { drug_name dose frequency route duration_days qty instructions substitutable } }
      clinic { name logo_url contact_phone address }
      clinician { full_name registration_number qualifications }
      patient { full_name date_of_birth gender }
    }
  }
`

const PAYLOAD = {
  is_reprint: false,
  prescription: {
    id: 'rx-1', mode: 'in_person', issued_at: '2026-08-24T09:00:00.000Z', language: 'en',
    items: [{ drug_name: 'Amoxicillin', dose: '500mg', frequency: 'BD', route: 'Oral', duration_days: 5, qty: 10, instructions: 'After food', substitutable: true }],
  },
  clinic: { name: 'City Heart Clinic', logo_url: null, contact_phone: '+91 9876543210', address: null },
  clinician: { full_name: 'Sarah Mitchell', registration_number: 'REG123', qualifications: 'MBBS' },
  patient: { full_name: 'Anita Sharma', date_of_birth: '1990-01-01', gender: 'female' },
}

function renderPage() {
  return render(
    <MockedProvider mocks={[{ request: { query: PRINT_QUERY, variables: { id: 'rx-1' } }, result: { data: { printPrescription: PAYLOAD } } }]} addTypename={false}>
      <MemoryRouter initialEntries={['/prescriptions/rx-1/print']}>
        <Routes><Route path="/prescriptions/:id/print" element={<PrescriptionPrint />} /></Routes>
      </MemoryRouter>
    </MockedProvider>,
  )
}

describe('PrescriptionPrint', () => {
  it('renders the letterhead, drug table, and no DUPLICATE watermark on a first view', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByText('City Heart Clinic')).toBeInTheDocument())
    expect(screen.getByText('Sarah Mitchell')).toBeInTheDocument()
    expect(screen.getByText('Amoxicillin')).toBeInTheDocument()
    expect(screen.queryByText('DUPLICATE')).not.toBeInTheDocument()
  })

  it('shows the DUPLICATE watermark when the payload reports a reprint', async () => {
    render(
      <MockedProvider
        mocks={[{ request: { query: PRINT_QUERY, variables: { id: 'rx-1' } }, result: { data: { printPrescription: { ...PAYLOAD, is_reprint: true } } } }]}
        addTypename={false}
      >
        <MemoryRouter initialEntries={['/prescriptions/rx-1/print']}>
          <Routes><Route path="/prescriptions/:id/print" element={<PrescriptionPrint />} /></Routes>
        </MemoryRouter>
      </MockedProvider>,
    )
    await waitFor(() => expect(screen.getByText('DUPLICATE')).toBeInTheDocument())
  })
})
