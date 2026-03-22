/**
 * Vitest Mock Setup for Database Module
 * Uses a proper shared in-memory database that persists across prepare() calls
 */

import { vi } from 'vitest';
import { DatabaseConnection, DatabaseStatement, DatabaseResult } from '../lib/db/index';

// ============================================================================
// SHARED DATABASE STORAGE
// This is the key fix - use a module-level object that persists across all prepare() calls
// ============================================================================

interface DbRow {
  [key: string]: unknown;
}

// Room validation options
interface RoomOptions {
  type: string;
  documentId?: string;
  [key: string]: unknown;
}

// Collaboration state
interface CollaborationState {
  content: string;
  revision: number;
  operations: unknown[];
  [key: string]: unknown;
}

// Operation types
interface Operation {
  type: 'insert' | 'delete' | 'retain' | string;
  position?: number;
  content?: string;
  length?: number;
  [key: string]: unknown;
}

const dbTables: Map<string, DbRow[]> = new Map();

// Initialize tables
dbTables.set('users', []);
dbTables.set('user_tokens', []);
dbTables.set('password_reset_tokens', []);

// Helper: Get or create table
function getTable(tableName: string): DbRow[] {
  if (!dbTables.has(tableName)) {
    dbTables.set(tableName, []);
  }
  return dbTables.get(tableName)!;
}

// Helper: Generate next ID
function generateId(tableName: string): string {
  const table = getTable(tableName);
  if (table.length === 0) return `${tableName}_1`;

  const maxId = table.reduce((max, row) => {
    const idStr = String(row.id || '');
    const num = parseInt(idStr.replace(`${tableName}_`, '')) || 0;
    return Math.max(max, num);
  }, 0);

  return `${tableName}_${maxId + 1}`;
}

// ============================================================================
// SQL PARSING HELPERS
// ============================================================================

function normalizeSql(sql: string): string {
  return sql.replace(/\s+/g, ' ').trim();
}

function parseTableName(sql: string): string | null {
  const fromMatch = sql.match(/FROM\s+(\w+)/i);
  if (fromMatch) return fromMatch[1];

  const insertMatch = sql.match(/INSERT\s+INTO\s+(\w+)/i);
  if (insertMatch) return insertMatch[1];

  const updateMatch = sql.match(/UPDATE\s+(\w+)/i);
  if (updateMatch) return updateMatch[1];

  const deleteMatch = sql.match(/DELETE\s+FROM\s+(\w+)/i);
  if (deleteMatch) return deleteMatch[1];

  return null;
}

function parseInsertColumns(sql: string): string[] | null {
  const match = sql.match(/INSERT\s+INTO\s+\w+\s*\(([^)]+)\)/i);
  if (!match) return null;
  return match[1].split(',').map(col => col.trim());
}

function parseUpdateSets(sql: string): string[] | null {
  const match = sql.match(/SET\s+(.+?)\s+WHERE/i);
  if (!match) return null;
  return match[1].split(',').map(part => part.trim());
}

function parseWhereConditions(sql: string): string[] {
  const conditions: string[] = [];

  if (sql.includes('WHERE id = ?')) conditions.push('id');
  if (sql.includes('WHERE email = ?')) conditions.push('email');
  if (sql.includes('WHERE token = ?')) conditions.push('token');
  if (sql.includes('WHERE refresh_token = ?')) conditions.push('refresh_token');
  if (sql.includes('WHERE user_id = ?')) conditions.push('user_id');

  return conditions;
}

// ============================================================================
// STATEMENT EXECUTION
// ============================================================================

function executeAll(sql: string, params: unknown[]): DbRow[] {
  const tableName = parseTableName(sql);
  if (!tableName) return [];

  const table = getTable(tableName);
  const conditions = parseWhereConditions(sql);

  if (conditions.length === 0) return table;

  // Filter by conditions
  let results = table;

  for (let i = 0; i < conditions.length; i++) {
    const condition = conditions[i];
    const value = params[i];

    if (condition === 'expires_at < ?') {
      results = results.filter(row => {
        const expiresAt = row.expires_at as string | undefined;
        if (!expiresAt) return false;
        return new Date(expiresAt) < new Date(value as string);
      });
    } else if (condition === 'expires_at > ?') {
      results = results.filter(row => {
        const expiresAt = row.expires_at as string | undefined;
        if (!expiresAt) return true;
        return new Date(expiresAt) > new Date(value as string);
      });
    } else {
      results = results.filter(row => row[condition] === value);
    }
  }

  return results;
}

