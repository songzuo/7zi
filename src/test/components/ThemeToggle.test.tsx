import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ThemeProvider } from '@/components/ThemeProvider'
import { ThemeToggle } from '@/components/ThemeToggle'

// Test wrapper component
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
    {children}
  </ThemeProvider>
)

describe('ThemeToggle', () => {
  it('renders without crashing', () => {
    render(
      <TestWrapper>
        <ThemeToggle />
      </TestWrapper>
    )
    const button = screen.getByRole('button')
    expect(button).toBeInTheDocument()
  })

  it('has aria-label', () => {
    render(
      <TestWrapper>
        <ThemeToggle />
      </TestWrapper>
    )
    const button = screen.getByLabelText('Toggle theme')
    expect(button).toBeInTheDocument()
  })

  it('contains theme icons', () => {
    const { container } = render(
      <TestWrapper>
        <ThemeToggle />
      </TestWrapper>
    )
    expect(container.textContent).toContain('☀️')
    expect(container.textContent).toContain('🌙')
  })
})
