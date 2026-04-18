/**
 * 加密服务 - 支持租户密钥管理
 *
 * 功能：
 * - 租户级别的密钥管理
 * - 数据加密/解密
 * - 密钥轮换
 */

import crypto from 'crypto'

// ============================================================================
// 类型定义
// ============================================================================

export interface TenantKey {
  tenantId: string
  keyId: string
  key: Buffer
  algorithm: string
  createdAt: number
  expiresAt?: number
  isActive: boolean
}

export interface EncryptionResult {
  ciphertext: string
  keyId: string
  algorithm: string
  iv: string
  authTag?: string
}

export interface DecryptionResult {
  plaintext: Buffer
  keyId: string
}

// ============================================================================
// 密钥管理器
// ============================================================================

export class KeyManager {
  private keys: Map<string, TenantKey[]> = new Map()
  private keyRotationInterval: number = 30 * 24 * 60 * 60 * 1000 // 30天

  constructor() {
    // 定期清理过期密钥
    setInterval(() => this.cleanupExpiredKeys(), 60 * 60 * 1000) // 每小时清理一次
  }

  /**
   * 生成新的租户密钥
   */
  generateTenantKey(tenantId: string, expiresIn?: number): TenantKey {
    const keyId = `key_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`
    const key = crypto.randomBytes(32) // AES-256
    const now = Date.now()

    const tenantKey: TenantKey = {
      tenantId,
      keyId,
      key,
      algorithm: 'aes-256-gcm',
      createdAt: now,
      expiresAt: expiresIn ? now + expiresIn : undefined,
      isActive: true,
    }

    // 获取租户的现有密钥
    const tenantKeys = this.keys.get(tenantId) || []

    // 将旧密钥标记为非活跃
    tenantKeys.forEach(k => {
      if (k.isActive) {
        k.isActive = false
      }
    })

    // 添加新密钥
    tenantKeys.push(tenantKey)
    this.keys.set(tenantId, tenantKeys)

    return tenantKey
  }

  /**
   * 获取租户的活跃密钥
   */
  getActiveKey(tenantId: string): TenantKey | null {
    const tenantKeys = this.keys.get(tenantId)
    if (!tenantKeys || tenantKeys.length === 0) {
      return null
    }

    // 返回最新的活跃密钥
    return tenantKeys.filter(k => k.isActive).sort((a, b) => b.createdAt - a.createdAt)[0] || null
  }

  /**
   * 根据 keyId 获取密钥
   */
  getKeyById(tenantId: string, keyId: string): TenantKey | null {
    const tenantKeys = this.keys.get(tenantId)
    if (!tenantKeys) {
      return null
    }

    return tenantKeys.find(k => k.keyId === keyId) || null
  }

  /**
   * 获取租户的所有密钥
   */
  getAllKeys(tenantId: string): TenantKey[] {
    return this.keys.get(tenantId) || []
  }

  /**
   * 删除租户的所有密钥
   */
  deleteTenantKeys(tenantId: string): void {
    this.keys.delete(tenantId)
  }

  /**
   * 清理过期密钥
   */
  private cleanupExpiredKeys(): void {
    const now = Date.now()

    for (const [tenantId, tenantKeys] of this.keys.entries()) {
      const activeKeys = tenantKeys.filter(k => {
        // 如果密钥没有过期时间，保留
        if (!k.expiresAt) {
          return true
        }
        // 如果密钥已过期且不活跃，删除
        if (k.expiresAt < now && !k.isActive) {
          return false
        }
        return true
      })

      if (activeKeys.length === 0) {
        this.keys.delete(tenantId)
      } else {
        this.keys.set(tenantId, activeKeys)
      }
    }
  }

  /**
   * 检查是否需要轮换密钥
   */
  shouldRotateKey(tenantId: string): boolean {
    const activeKey = this.getActiveKey(tenantId)
    if (!activeKey) {
      return true
    }

    const now = Date.now()
    return now - activeKey.createdAt > this.keyRotationInterval
  }
}

// ============================================================================
// 加密服务
// ============================================================================

export class EncryptionService {
  private keyManager: KeyManager

  constructor() {
    this.keyManager = new KeyManager()
  }

  /**
   * 加密数据
   */
  encrypt(tenantId: string, plaintext: Buffer | string): EncryptionResult {
    const key = this.keyManager.getActiveKey(tenantId)
    if (!key) {
      throw new Error(`No active key found for tenant: ${tenantId}`)
    }

    const iv = crypto.randomBytes(16)
    const cipher = crypto.createCipheriv(key.algorithm, key.key, iv) as crypto.CipherGCM

    let ciphertext: Buffer
    if (typeof plaintext === 'string') {
      ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
    } else {
      ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()])
    }

    const authTag = cipher.getAuthTag()

    return {
      ciphertext: ciphertext.toString('base64'),
      keyId: key.keyId,
      algorithm: key.algorithm,
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
    }
  }

  /**
   * 解密数据
   */
  decrypt(tenantId: string, encrypted: EncryptionResult): DecryptionResult {
    const key = this.keyManager.getKeyById(tenantId, encrypted.keyId)
    if (!key) {
      throw new Error(`Key not found: ${encrypted.keyId}`)
    }

    const iv = Buffer.from(encrypted.iv, 'base64')
    const ciphertext = Buffer.from(encrypted.ciphertext, 'base64')
    const authTag = Buffer.from(encrypted.authTag!, 'base64')

    const decipher = crypto.createDecipheriv(key.algorithm, key.key, iv) as crypto.DecipherGCM
    decipher.setAuthTag(authTag)

    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()])

    return {
      plaintext,
      keyId: key.keyId,
    }
  }

  /**
   * 轮换租户密钥
   */
  rotateTenantKey(tenantId: string): TenantKey {
    const newKey = this.keyManager.generateTenantKey(tenantId)

    // TODO: 重新加密所有使用旧密钥的数据
    // 这是一个异步操作，需要遍历所有使用旧密钥加密的数据并重新加密
    // 建议实现一个后台任务来处理这个操作

    return newKey
  }

  /**
   * 初始化租户密钥
   */
  initializeTenant(tenantId: string): TenantKey {
    const existingKey = this.keyManager.getActiveKey(tenantId)
    if (existingKey) {
      return existingKey
    }

    return this.keyManager.generateTenantKey(tenantId)
  }

  /**
   * 删除租户
   */
  deleteTenant(tenantId: string): void {
    this.keyManager.deleteTenantKeys(tenantId)
  }

  /**
   * 获取密钥管理器（用于测试）
   */
  getKeyManager(): KeyManager {
    return this.keyManager
  }
}

// ============================================================================
// 单例实例
// ============================================================================

export const encryptionService = new EncryptionService()

// ============================================================================
// 导出
// ============================================================================

export default encryptionService
