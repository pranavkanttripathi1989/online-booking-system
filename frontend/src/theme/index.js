import { createTheme, alpha } from '@mui/material/styles'

// BUG047 -- single source of truth for the app's palette, light AND dark.
// Previously this file only ever built a light theme, and a second,
// separate light/dark-aware theme lived unused in context/ThemeContext.jsx
// (itself pulling brand colors from a THIRD, entirely dead theme file,
// theme/theme.js) -- three competing definitions, only one of them wired
// into main.jsx. See FRONTEND_RULES.md UI-1/BASE-4 and the
// medibook-design-system skill.
const LIGHT = {
  primary: { main: '#006D77', light: '#83C5BE', dark: '#004D55', contrastText: '#fff' },
  secondary: { main: '#E29578', light: '#FFDDD2', dark: '#C47758', contrastText: '#fff' },
  success: { main: '#2DC653', light: '#D1FAE5', dark: '#16A34A', contrastText: '#fff' },
  warning: { main: '#FFB703', light: '#FEF3C7', dark: '#D97706', contrastText: '#1A2B3C' },
  error: { main: '#E63946', light: '#FFE4E6', dark: '#B91C1C', contrastText: '#fff' },
  info: { main: '#3A86FF', light: '#DBEAFE', dark: '#1D4ED8', contrastText: '#fff' },
  background: { default: '#F0F7F8', paper: '#FFFFFF' },
  text: { primary: '#1A2B3C', secondary: '#5A7184' },
  divider: '#D0E8EA',
}

// Dark variant -- same hues, re-balanced for a dark ground: brand teal
// lightened so it stays >=4.5:1 on a near-black surface (A11Y-2), status
// colors likewise, background/paper/text/divider inverted.
const DARK = {
  primary: { main: '#4ECDC4', light: '#83C5BE', dark: '#006D77', contrastText: '#04211F' },
  secondary: { main: '#E29578', light: '#FFDDD2', dark: '#C47758', contrastText: '#2B1710' },
  success: { main: '#4ADE80', light: '#86EFAC', dark: '#16A34A', contrastText: '#052E12' },
  warning: { main: '#FCD34D', light: '#FEF3C7', dark: '#D97706', contrastText: '#3D2B00' },
  error: { main: '#F87171', light: '#FCA5A5', dark: '#B91C1C', contrastText: '#3D0A0A' },
  info: { main: '#60A5FA', light: '#93C5FD', dark: '#1D4ED8', contrastText: '#0A1A3D' },
  background: { default: '#0F1B24', paper: '#16232D' },
  text: { primary: '#EAF3F3', secondary: '#9DB3B8' },
  divider: '#2A3D46',
}

// Phase 1 (BUG047 follow-up) -- appointment/booking status is a recurring
// semantic-colour need across many components (RecentAppointmentsTable,
// StitchStatusChip, StatusChip, and further phases' calendar/appointments
// pages). Rather than each file hand-picking its own hex per status (which
// is exactly how a light-mode-only pastel chip shipped, unreadably bright
// on a dark background), this is the one shared source: consume via
// `theme.palette.appointmentStatus.<status>`, never a per-file STATUS_CONFIG
// hex map.
function buildStatusPalette(p, mode) {
  const tone = (main, lightText, darkText) => ({
    bg: mode === 'dark' ? alpha(main, 0.18) : alpha(main, 0.12),
    text: mode === 'dark' ? lightText : darkText,
    border: mode === 'dark' ? alpha(main, 0.4) : alpha(main, 0.3),
    dot: main,
  })
  return {
    confirmed: tone(p.success.main, p.success.light, p.success.dark),
    pending: tone(p.warning.main, p.warning.light, p.warning.dark),
    cancelled: tone(p.error.main, p.error.light, p.error.dark),
    completed: tone(p.info.main, p.info.light, p.info.dark),
    rescheduled: tone(p.secondary.main, p.secondary.light, p.secondary.dark),
    no_show: tone(p.text.secondary, p.text.secondary, p.text.secondary),
  }
}

