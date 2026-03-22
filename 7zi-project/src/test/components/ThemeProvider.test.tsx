import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { ThemeProvider, useTheme } from '@/components/ThemeProvider'
import { ReactNode } from 'react'

// Test component that uses theme
const TestComponent = () => {
  const { isDark, theme, setTheme, toggleTheme } = useTheme()
  return (
    <div data-testid="theme-info">
      <span data-testid="is-dark">{isDark ? 'dark' : 'light'}</span>
      <span data-testid="theme">{theme}</span>
      <button data-testid="toggle" onClick={toggleTheme}>Toggle</button>
      <button data-testid="set-dark" onClick={() => setTheme('dark')}>Set Dark</button>
      <button data-testid="set-light" onClick={() => setTheme('light')}>Set Light</button>
      <button data-testid="set-system" onClick={() => setTheme('system')}>Set System</button>
    </div>
  )
}

const TestWrapper = ({ children, defaultTheme }: { 
  children?: ReactNode
  defaultTheme?: 'light' | 'dark' | 'system'
}) => (
  <ThemeProvider defaultTheme={defaultTheme}>
    {children}
  </ThemeProvider>
)

describe('ThemeProvider', () => {
  // The actual storage key used by SettingsProvider
  const STORAGE_KEY = '7zi-user-settings'
  
  let store: Record<string, string> = {}
  
  const localStorageMock = {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value }),
    removeItem: vi.fn((key: string) => { delete store[key] }),
    clear: vi.fn(() => { store = {} }),
  }

  // Mock matchMedia for system theme detection
  const createMatchMedia = (prefersDark: boolean) => {
    return vi.fn((query: string) => ({
      matches: query === '(prefers-color-scheme: dark)' ? prefersDark : false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))
  }

  beforeEach(() => {
    store = {}
    Object.defineProperty(window, 'localStorage', { value: localStorageMock, writable: true })
    Object.defineProperty(window, 'matchMedia', { 
      value: createMatchMedia(false), 
      writable: true 
    })
    document.documentElement.classList.remove('dark')
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders children correctly', async () => {
    render(
      <TestWrapper>
        <div data-testid="child">Test Child</div>
      </TestWrapper>
    )
    
    await waitFor(() => {
      expect(screen.getByTestId('child')).toBeInTheDocument()
    })
  })

  it('provides theme context with light mode', async () => {
    render(
      <TestWrapper defaultTheme="light">
        <TestComponent />
      </TestWrapper>
    )
    
    await waitFor(() => {
      expect(screen.getByTestId('is-dark').textContent).toBe('light')
      expect(screen.getByTestId('theme').textContent).toBe('light')
    })
  })

  it('provides theme context with dark mode', async () => {
    render(
      <TestWrapper defaultTheme="dark">
        <TestComponent />
      </TestWrapper>
    )
    
    await waitFor(() => {
      expect(screen.getByTestId('is-dark').textContent).toBe('dark')
      expect(screen.getByTestId('theme').textContent).toBe('dark')
    })
  })

  it('adds dark class to document root when dark theme is set', async () => {
    render(
      <TestWrapper defaultTheme="dark">
        <TestComponent />
      </TestWrapper>
    )
    
    await waitFor(() => {
      expect(document.documentElement.classList.contains('dark')).toBe(true)
    })
  })

  it('removes dark class from document root when light theme is set', async () => {
    document.documentElement.classList.add('dark')
    
    render(
      <TestWrapper defaultTheme="light">
        <TestComponent />
      </TestWrapper>
    )
    
    await waitFor(() => {
      expect(document.documentElement.classList.contains('dark')).toBe(false)
    })
  })

  it('sets theme when setTheme is called', async () => {
    render(
      <TestWrapper defaultTheme="light">
        <TestComponent />
      </TestWrapper>
    )
    
    await waitFor(() => {
      expect(screen.getByTestId('theme').textContent).toBe('light')
    })
    
    await act(async () => {
      fireEvent.click(screen.getByTestId('set-dark'))
    })
    
    await waitFor(() => {
      expect(screen.getByTestId('theme').textContent).toBe('dark')
      expect(screen.getByTestId('is-dark').textContent).toBe('dark')
    })
  })

  it('toggles theme from light to dark', async () => {
    render(
      <TestWrapper defaultTheme="light">
        <TestComponent />
      </TestWrapper>
    )
    
    await waitFor(() => {
      expect(screen.getByTestId('theme').textContent).toBe('light')
    })
    
    await act(async () => {
      fireEvent.click(screen.getByTestId('toggle'))
    })
    
    await waitFor(() => {
      expect(screen.getByTestId('theme').textContent).toBe('dark')
    })
  })

  it('toggles theme from dark to light', async () => {
    render(
      <TestWrapper defaultTheme="dark">
        <TestComponent />
      </TestWrapper>
    )
    
    await waitFor(() => {
      expect(screen.getByTestId('theme').textContent).toBe('dark')
    })
    
    await act(async () => {
      fireEvent.click(screen.getByTestId('toggle'))
    })
    
    await waitFor(() => {
      expect(screen.getByTestId('theme').textContent).toBe('light')
    })
  })

  it('saves theme to localStorage', async () => {
    render(
      <TestWrapper defaultTheme="light">
        <TestComponent />
      </TestWrapper>
    )
    
    await waitFor(() => {
      expect(screen.getByTestId('theme').textContent).toBe('light')
    })
    
    await act(async () => {
      fireEvent.click(screen.getByTestId('set-dark'))
    })
    
    await waitFor(() => {
      // The SettingsProvider saves settings as JSON with the key '7zi-user-settings'
      expect(localStorageMock.setItem).toHaveBeenCalled()
      const lastCall = localStorageMock.setItem.mock.calls[localStorageMock.setItem.mock.calls.length - 1]
      expect(lastCall[0]).toBe(STORAGE_KEY)
      const savedSettings = JSON.parse(lastCall[1])
      expect(savedSettings.theme).toBe('dark')
    })
  })

  it('loads theme from localStorage on mount', async () => {
    // Pre-populate localStorage with dark theme settings
    store[STORAGE_KEY] = JSON.stringify({
      theme: 'dark',
      language: 'zh',
      notifications: { enabled: true, sound: true, email: false, push: true }
    })
    localStorageMock.getItem.mockImplementation((key: string) => store[key] || null)
    
    render(
      <TestWrapper defaultTheme="light">
        <TestComponent />
      </TestWrapper>
    )
    
    await waitFor(() => {
      expect(screen.getByTestId('theme').textContent).toBe('dark')
    })
  })

  it('returns default context when useTheme is called outside provider', () => {
    // Test outside provider
    const { result } = renderHook(() => useTheme())
    
    expect(result.current.theme).toBe('system')
    expect(result.current.isDark).toBe(false)
    expect(typeof result.current.setTheme).toBe('function')
    expect(typeof result.current.toggleTheme).toBe('function')
  })
})

// Helper to test hooks
function renderHook<T>(hook: () => T) {
  const result: { current: T } = { current: null as unknown as T }
  
  function Wrapper() {
    result.current = hook()
    return null
  }
  
  render(<Wrapper />)
  
  return { result }
}