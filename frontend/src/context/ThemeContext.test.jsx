import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MockedProvider } from '@apollo/client/testing'
import { gql } from '@apollo/client'
import { ThemeModeProvider, useThemeMode } from './ThemeContext'

// Re-declared to match ThemeContext.jsx's own inline gql documents exactly
// (query AST equality) -- see A-8's own precedent in settings/index.test.jsx.
const GET_MY_THEME_MODE = gql`
  query MyThemeModeForContext {
    myProfile {
      theme_mode
    }
  }
`
const SET_MY_THEME_MODE = gql`
  mutation SetMyThemeModeForContext($input: UpdateMyProfileInput!) {
    updateMyProfile(input: $input) {
      success
    }
  }
`

const STORAGE_KEY = 'medibook_appearance_prefs'
const SESSION_MARKER_KEY = 'medibook_has_session'

function Probe() {
  const { mode, resolvedMode, setMode } = useThemeMode()
  return (
    <div>
      <div data-testid="mode">{mode}</div>
      <div data-testid="resolvedMode">{resolvedMode}</div>
      <button onClick={() => setMode('dark')}>go-dark</button>
    </div>
  )
}

function renderWithMocks(mocks) {
  return render(
    <MockedProvider mocks={mocks} addTypename={false}>
      <ThemeModeProvider>
        <Probe />
      </ThemeModeProvider>
    </MockedProvider>,
  )
}

beforeEach(() => {
  window.localStorage.clear()
  window.sessionStorage.clear()
})

describe('ThemeContext.jsx — BUG047 backend sync', () => {
  it('fires updateMyProfile with the new theme_mode when a session exists', async () => {
    window.localStorage.setItem(SESSION_MARKER_KEY, '1')
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ themeMode: 'light' }))
    let mutationCalled = false
    renderWithMocks([
      {
        request: { query: SET_MY_THEME_MODE, variables: { input: { theme_mode: 'dark' } } },
        result: () => {
          mutationCalled = true
          return { data: { updateMyProfile: { success: true } } }
        },
      },
    ])

    await userEvent.click(screen.getByRole('button', { name: 'go-dark' }))

    expect(screen.getByTestId('mode')).toHaveTextContent('dark')
    await waitFor(() => expect(mutationCalled).toBe(true))
  })

  it('does not attempt any backend call for a logged-out session', async () => {
    // No SESSION_MARKER_KEY set -- a guest/public page. MockedProvider with
    // zero mocks throws if anything unexpected is requested, so an empty
    // mocks array itself proves no query/mutation fires.
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ themeMode: 'light' }))
    renderWithMocks([])

    await userEvent.click(screen.getByRole('button', { name: 'go-dark' }))

    expect(screen.getByTestId('mode')).toHaveTextContent('dark')
    expect(window.localStorage.getItem(STORAGE_KEY)).toContain('"themeMode":"dark"')
  })

  it('hydrates from the synced backend preference on first run when this device has no stored preference yet', async () => {
    window.localStorage.setItem(SESSION_MARKER_KEY, '1')
    renderWithMocks([
      { request: { query: GET_MY_THEME_MODE }, result: { data: { myProfile: { theme_mode: 'dark' } } } },
    ])

    await waitFor(() => expect(screen.getByTestId('mode')).toHaveTextContent('dark'))
  })

  it('a device with its own already-stored preference is not overridden by the backend hydration query', async () => {
    window.localStorage.setItem(SESSION_MARKER_KEY, '1')
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ themeMode: 'light' }))
    // No mock provided for GET_MY_THEME_MODE -- proves it's never requested
    // once a local preference already exists.
    renderWithMocks([])

    expect(screen.getByTestId('mode')).toHaveTextContent('light')
  })
})
