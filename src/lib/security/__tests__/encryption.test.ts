/**
 * Tests for src/lib/security/encryption.ts
 *
 * 覆盖：
 *  - 基础往返（真实 crypto，不 mock crypto）
 *  - 篡改检测（改一个字节 → decrypt 必须抛错）
 *  - 租户密钥幂等 / 租户隔离
 *  - 密钥轮换闭环（轮换后旧数据仍可解密）
 *  - encryptField / decryptField 往返 + `${field}_encrypted` 标记生命周期
 *  - 非字符串字段的明确契约
 *  - decryptField 解密失败的可观测行为
 *
 * DB 依赖用 `vi.mock('@/lib/db')` 提供**语义化内存 fake**：
 * 真正按 SQL 语义维护 tenant_keys 表（而不是「任何 SELECT 都返回 []」），
 * 否则「读不到 key」和「表为空」会被混为一谈。
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

interface TenantKeyRow {
  id: string
  tenant_id: string
  encrypted_key: string
  updated_at?: string
}

const { dbState, masterKeySetup } = vi.hoisted(() => {
  // 固定主密钥：同一文件内多个 EncryptionService 实例必须能互相解开
  // 对方写下的 tenant_keys 记录（否则轮换/幂等用例会因主密钥漂移而假失败）。
  process.env.ENCRYPTION_MASTER_KEY = 'a'.repeat(64)

  return {
    dbState: { rows: [] as TenantKeyRow[] },
    masterKeySetup: true,
  }
})

void masterKeySetup

vi.mock('@/lib/db', () => {
  const rows = dbState.rows

  const fakeDb = {
    async get<T = Record<string, unknown>>(
      sql: string,
      params?: unknown[]
    ): Promise<T | null> {
      if (!/from\s+tenant_keys/i.test(sql)) {
        throw new Error(`fake db: unsupported SELECT: ${sql}`)
      }
      const tenantId = params?.[0]
      const row = rows.find(r => r.tenant_id === tenantId)
      if (!row) return null
      return { encrypted_key: row.encrypted_key } as T
    },

    async exec(
      sql: string,
      params?: unknown[]
    ): Promise<{ changes: number; lastInsertRowid?: number }> {
      if (/insert\s+into\s+tenant_keys/i.test(sql)) {
        const [id, tenantId, encryptedKey] = params ?? []
        rows.push({
          id: String(id),
          tenant_id: String(tenantId),
          encrypted_key: String(encryptedKey),
        })
        return { changes: 1, lastInsertRowid: rows.length }
      }

      if (/update\s+tenant_keys/i.test(sql)) {
        const [encryptedKey, updatedAt, tenantId] = params ?? []
        let changes = 0
        for (const row of rows) {
          if (row.tenant_id === tenantId) {
            row.encrypted_key = String(encryptedKey)
            row.updated_at = String(updatedAt)
            changes++
          }
        }
        return { changes }
      }

      throw new Error(`fake db: unsupported statement: ${sql}`)
    },
  }

  return { db: fakeDb }
})

import {
  EncryptionService,
  EncryptionDecryptionError,
} from '../encryption'

const TENANT_A = 'tenant-a'
const TENANT_B = 'tenant-b'

/** 读出某个租户当前 keyring 的原始 blob（用于断言版本数） */
function readKeyringBlob(tenantId: string): {
  marker: string
  keys: Array<{ id: string; enc: string }>
} {
  const row = dbState.rows.find(r => r.tenant_id === tenantId)
  if (!row) throw new Error(`no tenant_keys row for ${tenantId}`)
  return JSON.parse(row.encrypted_key)
}

beforeEach(() => {
  dbState.rows.length = 0
})

