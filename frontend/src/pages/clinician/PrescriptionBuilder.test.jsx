import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { MockedProvider } from '@apollo/client/testing'
import { SnackbarProvider } from 'notistack'
import { gql } from '@apollo/client'
import PrescriptionBuilder from './PrescriptionBuilder'

// P1-12 (FR-AI-04, "Voice-to-Rx") — re-declared to match
// PrescriptionBuilder.jsx's own gql documents exactly (query AST equality).
const PRESCRIPTION_SETS_QUERY = gql`
  query PrescriptionSets {
    prescriptionSets {
      id
      name
      specialty
    }
  }
`

// REQ159 (P2-07) — re-declared to match PrescriptionBuilder.jsx's own
// gql document exactly.
const PATIENT_ALLERGY_BANNER = gql`
  query PatientAllergyBanner($patient_id: ID!) {
    patientAllergyBanner(patient_id: $patient_id) {
      id
      text
      icd10_code
    }
  }
`
const ENCOUNTER_ID = 'enc-1'
const PATIENT_ID = 'pat-1'

function allergyMock(allergies) {
  return { request: { query: PATIENT_ALLERGY_BANNER, variables: { patient_id: PATIENT_ID } }, result: { data: { patientAllergyBanner: allergies } } }
}

function renderAt(search, state, mocks = []) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/clinician/prescriptions/new', search, state }]}>
      <SnackbarProvider>
        <MockedProvider
          mocks={[{ request: { query: PRESCRIPTION_SETS_QUERY }, result: { data: { prescriptionSets: [] } } }, ...mocks]}
        >
          <Routes>
            <Route path="/clinician/prescriptions/new" element={<PrescriptionBuilder />} />
          </Routes>
        </MockedProvider>
      </SnackbarProvider>
    </MemoryRouter>,
  )
}

describe('PrescriptionBuilder — Voice-to-Rx import (P1-12)', () => {
  const search = `?encounterId=${ENCOUNTER_ID}&patientId=${PATIENT_ID}`

  it('pre-fills a matched drug line and shows the import banner', async () => {
    renderAt(search, {
      aiDraftItems: [
        { drug_name_text: 'amoxicillin', drug_id: 'drug-1', matched_drug_name: 'Amoxicillin 500mg', dose: '500mg', frequency: 'BD', duration_days: 5 },
      ],
    })

    await waitFor(() => expect(screen.getByText(/Imported 1 draft item from AI Scribe/)).toBeInTheDocument())
    expect(screen.getByDisplayValue('500mg')).toBeInTheDocument()
  })

  it('leaves an unmatched drug for manual search, with a note explaining why', async () => {
    renderAt(search, {
      aiDraftItems: [{ drug_name_text: 'paracetamol', drug_id: null, matched_drug_name: null, dose: '500mg', frequency: 'BD', duration_days: 5 }],
    })

    await waitFor(() => expect(screen.getByText(/Imported 1 draft item from AI Scribe/)).toBeInTheDocument())
    expect(screen.getByDisplayValue(/AI-transcribed as "paracetamol"/)).toBeInTheDocument()
  })

  it('never issues an unreviewed item — the free-text-only line stays invalid until a real drug is picked', async () => {
    renderAt(search, {
      aiDraftItems: [{ drug_name_text: 'paracetamol', drug_id: null, matched_drug_name: null, dose: '500mg', frequency: 'BD', duration_days: 5 }],
    })

    await waitFor(() => expect(screen.getByText(/Imported 1 draft item from AI Scribe/)).toBeInTheDocument())
    // No drug matched -> no accessible "Issue" affordance can be triggered
    // for this line without the clinician picking a real drug first.
    expect(screen.getByRole('button', { name: /issue/i })).toBeDisabled()
  })

  it('shows no import banner on a normal, non-AI visit to this page', async () => {
    renderAt(search, undefined)
    await waitFor(() => expect(screen.getByText('New Prescription')).toBeInTheDocument())
    expect(screen.queryByText(/Imported \d+ draft item/)).not.toBeInTheDocument()
  })
})

// REQ159 (P2-07) — the client-side mirror of the backend's real allergy
// hard-stop. This is UX only (SEC-18) — the backend rejects the mutation
// regardless; these tests confirm the warning surfaces and the Issue
// button is blocked before a real submit attempt is even made.
describe('PrescriptionBuilder — allergy hard-stop (P2-07)', () => {
  const search = `?encounterId=${ENCOUNTER_ID}&patientId=${PATIENT_ID}`

  it('shows an inline allergy warning and blocks Issue when a picked drug conflicts', async () => {
    renderAt(
      search,
      { aiDraftItems: [{ drug_name_text: 'amoxicillin', drug_id: 'drug-1', matched_drug_name: 'Amoxicillin 500mg', dose: '500mg', frequency: 'BD', duration_days: 5 }] },
      [allergyMock([{ id: 'al-1', text: 'Amoxicillin', icd10_code: null }])],
    )

    await waitFor(() => expect(screen.getByText(/Allergy: Amoxicillin/)).toBeInTheDocument())
    expect(screen.getByText(/conflict with this patient's recorded allergies/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /issue/i })).toBeDisabled()
  })

  it('does not block Issue when the picked drug has no allergy conflict', async () => {
    renderAt(
      search,
      { aiDraftItems: [{ drug_name_text: 'amoxicillin', drug_id: 'drug-1', matched_drug_name: 'Amoxicillin 500mg', dose: '500mg', frequency: 'BD', duration_days: 5 }] },
      [allergyMock([{ id: 'al-1', text: 'Penicillin', icd10_code: null }])],
    )

    await waitFor(() => expect(screen.getByText(/Imported 1 draft item from AI Scribe/)).toBeInTheDocument())
    expect(screen.queryByText(/Allergy:/)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /issue/i })).not.toBeDisabled()
  })
})
