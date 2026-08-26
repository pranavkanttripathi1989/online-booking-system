import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { MockedProvider } from '@apollo/client/testing'
import { HelmetProvider } from 'react-helmet-async'
import { gql } from '@apollo/client'
import ResetPasswordPage from './reset-password'
import { expectNoA11yViolations } from '../../test/a11y'

const RESET_PASSWORD_MUTATION = gql`
  mutation ResetPassword($input: ResetPasswordInput!) {
    resetPassword(input: $input) {
      success
      message
    }
  }
`

function renderPage({ path = '/reset-password?token=real-token', mocks = [] } = {}) {
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[path]}>
        <MockedProvider mocks={mocks} addTypename={false}>
          <ResetPasswordPage />
        </MockedProvider>
      </MemoryRouter>
    </HelmetProvider>,
  )
}

describe('reset-password (BUG022)', () => {
  it('shows the invalid-link state when no token is present, not a form', () => {
    renderPage({ path: '/reset-password' })
    expect(screen.getByText('This link is invalid')).toBeInTheDocument()
    expect(screen.queryByLabelText('New Password')).not.toBeInTheDocument()
  })

  it('submits the real mutation with the token and new password, then shows success', async () => {
    const mocks = [
      {
        request: { query: RESET_PASSWORD_MUTATION, variables: { input: { token: 'real-token', new_password: 'NewPass123' } } },
        result: { data: { resetPassword: { success: true, message: null } } },
      },
    ]
    renderPage({ mocks })

    fireEvent.change(screen.getByLabelText(/^New Password/), { target: { value: 'NewPass123' } })
    fireEvent.change(screen.getByLabelText(/^Confirm New Password/), { target: { value: 'NewPass123' } })
    fireEvent.click(screen.getByRole('button', { name: 'Reset Password' }))

    await waitFor(() => expect(screen.getByText('Password updated')).toBeInTheDocument())
  })

  it('blocks submission client-side when the password is too short', () => {
    renderPage()
    fireEvent.change(screen.getByLabelText(/^New Password/), { target: { value: 'short1A' } })
    fireEvent.change(screen.getByLabelText(/^Confirm New Password/), { target: { value: 'short1A' } })
    fireEvent.click(screen.getByRole('button', { name: 'Reset Password' }))
    expect(screen.getByText('New password must be at least 8 characters.')).toBeInTheDocument()
  })

  it('blocks submission client-side when the passwords do not match', () => {
    renderPage()
    fireEvent.change(screen.getByLabelText(/^New Password/), { target: { value: 'NewPass123' } })
    fireEvent.change(screen.getByLabelText(/^Confirm New Password/), { target: { value: 'Different123' } })
    fireEvent.click(screen.getByRole('button', { name: 'Reset Password' }))
    expect(screen.getByText('Passwords do not match.')).toBeInTheDocument()
  })

  it('surfaces the real backend message for an invalid or expired token', async () => {
    const mocks = [
      {
        request: { query: RESET_PASSWORD_MUTATION, variables: { input: { token: 'real-token', new_password: 'NewPass123' } } },
        result: { data: { resetPassword: { success: false, message: 'Invalid or expired reset token' } } },
      },
    ]
    renderPage({ mocks })

    fireEvent.change(screen.getByLabelText(/^New Password/), { target: { value: 'NewPass123' } })
    fireEvent.change(screen.getByLabelText(/^Confirm New Password/), { target: { value: 'NewPass123' } })
    fireEvent.click(screen.getByRole('button', { name: 'Reset Password' }))

    await waitFor(() => expect(screen.getByText('Invalid or expired reset token')).toBeInTheDocument())
  })
})

// P1-03 (CI-7) — a guest-accessible auth screen, no login required to reach it.
describe('reset-password — accessibility', () => {
  it('has zero axe-core violations on the real reset form', async () => {
    const { container } = renderPage()
    await screen.findByLabelText(/^New Password/)
    await expectNoA11yViolations(container)
  })
})
