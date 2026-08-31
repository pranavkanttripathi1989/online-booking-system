import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { MockedProvider } from '@apollo/client/testing'
import { SnackbarProvider } from 'notistack'
import { gql } from '@apollo/client'
import PrescriptionPrint, { PRINT_QUERY } from './PrescriptionPrint'

// REQ109
const SHARE_VIA_WHATSAPP = gql`
  mutation SharePrescriptionViaWhatsapp($id: ID!) {
    sharePrescriptionViaWhatsapp(id: $id) {
      success
      userErrors {
        message
      }
      phone_last_two
    }
  }
`

const PAYLOAD = {
  is_reprint: false,
  prescription: {
    id: 'rx-1',
    mode: 'in_person',
    issued_at: '2026-08-24T09:00:00.000Z',
    language: 'en',
    pdf_hash: 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6',
    items: [
      {
        drug_name: 'Amoxicillin',
        dose: '500mg',
        frequency: 'BD',
        route: 'Oral',
        duration_days: 5,
        qty: 10,
        instructions: 'After food',
        substitutable: true,
        composition: null,
      },
    ],
  },
  clinic: {
    name: 'City Heart Clinic',
    logo_url: null,
    contact_phone: '+91 9876543210',
    address: null,
    email: null,
    website: null,
    alternate_phone: null,
    appointment_note: null,
    tagline: null,
    primary_color: null,
    secondary_color: null,
  },
  clinician: { full_name: 'Sarah Mitchell', registration_number: 'REG123', qualifications: 'MBBS' },
  doctors: [{ full_name: 'Sarah Mitchell', qualifications: 'MBBS', specialty_highlights: null, registration_number: 'REG123' }],
  patient: { full_name: 'Anita Sharma', date_of_birth: '1990-01-01', gender: 'female' },
  encounter_context: null,
}

function renderPage(extraMocks = []) {
  return render(
    <MockedProvider
      mocks={[
        { request: { query: PRINT_QUERY, variables: { id: 'rx-1' } }, result: { data: { printPrescription: PAYLOAD } } },
        ...extraMocks,
      ]}
      addTypename={false}
    >
      <SnackbarProvider>
        <MemoryRouter initialEntries={['/prescriptions/rx-1/print']}>
          <Routes>
            <Route path="/prescriptions/:id/print" element={<PrescriptionPrint />} />
          </Routes>
        </MemoryRouter>
      </SnackbarProvider>
    </MockedProvider>,
  )
}

