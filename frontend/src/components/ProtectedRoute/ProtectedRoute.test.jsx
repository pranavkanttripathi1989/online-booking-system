import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import ProtectedRoute from './ProtectedRoute'
import { useAuth } from '../../context/AuthContext'

jest.mock('../../context/AuthContext', () => ({
  useAuth: jest.fn(),
}))

function renderGuarded() {
  return render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <Routes>
        <Route path="/login" element={<div>Login Page</div>} />
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<div>Dashboard Content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

describe('ProtectedRoute', () => {
  afterEach(() => jest.resetAllMocks())

  it('shows a loading state while the session is being checked', () => {
    useAuth.mockReturnValue({ isAuthenticated: false, isLoading: true })
    renderGuarded()
    expect(screen.getByText('Checking your session…')).toBeInTheDocument()
    expect(screen.queryByText('Dashboard Content')).not.toBeInTheDocument()
  })

  it('redirects to /login when not authenticated', () => {
    useAuth.mockReturnValue({ isAuthenticated: false, isLoading: false })
    renderGuarded()
    expect(screen.getByText('Login Page')).toBeInTheDocument()
    expect(screen.queryByText('Dashboard Content')).not.toBeInTheDocument()
  })

  it('renders the protected content when authenticated', () => {
    useAuth.mockReturnValue({ isAuthenticated: true, isLoading: false })
    renderGuarded()
    expect(screen.getByText('Dashboard Content')).toBeInTheDocument()
  })
})
