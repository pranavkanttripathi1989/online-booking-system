import { createTheme, alpha, lighten, darken } from '@mui/material/styles'
import { contrastRatio, WCAG_AA_MIN_CONTRAST } from './contrast'

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
    scheduled: tone(p.info.main, p.info.light, p.info.dark),
    pending: tone(p.warning.main, p.warning.light, p.warning.dark),
    cancelled: tone(p.error.main, p.error.light, p.error.dark),
    completed: tone(p.info.main, p.info.light, p.info.dark),
    rescheduled: tone(p.secondary.main, p.secondary.light, p.secondary.dark),
    no_show: tone(p.text.secondary, p.text.secondary, p.text.secondary),
  }
}

// A user-chosen accent (Settings > Appearance) overrides palette.primary.
// Must run BEFORE the rest of createAppTheme computes its literals -- most
// component overrides below (MuiOutlinedInput hover border, MuiCard/
// MuiPaper) bake in `p.primary.*` as build-time literals, not a live
// `theme.palette.primary` lookup, so patching palette.primary after
// createTheme() returns would miss them. Only MuiAlert's four `standard*`
// overrides use the dynamic `({theme}) => ...` form, and those read
// success/info/warning/error, never primary, so they're unaffected either
// way.
function buildPrimaryFromAccent(hex) {
  const contrastText = contrastRatio(hex, '#FFFFFF') >= WCAG_AA_MIN_CONTRAST ? '#fff' : '#000'
  return { main: hex, light: lighten(hex, 0.35), dark: darken(hex, 0.2), contrastText }
}

// FRONTEND_RULES.md RES-6 -- "never below 14px anywhere for any label,
// caption, helper or legal text." body2 (13px) and caption (11px) already
// violate this floor today at the default scale -- this clamp is a
// deliberate, in-scope side-fix (RES-6's own wording is unconditional, not
// "only when the user picks small"), not hidden scope creep.
const RES6_FLOOR_PX = 14
function scaledRem(baseRem, scale) {
  const px = Math.max(baseRem * 16 * scale, RES6_FLOOR_PX)
  return `${px / 16}rem`
}

function buildTypography(scale) {
  return {
    fontFamily: "'Plus Jakarta Sans', 'Segoe UI', system-ui, sans-serif",
    h1: { fontSize: scaledRem(2, scale), fontWeight: 700, letterSpacing: '-0.5px' },
    h2: { fontSize: scaledRem(1.5, scale), fontWeight: 700, letterSpacing: '-0.3px' },
    h3: { fontSize: scaledRem(1.25, scale), fontWeight: 600 },
    h4: { fontSize: scaledRem(1, scale), fontWeight: 600 },
    h5: { fontSize: scaledRem(0.9375, scale), fontWeight: 600 },
    h6: { fontSize: scaledRem(0.875, scale), fontWeight: 600 },
    body1: { fontSize: scaledRem(0.9375, scale) },
    body2: { fontSize: scaledRem(0.8125, scale) },
    caption: { fontSize: scaledRem(0.6875, scale) },
    button: { fontWeight: 600, textTransform: 'none' },
  }
}

/**
 * @param {'light'|'dark'} [mode]
 * @param {object} [options]
 * @param {string|null} [options.accentColor] - '#RRGGBB' override for
 *   palette.primary (Settings > Appearance). Falls back to the brand
 *   default when omitted/null.
 * @param {number} [options.fontScale=1] - multiplier applied to every
 *   typography variant, floor-clamped per RES-6. 1 = unchanged defaults.
 * @returns {import('@mui/material/styles').Theme}
 */
