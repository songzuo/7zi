/**
 * Password hashing / verification primitives
 *
 * Centralised so that the "real" verification path and the "dummy" verification
 * path (used to defeat user-enumeration timing side channels) always perform
 * exactly the same amount of work:
 *   - same KDF (pbkdf2)
 *   - same iteration count
 *   - same output length
 *   - same digest
 *
 * Comparisons are done with crypto.timingSafeEqual to avoid leaking digest
 * bytes through early-exit string comparison.
 */

import crypto from 'crypto'

/** PBKDF2 iteration count (must stay in sync with the stored hashes) */
export const PBKDF2_ITERATIONS = 10000
/** PBKDF2 derived key length in bytes */
export const PBKDF2_KEY_LENGTH = 64
/** PBKDF2 digest */
export const PBKDF2_DIGEST = 'sha512'

/**
 * Fixed, non-secret salt used for the dummy verification.
 * It never belongs to a real account.
 */
export const DUMMY_PASSWORD_SALT = 'f468068d84e7e7df2282e3c173132562'

/**
 * Fixed, non-secret hash (pbkdf2 of a value no user can supply) used as the
 * comparison target of the dummy verification. Same `salt:hash` format and the
 * same work factor as a real stored hash.
 */
export const DUMMY_PASSWORD_HASH =
  'f468068d84e7e7df2282e3c173132562:c08698bee34b03922737ec67671adda8c9294c6a8027143454a85b98a28853e94b9a8dadf39e63d231340704c2f990945823ecfd944db28c033749230d2d6a95'

/**
 * Constant-time comparison of two hex digests.
 *
 * Returns false (never throws) when the digests have different lengths or are
 * not valid hex. A dummy comparison is still performed in that case so the
 * function does not become an obvious timing oracle itself.
 */
export function timingSafeCompareHex(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'hex')
  const bufB = Buffer.from(b, 'hex')

  if (bufA.length === 0 || bufB.length === 0 || bufA.length !== bufB.length) {
    // Length mismatch: compare a buffer with itself so the work performed is
    // comparable to a real comparison, then report failure.
    crypto.timingSafeEqual(bufA, bufA)
    return false
  }

  return crypto.timingSafeEqual(bufA, bufB)
}

/**
 * Hash a password -> `salt:hash` (hex salt + hex pbkdf2 digest)
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto
    .pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, PBKDF2_KEY_LENGTH, PBKDF2_DIGEST)
    .toString('hex')
  return `${salt}:${hash}`
}

/**
 * Verify a password against a stored `salt:hash` value.
 * Uses timing-safe comparison of the derived digest.
 */
export function verifyPassword(password: string, hashedPassword: string): boolean {
  const [salt, hash] = (hashedPassword || '').split(':')
  const derived = crypto
    .pbkdf2Sync(
      password,
      salt ?? '',
      PBKDF2_ITERATIONS,
      PBKDF2_KEY_LENGTH,
      PBKDF2_DIGEST
    )
    .toString('hex')

  if (!hash) {
    // Malformed stored hash: still consume the same KDF work, then fail.
    return false
  }

  return timingSafeCompareHex(hash, derived)
}

/**
 * Perform a verification against a fixed dummy hash.
 *
 * Used when the supplied email does not belong to any account: it executes the
 * exact same pbkdf2 work as the real verification path so that the response
 * time does not reveal whether the account exists.
 *
 * The return value is meaningless (it can never be true for a real password)
 * and MUST be discarded by callers.
 */
export function verifyPasswordWithDummyHash(password: string): boolean {
  const derived = crypto
    .pbkdf2Sync(
      password,
      DUMMY_PASSWORD_SALT,
      PBKDF2_ITERATIONS,
      PBKDF2_KEY_LENGTH,
      PBKDF2_DIGEST
    )
    .toString('hex')

  return timingSafeCompareHex(DUMMY_PASSWORD_HASH.split(':')[1] ?? '', derived)
}
