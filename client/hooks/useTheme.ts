import { theme } from "@/constants/theme";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useAppSafe, ThemeMode } from "@/contexts/AppContext";

// Define light and dark themes
const lightTheme = {
  ...theme,
  colors: {
    ...theme.colors,
    background: '#FFFFFF',
    backgroundSecondary: '#F8FAFC',
    surface: '#FFFFFF',
    text: {
      primary: '#0F172A',
      secondary: '#475569',
      disabled: '#94A3B8',
      inverse: '#FFFFFF',
    },
  },
  gradientStart: '#FFFFFF',
  gradientEnd: '#F5F5F5',
  backgroundRoot: '#F5F5F5',
  background: '#FFFFFF',
  backgroundSecondary: '#F5F5F5',
  card: '#FFFFFF',
  border: '#E0E0E0',
  text: '#0F172A',
  textSecondary: '#475569',
};

const darkTheme = {
  ...theme,
  colors: {
    ...theme.colors,
    background: '#000000',
    backgroundSecondary: '#1A1A1A',
    surface: '#1A1A1A',
    text: {
      primary: '#FFFFFF',
      secondary: '#B0B0B0',
      disabled: '#666666',
      inverse: '#000000',
    },
  },
  gradientStart: '#000000',
  gradientEnd: '#1A1A1A',
  backgroundRoot: '#000000',
  background: '#000000',
  backgroundSecondary: '#1A1A1A',
  card: '#1A1A1A',
  border: '#333333',
  text: '#FFFFFF',
  textSecondary: '#B0B0B0',
};

const Colors = {
  light: lightTheme,
  dark: darkTheme,
};

export function useTheme() {
  const systemColorScheme = useColorScheme();
  const appContext = useAppSafe();

  const themeMode: ThemeMode = appContext?.themeMode ?? "system";
  const setThemeMode = appContext?.setThemeMode ?? (async () => {});

  const effectiveScheme =
    themeMode === "system" ? (systemColorScheme ?? "light") : themeMode;

  const isDark = effectiveScheme === "dark";
  const themeData = isDark ? darkTheme : lightTheme;

  console.log('🎨 Theme Debug:', { themeMode, systemColorScheme, effectiveScheme, isDark });

  // Ensure gradients always have values (critical for Android LinearGradient)
  const safeTheme = {
    ...themeData,
    gradientStart: themeData?.gradientStart ?? (isDark ? '#000000' : '#FFFFFF'),
    gradientEnd: themeData?.gradientEnd ?? (isDark ? '#1A1A1A' : '#F5F5F5'),
  };

  return {
    theme: safeTheme,
    isDark,
    themeMode,
    setThemeMode,
  };
}