describe('PrescriptionPrint', () => {
  it('renders the letterhead, drug table, and no DUPLICATE watermark on a first view', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByText('City Heart Clinic')).toBeInTheDocument())
    expect(screen.getAllByText('Sarah Mitchell').length).toBeGreaterThan(0) // appears in both the letterhead doctor block and the signature line
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
        mocks={[
          {
            request: { query: PRINT_QUERY, variables: { id: 'rx-1' } },
            result: { data: { printPrescription: { ...PAYLOAD, prescription: { ...PAYLOAD.prescription, pdf_hash: null } } } },
          },
        ]}
        addTypename={false}
      >
        <MemoryRouter initialEntries={['/prescriptions/rx-1/print']}>
          <Routes>
            <Route path="/prescriptions/:id/print" element={<PrescriptionPrint />} />
          </Routes>
        </MemoryRouter>
      </MockedProvider>,
    )
    await waitFor(() => expect(screen.getByText('City Heart Clinic')).toBeInTheDocument())
    expect(screen.queryByText(/Verification code/)).not.toBeInTheDocument()
  })

  it('shows the DUPLICATE watermark when the payload reports a reprint', async () => {
    render(
      <MockedProvider
        mocks={[
          {
            request: { query: PRINT_QUERY, variables: { id: 'rx-1' } },
            result: { data: { printPrescription: { ...PAYLOAD, is_reprint: true } } },
          },
        ]}
        addTypename={false}
      >
        <MemoryRouter initialEntries={['/prescriptions/rx-1/print']}>
          <Routes>
            <Route path="/prescriptions/:id/print" element={<PrescriptionPrint />} />
          </Routes>
        </MemoryRouter>
      </MockedProvider>,
    )
    await waitFor(() => expect(screen.getByText('DUPLICATE')).toBeInTheDocument())
  })

  // REQ109
  it('shows a success toast with only the last 2 digits of the phone on a successful share', async () => {
    renderPage([
      {
        request: { query: SHARE_VIA_WHATSAPP, variables: { id: 'rx-1' } },
        result: { data: { sharePrescriptionViaWhatsapp: { success: true, userErrors: [], phone_last_two: '89' } } },
      },
    ])
    await waitFor(() => expect(screen.getByText('City Heart Clinic')).toBeInTheDocument())
    await userEvent.click(screen.getByRole('button', { name: /Share via WhatsApp/i }))
    await waitFor(() => expect(screen.getByText(/ending in 89/)).toBeInTheDocument())
  })

  // P2-08 (US-RX-07) — the document's own labels (not the toolbar, which
  // stays in the viewer's own UI language) follow the prescription's own
  // `language` field, independent of any app-wide language setting.
  it('renders the document content in Hindi for a Hindi-language prescription, while the toolbar stays in English', async () => {
    render(
      <MockedProvider
        mocks={[
          {
            request: { query: PRINT_QUERY, variables: { id: 'rx-1' } },
            result: { data: { printPrescription: { ...PAYLOAD, prescription: { ...PAYLOAD.prescription, language: 'hi' } } } },
          },
        ]}
        addTypename={false}
      >
        <MemoryRouter initialEntries={['/prescriptions/rx-1/print']}>
          <Routes>
            <Route path="/prescriptions/:id/print" element={<PrescriptionPrint />} />
          </Routes>
        </MemoryRouter>
      </MockedProvider>,
    )
    await waitFor(() => expect(screen.getByText('City Heart Clinic')).toBeInTheDocument())
    // Document content: translated labels and the coded frequency value.
    // The 'hi' bundle loads asynchronously (config.js's lazy per-language
    // backend) -- the component renders the English fallback until it
    // resolves, so this must wait rather than assert instantly.
    // Labels sit alongside a literal ":" as a sibling JSX child of the same
    // <strong> element, so the queryable combined text includes it.
    await waitFor(() => expect(screen.getByText('रोगी:')).toBeInTheDocument())
    expect(screen.getByText('हस्ताक्षर')).toBeInTheDocument()
    expect(screen.getByText('दिन में दो बार')).toBeInTheDocument() // frequency 'BD'
    // Clinician/patient/drug free text is never translated.
    expect(screen.getAllByText('Sarah Mitchell').length).toBeGreaterThan(0) // appears in both the letterhead doctor block and the signature line
    expect(screen.getByText('Amoxicillin')).toBeInTheDocument()
    // Page chrome stays in the viewer's own (English, in this test) UI
    // language regardless of the prescription's own language.
    expect(screen.getByRole('button', { name: 'Print' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Share via WhatsApp/i })).toBeInTheDocument()
  })

  it('shows the real error message when the mutation reports success:false', async () => {
    renderPage([
      {
        request: { query: SHARE_VIA_WHATSAPP, variables: { id: 'rx-1' } },
        result: {
          data: {
            sharePrescriptionViaWhatsapp: {
              success: false,
              userErrors: [{ message: 'No WhatsApp provider configured for this organization' }],
              phone_last_two: null,
            },
          },
        },
      },
    ])
    await waitFor(() => expect(screen.getByText('City Heart Clinic')).toBeInTheDocument())
    await userEvent.click(screen.getByRole('button', { name: /Share via WhatsApp/i }))
    await waitFor(() => expect(screen.getByText('No WhatsApp provider configured for this organization')).toBeInTheDocument())
  })

  // REQ170 -- a clinic with no configured letterhead extras (the pre-REQ170
  // shape) renders exactly as before: no tagline, no footer band, no
  // clinical-content block -- confirmed by their absence, not just by not
  // crashing.
  it('renders no tagline/footer/clinical-content section when the clinic has none configured (regression)', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByText('City Heart Clinic')).toBeInTheDocument())
    expect(screen.queryByText(/ORTHO/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Complaints/)).not.toBeInTheDocument()
    expect(screen.queryByText(/For Appointment/)).not.toBeInTheDocument()
  })

  // REQ170 -- the clinic's configured letterhead doctor roster (tagline +
  // 2 doctors, one with bulleted specialty highlights) plus the footer band.
  it('renders the tagline, both letterhead doctors with their specialty highlights, and the footer band', async () => {
    const payload = {
      ...PAYLOAD,
      clinic: {
        ...PAYLOAD.clinic,
        tagline: 'ORTHO & GYNAE CARE',
        address: '2nd floor, Sai Millennium AS, Pune 411033',
        email: 'clinic@example.test',
        website: 'clinicpune.com',
        alternate_phone: '+91 8956301300',
        appointment_note: 'Sunday by appointment',
      },
      doctors: [
        { full_name: 'Dr. Vijendra Ambatkar', qualifications: 'MBBS D ORTHO (Pune)', specialty_highlights: null, registration_number: null },
        {
          full_name: 'Dr. Vidya Ambatkar',
          qualifications: 'MBBS, DGO, FMAS, FICMCH',
          specialty_highlights: 'Diploma in IVF & Reproductive Medicine\nFellowship in Laparoscopy (Gynaecology)',
          registration_number: 'REG456',
        },
      ],
    }
    render(
      <MockedProvider mocks={[{ request: { query: PRINT_QUERY, variables: { id: 'rx-1' } }, result: { data: { printPrescription: payload } } }]} addTypename={false}>
        <MemoryRouter initialEntries={['/prescriptions/rx-1/print']}>
          <Routes>
            <Route path="/prescriptions/:id/print" element={<PrescriptionPrint />} />
          </Routes>
        </MemoryRouter>
      </MockedProvider>,
    )
    await waitFor(() => expect(screen.getByText('City Heart Clinic')).toBeInTheDocument())
    expect(screen.getByText('ORTHO & GYNAE CARE')).toBeInTheDocument()
    expect(screen.getByText('Dr. Vijendra Ambatkar')).toBeInTheDocument()
    expect(screen.getByText('Dr. Vidya Ambatkar')).toBeInTheDocument()
    expect(screen.getByText('- Diploma in IVF & Reproductive Medicine')).toBeInTheDocument()
    expect(screen.getByText('- Fellowship in Laparoscopy (Gynaecology)')).toBeInTheDocument()
    expect(screen.getByText(/2nd floor, Sai Millennium/)).toBeInTheDocument()
    expect(screen.getByText(/For Appointment/)).toBeInTheDocument()
    expect(screen.getByText(/Sunday by appointment/)).toBeInTheDocument()
  })

  // REQ171 -- the same encounter's own clinical narrative rendered
  // alongside the drug table, plus a drug's own composition line.
  it('renders complaints/vitals/BMI/diagnosis/advice/follow-up and a drug composition line', async () => {
    const payload = {
      ...PAYLOAD,
      prescription: {
        ...PAYLOAD.prescription,
        items: [{ ...PAYLOAD.prescription.items[0], composition: 'Amoxicillin 500mg + Clavulanate 125mg' }],
      },
      encounter_context: {
        complaints: 'Fever and sore throat',
        exam: 'Throat congested',
        diagnosis: 'Acute pharyngitis',
        advice: 'Warm fluids, rest',
        follow_up: '5 days',
        investigations: null,
        bp_systolic: 118,
        bp_diastolic: 76,
        height_cm: 165,
        weight_kg: 60,
        bmi: 22.04,
        lmp_date: null,
        edd: null,
        gestational_age_weeks: null,
        gestational_age_days: null,
      },
    }
    render(
      <MockedProvider mocks={[{ request: { query: PRINT_QUERY, variables: { id: 'rx-1' } }, result: { data: { printPrescription: payload } } }]} addTypename={false}>
        <MemoryRouter initialEntries={['/prescriptions/rx-1/print']}>
          <Routes>
            <Route path="/prescriptions/:id/print" element={<PrescriptionPrint />} />
          </Routes>
        </MemoryRouter>
      </MockedProvider>,
    )
    await waitFor(() => expect(screen.getByText('City Heart Clinic')).toBeInTheDocument())
    expect(screen.getByText(/Fever and sore throat/)).toBeInTheDocument()
    expect(screen.getByText(/Throat congested/)).toBeInTheDocument()
    expect(screen.getByText(/Acute pharyngitis/)).toBeInTheDocument()
    expect(screen.getByText(/Warm fluids, rest/)).toBeInTheDocument()
    expect(screen.getByText(/Next Visit:/)).toBeInTheDocument()
    expect(screen.getByText(/BP 118\/76 mmHg/)).toBeInTheDocument()
    expect(screen.getByText(/BMI 22.04 kg\/m²/)).toBeInTheDocument()
    expect(screen.getByText(/Amoxicillin 500mg \+ Clavulanate 125mg/)).toBeInTheDocument()
  })

  // REQ172 -- obstetric-specific LMP/EDD/Gestational Age line, hand-derived
  // from a real reference prescription (LMP 21-12-2025 -> EDD 27-09-2026,
  // 24 weeks on 07-Jun-2026 -- see backend/src/prescriptions/obstetric-dates.spec.ts).
  it('renders the LMP/EDD/Gestational Age line when set', async () => {
    const payload = {
      ...PAYLOAD,
      encounter_context: {
        complaints: null,
        exam: null,
        diagnosis: null,
        advice: null,
        follow_up: null,
        investigations: null,
        bp_systolic: null,
        bp_diastolic: null,
        height_cm: null,
        weight_kg: null,
        bmi: null,
        lmp_date: '2025-12-21T00:00:00.000Z',
        edd: '2026-09-27T00:00:00.000Z',
        gestational_age_weeks: 24,
        gestational_age_days: 0,
      },
    }
    render(
      <MockedProvider mocks={[{ request: { query: PRINT_QUERY, variables: { id: 'rx-1' } }, result: { data: { printPrescription: payload } } }]} addTypename={false}>
        <MemoryRouter initialEntries={['/prescriptions/rx-1/print']}>
          <Routes>
            <Route path="/prescriptions/:id/print" element={<PrescriptionPrint />} />
          </Routes>
        </MemoryRouter>
      </MockedProvider>,
    )
    await waitFor(() => expect(screen.getByText('City Heart Clinic')).toBeInTheDocument())
    expect(screen.getByText(/Gestational Age 24 weeks/)).toBeInTheDocument()
  })
})
