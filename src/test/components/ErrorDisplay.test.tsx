import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ErrorDisplay } from '@/components/ErrorDisplay'

describe('ErrorDisplay', () => {
  it('renders default error message', () => {
    render(<ErrorDisplay />)
    
    expect(screen.getByText('出现了一些问题')).toBeInTheDocument()
    expect(screen.getByText('发生了意外错误，请稍后重试')).toBeInTheDocument()
  })

  it('renders with custom title and message', () => {
    render(<ErrorDisplay title="Custom Title" message="Custom Message" />)
    
    expect(screen.getByText('Custom Title')).toBeInTheDocument()
    expect(screen.getByText('Custom Message')).toBeInTheDocument()
  })

  it('renders compact variant', () => {
    const { container } = render(<ErrorDisplay variant="compact" />)
    expect(container.firstChild).toBeTruthy()
  })

  it('renders fullscreen variant', () => {
    const { container } = render(<ErrorDisplay variant="fullscreen" />)
    expect(container.firstChild).toBeTruthy()
  })

  it('shows reset button when showReset and onReset are provided', () => {
    const onReset = vi.fn()
    render(<ErrorDisplay showReset onReset={onReset} />)
    
    expect(screen.getByRole('button', { name: /重试/i })).toBeInTheDocument()
  })

  it('hides reset button when showReset is false', () => {
    render(<ErrorDisplay showReset={false} />)
    
    expect(screen.queryByRole('button', { name: /重试/i })).not.toBeInTheDocument()
  })

  it('calls onReset when reset button is clicked', () => {
    const onReset = vi.fn()
    render(<ErrorDisplay showReset onReset={onReset} />)
    
    const button = screen.getByRole('button', { name: /重试/i })
    button.click()
    
    expect(onReset).toHaveBeenCalled()
  })

  it('renders with error digest', () => {
    const errorDigest = 'ABC12345'
    render(<ErrorDisplay errorDigest={errorDigest} variant="fullscreen" />)
    
    expect(screen.getByText(/错误码:/)).toBeInTheDocument()
  })
})
