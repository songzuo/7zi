/**
 * Encryption Service
 * 数据加密服务
 */

import crypto from 'crypto'
import { db } from '../db'
import { logger } from '../logger'

/**
 * 加密服务类
 */
export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm'
  private readonly keyLength = 32
  private readonly ivLength = 16
  private readonly authTagLength = 16
  private masterKey: string

  constructor() {
    // 从环境变量获取主密钥
    this.masterKey = process.env.ENCRYPTION_MASTER_KEY || this.generateMasterKey()
  }

  /**
   * 生成主密钥
   */
  private generateMasterKey(): string {
    const key = crypto.randomBytes(this.keyLength).toString('hex')
    logger.warn('Generated new master key. Please set ENCRYPTION_MASTER_KEY environment variable.')
    return key
  }

  /**
   * 加密数据
   */
  encrypt(plaintext: string, tenantKey?: string): string {
    const key = tenantKey || this.masterKey
    const iv = crypto.randomBytes(this.ivLength)
    const cipher = crypto.createCipheriv(
      this.algorithm,
      Buffer.from(key, 'hex'),
      iv
    )
    
    let encrypted = cipher.update(plaintext, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    
    const authTag = cipher.getAuthTag()
    
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`
  }

  /**
   * 解密数据
   */
  decrypt(ciphertext: string, tenantKey?: string): string {
    const key = tenantKey || this.masterKey
    const [ivHex, authTagHex, encrypted] = ciphertext.split(':')
    
    if (!ivHex || !authTagHex || !encrypted) {
      throw new Error('Invalid ciphertext format')
    }
    
    const decipher = crypto.createDecipheriv(
      this.algorithm,
      Buffer.from(key, 'hex'),
      Buffer.from(ivHex, 'hex')
    )
    
    decipher.setAuthTag(Buffer.from(authTagHex, 'hex'))
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    
    return decrypted
  }

  /**
   * 获取租户加密密钥
   */
  async getTenantEncryptionKey(tenantId: string): Promise<string> {
    const keyRecord = await db.get<{ encrypted_key: string }>(
      'SELECT encrypted_key FROM tenant_keys WHERE tenant_id = ?',
      [tenantId]
    )
    
    if (!keyRecord) {
      // 生成新的租户密钥
      const newKey = crypto.randomBytes(this.keyLength).toString('hex')
      const encryptedKey = this.encrypt(newKey)
      
      await db.exec(`
        INSERT INTO tenant_keys (id, tenant_id, encrypted_key)
        VALUES (?, ?, ?)
      `, [this.generateId('key'), tenantId, encryptedKey])
      
      logger.info('Tenant encryption key created', { tenantId })
      
      return newKey
    }
    
    return this.decrypt(keyRecord.encrypted_key)
  }

  /**
   * 旋转租户密钥
   */
  async rotateTenantKey(tenantId: string): Promise<void> {
    const oldKey = await this.getTenantEncryptionKey(tenantId)
    const newKey = crypto.randomBytes(this.keyLength).toString('hex')
    const encryptedKey = this.encrypt(newKey)
    
    await db.exec(
      'UPDATE tenant_keys SET encrypted_key = ?, updated_at = ? WHERE tenant_id = ?',
      [encryptedKey, new Date().toISOString(), tenantId]
    )
    
    logger.info('Tenant encryption key rotated', { tenantId })
    
    // TODO: 重新加密所有使用旧密钥的数据
  }

  /**
   * 加密敏感字段
   */
  async encryptField(
    data: Record<string, unknown>,
    fields: string[],
    tenantId: string
  ): Promise<Record<string, unknown>> {
    const tenantKey = await this.getTenantEncryptionKey(tenantId)
    const encrypted = { ...data }
    
    for (const field of fields) {
      if (encrypted[field] && typeof encrypted[field] === 'string') {
        encrypted[field] = this.encrypt(encrypted[field] as string, tenantKey)
        encrypted[`${field}_encrypted`] = true
      }
    }
    
    return encrypted
  }

  /**
   * 解密敏感字段
   */
  async decryptField(
    data: Record<string, unknown>,
    fields: string[],
    tenantId: string
  ): Promise<Record<string, unknown>> {
    const tenantKey = await this.getTenantEncryptionKey(tenantId)
    const decrypted = { ...data }
    
    for (const field of fields) {
      if (decrypted[field] && typeof decrypted[field] === 'string' && decrypted[`${field}_encrypted`]) {
        try {
          decrypted[field] = this.decrypt(decrypted[field] as string, tenantKey)
          delete decrypted[`${field}_encrypted`]
        } catch (error) {
          logger.error('Failed to decrypt field', { field, tenantId, error })
        }
      }
    }
    
    return decrypted
  }

  /**
   * 批量加密
   */
  async encryptBatch(
    items: Record<string, unknown>[],
    fields: string[],
    tenantId: string
  ): Promise<Record<string, unknown>[]> {
    return Promise.all(
      items.map(item => this.encryptField(item, fields, tenantId))
    )
  }

  /**
   * 批量解密
   */
  async decryptBatch(
    items: Record<string, unknown>[],
    fields: string[],
    tenantId: string
  ): Promise<Record<string, unknown>[]> {
    return Promise.all(
      items.map(item => this.decryptField(item, fields, tenantId))
    )
  }

  /**
   * 生成唯一ID
   */
  private generateId(prefix: string = ''): string {
    const timestamp = Date.now().toString(36)
    const random = Math.random().toString(36).substring(2, 15)
    return prefix ? `${prefix}_${timestamp}${random}` : `${timestamp}${random}`
  }
}

// 导出单例
export const encryptionService = new EncryptionService()