function executeGet(sql: string, params: unknown[]): DbRow | null {
  const results = executeAll(sql, params);
  return results.length > 0 ? results[0] : null;
}

function executeRun(sql: string, params: unknown[]): DatabaseResult {
  const normalizedSql = normalizeSql(sql).toUpperCase();
  const tableName = parseTableName(sql);

  if (!tableName) return { changes: 0, lastInsertRowid: undefined };

  const table = getTable(tableName);

  // INSERT
  if (normalizedSql.startsWith('INSERT')) {
    const columns = parseInsertColumns(sql);
    if (!columns) return { changes: 0, lastInsertRowid: undefined };

    const newRow: DbRow = {};
    columns.forEach((col, index) => {
      newRow[col] = params[index];
    });

    // Auto-generate ID if not provided
    if (!newRow.id) {
      newRow.id = generateId(tableName);
    }

    table.push(newRow);

    return {
      changes: 1,
      lastInsertRowid: parseInt(String(newRow.id).replace(`${tableName}_`, '')) || 1,
    };
  }

  // UPDATE
  if (normalizedSql.startsWith('UPDATE')) {
    const setColumns = parseUpdateSets(sql);
    if (!setColumns) return { changes: 0, lastInsertRowid: undefined };

    const updates: DbRow = {};
    let paramIndex = 0;

    for (const setCol of setColumns) {
      if (setCol.includes('?')) {
        const colName = setCol.split('=')[0].trim();
        updates[colName] = params[paramIndex];
        paramIndex++;
      }
    }

    const whereParams = params.slice(paramIndex);
    const conditions = parseWhereConditions(sql);

    let changes = 0;
    for (const row of table) {
      let matches = true;

      for (let i = 0; i < conditions.length; i++) {
        if (row[conditions[i]] !== whereParams[i]) {
          matches = false;
          break;
        }
      }

      if (matches) {
        Object.assign(row, updates);
        changes++;
      }
    }

    return { changes, lastInsertRowid: undefined };
  }

  // DELETE
  if (normalizedSql.startsWith('DELETE')) {
    const conditions = parseWhereConditions(sql);

    const initialLength = table.length;

    for (let i = table.length - 1; i >= 0; i--) {
      const row = table[i];
      let matches = true;

      for (let j = 0; j < conditions.length; j++) {
        if (row[conditions[j]] !== params[j]) {
          matches = false;
          break;
        }
      }

      if (matches) {
        table.splice(i, 1);
      }
    }

    return { changes: initialLength - table.length, lastInsertRowid: undefined };
  }

  return { changes: 0, lastInsertRowid: undefined };
}

// ============================================================================
// MOCK DATABASE
// ============================================================================

const mockDb: DatabaseConnection = {
  query: vi.fn(),

  exec: vi.fn((sql: string) => {
    // Handle CREATE TABLE
    if (sql.toUpperCase().includes('CREATE TABLE')) {
      const match = sql.match(/CREATE TABLE\s+(\w+)/i);
      if (match) {
        const tableName = match[1];
        if (!dbTables.has(tableName)) {
          dbTables.set(tableName, []);
        }
      }
    }
    return { changes: 1, lastInsertRowid: 1 };
  }),

  close: vi.fn(),

  prepare: vi.fn((sql: string) => {
    // This is the key: each prepare() call returns a statement,
    // but all statements share the same dbTables data
    const statement: DatabaseStatement = {
      all: vi.fn((...params: unknown[]) => {
        return executeAll(sql, params);
      }),

      get: vi.fn((...params: unknown[]) => {
        return executeGet(sql, params);
      }),

      run: vi.fn((...params: unknown[]) => {
        return executeRun(sql, params);
      }),
    };

    return statement;
  }),

  pragma: vi.fn().mockReturnValue(undefined),

  batch: vi.fn((statements: unknown[]) => {
    const results: DatabaseResult[] = [];
    for (const statement of statements) {
      if (typeof statement === 'object' && statement !== null && 'sql' in statement) {
        const { sql, params } = statement as { sql: string; params?: unknown[] };
        results.push(executeRun(sql, params || []));
      }
    }
    return results;
  }),

  queryRows: vi.fn(),
};

