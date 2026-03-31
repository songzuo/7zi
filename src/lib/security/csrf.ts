/**
 * CSRF Token Protection Module
 *
 * Provides CSRF (Cross-Site Request Forgery) token generation and validation
 * Uses SHA-256 HMAC for token generation
 */

import { createHash, randomBytes, timingSafeEqual } from 'crypto';

// ============================================================================
// Types
// ============================================================================

export interface CSRFTokenOptions {
  secret: string;
  salt?: string;
  expiresIn?: number; // milliseconds
}

export interface CSRFToken {
  token: string;
  expiresAt: number;
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

// ============================================================================
// Token Generation
// ============================================================================

/**
 * Generate CSRF token
 *
 * @param options - Token options
 * @returns CSRF token object
 */
export function generateCSRFToken(options: CSRFTokenOptions): CSRFToken {
  const { secret, salt, expiresIn = DEFAULT_EXPIRY } = options;

  // Generate random token
  const randomToken = randomBytes(32).toString('hex');

  // Create HMAC signature
  const hmac = createHMAC(randomToken, secret, salt);

  // Combine: randomToken.signature
  const token = `${randomToken}.${hmac}`;

  return {
    token,
    expiresAt: Date.now() + expiresIn,
  };
}

/**
 * Create HMAC signature
 */
function createHMAC(data: string, secret: string, salt?: string): string {
  const hmac = createHash('sha256');

  if (salt) {
    hmac.update(salt);
  }

  hmac.update(secret);
  hmac.update(data);

  return hmac.digest('hex');
}

// ============================================================================
// Token Validation
// ============================================================================

/**
 * Validate CSRF token
 *
 * @param token - Token to validate
 * @param secret - Secret used to generate token
 * @param salt - Salt used to generate token (optional)
 * @returns True if valid
 */
export function validateCSRFToken(
  token: string,
  secret: string,
  salt?: string
): boolean {
  try {
    // Split token
    const [randomToken, signature] = token.split('.');

    if (!randomToken || !signature) {
      return false;
    }

    // Recompute HMAC
    const expectedSignature = createHMAC(randomToken, secret, salt);

    // Use timing-safe comparison to prevent timing attacks
    return timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  } catch (_error) {
    return false;
  }
}

/**
 * Validate CSRF token with expiry
 *
 * @param tokenData - Token data object
 * @param secret - Secret used to generate token
 * @param salt - Salt used to generate token (optional)
 * @returns True if valid and not expired
 */
export function validateCSRFTokenWithExpiry(
  tokenData: CSRFToken,
  secret: string,
  salt?: string
): boolean {
  // Check expiry
  if (Date.now() > tokenData.expiresAt) {
    return false;
  }

  // Validate token
  return validateCSRFToken(tokenData.token, secret, salt);
}

// ============================================================================
// Token Management
// ============================================================================

/**
 * Generate token for session
 *
 * @param sessionId - Session ID
 * @param secret - Secret key
 * @returns CSRF token
 */
export function generateSessionCSRFToken(
  sessionId: string,
  secret: string
): string {
  const data = `${sessionId}.${randomBytes(16).toString('hex')}`;
  const signature = createHMAC(data, secret);
  return `${data}.${signature}`;
}

/**
 * Validate session CSRF token
 *
 * @param token - Token to validate
 * @param sessionId - Expected session ID
 * @param secret - Secret key
 * @returns True if valid
 */
export function validateSessionCSRFToken(
  token: string,
  sessionId: string,
  secret: string
): boolean {
  try {
    const [data, signature] = token.split('.');

    if (!data || !signature) {
      return false;
    }

    const [expectedSessionId] = data.split('.');

    if (expectedSessionId !== sessionId) {
      return false;
    }

    const expectedSignature = createHMAC(data, secret);

    return timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  } catch (_error) {
    return false;
  }
}

// ============================================================================
// HTTP Header Helpers
// ============================================================================

/**
 * Get CSRF token from request
 *
 * @param headers - Request headers
 * @param body - Request body (for form data)
 * @returns CSRF token or undefined
 */
export function getCSRFTokenFromRequest(
  headers: Headers | Record<string, string>,
  body?: Record<string, unknown>
): string | undefined {
  // Try header first
  let headerToken: string | undefined;
  if (headers instanceof Headers) {
    headerToken = headers.get('x-csrf-token') ?? undefined;
  } else {
    headerToken = headers['x-csrf-token'] as string | undefined;
  }
  if (headerToken) {
    return headerToken;
  }

  // Try body
  if (body) {
    const bodyToken = body.csrfToken as string | undefined;
    if (bodyToken) {
      return bodyToken;
    }

    const bodyToken2 = body._csrf as string | undefined;
    if (bodyToken2) {
      return bodyToken2;
    }
  }

  return undefined;
}

/**
 * Set CSRF token in response headers
 *
 * @param headers - Response headers
 * @param token - CSRF token
 */
export function setCSRFTokenInResponse(
  headers: Headers,
  token: string
): void {
  headers.set('X-CSRF-Token', token);
}

/**
 * Get CSRF secret from environment
 *
 * @returns CSRF secret
 */
export function getCSRFSecret(): string {
  const secret = process.env.CSRF_SECRET;
  if (!secret) {
    throw new Error('CSRF_SECRET environment variable is required');
  }
  return secret;
}

/**
 * Generate CSRF token using environment secret
 *
 * @param expiresIn - Token expiry in milliseconds
 * @returns CSRF token
 */
export function generateCSRFFromEnv(expiresIn?: number): CSRFToken {
  return generateCSRFToken({
    secret: getCSRFSecret(),
    expiresIn,
  });
}

/**
 * Validate CSRF token using environment secret
 *
 * @param token - Token to validate
 * @returns True if valid
 */
export function validateCSFFromEnv(token: string): boolean {
  return validateCSRFToken(token, getCSRFSecret());
}

// ============================================================================
// Middleware Helpers
// ============================================================================

/**
 * Check if request should be protected from CSRF
 *
 * @param method - HTTP method
 * @returns True if should be protected
 */
export function shouldProtectFromCSRF(method: string): boolean {
  const safeMethods = ['GET', 'HEAD', 'OPTIONS', 'TRACE'];
  return !safeMethods.includes(method.toUpperCase());
}

/**
 * Check if request has CSRF token
 *
 * @param headers - Request headers
 * @param body - Request body
 * @returns True if CSRF token is present
 */
export function hasCSRFToken(
  headers: Headers | Record<string, string>,
  body?: Record<string, unknown>
): boolean {
  const token = getCSRFTokenFromRequest(headers, body);
  return token !== undefined && token.length > 0;
}

// ============================================================================
// Token Utilities
// ============================================================================

/**
 * Check if token is expired
 *
 * @param tokenData - Token data
 * @returns True if expired
 */
export function isTokenExpired(tokenData: CSRFToken): boolean {
  return Date.now() > tokenData.expiresAt;
}

/**
 * Get remaining time until token expiry
 *
 * @param tokenData - Token data
 * @returns Remaining time in milliseconds
 */
export function getTokenRemainingTime(tokenData: CSRFToken): number {
  return Math.max(0, tokenData.expiresAt - Date.now());
}

/**
 * Format expiry time as human-readable string
 *
 * @param tokenData - Token data
 * @returns Formatted expiry time
 */
export function formatTokenExpiry(tokenData: CSRFToken): string {
  const remaining = getTokenRemainingTime(tokenData);

  if (remaining === 0) {
    return 'Expired';
  }

  const hours = Math.floor(remaining / (60 * 60 * 1000));
  const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    return `${minutes}m`;
  } else {
    return '< 1m';
  }
}
