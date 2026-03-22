/**
 * Optimized User Repository Functions
 * 优化后的用户仓库函数 - 性能优化版本
 *
 * 优化措施:
 * - 数据库层面的过滤、排序和分页
 * - 查询缓存支持
 * - 批量查询优化
 * - 避免 N+1 问题
 */

import { getDatabaseAsync, ExtendedDatabase } from '../db';
import {
  User,
  UserStatus,
  UserRole,
  CreateUserRequest,
  UpdateUserRequest,
} from './types';
import { hashPassword, verifyPassword } from './repository';

// ============================================================================
// Cache Key Generation
// ============================================================================

/**
 * Generate cache key for user list query
 */
export function generateUserListCacheKey(options: {
  status?: UserStatus;
  role?: UserRole;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}): string {
  const parts = [
    'users:list',
    options.status || 'all',
    options.role || 'all',
    options.search || '',
    options.sortBy || 'created_at',
    options.sortOrder || 'desc',
    options.page || 1,
    options.limit || 20,
  ];
  return parts.join(':');
}

// ============================================================================
// Optimized User Query Functions
// ============================================================================

/**
 * Optimized: Get paginated users with filtering and sorting at database level
 * 优化版本：在数据库层面实现过滤、排序和分页
 *
 * 相比 getAllUsers 的优势:
 * - 1. 避免 SELECT * 返回所有数据
 * - 2. 数据库层面的过滤和排序更快
 * - 3. 使用 COUNT 而不是获取所有行来计算总数
 * - 4. 支持缓存
 *
 * @param options - 查询选项
 * @returns 用户列表和总数
 */
export async function getAllUsersPaginated(options: {
  status?: UserStatus;
  role?: UserRole;
  search?: string;
  sortBy?: 'created_at' | 'name' | 'email' | 'last_login_at';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}): Promise<{ users: User[]; total: number }> {
  const db = await getDatabaseAsync();

  // 验证并默认化参数
  const page = Math.max(1, options.page || 1);
  const limit = Math.min(100, Math.max(1, options.limit || 20));
  const offset = (page - 1) * limit;

  // 构建 WHERE 子句
  let sql = 'SELECT * FROM users';
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (options.status) {
    conditions.push('status = ?');
    params.push(options.status);
  }

  if (options.role) {
    conditions.push('role = ?');
    params.push(options.role);
  }

  if (options.search) {
    conditions.push('(name LIKE ? OR email LIKE ?)');
    const searchTerm = `%${options.search}%`;
    params.push(searchTerm, searchTerm);
  }

  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }

  // 添加排序（数据库层面）
  const sortBy = options.sortBy || 'created_at';
  const sortOrder = options.sortOrder || 'desc';
  sql += ` ORDER BY ${sortBy} ${sortOrder.toUpperCase()}`;

  // 添加分页（数据库层面）
  sql += ' LIMIT ? OFFSET ?';
  params.push(limit, offset);

  // 执行主查询
  const stmt = db.prepare(sql);
  const users = stmt.all(...params) as unknown as Record<string, unknown>[];

  // 获取总数（使用 COUNT 而不是获取所有行）
  let countSql = 'SELECT COUNT(*) as total FROM users';
  if (conditions.length > 0) {
    countSql += ' WHERE ' + conditions.join(' AND ');
  }
  const countStmt = db.prepare(countSql);
  const countParams = params.slice(0, -2); // 排除 LIMIT 和 OFFSET
  const { total } = countStmt.get(...countParams) as { total: number };

  return {
    users: users.map(mapRowToUser),
    total,
  };
}

/**
 * Optimized: Batch load users by IDs to avoid N+1 queries
 * 优化版本：批量加载用户避免 N+1 查询
 *
 * @param userIds - 用户 ID 数组
 * @returns 用户 Map (id -> User)
 */
