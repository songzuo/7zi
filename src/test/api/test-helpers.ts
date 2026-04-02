/**
 * API Route Test Helper Utilities
 * Provides common utilities for testing Next.js API routes
 */

import { NextRequest } from 'next/server'

/**
 * Create a mock NextRequest object
 */
export function mockRequest(
  body: unknown = {},
  options: {
    method?: string
    headers?: Record<string, string>
    query?: Record<string, string>
  } = {}
): NextRequest {
  const { method = 'GET', headers = {}, query = {} } = options

  const url = new URL('http://localhost:3000/api/test')
  Object.entries(query).forEach(([key, value]) => {
    url.searchParams.set(key, value)
  })

  const requestHeaders = new Headers()
  Object.entries(headers).forEach(([key, value]) => {
    requestHeaders.set(key, value)
  })

  return {
    method,
    url: url.toString(),
    headers: requestHeaders,
    json: async () => body as Record<string, unknown>,
    text: async () => JSON.stringify(body),
    nextUrl: {
      pathname: '/api/test',
      href: url.href,
      origin: url.origin,
      searchParams: url.searchParams,
    },
  } as unknown as NextRequest
}

/**
 * Create a mock FormData request
 */
export function mockFormDataRequest(formData: Record<string, string | File>): NextRequest {
  const formDataObj = new FormData()
  Object.entries(formData).forEach(([key, value]) => {
    formDataObj.append(key, value)
  })

  return {
    method: 'POST',
    url: 'http://localhost:3000/api/test',
    headers: new Headers(),
    formData: async () => formDataObj,
  } as unknown as NextRequest
}

/**
 * Parse JSON response
 */
export async function parseJsonResponse(response: Response) {
  return response.json() as Promise<Record<string, unknown>>
}

/**
 * Helper to test API response format
 */
export function expectSuccessResponse(data: Record<string, unknown>): void {
  expect(data).toHaveProperty('success', true)
  expect(data).toHaveProperty('data')
}

/**
 * Helper to test error response format
 */
export function expectErrorResponse(data: Record<string, unknown>): void {
  expect(data).toHaveProperty('success', false)
  expect(data).toHaveProperty('error')
  expect(data.error).toHaveProperty('code')
  expect(data.error).toHaveProperty('message')
}

/**
 * Helper to test validation error
 */
export function expectValidationError(data: Record<string, unknown>, message?: string): void {
  expectErrorResponse(data)
  expect(data.error).toHaveProperty('code', 'VALIDATION_ERROR')
  if (message) {
    expect(data.error).toHaveProperty('message', message)
  }
}

/**
 * Helper to test authentication error
 */
export function expectAuthError(data: Record<string, unknown>, message?: string): void {
  expectErrorResponse(data)
  expect(data.error).toHaveProperty('code', 'AUTH_FAILED')
  if (message) {
    expect(data.error).toHaveProperty('message', message)
  }
}

/**
 * Helper to test not found error
 */
export function expectNotFoundError(data: Record<string, unknown>, message?: string): void {
  expectErrorResponse(data)
  expect(data.error).toHaveProperty('code', 'NOT_FOUND')
  if (message) {
    expect(data.error).toHaveProperty('message', message)
  }
}

/**
 * Helper to test rate limit error
 */
export function expectRateLimitError(data: Record<string, unknown>): void {
  expectErrorResponse(data)
  expect(data.error).toHaveProperty('code', 'RATE_LIMIT_EXCEEDED')
}

/**
 * Helper to test unauthorized error
 */
export function expectUnauthorizedError(data: Record<string, unknown>, message?: string): void {
  expectErrorResponse(data)
  expect(data.error).toHaveProperty('code', 'UNAUTHORIZED')
  if (message) {
    expect(data.error).toHaveProperty('message', message)
  }
}

/**
 * Helper to test forbidden error
 */
export function expectForbiddenError(data: Record<string, unknown>, message?: string): void {
  expectErrorResponse(data)
  expect(data.error).toHaveProperty('code', 'FORBIDDEN')
  if (message) {
    expect(data.error).toHaveProperty('message', message)
  }
}

/**
 * Helper to test internal error
 */
export function expectInternalError(data: Record<string, unknown>): void {
  expectErrorResponse(data)
  expect(data.error).toHaveProperty('code', 'INTERNAL_ERROR')
}

/**
 * Create mock authenticated request
 */
export function mockAuthRequest(
  body: unknown = {},
  userId: string = 'test-user-id',
  options: {
    headers?: Record<string, string>
  } = {}
): NextRequest {
  return mockRequest(body, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer mock-token-for-${userId}`,
      'x-user-id': userId,
    },
  })
}

/**
 * Create mock admin request
 */
export function mockAdminRequest(
  body: unknown = {},
  options: {
    headers?: Record<string, string>
  } = {}
): NextRequest {
  return mockAuthRequest(body, 'admin-user-id', {
    ...options,
    headers: {
      ...options.headers,
      'x-user-role': 'admin',
    },
  })
}

/**
 * Test async handler error handling
 */
export async function testHandlerErrors(
  handler: (req: NextRequest) => Promise<Response>,
  testCases: Array<{
    name: string
    request: NextRequest
    expectedStatus: number
    expectedError?: {
      code: string
      message?: string
    }
  }>
): Promise<void> {
  for (const testCase of testCases) {
    const response = await handler(testCase.request)
    expect(response.status).toBe(testCase.expectedStatus)

    if (testCase.expectedError) {
      const data = await parseJsonResponse(response)
      expectErrorResponse(data)
      expect((data.error as { code: string })?.code).toBe(testCase.expectedError.code)

      if (testCase.expectedError.message) {
        expect((data.error as { message?: string })?.message).toBe(testCase.expectedError.message)
      }
    }
  }
}
