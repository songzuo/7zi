import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ThemeProvider, useTheme } from '@/components/ThemeProvider'
import { ReactNode } from 'react'

// Test component that uses theme
const TestComponent = () => {
  const { isDark, theme } = useTheme()
  return (
    <div data-testid="theme-info">
      <span data-testid="is-dark">{isDark ? 'dark' : 'light'}</span>
      <span data-testid="theme">{theme}</span>
    </div>
  )
}

const TestWrapper = ({ children, theme }: { children?: ReactNode; theme?: string }) => (
  <ThemeProvider attribute="class" defaultTheme={theme || 'light'} enableSystem={false}>
    {children}
  </ThemeProvider>
)

describe('ThemeProvider', () => {
  it('renders children correctly', () => {
    render(
      <TestWrapper>
        <div data-testid="child">Test Child</div>
      </TestWrapper>
    )
    expect(screen.getByTestId('child')).toBeInTheDocument()
  })

  it('provides theme context with light mode', () => {
    render(
      <TestWrapper theme="light">
        <TestComponent />
      </TestWrapper>
    )
    expect(screen.getByTestId('is-dark').textContent).toBe('light')
    expect(screen.getByTestId('theme').textContent).toBe('light')
  })
})
