import { createTheme, responsiveFontSizes, type ThemeOptions } from '@mui/material/styles';

/**
 * KSM AutoPilot — Centralized Design System
 *
 * Premium Light (default) + optional Dark theme.
 * Inter typography, Lucide icons, 8px spacing, 12px card / 8px input radius.
 */

const sharedConfig = (isDark: boolean): Partial<ThemeOptions> => ({
  typography: {
    fontFamily: '"Inter Variable", "Inter", -apple-system, "Segoe UI", sans-serif',
    h1: { fontWeight: 700, letterSpacing: '-0.02em' },
    h2: { fontWeight: 700, letterSpacing: '-0.02em' },
    h3: { fontWeight: 600, letterSpacing: '-0.01em' },
    h4: { fontWeight: 600, letterSpacing: '-0.01em' },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600, letterSpacing: '0.01em' },
    button: { fontWeight: 600, letterSpacing: '0.01em', textTransform: 'none' },
    caption: { fontSize: '0.75rem', letterSpacing: '0.01em' },
    overline: {
      fontWeight: 600,
      letterSpacing: '0.08em',
      fontSize: '0.6875rem',
      textTransform: 'uppercase',
    },
  },
  shape: { borderRadius: 8 },
  spacing: 8,
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: isDark ? '#0B1220' : '#F8FAFC',
        },
        '*::-webkit-scrollbar': { width: 6, height: 6 },
        '*::-webkit-scrollbar-track': { backgroundColor: 'transparent' },
        '*::-webkit-scrollbar-thumb': {
          backgroundColor: isDark ? '#263449' : '#CBD5E1',
          borderRadius: 3,
        },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: 8,
          padding: '8px 16px',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          border: `1px solid ${isDark ? '#263449' : '#E2E8F0'}`,
          boxShadow: 'none',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: 'none',
          borderBottom: `1px solid ${isDark ? '#263449' : '#E2E8F0'}`,
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: { borderRight: 'none' },
      },
    },
    MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
    MuiChip: { styleOverrides: { root: { borderRadius: 6, fontWeight: 600, fontSize: '0.72rem' } } },
    MuiTableCell: {
      styleOverrides: {
        head: { fontWeight: 600, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em' },
        root: { borderColor: isDark ? '#263449' : '#E2E8F0' },
      },
    },
    MuiTooltip: {
      styleOverrides: { tooltip: { fontSize: '0.72rem', borderRadius: 6, padding: '4px 8px' } },
    },
    MuiOutlinedInput: {
      styleOverrides: { root: { borderRadius: 8 } },
    },
    MuiTextField: { defaultProps: { size: 'small' } },
  },
});

const lightOptions: ThemeOptions = {
  palette: {
    mode: 'light',
    primary: {
      main: '#2563EB', light: '#3B82F6', dark: '#1D4ED8', contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#7C3AED', light: '#A78BFA', dark: '#6D28D9', contrastText: '#FFFFFF',
    },
    background: { default: '#F8FAFC', paper: '#FFFFFF' },
    text: { primary: '#0F172A', secondary: '#64748B' },
    error: { main: '#DC2626', light: '#FCA5A5', dark: '#991B1B', contrastText: '#FFFFFF' },
    success: { main: '#15803D', light: '#4ADE80', dark: '#166534', contrastText: '#FFFFFF' },
    warning: { main: '#B45309', light: '#FBBF24', dark: '#92400E', contrastText: '#FFFFFF' },
    info: { main: '#0EA5E9', light: '#38BDF8', dark: '#0369A1', contrastText: '#FFFFFF' },
    divider: '#E2E8F0',
  },
};

const darkOptions: ThemeOptions = {
  palette: {
    mode: 'dark',
    primary: {
      main: '#60A5FA', light: '#93C5FD', dark: '#2563EB', contrastText: '#0B1220',
    },
    secondary: {
      main: '#A78BFA', light: '#C4B5FD', dark: '#7C3AED', contrastText: '#0B1220',
    },
    background: { default: '#0B1220', paper: '#172235' },
    text: { primary: '#F8FAFC', secondary: '#94A3B8' },
    error: { main: '#F87171', light: '#FCA5A5', dark: '#DC2626', contrastText: '#0B1220' },
    success: { main: '#4ADE80', light: '#86EFAC', dark: '#15803D', contrastText: '#0B1220' },
    warning: { main: '#FBBF24', light: '#FCD34D', dark: '#B45309', contrastText: '#0B1220' },
    info: { main: '#38BDF8', light: '#7DD3FC', dark: '#0EA5E9', contrastText: '#0B1220' },
    divider: '#263449',
  },
};

export function createAppTheme(mode: 'light' | 'dark') {
  const isDark = mode === 'dark';
  const baseOptions = isDark ? darkOptions : lightOptions;
  const shared = sharedConfig(isDark);

  // Merge palette + shared config into a single createTheme call
  const merged: ThemeOptions = {
    ...baseOptions,
    ...shared,
    typography: { ...baseOptions.typography, ...shared.typography },
    components: { ...baseOptions.components, ...shared.components },
    shape: shared.shape ?? { borderRadius: 8 },
    spacing: shared.spacing ?? 8,
  };

  return responsiveFontSizes(createTheme(merged));
}

export const lightTheme = createAppTheme('light');
export const darkTheme = createAppTheme('dark');
export { lightTheme as theme };
