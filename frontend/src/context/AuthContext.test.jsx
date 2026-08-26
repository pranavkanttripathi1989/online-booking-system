import { render, screen, waitFor, fireEvent, act, cleanup } from '@testing-library/react'
import { MockedProvider } from '@apollo/client/testing'
import { AuthProvider, useAuth } from './AuthContext'
import { ME_QUERY } from '../graphql/queries'
import { LOGOUT_MUTATION } from '../graphql/mutations'

const ME_RESULT = { me: { id: 'u-1', name: 'Ada Manager', email: 'manager@medibook.dev', roles: [{ name: 'manager' }] } }

const LOGOUT_MOCK = { request: { query: LOGOUT_MUTATION }, result: { data: { logout: true } } }

// A minimal consumer so this exercises the real context/provider wiring, not
// a reach into React internals.
//
// P1-02/SEC-2 — login() no longer takes a token (the httpOnly session
// cookie is already set server-side by the time a caller invokes it); the
// context exposes no `token` field at all anymore, matching that there is
// nothing left for this or any frontend code to read.
function Probe() {
  const {
    user, isAuthenticated, isLoading, login, logout, hasRole, hasPermission,
    isImpersonating, startImpersonating, endImpersonating,
  } = useAuth()
  return (
    <div>
      <div data-testid="isAuthenticated">{String(isAuthenticated)}</div>
      <div data-testid="isLoading">{String(isLoading)}</div>
      <div data-testid="user">{user ? user.email : 'none'}</div>
      <div data-testid="hasRoleManager">{String(hasRole('manager'))}</div>
      <div data-testid="hasPermissionEdit">{String(hasPermission('appointments.edit'))}</div>
      <div data-testid="isImpersonating">{String(isImpersonating)}</div>
      <button onClick={() => login({ email: 'manager@medibook.dev', roles: [{ name: 'manager' }], permissions: [{ name: 'appointments.edit' }] })}>
        login-remember
      </button>
      <button onClick={() => login({ email: 'manager@medibook.dev', roles: [{ name: 'manager' }] }, false)}>
        login-session-only
      </button>
      {/* sessionTimeoutMinutes is always the login call's own 3rd argument in
          real use (REQ012/PLAN021 — it comes from the org's Auto-logout
          setting in the login response), never pre-seeded independently:
          login() itself clears any stale value when this arg is omitted. */}
      <button onClick={() => login({ email: 'manager@medibook.dev', roles: [{ name: 'manager' }] }, true, 1)}>
        login-with-1min-timeout
      </button>
      <button onClick={() => logout()}>logout</button>
      {/* REQ053/Phase G+3 — admin impersonation. The caller runs the real
          StartImpersonation/EndImpersonation mutations itself (which now
          swap the session cookie server-side) before calling these. */}
      <button onClick={() => startImpersonating()}>start-impersonating</button>
      <button onClick={() => endImpersonating()}>end-impersonating</button>
    </div>
  )
}

function renderProbe(mocks = []) {
  return render(
    <MockedProvider mocks={mocks} addTypename={false}>
      <AuthProvider>
        <Probe />
      </AuthProvider>
    </MockedProvider>,
  )
}

describe('AuthProvider — initial hydration', () => {
  afterEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  it('starts logged out with no session marker', () => {
    renderProbe()
    expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('false')
    expect(screen.getByTestId('isLoading')).toHaveTextContent('false')
  })

  it('renders optimistically from a cached user while ME_QUERY is still in flight', async () => {
    localStorage.setItem('medibook_has_session', '1')
    localStorage.setItem('medibook_user', JSON.stringify({ email: 'cached@medibook.dev', roles: [{ name: 'manager' }] }))
    const mocks = [{ request: { query: ME_QUERY }, result: { data: ME_RESULT } }]
    renderProbe(mocks)
    // Optimistic render from cache happens immediately, before ME_QUERY resolves.
    expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('true')
    expect(screen.getByTestId('user')).toHaveTextContent('cached@medibook.dev')
  })

  it('shows loading, then hydrates from ME_QUERY, when the marker exists with no cached user', async () => {
    localStorage.setItem('medibook_has_session', '1')
    const mocks = [{ request: { query: ME_QUERY }, result: { data: ME_RESULT } }]
    renderProbe(mocks)
    expect(screen.getByTestId('isLoading')).toHaveTextContent('true')
    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('manager@medibook.dev'))
    expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('true')
  })

  // P1-02 — the provider now ALWAYS re-verifies against the server on mount
  // whenever the marker is present, even with a cached user already in
  // hand (previously this only fetched when no cached user existed at
  // all, so a returning visitor's revoked/expired cookie kept showing a
  // stale "logged in" UI until some other query happened to 401).
  it('re-verifies via ME_QUERY on mount even when a cached user already exists', async () => {
    localStorage.setItem('medibook_has_session', '1')
    localStorage.setItem('medibook_user', JSON.stringify({ email: 'cached@medibook.dev', roles: [{ name: 'manager' }] }))
    const mocks = [{ request: { query: ME_QUERY }, result: { data: ME_RESULT } }]
    renderProbe(mocks)
    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('manager@medibook.dev'))
  })

  // F-02: a rejected ME_QUERY must log the session out, not fall back to
  // whatever user object is cached — an expired/revoked/forged session kept
  // its client-side session indefinitely under the old behavior.
  it('logs out when ME_QUERY is rejected, even with a cached user present', async () => {
    localStorage.setItem('medibook_has_session', '1')
    localStorage.setItem('medibook_user', JSON.stringify({ email: 'forged@medibook.dev', roles: [{ name: 'admin' }] }))
    const mocks = [{ request: { query: ME_QUERY }, error: new Error('Unauthorized') }]
    renderProbe(mocks)
    await waitFor(() => expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('false'))
    expect(localStorage.getItem('medibook_has_session')).toBeNull()
    expect(localStorage.getItem('medibook_user')).toBeNull()
  })
})

