/**
 * Theme System Tests
 * Unit tests for theme management functionality
 */

import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { ThemeProvider, useTheme } from '../ThemeContext';
import { useThemeSwitch } from '../useThemeSwitch';
import { getResolvedTheme, getTimeBasedTheme } from '../theme-config';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock matchMedia
const matchMediaMock = vi.fn().mockImplementation((query) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
}));

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: matchMediaMock,
});

describe('Theme System', () => {
  beforeEach(() => {
    localStorageMock.getItem.mockReset();
    localStorageMock.setItem.mockReset();
    document.documentElement.classList.remove('dark');
  });
  
  describe('getResolvedTheme', () => {
    it('should return light for light mode', () => {
      expect(getResolvedTheme('light')).toBe('light');
    });
    
    it('should return dark for dark mode', () => {
      expect(getResolvedTheme('dark')).toBe('dark');
    });
    
    it('should return system preference for system mode', () => {
      matchMediaMock.mockReturnValueOnce({
        matches: true, // dark preference
        addEventListener: vi.fn(),
      });
      expect(getResolvedTheme('system')).toBe('dark');
      
      matchMediaMock.mockReturnValueOnce({
        matches: false, // light preference
        addEventListener: vi.fn(),
      });
      expect(getResolvedTheme('system')).toBe('light');
    });
  });
  
  describe('getTimeBasedTheme', () => {
    it('should return light during day hours', () => {
      // Mock hour between 6 AM and 6 PM
      const originalDate = global.Date;
      global.Date = vi.fn(() => ({
        ...originalDate.prototype,
        getHours: () => 12, // Noon
      })) as any;
      
      expect(getTimeBasedTheme()).toBe('light');
      
      global.Date = originalDate;
    });
    
    it('should return dark during night hours', () => {
      // Mock hour between 6 PM and 6 AM
      const originalDate = global.Date;
      global.Date = vi.fn(() => ({
        ...originalDate.prototype,
        getHours: () => 20, // 8 PM
      })) as any;
      
      expect(getTimeBasedTheme()).toBe('dark');
      
      global.Date = originalDate;
    });
  });
  
  describe('ThemeProvider', () => {
    it('should provide theme context', () => {
      const TestComponent = () => {
        const { mode, resolvedTheme } = useTheme();
        return (
          <div>
            <span data-testid="mode">{mode}</span>
            <span data-testid="theme">{resolvedTheme}</span>
          </div>
        );
      };
      
      render(
        <ThemeProvider defaultMode="light">
          <TestComponent />
        </ThemeProvider>
      );
      
      expect(screen.getByTestId('mode').textContent).toBe('light');
      expect(screen.getByTestId('theme').textContent).toBe('light');
    });
    
    it('should toggle theme', () => {
      const TestComponent = () => {
        const { resolvedTheme, toggle } = useTheme();
        return (
          <div>
            <span data-testid="theme">{resolvedTheme}</span>
            <button onClick={toggle} data-testid="toggle">
              Toggle
            </button>
          </div>
        );
      };
      
      render(
        <ThemeProvider defaultMode="light">
          <TestComponent />
        </ThemeProvider>
      );
      
      expect(screen.getByTestId('theme').textContent).toBe('light');
      
      act(() => {
        fireEvent.click(screen.getByTestId('toggle'));
      });
      
      expect(screen.getByTestId('theme').textContent).toBe('dark');
    });
    
    it('should set theme mode', () => {
      const TestComponent = () => {
        const { mode, setMode } = useTheme();
        return (
          <div>
            <span data-testid="mode">{mode}</span>
            <button 
              onClick={() => setMode('dark')} 
              data-testid="set-dark"
            >
              Set Dark
            </button>
          </div>
        );
      };
      
      render(
        <ThemeProvider defaultMode="light">
          <TestComponent />
        </ThemeProvider>
      );
      
      expect(screen.getByTestId('mode').textContent).toBe('light');
      
      act(() => {
        fireEvent.click(screen.getByTestId('set-dark'));
      });
      
      expect(screen.getByTestId('mode').textContent).toBe('dark');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('7zi-theme-preference', 'dark');
    });
    
    it('should load saved preference from localStorage', () => {
      localStorageMock.getItem.mockReturnValue('dark');
      
      const TestComponent = () => {
        const { mode } = useTheme();
        return <span data-testid="mode">{mode}</span>;
      };
      
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );
      
      expect(screen.getByTestId('mode').textContent).toBe('dark');
    });
    
    it('should apply dark class to document', () => {
      const TestComponent = () => {
        const { toggle } = useTheme();
        return <button onClick={toggle}>Toggle</button>;
      };
      
      render(
        <ThemeProvider defaultMode="light">
          <TestComponent />
        </ThemeProvider>
      );
      
      expect(document.documentElement.classList.contains('dark')).toBe(false);
      
      act(() => {
        fireEvent.click(screen.getByRole('button'));
      });
      
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });
  });
  
  describe('useThemeSwitch', () => {
    it('should provide theme switching utilities', () => {
      const TestComponent = () => {
        const { resolvedTheme, toggle, isDark, isLight } = useThemeSwitch();
        return (
          <div>
            <span data-testid="theme">{resolvedTheme}</span>
            <span data-testid="is-dark">{isDark.toString()}</span>
            <span data-testid="is-light">{isLight.toString()}</span>
            <button onClick={toggle}>Toggle</button>
          </div>
        );
      };
      
      render(
        <ThemeProvider defaultMode="light">
          <TestComponent />
        </ThemeProvider>
      );
      
      expect(screen.getByTestId('theme').textContent).toBe('light');
      expect(screen.getByTestId('is-dark').textContent).toBe('false');
      expect(screen.getByTestId('is-light').textContent).toBe('true');
    });
    
    it('should call onThemeChange callback', () => {
      const onThemeChange = vi.fn();
      
      const TestComponent = () => {
        const { toggle } = useThemeSwitch({ onThemeChange });
        return <button onClick={toggle}>Toggle</button>;
      };
      
      render(
        <ThemeProvider defaultMode="light">
          <TestComponent />
        </ThemeProvider>
      );
      
      act(() => {
        fireEvent.click(screen.getByRole('button'));
      });
      
      expect(onThemeChange).toHaveBeenCalledWith('dark');
    });
  });
  
  describe('Time-based switching', () => {
    it('should enable time-based switching', () => {
      const TestComponent = () => {
        const { timeBasedEnabled, setTimeBasedEnabled } = useTheme();
        return (
          <div>
            <span data-testid="time-based">{timeBasedEnabled.toString()}</span>
            <button 
              onClick={() => setTimeBasedEnabled(true)}
              data-testid="enable"
            >
              Enable
            </button>
          </div>
        );
      };
      
      render(
        <ThemeProvider defaultMode="system" defaultTimeBased={false}>
          <TestComponent />
        </ThemeProvider>
      );
      
      expect(screen.getByTestId('time-based').textContent).toBe('false');
      
      act(() => {
        fireEvent.click(screen.getByTestId('enable'));
      });
      
      expect(screen.getByTestId('time-based').textContent).toBe('true');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('7zi-theme-time-based', 'true');
    });
  });
});
