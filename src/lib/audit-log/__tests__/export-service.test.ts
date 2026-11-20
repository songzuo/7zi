/**
 * 审计日志导出/导入服务测试
 *
 * 重点覆盖 import 时的**签名校验** —— 之前的实现是个空壳：
 * filter 回调恒返回 true，所以 verifySignature 选项完全无效。
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import fs from 'fs/promises'
import os from 'os'
import path from 'path'
import { AuditExportService } from '@/lib/audit-log/export-service'
import { AuditSignatureHandler } from '@/lib/audit-log/signature-handler'
import type { AuditEvent, AuditLogStorage } from '@/lib/audit-log/types'

const SECRET = 'test-signing-key-for-export-tests'

function createEvent(overrides: Partial<AuditEvent> = {}): AuditEvent {
  return {
    id: 'evt-1',
    timestamp: new Date('2026-01-01T00:00:00.000Z'),
    level: 'info',
    category: 'user',
    action: 'create',
    status: 'success',
    severity: 'low',
    message: 'Test event',
    ...overrides,
  } as AuditEvent
}

function createStorage(overrides: Partial<AuditLogStorage> = {}): AuditLogStorage {
  return {
    query: vi.fn().mockResolvedValue({ data: [], total: 0, page: 1, pageSize: 10 }),
    write: vi.fn().mockResolvedValue(undefined),
    writeBatch: vi.fn().mockResolvedValue(undefined),
    getById: vi.fn().mockResolvedValue(null),
    delete: vi.fn().mockResolvedValue(undefined),
    cleanup: vi.fn().mockResolvedValue(0),
    ...overrides,
  } as unknown as AuditLogStorage
}

describe('AuditExportService', () => {
  let tmpDir: string

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'audit-export-'))
  })

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true })
  })

  describe('import 时的签名校验', () => {
    it('签名正确的事件应被导入', async () => {
      const handler = new AuditSignatureHandler(true, SECRET)
      const storage = createStorage()
      const service = new AuditExportService(storage, handler)

      const signed = handler.sign(createEvent())

      const filePath = path.join(tmpDir, 'events.json')
      await fs.writeFile(filePath, JSON.stringify([signed]), 'utf8')

      const result = await service.import(filePath, 'json', { verifySignature: true })

      expect(result.imported).toBe(1)
      expect(result.failed).toBe(0)
      expect(storage.writeBatch).toHaveBeenCalled()
    })

    it('签名被篡改的事件应被拒绝', async () => {
      const handler = new AuditSignatureHandler(true, SECRET)
      const storage = createStorage()
      const service = new AuditExportService(storage, handler)

      const signed = handler.sign(createEvent())
      // 篡改内容 —— 签名不再匹配
      signed.message = 'Tampered message'

      const filePath = path.join(tmpDir, 'tampered.json')
      await fs.writeFile(filePath, JSON.stringify([signed]), 'utf8')

      const result = await service.import(filePath, 'json', { verifySignature: true })

      expect(result.imported).toBe(0)
      expect(result.failed).toBe(1)
      expect(result.errors?.[0]?.error).toContain('Signature verification failed')
      expect(storage.writeBatch).not.toHaveBeenCalled()
    })

    it('没有签名的事件在开启校验时也应被拒绝', async () => {
      const handler = new AuditSignatureHandler(true, SECRET)
      const storage = createStorage()
      const service = new AuditExportService(storage, handler)

      const filePath = path.join(tmpDir, 'unsigned.json')
      await fs.writeFile(filePath, JSON.stringify([createEvent()]), 'utf8')

      const result = await service.import(filePath, 'json', { verifySignature: true })

      expect(result.imported).toBe(0)
      expect(result.failed).toBe(1)
    })

    it('未开启 verifySignature 时不做校验', async () => {
      const handler = new AuditSignatureHandler(true, SECRET)
      const storage = createStorage()
      const service = new AuditExportService(storage, handler)

      const filePath = path.join(tmpDir, 'unsigned2.json')
      await fs.writeFile(filePath, JSON.stringify([createEvent()]), 'utf8')

      const result = await service.import(filePath, 'json')

      expect(result.imported).toBe(1)
      expect(result.failed).toBe(0)
    })

    it('请求校验但没有配置校验器时不应假装通过', async () => {
      const storage = createStorage()
      const service = new AuditExportService(storage)

      const filePath = path.join(tmpDir, 'no-handler.json')
      await fs.writeFile(filePath, JSON.stringify([createEvent()]), 'utf8')

      const result = await service.import(filePath, 'json', { verifySignature: true })

      expect(result.imported).toBe(0)
      expect(result.failed).toBe(1)
      expect(result.errors?.[0]?.error).toContain('no signature handler')
    })
  })

  describe('export', () => {
    it('应导出为 JSON 并可被重新导入', async () => {
      const handler = new AuditSignatureHandler(true, SECRET)
      const storage = createStorage({
        query: vi.fn().mockResolvedValue({
          data: [handler.sign(createEvent())],
          total: 1,
          page: 1,
          pageSize: 10,
        }),
      } as unknown as Partial<AuditLogStorage>)

      const service = new AuditExportService(storage, handler)
      const outputPath = path.join(tmpDir, 'out.json')

      const result = await service.export({
        format: 'json',
        outputPath,
        filter: {},
        timeRange: { start: new Date(0), end: new Date() },
      })

      expect(result).toBe(outputPath)
      const content = await fs.readFile(outputPath, 'utf8')
      const parsed = JSON.parse(content) as AuditEvent[]
      expect(parsed).toHaveLength(1)
      expect(parsed[0].signature).toBeDefined()
    })

    it('端到端：导出的文件导入时签名校验通过', async () => {
      const handler = new AuditSignatureHandler(true, SECRET)
      const signed = handler.sign(createEvent())

      const storage = createStorage({
        query: vi.fn().mockResolvedValue({
          data: [signed],
          total: 1,
          page: 1,
          pageSize: 10,
        }),
      } as unknown as Partial<AuditLogStorage>)

      const service = new AuditExportService(storage, handler)
      const outputPath = path.join(tmpDir, 'roundtrip.json')

      await service.export({
        format: 'json',
        outputPath,
        filter: {},
        timeRange: { start: new Date(0), end: new Date() },
      })

      // 用全新的 storage 导入，验证签名在 JSON 往返后依然有效
      const importStorage = createStorage()
      const importService = new AuditExportService(importStorage, handler)

      const result = await importService.import(outputPath, 'json', { verifySignature: true })

      expect(result.imported).toBe(1)
      expect(result.failed).toBe(0)
    })

    it('导出为 CSV 时应正确转义引号', async () => {
      const storage = createStorage({
        query: vi.fn().mockResolvedValue({
          data: [createEvent({ message: 'He said "hi"' })],
          total: 1,
          page: 1,
          pageSize: 10,
        }),
      } as unknown as Partial<AuditLogStorage>)

      const service = new AuditExportService(storage)
      const outputPath = path.join(tmpDir, 'out.csv')

      await service.export({
        format: 'csv',
        outputPath,
        filter: {},
        timeRange: { start: new Date(0), end: new Date() },
      })

      const content = await fs.readFile(outputPath, 'utf8')
      expect(content).toContain('""hi""')
    })
  })
})
