/**
 * 认证模块 - JWT 安全管理
 * Authentication Module - Secure JWT Management
 */

import * as crypto from 'crypto';
import { validateEnv, isProduction, isDevelopment } from './env';

/**
 * JWT 配置接口
 */
export interface JwtConfig {
  secret: string;
  expiresIn: string;
  issuer: string;
  audience: string;
}

/**
 * 获取 JWT 密钥
 * 
 * 安全策略：
 * - 生产环境：必须从环境变量 JWT_SECRET 读取，否则抛出错误
 * - 开发环境：如果未设置，使用安全的随机密钥（每次重启会变化）
 * - 密钥长度验证：至少 32 字符
 */
export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    if (isProduction()) {
      throw new Error(
        'JWT_SECRET must be set in production environment.\n' +
        'Please set a secure random string of at least 32 characters in your environment variables.'
      );
    }

    // 开发环境使用随机密钥（每次重启会变化）
    // 使用 crypto.randomUUID() 生成 4 次并截取前 64 字符
    if (isDevelopment()) {
      console.warn(
        '⚠️  WARNING: JWT_SECRET is not set. Using a temporary random secret for development.\n' +
        '   This will change on every restart. Set JWT_SECRET in .env for persistence.'
      );
      return crypto.randomUUID().repeat(4).slice(0, 64);
    }

    // 测试环境
    return 'test-secret-key-for-testing-only-do-not-use-in-production-32chars';
  }

  // 验证密钥长度
  if (secret.length < 32) {
    throw new Error(
      `JWT_SECRET must be at least 32 characters for security.\n` +
      `Current length: ${secret.length} characters.\n` +
      `Please use a longer secret. You can generate one with: openssl rand -base64 32`
    );
  }

  return secret;
}

/**
 * 获取 JWT 配置
 */
export function getJwtConfig(): JwtConfig {
  validateEnv();

  return {
    secret: getJwtSecret(),
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    issuer: process.env.JWT_ISSUER || 'ai-team-dashboard',
    audience: process.env.JWT_AUDIENCE || 'ai-team-dashboard-users',
  };
}

/**
 * 验证管理员密码
 */
export function validateAdminPassword(password: string): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    if (isProduction()) {
      throw new Error('ADMIN_PASSWORD must be set in production environment.');
    }
    // 开发环境使用默认密码（仅用于开发）
    console.warn(
      '⚠️  WARNING: ADMIN_PASSWORD is not set. Using default password for development.\n' +
      '   Set ADMIN_PASSWORD in .env for security.'
    );
    return password === 'admin123';
  }

  // 使用时序安全的比较方法防止时序攻击
  return timingSafeEqual(password, adminPassword);
}

/**
 * 时序安全的字符串比较
 * 防止时序攻击 (Timing Attack)
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');

  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * 生成安全的随机令牌
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * 哈希密码（用于存储）
 */
export async function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString('hex');
    crypto.pbkdf2(password, salt, 100000, 64, 'sha512', (err, derivedKey) => {
      if (err) reject(err);
      resolve(`${salt}:${derivedKey.toString('hex')}`);
    });
  });
}

/**
 * 验证密码（与哈希比对）
 */
export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const [salt, hash] = hashedPassword.split(':');
    crypto.pbkdf2(password, salt, 100000, 64, 'sha512', (err, derivedKey) => {
      if (err) reject(err);
      resolve(timingSafeEqual(derivedKey.toString('hex'), hash));
    });
  });
}

/**
 * 创建 JWT 令牌的辅助函数
 * 注意：实际签名操作应在服务端完成
 */
export function createJwtPayload(userId: string, role: string): object {
  const config = getJwtConfig();
  const now = Math.floor(Date.now() / 1000);

  return {
    sub: userId,
    role,
    iat: now,
    iss: config.issuer,
    aud: config.audience,
  };
}

// 导出环境验证函数供外部使用
export { validateEnv, isDevelopment, isProduction };
