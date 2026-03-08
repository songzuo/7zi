import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { UserSettingsPage } from '@/components/UserSettings/UserSettingsPage';

// Mock all section components
vi.mock('@/components/UserSettings/sections/ProfileSection', () => ({
  default: () => <div data-testid="profile-section">Profile Section</div>,
}));

vi.mock('@/components/UserSettings/sections/SecuritySection', () => ({
  default: () => <div data-testid="security-section">Security Section</div>,
}));

vi.mock('@/components/UserSettings/sections/NotificationsSection', () => ({
  default: () => <div data-testid="notifications-section">Notifications Section</div>,
}));

vi.mock('@/components/UserSettings/sections/PrivacySection', () => ({
  default: () => <div data-testid="privacy-section">Privacy Section</div>,
}));

vi.mock('@/components/UserSettings/sections/ThemeSection', () => ({
  default: () => <div data-testid="theme-section">Theme Section</div>,
}));

// Mock ThemeProvider
vi.mock('@/components/ThemeProvider', () => ({
  useTheme: () => ({
    theme: 'light',
    setTheme: vi.fn(),
  }),
}));

// Mock SettingsContext
vi.mock('@/contexts/SettingsContext', () => ({
  useSettings: () => ({
    setNotifications: vi.fn(),
  }),
}));

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
};

vi.stubGlobal('localStorage', mockLocalStorage);

// Mock useLocalStorage hook
const mockUseLocalStorage = vi.fn((key, initialValue) => {
  // Return [value, setValue] tuple
  const value = initialValue;
  const setValue = vi.fn();
  return [value, setValue];
});

vi.mock('@/hooks/useLocalStorage', () => ({
  useLocalStorage: (key: string, initialValue: unknown) => mockUseLocalStorage(key, initialValue),
}));

describe('UserSettingsPage', () => {
  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Mock localStorage
    mockLocalStorage.getItem.mockImplementation((key) => {
      if (key === 'user-profile') {
        return JSON.stringify({
          nickname: 'Test User',
          avatar: '',
          bio: 'Test bio',
          email: 'test@example.com',
        });
      }
      if (key === 'user-security') {
        return JSON.stringify({
          twoFactorEnabled: false,
          lastPasswordChange: null,
        });
      }
      if (key === 'user-notifications') {
        return JSON.stringify({
          emailNotifications: true,
          pushNotifications: true,
          marketingEmails: false,
          weeklyDigest: true,
          mentionNotifications: true,
        });
      }
      if (key === 'user-privacy') {
        return JSON.stringify({
          profileVisibility: 'public',
          showEmail: false,
          showActivity: true,
          allowMessages: true,
          dataCollection: true,
        });
      }
      return null;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders user settings page header', () => {
    render(<UserSettingsPage />);
    
    expect(screen.getByText('用户设置')).toBeInTheDocument();
    expect(screen.getByText('管理您的账户设置和偏好')).toBeInTheDocument();
  });

  it('renders all navigation items', () => {
    render(<UserSettingsPage />);
    
    // Desktop navigation
    expect(screen.getByText('个人资料')).toBeInTheDocument();
    expect(screen.getByText('账户安全')).toBeInTheDocument();
    expect(screen.getByText('通知偏好')).toBeInTheDocument();
    expect(screen.getByText('隐私设置')).toBeInTheDocument();
    expect(screen.getByText('主题设置')).toBeInTheDocument();
  });

  it('switches between sections when navigation items are clicked', async () => {
    render(<UserSettingsPage />);
    
    // Start with profile section visible
    expect(screen.getByTestId('profile-section')).toBeInTheDocument();
    
    // Click on security section
    const securityNav = screen.getAllByText('账户安全')[0]; // Get the first one (desktop nav)
    fireEvent.click(securityNav);
    
    // Security section should be visible
    expect(screen.getByTestId('security-section')).toBeInTheDocument();
    
    // Click on notifications section
    const notificationsNav = screen.getAllByText('通知偏好')[0];
    fireEvent.click(notificationsNav);
    
    // Notifications section should be visible
    expect(screen.getByTestId('notifications-section')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<UserSettingsPage className="custom-class" />);
    
    expect(container.firstChild).toHaveClass('custom-class');
  });
});