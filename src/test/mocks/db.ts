/**
 * Database Mock for Testing
 * @description Provides mock implementations for SQLite database operations
 * Consolidates mock patterns from vi-mocks.ts and setup-db-mock.ts
 */

import { vi, type MockedFunction } from 'vitest'

/**
 * Database result type
 */
export interface MockDatabaseResult {
  changes: number
  lastInsertRowid?: number | bigint
}

/**
 * Database statement mock interface
 */
export interface MockDatabaseStatement {
  all: MockedFunction<() => unknown[]>
  get: MockedFunction<() => Record<string, unknown> | null>
  run: MockedFunction<() => MockDatabaseResult>
}

/**
 * Database connection mock interface
 */
export interface MockDatabaseConnection {
  query: MockedFunction<(sql: string, params?: unknown[]) => unknown[]>
  queryRows: MockedFunction<(sql: string, params?: unknown[]) => unknown[]>
  exec: MockedFunction<(sql: string, params?: unknown[]) => MockDatabaseResult>
  prepare: MockedFunction<(sql: string) => MockDatabaseStatement>
  pragma: MockedFunction<(pragma: string) => unknown>
  batch: MockedFunction<(statements: string[]) => MockDatabaseResult[]>
  close: MockedFunction<() => void>
}

/**
 * Create a mock statement
 */
export function createMockStatement(
  mockAll: unknown[] = [],
  mockGet: Record<string, unknown> | null = null,
  mockRun: MockDatabaseResult = { changes: 1 }
): MockDatabaseStatement {
  return {
    all: vi.fn().mockReturnValue(mockAll),
    get: vi.fn().mockReturnValue(mockGet),
    run: vi.fn().mockReturnValue(mockRun),
  }
}

/**
 * Create a mock database connection
 */
export function createMockDatabase(): MockDatabaseConnection {
  return {
    query: vi.fn().mockReturnValue([]),
    queryRows: vi.fn().mockReturnValue([]),
    exec: vi.fn().mockImplementation((sql: string, _params?: unknown[]) => {
      // Handle multi-statement SQL (like schema initialization)
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'))

      if (statements.some(s => s.match(/CREATE\s+(TABLE|INDEX)/i))) {
        return { changes: statements.length, lastInsertRowid: 1 }
      }

      return { changes: 1, lastInsertRowid: 1 }
    }),
    prepare: vi.fn((sql: string) => {
      return createMockStatement([], null, { changes: 1 })
    }),
    pragma: vi.fn().mockReturnValue(undefined),
    batch: vi.fn().mockReturnValue([{ changes: 1 }]),
    close: vi.fn(),
  }
}

/**
 * Global mock database instance
 */
let mockDbInstance: MockDatabaseConnection | null = null

/**
 * Get or create the mock database instance
 */
export function getMockDatabase(): MockDatabaseConnection {
  if (!mockDbInstance) {
    mockDbInstance = createMockDatabase()
  }
  return mockDbInstance
}

/**
 * Reset the mock database
 */
export function resetMockDatabase(): void {
  mockDbInstance = createMockDatabase()
}

/**
 * Setup mock database for a test file
 * Returns the mock database instance and resets it
 */
export function setupMockDatabase(): MockDatabaseConnection {
  mockDbInstance = createMockDatabase()
  return mockDbInstance
}

/**
 * Clear the mock database instance
 */
export function clearMockDatabase(): void {
  mockDbInstance = null
}

/**
 * Set mock data for a specific table query
 */
export function mockTableData(
  db: MockDatabaseConnection,
  tableName: string,
  data: Record<string, unknown>[]
): void {
  db.prepare = vi.fn((sql: string) => {
    if (sql.toLowerCase().includes('select')) {
      return createMockStatement(data)
    }
    if (sql.toLowerCase().includes('insert')) {
      return createMockStatement([], null, {
        changes: 1,
        lastInsertRowid: data.length + 1,
      })
    }
    if (sql.toLowerCase().includes('update') || sql.toLowerCase().includes('delete')) {
      return createMockStatement([], null, { changes: 1 })
    }
    return createMockStatement()
  })
}

/**
 * Mock user authentication data
 */
