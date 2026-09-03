import { render, screen, waitFor, fireEvent, act } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { MockedProvider } from '@apollo/client/testing'
import { gql } from '@apollo/client'
import CheckinPage from './checkin'
import { expectNoA11yViolations } from '../../test/a11y'

// Re-declared to match checkin.jsx's own gql document exactly (query AST
// equality), same convention as every other page test in this codebase.
const CHECK_IN_WITH_QR_TOKEN = gql`
  mutation CheckInWithQrToken($token: String!) {
    checkInWithQrToken(token: $token) {
      id
      status
    }
  }
`

function renderAt(path, mocks = []) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <MockedProvider mocks={mocks} addTypename={false}>
        <Routes>
          <Route path="/checkin/:token" element={<CheckinPage />} />
          <Route path="/checkin" element={<CheckinPage />} />
        </Routes>
      </MockedProvider>
    </MemoryRouter>,
  )
}

describe('checkin — personal phone-scan flow (REQ107, /checkin/:token)', () => {
  it('fires the mutation immediately from the URL token and shows success', async () => {
    const mocks = [
      {
        request: { query: CHECK_IN_WITH_QR_TOKEN, variables: { token: 'real-token' } },
        result: { data: { checkInWithQrToken: { id: 'appt-1', status: 'checked_in' } } },
      },
    ]
    renderAt('/checkin/real-token', mocks)
    await waitFor(() => expect(screen.getByText("You're checked in")).toBeInTheDocument())
  })

  it('surfaces the real backend error for an expired token', async () => {
    const mocks = [
      {
        request: { query: CHECK_IN_WITH_QR_TOKEN, variables: { token: 'stale-token' } },
        error: new Error('This check-in link has expired, please see reception'),
      },
    ]
    renderAt('/checkin/stale-token', mocks)
    await waitFor(() => expect(screen.getByText("Couldn't check you in")).toBeInTheDocument())
  })
})

describe('checkin — kiosk mode (P2-15/REQ186, bare /checkin)', () => {
  function getScannerInput(container) {
    return container.querySelector('input[aria-hidden="true"]')
  }

  it('shows the idle scan-prompt screen with no token in the URL', () => {
    const { container } = renderAt('/checkin')
    expect(screen.getByText('Scan your appointment QR code')).toBeInTheDocument()
    expect(getScannerInput(container)).toBeInTheDocument()
  })

  it('extracts the token from a scanned full URL and checks in', async () => {
    const mocks = [
      {
        request: { query: CHECK_IN_WITH_QR_TOKEN, variables: { token: 'kiosk-token' } },
        result: { data: { checkInWithQrToken: { id: 'appt-2', status: 'checked_in' } } },
      },
    ]
    const { container } = renderAt('/checkin', mocks)
    const input = getScannerInput(container)

    fireEvent.change(input, { target: { value: 'https://clinic.example/checkin/kiosk-token' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    await waitFor(() => expect(screen.getByText("You're checked in")).toBeInTheDocument())
  })

  it('extracts the token from a bare scanned token string', async () => {
    const mocks = [
      {
        request: { query: CHECK_IN_WITH_QR_TOKEN, variables: { token: 'bare-token-123' } },
        result: { data: { checkInWithQrToken: { id: 'appt-3', status: 'checked_in' } } },
      },
    ]
    const { container } = renderAt('/checkin', mocks)
    const input = getScannerInput(container)

    fireEvent.change(input, { target: { value: 'bare-token-123' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    await waitFor(() => expect(screen.getByText("You're checked in")).toBeInTheDocument())
  })

  it('shows the real backend error for an already-used token', async () => {
    const mocks = [
      {
        request: { query: CHECK_IN_WITH_QR_TOKEN, variables: { token: 'used-token' } },
        error: new Error('This check-in link has already been used'),
      },
    ]
    const { container } = renderAt('/checkin', mocks)
    const input = getScannerInput(container)

    fireEvent.change(input, { target: { value: 'used-token' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    await waitFor(() => expect(screen.getByText("Couldn't check you in")).toBeInTheDocument())
  })

  it('resets to the idle screen after showing a result, for the next patient', async () => {
    jest.useFakeTimers({ legacyFakeTimers: false })
    const mocks = [
      {
        request: { query: CHECK_IN_WITH_QR_TOKEN, variables: { token: 'reset-token' } },
        result: { data: { checkInWithQrToken: { id: 'appt-4', status: 'checked_in' } } },
      },
    ]
    const { container } = renderAt('/checkin', mocks)
    const input = getScannerInput(container)

    fireEvent.change(input, { target: { value: 'reset-token' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    await waitFor(() => expect(screen.getByText("You're checked in")).toBeInTheDocument())

    await act(async () => {
      jest.advanceTimersByTime(6000)
    })

    expect(screen.getByText('Scan your appointment QR code')).toBeInTheDocument()
    jest.useRealTimers()
  })

  it('ignores an empty scan (Enter with nothing typed)', () => {
    const { container } = renderAt('/checkin')
    const input = getScannerInput(container)
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(screen.getByText('Scan your appointment QR code')).toBeInTheDocument()
  })
})

describe('checkin — accessibility', () => {
  it('has zero axe-core violations on the kiosk idle screen', async () => {
    const { container } = renderAt('/checkin')
    await expectNoA11yViolations(container)
  })
})
