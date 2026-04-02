/**
 * Axios Mock for Testing
 * @description Provides mock implementations for axios HTTP client
 */

import { vi, type MockedFunction } from "vitest";

/**
 * Mock axios response
 */
export interface MockAxiosResponse<T = unknown> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  config: Record<string, unknown>;
}

/**
 * Mock axios error
 */
export interface MockAxiosError {
  message: string;
  code?: string;
  response?: MockAxiosResponse;
  isAxiosError: boolean;
  config: Record<string, unknown>;
}

/**
 * Create a mock axios response
 */
export function createAxiosResponse<T = unknown>(
  data: T,
  options: {
    status?: number;
    statusText?: string;
    headers?: Record<string, string>;
  } = {},
): MockAxiosResponse<T> {
  return {
    data,
    status: options.status ?? 200,
    statusText: options.statusText ?? "OK",
    headers: options.headers ?? { "content-type": "application/json" },
    config: {},
  };
}

/**
 * Create a mock axios error
 */
export function createAxiosError(
  message: string,
  options: {
    code?: string;
    response?: MockAxiosResponse;
  } = {},
): MockAxiosError {
  return {
    message,
    code: options.code,
    response: options.response,
    isAxiosError: true,
    config: {},
  };
}

/**
 * Mock axios instance
 */
export interface MockAxiosInstance {
  get: MockedFunction<(url: string, config?: Record<string, unknown>) => Promise<MockAxiosResponse>>;
  post: MockedFunction<(url: string, data?: unknown, config?: Record<string, unknown>) => Promise<MockAxiosResponse>>;
  put: MockedFunction<(url: string, data?: unknown, config?: Record<string, unknown>) => Promise<MockAxiosResponse>>;
  patch: MockedFunction<(url: string, data?: unknown, config?: Record<string, unknown>) => Promise<MockAxiosResponse>>;
  delete: MockedFunction<(url: string, config?: Record<string, unknown>) => Promise<MockAxiosResponse>>;
  request: MockedFunction<(config: Record<string, unknown>) => Promise<MockAxiosResponse>>;
  defaults: Record<string, unknown>;
}

/**
 * Create a mock axios instance
 */
export function createMockAxios(responses: Map<string, MockAxiosResponse> = new Map()): MockAxiosInstance {
  const instance = {
    get: vi.fn(async (url: string) => {
      const response = responses.get(url);
      if (response) return response;
      throw createAxiosError(`Request failed with status code 404`, {
        code: "404",
        response: createAxiosResponse({ error: "Not found" }, { status: 404 }),
      });
    }),
    post: vi.fn(async (url: string, data?: unknown) => {
      const response = responses.get(url);
      if (response) return response;
      return createAxiosResponse({ success: true, data });
    }),
    put: vi.fn(async (url: string, data?: unknown) => {
      const response = responses.get(url);
      if (response) return response;
      return createAxiosResponse({ success: true, data });
    }),
    patch: vi.fn(async (url: string, data?: unknown) => {
      const response = responses.get(url);
      if (response) return response;
      return createAxiosResponse({ success: true, data });
    }),
    delete: vi.fn(async (url: string) => {
      const response = responses.get(url);
      if (response) return response;
      return createAxiosResponse({ success: true });
    }),
    request: vi.fn(async (config: Record<string, unknown>) => {
      const url = config.url as string;
      const response = responses.get(url);
      if (response) return response;
      return createAxiosResponse({});
    }),
    defaults: {
      baseURL: "http://localhost:3000",
      timeout: 5000,
      headers: {},
    },
  };

  return instance as unknown as MockAxiosInstance;
}

/**
 * Default mock responses for common API endpoints
 */
export const DEFAULT_AXIOS_RESPONSES = new Map<string, MockAxiosResponse>([
  ["/api/health", createAxiosResponse({ status: "ok", timestamp: new Date().toISOString() })],
  ["/api/user", createAxiosResponse({ id: "user-1", email: "test@example.com", name: "Test User" })],
]);

/**
 * Create axios mock with default responses
 */
export function createDefaultAxiosMock(): MockAxiosInstance {
  return createMockAxios(DEFAULT_AXIOS_RESPONSES);
}

/**
 * Mock axios create factory
 */
export function mockAxiosCreate(
  responses?: Map<string, MockAxiosResponse>,
): MockedFunction<(defaults?: Record<string, unknown>) => MockAxiosInstance> {
  return vi.fn((defaults?: Record<string, unknown>) => {
    const mock = createMockAxios(responses);
    mock.defaults = { ...mock.defaults, ...defaults };
    return mock;
  });
}
