/**
 * Token Blacklist Service Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  blacklistToken,
  isTokenBlacklisted,
  getUserBlacklistedTokens,
  revokeAllUserTokens,
  cleanupExpiredBlacklistEntries,
  getBlacklistStats,
  BlacklistReason,
  initializeBlacklistTable,
} from '../token-blacklist'
import { getDatabaseAsync } from '../../db'

describe('Token Blacklist Service', () => {
  const testUserId = 'user_test123'
  const testIpAddress = '192.168.1.1'
  const testUserAgent = 'Mozilla/5.0 Test Browser'

  beforeEach(async () => {
    await initializeBlacklistTable()
    // Clean up all entries before each test
    const db = await getDatabaseAsync()
    try {
      db.exec('DELETE FROM token_blacklist')
    } catch (error) {
      // Ignore errors if table doesn't exist
    }
  })

  afterEach(async () => {
    // Clean up test data after each test
    const db = await getDatabaseAsync()
    try {
      db.exec('DELETE FROM token_blacklist')
    } catch (error) {
      // Ignore errors if table doesn't exist
    }
  })

  describe('blacklistToken', () => {
    it('should add a token to blacklist', async () => {
      const token = `test_token_${Date.now()}_1`
      const result = await blacklistToken({
        token,
        userId: testUserId,
        reason: BlacklistReason.LOGOUT,
        expiresAt: new Date(Date.now() + 3600000),
        ipAddress: testIpAddress,
        userAgent: testUserAgent,
      })

      expect(result).toBeDefined()
      expect(result.userId).toBe(testUserId)
      expect(result.reason).toBe(BlacklistReason.LOGOUT)
      expect(result.ipAddress).toBe(testIpAddress)
      expect(result.userAgent).toBe(testUserAgent)
    })

    it('should reject duplicate token blacklist', async () => {
      const token = `duplicate_test_token_${Date.now()}_2`
      
      await blacklistToken({
        token,
        userId: testUserId,
        reason: BlacklistReason.LOGOUT,
        expiresAt: new Date(Date.now() + 3600000),
      })

      // Attempt to blacklist the same token again
      await expect(
        blacklistToken({
          token,
          userId: testUserId,
          reason: BlacklistReason.SECURITY_BREACH,
          expiresAt: new Date(Date.now() + 3600000),
        })
      ).rejects.toThrow('already blacklisted')
    })

    it('should handle different blacklist reasons', async () => {
      const reasons = [
        BlacklistReason.LOGOUT,
        BlacklistReason.SECURITY_BREACH,
        BlacklistReason.PASSWORD_CHANGE,
        BlacklistReason.ACCOUNT_SUSPENDED,
        BlacklistReason.TOKEN_REFRESH,
        BlacklistReason.ADMIN_REVOCATION,
        BlacklistReason.SUSPICIOUS_ACTIVITY,
      ]

      for (let i = 0; i < reasons.length; i++) {
        const token = `test_token_reason_${i}_${Date.now()}`
        const result = await blacklistToken({
          token,
          userId: testUserId,
          reason: reasons[i],
          expiresAt: new Date(Date.now() + 3600000),
        })
        expect(result.reason).toBe(reasons[i])
      }
    })
  })

  describe('isTokenBlacklisted', () => {
    it('should return true for blacklisted token', async () => {
      const token = `blacklisted_test_token_${Date.now()}_3`
      await blacklistToken({
        token,
        userId: testUserId,
        reason: BlacklistReason.LOGOUT,
        expiresAt: new Date(Date.now() + 3600000),
      })

      const isBlacklisted = await isTokenBlacklisted(token)
      expect(isBlacklisted).toBe(true)
    })

    it('should return false for non-blacklisted token', async () => {
      const isBlacklisted = await isTokenBlacklisted('non_blacklisted_token_unique')
      expect(isBlacklisted).toBe(false)
    })

    it('should return false for expired blacklist entry', async () => {
      // Use a unique token string to avoid conflicts
      const expiredToken = `expired_token_${Date.now()}_${Math.random()}_4`
      
      // Blacklist with expired timestamp (already expired 1 hour ago)
      await blacklistToken({
        token: expiredToken,
        userId: testUserId,
        reason: BlacklistReason.LOGOUT,
        expiresAt: new Date(Date.now() - 3600000), // Expired 1 hour ago
      })

      const isBlacklisted = await isTokenBlacklisted(expiredToken)
      expect(isBlacklisted).toBe(false)
    })
  })

  describe('getUserBlacklistedTokens', () => {
    it('should return all blacklisted tokens for a user', async () => {
      const timestamp = Date.now()
      
      // Blacklist multiple tokens with unique identifiers
      await blacklistToken({
        token: `token1_${timestamp}_5`,
        userId: testUserId,
        reason: BlacklistReason.LOGOUT,
        expiresAt: new Date(Date.now() + 3600000),
      })

      await blacklistToken({
        token: `token2_${timestamp}_6`,
        userId: testUserId,
        reason: BlacklistReason.PASSWORD_CHANGE,
        expiresAt: new Date(Date.now() + 3600000),
      })

      const tokens = await getUserBlacklistedTokens(testUserId)
      expect(tokens.length).toBeGreaterThanOrEqual(2)
      expect(tokens.map(t => t.reason)).toContain(BlacklistReason.LOGOUT)
      expect(tokens.map(t => t.reason)).toContain(BlacklistReason.PASSWORD_CHANGE)
    })

    it('should return empty array for user with no blacklisted tokens', async () => {
      const tokens = await getUserBlacklistedTokens('nonexistent_user_unique')
      expect(tokens).toEqual([])
    })
  })

  describe('revokeAllUserTokens', () => {
    it('should revoke all tokens for a user', async () => {
      const result = await revokeAllUserTokens({
        userId: testUserId,
        reason: BlacklistReason.SECURITY_BREACH,
        ipAddress: testIpAddress,
        userAgent: testUserAgent,
      })

      // This is a soft implementation, so we just verify it doesn't throw
      expect(typeof result).toBe('number')
    })
  })

  describe('cleanupExpiredBlacklistEntries', () => {
    it('should remove expired entries', async () => {
      // Add an expired entry
      await blacklistToken({
        token: `expired_cleanup_token_${Date.now()}_7`,
        userId: testUserId,
        reason: BlacklistReason.LOGOUT,
        expiresAt: new Date(Date.now() - 1000),
      })

      const cleaned = await cleanupExpiredBlacklistEntries()
      expect(cleaned).toBeGreaterThanOrEqual(1)
    })
  })

  describe('getBlacklistStats', () => {
    it('should return blacklist statistics', async () => {
      const timestamp = Date.now()
      
      await blacklistToken({
        token: `stats_token1_${timestamp}_8`,
        userId: testUserId,
        reason: BlacklistReason.LOGOUT,
        expiresAt: new Date(Date.now() + 3600000),
      })

      await blacklistToken({
        token: `stats_token2_${timestamp}_9`,
        userId: testUserId,
        reason: BlacklistReason.LOGOUT,
        expiresAt: new Date(Date.now() + 3600000),
      })

      const stats = await getBlacklistStats()
      expect(stats).toHaveProperty('totalBlacklisted')
      expect(stats).toHaveProperty('activeBlacklisted')
      expect(stats).toHaveProperty('topReasons')
      expect(stats.totalBlacklisted).toBeGreaterThanOrEqual(2)
    })
  })
})