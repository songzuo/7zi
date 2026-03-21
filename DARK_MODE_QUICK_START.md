# Dark Mode Theme System - Quick Start Guide

## Overview

The 7zi-project now has a complete Dark Mode theme system with three options:
- ☀️ **Light Mode** - Bright, high-contrast design
- 🌙 **Dark Mode** - Dark, eye-friendly design
- 💻 **System Mode** - Automatically follows your OS settings

---

## How It Works

### Automatic Theme Detection

1. **On First Visit:** Uses your system preference (OS setting)
2. **After Selection:** Remembers your choice in browser storage
3. **System Mode:** Automatically switches when your OS changes

### No Flash of Wrong Theme

The theme is applied **before** React loads, so you never see a flash of the wrong color.

---

## Using the Theme System

### For Users

#### Toggle Theme

Look for the theme toggle button (☀️/🌙) in:
- Navigation bar (top right)
- Settings page
- Profile menu

**Click to toggle** between light and dark.

#### Change Theme Mode

In Settings > Theme Settings, choose:
- **Light Mode** - Always bright
- **Dark Mode** - Always dark
- **System Mode** - Follows your OS

### For Developers

#### Basic Usage

```tsx
'use client';

import { useThemeEnhanced } from '@/hooks/useThemeEnhanced';

export function MyComponent() {
  const { theme, isDark, setTheme, toggleTheme } = useThemeEnhanced();

  return (
    <div className="bg-white dark:bg-zinc-900">
      <p className="text-gray-900 dark:text-gray-100">
        Theme: {theme} (isDark: {isDark.toString()})
      </p>
      <button onClick={toggleTheme}>Toggle</button>
    </div>
  );
}
```

#### Theme Selector Component

```tsx
import { ThemeSelector } from '@/components/ui/ThemeSelector';

// Compact toggle switch
<ThemeSelector variant="compact" />

// Full dropdown with all options
<ThemeSelector variant="full" />
```

#### Tailwind Dark Mode Classes

```tsx
// Background colors
<div className="bg-white dark:bg-zinc-900">
<div className="bg-gray-100 dark:bg-zinc-800">

// Text colors
<p className="text-gray-900 dark:text-gray-100">
<p className="text-gray-600 dark:text-gray-400">

// Borders
<div className="border-gray-200 dark:border-zinc-800">

// Hover states
<button className="hover:bg-gray-100 dark:hover:bg-zinc-800">
```

#### Image Adaptation

```tsx
import { getImageFilter } from '@/lib/theme-enhanced';

<img
  src="image.jpg"
  style={{ filter: getImageFilter(isDark) }}
  alt="Themed image"
/>
```

#### Chart Colors

```tsx
import { getChartColors } from '@/lib/theme-enhanced';

const colors = getChartColors(isDark);
// Returns: { text, grid, tooltipBg, tooltipText, border }
```

---

## CSS Variables Reference

### Light Mode (Default)

```css
--background: #ffffff;
--foreground: #171717;
--card: #ffffff;
--primary: #06b6d4;
--secondary: #f4f4f5;
--muted: #f4f4f5;
--accent: #f4f4f5;
--destructive: #ef4444;
--border: #e4e4e7;
--input: #e4e4e7;
--ring: #06b6d4;
```

### Dark Mode

```css
--background: #0a0a0a;
--foreground: #ededed;
--card: #18181b;
--primary: #22d3ee;
--secondary: #27272a;
--muted: #27272a;
--accent: #27272a;
--destructive: #7f1d1d;
--border: #27272a;
--input: #27272a;
--ring: #22d3ee;
```

### Using CSS Variables

```tsx
<div style={{ backgroundColor: 'var(--background)' }}>
  <p style={{ color: 'var(--foreground)' }}>
    Uses CSS variables
  </p>
</div>
```

---

## Component Checklist

### ✅ Already Dark Mode Ready

These components already have `dark:` classes:

- `src/components/Navigation.tsx` - Navigation bar
- `src/components/Footer.tsx` - Footer
- `src/components/LoadingSpinner.tsx` - Loading states
- `src/components/ui/` - All UI components
  - Button
  - Input
  - Card
  - Modal
  - Tooltip
  - Toast
  - Badge
  - Tabs
  - Select
  - Checkbox

### 🔄 Need Dark Mode Classes

If you create new components, add dark mode support:

```tsx
// Example card component
export function Card({ children, title }) {
  return (
    <div
      className="
        p-6 rounded-lg
        bg-white dark:bg-zinc-900
        border border-gray-200 dark:border-zinc-800
        shadow-sm dark:shadow-none
      "
    >
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
        {title}
      </h3>
      <div className="mt-2 text-gray-600 dark:text-gray-400">
        {children}
      </div>
    </div>
  );
}
```

---

## Migration Guide for Existing Components

### Step 1: Add Dark Mode Classes

```tsx
// Before
<div className="bg-white text-gray-900 p-4 rounded-lg">
  <p className="text-gray-600">Content</p>
</div>

// After
<div className="bg-white dark:bg-zinc-900 text-gray-900 dark:text-gray-100 p-4 rounded-lg">
  <p className="text-gray-600 dark:text-gray-400">Content</p>
</div>
```

