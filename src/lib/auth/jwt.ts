/**
 * @fileoverview JWT Authentication Module
 * @description Provides JWT token signing, verification, and decoding using the jose library
 */

import { SignJWT, jwtVerify, decodeJwt, type JWTPayload } from 'jose'
import crypto from 'crypto'
import type { KeyObject } from 'crypto'

// Temporarily disable logger to avoid circular dependencies in tests
// import { logger } from '../logger/index';

function logError(message: string, error: unknown, options?: { category?: string }): void {
  console.error(`[${options?.category || 'auth'}] ${message}`, error)
}

// ============================================================================
// Types
// ============================================================================

/**
 * JWT payload structure
 */
export interface JwtPayload extends JWTPayload {
  sub: string // Subject (user ID)
  email: string // User email
  role: string // User role
  roles?: string[] // User roles
  permissions?: string[] // User permissions
  customPermissions?: string[] // Custom permissions
  type: 'user' | 'agent' | 'api' // Token type
}

/**
 * Token verification result
 */
export interface TokenVerifyResult {
  valid: boolean
  payload?: JwtPayload
  error?: string
}

/**
 * Token decode result
 */
export interface TokenDecodeResult {
  payload?: JwtPayload
  error?: string
}

/**
 * User context extracted from JWT
 */
export interface UserContext {
  userId: string
  email: string
  role: string
  roles: string[]
  permissions: string[]
  customPermissions: string[]
}

// ============================================================================
// Configuration
// ============================================================================

const JWT_ISSUER = '7zi-api'
const JWT_AUDIENCE = '7zi-users'
const DEFAULT_ALGORITHM = 'HS256'

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get JWT secret key from environment
 * @throws {Error} If no secret is available
 */
function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET || process.env.AGENT_ENCRYPTION_SECRET
  if (!secret) {
    const error = new Error('JWT_SECRET environment variable is required in production')
    throw error
  }
  return secret
}

/**
 * Get JWT secret key as a Uint8Array for jose
 * jose v6 accepts Uint8Array for HMAC signing
 */
function getSecretKey(): Uint8Array {
  const secret = getJwtSecret()
  const encoder = new TextEncoder()
  return encoder.encode(secret)
}

/**
 * Convert seconds to ISO 8601 duration string
 * Examples: 3600 -> '1h', 86400 -> '1d', 604800 -> '7d'
 */
function secondsToDuration(seconds: number): string {
  if (seconds % 86400 === 0) {
    return `${seconds / 86400}d`
  }
  if (seconds % 3600 === 0) {
    return `${seconds / 3600}h`
  }
  if (seconds % 60 === 0) {
    return `${seconds / 60}m`
  }
  return `${seconds}s`
}

// ============================================================================
// Core JWT Functions
// ============================================================================

/**
 * Sign a JWT token with the given payload and expiration time
 *
 * @param payload - The payload to include in the token
 * @param expiresIn - Token expiration time in seconds (default: 3600)
 * @returns Promise resolving to the signed JWT token
 *
 * @example
 * ```ts
 * const token = await sign({ sub: 'user123', email: 'user@example.com', type: 'user' }, 3600);
 * ```
 */
export async function sign(
  payload: Omit<JwtPayload, 'iat' | 'exp' | 'iss' | 'aud'>,
  expiresIn: number = 3600
): Promise<string> {
  try {
    const secretKey = getSecretKey()
    const duration = secondsToDuration(expiresIn)

    const token = await new SignJWT(payload)
      .setProtectedHeader({ alg: DEFAULT_ALGORITHM })
      .setIssuedAt()
      .setExpirationTime(duration)
      .setIssuer(JWT_ISSUER)
      .setAudience(JWT_AUDIENCE)
      .sign(secretKey)

    return token
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logError('Failed to sign JWT token', error, { category: 'auth' })
    throw new Error(`Failed to sign JWT token: ${errorMessage}`)
  }
}

/**
 * Verify a JWT token and return the payload if valid
 *
 * @param token - The JWT token to verify
 * @returns Promise resolving to verification result
 *
 * @example
 * ```ts
 * const result = await verify('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...');
 * if (result.valid && result.payload) {
 *   console.log('User ID:', result.payload.sub);
 * }
 * ```
 */
