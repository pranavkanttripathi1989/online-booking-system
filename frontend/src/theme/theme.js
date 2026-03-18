import { createTheme, alpha } from '@mui/material/styles'

/*
 * MEDIBOOK — Google Color System (v4.0)
 * ────────────────────────────────────────────────────────────────────
 * Primary      #1A73E8   Buttons, links, active nav, focus rings
 * Primary lt   #4285F4   Gradients, icon fills
 * Primary dk   #1557B0   Hover/pressed
 * P. Surface   #E8F0FE   Chips, active fills, selected bg
 * P. Border    #AECBFA   Chip borders, focus outlines
 *
 * Green        #0F9D58   Confirmed, success, availability
 * G. Surface   #E6F4EA   Confirmed chip bg
 *
 * Yellow       #F9AB00   Pending, warnings, ratings
 * Y. Surface   #FEF7E0   Pending chip bg
 *
 * Red          #D93025   Cancelled, errors, emergency
 * R. Surface   #FCE8E6   Error chip bg
 *
 * Purple       #9334E6   Rescheduled, analytics
 * P. Surface   #F3E8FD   Purple chip bg
 *
 * Orange       #FA7B17   Revenue KPI
 * Sidebar      #202124   Dark nav panel
 *
 * Page bg      #F8F9FA   Canvas
 * Card bg      #FFFFFF   All cards
 * Border       #E8EAED   Hairlines
 * Hover        #F1F3F4   Row/button hover
 *
 * Text 1       #202124   Headings, values
 * Text 2       #5F6368   Labels, captions
 * Text 3       #9AA0A6   Placeholder, disabled
 * ────────────────────────────────────────────────────────────────────
 */

