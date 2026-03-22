import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ErrorDisplay } from '@/components/ErrorDisplay'

describe('ErrorDisplay', () => {
  const mockOnReset = vi.fn()

  beforeEach(() => {
    mockOnReset.mockClear()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('default variant', () => {
    it('renders with default props', () => {
      render(<ErrorDisplay />)
      
      expect(screen.getByText('出现了一些问题')).toBeInTheDocument()
      expect(screen.getByText('发生了意外错误，请稍后重试')).toBeInTheDocument()
    })

    it('renders with custom title and message', () => {
      render(
        <ErrorDisplay 
          title="自定义错误" 
          message="这是一个自定义错误消息" 
        />
      )
      
      expect(screen.getByText('自定义错误')).toBeInTheDocument()
      expect(screen.getByText('这是一个自定义错误消息')).toBeInTheDocument()
    })

    it('shows reset button when showReset is true and onReset is provided', () => {
      render(<ErrorDisplay showReset onReset={mockOnReset} />)
      
      const resetButton = screen.getByRole('button', { name: '重试' })
      expect(resetButton).toBeInTheDocument()
    })

    it('hides reset button when showReset is false', () => {
      render(<ErrorDisplay showReset={false} onReset={mockOnReset} />)
      
      expect(screen.queryByRole('button', { name: '重试' })).not.toBeInTheDocument()
    })

    it('calls onReset when reset button is clicked', () => {
      render(<ErrorDisplay showReset onReset={mockOnReset} />)
      
      fireEvent.click(screen.getByRole('button', { name: '重试' }))
      expect(mockOnReset).toHaveBeenCalledTimes(1)
    })

    it('shows error digest toggle when errorDigest is provided', () => {
      render(<ErrorDisplay errorDigest="test-digest-123" />)
      
      expect(screen.getByText('显示错误详情')).toBeInTheDocument()
    })

    it('toggles error details visibility', async () => {
      render(<ErrorDisplay errorDigest="test-digest-123" />)
      
      const toggleButton = screen.getByText('显示错误详情')
      fireEvent.click(toggleButton)
      
      await waitFor(() => {
        expect(screen.getByText('test-digest-123')).toBeInTheDocument()
        expect(screen.getByText('隐藏错误详情')).toBeInTheDocument()
      })
    })

    it('renders return home button', () => {
      render(<ErrorDisplay />)
      
      expect(screen.getByRole('button', { name: '返回首页' })).toBeInTheDocument()
    })

    it('renders support email link', () => {
      render(<ErrorDisplay />)
      
      const supportLink = screen.getByRole('link', { name: '技术支持' })
      expect(supportLink).toHaveAttribute('href', 'mailto:support@7zi.studio')
    })
  })

  describe('compact variant', () => {
    it('renders compact variant correctly', () => {
      render(<ErrorDisplay variant="compact" message="紧凑错误" />)
      
      expect(screen.getByText('紧凑错误')).toBeInTheDocument()
    })

    it('shows reset button in compact variant', () => {
      render(<ErrorDisplay variant="compact" showReset onReset={mockOnReset} />)
      
      expect(screen.getByRole('button', { name: '重试' })).toBeInTheDocument()
    })

    it('calls onReset in compact variant', () => {
      render(<ErrorDisplay variant="compact" showReset onReset={mockOnReset} />)
      
      fireEvent.click(screen.getByRole('button', { name: '重试' }))
      expect(mockOnReset).toHaveBeenCalledTimes(1)
    })
  })

  describe('fullscreen variant', () => {
    it('renders fullscreen variant correctly', () => {
      render(
        <ErrorDisplay 
          variant="fullscreen" 
          title="全屏错误" 
          message="全屏错误消息" 
        />
      )
      
      expect(screen.getByText('全屏错误')).toBeInTheDocument()
      expect(screen.getByText('全屏错误消息')).toBeInTheDocument()
    })

    it('shows truncated error digest in fullscreen variant', () => {
      render(<ErrorDisplay variant="fullscreen" errorDigest="very-long-digest-string" />)
      
      expect(screen.getByText('错误码: very-lon')).toBeInTheDocument()
    })

    it('shows reload button in fullscreen variant', () => {
      render(<ErrorDisplay variant="fullscreen" showReset onReset={mockOnReset} />)
      
      expect(screen.getByRole('button', { name: '重新加载' })).toBeInTheDocument()
    })

    it('calls onReset when reload button is clicked', () => {
      render(<ErrorDisplay variant="fullscreen" showReset onReset={mockOnReset} />)
      
      fireEvent.click(screen.getByRole('button', { name: '重新加载' }))
      expect(mockOnReset).toHaveBeenCalledTimes(1)
    })
  })
})
