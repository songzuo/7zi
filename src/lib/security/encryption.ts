/**
 * Encryption Service
 * 数据加密服务
 *
 * 设计要点（2026-10-29 T254）：
 *
 * 1. **租户密钥多版本（keyring）** —— 轮换不再覆盖旧密钥。
 *    `tenant_keys.encrypted_key` 存的是一个 JSON keyring blob
 *    （`{ marker: 'TENANT_KEYRING_V1', keys: [{ id, enc }] }`），
 *    每个版本的密钥材料用主密钥单独加密。轮换 = 往 keyring 里追加一个新版本，
 *    旧版本保留 → **轮换后旧数据仍可解密**（P0-3 闭环）。
 *    不需要给表加新列（无需改 `src/lib/db/migrations/`）。
 *
 * 2. **密文携带密钥版本号** —— 租户字段密文格式为
 *    `${keyId}:${iv}:${authTag}:${cipher}`（4 段），解密时按版本号取对应密钥；
 *    历史 3 段密文（`${iv}:${authTag}:${cipher}`）仍然兼容：
 *    依次尝试 keyring 中的每个版本（从新到旧），authTag 校验保证不会解出错。
 *
 * 3. **解密失败可观测** —— `decryptField()` 不再静默吞错：
 *    默认抛 `EncryptionDecryptionError`；`decryptBatch()` 走容错模式
 *    （标记 `${field}_decrypt_error`），单条失败不会炸掉整批。
 */

import crypto from 'crypto'
import { db } from '../db'
import { logger } from '../logger'

/** keyring blob 的标记（用于识别新格式，区分历史单密钥格式） */
const KEYRING_MARKER = 'TENANT_KEYRING_V1' as const

/** 单个租户密钥版本 */
export interface TenantKeyVersion {
  /** 版本号（写入密文，供解密侧挑选密钥） */
  id: string
  /** 密钥材料（32 字节 hex） */
  material: string
}

/** 落库用的 keyring blob */
interface StoredKeyring {
  marker: typeof KEYRING_MARKER
  keys: Array<{ id: string; enc: string }>
}

/** 解密失败时抛出的错误（调用方据此感知失败，而不是拿到静默的密文） */
export class EncryptionDecryptionError extends Error {
  readonly field: string
  readonly tenantId: string
  readonly decryptionCause: unknown

  constructor(field: string, tenantId: string, cause: unknown) {
    super(`Failed to decrypt field "${field}" for tenant "${tenantId}"`)
    this.name = 'EncryptionDecryptionError'
    this.field = field
    this.tenantId = tenantId
    this.decryptionCause = cause
  }
}

