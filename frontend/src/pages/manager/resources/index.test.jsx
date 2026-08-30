import { render, screen, waitFor } from '@testing-library/react'
import { MockedProvider } from '@apollo/client/testing'
import { gql } from '@apollo/client'
import ManagerResources from './index'

// BUG062 — resources.resolver.ts's own read query (resources) allows staff
// too, so the page now self-gates its write actions on a real role check
// (canManage) instead of assuming every caller can manage resources.
// Mocked the same way admin/Departments.test.jsx already does for the
// identical pattern — useAuth() throws outside a real AuthProvider, which
// this file's own MockedProvider-only withProviders() doesn't supply.
jest.mock('../../../context/AuthContext', () => ({
  useAuth: jest.fn(),
}))
import { useAuth } from '../../../context/AuthContext'

// Re-declares the page's own internal, unexported query documents verbatim,
// matching this codebase's own established convention (see
// patient/Appointments.test.jsx's header note on the same pattern).
const GET_RESOURCES = gql`
  query GetResources($clinic_id: ID) {
    resources(clinic_id: $clinic_id) {
      id
      name
      type
      is_bookable
      clinic {
        id
        name
      }
    }
  }
`
const GET_CLINICS = gql`
  query GetResourcesClinics {
    clinics {
      id
      name
    }
  }
`

function withProviders(mocks, children) {
  return (
    <MockedProvider mocks={mocks} addTypename={false}>
      {children}
    </MockedProvider>
  )
}

const resourceRow = {
  id: 'res-1',
  name: 'ECG Machine',
  type: 'equipment',
  is_bookable: true,
  clinic: { id: 'clinic-a', name: 'MG Road Clinic' },
}

const mocks = [
  { request: { query: GET_CLINICS }, result: { data: { clinics: [{ id: 'clinic-a', name: 'MG Road Clinic' }] } } },
  { request: { query: GET_RESOURCES }, result: { data: { resources: [resourceRow] } } },
]

describe('manager/resources/index', () => {
  it('a manager sees the resource and its Add/Edit/Delete controls', async () => {
    useAuth.mockReturnValue({ hasRole: (r) => r === 'manager' })
    render(withProviders(mocks, <ManagerResources />))
    await waitFor(() => expect(screen.getByText('ECG Machine')).toBeInTheDocument())
    expect(screen.getByRole('button', { name: 'Add Resource' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Edit resource ECG Machine' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Delete resource ECG Machine' })).toBeInTheDocument()
  })

  it('a staff caller sees the resource but not the Add/Edit/Delete controls (SEC-18)', async () => {
    useAuth.mockReturnValue({ hasRole: (r) => r === 'staff' })
    render(withProviders(mocks, <ManagerResources />))
    await waitFor(() => expect(screen.getByText('ECG Machine')).toBeInTheDocument())
    expect(screen.queryByRole('button', { name: 'Add Resource' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Edit resource ECG Machine' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Delete resource ECG Machine' })).not.toBeInTheDocument()
  })
})
