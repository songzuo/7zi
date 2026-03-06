import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { SettingsProvider, useSettings, useSettingsSafe } from '@/contexts/SettingsContext';
import type { UserSettings } from '@/contexts/SettingsContext';
import { ReactNode } from 'react';

// 测试组件
const TestComponent = () => {
  const { settings, setTheme, setLanguage, setNotifications, resetSettings, isLoaded } = useSettings();
  
  return (
    <div data-testid="settings-info">
      <span data-testid="is-loaded">{isLoaded ? 'loaded' : 'loading'}</span>
      <span data-testid="theme">{settings.theme}</span>
      <span data-testid="language">{settings.language}</span>
      <span data-testid="notifications-enabled">{settings.notifications.enabled ? 'true' : 'false'}</span>
      <span data-testid="notifications-sound">{settings.notifications.sound ? 'true' : 'false'}</span>
      
      <button data-testid="set-light" onClick={() => setTheme('light')}>Light</button>
      <button data-testid="set-dark" onClick={() => setTheme('dark')}>Dark</button>
      <button data-testid="set-system" onClick={() => setTheme('system')}>System</button>
      
      <button data-testid="set-zh" onClick={() => setLanguage('zh')}>中文</button>
      <button data-testid="set-en" onClick={() => setLanguage('en')}>English</button>
      
      <button data-testid="toggle-notifications" onClick={() => setNotifications({ enabled: !settings.notifications.enabled })}>
        Toggle Notifications
      </button>
      <button data-testid="toggle-sound" onClick={() => setNotifications({ sound: !settings.notifications.sound })}>
        Toggle Sound
      </button>
      
      <button data-testid="reset" onClick={resetSettings}>Reset</button>
    </div>
  );
};

const TestWrapper = ({ children, defaultSettings }: { 
  children?: ReactNode;
  defaultSettings?: Partial<UserSettings>;
}) => (
  <SettingsProvider defaultSettings={defaultSettings}>
    {children}
  </SettingsProvider>
);