/** decryptField 的可选参数 */
export interface DecryptFieldOptions {
  /**
   * 单条字段解密失败时是否抛错。
   * - `true`（默认）：抛 `EncryptionDecryptionError`，调用方必须处理
   * - `false`：容错模式，字段原样保留并打上 `${field}_decrypt_error` 标记
   */
  throwOnError?: boolean
}

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

  // -------------------------------------------------------------------------
  // 基础加解密
  // -------------------------------------------------------------------------

  /**
   * 加密数据
   *
   * 传入 `keyId` 时输出 4 段密文 `${keyId}:${iv}:${authTag}:${cipher}`，
   * 解密侧据此挑选对应的租户密钥版本；不传时输出传统 3 段密文。
   */
  encrypt(plaintext: string, tenantKey?: string, keyId?: string): string {
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

    const payload = `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`
    return keyId ? `${keyId}:${payload}` : payload
  }

  /**
   * 解密数据
   *
   * 兼容 4 段（带密钥版本号）与 3 段（历史）密文。
   * keyId 只用于格式解析 —— 具体用哪把密钥由调用方决定。
   */
  decrypt(ciphertext: string, tenantKey?: string): string {
    const key = tenantKey || this.masterKey
    const { ivHex, authTagHex, encrypted } = this.parseCiphertext(ciphertext)

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
   * 解析密文格式 → iv / authTag / 密文正文
   *
   * 支持 4 段 `${keyId}:${iv}:${authTag}:${cipher}` 与 3 段 `${iv}:${authTag}:${cipher}`。
   */
  private parseCiphertext(ciphertext: string): {
    keyId: string | null
    ivHex: string
    authTagHex: string
    encrypted: string
  } {
    const parts = ciphertext.split(':')

    if (parts.length === 4) {
      const [keyId, ivHex, authTagHex, encrypted] = parts
      // 注意：encrypted 允许为空串 —— 空明文加密后的密文正文就是空的。
      if (!keyId || !ivHex || !authTagHex) {
        throw new Error('Invalid ciphertext format')
      }
      return { keyId, ivHex, authTagHex, encrypted: encrypted ?? '' }
    }

    if (parts.length === 3) {
      const [ivHex, authTagHex, encrypted] = parts
      if (!ivHex || !authTagHex) {
        throw new Error('Invalid ciphertext format')
      }
      return { keyId: null, ivHex, authTagHex, encrypted: encrypted ?? '' }
    }

    throw new Error('Invalid ciphertext format')
  }

  // -------------------------------------------------------------------------
  // 租户密钥（keyring，多版本）
  // -------------------------------------------------------------------------

  /**
   * 读取租户的密钥环（全部版本，最新版本在最后）。
   *
   * 兼容两种存储：
   *  - 新格式：encrypted_key 是 keyring blob（JSON）
   *  - 旧格式：encrypted_key 是单把密钥的 3 段密文（视作唯一的 legacy 版本）
   */
  private async loadKeyring(tenantId: string): Promise<TenantKeyVersion[]> {
    const keyRecord = await db.get<{ encrypted_key: string }>(
      'SELECT encrypted_key FROM tenant_keys WHERE tenant_id = ?',
      [tenantId]
    )

    if (!keyRecord || !keyRecord.encrypted_key) {
      return []
    }

    const raw = keyRecord.encrypted_key

    let stored: StoredKeyring | null = null
    try {
      const parsed: unknown = JSON.parse(raw)
      if (
        parsed &&
        typeof parsed === 'object' &&
        (parsed as StoredKeyring).marker === KEYRING_MARKER &&
        Array.isArray((parsed as StoredKeyring).keys)
      ) {
        stored = parsed as StoredKeyring
      }
    } catch {
      // 不是 JSON —— 视为历史单密钥记录
      stored = null
    }

    if (!stored) {
      // 历史格式：单把密钥（解密失败说明主密钥不对，直接抛给调用方）
      return [{ id: 'legacy', material: this.decrypt(raw) }]
    }

    return stored.keys.map(entry => ({
      id: entry.id,
      material: this.decrypt(entry.enc),
    }))
  }

  /** 把版本列表序列化成可落库的 keyring blob */
  private serializeKeyring(versions: TenantKeyVersion[]): string {
    const stored: StoredKeyring = {
      marker: KEYRING_MARKER,
      keys: versions.map(v => ({ id: v.id, enc: this.encrypt(v.material) })),
    }
    return JSON.stringify(stored)
  }

  /** 生成下一个版本号（v1, v2, v3 ...） */
  private nextKeyId(versions: TenantKeyVersion[]): string {
    let max = 0
    for (const v of versions) {
      const match = /^v(\d+)$/.exec(v.id)
      if (match) {
        const n = Number.parseInt(match[1], 10)
        if (n > max) max = n
      }
    }
    return `v${max + 1}`
  }

  /**
   * 获取租户当前生效的加密密钥（keyring 中最新版本）。
   *
   * 幂等：同一 tenantId 多次调用返回同一把 key。
   */
  async getTenantEncryptionKey(tenantId: string): Promise<string> {
    const versions = await this.loadKeyring(tenantId)

    if (versions.length === 0) {
      // 生成新的租户密钥（第一个版本）
      const newKey = crypto.randomBytes(this.keyLength).toString('hex')
      const keyring: TenantKeyVersion[] = [{ id: 'v1', material: newKey }]

      await db.exec(
        `INSERT INTO tenant_keys (id, tenant_id, encrypted_key)
         VALUES (?, ?, ?)`,
        [this.generateId('key'), tenantId, this.serializeKeyring(keyring)]
      )

      logger.info('Tenant encryption key created', { tenantId })

      return newKey
    }

    return versions[versions.length - 1].material
  }

  /**
   * 获取租户的完整密钥环（含全部版本，最新版本在最后）。
   * 供解密侧按版本号挑选密钥使用。
   */
  async getTenantKeyring(tenantId: string): Promise<TenantKeyVersion[]> {
    const versions = await this.loadKeyring(tenantId)
    if (versions.length === 0) {
      await this.getTenantEncryptionKey(tenantId)
      return this.loadKeyring(tenantId)
    }
    return versions
  }

  /**
   * 旋转租户密钥
   *
   * **不覆盖旧密钥**：新版本追加到 keyring 末尾，旧版本保留，
   * 因此轮换前加密的数据依然可以解密（P0-3 闭环）。
   *
   * 代价：keyring 会随轮换次数增长（每次一条版本记录）；
   * 彻底清理需要一次「用新密钥重加密全部存量数据」的重写作业
   * （本文件不做，见报告）。
   */
  async rotateTenantKey(tenantId: string): Promise<void> {
    // 确保租户密钥记录存在（无记录时会先创建）
    let existing = await this.loadKeyring(tenantId)
    if (existing.length === 0) {
      await this.getTenantEncryptionKey(tenantId)
      existing = await this.loadKeyring(tenantId)
    }

    const newKey = crypto.randomBytes(this.keyLength).toString('hex')
    const rotated: TenantKeyVersion[] = [
      ...existing,
      { id: this.nextKeyId(existing), material: newKey },
    ]

    await db.exec(
      'UPDATE tenant_keys SET encrypted_key = ?, updated_at = ? WHERE tenant_id = ?',
      [this.serializeKeyring(rotated), new Date().toISOString(), tenantId]
    )

    logger.info('Tenant encryption key rotated', {
      tenantId,
      keyId: rotated[rotated.length - 1].id,
      versions: rotated.length,
    })
  }

  // -------------------------------------------------------------------------
  // 字段级加解密
  // -------------------------------------------------------------------------

  /**
   * 用 keyring 里的密钥解密（自动匹配密钥版本）。
   *
   * 4 段密文：按 keyId 精确匹配；匹配不到则回退为「逐个版本试解」。
   * 3 段密文（历史）：逐个版本试解，从新到旧。
   *
   * authTag 校验失败即视为「这把 key 不对」，继续试下一把；
   * 所有版本都失败 → 抛最后一个错误。
   */
  private decryptWithKeyring(ciphertext: string, versions: TenantKeyVersion[]): string {
    if (versions.length === 0) {
      throw new Error('No tenant encryption key available')
    }

    const { keyId } = this.parseCiphertext(ciphertext)

    if (keyId) {
      const matched = versions.find(v => v.id === keyId)
      if (matched) {
        return this.decrypt(ciphertext, matched.material)
      }
    }

    let lastError: unknown = new Error('Unable to decrypt with any tenant key version')
    for (let i = versions.length - 1; i >= 0; i--) {
      try {
        return this.decrypt(ciphertext, versions[i].material)
      } catch (error) {
        lastError = error
      }
    }
    throw lastError
  }

  /**
   * 加密敏感字段
   *
   * 契约（明确定义，T254）：
   * - 字段值是 `string` → 加密，值替换为密文，并写入 `${field}_encrypted = true`
   * - 字段值是 `null` / `undefined` → 视为「无值」，跳过，不写标记，也不报错
   * - 字段值是其他类型（number / boolean / object / array）→
   *   **抛 TypeError**（静默跳过会让调用方以为字段已被加密）
   */
  async encryptField(
    data: Record<string, unknown>,
    fields: string[],
    tenantId: string
  ): Promise<Record<string, unknown>> {
    const versions = await this.getTenantKeyring(tenantId)
    const current = versions[versions.length - 1]
    const encrypted = { ...data }

    for (const field of fields) {
      const value = encrypted[field]

      if (value === null || value === undefined) {
        // 无值字段：跳过（不加密、不打标记）
        continue
      }

      if (typeof value !== 'string') {
        throw new TypeError(
          `Cannot encrypt field "${field}": expected a string, received ${typeof value}`
        )
      }

      encrypted[field] = this.encrypt(value, current.material, current.id)
      encrypted[`${field}_encrypted`] = true
    }

    return encrypted
  }

  /**
   * 解密敏感字段
   *
   * 契约（T254）：
   * - 只处理带 `${field}_encrypted` 标记的字段；解密成功后**删除**该标记
   * - 解密失败：默认抛 `EncryptionDecryptionError`（调用方可感知）
   *   - `options.throwOnError === false` 时走容错模式：字段原样保留，
   *     并写入 `${field}_decrypt_error = true`
   */
  async decryptField(
    data: Record<string, unknown>,
    fields: string[],
    tenantId: string,
    options: DecryptFieldOptions = {}
  ): Promise<Record<string, unknown>> {
    const throwOnError = options.throwOnError !== false
    const versions = await this.getTenantKeyring(tenantId)
    const decrypted = { ...data }

    for (const field of fields) {
      const value = decrypted[field]

      if (
        value &&
        typeof value === 'string' &&
        decrypted[`${field}_encrypted`]
      ) {
        try {
          decrypted[field] = this.decryptWithKeyring(value, versions)
          delete decrypted[`${field}_encrypted`]
          delete decrypted[`${field}_decrypt_error`]
        } catch (error) {
          logger.error('Failed to decrypt field', { field, tenantId, error })

          if (throwOnError) {
            throw new EncryptionDecryptionError(field, tenantId, error)
          }

          decrypted[`${field}_decrypt_error`] = true
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
   *
   * 容错模式：单条字段解密失败不会炸掉整批，失败字段会被打上
   * `${field}_decrypt_error = true` 标记（调用方可据此识别）。
   * 需要「失败即抛」的调用方请直接用 `decryptField()`。
   */
  async decryptBatch(
    items: Record<string, unknown>[],
    fields: string[],
    tenantId: string
  ): Promise<Record<string, unknown>[]> {
    return Promise.all(
      items.map(item => this.decryptField(item, fields, tenantId, { throwOnError: false }))
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
