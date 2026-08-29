import { createContext, useContext, useState, useMemo, useEffect, useCallback } from 'react'
import { ThemeProvider } from '@mui/material/styles'
import { CssBaseline, useMediaQuery } from '@mui/material'
import { useApolloClient, useQuery, gql } from '@apollo/client'
import { createAppTheme } from '../theme'

// BUG (settings/Appearance "Accent Color" did nothing) -- the accent is an
// organization-wide brand identity, not a personal per-device preference:
// reuse the existing, already WCAG-AA-validated Branding color
// (org-settings.service.ts#updateMyBranding, Settings > Clinic Settings >
// Branding) rather than inventing a second, competing personal picker.
// This context only ever needs the one field -- deliberately not the
// richer query settings/index.jsx's own Branding tab uses to render its
// color-picker form.
const GET_MY_ORG_ACCENT_COLOR = gql`
  query MyOrgAccentColorForTheme {
    myOrgBranding {
      primary_color
      secondary_color
    }
  }
`

// BUG053 -- hex -> "r, g, b" triplet, for CSS custom properties consumed by
// rgba(var(--mb-primary-rgb), alpha) in plain CSS (FullCalendar/Recharts
// blocks in index.css, which can't reach theme.components overrides -- see
// the data-theme effect below for why those need a DOM-level hook at all).
function hexToRgbTriplet(hex) {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex || '')
  if (!m) return null
  return `${parseInt(m[1], 16)}, ${parseInt(m[2], 16)}, ${parseInt(m[3], 16)}`
}

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
/**
 * @typedef {object} ThemeModeContextValue
 * @property {'light'|'dark'|'system'} mode - the raw stored preference
 * @property {'light'|'dark'} resolvedMode - 'system' resolved via the OS media query
 * @property {(next: 'light'|'dark'|'system') => void} setMode
 * @property {string|null} accentColor - the caller's organization's branding
 *   primary_color (read-only here; changed via Settings > Clinic Settings >
 *   Branding, manager+ only), or null for an org-less caller/no org branding set
 * @property {string|null} secondaryColor - the same organization's branding
 *   secondary_color (read-only here, same source/gating as accentColor)
 * @property {number} fontScale - personal, per-device typography scale (one of
 *   FONT_SCALE_PRESETS)
 * @property {(scale: number) => void} setFontScale - clamps to the nearest
 *   allowed preset
 */
const ThemeModeContext = createContext({
  mode: 'light',
  resolvedMode: 'light',
  setMode: () => {},
  accentColor: null,
  secondaryColor: null,
  fontScale: 1,
  setFontScale: () => {},
})
export const useThemeMode = () => useContext(ThemeModeContext)

const STORAGE_KEY = 'medibook_appearance_prefs'
export const FONT_SCALE_PRESETS = [0.9, 1.0, 1.1, 1.25] // SM, MD, LG, XL

// Generalized read-modify-write against the one shared localStorage key --
// BUG (Save Appearance clobbered themeMode): settings/index.jsx's own
// Save-Appearance handler used to overwrite this whole key wholesale
// instead of merging, silently deleting whatever field this context had
// just written. Every field sharing this key now goes through the same
// merge-safe helper, closing that bug class for good rather than just the
// one field that shipped it.
function readStoredField(key, fallback, isValid) {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : null
    const value = parsed?.[key]
    return isValid(value) ? value : fallback
  } catch {
    return fallback
  }
}

function writeStoredField(key, value) {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : {}
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...parsed, [key]: value }))
  } catch {
    /* best-effort per-device preference only -- see FRONTEND_RULES.md browser-storage guidance */
  }
}

const readStoredMode = () => readStoredField('themeMode', 'light', (v) => v === 'dark' || v === 'system' || v === 'light')
const writeStoredMode = (mode) => writeStoredField('themeMode', mode)
const readStoredFontScale = () => readStoredField('fontScale', 1, (v) => FONT_SCALE_PRESETS.includes(v))

export function ThemeModeProvider({ children }) {
  const [mode, setModeState] = useState(readStoredMode)
  const [fontScale, setFontScaleState] = useState(readStoredFontScale)
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)')
  const resolvedMode = mode === 'system' ? (prefersDark ? 'dark' : 'light') : mode
  const client = useApolloClient()

  // Org-wide brand accent -- read-only from here (errorPolicy: 'ignore' so
  // an org-less caller or a logged-out/public page just renders the brand
  // default, never an error). `cache-first` is fine: a manager changing the
  // Branding color takes effect for other sessions on their next real
  // navigation/reload, not live-pushed -- no different from how the org
  // logo/name already behave in AppShell today.
  const { data: brandingData } = useQuery(GET_MY_ORG_ACCENT_COLOR, { errorPolicy: 'ignore' })
  const accentColor = brandingData?.myOrgBranding?.primary_color ?? null
  const secondaryColor = brandingData?.myOrgBranding?.secondary_color ?? null

  const setFontScale = useCallback((scale) => {
    const clamped = FONT_SCALE_PRESETS.includes(scale) ? scale : 1
    setFontScaleState(clamped)
    writeStoredField('fontScale', clamped)
  }, [])

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

  // Keep other open tabs in sync if a preference changes elsewhere.
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key !== STORAGE_KEY) return
      setModeState(readStoredMode())
      setFontScaleState(readStoredFontScale())
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

  const theme = useMemo(
    () => createAppTheme(resolvedMode, { accentColor, secondaryColor, fontScale }),
    [resolvedMode, accentColor, secondaryColor, fontScale],
  )

  // Third-party libraries that render their own DOM outside MUI's component
  // tree (FullCalendar, Recharts) can't be reached by a theme.components
  // override -- only plain CSS can style them, and plain CSS has no way to
  // ask "is dark mode active" without a DOM hook. This is that hook; see
  // index.css's own `[data-theme='dark']` overrides for the FullCalendar/
  // Recharts blocks this was added for (BUG047 follow-up, 2026-08-29).
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', resolvedMode)
  }, [resolvedMode])

  // BUG053 -- same "plain CSS can't reach theme.components" gap as above,
  // but for the org's live accent rather than light/dark mode: CalendarView
  // .css's FullCalendar overrides used a hardcoded teal rgba() regardless of
  // org branding. Expose the resolved primary color as an "r, g, b" custom
  // property so plain CSS can do rgba(var(--mb-primary-rgb), alpha).
  useEffect(() => {
    const triplet = hexToRgbTriplet(theme.palette.primary.main)
    if (triplet) document.documentElement.style.setProperty('--mb-primary-rgb', triplet)
  }, [theme])

  return (
    <ThemeModeContext.Provider
      value={{ mode, resolvedMode, setMode, accentColor, secondaryColor, fontScale, setFontScale }}
    >
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeModeContext.Provider>
  )
}