### Step 2: Check Color Contrast

Ensure text has good contrast in both themes:

- Light mode: Dark text on light backgrounds
- Dark mode: Light text on dark backgrounds

### Step 3: Test Both Themes

Toggle theme and verify:
- Text is readable
- Colors look good
- Borders are visible
- Images have appropriate brightness

---

## Tips & Best Practices

### ✅ Do

- Use `dark:` classes for all colors
- Use CSS variables for theme-aware values
- Test in both light and dark modes
- Consider accessibility (WCAG AA contrast)
- Use semantic color names (`zinc-900` instead of `gray-900`)

### ❌ Don't

- Hardcode colors that don't adapt
- Use absolute black (#000000) - use zinc-950 instead
- Forget about borders and shadows
- Ignore hover/focus states in dark mode

---

## Common Patterns

### Button

```tsx
<button className="
  px-4 py-2 rounded-lg
  bg-cyan-600 hover:bg-cyan-700
  text-white font-medium
  transition-colors
">
  Button
</button>
```

### Card

```tsx
<div className="
  bg-white dark:bg-zinc-900
  border border-gray-200 dark:border-zinc-800
  rounded-xl p-6
  shadow-sm dark:shadow-none
">
  <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
    Title
  </h2>
  <p className="mt-2 text-gray-600 dark:text-gray-400">
    Content
  </p>
</div>
```

### Input Field

```tsx
<input
  type="text"
  className="
    w-full px-4 py-2 rounded-lg
    bg-white dark:bg-zinc-800
    border border-gray-300 dark:border-zinc-700
    text-gray-900 dark:text-gray-100
    placeholder-gray-400 dark:placeholder-gray-500
    focus:ring-2 focus:ring-cyan-500
  "
/>
```

### Modal Overlay

```tsx
<div className="
  fixed inset-0 z-50
  bg-black/50 dark:bg-black/70
  backdrop-blur-sm
">
  <div className="
    fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
    bg-white dark:bg-zinc-900
    rounded-xl p-6
    shadow-2xl dark:shadow-none
  ">
    Modal content
  </div>
</div>
```

---

## Troubleshooting

### Issue: Theme Flashes on Load

**Solution:** Ensure `theme-script.ts` is included in `<head>`:

```tsx
// src/app/layout.tsx
<html lang="zh-CN" suppressHydrationWarning>
  <head>
    <script
      src="/theme-script.js"
      dangerouslySetInnerHTML={{
        __html: getThemeScriptInline()
      }}
    />
  </head>
</html>
```

### Issue: Components Not Responding to Theme

**Solution:** Add `dark:` classes to the component:

```tsx
// Missing dark mode
<div className="bg-white">

// Fixed
<div className="bg-white dark:bg-zinc-900">
```

### Issue: Text Not Readable in Dark Mode

**Solution:** Use appropriate color pairings:

```tsx
// Good contrast
<p className="text-gray-900 dark:text-gray-100">

// Bad contrast (too dark)
<p className="text-gray-600 dark:text-gray-800">

// Good contrast (lighter)
<p className="text-gray-600 dark:text-gray-300">
```

### Issue: localStorage Not Persisting

**Solution:** Check browser privacy settings. Incognito mode may not persist.

---

## API Reference

### useThemeEnhanced Hook

```typescript
interface UseThemeEnhancedReturn {
  theme: 'light' | 'dark' | 'system';
  isDark: boolean;
  systemPrefersDark: boolean;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  cycleTheme: () => void;
  resetTheme: () => void;
}

function useThemeEnhanced(): UseThemeEnhancedReturn
```

### Theme Selector Component

```typescript
interface ThemeSelectorProps {
  className?: string;
  variant?: 'compact' | 'full';
}

function ThemeSelector(props: ThemeSelectorProps): JSX.Element
```

### Theme Utilities

```typescript
// System preference detection
function isSystemDark(): boolean

// Listen to system changes
function listenSystemThemeChange(
  callback: (isDark: boolean) => void
): () => void

// Resolve system theme
function getEffectiveTheme(theme: Theme): 'light' | 'dark'

// Apply theme to DOM
function applyTheme(theme: Theme): void

// Image filter for dark mode
function getImageFilter(isDark: boolean): string

// Chart colors
function getChartColors(isDark: boolean): {
  text: string;
  grid: string;
  tooltipBg: string;
  tooltipText: string;
  border: string;
}
```

---

## Resources

- **Full Implementation Report:** `DARK_MODE_IMPLEMENTATION_REPORT.md`
- **Theme Script:** `src/lib/theme-script.ts`
- **Theme Hook:** `src/hooks/useThemeEnhanced.ts`
- **Theme Selector:** `src/components/ui/ThemeSelector.tsx`
- **Theme Utilities:** `src/lib/theme-enhanced.ts`
- **CSS Variables:** `src/app/globals.css`

---

## Support

For issues or questions about the Dark Mode implementation:
1. Check this quick start guide
2. Review the implementation report
3. Check component examples in `src/components/ui/`
4. Look at existing components for patterns

---

**Last Updated:** 2026-03-21
**Version:** 1.0.0
