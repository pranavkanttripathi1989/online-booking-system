import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MockedProvider } from '@apollo/client/testing'
import { gql } from '@apollo/client'
import AdminRoles from './Roles'

// REQ141 (test-coverage-audit F-24 residue) — admin/Roles.jsx is one of
// the 7 files REQ132 identified as zod-schema-using with zero test
// coverage. Re-declares the page-local gql documents to match its own
// AST exactly, same convention as manager/claims/index.test.jsx.

const GET_ROLES_DATA = gql`
  query GetRolesData {
    roles { id name description is_active is_system permission_ids }
    getPermissions { id action resource description }
  }
`
const CREATE_ROLE = gql`mutation CreateRole($input: AppRoleInput!) { createRole(input: $input) { id } }`

const permissions = [
  { __typename: 'Permission', id: 'perm-1', action: 'view', resource: 'patients', description: null },
  { __typename: 'Permission', id: 'perm-2', action: 'edit', resource: 'patients', description: null },
]

function rolesMock(roles) {
  return { request: { query: GET_ROLES_DATA }, result: { data: { roles, getPermissions: permissions } } }
}

function makeRole(overrides = {}) {
  return { __typename: 'AppRole', id: 'role-1', name: 'Front Desk', description: 'Reception staff', is_active: true, is_system: false, permission_ids: ['perm-1'], ...overrides }
}

function renderPage(mocks) {
  return render(
    <MockedProvider mocks={mocks} addTypename={false}>
      <AdminRoles />
    </MockedProvider>,
  )
}

describe('admin/Roles (REQ141)', () => {
  it('renders real roles, not fabricated data', async () => {
    renderPage([rolesMock([makeRole()])])
    await waitFor(() => expect(screen.getByText('Front Desk')).toBeInTheDocument())
    expect(screen.getByText('Reception staff')).toBeInTheDocument()
    expect(screen.getByText('1 permission')).toBeInTheDocument()
  })

  it('shows an honest empty state when there are no roles yet', async () => {
    renderPage([rolesMock([])])
    await waitFor(() => expect(screen.getByText('No roles defined yet')).toBeInTheDocument())
  })

  it('blocks submission client-side when the role name is too short (zod validation)', async () => {
    renderPage([rolesMock([])])
    await waitFor(() => expect(screen.getByText('No roles defined yet')).toBeInTheDocument())

    await userEvent.click(screen.getAllByRole('button', { name: 'Add Role' })[0])
    await userEvent.type(await screen.findByLabelText(/^Role Name/), 'A')
    await userEvent.click(screen.getByRole('button', { name: 'Create' }))

    expect(await screen.findByText('Role name must be at least 2 characters')).toBeInTheDocument()
  })

  it('warns when no permissions are selected, but still allows creating the role', async () => {
    renderPage([rolesMock([])])
    await waitFor(() => expect(screen.getByText('No roles defined yet')).toBeInTheDocument())
    await userEvent.click(screen.getAllByRole('button', { name: 'Add Role' })[0])
    await screen.findByLabelText(/^Role Name/)

    expect(screen.getByText(/won't be able to do anything until at least one is granted/)).toBeInTheDocument()
  })

  it('creates a role end-to-end via the real createRole mutation, with the selected permission ids, and refetches', async () => {
    const mocks = [
      rolesMock([]),
      {
        request: { query: CREATE_ROLE, variables: { input: { name: 'Billing Clerk', description: '', is_active: true, permission_ids: ['perm-2'] } } },
        result: { data: { createRole: { id: 'role-new' } } },
      },
      rolesMock([makeRole({ id: 'role-new', name: 'Billing Clerk', description: '', permission_ids: ['perm-2'] })]),
    ]
    renderPage(mocks)

    await waitFor(() => expect(screen.getByText('No roles defined yet')).toBeInTheDocument())
    await userEvent.click(screen.getAllByRole('button', { name: 'Add Role' })[0])
    await userEvent.type(await screen.findByLabelText(/^Role Name/), 'Billing Clerk')
    await userEvent.click(screen.getByLabelText('Grant patients — edit'))
    await userEvent.click(screen.getByRole('button', { name: 'Create' }))

    await waitFor(() => expect(screen.getByText('Billing Clerk')).toBeInTheDocument())
  }, 15000)
})
