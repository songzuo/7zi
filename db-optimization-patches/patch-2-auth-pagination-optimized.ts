/**
 * PATCH 2: 添加分页限制 - 防止无限制查询
 *
 * 文件: src/lib/auth/repository.ts
 * 问题: getAllUsers() 没有分页限制，可能返回大量数据
 * 优化: 添加默认分页限制（100 条）和最大限制（1000 条），新增 getCount 函数
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
 * 分页选项
 */
export interface PaginationOptions {
  limit?: number;
  offset?: number;
}

/**
 * 分页结果
 */
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
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
 * Get all users with pagination - OPTIMIZED
 *
 * 优化点:
 * 1. 添加默认分页限制（100 条记录）
 * 2. 设置最大限制（1000 条）防止滥用
 * 3. 添加分页元数据支持前端分页 UI
 */
export async function getAllUsers(options?: {
  status?: UserStatus;
  role?: UserRole;
  limit?: number;
  offset?: number;
}): Promise<User[]> {
  const db = await getDatabaseAsync();
  await initializeUserTables();

  // 默认分页限制
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
 * 返回包含分页元数据的结果，便于前端实现分页 UI
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
 * 获取用户总数，用于分页
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

// ... [其余函数保持不变] ...

/**
 * Helper: Map database row to User object
 */
function mapRowToUser(row: Record<string, unknown>): User {
  return {
    id: row.id as string,
    email: row.email as string,
    password: row.password as string,
    name: row.name as string,
    avatar: row.avatar as string | undefined,
    role: row.role as UserRole,
    roles: JSON.parse((row.roles as string) || '[]'),
    status: row.status as UserStatus,
    permissions: JSON.parse((row.permissions as string) || '[]'),
    customPermissions: JSON.parse((row.custom_permissions as string) || '[]'),
    metadata: JSON.parse((row.metadata as string) || '{}'),
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
    lastLoginAt: row.last_login_at ? new Date(row.last_login_at as string) : undefined,
  };
}

/**
 * Helper: Get default permissions for a role
 */
function getDefaultPermissions(role: UserRole): string[] {
  // Default permissions based on role
  switch (role) {
    case UserRole.ADMIN:
      return ['*']; // Full access
    case UserRole.MANAGER:
      return [
        'user:read',
        'user:update',
        'user:delete',
        'role:read',
        'role:assign',
      ];
    case UserRole.MEMBER:
      return ['user:read'];
    default:
      return [];
  }
}