describe('AuthProvider — login/logout', () => {
  afterEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  it('login(rememberMe=true) persists the session marker to localStorage', () => {
    const mocks = [{ request: { query: ME_QUERY }, result: { data: ME_RESULT } }]
    renderProbe(mocks)
    fireEvent.click(screen.getByText('login-remember'))
    expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('true')
    expect(localStorage.getItem('medibook_has_session')).toBe('1')
    expect(sessionStorage.getItem('medibook_has_session')).toBeNull()
  })

  it('login(rememberMe=false) persists to sessionStorage only, clearing any stale localStorage entry', () => {
    localStorage.setItem('medibook_has_session', '1')
    localStorage.setItem('medibook_user', JSON.stringify({ email: 'old@medibook.dev', roles: [] }))
    const mocks = [{ request: { query: ME_QUERY }, result: { data: ME_RESULT } }]
    renderProbe(mocks)
    fireEvent.click(screen.getByText('login-session-only'))
    expect(sessionStorage.getItem('medibook_has_session')).toBe('1')
    expect(localStorage.getItem('medibook_has_session')).toBeNull()
    expect(localStorage.getItem('medibook_user')).toBeNull()
  })

  it('login immediately renders the mutation response\'s own (partial) user optimistically, before ME_QUERY resolves', () => {
    renderProbe([{ request: { query: ME_QUERY }, result: { data: ME_RESULT }, delay: 50 }])
    fireEvent.click(screen.getByText('login-remember'))
    expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('true')
    expect(screen.getByTestId('user')).toHaveTextContent('manager@medibook.dev')
  })

  it('logout calls the real LOGOUT_MUTATION (server-side cookie clearing), then clears local state', async () => {
    const mocks = [{ request: { query: ME_QUERY }, result: { data: ME_RESULT } }, LOGOUT_MOCK]
    renderProbe(mocks)
    fireEvent.click(screen.getByText('login-remember'))
    expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('true')
    fireEvent.click(screen.getByText('logout'))
    await waitFor(() => expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('false'))
    expect(localStorage.getItem('medibook_has_session')).toBeNull()
    expect(sessionStorage.getItem('medibook_has_session')).toBeNull()
  })

  it('logout still clears local state even if the server call fails (best-effort, matches endImpersonating\'s own precedent)', async () => {
    const mocks = [
      { request: { query: ME_QUERY }, result: { data: ME_RESULT } },
      { request: { query: LOGOUT_MUTATION }, error: new Error('network down') },
    ]
    renderProbe(mocks)
    fireEvent.click(screen.getByText('login-remember'))
    fireEvent.click(screen.getByText('logout'))
    await waitFor(() => expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('false'))
    expect(localStorage.getItem('medibook_has_session')).toBeNull()
  })
})

describe('AuthProvider — hasRole/hasPermission', () => {
  afterEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  it('hasRole matches against user.roles[].name', () => {
    renderProbe([{ request: { query: ME_QUERY }, result: { data: ME_RESULT } }])
    fireEvent.click(screen.getByText('login-remember'))
    expect(screen.getByTestId('hasRoleManager')).toHaveTextContent('true')
  })

  it('hasPermission matches against user.permissions[].name', () => {
    renderProbe([{ request: { query: ME_QUERY }, result: { data: ME_RESULT } }])
    fireEvent.click(screen.getByText('login-remember'))
    expect(screen.getByTestId('hasPermissionEdit')).toHaveTextContent('true')
  })

  it('hasRole/hasPermission are false when logged out', () => {
    renderProbe()
    expect(screen.getByTestId('hasRoleManager')).toHaveTextContent('false')
    expect(screen.getByTestId('hasPermissionEdit')).toHaveTextContent('false')
  })
})