export async function verify(token: string): Promise<TokenVerifyResult> {
  try {
    const secretKey = getSecretKey()

    const { payload } = await jwtVerify(token, secretKey, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    })

    return {
      valid: true,
      payload: payload as JwtPayload,
    }
  } catch (error) {
    let errorMessage = 'Invalid token'

    if (error instanceof Error) {
      if (error.message.includes('exp')) {
        errorMessage = 'Token expired'
      } else if (error.message.includes('signature')) {
        errorMessage = 'Invalid signature'
      } else {
        errorMessage = error.message
      }
    }

    return {
      valid: false,
      error: errorMessage,
    }
  }
}

/**
 * Decode a JWT token without verifying the signature
 * Useful for extracting basic information or debugging
 *
 * @param token - The JWT token to decode
 * @returns Decoded payload or error
 *
 * @example
 * ```ts
 * const result = decode('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...');
 * if (result.payload) {
 *   console.log('User ID (not verified):', result.payload.sub);
 * }
 * ```
 */
export function decode(token: string): TokenDecodeResult {
  try {
    const payload = decodeJwt(token)
    return {
      payload: payload as JwtPayload,
    }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Invalid token format',
    }
  }
}

// ============================================================================
// Backward Compatibility Functions
// These function names match the original exports expected by tests
// ============================================================================

/**
 * Legacy function: Verify a token and return user context
 * Alias for verify() with additional processing
 *
 * @deprecated Use verify() instead for new code
 */
export async function verifyToken(token: string): Promise<UserContext | null> {
  const result = await verify(token)

  if (!result.valid || !result.payload) {
    return null
  }

  // Validate token type
  if (result.payload.type !== 'user') {
    return null
  }

  return {
    userId: result.payload.sub,
    email: result.payload.email,
    role: result.payload.role,
    roles: result.payload.roles || [],
    permissions: result.payload.permissions || [],
    customPermissions: result.payload.customPermissions || [],
  }
}

/**
 * Legacy function: Sign a token
 * Alias for sign()
 *
 * @deprecated Use sign() instead for new code
 */
export async function signToken(
  payload: Omit<JwtPayload, 'iat' | 'exp' | 'iss' | 'aud'>,
  expiresIn?: number
): Promise<string> {
  return sign(payload, expiresIn)
}

/**
 * Legacy function: Create a JWT token for a user
 * Convenience function that builds the payload from user data
 */
export async function createJwtToken(
  user: {
    id: string
    email: string
    role: string
    roles?: string[]
    permissions?: string[]
    customPermissions?: string[]
  },
  expiresIn: number = 3600
): Promise<string> {
  return sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
      roles: user.roles || [],
      permissions: user.permissions || [],
      customPermissions: user.customPermissions || [],
      type: 'user',
    },
    expiresIn
  )
}

/**
 * Legacy function: Verify a JWT token and return user context
 * Same as verifyToken()
 *
 * @deprecated Use verify() instead for new code
 */
export async function verifyJwtToken(token: string): Promise<UserContext | null> {
  return verifyToken(token)
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if a token is expired
 * @param token - The JWT token to check
 * @returns true if token is expired, false otherwise
 */
export function isTokenExpired(token: string): boolean {
  const result = decode(token)

  if (!result.payload) {
    return true // Invalid tokens are considered expired
  }

  const exp = result.payload.exp
  if (!exp) {
    return false // No expiration time, consider it not expired
  }

  return exp < Math.floor(Date.now() / 1000)
}

/**
 * Get the time remaining until token expiration
 * @param token - The JWT token to check
 * @returns Time remaining in seconds, or 0 if expired/invalid
 */
export function getTokenTimeRemaining(token: string): number {
  const result = decode(token)

  if (!result.payload) {
    return 0
  }

  const exp = result.payload.exp
  if (!exp) {
    return Infinity // No expiration time
  }

  const remaining = exp - Math.floor(Date.now() / 1000)
  return Math.max(0, remaining)
}

/**
 * Validate token format (basic check)
 * @param token - The token to validate
 * @returns true if token format appears valid
 */
export function isValidTokenFormat(token: string): boolean {
  if (!token || typeof token !== 'string') {
    return false
  }

  // JWT tokens have 3 parts separated by dots
  const parts = token.split('.')
  if (parts.length !== 3) {
    return false
  }

  // Check that each part is non-empty
  return parts.every(part => part.length > 0)
}

/**
 * Export types for external use
 */
