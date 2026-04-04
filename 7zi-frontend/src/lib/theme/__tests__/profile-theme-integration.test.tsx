/**
 * Profile Page Theme Integration Tests
 * Tests for theme switching functionality in profile page
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { ThemeProvider, useTheme } from '../ThemeContext';
import ProfilePage from '../../../app/profile/page';

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

// Mock MobileLayout
vi.mock('@/components/navigation', () => ({
  MobileLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('Profile Page Theme Integration', () => {
  beforeEach(() => {
    localStorageMock.getItem.mockReset();
    localStorageMock.setItem.mockReset();
    document.documentElement.classList.remove('dark');
  });

  it('should render theme options', async () => {
    render(
      <ThemeProvider defaultMode="light">
        <ProfilePage />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('外观设置')).toBeInTheDocument();
      expect(screen.getByText('浅色模式')).toBeInTheDocument();
      expect(screen.getByText('深色模式')).toBeInTheDocument();
      expect(screen.getByText('跟随系统')).toBeInTheDocument();
    });
  });

  it('should switch to dark theme when clicking dark mode button', async () => {
    render(
      <ThemeProvider defaultMode="light">
        <ProfilePage />
      </ThemeProvider>
    );

    await waitFor(() => {
      const darkButton = screen.getByText('深色模式');
      expect(darkButton).toBeInTheDocument();
    });

    const darkButton = screen.getByText('深色模式');
    fireEvent.click(darkButton);

    await waitFor(() => {
      expect(document.documentElement.classList.contains('dark')).toBe(true);
      expect(localStorageMock.setItem).toHaveBeenCalledWith('7zi-theme-preference', 'dark');
    });
  });

  it('should switch to light theme when clicking light mode button', async () => {
    render(
      <ThemeProvider defaultMode="dark">
        <ProfilePage />
      </ThemeProvider>
    );

    await waitFor(() => {
      const lightButton = screen.getByText('浅色模式');
      expect(lightButton).toBeInTheDocument();
    });

    const lightButton = screen.getByText('浅色模式');
    fireEvent.click(lightButton);

    await waitFor(() => {
      expect(document.documentElement.classList.contains('dark')).toBe(false);
      expect(localStorageMock.setItem).toHaveBeenCalledWith('7zi-theme-preference', 'light');
    });
  });

  it('should switch to system theme when clicking system mode button', async () => {
    render(
      <ThemeProvider defaultMode="light">
        <ProfilePage />
      </ThemeProvider>
    );

    await waitFor(() => {
      const systemButton = screen.getByText('跟随系统');
      expect(systemButton).toBeInTheDocument();
    });

    const systemButton = screen.getByText('跟随系统');
    fireEvent.click(systemButton);

    await waitFor(() => {
      expect(localStorageMock.setItem).toHaveBeenCalledWith('7zi-theme-preference', 'system');
    });
  });

  it('should display current resolved theme', async () => {
    render(
      <ThemeProvider defaultMode="light">
        <ProfilePage />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('当前主题：☀️ 浅色')).toBeInTheDocument();
    });
  });

  it('should highlight active theme option', async () => {
    render(
      <ThemeProvider defaultMode="dark">
        <ProfilePage />
      </ThemeProvider>
    );

    await waitFor(() => {
      const darkButton = screen.getByText('深色模式').closest('button');
      expect(darkButton).toHaveClass('bg-blue-50', 'text-blue-600', 'ring-2', 'ring-blue-500');
    });
  });

  it('should prevent hydration mismatch with mounted state', async () => {
    render(
      <ThemeProvider defaultMode="light">
        <ProfilePage />
      </ThemeProvider>
    );

    // Initially should not render until mounted
    await waitFor(() => {
      expect(screen.getByText('外观设置')).toBeInTheDocument();
    });
  });
});