describe('EncryptionService - 基础加解密', () => {
  let service: EncryptionService

  beforeEach(() => {
    service = new EncryptionService()
  })

  it('encrypt → decrypt 往返得到原文', () => {
    const plaintext = 'sensitive-data-123'
    const encrypted = service.encrypt(plaintext)

    expect(encrypted).not.toBe(plaintext)
    expect(service.decrypt(encrypted)).toBe(plaintext)
  })

  it('往返支持中文 / 空串 / 长文本', () => {
    const cases = ['张三百看不厌', '', 'a'.repeat(10000)]

    for (const plaintext of cases) {
      expect(service.decrypt(service.encrypt(plaintext))).toBe(plaintext)
    }
  })

  it('每次加密使用随机 IV —— 同一明文两次密文不同', () => {
    const a = service.encrypt('same-plaintext')
    const b = service.encrypt('same-plaintext')

    expect(a).not.toBe(b)
    expect(service.decrypt(a)).toBe('same-plaintext')
    expect(service.decrypt(b)).toBe('same-plaintext')
  })

  it('篡改密文一个字节 → decrypt 必须抛错（authTag 校验生效）', () => {
    const encrypted = service.encrypt('tamper-target')
    const parts = encrypted.split(':')
    const payload = parts[2]
    const firstByte = payload.slice(0, 2)
    // 翻转密文正文的第一个字节
    const flipped = firstByte === '00' ? 'ff' : '00'
    const tampered = [parts[0], parts[1], flipped + payload.slice(2)].join(':')

    expect(tampered).not.toBe(encrypted)
    expect(() => service.decrypt(tampered)).toThrow()
  })

  it('篡改 authTag → decrypt 必须抛错', () => {
    const encrypted = service.encrypt('tamper-tag')
    const parts = encrypted.split(':')
    const tag = parts[1]
    const flippedTag = tag.slice(0, 2) === '00' ? 'ff' : '00'
    const tampered = [parts[0], flippedTag + tag.slice(2), parts[2]].join(':')

    expect(() => service.decrypt(tampered)).toThrow()
  })

  it('格式非法的密文 → decrypt 抛 "Invalid ciphertext format"', () => {
    expect(() => service.decrypt('not-a-ciphertext')).toThrow('Invalid ciphertext format')
    expect(() => service.decrypt('')).toThrow('Invalid ciphertext format')
  })

  it('用错误的 key 解密 → 抛错（租户隔离的底层保证）', () => {
    const keyA = 'a'.repeat(64)
    const keyB = 'b'.repeat(64)
    const encrypted = service.encrypt('cross-tenant', keyA)

    expect(() => service.decrypt(encrypted, keyB)).toThrow()
  })

  it('带 keyId 的 4 段密文可正常往返', () => {
    const key = 'c'.repeat(64)
    const encrypted = service.encrypt('versioned', key, 'v7')

    expect(encrypted.split(':')).toHaveLength(4)
    expect(encrypted.startsWith('v7:')).toBe(true)
    expect(service.decrypt(encrypted, key)).toBe('versioned')
  })
})

describe('EncryptionService - 租户密钥', () => {
  let service: EncryptionService

  beforeEach(() => {
    service = new EncryptionService()
  })

  it('同一 tenantId 两次获取返回同一把 key（幂等）', async () => {
    const key1 = await service.getTenantEncryptionKey(TENANT_A)
    const key2 = await service.getTenantEncryptionKey(TENANT_A)

    expect(key1).toBe(key2)
    expect(key1).toHaveLength(64) // 32 字节 hex
    expect(dbState.rows).toHaveLength(1)
  })

  it('不同 tenantId 拿到不同 key（租户隔离）', async () => {
    const keyA = await service.getTenantEncryptionKey(TENANT_A)
    const keyB = await service.getTenantEncryptionKey(TENANT_B)

    expect(keyA).not.toBe(keyB)
    expect(dbState.rows).toHaveLength(2)
  })

  it('租户密钥只落一行，且密文里看不到明文 key', async () => {
    const key = await service.getTenantEncryptionKey(TENANT_A)
    const blob = readKeyringBlob(TENANT_A)

    expect(blob.marker).toBe('TENANT_KEYRING_V1')
    expect(blob.keys).toHaveLength(1)
    expect(blob.keys[0].enc).not.toContain(key)
    expect(dbState.rows[0].encrypted_key).not.toContain(key)
  })

  it('rotateTenantKey 后 key 与旧 key 不同', async () => {
    const oldKey = await service.getTenantEncryptionKey(TENANT_A)

    await service.rotateTenantKey(TENANT_A)

    const newKey = await service.getTenantEncryptionKey(TENANT_A)
    expect(newKey).not.toBe(oldKey)
  })

  it('轮换保留旧版本（keyring 变长），旧密文仍可解密', async () => {
    const oldKey = await service.getTenantEncryptionKey(TENANT_A)
    const oldCiphertext = service.encrypt('old-data', oldKey, 'v1')

    await service.rotateTenantKey(TENANT_A)

    const blob = readKeyringBlob(TENANT_A)
    expect(blob.keys).toHaveLength(2)
    expect(blob.keys[0].id).toBe('v1')
    expect(blob.keys[1].id).toBe('v2')

    // 旧版本密钥仍然能从 keyring 里读出来并解密旧密文
    const versions = await service.getTenantKeyring(TENANT_A)
    expect(versions).toHaveLength(2)
    expect(versions[0].material).toBe(oldKey)
    expect(service.decrypt(oldCiphertext, versions[0].material)).toBe('old-data')
  })

  it('多次轮换 → 版本号递增，旧版本全部保留', async () => {
    await service.getTenantEncryptionKey(TENANT_A)

    await service.rotateTenantKey(TENANT_A)
    await service.rotateTenantKey(TENANT_A)

    const blob = readKeyringBlob(TENANT_A)
    expect(blob.keys.map(k => k.id)).toEqual(['v1', 'v2', 'v3'])
  })

  it('兼容历史格式：encrypted_key 是单把密钥的 3 段密文', async () => {
    const legacyKey = 'd'.repeat(64)
    const legacyCipher = service.encrypt(legacyKey)

    // 直接写入一条「历史格式」记录（非 keyring blob）
    dbState.rows.push({
      id: 'legacy-key',
      tenant_id: TENANT_A,
      encrypted_key: legacyCipher,
    })

    const key = await service.getTenantEncryptionKey(TENANT_A)
    expect(key).toBe(legacyKey)

    // 历史 3 段密文（无 keyId）也能被解密
    const dataCipher = service.encrypt('legacy-data', legacyKey)
    const versions = await service.getTenantKeyring(TENANT_A)
    expect(versions).toHaveLength(1)
    expect(versions[0].id).toBe('legacy')
    expect(service.decrypt(dataCipher, versions[0].material)).toBe('legacy-data')
  })

  it('历史 3 段密文在轮换后仍可解密（轮换会把旧格式升级成 keyring）', async () => {
    const legacyKey = 'e'.repeat(64)
    dbState.rows.push({
      id: 'legacy-key',
      tenant_id: TENANT_A,
      encrypted_key: service.encrypt(legacyKey),
    })

    const legacyDataCipher = service.encrypt('legacy-data', legacyKey)

    await service.rotateTenantKey(TENANT_A)

    const versions = await service.getTenantKeyring(TENANT_A)
    expect(versions).toHaveLength(2)
    expect(versions[0].material).toBe(legacyKey)
    expect(service.decrypt(legacyDataCipher, versions[0].material)).toBe('legacy-data')
  })
})

