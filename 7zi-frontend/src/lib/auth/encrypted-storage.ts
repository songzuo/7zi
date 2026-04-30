/**
 * Encrypted Storage Utilities
 *
 * Provides AES-GCM encryption for sensitive data stored in localStorage.
 * Uses Web Crypto API for browser-side encryption.
 * This replaces storing tokens and sensitive data in plaintext localStorage.
 *
 * Security recommendations:
 * 1. Best: Use httpOnly, Secure, SameSite=Strict cookies for tokens (server-set)
 * 2. Good: Encrypted localStorage with key derived from user password (this module)
 * 3. Minimum: Obfuscated storage with warning that httpOnly cookies are preferred
 */

const ENCRYPTION_ENABLED = process.env.NEXT_PUBLIC_TOKEN_ENCRYPTION === 'true'
const STORAGE_KEY_PREFIX = '7zi-enc-'

// Derive an AES-GCM key from a master secret using PBKDF2
async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder()
  const passwordBuffer = encoder.encode(password)

  const baseKey = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    'PBKDF2',
    false,
    ['deriveKey']
  )

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

/**
 * Encrypt data using AES-GCM
 */
export async function encryptData(plaintext: string, secretKey: string): Promise<string> {
  const encoder = new TextEncoder()
  const iv = crypto.getRandomValues(new Uint8Array(12)) // 96-bit IV for GCM
  const key = await deriveKey(secretKey, iv.slice(0, 16)) // Use first 16 bytes of IV as salt

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(plaintext)
  )

  // Combine IV + ciphertext and encode as base64
  const combined = new Uint8Array(iv.length + encrypted.byteLength)
  combined.set(iv)
  combined.set(new Uint8Array(encrypted), iv.length)

  return btoa(String.fromCharCode(...combined))
}

/**
 * Decrypt data using AES-GCM
 */
export async function decryptData(ciphertext: string, secretKey: string): Promise<string> {
  const combined = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0))
  const iv = combined.slice(0, 12)
  const data = combined.slice(12)

  const key = await deriveKey(secretKey, iv.slice(0, 16))

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  )

  return new TextDecoder().decode(decrypted)
}

/**
 * Get or create the encryption key for this session
 * In production, this should be derived from the user's password or a server-provided key
 */
function getSessionKey(): string {
  if (typeof window === 'undefined') return ''

  let key = sessionStorage.getItem('7zi-enc-session-key')
  if (!key) {
    // Generate a random session key - note: this key is lost on tab close
    // For persistent encrypted storage, the key should come from the server
    const array = new Uint8Array(32)
    crypto.getRandomValues(array)
    key = btoa(String.fromCharCode(...array))
    sessionStorage.setItem('7zi-enc-session-key', key)
  }
  return key
}

/**
 * Encrypted localStorage wrapper
 */
export const encryptedStorage = {
  async setItem(key: string, value: string): Promise<void> {
    if (typeof window === 'undefined') return

    if (ENCRYPTION_ENABLED) {
      const encrypted = await encryptData(value, getSessionKey())
      localStorage.setItem(STORAGE_KEY_PREFIX + key, encrypted)
    } else {
      localStorage.setItem(key, value)
    }
  },

  async getItem(key: string): Promise<string | null> {
    if (typeof window === 'undefined') return null

    if (ENCRYPTION_ENABLED) {
      const encrypted = localStorage.getItem(STORAGE_KEY_PREFIX + key)
      if (!encrypted) return null
      try {
        return await decryptData(encrypted, getSessionKey())
      } catch {
        console.error('[EncryptedStorage] Decryption failed - data may be corrupted or from a different session')
        return null
      }
    } else {
      return localStorage.getItem(key)
    }
  },

  async removeItem(key: string): Promise<void> {
    if (typeof window === 'undefined') return
    localStorage.removeItem(STORAGE_KEY_PREFIX + key)
    if (!ENCRYPTION_ENABLED) {
      localStorage.removeItem(key)
    }
  },
}

/**
 * Recommended: Use httpOnly cookies for token storage
 * This function documents the recommendation and provides a migration path
 */
export const tokenStorageRecommendation = {
  isHttpOnlyCookiePreferred: true,
  why: 'httpOnly cookies cannot be accessed by JavaScript (XSS cannot steal the token), whereas localStorage is fully accessible to any JS running on the page.',
  migrationSteps: [
    '1. Server should set token in httpOnly, Secure, SameSite=Strict cookie on login',
    '2. Remove token from localStorage entirely',
    '3. API routes should read token from cookie instead of Authorization header',
    '4. Use csrfToken from cookie for CSRF protection',
  ],
  envVars: {
    TOKEN_COOKIE_NAME: 'auth-token',
    TOKEN_COOKIE_MAX_AGE: '86400', // 24 hours
    TOKEN_COOKIE_FLAGS: 'HttpOnly; Secure; SameSite=Strict; Path=/',
  },
}