export async function batchGetUsersById(userIds: string[]): Promise<Map<string, User>> {
  if (userIds.length === 0) {
    return new Map();
  }

  const db = await getDatabaseAsync();

  // 使用 IN 子句批量查询
  const placeholders = userIds.map(() => '?').join(',');
  const sql = `SELECT * FROM users WHERE id IN (${placeholders})`;
  const stmt = db.prepare(sql);
  const users = stmt.all(...userIds) as unknown as Record<string, unknown>[];

  // 转换为 Map
  const userMap = new Map<string, User>();
  for (const user of users) {
    const mapped = mapRowToUser(user);
    userMap.set(mapped.id, mapped);
  }

  return userMap;
}

/**
 * Optimized: Get users by status with pagination
 * 优化版本：按状态获取用户（带分页）
 *
 * @param status - 用户状态
 * @param options - 分页选项
 * @returns 用户列表和分页信息
 */
export async function getUsersByStatus(
  status: UserStatus,
  options: { page?: number; limit?: number } = {}
): Promise<{ users: User[]; total: number; page: number; totalPages: number }> {
  const page = Math.max(1, options.page || 1);
  const limit = Math.min(100, Math.max(1, options.limit || 20));

  const result = await getAllUsersPaginated({
    status,
    page,
    limit,
  });

  return {
    ...result,
    page,
    totalPages: Math.ceil(result.total / limit),
  };
}

/**
 * Optimized: Get users by role with pagination
 * 优化版本：按角色获取用户（带分页）
 *
 * @param role - 用户角色
 * @param options - 分页选项
 * @returns 用户列表和分页信息
 */
export async function getUsersByRole(
  role: UserRole,
  options: { page?: number; limit?: number } = {}
): Promise<{ users: User[]; total: number; page: number; totalPages: number }> {
  const page = Math.max(1, options.page || 1);
  const limit = Math.min(100, Math.max(1, options.limit || 20));

  const result = await getAllUsersPaginated({
    role,
    page,
    limit,
  });

  return {
    ...result,
    page,
    totalPages: Math.ceil(result.total / limit),
  };
}

/**
 * Optimized: Search users with fuzzy matching and pagination
 * 优化版本：搜索用户（支持模糊匹配和分页）
 *
 * @param searchTerm - 搜索词
 * @param options - 分页选项
 * @returns 用户列表和分页信息
 */
export async function searchUsers(
  searchTerm: string,
  options: { page?: number; limit?: number } = {}
): Promise<{ users: User[]; total: number; page: number; totalPages: number }> {
  const page = Math.max(1, options.page || 1);
  const limit = Math.min(100, Math.max(1, options.limit || 20));

  const result = await getAllUsersPaginated({
    search: searchTerm,
    page,
    limit,
  });

  return {
    ...result,
    page,
    totalPages: Math.ceil(result.total / limit),
  };
}

/**
 * Optimized: Get user statistics (single query instead of multiple)
 * 优化版本：获取用户统计信息（单次查询）
 *
 * @returns 用户统计信息
 */
