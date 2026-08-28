import { createContext, useContext, useState, useMemo, useEffect, useCallback } from 'react'
import { ThemeProvider } from '@mui/material/styles'
import { CssBaseline, useMediaQuery } from '@mui/material'
import { useApolloClient, gql } from '@apollo/client'
import { createAppTheme } from '../theme'

// BUG047 follow-up -- synced to backend/src/account (myProfile/updateMyProfile)
// so the preference follows the user across devices, not just this browser.
// Deliberately a minimal, standalone query/mutation (not the shared ones in
// settings/index.jsx) -- this context only ever needs the one field.
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
// Matches AuthContext.jsx's own SESSION_MARKER_KEY -- read directly rather
// than importing AuthContext, since ThemeModeProvider sits above AuthProvider
// in main.jsx's tree and has no context access to it.
const SESSION_MARKER_KEY = 'medibook_has_session'
function hasSession() {
  try {
    return localStorage.getItem(SESSION_MARKER_KEY) === '1' || sessionStorage.getItem(SESSION_MARKER_KEY) === '1'
  } catch {
    return false
  }
}

// BUG047 -- the single shared theme-mode context. Every light/dark control
// in the app (the AppShell header toggle, Settings > Appearance's Theme
// radio group) reads and writes this, never local component state -- a
// per-component toggle can never stay in sync with the rest of the app,
// which is exactly how this bug shipped the first time.
const ThemeModeContext = createContext({ mode: 'light', resolvedMode: 'light', setMode: () => {} })
export const useThemeMode = () => useContext(ThemeModeContext)

const STORAGE_KEY = 'medibook_appearance_prefs'

function readStoredMode() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : null
    return parsed?.themeMode === 'dark' || parsed?.themeMode === 'system' ? parsed.themeMode : 'light'
  } catch {
    return 'light'
  }
}

function writeStoredMode(mode) {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : {}
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...parsed, themeMode: mode }))
  } catch {
    /* best-effort per-device preference only -- see FRONTEND_RULES.md browser-storage guidance */
  }
}

export function ThemeModeProvider({ children }) {
  const [mode, setModeState] = useState(readStoredMode)
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)')
  const resolvedMode = mode === 'system' ? (prefersDark ? 'dark' : 'light') : mode
  const client = useApolloClient()

  const setMode = useCallback(
    (next) => {
      // Applies instantly and works logged-out/offline -- never blocked on
      // the network call below, which is a best-effort cross-device sync,
      // not a form save with a required success state.
      setModeState(next)
      writeStoredMode(next)
      if (hasSession()) {
        client.mutate({ mutation: SET_MY_THEME_MODE, variables: { input: { theme_mode: next } } }).catch(() => {
          /* swallowed -- the device-local value is already applied and stored */
        })
      }
    },
    [client],
  )

  // Keep other open tabs in sync if the preference changes elsewhere.
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === STORAGE_KEY) setModeState(readStoredMode())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  // On mount, if this device has never expressed a preference of its own
  // (readStoredMode falls back to 'light' with nothing stored), pull the
  // caller's synced preference so a new device/browser doesn't silently
  // reset to light. A device that already has its own local choice keeps
  // it -- this is a first-run hydration, not a permanent override.
  useEffect(() => {
    if (!hasSession()) return
    let cancelled = false
    let hadStoredPref = true
    try {
      hadStoredPref = window.localStorage.getItem(STORAGE_KEY) !== null
    } catch {
      hadStoredPref = false
    }
    if (hadStoredPref) return
    client
      .query({ query: GET_MY_THEME_MODE, fetchPolicy: 'network-only', errorPolicy: 'ignore' })
      .then(({ data }) => {
        const synced = data?.myProfile?.theme_mode
        if (!cancelled && (synced === 'light' || synced === 'dark' || synced === 'system')) {
          setModeState(synced)
          writeStoredMode(synced)
        }
      })
      .catch(() => {
        /* not authenticated yet, or a network error -- localStorage stays authoritative */
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const theme = useMemo(() => createAppTheme(resolvedMode), [resolvedMode])

  return (
    <ThemeModeContext.Provider value={{ mode, resolvedMode, setMode }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeModeContext.Provider>
  )
}
