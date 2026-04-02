/**
 * Test utilities for Next.js API routes
 * Provides helper functions to create mock NextRequest objects
 */

import { NextRequest } from 'next/server'

/**
 * Create a mock NextRequest for testing
 * This is needed because standard Request objects don't have all NextRequest properties
 */
export function createMockNextRequest(
  url: string,
  options?: {
    method?: string
    headers?: Record<string, string>
    body?: unknown
    cookies?: Record<string, string>
  }
): NextRequest {
  const { method = 'GET', headers = {}, body, cookies = {} } = options || {}

  // Build URL with query parameters if needed
  const requestUrl = new URL(url)

  // Create headers
  const requestHeaders = new Headers()
  Object.entries(headers).forEach(([key, value]) => {
    requestHeaders.set(key, value)
  })

  // Create request body
  let requestBody: string | undefined
  if (body !== undefined) {
    requestBody = typeof body === 'string' ? body : JSON.stringify(body)
    requestHeaders.set('content-type', 'application/json')
  }

  // Create the base Request object
  const baseRequest = new Request(requestUrl.toString(), {
    method,
    headers: requestHeaders,
    body: requestBody,
  })

  // Create a NextRequest by extending the base Request
  // We need to add NextRequest-specific properties
  const nextRequest = Object.assign(baseRequest, {
    // Add NextRequest-specific properties
    nextUrl: requestUrl,

    // Add mock cookies
    cookies: {
      get: (name: string) => ({
        name,
        value: cookies[name] || '',
      }),
      getAll: () =>
        Object.entries(cookies).map(([name, value]) => ({
          name,
          value,
        })),
      has: (name: string) => cookies.hasOwnProperty(name),
      set: () => {
        throw new Error('Cannot set cookies in mock requests')
      },
      delete: () => {
        throw new Error('Cannot delete cookies in mock requests')
      },
    },

    // Add mock user agent
    ua: {
      ua: 'Mozilla/5.0 (Test) TestAgent/1.0',
      browser: { name: 'TestBrowser', version: '1.0' },
      engine: { name: 'TestEngine', version: '1.0' },
      os: { name: 'TestOS', version: '1.0' },
      device: { model: 'TestDevice', type: 'TestDeviceType', vendor: 'TestVendor' },
      cpu: { architecture: 'test' },
      isBot: false,
    },

    // Add mock page-related properties
    page: {
      name: 'test-page',
    },

    // Clone method (required by NextRequest)
    clone: () => createMockNextRequest(url, options),
  }) as unknown as NextRequest

  return nextRequest
}

/**
 * Create a mock GET request
 */
export function createMockGetRequest(url: string): NextRequest {
  return createMockNextRequest(url, { method: 'GET' })
}

/**
 * Create a mock POST request with JSON body
 */
export function createMockPostRequest(url: string, body: unknown): NextRequest {
  return createMockNextRequest(url, {
    method: 'POST',
    body,
  })
}

/**
 * Create a mock PUT request with JSON body
 */
export function createMockPutRequest(url: string, body: unknown): NextRequest {
  return createMockNextRequest(url, {
    method: 'PUT',
    body,
  })
}

/**
 * Create a mock DELETE request
 */
export function createMockDeleteRequest(url: string): NextRequest {
  return createMockNextRequest(url, { method: 'DELETE' })
}
