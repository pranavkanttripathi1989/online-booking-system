import { createContext, useContext, useState, useMemo, useEffect, useCallback } from 'react'
import { ThemeProvider } from '@mui/material/styles'
import { CssBaseline, useMediaQuery } from '@mui/material'
import { createAppTheme } from '../theme'

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

  const setMode = useCallback((next) => {
    setModeState(next)
    writeStoredMode(next)
  }, [])

  // Keep other open tabs in sync if the preference changes elsewhere.
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === STORAGE_KEY) setModeState(readStoredMode())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
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
