/**
 * Mock Helpers for API Route Testing
 * @description Provides reusable mock objects for Next.js API route testing
 */

import { vi } from 'vitest'
import { NextRequest } from 'next/server'

/**
 * Create a mock NextRequest object with proper Next.js properties
 */
export function createMockRequest(
  url: string = 'http://localhost:3000/api',
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
    headers?: Record<string, string>
    body?: unknown
    cookies?: Record<string, string>
  } = {}
): NextRequest {
  const urlObj = new URL(url)

  // Build headers
  const headers = new Headers()
  if (options.headers) {
    Object.entries(options.headers).forEach(([key, value]) => {
      headers.set(key, value)
    })
  }

  // Build body as string for the Request
  let body: string | undefined = undefined
  if (options.body) {
    body = JSON.stringify(options.body)
    if (!headers.has('content-type')) {
      headers.set('content-type', 'application/json')
    }
  }

  // Create Request with all required properties
  const request = new Request(urlObj, {
    method: options.method || 'GET',
    headers,
    body,
  })

  // Create mock cookie store
  const mockCookieStore = {
    get: vi.fn((name: string) => {
      if (options.cookies && name in options.cookies) {
        return { name, value: options.cookies![name] }
      }
      return undefined
    }),
    set: vi.fn(),
    delete: vi.fn(),
    getAll: vi.fn(() => {
      return options.cookies
        ? Object.entries(options.cookies).map(([name, value]) => ({ name, value }))
        : []
    }),
    has: vi.fn((name: string) => (options.cookies ? name in options.cookies : false)),
    clear: vi.fn(),
  }

  // Cast to NextRequest to bypass strict type checks, then add Next.js properties
  const nextRequest = request as NextRequest & {
    cookies?: typeof mockCookieStore
    nextUrl?: typeof urlObj
    page?: { name: string; params: Record<string, string> }
    ua?: string
  }

  // Add Next.js specific properties using defineProperty to bypass read-only
  Object.defineProperty(nextRequest, 'cookies', {
    value: mockCookieStore,
    writable: false,
    configurable: true,
  })
  Object.defineProperty(nextRequest, 'nextUrl', {
    value: urlObj,
    writable: false,
    configurable: true,
  })
  Object.defineProperty(nextRequest, 'page', {
    value: { name: 'test', params: {} },
    writable: false,
    configurable: true,
  })
  Object.defineProperty(nextRequest, 'ua', {
    value: 'MockAgent/1.0',
    writable: false,
    configurable: true,
  })

  return nextRequest as NextRequest
}

/**
 * Mock cookies() from next/headers
 */
export function createMockCookieStore() {
  const store: Record<string, { value: string; options: Record<string, unknown> }> = {}

  return {
    get: vi.fn((name: string) => {
      const cookie = store[name]
      if (cookie) {
        return { name, value: cookie.value }
      }
      return undefined
    }),
    set: vi.fn((name: string, value: string, options: Record<string, unknown> = {}) => {
      store[name] = { value, options }
    }),
    delete: vi.fn((name: string) => {
      delete store[name]
    }),
    getAll: vi.fn(() => {
      return Object.entries(store).map(([name, { value }]) => ({ name, value }))
    }),
    has: vi.fn((name: string) => name in store),
    clear: vi.fn(() => {
      Object.keys(store).forEach(key => delete store[key])
    }),
  }
}

/**
 * Mock response object for testing
 */
export function createMockResponse() {
  let status = 200
  let headers = new Headers()
  let body: unknown = null

  return {
    get status() {
      return status
    },
    set status(value: number) {
      status = value
    },
    get headers() {
      return headers
    },
    setHeaders(newHeaders: Headers) {
      headers = newHeaders
    },
    get body() {
      return body
    },
    setBody(newBody: unknown) {
      body = newBody
    },
    json: vi.fn(() => Promise.resolve(body)),
    text: vi.fn(() => Promise.resolve(JSON.stringify(body))),
    redirect: vi.fn((url: string) => ({
      status: 302,
      headers: new Headers({ location: url }),
    })),
  }
}

/**
 * Common test URL patterns
 */
export const TEST_URLS = {
  STATUS: 'http://localhost:3000/api/status',
  CSRF_TOKEN: 'http://localhost:3000/api/csrf-token',
  HEALTH_LIVE: 'http://localhost:3000/api/health/live',
  API: 'http://localhost:3000/api',
} as const

/**
 * Helper to parse NextResponse.json() responses
 */
export async function parseResponseJson(response: Response): Promise<unknown> {
  return response.json()
}

/**
 * Helper to assert response structure
 */
export function assertSuccessResponse(
  data: unknown
): asserts data is { success: true; data: unknown; timestamp: string } {
  if (typeof data !== 'object' || data === null) {
    throw new Error('Response is not an object')
  }
  if (!('success' in data) || data.success !== true) {
    throw new Error('Response success field is not true')
  }
  if (!('data' in data)) {
    throw new Error('Response is missing data field')
  }
  if (!('timestamp' in data)) {
    throw new Error('Response is missing timestamp field')
  }
}
