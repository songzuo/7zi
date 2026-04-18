/**
 * Webhook Signature Verification (HMAC-SHA256)
 * v1.12.0 - Webhook Event Notification System
 */

import crypto from 'crypto'
import type { SignatureVerificationResult, WebhookSignatureHeaders } from './types'

// ============================================================
// Constants
// ============================================================

const SIGNATURE_HEADER = 'x-webhook-signature'
const TIMESTAMP_HEADER = 'x-webhook-timestamp'
const NONCE_HEADER = 'x-webhook-nonce'
const SIGNATURE_PREFIX = 'sha256='
const TIMESTAMP_TOLERANCE = 5 * 60 * 1000 // 5 minutes

// ============================================================
// Signature Generation
// ============================================================

/**
 * Generate HMAC-SHA256 signature for a payload
 *
 * @param payload - The payload to sign (will be JSON stringified if object)
 * @param secret - The webhook secret
 * @param timestamp - Optional timestamp (current time if not provided)
 * @returns The signature header value
 */
export function generateSignature(payload: unknown, secret: string, timestamp?: number): string {
  const ts = timestamp ?? Date.now()
  const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload)

  // Create the string to sign
  const stringToSign = `${ts}.${payloadString}`

  // Generate HMAC-SHA256
  const hmac = crypto.createHmac('sha256', secret)
  hmac.update(stringToSign)
  const signature = hmac.digest('hex')

  return `${SIGNATURE_PREFIX}${signature}`
}

/**
 * Generate full webhook signature headers
 *
 * @param payload - The payload to sign
 * @param secret - The webhook secret
 * @returns Object with signature, timestamp, and nonce headers
 */
export function generateSignatureHeaders(
  payload: unknown,
  secret: string
): WebhookSignatureHeaders {
  const timestamp = Date.now().toString()
  const nonce = crypto.randomBytes(16).toString('hex')
  const signature = generateSignature(payload, secret, parseInt(timestamp, 10))

  return {
    signature,
    timestamp,
    nonce,
  }
}

// ============================================================
// Signature Verification
// ============================================================

/**
 * Verify HMAC-SHA256 signature
 *
 * @param payload - The received payload
 * @param signature - The received signature
 * @param secret - The webhook secret
 * @param timestamp - Optional timestamp for replay attack prevention
 * @returns Verification result
 */
export function verifySignature(
  payload: unknown,
  signature: string,
  secret: string,
  timestamp?: string | number
): SignatureVerificationResult {
  try {
    // Check signature format
    if (!signature.startsWith(SIGNATURE_PREFIX)) {
      return {
        valid: false,
        error: 'Invalid signature format',
      }
    }

    // Extract signature hash
    const receivedSignature = signature.slice(SIGNATURE_PREFIX.length)

    // Verify timestamp if provided
    if (timestamp) {
      const ts = typeof timestamp === 'string' ? parseInt(timestamp, 10) : timestamp

      const now = Date.now()
      const diff = Math.abs(now - ts)

      if (diff > TIMESTAMP_TOLERANCE) {
        return {
          valid: false,
          error: 'Timestamp too old or too new',
        }
      }
    }

    // Generate expected signature
    const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload)

    const ts = timestamp
      ? typeof timestamp === 'string'
        ? parseInt(timestamp, 10)
        : timestamp
      : Date.now()

    const stringToSign = `${ts}.${payloadString}`
    const hmac = crypto.createHmac('sha256', secret)
    hmac.update(stringToSign)
    const expectedSignature = hmac.digest('hex')

    // Compare signatures using constant-time comparison
    const valid = crypto.timingSafeEqual(
      Buffer.from(receivedSignature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    )

    if (!valid) {
      return {
        valid: false,
        error: 'Signature mismatch',
      }
    }

    return { valid: true }
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Verify signature from headers
 *
 * @param headers - The request headers
 * @param payload - The request payload
 * @param secret - The webhook secret
 * @returns Verification result
 */
export function verifySignatureFromHeaders(
  headers: Record<string, string>,
  payload: unknown,
  secret: string
): SignatureVerificationResult {
  const signature = headers[SIGNATURE_HEADER.toLowerCase()]
  const timestamp = headers[TIMESTAMP_HEADER.toLowerCase()]

  if (!signature) {
    return {
      valid: false,
      error: 'Missing signature header',
    }
  }

  return verifySignature(payload, signature, secret, timestamp)
}

// ============================================================
// Utility Functions
// ============================================================

/**
 * Check if headers contain webhook signature
 *
 * @param headers - The request headers
 * @returns True if signature headers are present
 */
export function hasValidSignatureHeaders(headers: Record<string, string>): boolean {
  const signature = headers[SIGNATURE_HEADER.toLowerCase()]
  const timestamp = headers[TIMESTAMP_HEADER.toLowerCase()]

  return !!(signature && timestamp)
}

/**
 * Extract webhook signature headers from request headers
 *
 * @param headers - The request headers
 * @returns Webhook signature headers or null if not found
 */
export function extractSignatureHeaders(
  headers: Record<string, string>
): WebhookSignatureHeaders | null {
  const signature = headers[SIGNATURE_HEADER.toLowerCase()]
  const timestamp = headers[TIMESTAMP_HEADER.toLowerCase()]
  const nonce = headers[NONCE_HEADER.toLowerCase()]

  if (!signature || !timestamp) {
    return null
  }

  return {
    signature,
    timestamp,
    nonce,
  }
}

/**
 * Normalize headers to lowercase keys
 *
 * @param headers - The request headers
 * @returns Headers with lowercase keys
 */
export function normalizeHeaders(
  headers: Record<string, string | string[] | undefined>
): Record<string, string> {
  const normalized: Record<string, string> = {}

  for (const [key, value] of Object.entries(headers)) {
    if (value) {
      normalized[key.toLowerCase()] = Array.isArray(value) ? value[0] : value
    }
  }

  return normalized
}
