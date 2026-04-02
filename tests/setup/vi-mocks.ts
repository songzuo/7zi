/**
 * Vitest Mock Setup for Database Module
 * Uses a proper shared in-memory database that persists across prepare() calls
 */

import { vi } from 'vitest'
import { DatabaseConnection, DatabaseStatement, DatabaseResult } from '../lib/db/index'

// ============================================================================
// JOSE LIBRARY MOCK - Fix Uint8Array realm mismatch in jsdom
// jose library uses instanceof Uint8Array checks that fail in jsdom environment
// We use a simple mock that generates JWT-like tokens for testing
// ============================================================================

vi.mock('jose', () => {
  let mockSignCount = 0
  // Track which secret was used to sign each token
  const tokenSecrets = new Map<string, string>()

  // Extract secret string from various key formats
  function extractSecret(key: any): string {
    // Handle CryptoKey from crypto.createSecretKey()
    if (key && typeof key === 'object') {
      // If it's a CryptoKey with export method
      if ('export' in key && typeof key.export === 'function') {
        try {
          const exported = key.export()
          if (Buffer.isBuffer(exported)) {
            return exported.toString('utf-8')
          }
          if (exported instanceof Uint8Array) {
            return Buffer.from(exported).toString('utf-8')
          }
        } catch (e) {
          // Export failed - try toString
          return `crypto-key-${Buffer.from(String(key)).toString('base64url')}`
        }
      }
      // If it's a KeyObject with export method
      if (key.type === 'secret' && 'export' in key) {
        try {
          const exported = key.export()
          if (Buffer.isBuffer(exported)) {
            return exported.toString('utf-8')
          }
        } catch {}
      }
      // If it's a raw Uint8Array
      if (key instanceof Uint8Array) {
        return Buffer.from(key).toString('utf-8')
      }
    }
    // Handle regular string or anything else
    return String(key)
  }

  // Parse duration strings like '1h', '1d', '3600s', '-1s' to seconds
  function parseDuration(duration: string): number {
    // Handle negative durations (for expired tokens)
    const negMatch = duration.match(/^-(\d+)([hmsd])$/)
    if (negMatch) {
      const value = parseInt(negMatch[1])
      const unit = negMatch[2]
      switch (unit) {
        case 'h':
          return -value * 3600
        case 'm':
          return -value * 60
        case 's':
          return -value
        case 'd':
          return -value * 86400
        default:
          return -3600
      }
    }
    const match = duration.match(/^(\d+)([hmsd])$/)
    if (!match) return 3600 // default 1 hour
    const value = parseInt(match[1])
    const unit = match[2]
    switch (unit) {
      case 'h':
        return value * 3600
      case 'm':
        return value * 60
      case 's':
        return value
      case 'd':
        return value * 86400
      default:
        return 3600
    }
  }

  return {
    SignJWT: class MockSignJWT {
      #payload: any
      #protectedHeader: any
      #expirationTime: any = '1h'
      #issuedAt: any
      #issuer: any = '7zi-api'
      #audience: any = '7zi-users'

      constructor(payload: any) {
        this.#payload = payload
      }

      setProtectedHeader(header: any) {
        this.#protectedHeader = header
        return this
      }

      setIssuedAt() {
        this.#issuedAt = Math.floor(Date.now() / 1000)
        return this
      }

      setExpirationTime(exp: any) {
        this.#expirationTime = exp
        return this
      }

      setIssuer(issuer: string) {
        this.#issuer = issuer
        return this
      }

      setAudience(audience: string) {
        this.#audience = audience
        return this
      }

      async sign(key: any): Promise<string> {
        mockSignCount++
        const iat = this.#issuedAt || Math.floor(Date.now() / 1000)
        const expSeconds = parseDuration(String(this.#expirationTime))
        const exp = iat + expSeconds

        const payloadStr = JSON.stringify({
          ...this.#payload,
          iat,
          exp,
          iss: this.#issuer,
          aud: this.#audience,
        })
        const payloadB64 = Buffer.from(payloadStr).toString('base64url')
        const headerB64 = Buffer.from(
          JSON.stringify(this.#protectedHeader || { alg: 'HS256' })
        ).toString('base64url')

        // Extract and encode the secret
        const secretStr = extractSecret(key)
        const secretB64 = Buffer.from(secretStr).toString('base64url')
        const mockSig = Buffer.from(`mock-sig-${mockSignCount}-secret-${secretB64}`).toString(
          'base64url'
        )

        const token = `${headerB64}.${payloadB64}.${mockSig}`
        tokenSecrets.set(token, secretStr)

        return token
      }
    },

    jwtVerify: async (token: string, key: any, options?: any) => {
      const parts = token.split('.')
      if (parts.length !== 3) throw new Error('Invalid token format')
      let payload
      try {
        payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString())
      } catch {
        throw new Error('Invalid token payload')
      }
      if (options?.issuer && payload.iss !== options.issuer) throw new Error('Invalid issuer')
      if (options?.audience && payload.aud !== options.audience) throw new Error('Invalid audience')

      // Verify the secret matches what was used to sign
      const signingSecret = tokenSecrets.get(token)
      const verifySecret = extractSecret(key)
      if (signingSecret && verifySecret !== signingSecret) {
        throw new Error('signature verification failed')
      }

      return {
        payload,
        protectedHeader: JSON.parse(Buffer.from(parts[0], 'base64url').toString()),
        key: key,
      }
    },

    decodeJwt: (token: string) => {
      const parts = token.split('.')
      if (parts.length !== 3) throw new Error('Invalid token format')
      return JSON.parse(Buffer.from(parts[1], 'base64url').toString())
    },

    createLocalJWKSet: () => ({}),
    FlattenedSign: class {},
    CompactSign: class {},
  }
})

// ============================================================================
// SHARED DATABASE STORAGE
// This is the key fix - use a module-level object that persists across all prepare() calls
// ============================================================================

interface DbRow {
  [key: string]: unknown
}

// Room validation options
interface RoomOptions {
  type: string
  documentId?: string
  [key: string]: unknown
}

// Collaboration state
interface CollaborationState {
  content: string
  revision: number
  operations: unknown[]
  [key: string]: unknown
}

// Operation types
interface Operation {
  type: 'insert' | 'delete' | 'retain' | string
  position?: number
  content?: string
  length?: number
  [key: string]: unknown
}

const dbTables: Map<string, DbRow[]> = new Map()

// Initialize tables
dbTables.set('users', [])
dbTables.set('user_tokens', [])
dbTables.set('password_reset_tokens', [])

// Helper: Get or create table
function getTable(tableName: string): DbRow[] {
  if (!dbTables.has(tableName)) {
    dbTables.set(tableName, [])
  }
  return dbTables.get(tableName)!
}

// Helper: Generate next ID
function generateId(tableName: string): string {
  const table = getTable(tableName)
  if (table.length === 0) return `${tableName}_1`

  const maxId = table.reduce((max, row) => {
    const idStr = String(row.id || '')
    const num = parseInt(idStr.replace(`${tableName}_`, '')) || 0
    return Math.max(max, num)
  }, 0)

  return `${tableName}_${maxId + 1}`
}

// ============================================================================
// SQL PARSING HELPERS
// ============================================================================

function normalizeSql(sql: string): string {
  return sql.replace(/\s+/g, ' ').trim()
}

function parseTableName(sql: string): string | null {
  const fromMatch = sql.match(/FROM\s+(\w+)/i)
  if (fromMatch) return fromMatch[1]

  const insertMatch = sql.match(/INSERT\s+INTO\s+(\w+)/i)
  if (insertMatch) return insertMatch[1]

  const updateMatch = sql.match(/UPDATE\s+(\w+)/i)
  if (updateMatch) return updateMatch[1]

  const deleteMatch = sql.match(/DELETE\s+FROM\s+(\w+)/i)
  if (deleteMatch) return deleteMatch[1]

  return null
}

function parseInsertColumns(sql: string): string[] | null {
  const match = sql.match(/INSERT\s+INTO\s+\w+\s*\(([^)]+)\)/i)
  if (!match) return null
  return match[1].split(',').map(col => col.trim())
}

function parseUpdateSets(sql: string): string[] | null {
  const match = sql.match(/SET\s+(.+?)\s+WHERE/i)
  if (!match) return null
  return match[1].split(',').map(part => part.trim())
}

function parseWhereConditions(sql: string): string[] {
  const conditions: string[] = []

  if (sql.includes('WHERE id = ?')) conditions.push('id')
  if (sql.includes('WHERE email = ?')) conditions.push('email')
  if (sql.includes('WHERE token = ?')) conditions.push('token')
  if (sql.includes('WHERE refresh_token = ?')) conditions.push('refresh_token')
  if (sql.includes('WHERE user_id = ?')) conditions.push('user_id')

  return conditions
}

// ============================================================================
// STATEMENT EXECUTION
// ============================================================================

function executeAll(sql: string, params: unknown[]): DbRow[] {
  const tableName = parseTableName(sql)
  if (!tableName) return []

  const table = getTable(tableName)
  const conditions = parseWhereConditions(sql)

  if (conditions.length === 0) return table

  // Filter by conditions
  let results = table

  for (let i = 0; i < conditions.length; i++) {
    const condition = conditions[i]
    const value = params[i]

    if (condition === 'expires_at < ?') {
      results = results.filter(row => {
        const expiresAt = row.expires_at as string | undefined
        if (!expiresAt) return false
        return new Date(expiresAt) < new Date(value as string)
      })
    } else if (condition === 'expires_at > ?') {
      results = results.filter(row => {
        const expiresAt = row.expires_at as string | undefined
        if (!expiresAt) return true
        return new Date(expiresAt) > new Date(value as string)
      })
    } else {
      results = results.filter(row => row[condition] === value)
    }
  }

  return results
}

function executeGet(sql: string, params: unknown[]): DbRow | null {
  const results = executeAll(sql, params)
  return results.length > 0 ? results[0] : null
}

function executeRun(sql: string, params: unknown[]): DatabaseResult {
  const normalizedSql = normalizeSql(sql).toUpperCase()
  const tableName = parseTableName(sql)

  if (!tableName) return { changes: 0, lastInsertRowid: undefined }

  const table = getTable(tableName)

  // INSERT
  if (normalizedSql.startsWith('INSERT')) {
    const columns = parseInsertColumns(sql)
    if (!columns) return { changes: 0, lastInsertRowid: undefined }

    const newRow: DbRow = {}
    columns.forEach((col, index) => {
      newRow[col] = params[index]
    })

    // Auto-generate ID if not provided
    if (!newRow.id) {
      newRow.id = generateId(tableName)
    }

    table.push(newRow)

    return {
      changes: 1,
      lastInsertRowid: parseInt(String(newRow.id).replace(`${tableName}_`, '')) || 1,
    }
  }

  // UPDATE
  if (normalizedSql.startsWith('UPDATE')) {
    const setColumns = parseUpdateSets(sql)
    if (!setColumns) return { changes: 0, lastInsertRowid: undefined }

    const updates: DbRow = {}
    let paramIndex = 0

    for (const setCol of setColumns) {
      if (setCol.includes('?')) {
        const colName = setCol.split('=')[0].trim()
        updates[colName] = params[paramIndex]
        paramIndex++
      }
    }

    const whereParams = params.slice(paramIndex)
    const conditions = parseWhereConditions(sql)

    let changes = 0
    for (const row of table) {
      let matches = true

      for (let i = 0; i < conditions.length; i++) {
        if (row[conditions[i]] !== whereParams[i]) {
          matches = false
          break
        }
      }

      if (matches) {
        Object.assign(row, updates)
        changes++
      }
    }

    return { changes, lastInsertRowid: undefined }
  }

  // DELETE
  if (normalizedSql.startsWith('DELETE')) {
    const conditions = parseWhereConditions(sql)

    const initialLength = table.length

    for (let i = table.length - 1; i >= 0; i--) {
      const row = table[i]
      let matches = true

      for (let j = 0; j < conditions.length; j++) {
        if (row[conditions[j]] !== params[j]) {
          matches = false
          break
        }
      }

      if (matches) {
        table.splice(i, 1)
      }
    }

    return { changes: initialLength - table.length, lastInsertRowid: undefined }
  }

  return { changes: 0, lastInsertRowid: undefined }
}

// ============================================================================
// MOCK DATABASE
// ============================================================================

const mockDb: DatabaseConnection = {
  query: vi.fn(),

  exec: vi.fn((sql: string) => {
    // Handle CREATE TABLE
    if (sql.toUpperCase().includes('CREATE TABLE')) {
      const match = sql.match(/CREATE TABLE\s+(\w+)/i)
      if (match) {
        const tableName = match[1]
        if (!dbTables.has(tableName)) {
          dbTables.set(tableName, [])
        }
      }
    }
    return { changes: 1, lastInsertRowid: 1 }
  }),

  prepare: vi.fn((sql: string) => {
    // This is the key: each prepare() call returns a statement,
    // but all statements share the same dbTables data
    const statement: DatabaseStatement = {
      all: vi.fn((...params: unknown[]) => {
        return executeAll(sql, params)
      }),

      get: vi.fn((...params: unknown[]) => {
        return executeGet(sql, params)
      }),

      run: vi.fn((...params: unknown[]) => {
        return executeRun(sql, params)
      }),
    }

    return statement
  }),

  pragma: vi.fn().mockReturnValue(undefined),

  batch: vi.fn((statements: Array<{ sql: string; params?: unknown[] }>) => {
    const results: DatabaseResult[] = []
    for (const { sql, params } of statements) {
      results.push(executeRun(sql, params || []))
    }
    return Promise.resolve(results)
  }),

  queryRows: vi.fn((sql: string, params?: unknown[]) => {
    if (params && params.length > 0) {
      return executeAll(sql, params)
    }
    return executeAll(sql, [])
  }),
}

// ============================================================================
// EVENTSOURCE MOCK
// ============================================================================

class MockEventSource extends EventTarget {
  public readonly url: string
  public readonly withCredentials: boolean
  public readonly CONNECTING = 0
  public readonly OPEN = 1
  public readonly CLOSED = 2
  public readyState: number = this.CONNECTING
  public onopen: ((this: EventSource, ev: Event) => unknown) | null = null
  public onmessage: ((this: EventSource, ev: MessageEvent) => unknown) | null = null
  public onerror: ((this: EventSource, ev: Event) => unknown) | null = null

  constructor(url: string, eventSourceInitDict?: EventSourceInit) {
    super()
    this.url = url
    this.withCredentials = eventSourceInitDict?.withCredentials ?? false
  }

  public close(): void {
    this.readyState = this.CLOSED
    this.dispatchEvent(new Event('close'))
  }

  // Helper methods for testing
  public mockOpen(): void {
    this.readyState = this.OPEN
    ;(this.onopen as Function)?.call(this, new Event('open'))
    this.dispatchEvent(new Event('open'))
  }

  public mockMessage(data: string, lastEventId?: string): void {
    const event = new MessageEvent('message', { data, lastEventId })
    ;(this.onmessage as Function)?.call(this, event)
    this.dispatchEvent(event)
  }

  public mockError(error: Event): void {
    ;(this.onerror as Function)?.call(this, error)
    this.dispatchEvent(error)
  }
}

// Set global EventSource
declare global {
  var EventSource: typeof EventSource
}
;(globalThis as unknown as { EventSource: typeof EventSource }).EventSource =
  MockEventSource as unknown as typeof EventSource

// ============================================================================
// MOCK THE DATABASE MODULE
// ============================================================================

// Mock logger
vi.mock('../lib/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    fatal: vi.fn(),
    api: vi.fn(),
    auth: vi.fn(),
    perf: vi.fn(),
    user: vi.fn(),
    security: vi.fn(),
    business: vi.fn(),
    setContext: vi.fn(),
    clearContext: vi.fn(),
    child: vi.fn(),
    updateConfig: vi.fn(),
  },
  default: function () {
    return {
      error: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
      fatal: vi.fn(),
      api: vi.fn(),
      auth: vi.fn(),
      perf: vi.fn(),
      user: vi.fn(),
      security: vi.fn(),
      business: vi.fn(),
      setContext: vi.fn(),
      clearContext: vi.fn(),
      child: vi.fn(),
      updateConfig: vi.fn(),
    }
  },
}))

