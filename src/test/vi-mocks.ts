/**
 * Vitest Mock Setup for Database Module - Simplified for Projects API
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

const dbTables: Map<string, DbRow[]> = new Map();

// Initialize tables
dbTables.set('users', []);
dbTables.set('user_tokens', []);
dbTables.set('password_reset_tokens', []);
dbTables.set('tasks', []);
dbTables.set('projects', []);

// Timestamp counter for stable sorting
let timestampCounter = Date.now();

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

  // Simple WHERE conditions
  const whereMatch = sql.match(/WHERE\s+(.+?)(?:ORDER\s+BY|LIMIT|GROUP\s+BY|$)/is);
  if (!whereMatch) return [];

  const whereClause = whereMatch[1].trim();

  // Handle basic conditions: id = ?, email = ?, etc.
  // Use regex to find all placeholders (?)
  const placeholders = whereClause.match(/\?/g) || [];

  // For each placeholder, try to find the column name before it
  let lastIndex = 0;
  for (let i = 0; i < placeholders.length; i++) {
    const placeholderIndex = whereClause.indexOf('?', lastIndex);
    if (placeholderIndex === -1) break;

    // Look backwards to find the column name
    const beforePlaceholder = whereClause.substring(0, placeholderIndex);
    const lastPart = beforePlaceholder.trim().split(/\s+AND\s+/i).pop() || beforePlaceholder.trim().split(/\s+OR\s+/i).pop() || beforePlaceholder.trim();

    // Extract column name from condition like "id = ?" or "name LIKE ?"
    const colMatch = lastPart.match(/(\w+)\s*[=<>]+\s*$/i);
    if (colMatch) {
      conditions.push(colMatch[1]);
    } else {
      const likeMatch = lastPart.match(/(\w+)\s+LIKE\s*$/i);
      if (likeMatch) {
        conditions.push(likeMatch[1]);
      }
    }

    lastIndex = placeholderIndex + 1;
  }

  return conditions;
}

// ============================================================================
// STATEMENT EXECUTION
// ============================================================================

function executeAll(sql: string, params: unknown[]): DbRow[] {
  const tableName = parseTableName(sql);
  if (!tableName) return [];

  const table = getTable(tableName);
  let results: DbRow[] = [...table];

  // Debug logging
  if (process.env.DEBUG_MOCK_DB) {
    console.log('[MockDB] executeAll SQL:', sql);
    console.log('[MockDB] executeAll params:', params);
    console.log('[MockDB] executeAll tableName:', tableName);
  }

  // Parse WHERE conditions
  const whereMatch = sql.match(/WHERE\s+(.+?)(?:ORDER\s+BY|LIMIT|GROUP\s+BY|$)/is);
  if (whereMatch) {
    const whereClause = whereMatch[1].trim();

    // Find all placeholders (?) in WHERE clause
    const wherePlaceholders = (whereClause.match(/\?/g) || []).length;

    // Process conditions in order
    let paramIndex = 0;

    // Split by AND but keep OR conditions together
    const andParts = whereClause.split(/\s+AND\s+/i);

    for (const part of andParts) {
      if (paramIndex >= params.length || paramIndex >= wherePlaceholders) break;

      const condition = part.trim();

      // Handle LIKE condition
      if (condition.toLowerCase().includes('like') && condition.includes('?')) {
        const colMatch = condition.match(/(\w+)\s+like\s*\?/i);
        if (colMatch && typeof params[paramIndex] === 'string') {
          const colName = colMatch[1];
          const pattern = (params[paramIndex] as string).replace(/%/g, '.*');
          const regex = new RegExp(pattern, 'i');
          results = results.filter(row => regex.test(String(row[colName] || '')));
          paramIndex++;
        }
      }
      // Handle = condition
      else if (condition.includes('=') && condition.includes('?')) {
        const colMatch = condition.match(/(\w+)\s*=\s*\?/);
        if (colMatch) {
          const colName = colMatch[1];
          const value = params[paramIndex];
          results = results.filter(row => row[colName] === value);
          paramIndex++;
        }
      }
      // Handle < condition
      else if (condition.includes('<') && condition.includes('?')) {
        const colMatch = condition.match(/(\w+)\s*<\s*\?/);
        if (colMatch) {
          const colName = colMatch[1];
          const value = params[paramIndex];
          results = results.filter(row => {
            const rowVal = row[colName];
            if (rowVal === undefined || rowVal === null) return false;
            return new Date(String(rowVal)) < new Date(String(value as string | number | Date));
          });
          paramIndex++;
        }
      }
      // Handle > condition
      else if (condition.includes('>') && condition.includes('?')) {
        const colMatch = condition.match(/(\w+)\s*>\s*\?/);
        if (colMatch) {
          const colName = colMatch[1];
          const value = params[paramIndex];
          results = results.filter(row => {
            const rowVal = row[colName];
            if (rowVal === undefined || rowVal === null) return true;
            return new Date(String(rowVal)) > new Date(String(value as string | number | Date));
          });
          paramIndex++;
        }
      }
    }
  }

  // Parse ORDER BY
  const orderMatch = sql.match(/ORDER\s+BY\s+(\w+)(?:\s+(ASC|DESC))?/i);
  if (orderMatch) {
    const sortCol = orderMatch[1];
    const sortOrder = (orderMatch[2] || 'ASC').toUpperCase();

    results.sort((a, b) => {
      const valA = a[sortCol];
      const valB = b[sortCol];

      if (valA === undefined || valA === null) return sortOrder === 'ASC' ? 1 : -1;
      if (valB === undefined || valB === null) return sortOrder === 'ASC' ? -1 : 1;

      if (valA < valB) return sortOrder === 'ASC' ? -1 : 1;
      if (valA > valB) return sortOrder === 'ASC' ? 1 : -1;
      return 0;
    });
  }

  // Parse LIMIT and OFFSET - handle both numbers and placeholders
  const limitMatch = sql.match(/LIMIT\s+\?/i);
  const offsetMatch = sql.match(/OFFSET\s+\?/i);

  // If LIMIT or OFFSET use placeholders, extract them from params
  let limit: number | undefined = undefined;
  let offset: number = 0;

  if (limitMatch) {
    // Find params for LIMIT and OFFSET
    // Look for the last two params in the query (after WHERE and ORDER BY)
    const whereParamsCount = (sql.match(/\?/g) || []).length;

    if (whereParamsCount > 0 && params.length > 0) {
      // LIMIT is the second to last param, OFFSET is the last param
      // But we need to be careful about WHERE clause params
      const whereMatch = sql.match(/WHERE\s+(.+?)(?:ORDER\s+BY|LIMIT|GROUP\s+BY|$)/is);
      const whereParamsInQuery = whereMatch ? (whereMatch[1].match(/\?/g) || []).length : 0;

      if (params.length > whereParamsInQuery) {
        limit = params[whereParamsInQuery] as number;
        if (params.length > whereParamsInQuery + 1) {
          offset = params[whereParamsInQuery + 1] as number;
        }
      }
    }
  } else {
    // Fallback to numeric LIMIT/OFFSET
    const numericLimitMatch = sql.match(/LIMIT\s+(\d+)/i);
    const numericOffsetMatch = sql.match(/OFFSET\s+(\d+)/i);

    if (numericLimitMatch) {
      limit = parseInt(numericLimitMatch[1], 10);
    }
    if (numericOffsetMatch) {
      offset = parseInt(numericOffsetMatch[1], 10);
    }
  }

  if (process.env.DEBUG_MOCK_DB) {
    console.log('[MockDB] Before pagination - results length:', results.length);
    console.log('[MockDB] LIMIT:', limit, 'OFFSET:', offset);
  }

  if (offset > 0) {
    results = results.slice(offset);
  }

  if (limit !== undefined && limit > 0) {
    results = results.slice(0, limit);
  }

  if (process.env.DEBUG_MOCK_DB) {
    console.log('[MockDB] After pagination - results length:', results.length);
  }

  // Map rows to camelCase for project queries
  if (tableName === 'projects') {
    results = mapDbRows(results);
  }

  return results;
}

function executeGet(sql: string, params: unknown[]): DbRow | null {
  const normalizedSql = normalizeSql(sql).toUpperCase();

  // Handle COUNT(*) queries
  if (normalizedSql.includes('COUNT(*)')) {
    const tableName = parseTableName(sql);
    if (!tableName) return null;

    const table = getTable(tableName);

    // If there's a WHERE clause, filter
    const whereMatch = sql.match(/WHERE\s+(.+?)(?:ORDER\s+BY|LIMIT|GROUP\s+BY|$)/is);
    if (whereMatch) {
      const filteredResults = executeAll(sql, params);
      return { count: filteredResults.length } as DbRow;
    }

    return { count: table.length } as DbRow;
  }

  const results = executeAll(sql, params);
  return results.length > 0 ? mapDbRowToProject(results[0]) : null;
}

// Helper function to convert snake_case to camelCase
function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

// Helper function to convert camelCase to snake_case
function camelToSnake(str: string): string {
  return str.replace(/([A-Z])/g, '_$1').toLowerCase();
}

// Map database row to project object (camelCase fields)
function mapDbRowToProject(row: DbRow): DbRow {
  const mapped: DbRow = {};

  for (const [key, value] of Object.entries(row)) {
    // If key is snake_case, add camelCase version
    if (key.includes('_')) {
      mapped[snakeToCamel(key)] = value;
    }
    mapped[key] = value;
  }

  return mapped;
}

// Convert all rows in results
function mapDbRows(rows: DbRow[]): DbRow[] {
  return rows.map(mapDbRowToProject);
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

    // Map column names from snake_case to camelCase if needed
    const columnMap: Record<string, string> = {};
    for (const col of columns) {
      // Map snake_case to camelCase (owner_id -> ownerId, start_date -> startDate)
      const camelCol = col.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      columnMap[col] = camelCol;

      // Map camelCase to snake_case for backward compatibility
      columnMap[camelCol] = col;
    }

    columns.forEach((col, index) => {
      let value = params[index];

      // Handle SQLite datetime functions
      if (typeof value === 'string' && (value.includes('datetime(') || value.includes('(now)'))) {
        // Use incrementing timestamp for stable sorting in tests
        timestampCounter += 1000; // Add 1 second between inserts
        value = new Date(timestampCounter).toISOString();
      }
// Mock jose (JWT library) BEFORE mocking auth modules that depend on it
vi.mock('jose', () => ({
  SignJWT: vi.fn().mockImplementation(function() {
    return {
      setProtectedHeader: vi.fn().mockReturnThis(),
      setIssuedAt: vi.fn().mockReturnThis(),
      setExpirationTime: vi.fn().mockReturnThis(),
      setIssuer: vi.fn().mockReturnThis(),
      setAudience: vi.fn().mockReturnThis(),
      sign: vi.fn().mockResolvedValue('mock-jwt-token'),
    };
  }),
  jwtVerify: vi.fn().mockResolvedValue({
    payload: {
      sub: 'test-user-id',
      email: 'test@example.com',
      role: 'admin',
      roles: ['admin'],
      permissions: ['admin:all'],
      customPermissions: [],
      type: 'user',
    },
  }),
}));


      newRow[col] = value;
    });

    // Auto-generate ID if not provided (as integer for projects)
    if (!newRow.id) {
      newRow.id = table.length + 1;
    }

    // Set default timestamps if columns exist
    if (columns.some(c => c.includes('created_at') || c.includes('createdAt'))) {
      if (!newRow.created_at && !newRow.createdAt) {
        timestampCounter += 1000;
        const now = new Date(timestampCounter).toISOString();
        newRow.created_at = now;
        newRow.createdAt = now;
      }
    }
    if (columns.some(c => c.includes('updated_at') || c.includes('updatedAt'))) {
      if (!newRow.updated_at && !newRow.updatedAt) {
        timestampCounter += 1000;
        const now = new Date(timestampCounter).toISOString();
        newRow.updated_at = now;
        newRow.updatedAt = now;
      }
    }

    table.push(newRow);

    return {
      changes: 1,
      lastInsertRowid: Number(newRow.id) || 1,
    };
  }

  // UPDATE
  if (normalizedSql.startsWith('UPDATE')) {
    const setColumns = parseUpdateSets(sql);
    if (!setColumns) return { changes: 0, lastInsertRowid: undefined };

    const updates: DbRow = {};
    let paramIndex = 0;

    for (const setCol of setColumns) {
      // Handle datetime("now") function
      const datetimeMatch = setCol.match(/(\w+)\s*=\s*datetime\(['"]now['"]\)/i);
      if (datetimeMatch) {
        const colName = datetimeMatch[1];
        updates[colName] = new Date().toISOString();
      } else if (setCol.includes('?')) {
        const colName = setCol.split('=')[0].trim();
        updates[colName] = params[paramIndex];
        paramIndex++;
      }
    }

    const whereParams = params.slice(paramIndex);

    // Find WHERE clause and parse ID
    const whereMatch = sql.match(/WHERE\s+(.+?)(?:ORDER\s+BY|LIMIT|$)/is);
    if (!whereMatch) return { changes: 0, lastInsertRowid: undefined };

    const whereClause = whereMatch[1].trim();

    // Handle simple WHERE id = ?
    const idMatch = whereClause.match(/id\s*=\s*\?/i);
    if (idMatch) {
      const id = whereParams[0];
      let changes = 0;

      for (const row of table) {
        if (row.id === id) {
          // Apply updates
          for (const [key, value] of Object.entries(updates)) {
            row[key] = value;
          }
          changes++;
        }
      }

      return { changes, lastInsertRowid: undefined };
    }

    return { changes: 0, lastInsertRowid: undefined };
  }

  // DELETE
  if (normalizedSql.startsWith('DELETE')) {
    const whereMatch = sql.match(/WHERE\s+(.+?)(?:ORDER\s+BY|LIMIT|$)/is);
    if (!whereMatch) return { changes: 0, lastInsertRowid: undefined };

    const whereClause = whereMatch[1].trim();
    const idMatch = whereClause.match(/id\s*=\s*\?/i);

    if (idMatch) {
      const id = params[0];
      const initialLength = table.length;

      for (let i = table.length - 1; i >= 0; i--) {
        if (table[i].id === id) {
          table.splice(i, 1);
        }
      }

      return { changes: initialLength - table.length, lastInsertRowid: undefined };
    }

    return { changes: 0, lastInsertRowid: undefined };
  }

  return { changes: 0, lastInsertRowid: undefined };
}

// ============================================================================
// MOCK DATABASE
// ============================================================================

const mockDb: DatabaseConnection = {
  query: vi.fn(),

  exec: vi.fn((sql: string) => {
    const normalizedSql = normalizeSql(sql).toUpperCase();

    // Handle CREATE TABLE
    if (normalizedSql.includes('CREATE TABLE')) {
      const match = sql.match(/CREATE TABLE\s+IF NOT EXISTS\s+(\w+)/i);
      if (!match) {
        const simpleMatch = sql.match(/CREATE TABLE\s+(\w+)/i);
        if (simpleMatch) {
          const tableName = simpleMatch[1];
          if (!dbTables.has(tableName)) {
            dbTables.set(tableName, []);
          }
        }
      } else {
        const tableName = match[1];
        if (!dbTables.has(tableName)) {
          dbTables.set(tableName, []);
        }
      }
    }

    // Handle CREATE INDEX
    if (normalizedSql.includes('CREATE INDEX')) {
      // Ignore index creation for mock
    }

    return { changes: 1, lastInsertRowid: 1 };
  }),

  prepare: vi.fn((sql: string) => {
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

  batch: vi.fn((statements: Array<{ sql: string; params?: unknown[] }>) => {
    const results: DatabaseResult[] = [];
    for (const { sql, params } of statements) {
      results.push(executeRun(sql, params || []));
    }
    return Promise.resolve(results);
  }),

  queryRows: vi.fn(),
};

// ============================================================================
// MOCK THE DATABASE MODULE
// ============================================================================

vi.mock('@/lib/db/index', () => ({
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
// MOCK LOGGER MODULE
// ============================================================================

vi.mock('@/lib/logger/index', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fatal: vi.fn(),
  },
  default: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fatal: vi.fn(),
  },
  LogLevel: {
    DEBUG: 'debug',
    INFO: 'info',
    WARN: 'warn',
    ERROR: 'error',
    FATAL: 'fatal',
  } as const,
}));

vi.mock('@/lib/logger', () => ({
  default: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fatal: vi.fn(),
  },
}));

// ============================================================================
// MOCK AUTH MODULES
// ============================================================================

vi.mock('@/lib/auth/jwt', () => ({
  verifyToken: vi.fn(),
}));

vi.mock('@/lib/auth/service', () => ({
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
  loginUser: vi.fn().mockResolvedValue({
    success: true,
    user: {
      id: 'user_test_1',
      email: 'test@example.com',
      name: 'Test User',
      role: 'member',
      status: 'active',
      permissions: [],
      metadata: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    token: 'access_token_test',
    refreshToken: 'refresh_token_test',
    expiresAt: new Date(Date.now() + 3600000),
  }),
}));

vi.mock('@/lib/auth/repository', () => ({
  hashPassword: vi.fn(),
  verifyPassword: vi.fn(),
  initializeUserTables: vi.fn().mockResolvedValue(undefined),
  createUser: vi.fn(),
  getUserById: vi.fn(),
  getUserByEmail: vi.fn(),
  getAllUsers: vi.fn().mockResolvedValue([]),
  updateUser: vi.fn(),
  deleteUser: vi.fn(),
  createUserToken: vi.fn(),
  validateUserToken: vi.fn(),
  getUserByRefreshToken: vi.fn(),
  refreshUserToken: vi.fn(),
  revokeUserToken: vi.fn(),
  revokeAllUserTokens: vi.fn(),
  updateLastLogin: vi.fn(),
  createPasswordResetToken: vi.fn(),
  validatePasswordResetToken: vi.fn(),
  deletePasswordResetToken: vi.fn(),
  getDefaultPermissions: vi.fn(),
}));

vi.mock('@/middleware/auth', () => ({
  withAuth: vi.fn().mockImplementation(async (request, handler) => {
    const userId = 'test-user-123';
    const headers = new Headers({
      'X-User-Id': userId,
      'X-User-Email': 'test@example.com',
      'X-User-Name': 'Test User',
      'X-User-Role': 'admin',
    });
    const modifiedRequest = {
      ...request,
      headers,
    };
    return handler(modifiedRequest as Request, {
      userId,
      email: 'test@example.com',
      name: 'Test User',
      role: 'admin',
    });
  }),
}));

vi.mock('@/lib/auth/middleware-rbac', () => ({
  withUserAuth: vi.fn().mockImplementation(async (request, handler) => {
    return handler(request, {
      userId: 'test-user-123',
      email: 'test@example.com',
      name: 'Test User',
      role: 'admin',
      roles: ['admin'],
      permissions: ['admin:all'],
      requestId: 'test-request-id',
      permissionContext: {
        userId: 'test-user-123',
        roles: [{ id: 'role_admin', name: 'Admin', permissions: ['admin:all'] }],
        permissions: ['admin:all'],
        customPermissions: [],
      },
    });
  }),
  withAdmin: vi.fn().mockImplementation(async (request, handler) => {
    return handler(request, {
      userId: 'test-user-123',
      email: 'test@example.com',
      name: 'Test User',
      role: 'admin',
      roles: ['admin'],
      permissions: ['admin:all'],
      requestId: 'test-request-id',
      permissionContext: {
        userId: 'test-user-123',
        roles: [{ id: 'role_admin', name: 'Admin', permissions: ['admin:all'] }],
        permissions: ['admin:all'],
        customPermissions: [],
      },
    });
  }),
  withRole: vi.fn().mockImplementation(() => vi.fn().mockImplementation(async (request, handler) => {
    return handler(request, {
      userId: 'test-user-123',
      email: 'test@example.com',
      name: 'Test User',
      role: 'admin',
      roles: ['admin'],
      permissions: ['admin:all'],
      requestId: 'test-request-id',
      permissionContext: {
        userId: 'test-user-123',
        roles: [{ id: 'role_admin', name: 'Admin', permissions: ['admin:all'] }],
        permissions: ['admin:all'],
        customPermissions: [],
      },
    });
  })),
  withPermissions: vi.fn().mockImplementation(() => vi.fn().mockImplementation(async (request, handler) => {
    return handler(request, {
      userId: 'test-user-123',
      email: 'test@example.com',
      name: 'Test User',
      role: 'admin',
      roles: ['admin'],
      permissions: ['admin:all'],
      requestId: 'test-request-id',
      permissionContext: {
        userId: 'test-user-123',
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
      userId: 'test-user-123',
      email: 'test@example.com',
      name: 'Test User',
      role: 'admin',
      roles: ['admin'],
      permissions: ['admin:all'],
      requestId: 'test-request-id',
      permissionContext: {
        userId: 'test-user-123',
        roles: [{ id: 'role_admin', name: 'Admin', permissions: ['admin:all'] }],
        permissions: ['admin:all'],
        customPermissions: [],
      },
    });
  }),
}));

vi.mock('@/lib/permissions/repository', () => ({
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
// EXPORTED HELPERS FOR TESTS
// ============================================================================

export function getDbTables(): Map<string, DbRow[]> {
  return dbTables;
}

export function getTableData(tableName: string): DbRow[] {
  return getTable(tableName);
}

export function insertTestRow(tableName: string, data: DbRow): DbRow {
  const table = getTable(tableName);
  if (!data.id) {
    data.id = generateId(tableName);
  }
  table.push({ ...data });
  return data;
}

export function clearAllTables(): void {
  for (const tableName of dbTables.keys()) {
    dbTables.set(tableName, []);
  }
}

export function clearTable(tableName: string): void {
  if (dbTables.has(tableName)) {
    dbTables.set(tableName, []);
  }
}

export function getMockDb(): DatabaseConnection {
  return mockDb;
}

// ============================================================================
// RESET BETWEEN TESTS
// ============================================================================

beforeEach(() => {
  vi.clearAllMocks();
  clearAllTables();

  dbTables.set('users', []);
  dbTables.set('user_tokens', []);
  dbTables.set('password_reset_tokens', []);
  dbTables.set('tasks', []);
  dbTables.set('projects', []);
});