describe('SettingsContext', () => {
  const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
      getItem: vi.fn((key: string) => store[key] || null),
      setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
      removeItem: vi.fn((key: string) => { delete store[key]; }),
      clear: vi.fn(() => { store = {}; }),
    };
  })();

  beforeEach(() => {
    Object.defineProperty(window, 'localStorage', { value: localStorageMock });
    localStorageMock.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders children correctly', async () => {
    render(
      <TestWrapper>
        <div data-testid="child">Test Child</div>
      </TestWrapper>
    );
    
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('provides default settings', async () => {
    render(
      <TestWrapper>
        <TestComponent />
      </TestWrapper>
    );
    
    await waitFor(() => {
      expect(screen.getByTestId('is-loaded').textContent).toBe('loaded');
    });
    
    expect(screen.getByTestId('theme').textContent).toBe('system');
    expect(screen.getByTestId('language').textContent).toBe('zh');
    expect(screen.getByTestId('notifications-enabled').textContent).toBe('true');
  });

  it('accepts custom default settings', async () => {
    render(
      <TestWrapper defaultSettings={{ theme: 'dark', language: 'en' }}>
        <TestComponent />
      </TestWrapper>
    );
    
    await waitFor(() => {
      expect(screen.getByTestId('theme').textContent).toBe('dark');
      expect(screen.getByTestId('language').textContent).toBe('en');
    });
  });

  it('sets theme correctly', async () => {
    render(
      <TestWrapper>
        <TestComponent />
      </TestWrapper>
    );
    
    await waitFor(() => {
      expect(screen.getByTestId('is-loaded').textContent).toBe('loaded');
    });
    
    await act(async () => {
      fireEvent.click(screen.getByTestId('set-dark'));
    });
    
    await waitFor(() => {
      expect(screen.getByTestId('theme').textContent).toBe('dark');
    });
    
    await act(async () => {
      fireEvent.click(screen.getByTestId('set-light'));
    });
    
    await waitFor(() => {
      expect(screen.getByTestId('theme').textContent).toBe('light');
    });
  });

  it('sets language correctly', async () => {
    render(
      <TestWrapper>
        <TestComponent />
      </TestWrapper>
    );
    
    await waitFor(() => {
      expect(screen.getByTestId('is-loaded').textContent).toBe('loaded');
    });
    
    await act(async () => {
      fireEvent.click(screen.getByTestId('set-en'));
    });
    
    await waitFor(() => {
      expect(screen.getByTestId('language').textContent).toBe('en');
    });
    
    await act(async () => {
      fireEvent.click(screen.getByTestId('set-zh'));
    });
    
    await waitFor(() => {
      expect(screen.getByTestId('language').textContent).toBe('zh');
    });
  });

  it('toggles notifications correctly', async () => {
    render(
      <TestWrapper>
        <TestComponent />
      </TestWrapper>
    );
    
    await waitFor(() => {
      expect(screen.getByTestId('is-loaded').textContent).toBe('loaded');
    });
    
    // 默认开启
    expect(screen.getByTestId('notifications-enabled').textContent).toBe('true');
    
    await act(async () => {
      fireEvent.click(screen.getByTestId('toggle-notifications'));
    });
    
    await waitFor(() => {
      expect(screen.getByTestId('notifications-enabled').textContent).toBe('false');
    });
  });

  it('toggles individual notification settings', async () => {
    render(
      <TestWrapper>
        <TestComponent />
      </TestWrapper>
    );
    
    await waitFor(() => {
      expect(screen.getByTestId('is-loaded').textContent).toBe('loaded');
    });
    
    // 默认开启声音
    expect(screen.getByTestId('notifications-sound').textContent).toBe('true');
    
    await act(async () => {
      fireEvent.click(screen.getByTestId('toggle-sound'));
    });
    
    await waitFor(() => {
      expect(screen.getByTestId('notifications-sound').textContent).toBe('false');
    });
  });

  it('resets settings to default', async () => {
    render(
      <TestWrapper>
        <TestComponent />
      </TestWrapper>
    );
    
    await waitFor(() => {
      expect(screen.getByTestId('is-loaded').textContent).toBe('loaded');
    });
    
    // 修改设置
    await act(async () => {
      fireEvent.click(screen.getByTestId('set-dark'));
      fireEvent.click(screen.getByTestId('set-en'));
    });
    
    await waitFor(() => {
      expect(screen.getByTestId('theme').textContent).toBe('dark');
      expect(screen.getByTestId('language').textContent).toBe('en');
    });
    
    // 重置
    await act(async () => {
      fireEvent.click(screen.getByTestId('reset'));
    });
    
    await waitFor(() => {
      expect(screen.getByTestId('theme').textContent).toBe('system');
      expect(screen.getByTestId('language').textContent).toBe('zh');
    });
  });

  it('saves settings to localStorage', async () => {
    render(
      <TestWrapper>
        <TestComponent />
      </TestWrapper>
    );
    
    await waitFor(() => {
      expect(screen.getByTestId('is-loaded').textContent).toBe('loaded');
    });
    
    await act(async () => {
      fireEvent.click(screen.getByTestId('set-dark'));
    });
    
    await waitFor(() => {
      expect(localStorageMock.setItem).toHaveBeenCalled();
      const lastCall = localStorageMock.setItem.mock.calls[localStorageMock.setItem.mock.calls.length - 1];
      expect(lastCall[0]).toBe('7zi-user-settings');
      const savedData = JSON.parse(lastCall[1]);
      expect(savedData.theme).toBe('dark');
    });
  });

  it('loads settings from localStorage on mount', async () => {
    localStorageMock.getItem.mockReturnValue(JSON.stringify({
      theme: 'dark',
      language: 'en',
      notifications: { enabled: false, sound: false, email: true, push: false },
    }));
    
    render(
      <TestWrapper>
        <TestComponent />
      </TestWrapper>
    );
    
    await waitFor(() => {
      expect(screen.getByTestId('theme').textContent).toBe('dark');
      expect(screen.getByTestId('language').textContent).toBe('en');
      expect(screen.getByTestId('notifications-enabled').textContent).toBe('false');
    });
  });

  it('useSettings throws error outside provider', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    expect(() => {
      render(<TestComponent />);
    }).toThrow('useSettings must be used within a SettingsProvider');
    
    consoleError.mockRestore();
  });

  it('useSettingsSafe returns default context outside provider', () => {
    const SafeTestComponent = () => {
      const { settings, isLoaded } = useSettingsSafe();
      return (
        <div>
          <span data-testid="theme">{settings.theme}</span>
          <span data-testid="is-loaded">{isLoaded ? 'loaded' : 'not-loaded'}</span>
        </div>
      );
    };
    
    render(<SafeTestComponent />);
    
    expect(screen.getByTestId('theme').textContent).toBe('system');
    expect(screen.getByTestId('is-loaded').textContent).toBe('not-loaded');
  });
});