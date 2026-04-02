/**
 * JSON Web Token (JWT) 工具函数
 *
 * 用于生成和验证 JWT 令牌
 */

import { SignJWT, jwtVerify, type JWTPayload as JoseJWTPayload } from 'jose'

/**
 * 获取 JWT 密钥
 *
 * 安全策略：
 * - 生产环境：必须设置 JWT_SECRET 环境变量，否则抛出错误
 * - 开发环境：如果未设置，使用临时开发密钥并记录警告
 *
 * ⚠️ 重要：生产环境必须设置强随机密钥！
 * 生成方法: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
 */
function getJWTSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET

  if (!secret) {
    // 生产环境必须设置 JWT_SECRET
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        '[JWT] FATAL: JWT_SECRET environment variable is required in production. ' +
          "Generate a secure key: node -e \"console.log(require('crypto').randomBytes(64).toString('hex'))\""
      )
    }

    // 开发环境使用临时密钥，但记录警告
    console.warn(
      '[JWT] WARNING: JWT_SECRET is not set. Using temporary development key. ' +
        'This is NOT secure for production! Set JWT_SECRET environment variable.'
    )

    // 开发环境使用固定的开发密钥（仅用于本地开发）
    return new TextEncoder().encode('dev-secret-key-not-for-production-use-' + 'x'.repeat(32))
  }

  // 验证密钥长度（至少 64 字符）
  if (secret.length < 64) {
    console.warn(
      `[JWT] WARNING: JWT_SECRET is too short (${secret.length} chars). ` +
        'Recommended minimum length is 64 characters for HS256 algorithm.'
    )
  }

  return new TextEncoder().encode(secret)
}

// 延迟初始化密钥（只在首次使用时获取，允许更好的错误处理）
let _jwtSecret: Uint8Array | null = null

function getJWTSecretLazy(): Uint8Array {
  if (!_jwtSecret) {
    _jwtSecret = getJWTSecret()
  }
  return _jwtSecret
}

// 导出获取函数，而不是直接导出密钥
const JWT_SECRET = new Proxy({} as Uint8Array, {
  get(target, prop) {
    const secret = getJWTSecretLazy()
    return Reflect.get(secret, prop, secret)
  },
  getOwnPropertyDescriptor(target, prop) {
    const secret = getJWTSecretLazy()
    return Object.getOwnPropertyDescriptor(secret, prop)
  },
  ownKeys() {
    const secret = getJWTSecretLazy()
    return Reflect.ownKeys(secret)
  },
  getPrototypeOf() {
    const secret = getJWTSecretLazy()
    return Object.getPrototypeOf(secret)
  },
})

/**
 * JWT 负载接口
 */
export interface JWTPayload {
  userId: string
  username: string
  email: string
  role: 'admin' | 'user' | 'guest'
  iat?: number
  exp?: number
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
      .sign(JWT_SECRET)

    return token
  } catch (error) {
    console.error('[JWT] Failed to generate token:', error)
    throw new Error('Token generation failed')
  }
}

/**
 * 验证 JWT 令牌
 */
export async function verifyJWT(token: string): Promise<JWTPayload> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    // 验证 payload 包含必需的字段
    if (!payload.userId || !payload.username || !payload.email || !payload.role) {
      throw new Error('Invalid JWT payload structure')
    }
    return {
      userId: payload.userId as string,
      username: payload.username as string,
      email: payload.email as string,
      role: payload.role as 'admin' | 'user' | 'guest',
      iat: payload.iat,
      exp: payload.exp,
    }
  } catch (error) {
    console.error('[JWT] Token verification failed:', error)
    throw new Error('Invalid or expired token')
  }
}

/**
 * 解析 JWT 令牌（不验证签名，仅用于调试）
 */
export function decodeJWT(token: string): JWTPayload | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) {
      return null
    }

    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString())

    return payload as JWTPayload
  } catch (error) {
    console.error('[JWT] Failed to decode token:', error)
    return null
  }
}

/**
 * 生成刷新令牌
 */
export async function generateRefreshToken(
  payload: Omit<JWTPayload, 'iat' | 'exp'>
): Promise<string> {
  try {
    const token = await new SignJWT({ userId: payload.userId })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(JWT_SECRET)

    return token
  } catch (error) {
    console.error('[JWT] Failed to generate refresh token:', error)
    throw new Error('Refresh token generation failed')
  }
}

/**
 * 验证刷新令牌
 */
export async function verifyRefreshToken(token: string): Promise<{ userId: string }> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload as { userId: string }
  } catch (error) {
    console.error('[JWT] Refresh token verification failed:', error)
    throw new Error('Invalid or expired refresh token')
  }
}
