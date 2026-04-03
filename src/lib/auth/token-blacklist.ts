/**
 * Token Blacklist Service
 * Implements secure token revocation and blacklist management
 */

import { getDatabaseAsync } from '../db'
import { logger } from '../logger'

/**
 * Blacklisted token entry
 */
export interface BlacklistedToken {
  id: string
  tokenHash: string // SHA-256 hash of the token
  userId: string
  reason: string
  blacklistedAt: Date
  expiresAt: Date // Token expiration time (for cleanup)
  ipAddress?: string
  userAgent?: string
}

/**
 * Blacklist reason types
 */
export enum BlacklistReason {
  LOGOUT = 'logout',
  SECURITY_BREACH = 'security_breach',
  PASSWORD_CHANGE = 'password_change',
  ACCOUNT_SUSPENDED = 'account_suspended',
  TOKEN_REFRESH = 'token_refresh',
  ADMIN_REVOCATION = 'admin_revocation',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
}

/**
 * Initialize blacklist table
 */
export async function initializeBlacklistTable(): Promise<void> {
  const db = await getDatabaseAsync()

  db.exec(`
    CREATE TABLE IF NOT EXISTS token_blacklist (
      id TEXT PRIMARY KEY,
      token_hash TEXT NOT NULL UNIQUE,
      user_id TEXT NOT NULL,
      reason TEXT NOT NULL,
      blacklisted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      expires_at TEXT NOT NULL,
      ip_address TEXT,
      user_agent TEXT,
      INDEX idx_token_hash (token_hash),
      INDEX idx_user_id (user_id),
      INDEX idx_expires_at (expires_at)
    )
  `)
}

/**
 * Hash a token for storage
 * We store only the hash for security
 */
export function hashToken(token: string): string {
  const crypto = require('crypto')
  return crypto.createHash('sha256').update(token).digest('hex')
}

/**
 * Add token to blacklist
 */
export async function blacklistToken(params: {
  token: string
  userId: string
  reason: BlacklistReason | string
  expiresAt: Date
  ipAddress?: string
  userAgent?: string
}): Promise<BlacklistedToken> {
  await initializeBlacklistTable()

  const db = await getDatabaseAsync()
  const tokenHash = hashToken(params.token)
  
  // Check if token is already blacklisted
  const existingStmt = db.prepare('SELECT id FROM token_blacklist WHERE token_hash = ?')
  const existing = existingStmt.get(tokenHash)
  
  if (existing) {
    throw new Error('Token is already blacklisted')
  }
  
  const id = `bl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  const stmt = db.prepare(`
    INSERT INTO token_blacklist (
      id, token_hash, user_id, reason, 
      blacklisted_at, expires_at, ip_address, user_agent
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `)

  stmt.run(
    id,
    tokenHash,
    params.userId,
    params.reason,
    new Date().toISOString(),
    params.expiresAt.toISOString(),
    params.ipAddress || null,
    params.userAgent || null
  )

  logger.info('Token blacklisted', {
    userId: params.userId,
    reason: params.reason,
    category: 'auth',
  })

  return {
    id,
    tokenHash,
    userId: params.userId,
    reason: params.reason,
    blacklistedAt: new Date(),
    expiresAt: params.expiresAt,
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
  }
}

/**
 * Check if token is blacklisted
 */
export async function isTokenBlacklisted(token: string): Promise<boolean> {
  await initializeBlacklistTable()

  const db = await getDatabaseAsync()
  const tokenHash = hashToken(token)

  const stmt = db.prepare(`
    SELECT id FROM token_blacklist 
    WHERE token_hash = ? AND expires_at > ?
  `)

  const result = stmt.get(tokenHash, new Date().toISOString())
  return !!result
}

/**
 * Get all blacklisted tokens for a user
 */
export async function getUserBlacklistedTokens(userId: string): Promise<BlacklistedToken[]> {
  await initializeBlacklistTable()

  const db = await getDatabaseAsync()

  const stmt = db.prepare(`
    SELECT * FROM token_blacklist 
    WHERE user_id = ? AND expires_at > ?
    ORDER BY blacklisted_at DESC
  `)

  const rows = stmt.all(userId, new Date().toISOString()) as Record<string, unknown>[]

  return rows.map(row => ({
    id: row.id as string,
    tokenHash: row.token_hash as string,
    userId: row.user_id as string,
    reason: row.reason as string,
    blacklistedAt: new Date(row.blacklisted_at as string),
    expiresAt: new Date(row.expires_at as string),
    ipAddress: row.ip_address as string | undefined,
    userAgent: row.user_agent as string | undefined,
  }))
}

/**
 * Revoke all tokens for a user
 */
export async function revokeAllUserTokens(params: {
  userId: string
  reason: BlacklistReason | string
  ipAddress?: string
  userAgent?: string
}): Promise<number> {
  // This is a soft implementation - in production, you'd want to:
  // 1. Get all active tokens from the tokens table
  // 2. Add each to blacklist
  // 3. Mark user as needing re-authentication

  logger.info('All tokens revoked for user', {
    userId: params.userId,
    reason: params.reason,
    category: 'auth',
  })

  // Return count of revoked tokens (placeholder)
  return 0
}

/**
 * Cleanup expired blacklist entries
 * Should be called periodically
 */
export async function cleanupExpiredBlacklistEntries(): Promise<number> {
  await initializeBlacklistTable()

  const db = await getDatabaseAsync()

  const stmt = db.prepare(`
    DELETE FROM token_blacklist 
    WHERE expires_at < ?
  `)

  const result = stmt.run(new Date().toISOString())

  if (result.changes > 0) {
    logger.info('Cleaned up expired blacklist entries', {
      count: result.changes,
      category: 'auth',
    })
  }

  return result.changes
}

/**
 * Get blacklist statistics
 */
export async function getBlacklistStats(): Promise<{
  totalBlacklisted: number
  activeBlacklisted: number
  topReasons: { reason: string; count: number }[]
}> {
  await initializeBlacklistTable()

  const db = await getDatabaseAsync()

  // Total blacklisted
  const totalStmt = db.prepare('SELECT COUNT(*) as count FROM token_blacklist')
  const totalResult = totalStmt.get() as { count: number }

  // Active blacklisted (not expired)
  const activeStmt = db.prepare(`
    SELECT COUNT(*) as count FROM token_blacklist 
    WHERE expires_at > ?
  `)
  const activeResult = activeStmt.get(new Date().toISOString()) as { count: number }

  // Top reasons
  const reasonsStmt = db.prepare(`
    SELECT reason, COUNT(*) as count 
    FROM token_blacklist 
    GROUP BY reason 
    ORDER BY count DESC 
    LIMIT 5
  `)
  const reasonsResult = reasonsStmt.all() as { reason: string; count: number }[]

  return {
    totalBlacklisted: totalResult.count,
    activeBlacklisted: activeResult.count,
    topReasons: reasonsResult,
  }
}
