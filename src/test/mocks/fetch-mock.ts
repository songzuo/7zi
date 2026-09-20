/**
 * Fetch API Mock for Testing
 * @description Provides mock implementations for the global fetch API
 */

import { vi, type MockedFunction } from 'vitest'

/**
 * Mock response options
 */
export interface MockResponseOptions {
  status?: number
  statusText?: string
  headers?: Record<string, string>
  delay?: number // Simulate network delay in ms
}

/**
 * Mock fetch request info
 */
export interface MockFetchRequest {
  url: string
  method: string
  headers: Headers
  body: string | null
  credentials: RequestCredentials
}

/**
 * Mock response data
 */
export type MockResponseData = string | Record<string, unknown> | unknown[]

/**
 * Create a mock Response object
 */
export function createMockResponse(
  data: MockResponseData,
  options: MockResponseOptions = {}
): Response {
  const { status = 200, statusText = 'OK', headers = {}, delay = 0 } = options

  // Create headers
  const responseHeaders = new Headers()
  if (typeof data === 'object' && data !== null) {
    responseHeaders.set('content-type', 'application/json')
  }
  Object.entries(headers).forEach(([key, value]) => {
    responseHeaders.set(key, value)
  })

  // Create body
  const body = typeof data === 'string' ? data : JSON.stringify(data) || null

  // Create base response
  const response = {
    ok: status >= 200 && status < 300,
    status,
    statusText,
    headers: responseHeaders,
    body: body
      ? new ReadableStream({
          async start(controller) {
            if (delay > 0) {
              await new Promise(resolve => setTimeout(resolve, delay))
            }
            controller.enqueue(new TextEncoder().encode(body))
            controller.close()
          },
        })
      : null,
    url: 'http://localhost:3000',
    type: 'basic' as ResponseType,
    redirected: false,
    clone() {
      return createMockResponse(data, options)
    },
    async text() {
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay))
      }
      return typeof data === 'string' ? data : JSON.stringify(data)
    },
    async json() {
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay))
      }
      return typeof data === 'object' ? data : JSON.parse(data)
    },
    async arrayBuffer() {
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay))
      }
      return new TextEncoder().encode(typeof data === 'string' ? data : JSON.stringify(data)).buffer
    },
    async blob() {
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay))
      }
      return new Blob([typeof data === 'string' ? data : JSON.stringify(data)])
    },
  } as unknown as Response

  return response
}

/**
 * Mock fetch implementation
 */
export interface MockFetchImplementation {
  (input: RequestInfo | URL, init?: RequestInit | undefined): Promise<Response>
  __mockedCalls: MockFetchRequest[]
  __mockResponses: Map<string, MockResponseData>
  __responseCallbacks: Map<
    string,
    (req: MockFetchRequest) => MockResponseData | Promise<MockResponseData>
  >
  __clearCalls(): void
  __clearResponses(): void
  __mockResponse(url: string, data: MockResponseData): void
  __mockResponseCallback(
    url: string,
    callback: (req: MockFetchRequest) => MockResponseData | Promise<MockResponseData>
  ): void
  __getMockedCall(url: string): MockFetchRequest | undefined
  __getMockedCalls(): MockFetchRequest[]
}

/**
 * Parse request input to URL string
 */
function parseRequestInput(input: RequestInfo | URL): string {
  if (input instanceof URL) {
    return input.toString()
  }
  if (typeof input === 'string') {
    // Handle relative URLs by prepending a base
    if (input.startsWith('/')) {
      return `http://localhost:3000${input}`
    }
    return input
  }
  return input.url
}

/**
 * Create a mock fetch function
 */
