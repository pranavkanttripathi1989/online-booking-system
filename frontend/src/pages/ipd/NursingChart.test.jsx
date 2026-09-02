import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { MockedProvider } from '@apollo/client/testing'
import { gql } from '@apollo/client'
import NursingChart from './NursingChart'

// REQ179 (IPD slice 2) — first coverage for the nursing chart page: real
// admission-header rendering and the vitals tab's own real data (not mock).
// Retroactive — this page shipped without a test file in the original
// slice-2 pass; closed here rather than left silently missing.

const ADMISSION_ID = 'adm-1'

const ADMISSION_HEADER_QUERY = gql`
  query NursingChartAdmission($id: ID!) {
    admission(id: $id) {
      id admission_number status
      patient { id full_name gender date_of_birth }
      current_bed { bed_id bed_number ward_id ward_name }
      attending_clinician { id full_name }
      is_critical is_mlc
    }
  }
`
const VITALS_QUERY = gql`
  query NursingChartVitals($admission_id: ID!) {
    admissionVitals(admission_id: $admission_id) { id code value unit recorded_at shift }
  }
`

const admissionA = {
  __typename: 'Admission',
  id: ADMISSION_ID,
  admission_number: 'ADM/2026-27/00001',
  status: 'admitted',
  patient: { __typename: 'AdmissionPatient', id: 'pat-1', full_name: 'Jane Doe', gender: 'female', date_of_birth: '1985-01-01' },
  current_bed: { __typename: 'AdmissionBedPlacement', bed_id: 'bed-1', bed_number: 'A-01', ward_id: 'ward-1', ward_name: 'Ward A' },
  attending_clinician: { __typename: 'AdmissionClinician', id: 'clin-1', full_name: 'Sam Rao' },
  is_critical: false,
  is_mlc: false,
}

function baseMocks(vitals = []) {
  return [
    { request: { query: ADMISSION_HEADER_QUERY, variables: { id: ADMISSION_ID } }, result: { data: { admission: admissionA } } },
    { request: { query: VITALS_QUERY, variables: { admission_id: ADMISSION_ID } }, result: { data: { admissionVitals: vitals.map((v) => ({ __typename: 'Vital', ...v })) } } },
  ]
}

function renderPage(mocks) {
  return render(
    <MemoryRouter initialEntries={[`/ipd/chart/${ADMISSION_ID}`]}>
      <MockedProvider mocks={mocks} addTypename={false}>
        <Routes>
          <Route path="/ipd/chart/:admissionId" element={<NursingChart />} />
        </Routes>
      </MockedProvider>
    </MemoryRouter>,
  )
}

describe('ipd/NursingChart', () => {
  it('renders the real admission header, not mock data', async () => {
    renderPage(baseMocks([]))
    await waitFor(() => expect(screen.getByText('Jane Doe')).toBeInTheDocument())
    expect(screen.getByText(/ADM\/2026-27\/00001/)).toBeInTheDocument()
    expect(screen.getByText(/A-01/)).toBeInTheDocument()
  })

  it('renders a real vitals reading on the default (Vitals) tab', async () => {
    renderPage(
      baseMocks([{ id: 'v1', code: 'pulse_bpm', value: 78, unit: 'bpm', recorded_at: '2026-09-02T08:00:00.000Z', shift: 'morning' }]),
    )
    await waitFor(() => expect(screen.getByText('Jane Doe')).toBeInTheDocument())
    await waitFor(() => expect(screen.getAllByText('78').length).toBeGreaterThan(0))
  })
})
