import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import React from 'react';
import { ThemeProvider, useTheme } from '../components/ThemeProvider';

// 测试用组件 - 显示当前主题
function ThemeDisplay() {
  const { theme, resolvedTheme, isTransitioning } = useTheme();
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <span data-testid="resolved-theme">{resolvedTheme}</span>
      <span data-testid="transitioning">{isTransitioning.toString()}</span>
    </div>
  );
}

// 测试用组件 - 主题切换按钮
function ThemeToggle() {
  const { toggleTheme, setTheme } = useTheme();
  return (
    <div>
      <button onClick={toggleTheme} data-testid="toggle-btn">Toggle</button>
      <button onClick={() => setTheme('light')} data-testid="light-btn">Light</button>
      <button onClick={() => setTheme('dark')} data-testid="dark-btn">Dark</button>
      <button onClick={() => setTheme('system')} data-testid="system-btn">System</button>
    </div>
  );
}

// 完整的测试组件
function TestComponent() {
  return (
    <ThemeProvider>
      <ThemeDisplay />
      <ThemeToggle />
    </ThemeProvider>
  );
}

describe('ThemeProvider', () => {
  let localStorageMock: { [key: string]: string };
  let matchMediaListeners: Array<(e: MediaQueryListEvent) => void>;

  beforeEach(() => {
    // Mock localStorage
    localStorageMock = {};
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => localStorageMock[key] || null,
      setItem: (key: string, value: string) => {
        localStorageMock[key] = value;
      },
      removeItem: (key: string) => {
        delete localStorageMock[key];
      },
      clear: () => {
        localStorageMock = {};
      },
    });

    // Mock matchMedia with listener tracking
    matchMediaListeners = [];
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
        matchMediaListeners = matchMediaListeners.filter(l => l !== listener);
      },
      dispatchEvent: () => false,
    }));

    // Mock document.documentElement
    const classListMock = {
      classes: new Set<string>(),
      add: vi.fn((cls: string) => classListMock.classes.add(cls)),
      remove: vi.fn((cls: string) => classListMock.classes.delete(cls)),
      contains: vi.fn((cls: string) => classListMock.classes.has(cls)),
    };

    Object.defineProperty(document, 'documentElement', {
      value: {
        classList: classListMock,
        style: {
          colorScheme: '',
        },
      },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('主题持久化', () => {
    it('should load theme from localStorage on mount', async () => {
      localStorageMock['theme'] = 'dark';
      
      render(<TestComponent />);
      
      await waitFor(() => {
        expect(screen.getByTestId('theme').textContent).toBe('dark');
      });
    });

    it('should save theme to localStorage when changed', async () => {
      render(<TestComponent />);
      
      await waitFor(() => {
        expect(screen.getByTestId('theme').textContent).toBe('system');
      });
      
      await act(async () => {
        fireEvent.click(screen.getByTestId('dark-btn'));
      });
      
      expect(localStorageMock['theme']).toBe('dark');
    });

    it('should handle invalid localStorage values gracefully', async () => {
      localStorageMock['theme'] = 'invalid-theme';
      
      render(<TestComponent />);
      
      // 应该回退到默认值 'system'
      await waitFor(() => {
        expect(screen.getByTestId('theme').textContent).toBe('system');
      });
    });

    it('should persist theme selection across remounts', async () => {
      const { unmount } = render(<TestComponent />);
      
      await act(async () => {
        fireEvent.click(screen.getByTestId('dark-btn'));
      });
      
      expect(localStorageMock['theme']).toBe('dark');
      
      unmount();
      
      render(<TestComponent />);
      
      await waitFor(() => {
        expect(screen.getByTestId('theme').textContent).toBe('dark');
      });
    });
  });

  describe('系统主题跟随', () => {
    it('should follow system theme when set to system', async () => {
      render(<TestComponent />);
      
      await waitFor(() => {
        expect(screen.getByTestId('theme').textContent).toBe('system');
        expect(screen.getByTestId('resolved-theme').textContent).toBe('light');
      });
    });

    it('should respond to system theme changes', async () => {
      render(<TestComponent />);
      
      await waitFor(() => {
        expect(screen.getByTestId('theme').textContent).toBe('system');
      });
      
      // 模拟系统主题变为 dark
      await act(async () => {
        const event = { matches: true } as MediaQueryListEvent;
        matchMediaListeners.forEach(listener => listener(event));
      });
      
      await waitFor(() => {
        expect(screen.getByTestId('resolved-theme').textContent).toBe('dark');
      });
    });

    it('should not listen to system changes when theme is not system', async () => {
      render(<TestComponent />);
      
      await act(async () => {
        fireEvent.click(screen.getByTestId('light-btn'));
      });
      
      expect(screen.getByTestId('theme').textContent).toBe('light');
      
      // 模拟系统主题变为 dark
      await act(async () => {
        const event = { matches: true } as MediaQueryListEvent;
        matchMediaListeners.forEach(listener => listener(event));
      });
      
      // 主题应该保持 light，不受系统主题影响
      await waitFor(() => {
        expect(screen.getByTestId('resolved-theme').textContent).toBe('light');
      });
    });
  });

  describe('主题切换', () => {
    it('should toggle between light and dark themes', async () => {
      render(<TestComponent />);
      
      await act(async () => {
        fireEvent.click(screen.getByTestId('light-btn'));
      });
      
      expect(screen.getByTestId('theme').textContent).toBe('light');
      expect(screen.getByTestId('resolved-theme').textContent).toBe('light');
      
      await act(async () => {
        fireEvent.click(screen.getByTestId('toggle-btn'));
      });
      
      expect(screen.getByTestId('theme').textContent).toBe('dark');
      expect(screen.getByTestId('resolved-theme').textContent).toBe('dark');
      
      await act(async () => {
        fireEvent.click(screen.getByTestId('toggle-btn'));
      });
      
      expect(screen.getByTestId('theme').textContent).toBe('light');
    });

    it('should set theme explicitly', async () => {
      render(<TestComponent />);
      
      await act(async () => {
        fireEvent.click(screen.getByTestId('dark-btn'));
      });
      
      expect(screen.getByTestId('theme').textContent).toBe('dark');
      expect(localStorageMock['theme']).toBe('dark');
      
      await act(async () => {
        fireEvent.click(screen.getByTestId('system-btn'));
      });
      
      expect(screen.getByTestId('theme').textContent).toBe('system');
      expect(localStorageMock['theme']).toBe('system');
    });

    it('should toggle from system theme correctly', async () => {
      render(<TestComponent />);
      
      // 默认是 system，解析为 light
      await waitFor(() => {
        expect(screen.getByTestId('theme').textContent).toBe('system');
        expect(screen.getByTestId('resolved-theme').textContent).toBe('light');
      });
      
      // 切换应该从当前解析的主题切换
      await act(async () => {
        fireEvent.click(screen.getByTestId('toggle-btn'));
      });
      
      expect(screen.getByTestId('theme').textContent).toBe('dark');
    });
  });

  describe('主题切换动画', () => {
    it('should track transitioning state', async () => {
      render(<TestComponent />);
      
      // 等待初始渲染完成
      await waitFor(() => {
        expect(screen.getByTestId('transitioning').textContent).toBe('false');
      });
      
      // 触发主题切换
      await act(async () => {
        fireEvent.click(screen.getByTestId('dark-btn'));
      });
      
      // 动画开始
      expect(screen.getByTestId('transitioning').textContent).toBe('true');
      
      // 等待动画结束
      await waitFor(
        () => {
          expect(screen.getByTestId('transitioning').textContent).toBe('false');
        },
        { timeout: 500 }
      );
    });
  });

  describe('useTheme hook', () => {
    it('should throw error when used outside ThemeProvider', () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      function ComponentWithoutProvider() {
        useTheme();
        return null;
      }
      
      expect(() => render(<ComponentWithoutProvider />)).toThrow(
        'useTheme must be used within a ThemeProvider'
      );
      
      consoleError.mockRestore();
    });

    it('should return all theme properties', async () => {
      render(<TestComponent />);
      
      await waitFor(() => {
        const theme = screen.getByTestId('theme').textContent;
        const resolvedTheme = screen.getByTestId('resolved-theme').textContent;
        const transitioning = screen.getByTestId('transitioning').textContent;
        
        expect(theme).toBeDefined();
        expect(resolvedTheme).toBeDefined();
        expect(transitioning).toBeDefined();
      });
    });
  });

  describe('DOM 更新', () => {
    it('should add dark class to documentElement when dark theme', async () => {
      const classList = document.documentElement.classList;
      
      render(<TestComponent />);
      
      await act(async () => {
        fireEvent.click(screen.getByTestId('dark-btn'));
      });
      
      expect(classList.add).toHaveBeenCalledWith('dark');
    });

    it('should remove dark class from documentElement when light theme', async () => {
      const classList = document.documentElement.classList;
      
      render(<TestComponent />);
      
      await act(async () => {
        fireEvent.click(screen.getByTestId('dark-btn'));
      });
      
      await act(async () => {
        fireEvent.click(screen.getByTestId('light-btn'));
      });
      
      expect(classList.remove).toHaveBeenCalledWith('dark');
    });
  });

  describe('边界情况', () => {
    it('should handle rapid theme changes', async () => {
      render(<TestComponent />);
      
      await act(async () => {
        fireEvent.click(screen.getByTestId('dark-btn'));
        fireEvent.click(screen.getByTestId('light-btn'));
        fireEvent.click(screen.getByTestId('dark-btn'));
        fireEvent.click(screen.getByTestId('light-btn'));
      });
      
      // 最终应该是 light
      expect(screen.getByTestId('theme').textContent).toBe('light');
      expect(localStorageMock['theme']).toBe('light');
    });

    it('should handle SSR/hydration correctly', async () => {
      // 组件在客户端挂载时应该正确初始化
      render(<TestComponent />);
      
      await waitFor(() => {
        expect(screen.getByTestId('theme').textContent).toBe('system');
      });
    });
  });
});
