import { createContext, useContext, useState, useMemo, useEffect } from 'react'
import { createTheme, ThemeProvider } from '@mui/material/styles'
import { CssBaseline } from '@mui/material'
import { COLORS } from '../theme/theme'

// ─── Context ──────────────────────────────────────────────────────────────────
const ThemeModeContext = createContext({ mode: 'light', toggle: () => {} })
export const useThemeMode = () => useContext(ThemeModeContext)

// ─── Shared palette tokens ─────────────────────────────────────────────────────
// Brand teal: #006D77 (primary), #4ECDC4 (light), #004D56 (dark)
const sharedTokens = {
  primary: {
    main: '#006D77',
    light: '#4ECDC4',
    dark: '#004D56',
    50: '#E8F8F9',
    100: '#D0EEF0',
    contrastText: '#FFFFFF',
  },
  secondary: {
    main: COLORS.emerald700,
    light: COLORS.emerald500,
    dark: COLORS.emerald900,
    contrastText: '#FFFFFF',
  },
}

const getDesignTokens = (mode) => ({
  palette: {
    mode,
    ...sharedTokens,
    ...(mode === 'light'
      ? {
          background: { default: '#F5F7FA', paper: '#FFFFFF' },
          text: { primary: '#0D1B2E', secondary: '#3D5A72' },
          divider: '#E2E8F0',
          success: { main: COLORS.emerald700, light: COLORS.emerald500, dark: COLORS.emerald900, contrastText: '#fff' },
          warning: { main: '#D97706', light: '#FBBF24', dark: '#92400E', contrastText: '#fff' },
          error: { main: '#DC2626', light: '#F87171', dark: '#991B1B', contrastText: '#fff' },
          info: { main: COLORS.blue600, light: COLORS.blue400, dark: COLORS.blue800, contrastText: '#fff' },
        }
      : {
          background: { default: '#0F172A', paper: '#1E293B' },
          text: { primary: '#F1F5F9', secondary: '#94A3B8' },
          divider: '#334155',
          success: { main: '#22C55E', light: '#4ADE80', dark: '#15803D', contrastText: '#fff' },
          warning: { main: '#F59E0B', light: '#FCD34D', dark: '#B45309', contrastText: '#fff' },
          error: { main: '#EF4444', light: '#FCA5A5', dark: '#B91C1C', contrastText: '#fff' },
          info: { main: '#60A5FA', light: '#93C5FD', dark: '#1D4ED8', contrastText: '#fff' },
        }),
  },
  typography: {
    fontFamily: '"Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    h1: { fontWeight: 800, letterSpacing: '-1px' },
    h2: { fontWeight: 800, letterSpacing: '-0.6px' },
    h3: { fontWeight: 800, letterSpacing: '-0.4px' },
    h4: { fontWeight: 800, letterSpacing: '-0.3px' },
    h5: { fontWeight: 700, letterSpacing: '-0.2px' },
    h6: { fontWeight: 700, letterSpacing: '-0.2px' },
    subtitle1: { fontWeight: 600 },
    subtitle2: { fontWeight: 600 },
    button: { fontWeight: 700, letterSpacing: '0.01em' },
  },
  shape: { borderRadius: 10 },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { borderRadius: 10, padding: '8px 18px', textTransform: 'none', fontWeight: 700 },
        contained: { boxShadow: 'none', '&:hover': { boxShadow: '0 4px 12px rgba(0,109,119,0.28)' } },
      },
    },
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: { root: { borderRadius: 16 } },
    },
    MuiPaper: {
      styleOverrides: { root: { backgroundImage: 'none' } },
    },
    MuiTextField: {
      defaultProps: { variant: 'outlined', size: 'small' },
    },
    MuiChip: {
      styleOverrides: { root: { fontWeight: 700 } },
    },
    MuiTableCell: {
      styleOverrides: {
        root: { borderColor: mode === 'dark' ? '#334155' : '#E2E8F0' },
        head: { fontWeight: 700 },
      },
    },
  },
})

// ─── Provider ─────────────────────────────────────────────────────────────────
export function ThemeModeProvider({ children }) {
  const [mode, setMode] = useState(() => {
    try {
      return localStorage.getItem('medibook_theme') || 'light'
    } catch {
      return 'light'
    }
  })

  const toggle = () =>
    setMode((prev) => {
      const next = prev === 'light' ? 'dark' : 'light'
      try {
        localStorage.setItem('medibook_theme', next)
      } catch {
        /* */
      }
      return next
    })

  const theme = useMemo(() => createTheme(getDesignTokens(mode)), [mode])

  return (
    <ThemeModeContext.Provider value={{ mode, toggle }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeModeContext.Provider>
  )
}
