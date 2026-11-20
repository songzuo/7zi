/**
 * Database Mock Setup for Vitest Tests
 * Provides a fully mocked database for testing without real SQLite
 */

import { vi, beforeEach, afterEach } from 'vitest'
import { DatabaseResult, DatabaseStatement, DatabaseConnection } from '../lib/db/index'

// Mock database instance
let mockDb: DatabaseConnection

// Mock prepare statement
function createMockStatement(
  mockAll: unknown[] = [],
  mockGet: Record<string, unknown> | null = null,
  mockRun: DatabaseResult = { changes: 1 }
): DatabaseStatement {
  return {
    all: vi.fn().mockReturnValue(mockAll),
    get: vi.fn().mockReturnValue(mockGet),
    run: vi.fn().mockReturnValue(mockRun),
  }
}

// Mock transaction
function createMockTransaction() {
  const mockExec = vi.fn()
  return {
    exec: mockExec,
    rollback: vi.fn(),
  }
}

/**
 * Initialize mock database for tests
 */
export function setupMockDatabase() {
  mockDb = {
    query: vi.fn(),
    queryRows: vi.fn().mockReturnValue([]),
    get: vi.fn().mockReturnValue(null),
    exec: vi.fn().mockImplementation((sql: string, _params?: unknown[]) => {
      // Handle multi-statement SQL (like schema initialization)
      // Split by semicolons but ignore semicolons in string literals or comments
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'))

      // For schema initialization, return success
      if (statements.some(s => s.match(/CREATE\s+(TABLE|INDEX)/i))) {
        return { changes: statements.length, lastInsertRowid: 1 }
      }

      return { changes: 1, lastInsertRowid: 1 }
    }),
    prepare: vi.fn((sql: string) => {
      // Default mock statement
      return createMockStatement([], null, { changes: 1 })
    }),
    pragma: vi.fn().mockReturnValue(undefined),
    batch: vi.fn().mockReturnValue([{ changes: 1 }]),
    beginTransaction: vi.fn(),
    commit: vi.fn(),
    rollback: vi.fn(),
    isInTransaction: vi.fn().mockReturnValue(false),
  }

  // Mock the database module
  vi.doMock('../lib/db/index', () => ({
    getDatabaseAsync: vi.fn().mockResolvedValue(mockDb),
    getDatabase: vi.fn().mockReturnValue(mockDb),
    initializeDatabase: vi.fn().mockReturnValue(mockDb),
    closeDatabase: vi.fn(),
    migrate: vi.fn(),
    optimizeDatabase: vi.fn(),
    getDatabaseHealth: vi.fn().mockResolvedValue({
      ok: true,
      message: 'Database is healthy',
    }),
  }))

  return mockDb
}

/**
 * Get the current mock database instance
 */
export function getMockDatabase(): DatabaseConnection {
  return mockDb
}

/**
 * Reset all mock database calls between tests
 */
export function resetMockDatabase() {
  if (!mockDb) {
    setupMockDatabase()
    return
  }

  mockDb.query = vi.fn()
  mockDb.exec = vi.fn().mockImplementation((sql: string, _params?: unknown[]) => {
    // Handle multi-statement SQL
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))

    if (statements.some(s => s.match(/CREATE\s+(TABLE|INDEX)/i))) {
      return { changes: statements.length, lastInsertRowid: 1 }
    }

    return { changes: 1, lastInsertRowid: 1 }
  })
  mockDb.pragma = vi.fn().mockReturnValue(undefined)
  mockDb.batch = vi.fn().mockReturnValue([{ changes: 1 }])

  // Reset prepare to return new mock statements
  mockDb.prepare = vi.fn((sql: string) => {
    return createMockStatement([], null, { changes: 1 })
  })
}

/**
 * Set mock data for a specific table query
 */
export function mockTableData(tableName: string, data: Record<string, unknown>[]) {
  mockDb.prepare = vi.fn((sql: string) => {
    if (sql.includes('SELECT')) {
      return createMockStatement(data)
    }
    if (sql.includes('INSERT')) {
      return createMockStatement([], null, { changes: 1, lastInsertRowid: data.length + 1 })
    }
    if (sql.includes('UPDATE') || sql.includes('DELETE')) {
      return createMockStatement([], null, { changes: 1 })
    }
    // Default mock for other queries
    return createMockStatement()
  })
}

/**
 * Mock user authentication data
 */
export function mockAuthData() {
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

  mockDb.prepare = vi.fn((sql: string) => {
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
 * Mock performance analyzer queries
 */
export function mockPerformanceAnalyzer() {
  // Mock table list
  const mockTables = [{ name: 'agents' }, { name: 'agent_tokens' }, { name: 'agent_data_access' }]

  // Mock index data
  const mockIndexes = [
    { name: 'idx_agents_status', columns: ['status'], unique: false },
    { name: 'idx_agents_email', columns: ['email'], unique: true },
  ]

  mockDb.prepare = vi.fn((sql: string) => {
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
 * Mock token operations
 */
export function mockTokenData() {
  const mockToken = {
    id: 'token_123',
    userId: 'user_123',
    token: 'access_token_here',
    refreshToken: 'refresh_token_here',
    expiresAt: new Date(Date.now() + 3600000),
    refreshExpiresAt: new Date(Date.now() + 7200000),
    createdAt: new Date(),
  }

  mockDb.prepare = vi.fn((sql: string) => {
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
 * Mock error scenarios
 */
export function mockDatabaseError(errorMessage: string) {
  mockDb.prepare = vi.fn(() => {
    return {
      all: vi.fn(() => {
        throw new Error(errorMessage)
      }),
      get: vi.fn(() => {
        throw new Error(errorMessage)
      }),
      run: vi.fn(() => {
        throw new Error(errorMessage)
      }),
    }
  })
}

/**
 * Setup and teardown for database mocking in tests
 */
export function useMockDatabase() {
  beforeEach(() => {
    setupMockDatabase()
  })

  afterEach(() => {
    resetMockDatabase()
    vi.clearAllMocks()
  })
}
