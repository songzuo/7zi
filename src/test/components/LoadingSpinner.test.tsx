import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LoadingSpinner } from '@/components/LoadingSpinner'

describe('LoadingSpinner', () => {
  it('renders without crashing', () => {
    render(<LoadingSpinner />)
    const spinner = screen.getByRole('status')
    expect(spinner).toBeInTheDocument()
  })

  it('has correct aria-label', () => {
    render(<LoadingSpinner />)
    const spinner = screen.getByLabelText('加载中')
    expect(spinner).toBeInTheDocument()
  })

  it('renders with default size', () => {
    const { container } = render(<LoadingSpinner />)
    const div = container.querySelector('div')
    expect(div).toHaveClass('w-8', 'h-8')
  })

  it('renders with small size', () => {
    const { container } = render(<LoadingSpinner size="sm" />)
    const div = container.querySelector('div')
    expect(div).toHaveClass('w-4', 'h-4')
  })

  it('renders with large size', () => {
    const { container } = render(<LoadingSpinner size="lg" />)
    const div = container.querySelector('div')
    expect(div).toHaveClass('w-12', 'h-12')
  })
})
