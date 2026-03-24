/**
 * User Repository - Database operations for users
 */

import { getDatabaseAsync } from '../db';
import {
  User,
  UserStatus,
  UserRole,
  UserToken,
  CreateUserRequest,
  UpdateUserRequest,
} from './types';
import { Role } from '@/lib/permissions/types';
import * as crypto from 'crypto';

/**
 * Hash password
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

/**
 * Verify password
 */
export function verifyPassword(password: string, hashedPassword: string): boolean {
  const [salt, hash] = hashedPassword.split(':');
  const verifyHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return hash === verifyHash;
}

/**
 * Generate unique ID
 */
function generateId(prefix: string = 'user'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate secure token
 */
function generateSecureToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Initialize user tables
 */
export async function initializeUserTables(): Promise<void> {
  const db = await getDatabaseAsync();

  const statements = [
    // Users table
    `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      avatar TEXT,
      role TEXT NOT NULL DEFAULT 'member',
      roles TEXT DEFAULT '[]',
      status TEXT NOT NULL DEFAULT 'active',
      permissions TEXT DEFAULT '[]',
      custom_permissions TEXT DEFAULT '[]',
      metadata TEXT DEFAULT '{}',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      last_login_at TEXT
    );`,

    // User tokens table
    `CREATE TABLE IF NOT EXISTS user_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token TEXT UNIQUE NOT NULL,
      refresh_token TEXT UNIQUE NOT NULL,
      expires_at TEXT NOT NULL,
      refresh_expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      last_used_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );`,

    // Password reset tokens table
    `CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token TEXT UNIQUE NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );`,

    // Indexes for better query performance
    `CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);`,
    `CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);`,
    `CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);`,
    `CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login_at DESC);`,
    
    // Token indexes
    `CREATE INDEX IF NOT EXISTS idx_user_tokens_user_id ON user_tokens(user_id);`,
    `CREATE INDEX IF NOT EXISTS idx_user_tokens_token ON user_tokens(token);`,
    `CREATE INDEX IF NOT EXISTS idx_user_tokens_expires ON user_tokens(expires_at);`,
    
    // Password reset token indexes
    `CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);`,
    `CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);`,
    `CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires ON password_reset_tokens(expires_at);`,
  ];

  for (const statement of statements) {
    try {
      db.exec(statement);
    } catch (error) {
      if (!(error instanceof Error && error.message.includes('already exists'))) {
        throw error;
      }
    }
  }
}

/**
 * Create user
 */
export async function createUser(data: CreateUserRequest): Promise<User> {
  const db = await getDatabaseAsync();
  await initializeUserTables();

  const id = generateId('user');
  const now = new Date().toISOString();
  const hashedPassword = hashPassword(data.password);

  const stmt = db.prepare(`
    INSERT INTO users (id, email, password, name, role, roles, status, permissions, custom_permissions, metadata, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    data.email,
    hashedPassword,
    data.name,
    data.role || UserRole.MEMBER,
    JSON.stringify(data.roles || []),
    UserStatus.ACTIVE,
    JSON.stringify(data.permissions || getDefaultPermissions(data.role || UserRole.MEMBER)),
    JSON.stringify(data.customPermissions || []),
    JSON.stringify(data.metadata || {}),
    now,
    now
  );

  return {
    id,
    email: data.email,
    password: hashedPassword,
    name: data.name,
    role: data.role || UserRole.MEMBER,
    roles: data.roles || [],
    status: UserStatus.ACTIVE,
    permissions: data.permissions || getDefaultPermissions(data.role || UserRole.MEMBER),
    customPermissions: data.customPermissions,
    metadata: data.metadata || {},
    createdAt: new Date(now),
    updatedAt: new Date(now),
  };
}

/**
 * Get user by ID
 */
export async function getUserById(id: string): Promise<User | null> {
  const db = await getDatabaseAsync();
  await initializeUserTables();

  const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
  const row = stmt.get(id) as Record<string, unknown> | undefined;

  if (!row) return null;

  return mapRowToUser(row);
}

/**
 * Get user by email
 */
export async function getUserByEmail(email: string): Promise<User | null> {
  const db = await getDatabaseAsync();
  await initializeUserTables();

  const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
  const row = stmt.get(email) as Record<string, unknown> | undefined;

  if (!row) return null;

  return mapRowToUser(row);
}

/**
 * Pagination options
 */
export interface PaginationOptions {
  limit?: number;
  offset?: number;
}

/**
 * Paginated result
 */
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

/**
 * Get all users with pagination - OPTIMIZED
 *
 * Optimizations:
 * 1. Default pagination limit (100 records)
 * 2. Maximum limit (1000 records) to prevent abuse
 * 3. Pagination metadata support for frontend UI
 */
export async function getAllUsers(options?: {
  status?: UserStatus;
  role?: UserRole;
  limit?: number;
  offset?: number;
}): Promise<User[]> {
  const db = await getDatabaseAsync();
  await initializeUserTables();

  // Default pagination limits
  const defaultLimit = 100;
  const maxLimit = 1000;
  const limit = Math.min(options?.limit ?? defaultLimit, maxLimit);
  const offset = options?.offset ?? 0;

  let sql = 'SELECT * FROM users';
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (options?.status) {
    conditions.push('status = ?');
    params.push(options.status);
  }
  if (options?.role) {
    conditions.push('role = ?');
    params.push(options.role);
  }

  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }

  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const stmt = db.prepare(sql);
  const rows = stmt.all(...params) as unknown as Record<string, unknown>[];

  return rows.map(mapRowToUser);
}

/**
 * Get all users with pagination metadata - NEW
 *
 * Returns paginated result with metadata for frontend pagination UI
 */
export async function getAllUsersPaginated(options?: {
  status?: UserStatus;
  role?: UserRole;
  limit?: number;
  offset?: number;
}): Promise<PaginatedResult<User>> {
  const users = await getAllUsers(options);
  const total = await getUsersCount(options);
  const limit = Math.min(options?.limit ?? 100, 1000);
  const offset = options?.offset ?? 0;

  return {
    data: users,
    total,
    limit,
    offset,
    hasMore: offset + users.length < total,
  };
}

/**
 * Get users count - NEW
 *
 * Get total user count for pagination
 */
export async function getUsersCount(options?: {
  status?: UserStatus;
  role?: UserRole;
}): Promise<number> {
  const db = await getDatabaseAsync();
  await initializeUserTables();

  let sql = 'SELECT COUNT(*) as count FROM users';
  const conditions: string[] = [];
  const params: string[] = [];

  if (options?.status) {
    conditions.push('status = ?');
    params.push(options.status);
  }
  if (options?.role) {
    conditions.push('role = ?');
    params.push(options.role);
  }

  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }

  const stmt = db.prepare(sql);
  const result = stmt.get(...params) as { count: number };
  return result.count;
}

/**
 * Update user
 */
export async function updateUser(id: string, data: UpdateUserRequest): Promise<User | null> {
  const db = await getDatabaseAsync();
  await initializeUserTables();

  const user = await getUserById(id);
  if (!user) return null;

  const updates: string[] = [];
  const values: (string | null)[] = [];

  if (data.name !== undefined) {
    updates.push('name = ?');
    values.push(data.name);
  }
  if (data.avatar !== undefined) {
    updates.push('avatar = ?');
    values.push(data.avatar);
  }
  if (data.role !== undefined) {
    updates.push('role = ?');
    values.push(data.role);
  }
  if (data.roles !== undefined) {
    updates.push('roles = ?');
    values.push(JSON.stringify(data.roles));
  }
  if (data.status !== undefined) {
    updates.push('status = ?');
    values.push(data.status);
  }
  if (data.permissions !== undefined) {
    updates.push('permissions = ?');
    values.push(JSON.stringify(data.permissions));
  }
  if (data.customPermissions !== undefined) {
    updates.push('custom_permissions = ?');
    values.push(JSON.stringify(data.customPermissions));
  }
  if (data.metadata !== undefined) {
    updates.push('metadata = ?');
    values.push(JSON.stringify(data.metadata));
  }
  if (data.password !== undefined) {
    updates.push('password = ?');
    values.push(hashPassword(data.password));
  }

  if (updates.length === 0) return user;

  updates.push('updated_at = ?');
  values.push(new Date().toISOString());
  values.push(id);

  const stmt = db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`);
  stmt.run(...values);

  return getUserById(id);
}

/**
 * Delete user
 */
export async function deleteUser(id: string): Promise<boolean> {
  const db = await getDatabaseAsync();
  await initializeUserTables();

  const stmt = db.prepare('DELETE FROM users WHERE id = ?');
  const result = stmt.run(id);

  return (result.changes ?? 0) > 0;
}

/**
 * Create user token
 */
export async function createUserToken(
  userId: string,
  expiresInHours: number = 24
): Promise<UserToken> {
  const db = await getDatabaseAsync();
  await initializeUserTables();

  const id = generateId('token');
  const now = new Date();
  const expiresAt = new Date(now.getTime() + expiresInHours * 60 * 60 * 1000);
  const refreshExpiresAt = new Date(now.getTime() + expiresInHours * 2 * 60 * 60 * 1000);

  const token = generateSecureToken();
  const refreshToken = generateSecureToken();

  const stmt = db.prepare(`
    INSERT INTO user_tokens (id, user_id, token, refresh_token, expires_at, refresh_expires_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    userId,
    token,
    refreshToken,
    expiresAt.toISOString(),
    refreshExpiresAt.toISOString(),
    now.toISOString()
  );

  return {
    id,
    userId,
    token,
    refreshToken,
    expiresAt,
    refreshExpiresAt,
    createdAt: now,
  };
}

/**
 * Validate user token
 */
export async function validateUserToken(token: string): Promise<{ user: User; token: UserToken } | null> {
  const db = await getDatabaseAsync();
  await initializeUserTables();

  const stmt = db.prepare('SELECT * FROM user_tokens WHERE token = ?');
  const row = stmt.get(token) as Record<string, unknown> | undefined;

  if (!row) return null;

  const expiresAt = new Date(row.expires_at as string);
  if (expiresAt < new Date()) return null;

  // Update last used time
  const updateStmt = db.prepare('UPDATE user_tokens SET last_used_at = ? WHERE id = ?');
  updateStmt.run(new Date().toISOString(), row.id);

  const user = await getUserById(row.user_id as string);
  if (!user || user.status !== UserStatus.ACTIVE) return null;

  return {
    user,
    token: {
      id: row.id as string,
      userId: row.user_id as string,
      token: row.token as string,
      refreshToken: row.refresh_token as string,
      expiresAt,
      refreshExpiresAt: new Date(row.refresh_expires_at as string),
      createdAt: new Date(row.created_at as string),
      lastUsedAt: row.last_used_at ? new Date(row.last_used_at as string) : undefined,
    },
  };
}

/**
 * Get user and token by refresh token (for validation before refresh)
 */
export async function getUserByRefreshToken(refreshToken: string): Promise<{ user: User; token: UserToken } | null> {
  const db = await getDatabaseAsync();
  await initializeUserTables();

  const stmt = db.prepare('SELECT * FROM user_tokens WHERE refresh_token = ?');
  const row = stmt.get(refreshToken) as Record<string, unknown> | undefined;

  if (!row) return null;

  const user = await getUserById(row.user_id as string);
  if (!user) return null;

  return {
    user,
    token: {
      id: row.id as string,
      userId: row.user_id as string,
      token: row.token as string,
      refreshToken: row.refresh_token as string,
      expiresAt: new Date(row.expires_at as string),
      refreshExpiresAt: new Date(row.refresh_expires_at as string),
      createdAt: new Date(row.created_at as string),
      lastUsedAt: row.last_used_at ? new Date(row.last_used_at as string) : undefined,
    },
  };
}

/**
 * Refresh user token with improved race condition handling
 */
export async function refreshUserToken(refreshToken: string): Promise<UserToken | null> {
  const db = await getDatabaseAsync();
  await initializeUserTables();

  const stmt = db.prepare('SELECT * FROM user_tokens WHERE refresh_token = ?');
  const row = stmt.get(refreshToken) as Record<string, unknown> | undefined;

  if (!row) return null;

  const refreshExpiresAt = new Date(row.refresh_expires_at as string);
  if (refreshExpiresAt < new Date()) {
    // Delete expired token
    const deleteStmt = db.prepare('DELETE FROM user_tokens WHERE id = ?');
    deleteStmt.run(row.id);
    return null;
  }

  // Check if token was already used (race condition protection)
  const now = new Date();
  const lastUsedAt = row.last_used_at ? new Date(row.last_used_at as string) : null;
  
  // If token was used in the last 5 seconds, it might be a duplicate refresh request
  if (lastUsedAt && (now.getTime() - lastUsedAt.getTime()) < 5000) {
    return null;
  }

  // Update last used timestamp before creating new token
  const updateStmt = db.prepare('UPDATE user_tokens SET last_used_at = ? WHERE id = ?');
  updateStmt.run(now.toISOString(), row.id);

  // Create new token
  const newToken = await createUserToken(row.user_id as string);

  // Delete old token
  const deleteStmt = db.prepare('DELETE FROM user_tokens WHERE id = ?');
  deleteStmt.run(row.id);

  return newToken;
}

/**
 * Revoke user token
 */
export async function revokeUserToken(token: string): Promise<boolean> {
  const db = await getDatabaseAsync();
  await initializeUserTables();

  const stmt = db.prepare('DELETE FROM user_tokens WHERE token = ?');
  const result = stmt.run(token);

  return (result.changes ?? 0) > 0;
}

/**
 * Revoke all user tokens
 */
export async function revokeAllUserTokens(userId: string): Promise<void> {
  const db = await getDatabaseAsync();
  await initializeUserTables();

  const stmt = db.prepare('DELETE FROM user_tokens WHERE user_id = ?');
  stmt.run(userId);
}

/**
 * Update last login
 */
export async function updateLastLogin(userId: string): Promise<void> {
  const db = await getDatabaseAsync();
  await initializeUserTables();

  const stmt = db.prepare('UPDATE users SET last_login_at = ? WHERE id = ?');
  stmt.run(new Date().toISOString(), userId);
}

/**
 * Create password reset token
 */
export async function createPasswordResetToken(userId: string, expiresInHours: number = 1): Promise<string> {
  const db = await getDatabaseAsync();
  await initializeUserTables();

  const id = generateId('reset');
  const now = new Date();
  const expiresAt = new Date(now.getTime() + expiresInHours * 60 * 60 * 1000);
  const token = generateSecureToken();

  const stmt = db.prepare(`
    INSERT INTO password_reset_tokens (id, user_id, token, expires_at, created_at)
    VALUES (?, ?, ?, ?, ?)
  `);

  stmt.run(id, userId, token, expiresAt.toISOString(), now.toISOString());

  return token;
}

/**
 * Validate password reset token
 */
export async function validatePasswordResetToken(token: string): Promise<User | null> {
  const db = await getDatabaseAsync();
  await initializeUserTables();

  const stmt = db.prepare('SELECT * FROM password_reset_tokens WHERE token = ?');
  const row = stmt.get(token) as Record<string, unknown> | undefined;

  if (!row) return null;

  const expiresAt = new Date(row.expires_at as string);
  if (expiresAt < new Date()) return null;

  const user = await getUserById(row.user_id as string);
  if (!user) return null;

  return user;
}

/**
 * Delete password reset token
 */
export async function deletePasswordResetToken(token: string): Promise<void> {
  const db = await getDatabaseAsync();
  await initializeUserTables();

  const stmt = db.prepare('DELETE FROM password_reset_tokens WHERE token = ?');
  stmt.run(token);
}

/**
 * Get default permissions for a role
 */
export function getDefaultPermissions(role: UserRole): string[] {
  const basePermissions = ['read:profile', 'read:tasks'];

  switch (role) {
    case UserRole.ADMIN:
      return [
        ...basePermissions,
        'write:tasks',
        'delete:tasks',
        'write:users',
        'delete:users',
        'manage:system',
        'manage:team',
        'access:logs',
        'access:reports',
      ];

    case UserRole.MANAGER:
      return [
        ...basePermissions,
        'write:tasks',
        'delete:tasks',
        'manage:team',
        'access:reports',
      ];

    case UserRole.MEMBER:
      return [
        ...basePermissions,
        'write:tasks',
        'update:tasks',
      ];

    case UserRole.GUEST:
      return ['read:profile'];

    default:
      return basePermissions;
  }
}

/**
 * Map database row to User object
 */
/**
 * Map database row to User object with enhanced type safety
 * Includes runtime validation to prevent type-related bugs
 */
function mapRowToUser(row: Record<string, unknown>): User {
  // Validate required fields exist
  const requiredFields = ['id', 'email', 'password', 'name', 'role', 'status'];
  for (const field of requiredFields) {
    if (row[field] === undefined || row[field] === null) {
      throw new Error(`Missing required field: ${field}`);
    }
  }

  // Type-safe parsing helpers
  const parseStringArray = (value: unknown, defaultValue: string[] = []): string[] => {
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : defaultValue;
      } catch {
        return defaultValue;
      }
    }
    return Array.isArray(value) ? value : defaultValue;
  };

  const parseRecord = (value: unknown, defaultValue: Record<string, unknown> = {}): Record<string, unknown> => {
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed) ? parsed : defaultValue;
      } catch {
        return defaultValue;
      }
    }
    return typeof value === 'object' && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : defaultValue;
  };

  const parseDate = (value: unknown): Date | undefined => {
    if (typeof value === 'string') {
      const date = new Date(value);
      return isNaN(date.getTime()) ? undefined : date;
    }
    return undefined;
  };

  // Validate role enum
  const role = row.role as string;
  const validRoles = Object.values(UserRole);
  if (!validRoles.includes(role as UserRole)) {
    throw new Error(`Invalid role: ${role}`);
  }

  // Validate status enum
  const status = row.status as string;
  const validStatuses = Object.values(UserStatus);
  if (!validStatuses.includes(status as UserStatus)) {
    throw new Error(`Invalid status: ${status}`);
  }

  return {
    id: row.id as string,
    email: row.email as string,
    password: row.password as string,
    name: row.name as string,
    avatar: row.avatar as string | undefined,
    role: role as UserRole,
    roles: (parseStringArray(row.roles) as unknown) as Role[],
    status: status as UserStatus,
    permissions: parseStringArray(row.permissions),
    customPermissions: parseStringArray(row.custom_permissions),
    metadata: parseRecord(row.metadata),
    createdAt: parseDate(row.created_at) || new Date(),
    updatedAt: parseDate(row.updated_at) || new Date(),
    lastLoginAt: parseDate(row.last_login_at),
  };
}