export function createAppTheme(mode = 'light') {
  const p = mode === 'dark' ? DARK : LIGHT
  const tableHeadBg = mode === 'dark' ? '#1C2A34' : '#E8F8F9'
  const tableHeadColor = mode === 'dark' ? p.primary.main : '#004D55'
  const rowHoverBg = mode === 'dark' ? '#1C2A34' : '#F0F7F8'
  const sidebarSelectedBg = mode === 'dark' ? p.primary.dark : '#006D77'

  return createTheme({
    palette: { mode, ...p, appointmentStatus: buildStatusPalette(p, mode) },
    typography: {
      fontFamily: "'Plus Jakarta Sans', 'Segoe UI', system-ui, sans-serif",
      h1: { fontSize: '2rem', fontWeight: 700, letterSpacing: '-0.5px' },
      h2: { fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.3px' },
      h3: { fontSize: '1.25rem', fontWeight: 600 },
      h4: { fontSize: '1rem', fontWeight: 600 },
      h5: { fontSize: '0.9375rem', fontWeight: 600 },
      h6: { fontSize: '0.875rem', fontWeight: 600 },
      body1: { fontSize: '0.9375rem' },
      body2: { fontSize: '0.8125rem' },
      caption: { fontSize: '0.6875rem' },
      button: { fontWeight: 600, textTransform: 'none' },
    },
    shape: { borderRadius: 10 },
    shadows: [
      'none',
      '0 1px 4px rgba(0,109,119,0.08)',
      '0 2px 8px rgba(0,109,119,0.10)',
      '0 4px 16px rgba(0,109,119,0.12)',
      '0 6px 24px rgba(0,109,119,0.14)',
      '0 8px 32px rgba(0,109,119,0.16)',
      ...Array(19).fill('0 8px 32px rgba(0,109,119,0.16)'),
    ],
    components: {
      MuiCssBaseline: {
        styleOverrides: { body: { backgroundColor: p.background.default } },
      },
      MuiButton: {
        styleOverrides: {
          root: { borderRadius: 8, fontWeight: 600, textTransform: 'none' },
          contained: { boxShadow: '0 2px 8px rgba(0,109,119,0.20)' },
        },
        defaultProps: { disableElevation: true },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            border: `1px solid ${p.divider}`,
            borderRadius: 12,
            boxShadow: mode === 'dark' ? '0 2px 8px rgba(0,0,0,0.35)' : '0 2px 8px rgba(0,109,119,0.08)',
            backgroundImage: 'none',
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: { borderRadius: 12, backgroundImage: 'none' },
          outlined: { borderColor: p.divider },
        },
      },
      MuiTextField: { defaultProps: { size: 'small', variant: 'outlined' } },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            '& fieldset': { borderColor: p.divider },
            '&:hover fieldset': { borderColor: p.primary.light },
          },
        },
      },
      MuiTableHead: {
        styleOverrides: {
          root: {
            '& .MuiTableCell-head': {
              background: tableHeadBg,
              color: tableHeadColor,
              fontWeight: 700,
              fontSize: '0.75rem',
              letterSpacing: '0.5px',
              textTransform: 'uppercase',
            },
          },
        },
      },
      MuiTableCell: {
        styleOverrides: { root: { borderColor: p.divider, fontSize: '0.8125rem' } },
      },
      MuiTableRow: {
        styleOverrides: { root: { '&:hover': { background: rowHoverBg } } },
      },
      MuiChip: {
        styleOverrides: { root: { fontWeight: 600, fontSize: '0.75rem' } },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: p.background.paper,
            borderBottom: `1px solid ${p.divider}`,
            boxShadow: 'none',
            color: p.text.primary,
            backgroundImage: 'none',
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: { borderRight: `1px solid ${p.divider}`, backgroundImage: 'none' },
        },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            margin: '2px 8px',
            '&:hover': { background: mode === 'dark' ? 'rgba(255,255,255,0.06)' : '#E8F8F9' },
            '&.Mui-selected': {
              background: sidebarSelectedBg,
              color: '#fff',
              '& .MuiListItemIcon-root': { color: '#fff' },
              '&:hover': { background: p.primary.dark },
            },
          },
        },
      },
      MuiListItemIcon: { styleOverrides: { root: { minWidth: 38 } } },
      MuiSkeleton: { defaultProps: { animation: 'wave' } },
      MuiAlert: {
        styleOverrides: { root: { borderRadius: 8, fontSize: '0.8125rem' } },
      },
      MuiDialog: {
        styleOverrides: {
          paper: { borderRadius: 14, backgroundImage: 'none' },
        },
      },
      MuiTooltip: {
        styleOverrides: { tooltip: { fontSize: '0.75rem', borderRadius: 6 } },
      },
      MuiTab: {
        styleOverrides: { root: { textTransform: 'none', fontWeight: 600 } },
      },
      MuiMenu: {
        styleOverrides: { paper: { backgroundImage: 'none' } },
      },
    },
  })
}

// Backward-compatible named export -- the light theme, unchanged from before.
export const medicalTheme = createAppTheme('light')

export default medicalTheme
