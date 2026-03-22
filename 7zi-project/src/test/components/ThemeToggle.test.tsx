import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { ThemeProvider } from '@/components/ThemeProvider'
import { ThemeToggle } from '@/components/ThemeToggle'

const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value }),
    removeItem: vi.fn((key: string) => { delete store[key] }),
    clear: vi.fn(() => { store = {} }),
  }
})()

// Test wrapper component
const TestWrapper = ({ defaultTheme }: { defaultTheme?: 'light' | 'dark' | 'system' }) => (
  <ThemeProvider defaultTheme={defaultTheme || 'light'}>
    <ThemeToggle />
  </ThemeProvider>
)

describe('ThemeToggle', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'localStorage', { value: localStorageMock })
    localStorageMock.clear()
    document.documentElement.classList.remove('dark')
  })

  it('renders without crashing', async () => {
    render(<TestWrapper />)
    
    await waitFor(() => {
      const button = screen.getByRole('button')
      expect(button).toBeInTheDocument()
    })
  })

  it('has aria-label', async () => {
    render(<TestWrapper />)
    
    await waitFor(() => {
      const button = screen.getByLabelText('Toggle theme')
      expect(button).toBeInTheDocument()
    })
  })

  it('toggles theme when clicked', async () => {
    render(<TestWrapper defaultTheme="light" />)
    
    await waitFor(() => {
      expect(screen.getByLabelText('Toggle theme')).toBeInTheDocument()
    })
    
    const button = screen.getByLabelText('Toggle theme')
    
    await act(async () => {
      fireEvent.click(button)
    })
    
    await waitFor(() => {
      expect(document.documentElement.classList.contains('dark')).toBe(true)
    })
  })

  it('shows correct initial state for light theme', async () => {
    render(<TestWrapper defaultTheme="light" />)
    
    await waitFor(() => {
      const toggleSpan = screen.getByLabelText('Toggle theme').querySelector('span')
      expect(toggleSpan?.className).not.toContain('translate-x-6')
    })
  })

  it('shows correct initial state for dark theme', async () => {
    render(<TestWrapper defaultTheme="dark" />)
    
    await waitFor(() => {
      const toggleSpan = screen.getByLabelText('Toggle theme').querySelector('span')
      expect(toggleSpan?.className).toContain('translate-x-6')
    })
  })
})