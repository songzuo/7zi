/**
 * 用户数据仓库
 * 处理用户和用户资料的数据库操作
 */

import { getDatabaseAsync } from '../db';
import { User, UserProfile, UserSettings } from './types';
import { Role } from '../permissions/types';
import { getRolePermissions } from '../permissions/role-config';

/**
 * 创建默认用户设置
 */
function getDefaultSettings(): UserSettings {
  return {
    theme: 'system',
    language: 'zh-CN',
    notifications: {
      email: true,
      push: true,
      taskAssigned: true,
      taskCompleted: true,
      mentions: true,
    },
  };
}

/**
 * 生成唯一ID
 */
function generateId(): string {
  return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 初始化用户表
 */
export async function initializeUserTables(): Promise<void> {
  const db = await getDatabaseAsync();
  
  const schema = `
    -- 用户表
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      avatar TEXT,
      bio TEXT,
      role TEXT NOT NULL DEFAULT 'member',
      provider TEXT NOT NULL DEFAULT 'system',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- 用户资料表
    CREATE TABLE IF NOT EXISTS user_profiles (
      id TEXT PRIMARY KEY,
      user_id TEXT UNIQUE NOT NULL,
      display_name TEXT,
      avatar TEXT,
      bio TEXT,
      location TEXT,
      website TEXT,
      settings TEXT DEFAULT '{}',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- 索引
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
  `;
  
  try {
    db.exec(schema);
  } catch (error) {
    if (!(error instanceof Error && error.message.includes('already exists'))) {
      throw error;
    }
  }
}

/**
 * 创建用户
 */
export async function createUser(data: {
  name: string;
  email: string;
  avatar?: string;
  bio?: string;
  role?: Role;
  provider?: string;
}): Promise<User> {
  const db = await getDatabaseAsync();
  await initializeUserTables();
  
  const id = generateId();
  const now = new Date().toISOString();
  const userRole = data.role || Role.MEMBER;
  
  const stmt = db.prepare(`
    INSERT INTO users (id, name, email, avatar, bio, role, provider, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  stmt.run(
    id,
    data.name,
    data.email,
    data.avatar || null,
    data.bio || null,
    userRole,
    data.provider || 'system',
    now,
    now
  );
  
  return {
    id,
    name: data.name,
    email: data.email,
    avatar: data.avatar,
    bio: data.bio,
    role: userRole,
    provider: data.provider || 'system',
    createdAt: new Date(now),
    updatedAt: new Date(now),
  };
}

/**
 * 根据 ID 获取用户
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
 * 根据邮箱获取用户
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
 * 获取所有用户
 */
export async function getAllUsers(): Promise<User[]> {
  const db = await getDatabaseAsync();
  await initializeUserTables();
  
  const stmt = db.prepare('SELECT * FROM users ORDER BY created_at DESC');
  const rows = stmt.all() as Record<string, unknown>[];
  
  return rows.map(mapRowToUser);
}

/**
 * 更新用户
 */
export async function updateUser(
  id: string,
  data: Partial<Pick<User, 'name' | 'avatar' | 'bio'> & { role: Role }>
): Promise<User | null> {
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
  if (data.bio !== undefined) {
    updates.push('bio = ?');
    values.push(data.bio);
  }
  if (data.role !== undefined) {
    updates.push('role = ?');
    values.push(data.role);
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
 * 更新用户头像
 */
export async function updateUserAvatar(userId: string, avatarUrl: string): Promise<User | null> {
  return updateUser(userId, { avatar: avatarUrl });
}

/**
 * 删除用户
 */
export async function deleteUser(id: string): Promise<boolean> {
  const db = await getDatabaseAsync();
  await initializeUserTables();
  
  const stmt = db.prepare('DELETE FROM users WHERE id = ?');
  const result = stmt.run(id);
  
  return result.changes > 0;
}

/**
 * 获取用户资料
 */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const db = await getDatabaseAsync();
  await initializeUserTables();
  
  const stmt = db.prepare('SELECT * FROM user_profiles WHERE user_id = ?');
  const row = stmt.get(userId) as Record<string, unknown> | undefined;
  
  if (!row) {
    // 创建默认资料
    const user = await getUserById(userId);
    if (!user) return null;
    
    return createDefaultUserProfile(userId, user.name);
  }
  
  return mapRowToUserProfile(row);
}

/**
 * 创建默认用户资料
 */
async function createDefaultUserProfile(userId: string, displayName: string): Promise<UserProfile> {
  const db = await getDatabaseAsync();
  
  const id = `profile_${userId}`;
  const now = new Date().toISOString();
  const settings = getDefaultSettings();
  
  const stmt = db.prepare(`
    INSERT INTO user_profiles (id, user_id, display_name, settings, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  
  stmt.run(id, userId, displayName, JSON.stringify(settings), now, now);
  
  return {
    id,
    userId,
    displayName,
    settings,
    createdAt: new Date(now),
    updatedAt: new Date(now),
  };
}

/**
 * 更新用户资料
 */
export async function updateUserProfile(
  userId: string,
  data: Partial<Pick<UserProfile, 'displayName' | 'avatar' | 'bio' | 'location' | 'website' | 'settings'>>
): Promise<UserProfile | null> {
  const db = await getDatabaseAsync();
  await initializeUserTables();
  
  let profile = await getUserProfile(userId);
  if (!profile) return null;
  
  const updates: string[] = [];
  const values: (string | null)[] = [];
  
  if (data.displayName !== undefined) {
    updates.push('display_name = ?');
    values.push(data.displayName);
  }
  if (data.avatar !== undefined) {
    updates.push('avatar = ?');
    values.push(data.avatar);
  }
  if (data.bio !== undefined) {
    updates.push('bio = ?');
    values.push(data.bio);
  }
  if (data.location !== undefined) {
    updates.push('location = ?');
    values.push(data.location);
  }
  if (data.website !== undefined) {
    updates.push('website = ?');
    values.push(data.website);
  }
  if (data.settings !== undefined) {
    updates.push('settings = ?');
    values.push(JSON.stringify(data.settings));
  }
  
  if (updates.length === 0) return profile;
  
  updates.push('updated_at = ?');
  values.push(new Date().toISOString());
  values.push(userId);
  
  const stmt = db.prepare(`UPDATE user_profiles SET ${updates.join(', ')} WHERE user_id = ?`);
  stmt.run(...values);
  
  return getUserProfile(userId);
}

/**
 * 映射数据库行到 User 对象
 */
function mapRowToUser(row: Record<string, unknown>): User {
  return {
    id: row.id as string,
    name: row.name as string,
    email: row.email as string,
    avatar: row.avatar as string | undefined,
    bio: row.bio as string | undefined,
    role: row.role as Role,
    provider: row.provider as string,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  };
}

/**
 * 获取用户及权限
 */
export async function getUserWithPermissions(id: string): Promise<{ user: User; permissions: ReturnType<typeof getRolePermissions> } | null> {
  const user = await getUserById(id);
  if (!user) return null;
  
  const permissions = getRolePermissions(user.role);
  return { user, permissions };
}

/**
 * 更新用户角色
 */
export async function updateUserRole(userId: string, newRole: Role): Promise<User | null> {
  return updateUser(userId, { role: newRole });
}

/**
 * 根据角色获取用户列表
 */
export async function getUsersByRole(role: Role): Promise<User[]> {
  const db = await getDatabaseAsync();
  await initializeUserTables();
  
  const stmt = db.prepare('SELECT * FROM users WHERE role = ? ORDER BY created_at DESC');
  const rows = stmt.all(role) as Record<string, unknown>[];
  
  return rows.map(mapRowToUser);
}

/**
 * 映射数据库行到 UserProfile 对象
 */
function mapRowToUserProfile(row: Record<string, unknown>): UserProfile {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    displayName: row.display_name as string,
    avatar: row.avatar as string | undefined,
    bio: row.bio as string | undefined,
    location: row.location as string | undefined,
    website: row.website as string | undefined,
    settings: JSON.parse(row.settings as string || '{}') as UserSettings,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  };
}