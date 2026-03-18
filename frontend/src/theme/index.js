import { createTheme } from '@mui/material/styles';

export const medicalTheme = createTheme({
  palette: {
    primary: {
      main: '#006D77',
      light: '#83C5BE',
      dark: '#004D55',
      contrastText: '#fff',
    },
    secondary: {
      main: '#E29578',
      light: '#FFDDD2',
      dark: '#C47758',
      contrastText: '#fff',
    },
    success: { main: '#2DC653', light: '#D1FAE5', dark: '#16A34A' },
    warning: { main: '#FFB703', light: '#FEF3C7', dark: '#D97706' },
    error:   { main: '#E63946', light: '#FFE4E6', dark: '#B91C1C' },
    info:    { main: '#3A86FF', light: '#DBEAFE', dark: '#1D4ED8' },
    background: { default: '#F0F7F8', paper: '#FFFFFF' },
    text: { primary: '#1A2B3C', secondary: '#5A7184' },
    divider: '#D0E8EA',
  },
  typography: {
    fontFamily: "'Plus Jakarta Sans', 'Segoe UI', system-ui, sans-serif",
    h1: { fontSize: '2rem',     fontWeight: 700, letterSpacing: '-0.5px' },
    h2: { fontSize: '1.5rem',   fontWeight: 700, letterSpacing: '-0.3px' },
    h3: { fontSize: '1.25rem',  fontWeight: 600 },
    h4: { fontSize: '1rem',     fontWeight: 600 },
    h5: { fontSize: '0.9375rem',fontWeight: 600 },
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
          border: '1px solid #D0E8EA',
          borderRadius: 12,
          boxShadow: '0 2px 8px rgba(0,109,119,0.08)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { borderRadius: 12 },
        outlined: { borderColor: '#D0E8EA' },
      },
    },
    MuiTextField: {
      defaultProps: { size: 'small', variant: 'outlined' },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          '& fieldset': { borderColor: '#D0E8EA' },
          '&:hover fieldset': { borderColor: '#83C5BE' },
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-head': {
            background: '#E8F8F9',
            color: '#004D55',
            fontWeight: 700,
            fontSize: '0.75rem',
            letterSpacing: '0.5px',
            textTransform: 'uppercase',
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: { borderColor: '#E8F0F2', fontSize: '0.8125rem' },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: { '&:hover': { background: '#F0F7F8' } },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 600, fontSize: '0.75rem' },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#fff',
          borderBottom: '1px solid #D0E8EA',
          boxShadow: 'none',
          color: '#1A2B3C',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: { borderRight: '1px solid #D0E8EA' },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          margin: '2px 8px',
          '&:hover': { background: '#E8F8F9' },
          '&.Mui-selected': {
            background: '#006D77',
            color: '#fff',
            '& .MuiListItemIcon-root': { color: '#fff' },
            '&:hover': { background: '#004D55' },
          },
        },
      },
    },
    MuiListItemIcon: {
      styleOverrides: { root: { minWidth: 38 } },
    },
    MuiSkeleton: {
      defaultProps: { animation: 'wave' },
    },
    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: 8, fontSize: '0.8125rem' },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: { borderRadius: 14 },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: { fontSize: '0.75rem', borderRadius: 6 },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: { textTransform: 'none', fontWeight: 600 },
      },
    },
  },
});

export default medicalTheme;