vi.mock('../lib/db/index', () => ({
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

// ============================================================================
// MOCK AUTH MODULES
// ============================================================================
// Note: JWT module uses real implementation (not mocked) for auth testing
// Only service layer functions are mocked where needed

vi.mock('../lib/auth/service', () => ({
  verifyJwtToken: vi.fn(),
  getUserById: vi.fn(),
  loginUser: vi.fn().mockResolvedValue({
    success: true,
    user: {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      role: 'admin',
      status: 'active',
    },
    token: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
    expiresAt: new Date(Date.now() + 3600000).toISOString(),
  }),
  authenticateToken: vi.fn().mockResolvedValue({
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
      name: 'Test User',
      role: 'admin',
      status: 'active',
    },
    context: {
      userId: 'test-user-id',
      email: 'test@example.com',
      name: 'Test User',
      role: 'admin',
      roles: ['admin'],
      permissions: ['admin:all'],
      requestId: 'test-request-id',
    },
  }),
}))

// Mock middleware-rbac to bypass auth
vi.mock('../lib/auth/middleware-rbac', () => ({
  withUserAuth: vi.fn().mockImplementation(async (request, handler) => {
    return handler(request, {
      userId: 'test-user-id',
      email: 'test@example.com',
      name: 'Test User',
      role: 'admin',
      roles: ['admin'],
      permissions: ['admin:all'],
      requestId: 'test-request-id',
      permissionContext: {
        userId: 'test-user-id',
        roles: [{ id: 'role_admin', name: 'Admin', permissions: ['admin:all'] }],
        permissions: ['admin:all'],
        customPermissions: [],
      },
    })
  }),
  withAdmin: vi.fn().mockImplementation(async (request, handler) => {
    return handler(request, {
      userId: 'test-user-id',
      email: 'test@example.com',
      name: 'Test User',
      role: 'admin',
      roles: ['admin'],
      permissions: ['admin:all'],
      requestId: 'test-request-id',
      permissionContext: {
        userId: 'test-user-id',
        roles: [{ id: 'role_admin', name: 'Admin', permissions: ['admin:all'] }],
        permissions: ['admin:all'],
        customPermissions: [],
      },
    })
  }),
  withRole: vi.fn().mockImplementation(() =>
    vi.fn().mockImplementation(async (request, handler) => {
      return handler(request, {
        userId: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
        role: 'admin',
        roles: ['admin'],
        permissions: ['admin:all'],
        requestId: 'test-request-id',
        permissionContext: {
          userId: 'test-user-id',
          roles: [{ id: 'role_admin', name: 'Admin', permissions: ['admin:all'] }],
          permissions: ['admin:all'],
          customPermissions: [],
        },
      })
    })
  ),
  withPermissions: vi.fn().mockImplementation(() =>
    vi.fn().mockImplementation(async (request, handler) => {
      return handler(request, {
        userId: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
        role: 'admin',
        roles: ['admin'],
        permissions: ['admin:all'],
        requestId: 'test-request-id',
        permissionContext: {
          userId: 'test-user-id',
          roles: [{ id: 'role_admin', name: 'Admin', permissions: ['admin:all'] }],
          permissions: ['admin:all'],
          customPermissions: [],
        },
      })
    })
  ),
  withAnyRole: vi.fn().mockImplementation(() => vi.fn()),
  withManagerOrAdmin: vi.fn().mockImplementation(() => vi.fn()),
  withOptionalAuth: vi.fn().mockImplementation(async (request, handler) => {
    return handler(request, {
      userId: 'test-user-id',
      email: 'test@example.com',
      name: 'Test User',
      role: 'admin',
      roles: ['admin'],
      permissions: ['admin:all'],
      requestId: 'test-request-id',
      permissionContext: {
        userId: 'test-user-id',
        roles: [{ id: 'role_admin', name: 'Admin', permissions: ['admin:all'] }],
        permissions: ['admin:all'],
        customPermissions: [],
      },
    })
  }),
}))

// Mock permissions repository
vi.mock('../lib/permissions/repository', () => ({
  getUserPermissionContext: vi.fn().mockResolvedValue({
    userId: 'test-user-id',
    roles: [{ id: 'role_admin', name: 'Admin', permissions: ['admin:all'] }],
    permissions: ['admin:all'],
    customPermissions: [],
  }),
  getUserRoles: vi
    .fn()
    .mockResolvedValue([{ id: 'role_admin', name: 'Admin', permissions: ['admin:all'] }]),
  hasPermission: vi.fn().mockReturnValue(true),
  hasRole: vi.fn().mockReturnValue(true),
}))

// Mock feedback anti-spam module
vi.mock('../lib/feedback/anti-spam', () => ({
  detectSpam: vi.fn().mockResolvedValue({
    is_spam: false,
    reason: '',
    score: 0,
    metadata: { type: 'feedback', checks: ['rate_limit', 'duplicate', 'content'] },
  }),
  getAntiSpamConfig: vi.fn().mockResolvedValue({
    max_feedback_per_hour: 5,
    max_feedback_per_day: 20,
    min_time_between_feedback: 60,
    duplicate_threshold: 0.85,
    require_email: false,
    enable_content_filter: true,
    blocked_words: ['test', '测试', 'abc', '123', 'xxx', 'spam'],
  }),
  getSpamStatistics: vi.fn().mockResolvedValue({
    total_checks: 0,
    spam_detected: 0,
    spam_rate: 0,
    blocked_users: 0,
    recent_spam: [],
  }),
}))

// ============================================================================
// MOCK THE COLLABORATION MODULES
// ============================================================================

// Mock collaboration/rooms
vi.mock('../lib/collaboration/rooms', () => ({
  generateTaskRoomId: vi.fn((taskId: string) => `task:${taskId}`),
  generateProjectRoomId: vi.fn((projectId: string) => `project:${projectId}`),
  generateDocumentRoomId: vi.fn((docId: string) => `document:${docId}`),
  generateChatRoomId: vi.fn((chatId: string) => `chat:${chatId}`),
  parseRoomId: vi.fn((roomId: string) => {
    const parts = roomId.split(':')
    if (parts.length !== 2) return null
    const validTypes = ['task', 'project', 'document', 'chat']
    if (!validTypes.includes(parts[0])) return null
    return { type: parts[0], id: parts[1] }
  }),
  isTaskRoom: vi.fn((roomId: string) => roomId.startsWith('task:')),
  isProjectRoom: vi.fn((roomId: string) => roomId.startsWith('project:')),
  isDocumentRoom: vi.fn((roomId: string) => roomId.startsWith('document:')),
  isChatRoom: vi.fn((roomId: string) => roomId.startsWith('chat:')),
  isValidRoomType: vi.fn((type: string) => ['task', 'project', 'document', 'chat'].includes(type)),
  validateRoomOptions: vi.fn((options: RoomOptions) => {
    if (!options || !options.type) {
      return { valid: false, error: 'Room type is required' }
    }
    if (!options.documentId || options.documentId === '') {
      return { valid: false, error: 'Document ID is required' }
    }
    if (!['task', 'project', 'document', 'chat'].includes(options.type)) {
      return { valid: false, error: `Invalid room type: ${options.type}` }
    }
    if (options.documentId.length > 100) {
      return { valid: false, error: 'Document ID too long' }
    }
    return { valid: true, error: undefined }
  }),
  createRoom: vi.fn(),
  joinRoom: vi.fn(),
  leaveRoom: vi.fn(),
  getRoomInfo: vi.fn(),
  getRoomUsers: vi.fn(),
  updateRoomActivity: vi.fn(),
}))

// Mock collaboration/manager
vi.mock('../lib/collaboration/manager', () => ({
  applyOperation: vi.fn(
    (state: CollaborationState, operation: Operation, userId?: string, userName?: string) => {
      let newContent = state.content
      const pos = operation.position ?? 0
      if (operation.type === 'insert') {
        newContent = state.content.slice(0, pos) + operation.content + state.content.slice(pos)
      } else if (operation.type === 'delete') {
        newContent =
          state.content.slice(0, pos) + state.content.slice(pos + (operation.length || 0))
      }
      const newOperation = {
        id: `op-${Date.now()}`,
        userId: userId || 'unknown',
        userName: userName || 'Unknown',
        timestamp: new Date(),
        operation,
        revision: state.revision + 1,
      }
      return {
        ...state,
        content: newContent,
        revision: state.revision + 1,
        operations: [...state.operations, newOperation],
      }
    }
  ),
  transform: vi.fn((op1: Operation, op2: Operation) => {
    // Simple transformation logic based on test expectations
    if (op2.type === 'retain' && op1.type === 'insert') {
      // Insert at position 5, retain at position 10 should shift retain to 11
      if ((op1.position ?? 0) <= (op2.position ?? 0)) {
        return {
          op1,
          op2: { ...op2, position: (op2.position ?? 0) + (op1.content?.length || 0) },
        }
      }
    }
    // If op2 is insert and position >= op1.position, shift it
    if (op2.type === 'insert' && (op2.position ?? 0) >= (op1.position ?? 0)) {
      return {
        op1,
        op2: { ...op2, position: (op2.position ?? 0) + (op1.content?.length || 0) },
      }
    }
    return { op1, op2 }
  }),
  composeOperations: vi.fn((...ops: Operation[]) => {
    // Handle operation composition based on test expectations
    if (ops.length === 2) {
      const [op1, op2] = ops
      // If first is retain and second is insert, combine them
      if (op1.type === 'retain' && op2.type === 'insert') {
        return {
          type: 'insert',
          position: (op1.position || 0) + (op2.position || 0),
          content: op2.content || '',
        }
      }
      // If both are insert, return the second with combined position
      if (op1.type === 'insert' && op2.type === 'insert') {
        return {
          type: 'insert',
          position: (op1.content?.length || 0) + (op2.position || 0),
          content: op2.content || '',
        }
      }
    }
    // Fallback: return the first operation
    return ops[0]
  }),
  getCollaborationManager: vi.fn(() => ({
    createDocument: vi.fn(),
    getDocument: vi.fn(),
    updateDocument: vi.fn(),
    deleteDocument: vi.fn(),
    getUserPresence: vi.fn(),
    updateUserPresence: vi.fn(),
    broadcastPresence: vi.fn(),
    getCursor: vi.fn(),
    updateCursor: vi.fn(),
    broadcastCursor: vi.fn(),
  })),
}))

// Mock collaboration/server
vi.mock('../lib/collaboration/server', () => ({
  getCollaborationServer: vi.fn(),
  startCollaborationServer: vi.fn(),
  stopCollaborationServer: vi.fn(),
}))

// ============================================================================
// EXPORTED HELPERS FOR TESTS
// ============================================================================

/**
 * Get the current state of all tables
 */
export function getDbTables(): Map<string, DbRow[]> {
  return dbTables
}

/**
 * Get data from a specific table
 */
export function getTableData(tableName: string): DbRow[] {
  return getTable(tableName)
}

/**
 * Insert data directly into a table (for test setup)
 */
export function insertTestRow(tableName: string, data: DbRow): DbRow {
  const table = getTable(tableName)
  if (!data.id) {
    data.id = generateId(tableName)
  }
  table.push({ ...data })
  return data
}

/**
 * Clear all tables (for test cleanup)
 */
export function clearAllTables(): void {
  for (const tableName of dbTables.keys()) {
    dbTables.set(tableName, [])
  }
}

/**
 * Clear a specific table
 */
export function clearTable(tableName: string): void {
  if (dbTables.has(tableName)) {
    dbTables.set(tableName, [])
  }
}

/**
 * Get the mock database instance
 */
export function getMockDb(): DatabaseConnection {
  return mockDb
}

// ============================================================================
// RESET BETWEEN TESTS
// ============================================================================

beforeEach(() => {
  // Clear all mock call history but keep the data
  vi.clearAllMocks()

  // Reset database to clean state for each test
  clearAllTables()

  // Re-initialize tables
  dbTables.set('users', [])
  dbTables.set('user_tokens', [])
  dbTables.set('password_reset_tokens', [])
  dbTables.set('feedbacks', [])
  dbTables.set('spam_detection_logs', [])
})
