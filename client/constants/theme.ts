import { useColorScheme } from 'react-native';

// Colores para tema claro
const lightColors = {
  primary: '#8B5CF6',
  primaryDark: '#7C3AED',
  primaryLight: '#A78BFA',
  secondary: '#3B82F6',
  background: '#FFFFFF',
  backgroundSecondary: '#F8FAFC',
  surface: '#FFFFFF',
  error: '#EF4444',
  warning: '#F59E0B',
  success: '#10B981',
  info: '#3B82F6',
  text: {
    primary: '#0F172A',
    secondary: '#475569',
    disabled: '#94A3B8',
    inverse: '#FFFFFF',
  },
  border: '#E2E8F0',
  divider: '#F1F5F9',
  overlay: 'rgba(0, 0, 0, 0.5)',
  astrobar: {
    purple: '#8B5CF6',
    blue: '#3B82F6',
    gold: '#FFD700',
  },
};

// Colores para tema oscuro
const darkColors = {
  primary: '#8B5CF6',
  primaryDark: '#7C3AED',
  primaryLight: '#A78BFA',
  secondary: '#3B82F6',
  background: '#0F172A',
  backgroundSecondary: '#1E293B',
  surface: '#1E293B',
  error: '#EF4444',
  warning: '#F59E0B',
  success: '#10B981',
  info: '#3B82F6',
  text: {
    primary: '#F1F5F9',
    secondary: '#94A3B8',
    disabled: '#475569',
    inverse: '#0F172A',
  },
  border: '#334155',
  divider: '#1E293B',
  overlay: 'rgba(0, 0, 0, 0.7)',
  astrobar: {
    purple: '#8B5CF6',
    blue: '#3B82F6',
    gold: '#FFD700',
  },
};

const baseTheme = {
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
    "3xl": 56,
    "4xl": 64,
    buttonHeight: 52,
  },
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    full: 9999,
  },
  typography: {
    h1: { fontSize: 32, fontWeight: '700' as const, lineHeight: 40 },
    h2: { fontSize: 24, fontWeight: '700' as const, lineHeight: 32 },
    h3: { fontSize: 20, fontWeight: '600' as const, lineHeight: 28 },
    h4: { fontSize: 18, fontWeight: '600' as const, lineHeight: 24 },
    body: { fontSize: 16, fontWeight: '400' as const, lineHeight: 24 },
    bodySmall: { fontSize: 14, fontWeight: '400' as const, lineHeight: 20 },
    caption: { fontSize: 12, fontWeight: '400' as const, lineHeight: 16 },
    button: { fontSize: 16, fontWeight: '600' as const, lineHeight: 24 },
  },
  shadows: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
      elevation: 4,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 8,
    },
  },
};

// Hook que detecta el tema del sistema
export const useTheme = () => {
  const colorScheme = useColorScheme();
  console.log('🎨 Color scheme detected:', colorScheme);
  const isDark = colorScheme === 'dark';
  console.log('🌙 Is dark mode:', isDark);
  
  return {
    ...baseTheme,
    colors: isDark ? darkColors : lightColors,
    isDark,
  };
};

// Tema por defecto (oscuro para compatibilidad)
export const theme = {
  ...baseTheme,
  colors: darkColors,
};

export type Theme = typeof theme;

// Export individual objects for easier imports
export const AstroBarColors = theme.colors;
export const Spacing = baseTheme.spacing;
export const BorderRadius = baseTheme.borderRadius;
export const Typography = baseTheme.typography;
export const Shadows = baseTheme.shadows;