import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { MockedProvider } from '@apollo/client/testing'
import { HelmetProvider } from 'react-helmet-async'
import { SnackbarProvider } from 'notistack'
import { LocalizationProvider } from '@mui/x-date-pickers'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import EditPatientPage from './EditPatientPage'
import { PATIENT_DETAIL_QUERY } from '../../graphql/queries'

// DATA-13 — this page previously fell back to MOCK_EDIT_PATIENTS/
// MOCK_EDIT_DEFAULT whenever a real query returned a falsy patient, with
// no distinction between a genuine error and a real, successful "no such
// patient" result (data.patient: null) — and no not-found guard at all,
// so the latter case rendered an infinite skeleton with a fabricated
// default form quietly seeded underneath it. A save from there would
// overwrite whichever real patient this id happens to belong to.

const PATIENT_ID = 'patient-real-1'

function patientResult(overrides = {}) {
  return {
    __typename: 'Patient',
    id: PATIENT_ID,
    first_name: 'Real',
    last_name: 'Patient',
    full_name: 'Real Patient',
    email: 'real@example.com',
    phone: '9000000000',
    date_of_birth: '1990-01-01',
    gender: 'male',
    address: '1 Real Street',
    notes: null,
    created_at: '2026-01-01T00:00:00.000Z',
    appointments: { __typename: 'AppointmentPaginated', data: [], paginatorInfo: { __typename: 'PaginatorInfo', total: 0, hasMorePages: false } },
    ...overrides,
  }
}

function renderPage(mocks) {
  return render(
    <HelmetProvider>
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <SnackbarProvider>
          <MemoryRouter initialEntries={[`/patients/${PATIENT_ID}/edit`]}>
            <MockedProvider mocks={mocks} addTypename={true}>
              <Routes>
                <Route path="/patients/:id/edit" element={<EditPatientPage />} />
              </Routes>
            </MockedProvider>
          </MemoryRouter>
        </SnackbarProvider>
      </LocalizationProvider>
    </HelmetProvider>,
  )
}

describe('patients/EditPatientPage', () => {
  it('renders the real fetched patient, never a fabricated default', async () => {
    const mocks = [{ request: { query: PATIENT_DETAIL_QUERY, variables: { id: PATIENT_ID } }, result: { data: { patient: patientResult() } } }]
    renderPage(mocks)
    await waitFor(() => expect(screen.getByDisplayValue('Real')).toBeInTheDocument())
    expect(screen.getByDisplayValue('real@example.com')).toBeInTheDocument()
  })

  it('a genuinely nonexistent patient (real success, patient: null) shows a not-found state, never a fabricated default record', async () => {
    const mocks = [{ request: { query: PATIENT_DETAIL_QUERY, variables: { id: PATIENT_ID } }, result: { data: { patient: null } } }]
    renderPage(mocks)
    await waitFor(() => expect(screen.getByText('Patient not found')).toBeInTheDocument())
    expect(screen.queryByDisplayValue('Emily')).not.toBeInTheDocument()
  })
})