describe('EncryptionService - encryptField / decryptField', () => {
  let service: EncryptionService

  beforeEach(() => {
    service = new EncryptionService()
  })

  it('往返：encryptField → decryptField 得回原文，标记被清理', async () => {
    const original = { email: 'john@example.com', name: 'John' }

    const encrypted = await service.encryptField(original, ['email'], TENANT_A)

    expect(encrypted.email).not.toBe('john@example.com')
    expect(encrypted.email_encrypted).toBe(true)
    expect(encrypted.name).toBe('John')
    expect(encrypted.name_encrypted).toBeUndefined()

    const decrypted = await service.decryptField(encrypted, ['email'], TENANT_A)

    expect(decrypted.email).toBe('john@example.com')
    expect(decrypted.email_encrypted).toBeUndefined()
    expect(decrypted.name).toBe('John')
  })

  it('encryptField 不修改入参（返回新对象）', async () => {
    const original = { email: 'john@example.com' }

    const encrypted = await service.encryptField(original, ['email'], TENANT_A)

    expect(original.email).toBe('john@example.com')
    expect(encrypted).not.toBe(original)
  })

  it('没有 ${field}_encrypted 标记的字段不被解密', async () => {
    const encrypted = await service.encryptField({ email: 'a@b.c' }, ['email'], TENANT_A)

    // 抹掉标记 → decryptField 视为未加密字段，保持原值
    const withoutMarker = { ...encrypted }
    delete withoutMarker.email_encrypted

    const decrypted = await service.decryptField(withoutMarker, ['email'], TENANT_A)
    expect(decrypted.email).toBe(encrypted.email)
  })

  it('非字符串字段 → 抛 TypeError（不静默跳过）', async () => {
    await expect(
      service.encryptField({ amount: 42 }, ['amount'], TENANT_A)
    ).rejects.toThrow(TypeError)

    await expect(
      service.encryptField({ flag: true }, ['flag'], TENANT_A)
    ).rejects.toThrow(TypeError)

    await expect(
      service.encryptField({ meta: { a: 1 } }, ['meta'], TENANT_A)
    ).rejects.toThrow(TypeError)
  })

  it('null / undefined 字段被跳过，且不写标记', async () => {
    const encrypted = await service.encryptField(
      { a: null, b: undefined },
      ['a', 'b'],
      TENANT_A
    )

    expect(encrypted.a).toBeNull()
    expect(encrypted.b).toBeUndefined()
    expect(encrypted.a_encrypted).toBeUndefined()
    expect(encrypted.b_encrypted).toBeUndefined()
  })

  it('解密失败必须让调用方感知（抛 EncryptionDecryptionError）', async () => {
    const encrypted = await service.encryptField({ email: 'x@y.z' }, ['email'], TENANT_A)

    // 篡改密文一个字节
    const parts = String(encrypted.email).split(':')
    const payload = parts[3]
    const flipped = payload.slice(0, 2) === '00' ? 'ff' : '00'
    const tampered = {
      ...encrypted,
      email: [parts[0], parts[1], parts[2], flipped + payload.slice(2)].join(':'),
    }

    await expect(
      service.decryptField(tampered, ['email'], TENANT_A)
    ).rejects.toThrow(EncryptionDecryptionError)
  })

  it('解密失败在容错模式下打 ${field}_decrypt_error 标记，字段保持原值', async () => {
    const encrypted = await service.encryptField({ email: 'x@y.z' }, ['email'], TENANT_A)

    const parts = String(encrypted.email).split(':')
    const payload = parts[3]
    const flipped = payload.slice(0, 2) === '00' ? 'ff' : '00'
    const tampered = {
      ...encrypted,
      email: [parts[0], parts[1], parts[2], flipped + payload.slice(2)].join(':'),
    }

    const result = await service.decryptField(tampered, ['email'], TENANT_A, {
      throwOnError: false,
    })

    expect(result.email).toBe(tampered.email)
    expect(result.email_decrypt_error).toBe(true)
    expect(result.email_encrypted).toBe(true)
  })

  it('轮换之后，轮换前加密的数据仍可解密（P0-3 闭环）', async () => {
    const encryptedBeforeRotation = await service.encryptField(
      { email: 'before@example.com' },
      ['email'],
      TENANT_A
    )

    await service.rotateTenantKey(TENANT_A)

    const decrypted = await service.decryptField(
      encryptedBeforeRotation,
      ['email'],
      TENANT_A
    )

    expect(decrypted.email).toBe('before@example.com')
    expect(decrypted.email_encrypted).toBeUndefined()
  })

  it('轮换后新数据用新版本密钥加密，旧版本仍留在 keyring', async () => {
    await service.getTenantEncryptionKey(TENANT_A)
    await service.rotateTenantKey(TENANT_A)

    const encryptedAfterRotation = await service.encryptField(
      { email: 'after@example.com' },
      ['email'],
      TENANT_A
    )

    const parts = String(encryptedAfterRotation.email).split(':')
    expect(parts[0]).toBe('v2')

    const blob = readKeyringBlob(TENANT_A)
    expect(blob.keys.map(k => k.id)).toEqual(['v1', 'v2'])
  })
})

