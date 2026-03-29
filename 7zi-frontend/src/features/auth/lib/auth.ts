/**
 * Authentication Utility Functions
 *
 * 提供认证相关的工具函数，包括密码哈希、令牌验证、权限检查等
 */

import { isValidEmail, isStrongPassword, isValidUsername } from '@/lib/validation';

/**
 * 用户角色枚举
 */
export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  GUEST = 'guest',
}

/**
 * 用户权限枚举
 */
export enum Permission {
  READ = 'read',
  WRITE = 'write',
  DELETE = 'delete',
  ADMIN = 'admin',
}

/**
 * 用户信息接口
 */
export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  permissions: Permission[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 登录凭证接口
 */
export interface Credentials {
  username: string;
  password: string;
}

/**
 * 会话信息接口
 */
export interface Session {
  token: string;
  userId: string;
  expiresAt: Date;
  createdAt: Date;
}

/**
 * 认证结果接口
 */
export interface AuthResult {
  success: boolean;
  user?: User;
  session?: Session;
  error?: string;
}

/**
 * 验证登录凭证
 */
export function validateCredentials(credentials: Credentials): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // 验证用户名或邮箱
  const isEmail = isValidEmail(credentials.username);
  const isUsername = isValidUsername(credentials.username);

  if (!isEmail && !isUsername) {
    errors.push('用户名或邮箱格式无效');
  }

  // 验证密码
  if (!credentials.password) {
    errors.push('密码不能为空');
  } else if (credentials.password.length < 6) {
    errors.push('密码长度至少为6位');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * 检查用户是否有指定权限
 */
export function hasPermission(user: User, permission: Permission): boolean {
  // 管理员拥有所有权限
  if (user.role === UserRole.ADMIN) {
    return true;
  }

  return user.permissions.includes(permission);
}

/**
 * 检查用户是否有任一权限
 */
export function hasAnyPermission(user: User, permissions: Permission[]): boolean {
  // 管理员拥有所有权限
  if (user.role === UserRole.ADMIN) {
    return true;
  }

  return permissions.some(permission => user.permissions.includes(permission));
}

/**
 * 检查用户是否有所有权限
 */
export function hasAllPermissions(user: User, permissions: Permission[]): boolean {
  // 管理员拥有所有权限
  if (user.role === UserRole.ADMIN) {
    return true;
  }

  return permissions.every(permission => user.permissions.includes(permission));
}

/**
 * 检查会话是否过期
 */
export function isSessionExpired(session: Session): boolean {
  return new Date() > session.expiresAt;
}

/**
 * 检查会话是否即将过期（5分钟内）
 */
export function isSessionExpiringSoon(session: Session, minutes = 5): boolean {
  const now = new Date();
  const expiryTime = new Date(session.expiresAt);
  const warningTime = new Date(expiryTime.getTime() - minutes * 60 * 1000);

  return now > warningTime && now < expiryTime;
}

/**
 * 验证令牌格式（简单验证）
 */
export function isValidToken(token: string): boolean {
  // 实际应用中应该使用 JWT 或其他令牌验证库
  // 这里只做基本的格式验证
  return token.length > 0 && /^[a-zA-Z0-9\-_\.]+$/.test(token);
}

/**
 * 生成随机令牌
 */
export function generateToken(length = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';

  // 使用 crypto.randomValues 如果可用，否则使用 Math.random
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    for (let i = 0; i < length; i++) {
      result += chars[array[i] % chars.length];
    }
  } else {
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
  }

  return result;
}

/**
 * 创建会话
 */
export function createSession(userId: string, expiresInMinutes = 60): Session {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + expiresInMinutes * 60 * 1000);

  return {
    token: generateToken(),
    userId,
    expiresAt,
    createdAt: now,
  };
}

/**
 * 刷新会话
 */
export function refreshSession(session: Session, expiresInMinutes = 60): Session {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + expiresInMinutes * 60 * 1000);

  return {
    ...session,
    token: generateToken(),
    expiresAt,
  };
}

/**
 * 验证密码强度（带等级返回）
 */
export function getPasswordStrength(password: string): {
  strength: 'weak' | 'medium' | 'strong';
  score: number;
  feedback: string[];
} {
  const feedback: string[] = [];
  let score = 0;

  // 长度检查
  if (password.length >= 8) {
    score += 1;
  } else {
    feedback.push('密码长度至少为8位');
  }

  if (password.length >= 12) {
    score += 1;
  }

  // 复杂度检查
  const hasLowercase = /[a-z]/.test(password);
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  if (hasLowercase && hasUppercase) {
    score += 1;
  } else {
    feedback.push('密码应包含大小写字母');
  }

  if (hasNumber) {
    score += 1;
  } else {
    feedback.push('密码应包含数字');
  }

  if (hasSpecial) {
    score += 1;
  } else {
    feedback.push('密码应包含特殊字符');
  }

  // 确定强度等级
  let strength: 'weak' | 'medium' | 'strong' = 'weak';
  if (score >= 5) {
    strength = 'strong';
  } else if (score >= 3) {
    strength = 'medium';
  }

  return { strength, score, feedback };
}

/**
 * 检查用户是否可以访问资源
 */
export function canAccessResource(
  user: User,
  resourceOwnerId: string,
  requiredPermission: Permission
): boolean {
  // 管理员可以访问所有资源
  if (user.role === UserRole.ADMIN) {
    return true;
  }

  // 检查是否有必需的权限
  if (!hasPermission(user, requiredPermission)) {
    return false;
  }

  // 资源所有者可以访问自己的资源
  if (user.id === resourceOwnerId) {
    return true;
  }

  // 其他情况根据权限判断
  return false;
}

/**
 * 获取默认用户权限
 */
export function getDefaultPermissions(role: UserRole): Permission[] {
  switch (role) {
    case UserRole.ADMIN:
      return [Permission.READ, Permission.WRITE, Permission.DELETE, Permission.ADMIN];
    case UserRole.USER:
      return [Permission.READ, Permission.WRITE];
    case UserRole.GUEST:
      return [Permission.READ];
    default:
      return [];
  }
}

/**
 * 创建模拟用户（用于测试）
 */
export function createMockUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-123',
    username: 'testuser',
    email: 'test@example.com',
    role: UserRole.USER,
    permissions: [Permission.READ, Permission.WRITE],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * 验证注册信息
 */
export function validateRegistration(data: {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // 验证用户名
  if (!isValidUsername(data.username)) {
    errors.push('用户名格式无效：3-20个字符，只允许字母、数字、下划线');
  }

  // 验证邮箱
  if (!isValidEmail(data.email)) {
    errors.push('邮箱格式无效');
  }

  // 验证密码
  if (!isStrongPassword(data.password)) {
    errors.push('密码强度不足：至少8位，包含字母和数字');
  }

  // 验证确认密码
  if (data.password !== data.confirmPassword) {
    errors.push('两次输入的密码不一致');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * 生成安全密码
 */
export function generateSecurePassword(length = 16): string {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';

  const allChars = lowercase + uppercase + numbers + special;
  let password = '';

  // 确保至少包含每种类型的字符
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];

  // 填充剩余长度
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }

  // 打乱密码顺序
  return password
    .split('')
    .sort(() => Math.random() - 0.5)
    .join('');
}
