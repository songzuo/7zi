/**
 * Theme System Type Definitions
 * 
 * TypeScript types for the theme management system
 */

export type ThemeMode = 'light' | 'dark' | 'system';

export type ResolvedTheme = 'light' | 'dark';

export interface ThemeColors {
  // Background colors
  background: string;
  surface: string;
  surfaceHover: string;
  surfaceActive: string;
  
  // Text colors
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textInverse: string;
  
  // Brand colors
  primary: string;
  primaryHover: string;
  primaryActive: string;
  secondary: string;
  secondaryHover: string;
  
  // Status colors
  success: string;
  warning: string;
  error: string;
  info: string;
  
  // Border colors
  border: string;
  borderHover: string;
  borderFocus: string;
  
  // Shadow
  shadow: string;
  shadowLg: string;
  
  // Code/Syntax
  codeBackground: string;
  codeText: string;
  
  // Chart colors
  chartColors: string[];
}

export interface ThemeConfig {
  mode: ThemeMode;
  colors: {
    light: ThemeColors;
    dark: ThemeColors;
  };
  transitions: {
    duration: number;
    timing: string;
  };
  autoSwitch: {
    enabled: boolean;
    timeBased: boolean;
    dayStart: number;
    nightStart: number;
  };
}

export interface ThemeContextValue {
  mode: ThemeMode;
  resolvedTheme: ResolvedTheme;
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
  timeBasedEnabled: boolean;
  setTimeBasedEnabled: (enabled: boolean) => void;
  systemTheme: ResolvedTheme;
  isLoaded: boolean;
}

export interface ThemeSwitcherProps {
  showTimeBased?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  variant?: 'button' | 'dropdown' | 'icon';
}

export interface ThemeProviderProps {
  children: React.ReactNode;
  defaultMode?: ThemeMode;
  defaultTimeBased?: boolean;
}

export interface UseThemeSwitchOptions {
  transition?: boolean;
  transitionDuration?: number;
  onThemeChange?: (theme: ResolvedTheme) => void;
}

export interface ThemeOption {
  value: ThemeMode;
  label: string;
  icon: React.ReactNode;
  description: string;
}
