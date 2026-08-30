import { render, screen, waitFor } from '@testing-library/react'
import { MockedProvider } from '@apollo/client/testing'
import { gql } from '@apollo/client'
import AdminDepartments from './Departments'
import { CLINICS_QUERY } from '../../graphql/queries'

// BUG058-sibling gap: departments.resolver.ts allows `staff` to read
// departments/department, but createDepartment/updateDepartment/
// deleteDepartment are manager/admin/super_admin-only. The frontend route
// was admin/super_admin-only (locking out manager and staff entirely);
// widened in App.jsx, with write controls now self-gated here so a staff
// caller sees the page without controls they cannot use.

jest.mock('../../context/AuthContext', () => ({
  useAuth: jest.fn(),
}))
import { useAuth } from '../../context/AuthContext'

const GET_DEPARTMENTS = gql`
  query GetDepartments {
    departments {
      id
      name
      clinic {
        id
        name
      }
    }
  }
`

const departmentsMock = {
  request: { query: GET_DEPARTMENTS },
  result: { data: { departments: [{ __typename: 'DepartmentType', id: 'd1', name: 'Cardiology', clinic: null }] } },
}
const clinicsMock = { request: { query: CLINICS_QUERY }, result: { data: { clinics: [] } } }

function renderPage() {
  return render(
    <MockedProvider mocks={[departmentsMock, clinicsMock]} addTypename={true}>
      <AdminDepartments />
    </MockedProvider>,
  )
}

describe('admin/Departments — write-action self-gating', () => {
  it('hides Add/Edit/Delete for a staff-only caller', async () => {
    useAuth.mockReturnValue({ hasRole: (r) => r === 'staff' })
    renderPage()
    await waitFor(() => expect(screen.getByText('Cardiology')).toBeInTheDocument())
    expect(screen.queryByText('Add Department')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Edit Cardiology')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Delete Cardiology')).not.toBeInTheDocument()
  })

  it('shows Add/Edit/Delete for a manager caller', async () => {
    useAuth.mockReturnValue({ hasRole: (r) => r === 'manager' })
    renderPage()
    await waitFor(() => expect(screen.getByText('Cardiology')).toBeInTheDocument())
    expect(screen.getByText('Add Department')).toBeInTheDocument()
    expect(screen.getByLabelText('Edit Cardiology')).toBeInTheDocument()
    expect(screen.getByLabelText('Delete Cardiology')).toBeInTheDocument()
  })
})
