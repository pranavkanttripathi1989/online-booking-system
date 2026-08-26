import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { MockedProvider } from '@apollo/client/testing'
import { SnackbarProvider } from 'notistack'
import { gql } from '@apollo/client'
import PrescriptionPrint from './PrescriptionPrint'

const PRINT_QUERY = gql`
  query PrintPrescription($id: ID!) {
    printPrescription(id: $id) {
      is_reprint
      prescription { id mode issued_at language pdf_hash items { drug_name dose frequency route duration_days qty instructions substitutable } }
      clinic { name logo_url contact_phone address }
      clinician { full_name registration_number qualifications }
      patient { full_name date_of_birth gender }
    }
  }
`
// REQ109
const SHARE_VIA_WHATSAPP = gql`
  mutation SharePrescriptionViaWhatsapp($id: ID!) {
    sharePrescriptionViaWhatsapp(id: $id) {
      success
      userErrors { message }
      phone_last_two
    }
  }
`

const PAYLOAD = {
  is_reprint: false,
  prescription: {
    id: 'rx-1', mode: 'in_person', issued_at: '2026-08-24T09:00:00.000Z', language: 'en',
    pdf_hash: 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6',
    items: [{ drug_name: 'Amoxicillin', dose: '500mg', frequency: 'BD', route: 'Oral', duration_days: 5, qty: 10, instructions: 'After food', substitutable: true }],
  },
  clinic: { name: 'City Heart Clinic', logo_url: null, contact_phone: '+91 9876543210', address: null },
  clinician: { full_name: 'Sarah Mitchell', registration_number: 'REG123', qualifications: 'MBBS' },
  patient: { full_name: 'Anita Sharma', date_of_birth: '1990-01-01', gender: 'female' },
}

function renderPage(extraMocks = []) {
  return render(
    <MockedProvider mocks={[{ request: { query: PRINT_QUERY, variables: { id: 'rx-1' } }, result: { data: { printPrescription: PAYLOAD } } }, ...extraMocks]} addTypename={false}>
      <SnackbarProvider>
        <MemoryRouter initialEntries={['/prescriptions/rx-1/print']}>
          <Routes><Route path="/prescriptions/:id/print" element={<PrescriptionPrint />} /></Routes>
        </MemoryRouter>
      </SnackbarProvider>
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

  // REQ129 (US-RX-08)
  it('renders a human-checkable verification code derived from pdf_hash', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByText('City Heart Clinic')).toBeInTheDocument())
    expect(screen.getByText('Verification code: A1B2-C3D4-E5F6')).toBeInTheDocument()
  })

  it('renders no verification code line for a legacy prescription with no pdf_hash', async () => {
    render(
      <MockedProvider
        mocks={[{ request: { query: PRINT_QUERY, variables: { id: 'rx-1' } }, result: { data: { printPrescription: { ...PAYLOAD, prescription: { ...PAYLOAD.prescription, pdf_hash: null } } } } }]}
        addTypename={false}
      >
        <MemoryRouter initialEntries={['/prescriptions/rx-1/print']}>
          <Routes><Route path="/prescriptions/:id/print" element={<PrescriptionPrint />} /></Routes>
        </MemoryRouter>
      </MockedProvider>,
    )
    await waitFor(() => expect(screen.getByText('City Heart Clinic')).toBeInTheDocument())
    expect(screen.queryByText(/Verification code/)).not.toBeInTheDocument()
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

  // REQ109
  it('shows a success toast with only the last 2 digits of the phone on a successful share', async () => {
    renderPage([{
      request: { query: SHARE_VIA_WHATSAPP, variables: { id: 'rx-1' } },
      result: { data: { sharePrescriptionViaWhatsapp: { success: true, userErrors: [], phone_last_two: '89' } } },
    }])
    await waitFor(() => expect(screen.getByText('City Heart Clinic')).toBeInTheDocument())
    await userEvent.click(screen.getByRole('button', { name: /Share via WhatsApp/i }))
    await waitFor(() => expect(screen.getByText(/ending in 89/)).toBeInTheDocument())
  })

  it('shows the real error message when the mutation reports success:false', async () => {
    renderPage([{
      request: { query: SHARE_VIA_WHATSAPP, variables: { id: 'rx-1' } },
      result: { data: { sharePrescriptionViaWhatsapp: { success: false, userErrors: [{ message: 'No WhatsApp provider configured for this organization' }], phone_last_two: null } } },
    }])
    await waitFor(() => expect(screen.getByText('City Heart Clinic')).toBeInTheDocument())
    await userEvent.click(screen.getByRole('button', { name: /Share via WhatsApp/i }))
    await waitFor(() => expect(screen.getByText('No WhatsApp provider configured for this organization')).toBeInTheDocument())
  })
})