export function createAppTheme(mode = 'light', options = {}) {
  const { accentColor, fontScale = 1 } = options
  const base = mode === 'dark' ? DARK : LIGHT
  const p = accentColor ? { ...base, primary: buildPrimaryFromAccent(accentColor) } : base
  const tableHeadBg = mode === 'dark' ? '#1C2A34' : '#E8F8F9'
  // These two derive from p.primary in both modes (not just dark, as
  // before this fix) so a custom accent color affects nav-selected/
  // table-head consistently -- previously the light-mode branch was a
  // hardcoded copy of LIGHT.primary's own default values, which happened
  // to match but silently stopped following an accent override.
  const tableHeadColor = mode === 'dark' ? p.primary.main : p.primary.dark
  const rowHoverBg = mode === 'dark' ? '#1C2A34' : '#F0F7F8'
  const sidebarSelectedBg = mode === 'dark' ? p.primary.dark : p.primary.main

  return createTheme({
    palette: { mode, ...p, appointmentStatus: buildStatusPalette(p, mode) },
    typography: buildTypography(fontScale),
    shape: { borderRadius: 10 },
    // Deliberately stays pinned to the fixed brand-teal tint regardless of
    // a custom accent -- this is a decorative shadow tone, not something
    // palette.primary-driven elsewhere in this file, and re-deriving every
    // shadow stop from an arbitrary user-picked accent is out of scope for
    // this fix (mirrors AppShell.jsx's own "deliberately dark rail"
    // precedent for a chrome detail that doesn't follow user preference).
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
      // BUG (found live 2026-08-29): MUI's own default dark-mode background
      // calculation for the 'standard' Alert variant produced a background
      // *darker* than the Card/Paper surface it usually sits on (measured:
      // rgb(14,19,25) alert vs rgb(22,35,45) card) -- instead of reading as
      // a highlighted callout, it read as a hole, and the real 16-24px
      // margin around it looked like "no spacing" because there was no
      // colour contrast left to make the gap legible. Overridden with an
      // explicit background/text built from our own palette via alpha(),
      // matching the same tone convention chips/status pills already use.
      MuiAlert: {
        styleOverrides: {
          root: { borderRadius: 8, fontSize: '0.8125rem', border: '1px solid' },
          standardSuccess: ({ theme }) => ({
            backgroundColor: alpha(theme.palette.success.main, theme.palette.mode === 'dark' ? 0.16 : 0.12),
            color: theme.palette.mode === 'dark' ? theme.palette.success.light : theme.palette.success.dark,
            borderColor: alpha(theme.palette.success.main, 0.3),
            '& .MuiAlert-icon': { color: theme.palette.success.main },
          }),
          standardInfo: ({ theme }) => ({
            backgroundColor: alpha(theme.palette.info.main, theme.palette.mode === 'dark' ? 0.16 : 0.12),
            color: theme.palette.mode === 'dark' ? theme.palette.info.light : theme.palette.info.dark,
            borderColor: alpha(theme.palette.info.main, 0.3),
            '& .MuiAlert-icon': { color: theme.palette.info.main },
          }),
          standardWarning: ({ theme }) => ({
            backgroundColor: alpha(theme.palette.warning.main, theme.palette.mode === 'dark' ? 0.16 : 0.12),
            color: theme.palette.mode === 'dark' ? theme.palette.warning.light : theme.palette.warning.dark,
            borderColor: alpha(theme.palette.warning.main, 0.3),
            '& .MuiAlert-icon': { color: theme.palette.warning.main },
          }),
          standardError: ({ theme }) => ({
            backgroundColor: alpha(theme.palette.error.main, theme.palette.mode === 'dark' ? 0.16 : 0.12),
            color: theme.palette.mode === 'dark' ? theme.palette.error.light : theme.palette.error.dark,
            borderColor: alpha(theme.palette.error.main, 0.3),
            '& .MuiAlert-icon': { color: theme.palette.error.main },
          }),
        },
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
      // BUG (found live 2026-08-29): src/index.css had a global,
      // `!important`-laden `.MuiDataGrid-*` block hardcoded to the light
      // palette (#202124 cell text, #f8f9fa header/hover) -- it beat every
      // theme-aware `sx` override on the page that actually uses DataGrid
      // (appointments/index.jsx), rendering dark-on-dark unreadable cell
      // text in dark mode. FRONTEND_RULES.md UI-5 already banned exactly
      // this pattern ("never a global CSS file, never !important"); this
      // is the real, theme-token-driven replacement, reusing the same
      // tableHeadBg/tableHeadColor/rowHoverBg tokens MuiTableHead/MuiTableRow
      // already use above, so the two table styling systems stay in sync.
      MuiDataGrid: {
        styleOverrides: {
          root: { border: `1px solid ${p.divider}`, borderRadius: 16 },
          columnHeaders: { backgroundColor: tableHeadBg, borderBottom: `1px solid ${p.divider}` },
          columnHeader: {
            fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: tableHeadColor,
          },
          row: { '&:hover': { backgroundColor: rowHoverBg } },
          cell: { borderBottom: `1px solid ${p.divider}`, fontSize: '0.875rem', color: p.text.primary },
          footerContainer: { borderTop: `1px solid ${p.divider}`, background: tableHeadBg },
          selectedRowCount: { color: p.text.secondary, fontSize: '0.8rem' },
        },
      },
    },
  })
}

// Backward-compatible named export -- the light theme, unchanged from before.
export const medicalTheme = createAppTheme('light')

export default medicalTheme