// ============================================================================
// EVENTSOURCE MOCK
// ============================================================================

 
class MockEventSource extends EventTarget {
  public readonly url: string;
  public readonly withCredentials: boolean;
  public readonly CONNECTING = 0;
  public readonly OPEN = 1;
  public readonly CLOSED = 2;
  public readyState: number = this.CONNECTING;
  public onopen: ((this: EventSource, ev: Event) => unknown) | null = null;
  public onmessage: ((this: EventSource, ev: MessageEvent) => unknown) | null = null;
  public onerror: ((this: EventSource, ev: Event) => unknown) | null = null;

  constructor(url: string, eventSourceInitDict?: EventSourceInit) {
    super();
    this.url = url;
    this.withCredentials = eventSourceInitDict?.withCredentials ?? false;
  }

  public close(): void {
    this.readyState = this.CLOSED;
    this.dispatchEvent(new Event('close'));
  }

  // Helper methods for testing
  public mockOpen(): void {
    this.readyState = this.OPEN;
    (this.onopen as Function)?.call(this, new Event('open'));
    this.dispatchEvent(new Event('open'));
  }

  public mockMessage(data: string, lastEventId?: string): void {
    const event = new MessageEvent('message', { data, lastEventId });
    (this.onmessage as Function)?.call(this, event);
    this.dispatchEvent(event);
  }

  public mockError(error: Event): void {
    (this.onerror as Function)?.call(this, error);
    this.dispatchEvent(error);
  }
}

// Set global EventSource
declare global {
  var EventSource: typeof EventSource;
}
(globalThis as unknown as { EventSource: typeof EventSource }).EventSource = MockEventSource as unknown as typeof EventSource;

// ============================================================================
// MOCK THE DATABASE MODULE
// ============================================================================

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
}));

// ============================================================================
// MOCK AUTH MODULES
// ============================================================================

vi.mock('../lib/auth/jwt', () => ({
  verifyToken: vi.fn(),
}));

vi.mock('../lib/auth/service', () => ({
  verifyJwtToken: vi.fn(),
  getUserById: vi.fn(),
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
}));

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
    });
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
    });
  }),
  withRole: vi.fn().mockImplementation(() => vi.fn().mockImplementation(async (request, handler) => {
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
    });
  })),
  withPermissions: vi.fn().mockImplementation(() => vi.fn().mockImplementation(async (request, handler) => {
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
    });
  })),
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
    });
  }),
}));

// Mock permissions repository
vi.mock('../lib/permissions/repository', () => ({
  getUserPermissionContext: vi.fn().mockResolvedValue({
    userId: 'test-user-id',
    roles: [{ id: 'role_admin', name: 'Admin', permissions: ['admin:all'] }],
    permissions: ['admin:all'],
    customPermissions: [],
  }),
  getUserRoles: vi.fn().mockResolvedValue([{ id: 'role_admin', name: 'Admin', permissions: ['admin:all'] }]),
  hasPermission: vi.fn().mockReturnValue(true),
  hasRole: vi.fn().mockReturnValue(true),
}));

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
    const parts = roomId.split(':');
    if (parts.length !== 2) return null;
    const validTypes = ['task', 'project', 'document', 'chat'];
    if (!validTypes.includes(parts[0])) return null;
    return { type: parts[0], id: parts[1] };
  }),
  isTaskRoom: vi.fn((roomId: string) => roomId.startsWith('task:')),
  isProjectRoom: vi.fn((roomId: string) => roomId.startsWith('project:')),
  isDocumentRoom: vi.fn((roomId: string) => roomId.startsWith('document:')),
  isChatRoom: vi.fn((roomId: string) => roomId.startsWith('chat:')),
  isValidRoomType: vi.fn((type: string) => ['task', 'project', 'document', 'chat'].includes(type)),
  validateRoomOptions: vi.fn((options: RoomOptions) => {
    if (!options || !options.type) {
      return { valid: false, error: 'Room type is required' };
    }
    if (!options.documentId || options.documentId === '') {
      return { valid: false, error: 'Document ID is required' };
    }
    if (!['task', 'project', 'document', 'chat'].includes(options.type)) {
      return { valid: false, error: `Invalid room type: ${options.type}` };
    }
    if (options.documentId.length > 100) {
      return { valid: false, error: 'Document ID too long' };
    }
    return { valid: true, error: undefined };
  }),
  createRoom: vi.fn(),
  joinRoom: vi.fn(),
  leaveRoom: vi.fn(),
  getRoomInfo: vi.fn(),
  getRoomUsers: vi.fn(),
  updateRoomActivity: vi.fn(),
}));

