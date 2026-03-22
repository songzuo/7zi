/**
 * JWT Utilities
 * JWT token generation and validation
 */

import * as jwt from '../jwt-mock';

// ============================================================================
// Types
// ============================================================================

export interface JWTPayload {
  userId: string;
  email?: string;
  role?: string;
  iat?: number;
  exp?: number;
}

// ============================================================================
// JWT Functions
// ============================================================================

/**
 * Generate a JWT token
 */
export function generateToken(payload: JWTPayload, secret: string, expiresIn: string = '1d'): string {
  return jwt.sign(payload, secret);
}

/**
 * Verify a JWT token
 */
export function verifyToken(token: string, secret: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, secret) as Record<string, unknown> | JWTPayload | null;
    if (!decoded || !('userId' in decoded)) {
      return null;
    }
    return decoded as JWTPayload;
  } catch (error) {
    return null;
  }
}

/**
 * Decode a JWT token without verification
 */
export function decodeToken(token: string): JWTPayload | null {
  const decoded = jwt.decodeToken(token) as Record<string, unknown> | JWTPayload | null;
  if (!decoded || !('userId' in decoded)) {
    return null;
  }
  return decoded as JWTPayload;
}

/**
 * Check if token is expired
 */
export function isTokenExpired(token: string): boolean {
  return jwt.isTokenExpired(token);
}