// ─── Google Material 3 Color Tokens ──────────────────────────────────────────
export const COLORS = {
  // Primary — Google Blue
  blue50:  '#E8F0FE',
  blue100: '#D2E3FC',
  blue200: '#AECBFA',
  blue400: '#4285F4',
  blue600: '#1A73E8',   // ★ Primary Brand
  blue800: '#1557B0',
  blue900: '#0D47A1',

  // Accent — Google Green
  emerald50:  '#E6F4EA',
  emerald100: '#CEEAD6',
  emerald300: '#2DC49A',
  emerald500: '#1BB371',
  emerald700: '#0F9D58',  // ★ Accent Brand
  emerald900: '#0B8043',

  // Neutral — Google Grays
  ink50:  '#F8F9FA',
  ink100: '#E8EAED',
  ink300: '#BDC1C6',
  ink500: '#80868B',
  ink700: '#5F6368',
  ink900: '#3C4043',
  ink950: '#202124',

  // Status
  amber:    '#F9AB00',
  red:      '#D93025',
  violet:   '#9334E6',
  orange:   '#FA7B17',
  pink:     '#EA4335',

  // Sidebar
  sidebarBg: '#202124',
}

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: COLORS.blue600,
      light: COLORS.blue400,
      dark: COLORS.blue800,
      '50': COLORS.blue50,
      '100': COLORS.blue100,
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: COLORS.emerald700,
      light: COLORS.emerald500,
      dark: COLORS.emerald900,
      contrastText: '#FFFFFF',
    },
    success: {
      main: COLORS.emerald700,
      light: COLORS.emerald500,
      dark: COLORS.emerald900,
      contrastText: '#FFFFFF',
    },
    warning: {
      main: COLORS.amber,
      light: '#FBBC04',
      dark: '#F29900',
      contrastText: '#202124',
    },
    error: {
      main: COLORS.red,
      light: '#EA4335',
      dark: '#B31412',
      contrastText: '#FFFFFF',
    },
    info: {
      main: COLORS.blue400,
      light: COLORS.blue200,
      dark: COLORS.blue600,
      contrastText: '#FFFFFF',
    },
    background: {
      default: COLORS.ink50,
      paper: '#FFFFFF',
    },
    text: {
      primary: COLORS.ink950,
      secondary: COLORS.ink700,
      disabled: COLORS.ink500,
    },
    divider: COLORS.ink100,
    grey: {
      50:  COLORS.ink50,
      100: COLORS.ink100,
      300: COLORS.ink300,
      500: COLORS.ink500,
      700: COLORS.ink700,
      900: COLORS.ink900,
    },
    // Custom appointment status tokens
    appointment: {
      pending:     COLORS.amber,
      confirmed:   COLORS.emerald700,
      cancelled:   COLORS.red,
      completed:   COLORS.blue600,
      no_show:     COLORS.ink500,
      rescheduled: COLORS.violet,
    },
  },

  typography: {
    fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    h1: { fontSize: '2rem',    fontWeight: 800, lineHeight: 1.2, letterSpacing: '-0.5px' },
    h2: { fontSize: '1.75rem', fontWeight: 700, lineHeight: 1.25, letterSpacing: '-0.4px' },
    h3: { fontSize: '1.375rem',fontWeight: 700, lineHeight: 1.35, letterSpacing: '-0.3px' },
    h4: { fontSize: '1.125rem',fontWeight: 700, lineHeight: 1.4, letterSpacing: '-0.2px' },
    h5: { fontSize: '1rem',    fontWeight: 600, lineHeight: 1.5 },
    h6: { fontSize: '0.9375rem', fontWeight: 600, lineHeight: 1.5 },
    body1: { fontSize: '0.9375rem', lineHeight: 1.7, color: COLORS.ink700 },
    body2: { fontSize: '0.875rem',  lineHeight: 1.65, color: COLORS.ink700 },
    subtitle1: { fontSize: '0.9375rem', fontWeight: 500 },
    subtitle2: { fontSize: '0.875rem', fontWeight: 600 },
    button: { fontWeight: 700, textTransform: 'none', letterSpacing: '0.01em' },
    caption: { fontSize: '0.75rem', color: COLORS.ink500, lineHeight: 1.5, fontWeight: 500 },
    overline: { fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: COLORS.ink500 },
  },

  shape: {
    borderRadius: 10,
  },

  shadows: [
    'none',
    '0 1px 2px rgba(32,33,36,0.08), 0 2px 6px rgba(32,33,36,0.04)',
    '0 4px 8px rgba(32,33,36,0.08), 0 2px 4px rgba(32,33,36,0.04)',
    '0 8px 20px rgba(32,33,36,0.10), 0 4px 8px rgba(32,33,36,0.04)',
    '0 12px 32px rgba(32,33,36,0.12)',
    '0 24px 56px rgba(32,33,36,0.16)',
    ...Array(20).fill('none'),
  ],

  components: {
    // ── Button ──────────────────────────────────────────────────────────────
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          paddingTop: 9,
          paddingBottom: 9,
          paddingLeft: 22,
          paddingRight: 22,
          fontWeight: 700,
          fontSize: '0.875rem',
          boxShadow: 'none',
          transition: 'all 0.18s ease',
          '&:hover': {
            boxShadow: 'none',
            transform: 'translateY(-1px)',
          },
          '&:active': { transform: 'translateY(0)' },
          '&.Mui-disabled': {
            background: COLORS.ink50,
            color: COLORS.ink300,
            border: `1.5px solid ${COLORS.ink100}`,
          },
        },
        containedPrimary: {
          background: `linear-gradient(135deg, ${COLORS.blue400} 0%, ${COLORS.blue600} 100%)`,
          '&:hover': {
            background: `linear-gradient(135deg, ${COLORS.blue600} 0%, ${COLORS.blue800} 100%)`,
            boxShadow: `0 6px 20px ${alpha(COLORS.blue600, 0.38)}`,
          },
        },
        containedSuccess: {
          background: `linear-gradient(135deg, ${COLORS.emerald500} 0%, ${COLORS.emerald700} 100%)`,
          color: '#fff',
          '&:hover': {
            background: `linear-gradient(135deg, ${COLORS.emerald700} 0%, ${COLORS.emerald900} 100%)`,
            boxShadow: `0 6px 20px ${alpha(COLORS.emerald700, 0.35)}`,
          },
        },
        outlined: {
          borderWidth: '1.5px',
          '&:hover': {
            borderWidth: '1.5px',
          },
        },
        outlinedPrimary: {
          background: COLORS.blue50,
          borderColor: COLORS.blue200,
          color: COLORS.blue600,
          '&:hover': {
            background: COLORS.blue100,
            borderColor: COLORS.blue200,
          },
        },
        sizeSmall: {
          paddingTop: 5,
          paddingBottom: 5,
          paddingLeft: 14,
          paddingRight: 14,
          fontSize: '0.8125rem',
          borderRadius: 8,
        },
        sizeLarge: {
          paddingTop: 13,
          paddingBottom: 13,
          paddingLeft: 28,
          paddingRight: 28,
          fontSize: '1rem',
        },
      },
    },

    // ── Card ────────────────────────────────────────────────────────────────
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 1px 2px rgba(32,33,36,0.08), 0 2px 6px rgba(32,33,36,0.04)',
          border: `1px solid ${COLORS.ink100}`,
          transition: 'box-shadow 0.2s ease, transform 0.2s ease',
          backgroundImage: 'none',
          '&:hover': {
            boxShadow: '0 4px 12px rgba(32,33,36,0.16)',
          },
        },
      },
    },

    MuiCardContent: {
      styleOverrides: {
        root: { '&:last-child': { paddingBottom: 24 } },
      },
    },

    // ── Chip ────────────────────────────────────────────────────────────────
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 700,
          borderRadius: 8,
          fontSize: '0.72rem',
          letterSpacing: '0.02em',
        },
        sizeSmall: { height: 24, fontSize: '0.68rem' },
      },
    },

    // ── TextField ───────────────────────────────────────────────────────────
    MuiTextField: {
      defaultProps: { size: 'small', variant: 'outlined' },
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 10,
            backgroundColor: '#FFFFFF',
            fontSize: '0.875rem',
            transition: 'box-shadow 0.18s ease',
            '& fieldset': { borderColor: COLORS.ink100, borderWidth: '1.5px' },
            '&:hover fieldset': { borderColor: COLORS.ink300 },
            '&.Mui-focused fieldset': { borderColor: COLORS.blue600, borderWidth: '2px' },
            '&.Mui-focused': { boxShadow: `0 0 0 3px ${alpha(COLORS.blue600, 0.12)}` },
          },
          '& .MuiInputLabel-root': {
            fontSize: '0.875rem',
            color: COLORS.ink500,
            '&.Mui-focused': { color: COLORS.blue600 },
          },
          '& .MuiFormHelperText-root': { fontSize: '0.75rem', fontWeight: 500 },
        },
      },
    },

    // ── Table ───────────────────────────────────────────────────────────────
    MuiTableCell: {
      styleOverrides: {
        head: {
          backgroundColor: COLORS.ink50,
          fontWeight: 700,
          fontSize: '0.70rem',
          textTransform: 'uppercase',
          letterSpacing: '0.10em',
          color: COLORS.ink500,
          borderBottom: `1px solid ${COLORS.ink100}`,
          padding: '12px 16px',
        },
        body: {
          color: COLORS.ink950,
          borderBottom: `1px solid ${COLORS.ink50}`,
          fontSize: '0.875rem',
          padding: '14px 16px',
        },
      },
    },

    MuiTableRow: {
      styleOverrides: {
        root: {
          transition: 'background-color 0.15s ease',
          '&:hover': { backgroundColor: COLORS.ink50 },
          '&:last-child td': { borderBottom: 'none' },
        },
      },
    },

    // ── AppBar ──────────────────────────────────────────────────────────────
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#FFFFFF',
          color: COLORS.ink950,
          boxShadow: 'none',
          borderBottom: `1px solid ${COLORS.ink100}`,
          backgroundImage: 'none',
        },
      },
    },

    // ── Drawer (Sidebar) ────────────────────────────────────────────────────
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: COLORS.sidebarBg,   // #202124 Google Dark
          color: COLORS.ink300,
          borderRight: 'none',
          backgroundImage: 'none',
        },
      },
    },

    // ── ListItemButton (Sidebar nav) ─────────────────────────────────────────
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          marginBottom: 2,
          marginLeft: 8,
          marginRight: 8,
          transition: 'all 0.15s ease',
          color: 'rgba(255,255,255,0.60)',
          '&.Mui-selected': {
            background: 'linear-gradient(135deg, rgba(66,133,244,0.90) 0%, rgba(26,115,232,0.95) 100%)',
            color: '#FFFFFF',
            boxShadow: '0 2px 12px rgba(26,115,232,0.38)',
            '& .MuiListItemIcon-root': { color: '#FFFFFF' },
            '&:hover': {
              background: 'linear-gradient(135deg, rgba(26,115,232,0.95) 0%, rgba(21,87,176,0.98) 100%)',
            },
          },
          '&:hover': {
            backgroundColor: 'rgba(255,255,255,0.08)',
            color: '#FFFFFF',
          },
        },
      },
    },

    MuiListItemIcon: {
      styleOverrides: {
        root: { color: 'rgba(255,255,255,0.60)', minWidth: 38 },
      },
    },

    // ── Alert ───────────────────────────────────────────────────────────────
    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: 12, fontSize: '0.875rem', fontWeight: 500 },
        standardSuccess: {
          backgroundColor: COLORS.emerald50,
          color: '#0B8043',
          '& .MuiAlert-icon': { color: COLORS.emerald700 },
        },
        standardError: {
          backgroundColor: '#FCE8E6',
          color: '#A50E0E',
          '& .MuiAlert-icon': { color: COLORS.red },
        },
        standardWarning: {
          backgroundColor: '#FEF7E0',
          color: '#8A4700',
          '& .MuiAlert-icon': { color: COLORS.amber },
        },
        standardInfo: {
          backgroundColor: COLORS.blue50,
          color: COLORS.blue800,
          '& .MuiAlert-icon': { color: COLORS.blue600 },
        },
      },
    },

    // ── Menu ────────────────────────────────────────────────────────────────
    MuiMenu: {
      styleOverrides: {
        paper: {
          borderRadius: 14,
          boxShadow: '0 8px 32px rgba(32,33,36,0.18)',
          border: `1px solid ${COLORS.ink100}`,
          backgroundImage: 'none',
        },
      },
    },

    MuiMenuItem: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          margin: '2px 8px',
          fontSize: '0.875rem',
          fontWeight: 500,
          '&:hover': { backgroundColor: COLORS.ink50 },
          '&.Mui-selected': {
            backgroundColor: COLORS.blue50,
            color: COLORS.blue600,
            '&:hover': { backgroundColor: COLORS.blue100 },
          },
        },
      },
    },

    // ── Tooltip ─────────────────────────────────────────────────────────────
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: COLORS.ink950,
          fontSize: '0.72rem',
          borderRadius: 8,
          padding: '6px 12px',
          fontWeight: 600,
        },
        arrow: { color: COLORS.ink950 },
      },
    },

    // ── Divider ─────────────────────────────────────────────────────────────
    MuiDivider: {
      styleOverrides: {
        root: { borderColor: COLORS.ink100 },
      },
    },

    // ── Dialog (Modals) ─────────────────────────────────────────────────────
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 20,
          boxShadow: '0 20px 60px rgba(32,33,36,0.20)',
          border: `1px solid ${COLORS.ink100}`,
        },
      },
    },

    MuiDialogTitle: {
      styleOverrides: {
        root: {
          fontSize: '1.125rem',
          fontWeight: 700,
          padding: '24px 28px 16px',
          color: COLORS.ink950,
        },
      },
    },

    // ── Paper ───────────────────────────────────────────────────────────────
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: 'none' },
        rounded: { borderRadius: 16 },
      },
    },

    // ── Tabs ────────────────────────────────────────────────────────────────
    MuiTabs: {
      styleOverrides: {
        root: { borderBottom: `1px solid ${COLORS.ink100}` },
        indicator: { height: 3, borderRadius: '3px 3px 0 0', backgroundColor: COLORS.blue600 },
      },
    },

    MuiTab: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          fontSize: '0.875rem',
          textTransform: 'none',
          color: COLORS.ink700,
          '&.Mui-selected': { color: COLORS.blue600 },
        },
      },
    },

    // ── Skeleton ────────────────────────────────────────────────────────────
    MuiSkeleton: {
      styleOverrides: {
        root: { backgroundColor: COLORS.ink100 },
      },
    },

    // ── Avatar ──────────────────────────────────────────────────────────────
    MuiAvatar: {
      styleOverrides: {
        root: { fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif" },
      },
    },

    // ── Badge ───────────────────────────────────────────────────────────────
    MuiBadge: {
      styleOverrides: {
        badge: {
          fontWeight: 700,
          fontSize: '0.6rem',
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          backgroundColor: '#D93025',
          color: '#FFFFFF',
        },
      },
    },

    // ── LinearProgress ──────────────────────────────────────────────────────
    MuiLinearProgress: {
      styleOverrides: {
        root: { borderRadius: 4, backgroundColor: COLORS.ink100 },
        bar: { borderRadius: 4 },
      },
    },

    // ── Switch ──────────────────────────────────────────────────────────────
    MuiSwitch: {
      styleOverrides: {
        switchBase: {
          '&.Mui-checked': {
            color: COLORS.blue600,
            '& + .MuiSwitch-track': {
              backgroundColor: COLORS.blue600,
              opacity: 0.9,
            },
          },
        },
      },
    },
  },
})

export default theme