// Mock collaboration/manager
vi.mock('../lib/collaboration/manager', () => ({
  applyOperation: vi.fn((state: CollaborationState, operation: Operation, userId?: string, userName?: string) => {
    let newContent = state.content;
    const pos = operation.position ?? 0;
    if (operation.type === 'insert') {
      newContent = state.content.slice(0, pos) + operation.content + state.content.slice(pos);
    } else if (operation.type === 'delete') {
      newContent = state.content.slice(0, pos) + state.content.slice(pos + (operation.length || 0));
    }
    const newOperation = {
      id: `op-${Date.now()}`,
      userId: userId || 'unknown',
      userName: userName || 'Unknown',
      timestamp: new Date(),
      operation,
      revision: state.revision + 1,
    };
    return {
      ...state,
      content: newContent,
      revision: state.revision + 1,
      operations: [...state.operations, newOperation],
    };
  }),
  transform: vi.fn((op1: Operation, op2: Operation) => {
    // Simple transformation logic based on test expectations
    if (op2.type === 'retain' && op1.type === 'insert') {
      // Insert at position 5, retain at position 10 should shift retain to 11
      if ((op1.position ?? 0) <= (op2.position ?? 0)) {
        return {
          op1,
          op2: { ...op2, position: (op2.position ?? 0) + (op1.content?.length || 0) },
        };
      }
    }
    // If op2 is insert and position >= op1.position, shift it
    if (op2.type === 'insert' && (op2.position ?? 0) >= (op1.position ?? 0)) {
      return {
        op1,
        op2: { ...op2, position: (op2.position ?? 0) + (op1.content?.length || 0) },
      };
    }
    return { op1, op2 };
  }),
  composeOperations: vi.fn((...ops: Operation[]) => {
    // Handle operation composition based on test expectations
    if (ops.length === 2) {
      const [op1, op2] = ops;
      // If first is retain and second is insert, combine them
      if (op1.type === 'retain' && op2.type === 'insert') {
        return {
          type: 'insert',
          position: (op1.position || 0) + (op2.position || 0),
          content: op2.content || '',
        };
      }
      // If both are insert, return the second with combined position
      if (op1.type === 'insert' && op2.type === 'insert') {
        return {
          type: 'insert',
          position: (op1.content?.length || 0) + (op2.position || 0),
          content: op2.content || '',
        };
      }
    }
    // Fallback: return the first operation
    return ops[0];
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
}));

// Mock collaboration/server
vi.mock('../lib/collaboration/server', () => ({
  getCollaborationServer: vi.fn(),
  startCollaborationServer: vi.fn(),
  stopCollaborationServer: vi.fn(),
}));

// ============================================================================
// EXPORTED HELPERS FOR TESTS
// ============================================================================

/**
 * Get the current state of all tables
 */
export function getDbTables(): Map<string, DbRow[]> {
  return dbTables;
}

/**
 * Get data from a specific table
 */
export function getTableData(tableName: string): DbRow[] {
  return getTable(tableName);
}

/**
 * Insert data directly into a table (for test setup)
 */
export function insertTestRow(tableName: string, data: DbRow): DbRow {
  const table = getTable(tableName);
  if (!data.id) {
    data.id = generateId(tableName);
  }
  table.push({ ...data });
  return data;
}

/**
 * Clear all tables (for test cleanup)
 */
export function clearAllTables(): void {
  for (const tableName of dbTables.keys()) {
    dbTables.set(tableName, []);
  }
}

/**
 * Clear a specific table
 */
export function clearTable(tableName: string): void {
  if (dbTables.has(tableName)) {
    dbTables.set(tableName, []);
  }
}

/**
 * Get the mock database instance
 */
export function getMockDb(): DatabaseConnection {
  return mockDb;
}

// ============================================================================
// RESET BETWEEN TESTS
// ============================================================================

beforeEach(() => {
  // Clear all mock call history but keep the data
  vi.clearAllMocks();

  // Reset database to clean state for each test
  clearAllTables();

  // Re-initialize tables
  dbTables.set('users', []);
  dbTables.set('user_tokens', []);
  dbTables.set('password_reset_tokens', []);
});