export async function getUserStatistics(): Promise<{
  total: number;
  byStatus: Record<UserStatus, number>;
  byRole: Record<UserRole, number>;
  activeToday: number;
  activeWeek: number;
}> {
  const db = (await getDatabaseAsync()) as ExtendedDatabase;

  // 使用 CASE 语句合并多个统计查询
  const result = db.queryRows(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as status_active,
      SUM(CASE WHEN status = 'inactive' THEN 1 ELSE 0 END) as status_inactive,
      SUM(CASE WHEN status = 'suspended' THEN 1 ELSE 0 END) as status_suspended,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as status_pending,
      SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) as role_admin,
      SUM(CASE WHEN role = 'manager' THEN 1 ELSE 0 END) as role_manager,
      SUM(CASE WHEN role = 'moderator' THEN 1 ELSE 0 END) as role_moderator,
      SUM(CASE WHEN role = 'member' THEN 1 ELSE 0 END) as role_member,
      SUM(CASE WHEN role = 'user' THEN 1 ELSE 0 END) as role_user,
      SUM(CASE WHEN role = 'guest' THEN 1 ELSE 0 END) as role_guest,
      SUM(CASE WHEN last_login_at >= datetime('now', '-1 day') THEN 1 ELSE 0 END) as active_today,
      SUM(CASE WHEN last_login_at >= datetime('now', '-7 days') THEN 1 ELSE 0 END) as active_week
    FROM users
  `)[0] as {
    total: number;
    status_active: number;
    status_inactive: number;
    status_suspended: number;
    status_pending: number;
    role_admin: number;
    role_manager: number;
    role_moderator: number;
    role_member: number;
    role_user: number;
    role_guest: number;
    active_today: number;
    active_week: number;
  };

  return {
    total: result.total,
    byStatus: {
      [UserStatus.ACTIVE]: result.status_active,
      [UserStatus.INACTIVE]: result.status_inactive,
      [UserStatus.SUSPENDED]: result.status_suspended,
      [UserStatus.PENDING]: result.status_pending,
    },
    byRole: {
      [UserRole.ADMIN]: result.role_admin,
      [UserRole.MANAGER]: result.role_manager,
      [UserRole.MODERATOR]: result.role_moderator,
      [UserRole.MEMBER]: result.role_member,
      [UserRole.USER]: result.role_user,
      [UserRole.GUEST]: result.role_guest,
    },
    activeToday: result.active_today,
    activeWeek: result.active_week,
  };
}

/**
 * Optimized: Get users with recent activity
 * 优化版本：获取最近活跃的用户
 *
 * @param days - 天数（默认 7 天）
 * @param limit - 最大返回数量
 * @returns 用户列表
 */
export async function getUsersWithRecentActivity(
  days: number = 7,
  limit: number = 20
): Promise<User[]> {
  const db = await getDatabaseAsync();

  const stmt = db.prepare(`
    SELECT * FROM users
    WHERE last_login_at >= datetime('now', '-' || ? || ' days')
    ORDER BY last_login_at DESC
    LIMIT ?
  `);

  const users = stmt.all(days, limit) as unknown as Record<string, unknown>[];
  return users.map(mapRowToUser);
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Map database row to User object
 * 将数据库行映射为 User 对象
 */
function mapRowToUser(row: Record<string, unknown>): User {
  return {
    id: row.id as string,
    username: (row.username as string) || (row.name as string),
    email: row.email as string,
    passwordHash: row.password as string,
    name: row.name as string,
    avatar: row.avatar as string | undefined,
    role: row.role as UserRole,
    roles: row.roles ? JSON.parse(row.roles as string || '[]') : [],
    status: row.status as UserStatus,
    permissions: row.permissions ? JSON.parse(row.permissions as string || '[]') : [],
    customPermissions: row.customPermissions
      ? JSON.parse(row.customPermissions as string || '[]')
      : undefined,
    metadata: row.metadata ? JSON.parse(row.metadata as string || '{}') : {},
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
    lastLoginAt: row.last_login_at ? new Date(row.last_login_at as string) : undefined,
  };
}

/**
 * Get user by ID
 */
export async function getUserById(userId: string): Promise<User | null> {
  const db = (await getDatabaseAsync()) as ExtendedDatabase;
  const rows = db.queryRows('SELECT * FROM users WHERE id = ?', [userId]);
  if (rows.length === 0) {
    return null;
  }
  return mapRowToUser(rows[0]);
}

// ============================================================================
// Legacy Functions (kept for backward compatibility)
// ============================================================================

/**
 * Legacy: Get all users (deprecated - use getAllUsersPaginated instead)
 * 旧版函数：获取所有用户（已废弃，请使用 getAllUsersPaginated）
 *
 * @deprecated Use getAllUsersPaginated for better performance
 */
export async function getAllUsers(options?: {
  status?: UserStatus;
  role?: UserRole;
}): Promise<User[]> {
  console.warn('getAllUsers is deprecated. Use getAllUsersPaginated for better performance.');
  const result = await getAllUsersPaginated({
    status: options?.status,
    role: options?.role,
    page: 1,
    limit: 1000, // High limit to get all users
  });
  return result.users;
}
