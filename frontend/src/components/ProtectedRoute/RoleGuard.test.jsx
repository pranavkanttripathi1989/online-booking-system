import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import RoleGuard, { Forbidden403 } from './RoleGuard'
import { useAuth } from '../../context/AuthContext'

jest.mock('../../context/AuthContext', () => ({
  useAuth: jest.fn(),
}))

function renderGuarded(roles, initialEntry = '/settings') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route element={<RoleGuard roles={roles} />}>
          <Route path="/settings" element={<div>Settings Content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

const managerUser = { email: 'manager@medibook.dev', roles: [{ name: 'manager' }] }

describe('RoleGuard', () => {
  afterEach(() => jest.resetAllMocks())

  it('allows any authenticated user through when no roles are required', () => {
    useAuth.mockReturnValue({ user: managerUser, hasRole: () => true })
    renderGuarded([])
    expect(screen.getByText('Settings Content')).toBeInTheDocument()
  })

  it('defaults roles to [] (allowing any authenticated user) when the prop is omitted entirely', () => {
    useAuth.mockReturnValue({ user: managerUser, hasRole: () => true })
    renderGuarded(undefined)
    expect(screen.getByText('Settings Content')).toBeInTheDocument()
  })

  it('renders the protected content when the user has one of the required roles', () => {
    useAuth.mockReturnValue({
      user: managerUser,
      hasRole: (role) => managerUser.roles.some((r) => r.name === role),
    })
    renderGuarded(['admin', 'manager'])
    expect(screen.getByText('Settings Content')).toBeInTheDocument()
  })

  it('renders Forbidden403 when the user has none of the required roles', () => {
    useAuth.mockReturnValue({ user: managerUser, hasRole: () => false })
    renderGuarded(['admin', 'super_admin'])
    expect(screen.queryByText('Settings Content')).not.toBeInTheDocument()
    expect(screen.getByText('Access Forbidden')).toBeInTheDocument()
    // SUG-AUTH-012: shows the caller's real role and the path they tried to reach.
    expect(screen.getByText('manager')).toBeInTheDocument()
    expect(screen.getByText(/\/settings/)).toBeInTheDocument()
  })
})

describe('Forbidden403', () => {
  afterEach(() => jest.resetAllMocks())

  it('renders "unknown" when no user is present', () => {
    useAuth.mockReturnValue({ user: null })
    render(
      <MemoryRouter initialEntries={['/some/page']}>
        <Forbidden403 />
      </MemoryRouter>,
    )
    expect(screen.getByText(/unknown/)).toBeInTheDocument()
    // The "Signed in as" chip only renders when a user is present.
    expect(screen.queryByText('Signed in as:')).not.toBeInTheDocument()
  })

  it('"Go Back" navigates back in history', () => {
    useAuth.mockReturnValue({ user: managerUser })
    const backSpy = jest.spyOn(window.history, 'back').mockImplementation(() => {})
    render(
      <MemoryRouter initialEntries={['/some/page']}>
        <Forbidden403 />
      </MemoryRouter>,
    )
    fireEvent.click(screen.getByText('Go Back'))
    expect(backSpy).toHaveBeenCalledTimes(1)
    backSpy.mockRestore()
  })
})
