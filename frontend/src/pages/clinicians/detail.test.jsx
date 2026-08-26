import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { MockedProvider } from '@apollo/client/testing'
import { SnackbarProvider } from 'notistack'
import { gql } from '@apollo/client'
import ClinicianDetailPage from './detail'
import { useAuth } from '../../hooks/useAuth'
import { CLINICIAN_DETAIL_QUERY } from '../../graphql/queries'

jest.mock('../../hooks/useAuth', () => ({
  useAuth: jest.fn(),
}))

// A-4 (project-plans/08-integration-gap-analysis.md) — real-mutation
// regression coverage for the new verification chip/actions.
const UPDATE_CLINICIAN_VERIFICATION = gql`
  mutation UpdateClinicianVerification($id: ID!, $status: String!) {
    updateClinicianVerification(id: $id, status: $status) {
      id
      verification_status
      verified_at
    }
  }
`

const CLINICIAN_ID = 'cln-1'

function clinician(overrides = {}) {
  return {
    __typename: 'Clinician',
    id: CLINICIAN_ID,
    first_name: 'Sarah',
    last_name: 'Mitchell',
    full_name: 'Sarah Mitchell',
    bio: null,
    avatar_url: null,
    consultation_fee: 500,
    is_active: true,
    gender: null,
    languages: [],
    clinician_type: { __typename: 'ClinicianType', id: 'ct-1', name: 'General Physician', description: null },
    clinics: [],
    services: [],
    registration_number: 'MCI-12345',
    medical_council: 'Medical Council of India',
    verification_status: 'pending',
    verified_at: null,
    availability_templates: [],
    ...overrides,
  }
}

function detailMock(c) {
  return { request: { query: CLINICIAN_DETAIL_QUERY, variables: { id: CLINICIAN_ID } }, result: { data: { clinician: c } } }
}

function renderPage(mocks, user) {
  useAuth.mockReturnValue({ user })
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[`/clinicians/${CLINICIAN_ID}`]}>
        <SnackbarProvider>
          <MockedProvider mocks={mocks}>
            <Routes>
              <Route path="/clinicians/:id" element={<ClinicianDetailPage />} />
            </Routes>
          </MockedProvider>
        </SnackbarProvider>
      </MemoryRouter>
    </HelmetProvider>,
  )
}

describe('clinicians/detail.jsx — verification (A-4)', () => {
  it('shows the verification status chip and registration details', async () => {
    renderPage([detailMock(clinician())], { roles: [{ name: 'admin' }] })
    await waitFor(() => expect(screen.getByText('Sarah Mitchell')).toBeInTheDocument())
    expect(screen.getByText('pending')).toBeInTheDocument()
    expect(screen.getByText(/MCI-12345/)).toBeInTheDocument()
  })

  it('hides Verify/Reject actions for a non-verifier role', async () => {
    renderPage([detailMock(clinician())], { roles: [{ name: 'manager' }] })
    await waitFor(() => expect(screen.getByText('Sarah Mitchell')).toBeInTheDocument())
    expect(screen.queryByRole('button', { name: 'Verify' })).not.toBeInTheDocument()
  })

  it('lets an admin verify a pending clinician and refetches the result', async () => {
    const verified = clinician({ verification_status: 'verified', verified_at: '2026-08-25T10:00:00.000Z' })
    renderPage(
      [
        detailMock(clinician()),
        {
          request: { query: UPDATE_CLINICIAN_VERIFICATION, variables: { id: CLINICIAN_ID, status: 'verified' } },
          result: {
            data: {
              updateClinicianVerification: {
                __typename: 'Clinician',
                id: CLINICIAN_ID,
                verification_status: 'verified',
                verified_at: '2026-08-25T10:00:00.000Z',
              },
            },
          },
        },
        detailMock(verified),
      ],
      { roles: [{ name: 'admin' }] },
    )

    await waitFor(() => expect(screen.getByText('Sarah Mitchell')).toBeInTheDocument())
    await userEvent.click(screen.getByRole('button', { name: 'Verify' }))

    await waitFor(() => expect(screen.getByText(/marked verified/i)).toBeInTheDocument())
    await waitFor(() => expect(within(screen.getByText('Sarah Mitchell').closest('div')).queryByText('pending')).not.toBeInTheDocument())
  })

  it('surfaces a real mutation error via a snackbar, not a silent failure', async () => {
    const { GraphQLError } = require('graphql')
    renderPage(
      [
        detailMock(clinician()),
        {
          request: { query: UPDATE_CLINICIAN_VERIFICATION, variables: { id: CLINICIAN_ID, status: 'verified' } },
          result: { errors: [new GraphQLError('Not authorized')] },
        },
      ],
      { roles: [{ name: 'admin' }] },
    )

    await waitFor(() => expect(screen.getByText('Sarah Mitchell')).toBeInTheDocument())
    await userEvent.click(screen.getByRole('button', { name: 'Verify' }))

    await waitFor(() => expect(screen.getByText('Not authorized')).toBeInTheDocument())
  })
})
