/**
 * Theme Script - Prevents Flash of Unstyled Content (FOUC)
 * 
 * This script runs immediately in the <head> to:
 * 1. Read theme preference from localStorage
 * 2. Apply the correct theme class before React hydrates
 * 3. Prevent visible flash of wrong theme
 */

(function() {
  'use strict';

  const THEME_KEY = '7zi-user-settings';

  function getTheme(): 'light' | 'dark' | 'system' {
    try {
      const stored = localStorage.getItem(THEME_KEY);
      if (stored) {
        const settings = JSON.parse(stored);
        return settings.theme || 'system';
      }
    } catch (e) {
      console.error('Failed to read theme from localStorage:', e);
    }
    return 'system';
  }

  function getEffectiveTheme(theme: 'light' | 'dark' | 'system'): 'light' | 'dark' {
    if (theme === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return theme;
  }

  function applyTheme(theme: 'light' | 'dark') {
    const root = document.documentElement;

    // Remove existing theme classes
    root.classList.remove('light', 'dark');

    // Add new theme class
    root.classList.add(theme);

    // Set color-scheme for native browser elements
    root.style.colorScheme = theme;

    // Make html visible (was hidden by CSS to prevent FOUC)
    root.style.visibility = 'visible';
  }

  // Execute immediately
  const theme = getTheme();
  const effectiveTheme = getEffectiveTheme(theme);
  applyTheme(effectiveTheme);

  // Store theme on window for debugging
  if (typeof window !== 'undefined') {
    (window as any).__THEME__ = { // @ts-expect-error - Global debug variable
      stored: theme,
      effective: effectiveTheme,
    };
  }
})();