describe('EncryptionService - 批量接口', () => {
  let service: EncryptionService

  beforeEach(() => {
    service = new EncryptionService()
  })

  it('encryptBatch / decryptBatch 往返', async () => {
    const items = [
      { email: 'a@example.com', id: 1 },
      { email: 'b@example.com', id: 2 },
    ]

    const encrypted = await service.encryptBatch(items, ['email'], TENANT_A)
    expect(encrypted[0].email).not.toBe('a@example.com')
    expect(encrypted[0].email_encrypted).toBe(true)

    const decrypted = await service.decryptBatch(encrypted, ['email'], TENANT_A)
    expect(decrypted[0].email).toBe('a@example.com')
    expect(decrypted[1].email).toBe('b@example.com')
    expect(decrypted[0].email_encrypted).toBeUndefined()
  })

  it('decryptBatch 单条失败不炸掉整批（容错模式 + 错误标记）', async () => {
    const items = [
      { email: 'good@example.com' },
      { email: 'bad@example.com' },
    ]

    const encrypted = await service.encryptBatch(items, ['email'], TENANT_A)

    // 破坏第二条
    const parts = String(encrypted[1].email).split(':')
    const payload = parts[3]
    const flipped = payload.slice(0, 2) === '00' ? 'ff' : '00'
    encrypted[1] = {
      ...encrypted[1],
      email: [parts[0], parts[1], parts[2], flipped + payload.slice(2)].join(':'),
    }

    const decrypted = await service.decryptBatch(encrypted, ['email'], TENANT_A)

    expect(decrypted[0].email).toBe('good@example.com')
    expect(decrypted[1].email_decrypt_error).toBe(true)
    expect(decrypted[1].email).toBe(encrypted[1].email)
  })
})
