/**
 * Theme Script Inline - Provides the theme script as a string for inline embedding
 */

import fs from 'fs';
import path from 'path';

// Read the compiled theme script
const themeScriptPath = path.join(process.cwd(), 'public', 'theme-script.js');

let themeScriptCache: string | null = null;

export function getThemeScriptInline(): string {
  if (themeScriptCache) {
    return themeScriptCache;
  }

  try {
    // Try to read from public folder (pre-built)
    if (fs.existsSync(themeScriptPath)) {
      themeScriptCache = fs.readFileSync(themeScriptPath, 'utf-8');
      return themeScriptCache;
    }
  } catch (error) {
    console.warn('Failed to read theme script from public folder:', error);
  }

  // Fallback: inline the script directly
  return `(function(){'use strict';const THEME_KEY='7zi-user-settings';function getTheme(){try{const stored=localStorage.getItem(THEME_KEY);if(stored){const settings=JSON.parse(stored);return settings.theme||'system';}}catch(e){console.error('Failed to read theme from localStorage:',e);}return'system';}function getEffectiveTheme(theme){if(theme==='system'){return window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}return theme;}function applyTheme(theme){const root=document.documentElement;root.classList.remove('light','dark');root.classList.add(theme);root.style.colorScheme=theme;root.style.visibility='visible';}const theme=getTheme();const effectiveTheme=getEffectiveTheme(theme);applyTheme(effectiveTheme);if(typeof window!=='undefined'){(window).__THEME__={stored:theme,effective:effectiveTheme};}})();`;
}
