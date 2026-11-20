/**
 * Test Mocks - Unified Export
 * @description Shared mock objects for testing, exported from a single entry point
 */

// Socket mocks (Socket.io style)
export {
  createMockSocket,
  triggerSocketEvent,
  getEmittedEvents,
  clearEmittedEvents,
  createMockSocketIO,
  mockIO,
  createWebRTCTestSocket,
  triggerWebRTCEvent,
  createMockParticipants,
  verifyEventEmitted,
  countEventEmitted,
  type MockSocket,
  type WebRTCMeetingEvents,
  DEFAULT_WEBRTC_SOCKET_OPTIONS,
} from './socket-mock'

// Auth mocks
export {
  createMockUser,
  createMockToken,
  createMockAuthContextValue,
  createMockAuthService,
  createMockSession,
  checkMockPermission,
  checkMockRole,
  createMockUsers,
  createMockAuthError,
  createMockAuthState,
  DEFAULT_MOCK_USER,
  MOCK_ADMIN_USER,
  MOCK_GUEST_USER,
  DEFAULT_MOCK_TOKEN,
  AUTH_ERRORS,
  type MockUser,
  type MockUserToken,
  type MockAuthContextValue,
  type MockAuthService,
  type MockSession,
} from './auth-mock'

// Fetch mocks
export {
  createMockResponse,
  createMockFetch,
  setupGlobalFetch,
  restoreGlobalFetch,
  setupCommonApiMocks,
  verifyFetchRequest,
  getLastFetchRequest,
  createMockErrorResponse,
  createJsonApiResponse,
  setupDelayedFetch,
  delay,
  mockFetch,
  MOCK_API_RESPONSES,
  HTTP_ERRORS,
  type MockResponseOptions,
  type MockFetchRequest,
  type MockResponseData,
  type MockFetchImplementation,
  type JsonResponseOptions,
} from './fetch-mock'

// Database mocks
export {
  createMockDatabase,
  createMockStatement,
  getMockDatabase,
  resetMockDatabase,
  setupMockDatabase,
  clearMockDatabase,
  mockTableData,
  mockAuthData,
  mockTokenData,
  mockPerformanceAnalyzer,
  mockDatabaseError,
  createDatabaseModuleMock,
  defaultMockDb,
  mockDbModule,
  type MockDatabaseResult,
  type MockDatabaseStatement,
  type MockDatabaseConnection,
} from './db'

// Axios mocks
export {
  createAxiosResponse,
  createAxiosError,
  createMockAxios,
  createDefaultAxiosMock,
  mockAxiosCreate,
  DEFAULT_AXIOS_RESPONSES,
  type MockAxiosResponse,
  type MockAxiosError,
  type MockAxiosInstance,
} from './axios'
