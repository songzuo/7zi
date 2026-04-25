/**
 * useThemeEnhanced Hook Tests
 * Tests for src/hooks/useThemeEnhanced.ts
 */

import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useThemeEnhanced, useThemeSimple } from '@/hooks/useThemeEnhanced';

// Mock window.matchMedia
const mockMatchMedia = vi.fn();
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: mockMatchMedia,
});

// Simple mock for SettingsContext
const mockSettingsContext = {
  settings: { theme: 'system', language: 'zh' } as any,
  setTheme: vi.fn(),
};

vi.mock('@/contexts/SettingsContext', () => ({
  SettingsProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useSettings: () => mockSettingsContext,
}));

function createWrapper() {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
  };
}

describe('useThemeEnhanced', () => {
  beforeEach(() => {
    // Reset media query mock
    mockMatchMedia.mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });

    // Reset mock
    mockSettingsContext.setTheme.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('should provide theme value', () => {
      const { result } = renderHook(() => useThemeEnhanced(), {
        wrapper: createWrapper(),
      });

      expect(result.current.theme).toBeDefined();
      expect(['light', 'dark', 'system']).toContain(result.current.theme);
    });

    it('should provide isDark boolean', () => {
      const { result } = renderHook(() => useThemeEnhanced(), {
        wrapper: createWrapper(),
      });

      expect(typeof result.current.isDark).toBe('boolean');
    });

    it('should provide systemPrefersDark boolean', () => {
      const { result } = renderHook(() => useThemeEnhanced(), {
        wrapper: createWrapper(),
      });

      expect(typeof result.current.systemPrefersDark).toBe('boolean');
    });

    it('should provide setTheme function', () => {
      const { result } = renderHook(() => useThemeEnhanced(), {
        wrapper: createWrapper(),
      });

      expect(typeof result.current.setTheme).toBe('function');
    });

    it('should provide toggleTheme function', () => {
      const { result } = renderHook(() => useThemeEnhanced(), {
        wrapper: createWrapper(),
      });

      expect(typeof result.current.toggleTheme).toBe('function');
    });

    it('should provide cycleTheme function', () => {
      const { result } = renderHook(() => useThemeEnhanced(), {
        wrapper: createWrapper(),
      });

      expect(typeof result.current.cycleTheme).toBe('function');
    });

    it('should provide resetTheme function', () => {
      const { result } = renderHook(() => useThemeEnhanced(), {
        wrapper: createWrapper(),
      });

      expect(typeof result.current.resetTheme).toBe('function');
    });
  });

  describe('setTheme', () => {
    it('should call setTheme from settings context', () => {
      const { result } = renderHook(() => useThemeEnhanced(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setTheme('light');
      });

      expect(mockSettingsContext.setTheme).toHaveBeenCalledWith('light');
    });

    it('should set theme to dark', () => {
      const { result } = renderHook(() => useThemeEnhanced(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setTheme('dark');
      });

      expect(mockSettingsContext.setTheme).toHaveBeenCalledWith('dark');
    });

    it('should set theme to system', () => {
      const { result } = renderHook(() => useThemeEnhanced(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setTheme('system');
      });

      expect(mockSettingsContext.setTheme).toHaveBeenCalledWith('system');
    });
  });

  describe('toggleTheme', () => {
    it('should toggle from light to dark', () => {
      mockSettingsContext.settings.theme = 'light';
      const { result } = renderHook(() => useThemeEnhanced(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.toggleTheme();
      });

      expect(mockSettingsContext.setTheme).toHaveBeenCalledWith('dark');
    });

    it('should toggle from dark to light', () => {
      mockSettingsContext.settings.theme = 'dark';
      const { result } = renderHook(() => useThemeEnhanced(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.toggleTheme();
      });

      expect(mockSettingsContext.setTheme).toHaveBeenCalledWith('light');
    });
  });

  describe('cycleTheme', () => {
    it('should cycle through light -> dark -> system', () => {
      mockSettingsContext.settings.theme = 'light';
      const { result } = renderHook(() => useThemeEnhanced(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.cycleTheme();
      });

      expect(mockSettingsContext.setTheme).toHaveBeenCalledWith('dark');

      act(() => {
        result.current.cycleTheme();
      });

      expect(mockSettingsContext.setTheme).toHaveBeenCalledWith('system');
    });

    it('should cycle from system to light', () => {
      mockSettingsContext.settings.theme = 'system';
      const { result } = renderHook(() => useThemeEnhanced(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.cycleTheme();
      });

      expect(mockSettingsContext.setTheme).toHaveBeenCalledWith('light');
    });
  });

  describe('resetTheme', () => {
    it('should reset theme to system', () => {
      const { result } = renderHook(() => useThemeEnhanced(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.resetTheme();
      });

      expect(mockSettingsContext.setTheme).toHaveBeenCalledWith('system');
    });
  });

  describe('useThemeSimple', () => {
    it('should provide theme value', () => {
      const { result } = renderHook(() => useThemeSimple(), {
        wrapper: createWrapper(),
      });

      expect(result.current.theme).toBeDefined();
      expect(['light', 'dark', 'system']).toContain(result.current.theme);
    });

    it('should provide isDark value', () => {
      const { result } = renderHook(() => useThemeSimple(), {
        wrapper: createWrapper(),
      });

      expect(typeof result.current.isDark).toBe('boolean');
    });

    it('should provide setTheme function', () => {
      const { result } = renderHook(() => useThemeSimple(), {
        wrapper: createWrapper(),
      });

      expect(typeof result.current.setTheme).toBe('function');
    });

    it('should provide toggleTheme function', () => {
      const { result } = renderHook(() => useThemeSimple(), {
        wrapper: createWrapper(),
      });

      expect(typeof result.current.toggleTheme).toBe('function');
    });

    it('should work with setTheme', () => {
      const { result } = renderHook(() => useThemeSimple(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setTheme('dark');
      });

      expect(mockSettingsContext.setTheme).toHaveBeenCalledWith('dark');
    });

    it('should work with toggleTheme', () => {
      mockSettingsContext.settings.theme = 'light';
      const { result } = renderHook(() => useThemeSimple(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.toggleTheme();
      });

      expect(mockSettingsContext.setTheme).toHaveBeenCalledWith('dark');
    });
  });
});
