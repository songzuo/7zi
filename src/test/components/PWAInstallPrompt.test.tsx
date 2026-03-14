import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { PWAInstallPrompt } from '@/components/PWAInstallPrompt'

// Mock the logger
vi.mock('@/lib/logger', () => ({
  pwaLogger: {
    error: vi.fn()
  }
}))

describe('PWAInstallPrompt', () => {
  let originalLocalStorage: Storage
  
  beforeEach(() => {
    originalLocalStorage = global.localStorage
    // Create a mock localStorage
    const mockStorage = {
      getItem: vi.fn().mockReturnValue(null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    }
    global.localStorage = mockStorage as unknown as Storage
  })

  afterEach(() => {
    global.localStorage = originalLocalStorage
    vi.restoreAllMocks()
  })

  it('renders without crashing', () => {
    const { container } = render(<PWAInstallPrompt />)
    expect(container).toBeTruthy()
  })

  it('renders nothing initially when not dismissed', () => {
    const { container } = render(<PWAInstallPrompt />)
    // Component should render nothing initially
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when user has dismissed prompt', () => {
    // Mock localStorage to return dismissed
    const mockStorage = {
      getItem: vi.fn().mockReturnValue('true'),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    }
    global.localStorage = mockStorage as unknown as Storage
    
    const { container } = render(<PWAInstallPrompt />)
    expect(container.firstChild).toBeNull()
  })

  it('is defined as a function component', () => {
    expect(PWAInstallPrompt).toBeDefined()
  })
})
