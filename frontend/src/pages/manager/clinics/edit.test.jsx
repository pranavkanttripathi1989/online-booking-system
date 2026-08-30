import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { MockedProvider } from '@apollo/client/testing'
import { HelmetProvider } from 'react-helmet-async'
import { SnackbarProvider } from 'notistack'
import EditClinicPage from './edit'
import { CLINIC_DETAIL_QUERY } from '../../../graphql/queries'

// DATA-13 — this page previously fell back to a fabricated
// DEFAULT_MOCK_CLINIC whenever a real "no such clinic" result came back
// (data.clinic: null), with no not-found guard at all. These tests assert
// the fixed, guarded behavior.

const CLINIC_ID = 'clinic-real-1'

function renderPage(mocks) {
  return render(
    <HelmetProvider>
      <SnackbarProvider>
        <MemoryRouter initialEntries={[`/manager/clinics/${CLINIC_ID}/edit`]}>
          <MockedProvider mocks={mocks} addTypename={true}>
            <Routes>
              <Route path="/manager/clinics/:id/edit" element={<EditClinicPage />} />
            </Routes>
          </MockedProvider>
        </MemoryRouter>
      </SnackbarProvider>
    </HelmetProvider>,
  )
}

describe('manager/clinics/edit', () => {
  it('renders the real fetched clinic, never a fabricated default', async () => {
    const mocks = [
      {
        request: { query: CLINIC_DETAIL_QUERY, variables: { id: CLINIC_ID } },
        result: {
          data: {
            clinic: {
              __typename: 'Clinic',
              id: CLINIC_ID,
              name: 'Real Clinic',
              address: '1 Real Street',
              city: 'Bengaluru',
              postcode: '560001',
              state: 'Karnataka',
              gstin: null,
              phone: '9000000000',
              email: 'real@clinic.example',
              timezone: 'Asia/Kolkata',
              is_active: true,
            },
          },
        },
      },
    ]
    renderPage(mocks)
    await waitFor(() => expect(screen.getByDisplayValue('Real Clinic')).toBeInTheDocument())
    expect(screen.getByDisplayValue('1 Real Street')).toBeInTheDocument()
  })

  it('a genuinely nonexistent clinic (real success, clinic: null) shows a not-found state, never a fabricated default record', async () => {
    const mocks = [
      { request: { query: CLINIC_DETAIL_QUERY, variables: { id: CLINIC_ID } }, result: { data: { clinic: null } } },
    ]
    renderPage(mocks)
    await waitFor(() => expect(screen.getByText('Clinic not found')).toBeInTheDocument())
    expect(screen.queryByDisplayValue('Unknown Clinic')).not.toBeInTheDocument()
  })
})
