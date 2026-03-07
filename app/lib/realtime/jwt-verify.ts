/**
 * JWT Token 验证模块
 * JWT Token Verification Module
 */

import { jwtVerify, SignJWT } from 'jose';
import { getEnvConfig } from '../env';

/** JWT Payload 接口 */
export interface JWTPayload {
  userId: string;
  email?: string;
  role?: string;
  iat?: number;
  exp?: number;
}

/** Token 验证结果 */
export interface TokenVerificationResult {
  valid: boolean;
  payload?: JWTPayload;
  error?: string;
}

/** Token 过期时间 (7天) */
const TOKEN_EXPIRY = 7 * 24 * 60 * 60 * 1000;

/**
 * 获取 JWT 密钥
 */
function getSecretKey(): Uint8Array {
  const config = getEnvConfig();
  const secret = config.jwtSecret || 'default-dev-secret-key-please-change-in-production';
  return new TextEncoder().encode(secret);
}

/**
 * 验证 JWT Token
 */
export async function verifyToken(token: string): Promise<TokenVerificationResult> {
  try {
    if (!token) {
      return { valid: false, error: 'Token is required' };
    }

    // 移除 Bearer 前缀
    const cleanToken = token.replace(/^Bearer\s+/i, '');

    const secretKey = getSecretKey();
    const { payload } = await jwtVerify(cleanToken, secretKey);

    // 验证必要字段
    if (!payload.userId) {
      return { valid: false, error: 'Invalid token: missing userId' };
    }

    return {
      valid: true,
      payload: {
        userId: payload.userId as string,
        email: payload.email as string | undefined,
        role: payload.role as string | undefined,
        iat: payload.iat,
        exp: payload.exp,
      },
    };
  } catch (error) {
    if (error instanceof Error) {
      // 处理特定的 JWT 错误
      if (error.message.includes('expired')) {
        return { valid: false, error: 'Token has expired' };
      }
      if (error.message.includes('invalid')) {
        return { valid: false, error: 'Invalid token format' };
      }
      return { valid: false, error: error.message };
    }
    return { valid: false, error: 'Token verification failed' };
  }
}

/**
 * 生成 JWT Token
 */
export async function generateToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): Promise<string> {
  const secretKey = getSecretKey();
  
  const token = await new SignJWT({
    userId: payload.userId,
    email: payload.email,
    role: payload.role,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(Date.now() + TOKEN_EXPIRY)
    .sign(secretKey);

  return token;
}

/**
 * 从请求头中提取 Token
 */
export function extractToken(authHeader: string | undefined): string | null {
  if (!authHeader) return null;
  
  // 支持 Bearer 和直接 token 两种格式
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  
  return authHeader;
}

/**
 * 验证 Token 并返回用户 ID
 * 简化的验证函数，用于 WebSocket 认证
 */
export async function verifyTokenAndGetUserId(token: string): Promise<string | null> {
  const result = await verifyToken(token);
  
  if (result.valid && result.payload) {
    return result.payload.userId;
  }
  
  return null;
}