export function mockAuthData(db: MockDatabaseConnection): {
  id: string
  email: string
  password: string
  name: string
  role: string
  status: string
  permissions: string[]
  metadata: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
} {
  const mockUser = {
    id: 'user_123',
    email: 'test@example.com',
    password: 'hashed_password_here',
    name: 'Test User',
    role: 'member',
    status: 'active',
    permissions: ['read:profile', 'read:tasks'],
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  db.prepare = vi.fn((sql: string) => {
    if (sql.includes('SELECT') && sql.includes('email')) {
      return createMockStatement([mockUser], mockUser)
    }
    if (sql.includes('SELECT') && sql.includes('id')) {
      return createMockStatement([mockUser], mockUser)
    }
    if (sql.includes('INSERT')) {
      return createMockStatement([], null, { changes: 1, lastInsertRowid: 1 })
    }
    if (sql.includes('UPDATE') || sql.includes('DELETE')) {
      return createMockStatement([], null, { changes: 1 })
    }
    return createMockStatement()
  })

  return mockUser
}

/**
 * Mock token operations
 */
export function mockTokenData(db: MockDatabaseConnection): {
  id: string
  userId: string
  token: string
  refreshToken: string
  expiresAt: Date
  refreshExpiresAt: Date
  createdAt: Date
} {
  const mockToken = {
    id: 'token_123',
    userId: 'user_123',
    token: 'access_token_here',
    refreshToken: 'refresh_token_here',
    expiresAt: new Date(Date.now() + 3600000),
    refreshExpiresAt: new Date(Date.now() + 7200000),
    createdAt: new Date(),
  }

  db.prepare = vi.fn((sql: string) => {
    if (sql.includes('SELECT') && sql.includes('token')) {
      return createMockStatement([mockToken], mockToken)
    }
    if (sql.includes('INSERT')) {
      return createMockStatement([], null, { changes: 1, lastInsertRowid: 1 })
    }
    if (sql.includes('DELETE')) {
      return createMockStatement([], null, { changes: 1 })
    }
    return createMockStatement()
  })

  return mockToken
}

/**
 * Mock performance analyzer queries
 */
export function mockPerformanceAnalyzer(db: MockDatabaseConnection): void {
  const mockTables = [{ name: 'agents' }, { name: 'agent_tokens' }, { name: 'agent_data_access' }]

  db.prepare = vi.fn((sql: string) => {
    if (sql.includes('sqlite_master')) {
      return createMockStatement(mockTables)
    }
    if (sql.includes('COUNT(*)')) {
      return createMockStatement([], { count: 100 })
    }
    if (sql.includes('EXPLAIN QUERY PLAN')) {
      return createMockStatement([{ detail: 'USING INDEX idx_agents_status' }])
    }
    return createMockStatement()
  })
}

/**
 * Mock error scenarios
 */
export function mockDatabaseError(db: MockDatabaseConnection, errorMessage: string): void {
  db.prepare = vi.fn(() => ({
    all: vi.fn(() => {
      throw new Error(errorMessage)
    }),
    get: vi.fn(() => {
      throw new Error(errorMessage)
    }),
    run: vi.fn(() => {
      throw new Error(errorMessage)
    }),
  }))
}

/**
 * Create mock vi.mock() implementation for database module
 * Use this for vi.mock() calls in test setup
 */
export function createDatabaseModuleMock() {
  const db = createMockDatabase()
  return {
    getDatabaseAsync: vi.fn().mockResolvedValue(db),
    getDatabase: vi.fn().mockReturnValue(db),
    initializeDatabase: vi.fn().mockReturnValue(db),
    closeDatabase: vi.fn(),
    migrate: vi.fn(),
    optimizeDatabase: vi.fn(),
    getDatabaseHealth: vi.fn().mockResolvedValue({
      ok: true,
      message: 'Database is healthy',
    }),
  }
}

/**
 * Default mock database for quick setup
 */
export const defaultMockDb = createMockDatabase()

/**
 * Mock database module exports for vi.mock()
 */
export const mockDbModule = {
  getDatabaseAsync: vi.fn().mockResolvedValue(defaultMockDb),
  getDatabase: vi.fn().mockReturnValue(defaultMockDb),
  initializeDatabase: vi.fn().mockReturnValue(defaultMockDb),
  closeDatabase: vi.fn(),
  migrate: vi.fn(),
  optimizeDatabase: vi.fn(),
  getDatabaseHealth: vi.fn().mockResolvedValue({
    ok: true,
    message: 'Database is healthy',
  }),
}
