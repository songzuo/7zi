/**
 * Mock for jose library - simplifies JWT testing by avoiding WebCrypto API requirements.
 *
 * The signature is derived from the secret key (HMAC-SHA256 over the signing
 * input) so that `verify()` can actually reject a token signed with a
 * different secret. A mock that ignores the secret entirely makes
 * "wrong secret" and "expired token" assertions meaningless.
 */

import { createHmac } from 'node:crypto'

let globalCounter = 0
const currentTimestamp = Math.floor(Date.now() / 1000)
const lastSecret = ''

// JWT Payload interface
interface JWTPayload {
  iat?: number
  exp?: number
  iss?: string
  aud?: string
  [key: string]: unknown
}

const b64url = (input: Buffer | string): string =>
  Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

const b64urlDecode = (input: string): Buffer =>
  Buffer.from(input.replace(/-/g, '+').replace(/_/g, '/'), 'base64')

/** Derive a deterministic signature from the signing input and the secret. */
const computeSignature = (signingInput: string, secretKey?: Uint8Array | string): string => {
  const secret =
    secretKey === undefined
      ? ''
      : typeof secretKey === 'string'
        ? secretKey
        : Buffer.from(secretKey).toString('utf8')
  return b64url(createHmac('sha256', secret).update(signingInput).digest())
}

// Simple JWT implementation for testing
const mockSign = async (
  payload?: JWTPayload,
  expiresIn: number = 3600,
  secretKey?: Uint8Array | string,
  issuer: string = '7zi-api',
  audience: string = '7zi-users'
) => {
  // Increment counter for each sign to make tokens unique
  globalCounter++

  // Use real time for expiration, but vary it slightly for uniqueness
  const now = Math.floor(Date.now() / 1000)

  // Create a mock JWT token (not a real JWT, but functional for testing)
  const header = { alg: 'HS256', typ: 'JWT' }
  const fullPayload = {
    ...payload,
    iat: now,
    exp: now + expiresIn,
    iss: issuer,
    aud: audience,
    _counter: globalCounter, // Make tokens unique even with same payload
  }

  // Simple base64 encoding for mock (not secure, only for testing)
  const headerEncoded = b64url(JSON.stringify(header))
  const payloadEncoded = b64url(JSON.stringify(fullPayload))
  const signature = computeSignature(`${headerEncoded}.${payloadEncoded}`, secretKey)

  return `${headerEncoded}.${payloadEncoded}.${signature}`
}

const mockVerify = async (token: string, secretKey?: string | Uint8Array, options?: Record<string, unknown>) => {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) throw new Error('Invalid token format')

    const payload = JSON.parse(b64urlDecode(parts[1]).toString())
    const now = Math.floor(Date.now() / 1000)

    // The signature must match the one produced with THIS secret, otherwise
    // the token was signed with a different key.
    const expected = computeSignature(`${parts[0]}.${parts[1]}`, secretKey)
    if (expected !== parts[2]) {
      throw new Error('Invalid signature')
    }

    // Check expiration
    if (payload.exp && payload.exp < now) {
      throw new Error('Token expired')
    }

    // Validate issuer / audience when the caller asked for it, mirroring jose.
    const expectedIssuer = options?.issuer as string | undefined
    if (expectedIssuer !== undefined && payload.iss !== expectedIssuer) {
      throw new Error('Unexpected "iss" claim value')
    }
    const expectedAudience = options?.audience as string | undefined
    if (expectedAudience !== undefined && payload.aud !== expectedAudience) {
      throw new Error('Unexpected "aud" claim value')
    }

    return { payload }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Token verification failed'
    // Map to jose error format
    if (msg.includes('exp')) {
      throw new Error('Token expired')
    }
    throw new Error(msg)
  }
}

const mockDecode = (token: string) => {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) throw new Error('Invalid token format')
    return JSON.parse(Buffer.from(parts[1], 'base64').toString())
  } catch (error) {
    throw new Error('Token decoding failed')
  }
}

/**
 * Parse a jose-style duration string ('1h', '30m', '3600s', '2d') into seconds.
 * jose accepts both numbers and duration strings; the mock must handle both or
 * `exp` is silently wrong whenever the caller uses a duration string.
 */
const parseDuration = (exp: string | number): number => {
  if (typeof exp === 'number') return exp
  // Allow a leading '-' so negative durations (e.g. '-1s' for an
  // already-expired token) are honoured like jose does.
  const match = /^(-?\d+(?:\.\d+)?)\s*([smhd])?$/.exec(exp.trim())
  if (!match) return 0
  const value = Number(match[1])
  switch (match[2]) {
    case 'd':
      return value * 86400
    case 'h':
      return value * 3600
    case 'm':
      return value * 60
    case 's':
    default:
      return value
  }
}

export const SignJWT = class {
  private payload: JWTPayload = {}
  private expiration: number = 3600
  private issuer?: string
  private audience?: string

  constructor(payload: JWTPayload) {
    this.payload = payload
  }
  setProtectedHeader() {
    return this
  }
  setIssuedAt() {
    return this
  }
  setExpirationTime(exp: string | number) {
    this.expiration = parseDuration(exp)
    return this
  }
  setIssuer(issuer: string) {
    this.issuer = issuer
    return this
  }
  setAudience(audience: string) {
    this.audience = audience
    return this
  }
  async sign(secretKey?: string | Uint8Array) {
    return await mockSign(this.payload, this.expiration, secretKey, this.issuer, this.audience)
  }
}

export const jwtVerify = mockVerify
export const decodeJwt = mockDecode
export const jwtSign = mockSign
