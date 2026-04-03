/**
 * Theme Management System for v1.12.0
 * 
 * Features:
 * - Light/Dark/System theme modes
 * - Persistent theme preference (localStorage)
 * - System preference detection
 * - Time-based auto-switching
 * - Smooth transitions
 * - CSS variables for theming
 * - Flash-free loading
 */

export { ThemeProvider, useTheme } from './ThemeContext';
export { ThemeSwitcher } from './ThemeSwitcher';
export { useThemeSwitch } from './useThemeSwitch';
export { themeConfig, type ThemeMode, type ThemeConfig } from './theme-config';
export { getThemeScript, injectThemeScript } from './theme-script';
