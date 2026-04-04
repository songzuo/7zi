/**
 * ErrorFallback Component Tests
 * 错误回退组件测试
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import {
  SimpleErrorFallback,
  FullErrorFallback,
  CardErrorFallback,
  ErrorFallback,
} from './ErrorFallback'

// Mock logger
jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}))

// Mock addErrorLog
jest.mock('@/lib/error-reporting/error-log-history', () => ({
  addErrorLog: jest.fn().mockResolvedValue(undefined),
}))

// Mock withRetry
jest.mock('@/lib/error-reporting/retry', () => ({
  withRetry: jest.fn(),
}))

describe('ErrorFallback Components', () => {
  const mockError = new Error('Test error')
  const mockErrorInfo = {
    componentStack: 'at Component\n  at ErrorBoundary\n  at App',
  }

  describe('SimpleErrorFallback', () => {
    it('should render error message', () => {
      render(<SimpleErrorFallback error={mockError} errorInfo={mockErrorInfo} resetError={jest.fn()} />)

      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    })

    it('should call resetError when Try Again is clicked', () => {
      const resetError = jest.fn()
      render(<SimpleErrorFallback error={mockError} errorInfo={mockErrorInfo} resetError={resetError} />)

      const tryAgainButton = screen.getByText('Try Again')
      fireEvent.click(tryAgainButton)

      expect(resetError).toHaveBeenCalledTimes(1)
    })
  })

  describe('FullErrorFallback', () => {
    it('should render title and message', () => {
      render(
        <FullErrorFallback
          error={mockError}
          errorInfo={mockErrorInfo}
          resetError={jest.fn()}
          config={{ title: 'Custom Title', message: 'Custom message' }}
        />
      )

      expect(screen.getByText('Custom Title')).toBeInTheDocument()
      expect(screen.getByText('Custom message')).toBeInTheDocument()
    })

    it('should show error details when toggle is clicked', () => {
      render(
        <FullErrorFallback
          error={mockError}
          errorInfo={mockErrorInfo}
          resetError={jest.fn()}
          config={{ showErrorDetails: true }}
        />
      )

      const toggleButton = screen.getByText('Show Error Details')
      fireEvent.click(toggleButton)

      expect(screen.getByText('Hide Error Details')).toBeInTheDocument()
      expect(screen.getByText('Test error')).toBeInTheDocument()
    })

    it('should copy error when Copy button is clicked', async () => {
      const mockWriteText = jest.fn().mockResolvedValue(undefined)
      Object.assign(navigator, { clipboard: { writeText: mockWriteText } })

      render(
        <FullErrorFallback
          error={mockError}
          errorInfo={mockErrorInfo}
          resetError={jest.fn()}
          config={{ showErrorDetails: true }}
        />
      )

      const toggleButton = screen.getByText('Show Error Details')
      fireEvent.click(toggleButton)

      const copyButton = screen.getByText('Copy')
      fireEvent.click(copyButton)

      await waitFor(() => {
        expect(screen.getByText('Copied')).toBeInTheDocument()
      })

      expect(mockWriteText).toHaveBeenCalledWith(
        expect.stringContaining('Test error')
      )
    })

    it('should call onRetry and resetError when retry button is clicked', async () => {
      const { withRetry } = require('@/lib/error-reporting/retry')
      const resetError = jest.fn()
      const onRetry = jest.fn().mockResolvedValue(undefined)

      withRetry.mockImplementation(async (fn: () => Promise<void>) => {
        return fn()
      })

      render(
        <FullErrorFallback
          error={mockError}
          errorInfo={mockErrorInfo}
          resetError={resetError}
          config={{
            retryConfig: { maxAttempts: 3 },
            onRetry,
          }}
        />
      )

      const retryButton = screen.getByText('Try Again')
      fireEvent.click(retryButton)

      await waitFor(() => {
        expect(onRetry).toHaveBeenCalled()
      })

      expect(resetError).toHaveBeenCalled()
    })

    it('should show retry status and error', async () => {
      const { withRetry } = require('@/lib/error-reporting/retry')
      const resetError = jest.fn()

      withRetry.mockResolvedValue({
        success: false,
        error: new Error('Retry failed'),
        attempts: 3,
        totalTime: 1000,
      })

      render(
        <FullErrorFallback
          error={mockError}
          errorInfo={mockErrorInfo}
          resetError={resetError}
          config={{
            retryConfig: { maxAttempts: 3 },
          }}
        />
      )

      const retryButton = screen.getByText('Try Again')
      fireEvent.click(retryButton)

      await waitFor(() => {
        expect(screen.getByText('Retry Failed')).toBeInTheDocument()
      })

      expect(screen.getByText('An error occurred while attempting to recover.')).toBeInTheDocument()
    })

    it('should show retrying state while retrying', async () => {
      const { withRetry } = require('@/lib/error-reporting/retry')
      const resetError = jest.fn()

      let resolveRetry: (value: any) => void
      const retryPromise = new Promise(resolve => {
        resolveRetry = resolve
      })

      withRetry.mockReturnValue(retryPromise)

      render(
        <FullErrorFallback
          error={mockError}
          errorInfo={mockErrorInfo}
          resetError={resetError}
          config={{
            retryConfig: { maxAttempts: 3 },
          }}
        />
      )

      const retryButton = screen.getByText('Try Again')
      fireEvent.click(retryButton)

      expect(screen.getByText('Retrying...')).toBeInTheDocument()

      resolveRetry!({
        success: true,
        data: undefined,
        attempts: 1,
        totalTime: 100,
      })
    })

    it('should refresh page when Refresh Page is clicked', () => {
      const reloadMock = jest.fn()
      Object.defineProperty(window, 'location', {
        value: { reload: reloadMock, href: '/' },
        writable: true,
      })

      render(
        <FullErrorFallback
          error={mockError}
          errorInfo={mockErrorInfo}
          resetError={jest.fn()}
        />
      )

      const refreshButton = screen.getByText('Refresh Page')
      fireEvent.click(refreshButton)

      expect(reloadMock).toHaveBeenCalledTimes(1)
    })

    it('should go back when Go Back is clicked', () => {
      const mockHistory = { back: jest.fn(), length: 2 }
      Object.defineProperty(window, 'history', { value: mockHistory, writable: true })
      Object.defineProperty(window, 'location', { value: { href: '/test' }, writable: true })

      render(
        <FullErrorFallback
          error={mockError}
          errorInfo={mockErrorInfo}
          resetError={jest.fn()}
        />
      )

      const goBackButton = screen.getByText('Go Back')
      fireEvent.click(goBackButton)

      expect(mockHistory.back).toHaveBeenCalledTimes(1)
    })

    it('should navigate to home when Go to Home is clicked', () => {
      const hrefMock = { value: '/test' }
      Object.defineProperty(window, 'location', {
        value: { href: hrefMock.value },
        writable: true,
      })

      render(
        <FullErrorFallback
          error={mockError}
          errorInfo={mockErrorInfo}
          resetError={jest.fn()}
        />
      )

      const homeButton = screen.getByText('Go to Home')
      fireEvent.click(homeButton)

      expect(window.location.href).toBe('/')
    })

    it('should render additional actions', () => {
      const customAction = jest.fn()

      render(
        <FullErrorFallback
          error={mockError}
          errorInfo={mockErrorInfo}
          resetError={jest.fn()}
          config={{
            additionalActions: [
              { label: 'Custom Action', onClick: customAction, icon: '🎯' },
            ],
          }}
        />
      )

      const customButton = screen.getByText('Custom Action')
      expect(customButton).toBeInTheDocument()
      expect(screen.getByText('🎯')).toBeInTheDocument()

      fireEvent.click(customButton)
      expect(customAction).toHaveBeenCalled()
    })

    it('should disable buttons while retrying', async () => {
      const { withRetry } = require('@/lib/error-reporting/retry')

      let resolveRetry: (value: any) => void
      const retryPromise = new Promise(resolve => {
        resolveRetry = resolve
      })

      withRetry.mockReturnValue(retryPromise)

      render(
        <FullErrorFallback
          error={mockError}
          errorInfo={mockErrorInfo}
          resetError={jest.fn()}
        />
      )

      const retryButton = screen.getByText('Try Again')
      fireEvent.click(retryButton)

      await waitFor(() => {
        expect(screen.getByText('Retrying...')).toBeInTheDocument()
      })

      // Check that other buttons are disabled
      const refreshButton = screen.getByText('Refresh Page')
      expect(refreshButton).toBeDisabled()

      resolveRetry!({
        success: true,
        data: undefined,
        attempts: 1,
        totalTime: 100,
      })
    })
  })

  describe('CardErrorFallback', () => {
    it('should render card-style error UI', () => {
      render(
        <CardErrorFallback
          error={mockError}
          errorInfo={mockErrorInfo}
          resetError={jest.fn()}
          config={{ title: 'Card Error', message: 'Card message' }}
        />
      )

      expect(screen.getByText('Card Error')).toBeInTheDocument()
      expect(screen.getByText('Card message')).toBeInTheDocument()
    })

    it('should call resetError when Retry is clicked', () => {
      const resetError = jest.fn()
      render(
        <CardErrorFallback
          error={mockError}
          errorInfo={mockErrorInfo}
          resetError={resetError}
        />
      )

      const retryButton = screen.getByText('Retry')
      fireEvent.click(retryButton)

      expect(resetError).toHaveBeenCalledTimes(1)
    })
  })

  describe('ErrorFallback (default)', () => {
    it('should render FullErrorFallback by default', () => {
      render(
        <ErrorFallback
          error={mockError}
          errorInfo={mockErrorInfo}
          resetError={jest.fn()}
        />
      )

      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
      expect(screen.getByText('Try Again')).toBeInTheDocument()
      expect(screen.getByText('Refresh Page')).toBeInTheDocument()
    })
  })
})
