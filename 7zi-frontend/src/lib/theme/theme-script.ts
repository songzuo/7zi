/**
 * Theme Script for Flash-Free Loading
 * 
 * This script runs early to prevent FOUC (Flash of Unstyled Content)
 * and set the theme before React hydrates.
 */

const STORAGE_KEY = '7zi-theme-preference';
const TIME_BASED_KEY = '7zi-theme-time-based';

export function getThemeScript(): string {
  return `
    (function() {
      function getStoredPreference() {
        try {
          return localStorage.getItem('${STORAGE_KEY}') || 'system';
        } catch (e) {
          return 'system';
        }
      }
      
      function getTimeBasedEnabled() {
        try {
          return localStorage.getItem('${TIME_BASED_KEY}') === 'true';
        } catch (e) {
          return false;
        }
      }
      
      function getSystemTheme() {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      
      function getTimeBasedTheme() {
        const hour = new Date().getHours();
        const dayStart = 6;
        const nightStart = 18;
        
        if (hour >= dayStart && hour < nightStart) {
          return 'light';
        }
        return 'dark';
      }
      
      function resolveTheme() {
        const preference = getStoredPreference();
        
        if (preference === 'system') {
          if (getTimeBasedEnabled()) {
            return getTimeBasedTheme();
          }
          return getSystemTheme();
        }
        
        return preference;
      }
      
      const theme = resolveTheme();
      const isDark = theme === 'dark';
      
      // Apply theme class to document
      document.documentElement.classList.toggle('dark', isDark);
      
      // Set CSS variables for immediate use
      document.documentElement.style.setProperty('--theme-mode', theme);
      
      // Listen for system theme changes
      if (window.matchMedia) {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        mediaQuery.addEventListener('change', (e) => {
          const preference = getStoredPreference();
          if (preference === 'system' && !getTimeBasedEnabled()) {
            const newTheme = e.matches ? 'dark' : 'light';
            document.documentElement.classList.toggle('dark', newTheme === 'dark');
            document.documentElement.style.setProperty('--theme-mode', newTheme);
          }
        });
      }
    })();
  `;
}

/**
 * Inject theme script into head
 */
export function injectThemeScript(): void {
  if (typeof document === 'undefined') return;
  
  const script = document.createElement('script');
  script.id = 'theme-init';
  script.textContent = getThemeScript();
  script.setAttribute('data-noparse', 'true');
  
  document.head.insertBefore(script, document.head.firstChild);
}
