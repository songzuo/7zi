/**
 * JSON Web Token (JWT) 工具函数
 *
 * 用于生成和验证 JWT 令牌
 */

import { SignJWT, jwtVerify, type JWTPayload as JoseJWTPayload } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'development-secret-change-in-production'
);

/**
 * JWT 负载接口
 */
export interface JWTPayload {
  userId: string;
  username: string;
  email: string;
  role: 'admin' | 'user' | 'guest';
  iat?: number;
  exp?: number;
}

/**
 * 生成 JWT 令牌
 */
export async function generateJWT(payload: Omit<JWTPayload, 'iat' | 'exp'>): Promise<string> {
  try {
    const token = await new SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('24h')
      .sign(JWT_SECRET);

    return token;
  } catch (error) {
    console.error('[JWT] Failed to generate token:', error);
    throw new Error('Token generation failed');
  }
}

/**
 * 验证 JWT 令牌
 */
export async function verifyJWT(token: string): Promise<JWTPayload> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as JWTPayload;
  } catch (error) {
    console.error('[JWT] Token verification failed:', error);
    throw new Error('Invalid or expired token');
  }
}

/**
 * 解析 JWT 令牌（不验证签名，仅用于调试）
 */
export function decodeJWT(token: string): JWTPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const payload = JSON.parse(
      Buffer.from(parts[1], 'base64url').toString()
    );

    return payload as JWTPayload;
  } catch (error) {
    console.error('[JWT] Failed to decode token:', error);
    return null;
  }
}

/**
 * 生成刷新令牌
 */
export async function generateRefreshToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): Promise<string> {
  try {
    const token = await new SignJWT({ userId: payload.userId })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(JWT_SECRET);

    return token;
  } catch (error) {
    console.error('[JWT] Failed to generate refresh token:', error);
    throw new Error('Refresh token generation failed');
  }
}

/**
 * 验证刷新令牌
 */
export async function verifyRefreshToken(token: string): Promise<{ userId: string }> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as { userId: string };
  } catch (error) {
    console.error('[JWT] Refresh token verification failed:', error);
    throw new Error('Invalid or expired refresh token');
  }
}
