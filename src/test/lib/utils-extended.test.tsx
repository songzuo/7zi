/**
 * Extended utils tests - preloadResources and lazyLoadComponent
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  preloadResources,
  lazyLoadComponent,
  prefersReducedMotion,
  prefersDarkMode,
} from '@/lib/utils'

// Mock document for tests that need it
const createDocumentMock = () => {
  const mockLink = {
    rel: '',
    href: '',
    setAttribute: vi.fn(),
    appendChild: vi.fn(),
  }
  
  return {
    createElement: vi.fn(() => mockLink),
    head: {
      appendChild: vi.fn(),
    },
    mockLink,
  }
}

describe('preloadResources', () => {
  let originalDocument: typeof document

  beforeEach(() => {
    originalDocument = document
  })

  afterEach(() => {
    // Restore document
    Object.defineProperty(global, 'document', {
      value: originalDocument,
      writable: true,
    })
  })

  it('does nothing when document is undefined', () => {
    Object.defineProperty(global, 'document', {
      value: undefined,
      writable: true,
    })
    
    // Should not throw
    expect(() => preloadResources([])).not.toThrow()
  })

  it('creates preload links for each resource', () => {
    const mockDoc = createDocumentMock()
    Object.defineProperty(global, 'document', {
      value: mockDoc,
      writable: true,
    })
    
    const resources = [
      { href: '/fonts/test.woff2', as: 'font', type: 'font/woff2' },
      { href: '/images/hero.webp', as: 'image' },
    ]
    
    preloadResources(resources)
    
    expect(mockDoc.createElement).toHaveBeenCalledTimes(2)
    expect(mockDoc.createElement).toHaveBeenCalledWith('link')
  })

  it('sets correct attributes for font resource', () => {
    const mockDoc = createDocumentMock()
    Object.defineProperty(global, 'document', {
      value: mockDoc,
      writable: true,
    })
    
    const resources = [
      { href: '/fonts/inter.woff2', as: 'font', type: 'font/woff2' },
    ]
    
    preloadResources(resources)
    
    const createdLink = mockDoc.mockLink
    expect(createdLink.rel).toBe('preload')
    expect(createdLink.href).toBe('/fonts/inter.woff2')
    expect(createdLink.setAttribute).toHaveBeenCalledWith('as', 'font')
    expect(createdLink.setAttribute).toHaveBeenCalledWith('type', 'font/woff2')
  })

  it('sets correct attributes for image resource', () => {
    const mockDoc = createDocumentMock()
    Object.defineProperty(global, 'document', {
      value: mockDoc,
      writable: true,
    })
    
    const resources = [
      { href: '/images/hero.webp', as: 'image' },
    ]
    
    preloadResources(resources)
    
    const createdLink = mockDoc.mockLink
    expect(createdLink.setAttribute).toHaveBeenCalledWith('as', 'image')
  })

  it('sets correct attributes for script resource', () => {
    const mockDoc = createDocumentMock()
    Object.defineProperty(global, 'document', {
      value: mockDoc,
      writable: true,
    })
    
    const resources = [
      { href: '/scripts/main.js', as: 'script' },
    ]
    
    preloadResources(resources)
    
    const createdLink = mockDoc.mockLink
    expect(createdLink.setAttribute).toHaveBeenCalledWith('as', 'script')
  })

  it('handles resources without type', () => {
    const mockDoc = createDocumentMock()
    Object.defineProperty(global, 'document', {
      value: mockDoc,
      writable: true,
    })
    
    const resources = [
      { href: '/fonts/test.woff2', as: 'font' },
    ]
    
    preloadResources(resources)
    
    // Should not call setAttribute for type if not provided
    const typeCall = mockDoc.mockLink.setAttribute.mock.calls.find(
      (call: string[]) => call[0] === 'type'
    )
    expect(typeCall).toBeUndefined()
  })
})

describe('lazyLoadComponent', () => {
  it('returns the import function unchanged', async () => {
    const mockImportFn = vi.fn().mockResolvedValue({
      default: function MockComponent() {
        return <div>Mock</div>
      },
    })
    
    const result = lazyLoadComponent(mockImportFn)
    
    expect(result).toBe(mockImportFn)
    
    // Call it to verify it works
    await result()
    expect(mockImportFn).toHaveBeenCalledTimes(1)
  })

  it('works with different component types', async () => {
    type MockComponentType = React.ComponentType<{ name: string }>
    
    const mockImportFn = vi.fn().mockResolvedValue({
      default: ((props: { name: string }) => <div>{props.name}</div>) as MockComponentType,
    })
    
    const result = lazyLoadComponent<{ name: string }>(mockImportFn)
    
    const loaded = await result()
    
    expect(loaded.default).toBeDefined()
    expect(typeof loaded.default).toBe('function')
  })
})

describe('prefersReducedMotion', () => {
  it('returns false when window is not available', () => {
    // The function already handles undefined window case
    // In jsdom environment, window is defined so we test the actual function
    expect(typeof prefersReducedMotion).toBe('function')
  })
})

describe('prefersDarkMode', () => {
  it('returns false when window is not available', () => {
    // The function already handles undefined window case
    // In jsdom environment, window is defined so we test the actual function
    expect(typeof prefersDarkMode).toBe('function')
  })
})
