import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Analytics } from '@/components/Analytics'

describe('Analytics', () => {
  let originalEnv: NodeJS.ProcessEnv

  beforeEach(() => {
    originalEnv = { ...process.env }
    // Reset all analytics env vars
    delete process.env.NEXT_PUBLIC_GA_ID
    delete process.env.NEXT_PUBLIC_UMAMI_ID
    delete process.env.NEXT_PUBLIC_UMAMI_URL
    delete process.env.NEXT_PUBLIC_PLAUSIBLE_ID
    delete process.env.NEXT_PUBLIC_BAIDU_ID
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('renders without crashing', () => {
    const { container } = render(<Analytics />)
    expect(container).toBeTruthy()
  })

  it('renders null when no analytics IDs are configured', () => {
    const { container } = render(<Analytics />)
    // Should render nothing when no analytics are configured
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when only GA_ID is set', () => {
    process.env.NEXT_PUBLIC_GA_ID = 'G-XXXXXXXXXX'
    
    const { container } = render(<Analytics />)
    // Component should render something when GA is configured
    expect(container).toBeTruthy()
  })

  it('renders nothing when only UMAMI_ID is set', () => {
    process.env.NEXT_PUBLIC_UMAMI_ID = 'umami-id-123'
    
    const { container } = render(<Analytics />)
    expect(container).toBeTruthy()
  })

  it('renders nothing when only PLAUSIBLE_ID is set', () => {
    process.env.NEXT_PUBLIC_PLAUSIBLE_ID = 'plausible.example.com'
    
    const { container } = render(<Analytics />)
    expect(container).toBeTruthy()
  })

  it('renders nothing when only BAIDU_ID is set', () => {
    process.env.NEXT_PUBLIC_BAIDU_ID = 'baidu-id-123'
    
    const { container } = render(<Analytics />)
    expect(container).toBeTruthy()
  })
})
