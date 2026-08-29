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
const GET_MY_ORG_ACCENT_COLOR = gql`
  query MyOrgAccentColorForTheme {
    myOrgBranding {
      primary_color
      secondary_color
    }
  }
`
// ThemeModeProvider fires this unconditionally on every render (unlike the
// theme_mode hydration query, which only fires once per device with no
// stored preference) -- every test needs a mock for it, an org-less
// `{ myOrgBranding: null }` response by default unless a test cares about
// a real accent color.
const noOrgBrandingMock = { request: { query: GET_MY_ORG_ACCENT_COLOR }, result: { data: { myOrgBranding: null } } }

const STORAGE_KEY = 'medibook_appearance_prefs'
const SESSION_MARKER_KEY = 'medibook_has_session'

function Probe() {
  const { mode, resolvedMode, setMode, accentColor, secondaryColor, fontScale, setFontScale } = useThemeMode()
  return (
    <div>
      <div data-testid="mode">{mode}</div>
      <div data-testid="resolvedMode">{resolvedMode}</div>
      <div data-testid="accentColor">{accentColor ?? 'null'}</div>
      <div data-testid="secondaryColor">{secondaryColor ?? 'null'}</div>
      <div data-testid="fontScale">{fontScale}</div>
      <button onClick={() => setMode('dark')}>go-dark</button>
      <button onClick={() => setFontScale(1.25)}>go-xl</button>
      <button onClick={() => setFontScale(999)}>go-invalid</button>
    </div>
  )
}

function renderWithMocks(mocks) {
  return render(
    <MockedProvider mocks={[noOrgBrandingMock, ...mocks]} addTypename={false}>
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

  it('does not attempt any theme_mode backend call for a logged-out session', async () => {
    // No SESSION_MARKER_KEY set -- a guest/public page. Only noOrgBrandingMock
    // is provided (always fires, session or not); no SET_MY_THEME_MODE mock
    // exists, so MockedProvider would fail loudly if setMode tried one.
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

describe('ThemeContext.jsx — accentColor (organization branding, read-only here)', () => {
  it('exposes the organization branding primary_color as accentColor and secondary_color as secondaryColor', async () => {
    render(
      <MockedProvider
        mocks={[
          {
            request: { query: GET_MY_ORG_ACCENT_COLOR },
            result: { data: { myOrgBranding: { primary_color: '#D93025', secondary_color: '#0F9D58' } } },
          },
        ]}
        addTypename={false}
      >
        <ThemeModeProvider>
          <Probe />
        </ThemeModeProvider>
      </MockedProvider>,
    )
    await waitFor(() => expect(screen.getByTestId('accentColor')).toHaveTextContent('#D93025'))
    expect(screen.getByTestId('secondaryColor')).toHaveTextContent('#0F9D58')
  })

  it('falls back to null (brand default) for an org-less caller', async () => {
    renderWithMocks([])
    await waitFor(() => expect(screen.getByTestId('accentColor')).toHaveTextContent('null'))
    expect(screen.getByTestId('secondaryColor')).toHaveTextContent('null')
  })
})

describe('ThemeContext.jsx — fontScale (personal, per-device)', () => {
  it('setFontScale applies instantly and persists without clobbering a stored themeMode', async () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ themeMode: 'dark' }))
    renderWithMocks([])

    await userEvent.click(screen.getByRole('button', { name: 'go-xl' }))

    expect(screen.getByTestId('fontScale')).toHaveTextContent('1.25')
    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY))
    expect(stored).toEqual({ themeMode: 'dark', fontScale: 1.25 })
  })

  it('clamps an out-of-range fontScale to the default (1) rather than storing it verbatim', async () => {
    renderWithMocks([])

    await userEvent.click(screen.getByRole('button', { name: 'go-invalid' }))

    expect(screen.getByTestId('fontScale')).toHaveTextContent('1')
    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY))
    expect(stored.fontScale).toBe(1)
  })

  it('reloads a previously saved fontScale on next mount', () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ fontScale: 1.1 }))
    renderWithMocks([])

    expect(screen.getByTestId('fontScale')).toHaveTextContent('1.1')
  })
})
