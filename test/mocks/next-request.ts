/**
 * NextRequest Mock Helper
 *
 * Creates properly mocked NextRequest objects for testing API routes.
 */

import { NextRequest } from 'next/server'
import { URL } from 'url'

interface MockRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  headers?: Record<string, string>
  body?: Record<string, unknown> | unknown[] | string | null
  cookies?: Record<string, string>
}

/**
 * Create a mock NextRequest object for testing
 *
 * @param url - The request URL
 * @param options - Additional request options
 * @returns A NextRequest-like mock object
 */
export function createMockNextRequest(url: string, options: MockRequestOptions = {}): NextRequest {
  const parsedUrl = new URL(url, 'http://localhost')

  const request: Record<string, unknown> = {
    url,
    nextUrl: {
      pathname: parsedUrl.pathname,
      search: parsedUrl.search,
      searchParams: parsedUrl.searchParams,
      href: url,
      origin: parsedUrl.origin,
      protocol: parsedUrl.protocol,
      host: parsedUrl.host,
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      hash: parsedUrl.hash,
    },
    method: options.method || 'GET',
    headers: new Headers(options.headers || {}),
    json: async () => options.body,
    text: async () => JSON.stringify(options.body),
    body: options.body ? JSON.stringify(options.body) : null,
    clone: () => createMockNextRequest(url, options),
  }

  // Add cookies mock
  if (options.cookies) {
    ;(request as Record<string, unknown>).cookies = {
      get: (name: string) => ({ value: options.cookies![name] }),
      set: vi.fn(),
      delete: vi.fn(),
      entries: vi.fn(() => Object.entries(options.cookies!)),
      forEach: vi.fn(),
    }
  }

  return request as unknown as NextRequest
}

/**
 * Create a mock NextRequest from search params
 */
export function createRequestWithParams(
  pathname: string,
  params: Record<string, string | string[]> = {},
  options: MockRequestOptions = {}
): NextRequest {
  const url = new URL(pathname, 'http://localhost')
  Object.entries(params).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach(v => url.searchParams.append(key, v))
    } else {
      url.searchParams.set(key, value)
    }
  })

  return createMockNextRequest(url.toString(), options)
}
