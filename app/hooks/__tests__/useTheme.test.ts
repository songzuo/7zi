import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { ThemeProvider, useTheme } from '../components/ThemeProvider';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock matchMedia
const createMatchMedia = (matches: boolean) => {
  const listeners: Array<(e: MediaQueryListEvent) => void> = [];
  return vi.fn((query: string) => ({
    matches,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn((_type: string, listener: (e: MediaQueryListEvent) => void) => {
      listeners.push(listener);
    }),
    removeEventListener: vi.fn((_type: string, listener: (e: MediaQueryListEvent) => void) => {
      const index = listeners.indexOf(listener);
      if (index > -1) listeners.splice(index, 1);
    }),
    dispatchEvent: vi.fn((event: MediaQueryListEvent) => {
      listeners.forEach(listener => listener(event));
      return true;
    }),
  }));
};

// Helper to render hook with ThemeProvider - using React.createElement for .ts file
const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(ThemeProvider, null, children);

describe('useTheme', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
    // Reset document classes
    document.documentElement.classList.remove('dark');
    document.documentElement.style.colorScheme = '';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initialization', () => {
    it('should return default theme (system) when no stored theme', () => {
      window.matchMedia = createMatchMedia(false);
      
      const { result } = renderHook(() => useTheme(), { wrapper });
      
      expect(result.current.theme).toBe('system');
    });

    it('should load stored theme from localStorage', () => {
      localStorageMock.setItem('theme', 'dark');
      window.matchMedia = createMatchMedia(true);
      
      const { result } = renderHook(() => useTheme(), { wrapper });
      
      expect(result.current.theme).toBe('dark');
    });

    it('should resolve system theme to light when system prefers light', () => {
      window.matchMedia = createMatchMedia(false);
      
      const { result } = renderHook(() => useTheme(), { wrapper });
      
      expect(result.current.resolvedTheme).toBe('light');
    });

    it('should resolve system theme to dark when system prefers dark', () => {
      window.matchMedia = createMatchMedia(true);
      
      const { result } = renderHook(() => useTheme(), { wrapper });
      
      expect(result.current.resolvedTheme).toBe('dark');
    });
  });

  describe('setTheme', () => {
    it('should set theme to light', () => {
      window.matchMedia = createMatchMedia(false);
      
      const { result } = renderHook(() => useTheme(), { wrapper });
      
      act(() => {
        result.current.setTheme('light');
      });
      
      expect(result.current.theme).toBe('light');
      expect(result.current.resolvedTheme).toBe('light');
    });

    it('should set theme to dark', () => {
      window.matchMedia = createMatchMedia(true);
      
      const { result } = renderHook(() => useTheme(), { wrapper });
      
      act(() => {
        result.current.setTheme('dark');
      });
      
      expect(result.current.theme).toBe('dark');
      expect(result.current.resolvedTheme).toBe('dark');
    });

    it('should set theme to system', () => {
      window.matchMedia = createMatchMedia(false);
      
      const { result } = renderHook(() => useTheme(), { wrapper });
      
      act(() => {
        result.current.setTheme('system');
      });
      
      expect(result.current.theme).toBe('system');
    });

    it('should save theme to localStorage', () => {
      window.matchMedia = createMatchMedia(false);
      
      const { result } = renderHook(() => useTheme(), { wrapper });
      
      act(() => {
        result.current.setTheme('dark');
      });
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith('theme', 'dark');
    });
  });

  describe('toggleTheme', () => {
    it('should toggle from light to dark', () => {
      window.matchMedia = createMatchMedia(false);
      
      const { result } = renderHook(() => useTheme(), { wrapper });
      
      act(() => {
        result.current.setTheme('light');
      });
      
      act(() => {
        result.current.toggleTheme();
      });
      
      expect(result.current.theme).toBe('dark');
    });

    it('should toggle from dark to light', () => {
      window.matchMedia = createMatchMedia(true);
      
      const { result } = renderHook(() => useTheme(), { wrapper });
      
      act(() => {
        result.current.setTheme('dark');
      });
      
      act(() => {
        result.current.toggleTheme();
      });
      
      expect(result.current.theme).toBe('light');
    });

    it('should toggle based on resolved theme when theme is system', () => {
      // System prefers dark
      window.matchMedia = createMatchMedia(true);
      
      const { result } = renderHook(() => useTheme(), { wrapper });
      
      act(() => {
        result.current.setTheme('system');
      });
      
      expect(result.current.resolvedTheme).toBe('dark');
      
      act(() => {
        result.current.toggleTheme();
      });
      
      // Should toggle to light (opposite of resolved dark)
      expect(result.current.theme).toBe('light');
    });
  });

  describe('isTransitioning', () => {
    it('should set isTransitioning to true when theme changes', () => {
      vi.useFakeTimers();
      window.matchMedia = createMatchMedia(false);
      
      const { result } = renderHook(() => useTheme(), { wrapper });
      
      act(() => {
        result.current.setTheme('dark');
      });
      
      expect(result.current.isTransitioning).toBe(true);
      
      vi.useRealTimers();
    });

    it('should set isTransitioning to false after transition duration', () => {
      vi.useFakeTimers();
      window.matchMedia = createMatchMedia(false);
      
      const { result } = renderHook(() => useTheme(), { wrapper });
      
      act(() => {
        result.current.setTheme('dark');
      });
      
      expect(result.current.isTransitioning).toBe(true);
      
      // Wait for transition duration (300ms)
      act(() => {
        vi.advanceTimersByTime(350);
      });
      
      expect(result.current.isTransitioning).toBe(false);
      
      vi.useRealTimers();
    });
  });

  describe('error handling', () => {
    it('should throw error when used outside ThemeProvider', () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      expect(() => {
        renderHook(() => useTheme());
      }).toThrow('useTheme must be used within a ThemeProvider');
      
      consoleError.mockRestore();
    });
  });

  describe('DOM updates', () => {
    it('should add dark class to document when theme is dark', () => {
      window.matchMedia = createMatchMedia(true);
      
      const { result } = renderHook(() => useTheme(), { wrapper });
      
      act(() => {
        result.current.setTheme('dark');
      });
      
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('should remove dark class from document when theme is light', () => {
      window.matchMedia = createMatchMedia(false);
      
      const { result } = renderHook(() => useTheme(), { wrapper });
      
      act(() => {
        result.current.setTheme('light');
      });
      
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });

    it('should set color-scheme style', () => {
      window.matchMedia = createMatchMedia(true);
      
      const { result } = renderHook(() => useTheme(), { wrapper });
      
      act(() => {
        result.current.setTheme('dark');
      });
      
      expect(document.documentElement.style.colorScheme).toBe('dark');
    });
  });
});