import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Navigation } from '../components/Navigation';
import * as nextNavigation from 'next/navigation';
import { ThemeProvider } from '../components/ThemeProvider';

// Mock Next.js usePathname
vi.mock('next/navigation', () => ({
  usePathname: vi.fn(),
}));

const mockedUsePathname = nextNavigation.usePathname as ReturnType<typeof vi.fn>;

// Mock matchMedia for ThemeProvider
const matchMediaListeners: Array<(e: MediaQueryListEvent) => void> = [];
beforeEach(() => {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: (_event: string, listener: (e: MediaQueryListEvent) => void) => {
      matchMediaListeners.push(listener);
    },
    removeEventListener: (_event: string, listener: (e: MediaQueryListEvent) => void) => {
      const idx = matchMediaListeners.indexOf(listener);
      if (idx > -1) matchMediaListeners.splice(idx, 1);
    },
    dispatchEvent: () => false,
  }));

  // Mock document.documentElement.classList
  const classListMock = {
    classes: new Set<string>(),
    add: vi.fn((cls: string) => classListMock.classes.add(cls)),
    remove: vi.fn((cls: string) => classListMock.classes.delete(cls)),
    contains: vi.fn((cls: string) => classListMock.classes.has(cls)),
  };

  Object.defineProperty(document, 'documentElement', {
    value: {
      classList: classListMock,
      style: { colorScheme: '' },
    },
    writable: true,
    configurable: true,
  });

  // Mock localStorage
  vi.stubGlobal('localStorage', {
    getItem: vi.fn(() => null),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  });
});

// Helper to render with ThemeProvider
const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <ThemeProvider>
      {ui}
    </ThemeProvider>
  );
};

describe('Navigation', () => {
  beforeEach(() => {
    mockedUsePathname.mockReturnValue('/');
  });

  afterEach(() => {
    mockedUsePathname.mockClear();
  });

  it('renders navigation component', () => {
    renderWithProviders(<Navigation />);
    expect(screen.getByRole('navigation')).toBeDefined();
  });

  it('has correct aria-label', () => {
    renderWithProviders(<Navigation />);
    const nav = screen.getByRole('navigation');
    expect(nav.getAttribute('aria-label')).toBe('主导航');
  });

  it('renders all navigation items', () => {
    renderWithProviders(<Navigation />);
    // 检查导航图标存在 - 组件有 6 个导航项
    const menuItems = screen.getAllByRole('menuitem');
    expect(menuItems.length).toBe(6);
  });

  it('renders navigation labels', () => {
    renderWithProviders(<Navigation />);
    // 检查导航标签存在
    expect(screen.getAllByText('首页').length).toBeGreaterThan(0);
    expect(screen.getAllByText('实时看板').length).toBeGreaterThan(0);
    expect(screen.getAllByText('子代理').length).toBeGreaterThan(0);
    expect(screen.getAllByText('任务').length).toBeGreaterThan(0);
    expect(screen.getAllByText('个人资料').length).toBeGreaterThan(0);
    expect(screen.getAllByText('设置').length).toBeGreaterThan(0);
  });

  it('renders logo with correct aria-label', () => {
    renderWithProviders(<Navigation />);
    const logoLink = screen.getByLabelText('AI 团队首页');
    expect(logoLink).toBeDefined();
  });

  it('renders notification button', () => {
    renderWithProviders(<Navigation />);
    const notificationButton = screen.getByLabelText('通知');
    expect(notificationButton).toBeDefined();
  });

  it('renders settings button', () => {
    renderWithProviders(<Navigation />);
    // 导航栏中有一个设置菜单项，用户操作区也有一个设置按钮
    const settingsButtons = screen.getAllByLabelText('设置');
    expect(settingsButtons.length).toBe(2);
  });

  it('highlights current page', () => {
    mockedUsePathname.mockReturnValue('/dashboard');
    renderWithProviders(<Navigation />);
    const dashboardLink = screen.getByLabelText('实时看板（当前页面）');
    expect(dashboardLink).toBeDefined();
  });

  it('has menuitem roles', () => {
    renderWithProviders(<Navigation />);
    const menuItems = screen.getAllByRole('menuitem');
    expect(menuItems.length).toBe(6);
  });

  it('has proper keyboard navigation data attributes', () => {
    renderWithProviders(<Navigation />);
    const navLinks = document.querySelectorAll('[data-nav-index]');
    expect(navLinks.length).toBe(6);
  });
});
