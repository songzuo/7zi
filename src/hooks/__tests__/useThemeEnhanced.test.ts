// @ts-nocheck - Test file with complex type issues
/**
 * Tests for useThemeEnhanced hook
 * Enhanced theme management hook with system preference detection
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { Theme } from '@/contexts/SettingsContext';
import { useThemeEnhanced, useThemeSimple } from '../useThemeEnhanced';

// Mock SettingsContext
const mockSetTheme = vi.fn();
const mockSettings = {
  theme: 'system' as Theme,
  language: 'en',
  notifications: true,
};

vi.mock('@/contexts/SettingsContext', () => ({
  useSettings: () => ({
    settings: mockSettings,
    setTheme: mockSetTheme,
  }),
}));

describe('useThemeEnhanced', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSettings.theme = 'system';
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should return current theme', () => {
      const { result } = renderHook(() => useThemeEnhanced());

      expect(result.current.theme).toBe('system');
    });

    it('should detect system preference for dark mode', () => {
      const mockMatchMedia = vi.fn(() => ({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }));
      window.matchMedia = mockMatchMedia;

      const { result } = renderHook(() => useThemeEnhanced());

      expect(result.current.systemPrefersDark).toBe(true);
      expect(result.current.isDark).toBe(true);
    });

    it('should detect system preference for light mode', () => {
      const mockMatchMedia = vi.fn(() => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }));
      window.matchMedia = mockMatchMedia;

      const { result } = renderHook(() => useThemeEnhanced());

      expect(result.current.systemPrefersDark).toBe(false);
      expect(result.current.isDark).toBe(false);
    });

    it('should compute isDark from light theme', () => {
      mockSettings.theme = 'light';

      const { result } = renderHook(() => useThemeEnhanced());

      expect(result.current.isDark).toBe(false);
    });

    it('should compute isDark from dark theme', () => {
      mockSettings.theme = 'dark';

      const { result } = renderHook(() => useThemeEnhanced());

      expect(result.current.isDark).toBe(true);
    });
  });

  describe('setTheme', () => {
    it('should set theme to light', () => {
      const { result } = renderHook(() => useThemeEnhanced());

      act(() => {
        result.current.setTheme('light');
      });

      expect(mockSetTheme).toHaveBeenCalledWith('light');
    });

    it('should set theme to dark', () => {
      const { result } = renderHook(() => useThemeEnhanced());

      act(() => {
        result.current.setTheme('dark');
      });

      expect(mockSetTheme).toHaveBeenCalledWith('dark');
    });

    it('should set theme to system', () => {
      const { result } = renderHook(() => useThemeEnhanced());

      act(() => {
        result.current.setTheme('system');
      });

      expect(mockSetTheme).toHaveBeenCalledWith('system');
    });
  });

  describe('toggleTheme', () => {
    it('should toggle from light to dark', () => {
      mockSettings.theme = 'light';

      const { result } = renderHook(() => useThemeEnhanced());

      act(() => {
        result.current.toggleTheme();
      });

      expect(mockSetTheme).toHaveBeenCalledWith('dark');
    });

    it('should toggle from dark to light', () => {
      mockSettings.theme = 'dark';

      const { result } = renderHook(() => useThemeEnhanced());

      act(() => {
        result.current.toggleTheme();
      });

      expect(mockSetTheme).toHaveBeenCalledWith('light');
    });

    it('should toggle from system to dark', () => {
      const mockMatchMedia = vi.fn(() => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }));
      window.matchMedia = mockMatchMedia;

      const { result } = renderHook(() => useThemeEnhanced());

      act(() => {
        result.current.toggleTheme();
      });

      expect(mockSetTheme).toHaveBeenCalledWith('dark');
    });

    it('should toggle from system to light', () => {
      const mockMatchMedia = vi.fn(() => ({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }));
      window.matchMedia = mockMatchMedia;

      const { result } = renderHook(() => useThemeEnhanced());

      act(() => {
        result.current.toggleTheme();
      });

      expect(mockSetTheme).toHaveBeenCalledWith('light');
    });
  });

  describe('cycleTheme', () => {
    it('should cycle from light to dark', () => {
      mockSettings.theme = 'light';

      const { result } = renderHook(() => useThemeEnhanced());

      act(() => {
        result.current.cycleTheme();
      });

      expect(mockSetTheme).toHaveBeenCalledWith('dark');
    });

    it('should cycle from dark to system', () => {
      mockSettings.theme = 'dark';

      const { result } = renderHook(() => useThemeEnhanced());

      act(() => {
        result.current.cycleTheme();
      });

      expect(mockSetTheme).toHaveBeenCalledWith('system');
    });

    it('should cycle from system to light', () => {
      mockSettings.theme = 'system';

      const { result } = renderHook(() => useThemeEnhanced());

      act(() => {
        result.current.cycleTheme();
      });

      expect(mockSetTheme).toHaveBeenCalledWith('light');
    });

    it('should cycle through all themes', () => {
      mockSettings.theme = 'light';

      const { result } = renderHook(() => useThemeEnhanced());

      act(() => {
        result.current.cycleTheme();
      });
      expect(mockSetTheme).toHaveBeenCalledWith('dark');

      mockSettings.theme = 'dark';
      act(() => {
        result.current.cycleTheme();
      });
      expect(mockSetTheme).toHaveBeenCalledWith('system');

      mockSettings.theme = 'system';
      act(() => {
        result.current.cycleTheme();
      });
      expect(mockSetTheme).toHaveBeenCalledWith('light');
    });
  });

  describe('resetTheme', () => {
    it('should reset theme to system', () => {
      mockSettings.theme = 'dark';

      const { result } = renderHook(() => useThemeEnhanced());

      act(() => {
        result.current.resetTheme();
      });

      expect(mockSetTheme).toHaveBeenCalledWith('system');
    });

    it('should reset from light theme', () => {
      mockSettings.theme = 'light';

      const { result } = renderHook(() => useThemeEnhanced());

      act(() => {
        result.current.resetTheme();
      });

      expect(mockSetTheme).toHaveBeenCalledWith('system');
    });
  });

  describe('System Preference Changes', () => {
    it('should update system preference on media query change', () => {
      const mockListener = vi.fn();
      const mockMatchMedia = vi.fn(() => ({
        matches: false,
        addEventListener: vi.fn((event, listener) => {
          mockListener.mockImplementation(listener);
        }),
        removeEventListener: vi.fn(),
      }));
      window.matchMedia = mockMatchMedia;

      const { result } = renderHook(() => useThemeEnhanced());

      expect(result.current.systemPrefersDark).toBe(false);

      // Simulate media query change to dark
      act(() => {
        mockListener({ matches: true });
      });

      expect(result.current.systemPrefersDark).toBe(true);
    });

    it('should update isDark when system theme changes', () => {
      const mockListener = vi.fn();
      const mockMatchMedia = vi.fn(() => ({
        matches: false,
        addEventListener: vi.fn((event, listener) => {
          mockListener.mockImplementation(listener);
        }),
        removeEventListener: vi.fn(),
      }));
      window.matchMedia = mockMatchMedia;

      mockSettings.theme = 'system';

      const { result } = renderHook(() => useThemeEnhanced());

      expect(result.current.isDark).toBe(false);

      act(() => {
        mockListener({ matches: true });
      });

      expect(result.current.isDark).toBe(true);
    });

    it('should not affect isDark when theme is explicitly set', () => {
      const mockListener = vi.fn();
      const mockMatchMedia = vi.fn(() => ({
        matches: false,
        addEventListener: vi.fn((event, listener) => {
          mockListener.mockImplementation(listener);
        }),
        removeEventListener: vi.fn(),
      }));
      window.matchMedia = mockMatchMedia;

      mockSettings.theme = 'dark';

      const { result } = renderHook(() => useThemeEnhanced());

      expect(result.current.isDark).toBe(true);

      act(() => {
        mockListener({ matches: true });
      });

      expect(result.current.isDark).toBe(true); // Still dark because explicitly set
    });

    it('should clean up media query listener on unmount', () => {
      const mockMatchMedia = vi.fn(() => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }));
      window.matchMedia = mockMatchMedia;

      const { unmount } = renderHook(() => useThemeEnhanced());

      unmount();

      expect(mockMatchMedia().removeEventListener).toHaveBeenCalled();
    });
  });

  describe('Computed States', () => {
    it('should return isDark correctly for light theme', () => {
      mockSettings.theme = 'light';

      const { result } = renderHook(() => useThemeEnhanced());

      expect(result.current.isDark).toBe(false);
    });

    it('should return isDark correctly for dark theme', () => {
      mockSettings.theme = 'dark';

      const { result } = renderHook(() => useThemeEnhanced());

      expect(result.current.isDark).toBe(true);
    });

    it('should return isDark correctly for system theme (dark)', () => {
      const mockMatchMedia = vi.fn(() => ({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }));
      window.matchMedia = mockMatchMedia;

      mockSettings.theme = 'system';

      const { result } = renderHook(() => useThemeEnhanced());

      expect(result.current.isDark).toBe(true);
    });

    it('should return isDark correctly for system theme (light)', () => {
      const mockMatchMedia = vi.fn(() => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }));
      window.matchMedia = mockMatchMedia;

      mockSettings.theme = 'system';

      const { result } = renderHook(() => useThemeEnhanced());

      expect(result.current.isDark).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid theme changes', () => {
      const { result } = renderHook(() => useThemeEnhanced());

      act(() => {
        result.current.setTheme('light');
      });
      act(() => {
        result.current.setTheme('dark');
      });
      act(() => {
        result.current.setTheme('system');
      });

      expect(mockSetTheme).toHaveBeenCalledTimes(3);
    });

    it('should handle multiple toggle operations', () => {
      mockSettings.theme = 'light';

      const { result } = renderHook(() => useThemeEnhanced());

      act(() => {
        result.current.toggleTheme();
      });
      expect(mockSetTheme).toHaveBeenCalledWith('dark');

      mockSettings.theme = 'dark';
      act(() => {
        result.current.toggleTheme();
      });
      expect(mockSetTheme).toHaveBeenCalledWith('light');
    });
  });

  describe('useThemeSimple', () => {
    it('should return subset of useThemeEnhanced', () => {
      const { result } = renderHook(() => useThemeSimple());

      expect(result.current.theme).toBeDefined();
      expect(result.current.isDark).toBeDefined();
      expect(result.current.setTheme).toBeDefined();
      expect(result.current.toggleTheme).toBeDefined();
      expect(result.current.cycleTheme).toBeUndefined();
      expect(result.current.resetTheme).toBeUndefined();
      expect(result.current.systemPrefersDark).toBeUndefined();
    });

    it('should set theme correctly', () => {
      const { result } = renderHook(() => useThemeSimple());

      act(() => {
        result.current.setTheme('dark');
      });

      expect(mockSetTheme).toHaveBeenCalledWith('dark');
    });

    it('should toggle theme correctly', () => {
      mockSettings.theme = 'light';

      const { result } = renderHook(() => useThemeSimple());

      act(() => {
        result.current.toggleTheme();
      });

      expect(mockSetTheme).toHaveBeenCalledWith('dark');
    });
  });
});