export function createMockFetch(): MockFetchImplementation {
  const mockedCalls: MockFetchRequest[] = []
  const mockResponses = new Map<string, MockResponseData>()
  const responseCallbacks = new Map<
    string,
    (req: MockFetchRequest) => MockResponseData | Promise<MockResponseData>
  >()

  const mockFetch: MockFetchImplementation = async (
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> => {
    // Parse request
    const urlStr = parseRequestInput(input)
    const url = new URL(urlStr)
    const method = init?.method || 'GET'
    const headers = new Headers(init?.headers)
    const body = init?.body ? init.body.toString() : null
    const credentials = init?.credentials || 'same-origin'

    // Store call for verification
    const request: MockFetchRequest = {
      url: urlStr,
      method,
      headers,
      body,
      credentials,
    }
    mockedCalls.push(request)

    // Check for callback response
    const callback = responseCallbacks.get(url.pathname) || responseCallbacks.get(urlStr)
    if (callback) {
      try {
        const data = await callback(request)
        return createMockResponse(data)
      } catch (error) {
        return createMockResponse(
          { error: error instanceof Error ? error.message : 'Unknown error' },
          { status: 500 }
        )
      }
    }

    // Check for static mock response
    const mockData = mockResponses.get(url.pathname) || mockResponses.get(urlStr)
    if (mockData !== undefined) {
      return createMockResponse(mockData)
    }

    // Return 404 for unknown routes
    return createMockResponse({ error: 'Not found' }, { status: 404 })
  }

  // Internal methods
  mockFetch.__mockedCalls = mockedCalls
  mockFetch.__mockResponses = mockResponses
  mockFetch.__responseCallbacks = responseCallbacks

  mockFetch.__clearCalls = () => {
    mockedCalls.length = 0
  }

  mockFetch.__clearResponses = () => {
    mockResponses.clear()
    responseCallbacks.clear()
  }

  mockFetch.__mockResponse = (url: string, data: MockResponseData) => {
    mockResponses.set(url, data)
  }

  mockFetch.__mockResponseCallback = (
    url: string,
    callback: (req: MockFetchRequest) => MockResponseData | Promise<MockResponseData>
  ) => {
    responseCallbacks.set(url, callback)
  }

  mockFetch.__getMockedCall = (url: string) => {
    return mockedCalls.find(call => call.url === url)
  }

  mockFetch.__getMockedCalls = () => {
    return [...mockedCalls]
  }

  return mockFetch
}

/**
 * Global mock fetch instance
 */
export const mockFetch = createMockFetch()

/**
 * Setup global fetch mock
 */
export function setupGlobalFetch(mockFn?: MockFetchImplementation): void {
  const fetchMock = mockFn || mockFetch
  global.fetch = fetchMock as unknown as typeof fetch
}

/**
 * Restore original fetch
 */
export function restoreGlobalFetch(): void {
  // Note: This won't work perfectly in all test environments
  // It's better to use vi.unstubAllGlobals() after setupGlobalFetch()
  delete (global as any).fetch
}

/**
 * Mock common API responses
 */
export const MOCK_API_RESPONSES = {
  // Success responses
  SUCCESS: { success: true, message: 'Operation successful' },
  NOT_FOUND: { error: 'Resource not found' },
  UNAUTHORIZED: { error: 'Unauthorized' },
  FORBIDDEN: { error: 'Forbidden' },
  SERVER_ERROR: { error: 'Internal server error' },

  // Common data structures
  EMPTY_ARRAY: [],
  EMPTY_OBJECT: {},

  // Pagination
  PAGINATION: (page: number, perPage: number, total: number) => ({
    data: Array.from({ length: perPage }, (_, i) => ({
      id: `item-${page}-${i}`,
    })),
    pagination: {
      page,
      perPage,
      total,
      totalPages: Math.ceil(total / perPage),
    },
  }),

  // User responses
  USER: (id: string = 'user-123') => ({
    id,
    email: 'test@example.com',
    name: 'Test User',
  }),

  // Error response
  ERROR: (message: string, code?: number) => ({
    error: message,
    code,
  }),
} as const

/**
 * Mock common API endpoints
 */
export function setupCommonApiMocks(mockFn: MockFetchImplementation = mockFetch): void {
  // Health check
  mockFn.__mockResponse('/api/health', {
    status: 'healthy',
    timestamp: new Date().toISOString(),
  })

  // User profile
  mockFn.__mockResponse('/api/user/profile', MOCK_API_RESPONSES.USER())

  // 404 for unknown routes - use wildcard pattern
  mockFn.__mockResponseCallback('*', (req: MockFetchRequest) => {
    if (!mockFn.__mockResponses.has(req.url) && !mockFn.__responseCallbacks.has(req.url)) {
      return MOCK_API_RESPONSES.NOT_FOUND
    }
    return { success: true }
  })
}

/**
 * Verify fetch was called with specific parameters
 */
export function verifyFetchRequest(
  mockFn: MockFetchImplementation,
  url: string,
  method: string = 'GET',
  body?: Record<string, unknown>
): boolean {
  const calls = mockFn.__getMockedCalls()
  return calls.some(
    call =>
      call.url === url &&
      call.method === method &&
      (body === undefined || JSON.parse(call.body || '{}') === body)
  )
}

/**
 * Get the last fetch request
 */
export function getLastFetchRequest(mockFn: MockFetchImplementation): MockFetchRequest | undefined {
  const calls = mockFn.__getMockedCalls()
  return calls.length > 0 ? calls[calls.length - 1] : undefined
}

/**
 * Mock HTTP errors
 */
export const HTTP_ERRORS = {
  BAD_REQUEST: { status: 400, statusText: 'Bad Request' },
  UNAUTHORIZED: { status: 401, statusText: 'Unauthorized' },
  FORBIDDEN: { status: 403, statusText: 'Forbidden' },
  NOT_FOUND: { status: 404, statusText: 'Not Found' },
  METHOD_NOT_ALLOWED: { status: 405, statusText: 'Method Not Allowed' },
  CONFLICT: { status: 409, statusText: 'Conflict' },
  UNPROCESSABLE_ENTITY: { status: 422, statusText: 'Unprocessable Entity' },
  INTERNAL_SERVER_ERROR: { status: 500, statusText: 'Internal Server Error' },
  SERVICE_UNAVAILABLE: { status: 503, statusText: 'Service Unavailable' },
} as const

/**
 * Create a mock error response
 */
export function createMockErrorResponse(
  error: keyof typeof HTTP_ERRORS,
  message?: string
): Response {
  const errorData = HTTP_ERRORS[error]
  return createMockResponse({ error: message || errorData.statusText }, errorData)
}

/**
 * Mock JSON API responses
 */
export interface JsonResponseOptions extends MockResponseOptions {
  data: MockResponseData
}

/**
 * Create a JSON API response (Next.js style)
 */
export function createJsonApiResponse(options: JsonResponseOptions): Response {
  const { data, ...responseOptions } = options
  return createMockResponse(
    {
      success: responseOptions.status ? responseOptions.status < 300 : true,
      data,
      timestamp: new Date().toISOString(),
    },
    responseOptions
  )
}

/**
 * Delay helper for simulating network latency
 */
export async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Setup fetch mock with delayed responses
 */
export function setupDelayedFetch(delayMs: number): MockFetchImplementation {
  const fetchMock = createMockFetch()

  // Override response creation to add delay
  const originalCreate = createMockResponse
  const createWithDelay = (data: MockResponseData, options: MockResponseOptions = {}): Response => {
    return originalCreate(data, { ...options, delay: delayMs })
  }

  return fetchMock
}
