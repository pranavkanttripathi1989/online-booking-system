import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { MockedProvider } from '@apollo/client/testing'
import { HelmetProvider } from 'react-helmet-async'
import { SnackbarProvider } from 'notistack'
import userEvent from '@testing-library/user-event'
import { CreateUserPage, EditUserPage } from './form'
import { CREATE_USER_MUTATION } from '../../../graphql/mutations'
import { ROLES_QUERY } from '../../../graphql/queries'
import { gql } from '@apollo/client'

// BUG058-sibling gaps this pass fixed:
// - UserInput.role_ids is a required backend field; sending `undefined` for
//   an empty selection stripped the key and the mutation was rejected at
//   variable-coercion time before the resolver ever ran. Fixed to always
//   send the real array, even when empty.
// - EditUserPage had no not-found guard: any falsy getUser result (a real
//   error OR a genuine "no such user") fell back to MOCK_USER_STORE or a
//   blank form, letting a save silently target/overwrite the wrong record.

const rolesMock = {
  request: { query: ROLES_QUERY },
  result: { data: { roles: [{ __typename: 'AppRole', id: 'role-1', name: 'Manager', description: null }] } },
}

function renderCreate(mocks) {
  return render(
    <HelmetProvider>
      <SnackbarProvider>
        <MemoryRouter>
          <MockedProvider mocks={mocks} addTypename={true}>
            <CreateUserPage />
          </MockedProvider>
        </MemoryRouter>
      </SnackbarProvider>
    </HelmetProvider>,
  )
}

describe('admin/users/form — CreateUserPage', () => {
  it('submits role_ids as an empty array, not undefined, when no role is selected', async () => {
    const createMock = {
      request: {
        query: CREATE_USER_MUTATION,
        variables: { input: { name: 'New User', email: 'new@example.com', password: 'password123', role_ids: [] } },
      },
      result: { data: { createUser: { __typename: 'AdminUser', id: 'u1', name: 'New User', email: 'new@example.com', roles: [] } } },
    }
    renderCreate([rolesMock, createMock])
    await waitFor(() => expect(screen.getByLabelText('Full Name *')).toBeInTheDocument())
    await userEvent.type(screen.getByLabelText('Full Name *'), 'New User')
    await userEvent.type(screen.getByLabelText('Email *'), 'new@example.com')
    await userEvent.type(screen.getByLabelText('Password *'), 'password123')
    fireEvent.click(screen.getByRole('button', { name: 'Create User' }))
    // MockedProvider only resolves this mock if the variables (role_ids: [])
    // match exactly -- a stale `undefined` send would leave this pending
    // and the assertion below would time out instead of passing.
    await waitFor(() => expect(screen.getByText('User created successfully')).toBeInTheDocument())
  }, 15000)
})

const GET_USER_BY_ID = gql`
  query GetUserById($id: ID!) {
    getUser(id: $id) {
      id
      firstName
      lastName
      email
      isActive
      roles {
        id
        name
        code
      }
    }
  }
`
const USER_ID = '1'

function renderEdit(mocks) {
  return render(
    <HelmetProvider>
      <SnackbarProvider>
        <MemoryRouter initialEntries={[`/admin/users/${USER_ID}/edit`]}>
          <MockedProvider mocks={mocks} addTypename={true}>
            <Routes>
              <Route path="/admin/users/:id/edit" element={<EditUserPage />} />
            </Routes>
          </MockedProvider>
        </MemoryRouter>
      </SnackbarProvider>
    </HelmetProvider>,
  )
}

describe('admin/users/form — EditUserPage', () => {
  it('renders the real fetched user, never MOCK_USER_STORE', async () => {
    const mocks = [
      {
        request: { query: GET_USER_BY_ID, variables: { id: USER_ID } },
        result: {
          data: {
            getUser: { __typename: 'AdminUser', id: USER_ID, firstName: 'Real', lastName: 'User', email: 'real@example.com', isActive: true, roles: [] },
          },
        },
      },
      rolesMock,
    ]
    renderEdit(mocks)
    await waitFor(() => expect(screen.getByDisplayValue('Real User')).toBeInTheDocument())
    expect(screen.queryByDisplayValue('Dr. Sarah Chen')).not.toBeInTheDocument()
  })

  it('a genuinely nonexistent user (real success, getUser: null) shows a not-found state, never MOCK_USER_STORE data', async () => {
    const mocks = [{ request: { query: GET_USER_BY_ID, variables: { id: USER_ID } }, result: { data: { getUser: null } } }]
    renderEdit(mocks)
    await waitFor(() => expect(screen.getByText('User not found')).toBeInTheDocument())
    expect(screen.queryByDisplayValue('Dr. Sarah Chen')).not.toBeInTheDocument()
  })
})
