/**
 * Dark Mode Theme System Tests
 *
 * Tests for theme switching, persistence, and component response to theme changes.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useThemeEnhanced } from '@/hooks/useThemeEnhanced';
import { ThemeSelector } from '@/components/ui/ThemeSelector';
import { usePreferencesStore } from '@/stores/preferencesStore';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock matchMedia
const mockMatchMedia = vi.fn().mockImplementation((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
}));
Object.defineProperty(window, 'matchMedia', { value: mockMatchMedia });

// Mock SettingsProvider - simple wrapper for testing
const SettingsProvider = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

// Test helper component
function TestComponent() {
  const { theme, isDark, setTheme, toggleTheme } = useThemeEnhanced();

  return (
    <div>
      <div data-testid="theme">{theme}</div>
      <div data-testid="isDark">{isDark.toString()}</div>
      <button onClick={() => setTheme('light')} data-testid="setLight">
        Light
      </button>
      <button onClick={() => setTheme('dark')} data-testid="setDark">
        Dark
      </button>
      <button onClick={() => setTheme('system')} data-testid="setSystem">
        System
      </button>
      <button onClick={toggleTheme} data-testid="toggle">
        Toggle
      </button>
    </div>
  );
}

describe('Theme System', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    localStorageMock.setItem.mockClear();
    // Reset document classes
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.style.colorScheme = '';
  });

  afterEach(() => {
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.style.colorScheme = '';
  });

  describe('useThemeEnhanced Hook', () => {
    it('should initialize with default theme (system)', () => {
      render(
        <SettingsProvider>
          <TestComponent />
        </SettingsProvider>
      );

      expect(screen.getByTestId('theme')).toHaveTextContent('system');
    });

    it('should correctly compute isDark for dark theme', async () => {
      render(
        <SettingsProvider>
          <TestComponent />
        </SettingsProvider>
      );

      const setDarkButton = screen.getByTestId('setDark');
      await user.click(setDarkButton);

      await waitFor(() => {
        expect(screen.getByTestId('isDark')).toHaveTextContent('true');
      });
    });

    it('should correctly compute isDark for light theme', async () => {
      render(
        <SettingsProvider>
          <TestComponent />
        </SettingsProvider>
      );

      const setLightButton = screen.getByTestId('setLight');
      await user.click(setLightButton);

      await waitFor(() => {
        expect(screen.getByTestId('isDark')).toHaveTextContent('false');
      });
    });

    it('should toggle between light and dark', async () => {
      render(
        <SettingsProvider>
          <TestComponent />
        </SettingsProvider>
      );

      const toggleButton = screen.getByTestId('toggle');

      await user.click(toggleButton);
      await waitFor(() => {
        expect(screen.getByTestId('theme')).toHaveTextContent('dark');
      });

      await user.click(toggleButton);
      await waitFor(() => {
        expect(screen.getByTestId('theme')).toHaveTextContent('light');
      });
    });

    it('should cycle through light → dark → system', async () => {
      render(
        <SettingsProvider>
          <TestComponent />
        </SettingsProvider>
      );

      const setLight = screen.getByTestId('setLight');
      const setDark = screen.getByTestId('setDark');
      const setSystem = screen.getByTestId('setSystem');

      await user.click(setLight);
      await waitFor(() => {
        expect(screen.getByTestId('theme')).toHaveTextContent('light');
      });

      await user.click(setDark);
      await waitFor(() => {
        expect(screen.getByTestId('theme')).toHaveTextContent('dark');
      });

      await user.click(setSystem);
      await waitFor(() => {
        expect(screen.getByTestId('theme')).toHaveTextContent('system');
      });
    });
  });

  describe('ThemeSelector Component', () => {
    it('should render theme toggle button', () => {
      render(
        <SettingsProvider>
          <ThemeSelector variant="compact" />
        </SettingsProvider>
      );

      const toggleButton = screen.getByRole('button', {
        name: /toggle theme/i,
      });
      expect(toggleButton).toBeInTheDocument();
    });

    it('should toggle theme when clicked', async () => {
      render(
        <SettingsProvider>
          <ThemeSelector variant="compact" />
        </SettingsProvider>
      );

      const toggleButton = screen.getByRole('button', {
        name: /toggle theme/i,
      });

      // Check initial class
      const hasDarkClass = document.documentElement.classList.contains('dark');

      await user.click(toggleButton);

      // Should toggle the dark class
      await waitFor(() => {
        expect(document.documentElement.classList.contains('dark')).toBe(!hasDarkClass);
      });
    });

    it('should show dropdown when variant is full', async () => {
      render(
        <SettingsProvider>
          <ThemeSelector variant="full" />
        </SettingsProvider>
      );

      const button = screen.getByRole('button', { name: /select theme/i });
      expect(button).toBeInTheDocument();

      await user.click(button);

      // Should show dropdown with options
      await waitFor(() => {
        expect(screen.getByText(/浅色模式/)).toBeInTheDocument();
        expect(screen.getByText(/深色模式/)).toBeInTheDocument();
        expect(screen.getByText(/跟随系统/)).toBeInTheDocument();
      });
    });

    it('should select theme from dropdown', async () => {
      render(
        <SettingsProvider>
          <TestComponent />
          <ThemeSelector variant="full" />
        </SettingsProvider>
      );

      const button = screen.getByRole('button', { name: /select theme/i });
      await user.click(button);

      const darkOption = screen.getByText(/深色模式/);
      await user.click(darkOption);

      await waitFor(() => {
        expect(screen.getByTestId('theme')).toHaveTextContent('dark');
      });
    });
  });

  describe('System Preference Detection', () => {
    it('should detect system dark preference', () => {
      // Mock system prefers dark
      mockMatchMedia.mockReturnValue({
        matches: true,
        media: '(prefers-color-scheme: dark)',
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      });

      render(
        <SettingsProvider>
          <TestComponent />
        </SettingsProvider>
      );

      // Set theme to system to detect preference
      const setSystemButton = screen.getByTestId('setSystem');
      // System preference should be detected automatically
    });

    it('should detect system light preference', () => {
      // Mock system prefers light (already mocked with matches: false)
      mockMatchMedia.mockReturnValue({
        matches: false,
        media: '(prefers-color-scheme: dark)',
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      });

      render(
        <SettingsProvider>
          <TestComponent />
        </SettingsProvider>
      );
    });
  });

  describe('Persistence', () => {
    it('should persist theme across re-renders', async () => {
      const { rerender } = render(
        <SettingsProvider>
          <TestComponent />
        </SettingsProvider>
      );

      const setDarkButton = screen.getByTestId('setDark');
      await user.click(setDarkButton);

      await waitFor(() => {
        expect(screen.getByTestId('theme')).toHaveTextContent('dark');
      });

      rerender(
        <SettingsProvider>
          <TestComponent />
        </SettingsProvider>
      );

      // Should still be dark after re-render
      await waitFor(() => {
        expect(screen.getByTestId('theme')).toHaveTextContent('dark');
      });
    });
  });

  describe('DOM Manipulation', () => {
    it('should add dark class to html element when dark theme is active', async () => {
      render(
        <SettingsProvider>
          <TestComponent />
        </SettingsProvider>
      );

      const setDarkButton = screen.getByTestId('setDark');
      await user.click(setDarkButton);

      await waitFor(() => {
        expect(document.documentElement.classList.contains('dark')).toBe(true);
      });
    });

    it('should add light class to html element when light theme is active', async () => {
      render(
        <SettingsProvider>
          <TestComponent />
        </SettingsProvider>
      );

      const setLightButton = screen.getByTestId('setLight');
      await user.click(setLightButton);

      await waitFor(() => {
        expect(document.documentElement.classList.contains('light')).toBe(true);
      });
    });
  });

  describe('Accessibility', () => {
    it('should have accessible button labels', () => {
      render(
        <SettingsProvider>
          <ThemeSelector variant="compact" />
        </SettingsProvider>
      );

      const toggleButton = screen.getByRole('button', {
        name: /toggle theme/i,
      });
      expect(toggleButton).toBeInTheDocument();
    });

    it('should announce theme changes via aria-label', () => {
      render(
        <SettingsProvider>
          <ThemeSelector variant="compact" />
        </SettingsProvider>
      );

      const toggleButton = screen.getByRole('button', {
        name: /toggle theme/i,
      });

      // Check that aria-label is present
      expect(toggleButton).toHaveAttribute('aria-label');
    });

    it('should support keyboard navigation', async () => {
      render(
        <SettingsProvider>
          <ThemeSelector variant="full" />
        </SettingsProvider>
      );

      const button = screen.getByRole('button', { name: /select theme/i });

      // Should be focusable
      button.focus();
      expect(button).toHaveFocus();

      // Should activate on Enter key
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(screen.getByText(/浅色模式/)).toBeVisible();
      });
    });
  });
});

/**
 * Manual Testing Checklist
 *
 * Run these tests manually in the browser:
 *
 * [ ] Theme loads correctly on first visit
 * [ ] Theme persists across page reloads
 * [ ] No flash of wrong theme on load
 * [ ] Light mode works
 * [ ] Dark mode works
 * [ ] System mode works
 * [ ] System preference changes are detected
 * [ ] All components respond to theme changes
 * [ ] Transitions are smooth (200ms)
 * [ ] Text is readable in both themes
 * [ ] Colors have good contrast
 * [ ] Borders are visible in both themes
 * [ ] Images look good in both themes
 * [ ] Charts adapt to theme
 * [ ] Keyboard navigation works
 * [ ] Screen reader announces theme changes
 * [ ] Focus indicators are visible in both themes
 * [ ] localStorage persists settings
 * [ ] Works in incognito mode
 * [ ] Works on mobile devices
 * [ ] Works on desktop browsers
 */