describe('AuthProvider — idle-timeout auto-logout (REQ012/PLAN021)', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })
  afterEach(() => {
    // Unmount (which runs the idle-timer effect's cleanup, clearing its
    // pending setTimeout) BEFORE switching back to real timers -- doing it
    // in the other order leaves a fake-timer-created timer id that a real
    // clearTimeout can't recognize, which showed up as order-dependent
    // flakiness between these two tests when run together.
    cleanup()
    jest.useRealTimers()
    localStorage.clear()
    sessionStorage.clear()
  })

  it('logs out after the configured idle timeout with no activity', async () => {
    renderProbe([{ request: { query: ME_QUERY }, result: { data: ME_RESULT } }, LOGOUT_MOCK])
    // sessionTimeoutMinutes must come from the login() call itself -- login()
    // clears any pre-seeded localStorage value when it's omitted (real
    // behavior: a login response with no org timeout config must not leave a
    // stale timeout from a previous session active).
    fireEvent.click(screen.getByText('login-with-1min-timeout'))
    expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('true')
    // login() itself triggers a fetchMe() whose resolution can re-arm the
    // idle timer's own effect; let that settle under fake timers before
    // starting the real 60s countdown this test is actually about.
    await act(async () => {
      await jest.advanceTimersByTimeAsync(0)
    })
    // advanceTimersByTimeAsync flushes the microtask queue between the
    // fake-timer callback firing and React 18 committing the resulting
    // dispatch -- the officially recommended pattern for this combination.
    await act(async () => {
      await jest.advanceTimersByTimeAsync(60 * 1000 + 10)
    })
    // logout() is now an async server round trip (LOGOUT_MUTATION) before
    // it clears local state. MockedProvider resolves its mock via its own
    // internal timer; switch to real timers so a plain waitFor can observe
    // that resolution, rather than fighting fake-timer/microtask ordering
    // for a mutation this test doesn't otherwise care about the timing of.
    jest.useRealTimers()
    await waitFor(() => expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('false'))
    jest.useFakeTimers()
  })

  it('does not log out if a tracked activity event resets the timer first', async () => {
    renderProbe([{ request: { query: ME_QUERY }, result: { data: ME_RESULT } }])
    fireEvent.click(screen.getByText('login-with-1min-timeout'))
    await act(async () => {
      await jest.advanceTimersByTimeAsync(45 * 1000)
    })
    act(() => {
      window.dispatchEvent(new Event('keydown'))
    })
    await act(async () => {
      await jest.advanceTimersByTimeAsync(45 * 1000)
    })
    // 90s of wall time has passed but activity at 45s reset the 60s timer,
    // so only 45s has elapsed since the reset — still authenticated.
    expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('true')
  })
})

// REQ053/Phase G+3 — admin impersonation.
//
// P1-02/SEC-2 — dramatically simpler than before this slice: the backend
// swaps the httpOnly session cookie itself as part of the
// startImpersonation/endImpersonation mutations the caller runs BEFORE
// calling these context functions, so there is no more client-side
// token-stash/restore mechanism to test — just the UI-only isImpersonating
// flag and a re-fetch of `me`.
describe('AuthProvider — impersonation', () => {
  afterEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  it('starts logged out (isImpersonating false)', () => {
    renderProbe()
    expect(screen.getByTestId('isImpersonating')).toHaveTextContent('false')
  })

  it('startImpersonating sets isImpersonating and re-fetches me (the cookie has already been swapped server-side by the caller\'s own mutation)', async () => {
    const impersonatedMe = { me: { id: 'u-2', name: 'Target User', email: 'target@medibook.dev', roles: [{ name: 'staff' }] } }
    const mocks = [
      { request: { query: ME_QUERY }, result: { data: ME_RESULT } },
      { request: { query: ME_QUERY }, result: { data: impersonatedMe } },
    ]
    renderProbe(mocks)
    fireEvent.click(screen.getByText('login-remember'))
    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('manager@medibook.dev'))

    fireEvent.click(screen.getByText('start-impersonating'))
    expect(screen.getByTestId('isImpersonating')).toHaveTextContent('true')
    expect(sessionStorage.getItem('medibook_is_impersonating')).toBe('1')
    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('target@medibook.dev'))
  })

  it('endImpersonating clears the flag and re-fetches me', async () => {
    const mocks = [
      { request: { query: ME_QUERY }, result: { data: ME_RESULT } },
      { request: { query: ME_QUERY }, result: { data: ME_RESULT } },
      { request: { query: ME_QUERY }, result: { data: ME_RESULT } },
    ]
    renderProbe(mocks)
    fireEvent.click(screen.getByText('login-remember'))
    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('manager@medibook.dev'))
    fireEvent.click(screen.getByText('start-impersonating'))
    await waitFor(() => expect(screen.getByTestId('isImpersonating')).toHaveTextContent('true'))

    fireEvent.click(screen.getByText('end-impersonating'))

    expect(screen.getByTestId('isImpersonating')).toHaveTextContent('false')
    expect(sessionStorage.getItem('medibook_is_impersonating')).toBeNull()
  })
})
