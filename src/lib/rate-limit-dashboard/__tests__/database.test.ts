/**
 * 限流与安全仪表板 —— 数据库层测试
 *
 * 目标目录 `src/lib/rate-limit-dashboard/` 原本有 1443 行代码、**0 个测试文件**。
 * 本文件覆盖 7 个 Repository + 初始化函数的真实业务语义。
 *
 * 技术栈是 **better-sqlite3（真实 SQLite）**，不是假库 ——
 * 所以 LIKE 通配符、日期边界、布尔转换这些只有真库才暴露的问题都能测出来。
 *
 * 测试用临时目录：每个用例前删库文件，保证互不干扰。
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest'
import { mkdtempSync, rmSync, existsSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

// ⚠️ 必须在 import database.ts **之前**设置环境变量 ——
// 模块顶层就会读 RATE_LIMIT_DB_PATH 并建目录。
let TEST_DB_PATH = ''
let TEST_DB_DIR = ''

// 动态 import，确保环境变量已就位
let dbModule: typeof import('../database')

describe('rate-limit-dashboard 数据库层', () => {
  beforeAll(async () => {
    TEST_DB_DIR = mkdtempSync(join(tmpdir(), 'rldash-'))
    TEST_DB_PATH = join(TEST_DB_DIR, 'test.db')
    process.env.RATE_LIMIT_DB_DIR = TEST_DB_DIR
    process.env.RATE_LIMIT_DB_PATH = TEST_DB_PATH

    dbModule = await import('../database')
    await dbModule.initializeDatabase()
  })

  afterAll(() => {
    dbModule.closeDatabase()
    if (existsSync(TEST_DB_DIR)) rmSync(TEST_DB_DIR, { recursive: true, force: true })
  })

  beforeEach(async () => {
    const db = dbModule.getDatabase()
    // 清空所有业务表（保留 schema）
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
      .all() as { name: string }[]
    for (const t of tables) {
      db.exec(`DELETE FROM ${t.name}`)
    }
  })

  afterEach(() => {
    // 保持连接活着，各用例复用同一实例
  })

  // ==========================================================================
  // RateLimitRulesRepository
  // ==========================================================================
  describe('RateLimitRulesRepository', () => {
    const dto = (over: Partial<import('../types').CreateRateLimitRuleDTO> = {}) => ({
      name: 'API 限流',
      description: '每分钟 100 次',
      pattern: '^/api/.*',
      algorithm: 'sliding-window' as const,
      windowMs: 60_000,
      maxRequests: 100,
      keyType: 'ip' as const,
      ...over,
    })

    it('create → findById 应完整往返所有字段', async () => {
      const repo = new dbModule.RateLimitRulesRepository()
      const created = await repo.create(dto())

      expect(created.id).toBeTruthy()
      expect(created.name).toBe('API 限流')
      expect(created.description).toBe('每分钟 100 次')
      expect(created.pattern).toBe('^/api/.*')
      expect(created.algorithm).toBe('sliding-window')
      expect(created.windowMs).toBe(60_000)
      expect(created.maxRequests).toBe(100)
      expect(created.keyType).toBe('ip')

      const fetched = await repo.findById(created.id)
      expect(fetched).not.toBeNull()
      expect(fetched!.name).toBe('API 限流')
      expect(fetched!.maxRequests).toBe(100)
    })

    it('enabled 应是真正的 boolean 而不是 0/1', async () => {
      const repo = new dbModule.RateLimitRulesRepository()
      const created = await repo.create(dto({ enabled: true }))

      expect(typeof created.enabled).toBe('boolean')
      expect(created.enabled).toBe(true)

      const fetched = await repo.findById(created.id)
      expect(typeof fetched!.enabled).toBe('boolean')
      expect(fetched!.enabled).toBe(true)
    })

    it('update 只改指定字段，其余字段不得丢失', async () => {
      const repo = new dbModule.RateLimitRulesRepository()
      const created = await repo.create(dto())

      const updated = await repo.update(created.id, { maxRequests: 200 })

      expect(updated).not.toBeNull()
      expect(updated!.maxRequests).toBe(200)
      // 未传的字段必须原样保留
      expect(updated!.name).toBe('API 限流')
      expect(updated!.pattern).toBe('^/api/.*')
      expect(updated!.windowMs).toBe(60_000)
      expect(updated!.keyType).toBe('ip')
    })

    it('update 不存在的 id 应返回 null', async () => {
      const repo = new dbModule.RateLimitRulesRepository()
      expect(await repo.update('nonexistent', { maxRequests: 1 })).toBeNull()
    })

    it('delete 应返回 true 且后续查不到', async () => {
      const repo = new dbModule.RateLimitRulesRepository()
      const created = await repo.create(dto())

      expect(await repo.delete(created.id)).toBe(true)
      expect(await repo.findById(created.id)).toBeNull()
      expect(await repo.delete(created.id)).toBe(false)
    })

    it('toggle 应能启用/禁用规则', async () => {
      const repo = new dbModule.RateLimitRulesRepository()
      const created = await repo.create(dto({ enabled: true }))

      const disabled = await repo.toggle(created.id, false)
      expect(disabled!.enabled).toBe(false)

      const enabled = await repo.toggle(created.id, true)
      expect(enabled!.enabled).toBe(true)
    })

    describe('分页', () => {
      it('meta.total 与实际条数应自洽', async () => {
        const repo = new dbModule.RateLimitRulesRepository()
        for (let i = 0; i < 25; i++) {
          await repo.create(dto({ name: `rule-${i}` }))
        }

        const page1 = await repo.findAll({}, { page: 1, limit: 10 })

        expect(page1.items).toHaveLength(10)
        expect(page1.meta.total).toBe(25)
        expect(page1.meta.totalPages).toBe(3)
        expect(page1.meta.hasNext).toBe(true)
        expect(page1.meta.hasPrevious).toBe(false)
      })

      it('第 2 页应返回不重复的记录', async () => {
        const repo = new dbModule.RateLimitRulesRepository()
        for (let i = 0; i < 25; i++) {
          await repo.create(dto({ name: `rule-${i}` }))
        }

        const p1 = await repo.findAll({}, { page: 1, limit: 10 })
        const p2 = await repo.findAll({}, { page: 2, limit: 10 })

        const ids1 = p1.items.map(i => i.id)
        const ids2 = p2.items.map(i => i.id)
        expect(ids1.filter(id => ids2.includes(id))).toHaveLength(0)
        expect(p2.meta.hasPrevious).toBe(true)
        expect(p2.meta.hasNext).toBe(true)
      })

      it('最后一页的 hasNext 应为 false', async () => {
        const repo = new dbModule.RateLimitRulesRepository()
        for (let i = 0; i < 25; i++) {
          await repo.create(dto({ name: `rule-${i}` }))
        }

        const p3 = await repo.findAll({}, { page: 3, limit: 10 })
        expect(p3.items).toHaveLength(5)
        expect(p3.meta.hasNext).toBe(false)
        expect(p3.meta.hasPrevious).toBe(true)
      })

      it('limit 应被截断到上限 100', async () => {
        const repo = new dbModule.RateLimitRulesRepository()
        const res = await repo.findAll({}, { page: 1, limit: 5000 })
        expect(res.meta.perPage).toBe(100)
      })

      it('page 为 0 或负数应被归一到第 1 页', async () => {
        const repo = new dbModule.RateLimitRulesRepository()
        await repo.create(dto())

        const res = await repo.findAll({}, { page: 0, limit: 10 })
        expect(res.meta.currentPage).toBe(1)
        expect(res.items).toHaveLength(1)
      })
    })

    describe('过滤', () => {
      it('按 enabled 过滤应只返回对应状态', async () => {
        const repo = new dbModule.RateLimitRulesRepository()
        await repo.create(dto({ name: 'on', enabled: true }))
        await repo.create(dto({ name: 'off', enabled: false }))

        const enabled = await repo.findAll({ enabled: true })
        expect(enabled.items).toHaveLength(1)
        expect(enabled.items[0].name).toBe('on')
        expect(enabled.meta.total).toBe(1)

        const disabled = await repo.findAll({ enabled: false })
        expect(disabled.items).toHaveLength(1)
        expect(disabled.items[0].name).toBe('off')
      })

      it('按 algorithm 过滤应生效', async () => {
        const repo = new dbModule.RateLimitRulesRepository()
        await repo.create(dto({ name: 'sw', algorithm: 'sliding-window' }))
        await repo.create(dto({ name: 'tb', algorithm: 'token-bucket' }))

        const res = await repo.findAll({ algorithm: 'token-bucket' })
        expect(res.items).toHaveLength(1)
        expect(res.items[0].name).toBe('tb')
      })

      it('按 keyType 过滤应生效', async () => {
        const repo = new dbModule.RateLimitRulesRepository()
        await repo.create(dto({ name: 'by-ip', keyType: 'ip' }))
        await repo.create(dto({ name: 'by-user', keyType: 'user' }))

        const res = await repo.findAll({ keyType: 'user' })
        expect(res.items).toHaveLength(1)
        expect(res.items[0].name).toBe('by-user')
      })

      it('search 应能命中 name / pattern / description', async () => {
        const repo = new dbModule.RateLimitRulesRepository()
        await repo.create(dto({ name: 'alpha', description: 'x', pattern: 'p1' }))
        await repo.create(dto({ name: 'beta', description: 'x', pattern: 'p2' }))
        await repo.create(dto({ name: 'gamma', description: 'needle', pattern: 'p3' }))
        await repo.create(dto({ name: 'delta', description: 'x', pattern: 'needle' }))

        const res = await repo.findAll({ search: 'needle' })
        const names = res.items.map(i => i.name).sort()
        expect(names).toEqual(['delta', 'gamma'])
      })

      it('search 无匹配时应返回空', async () => {
        const repo = new dbModule.RateLimitRulesRepository()
        await repo.create(dto({ name: 'alpha' }))

        const res = await repo.findAll({ search: 'zzz-not-exist' })
        expect(res.items).toHaveLength(0)
        expect(res.meta.total).toBe(0)
      })

      it('多个过滤条件应同时生效（AND 语义）', async () => {
        const repo = new dbModule.RateLimitRulesRepository()
        await repo.create(dto({ name: 'a', enabled: true, algorithm: 'token-bucket' }))
        await repo.create(dto({ name: 'b', enabled: true, algorithm: 'sliding-window' }))
        await repo.create(dto({ name: 'c', enabled: false, algorithm: 'token-bucket' }))

        const res = await repo.findAll({ enabled: true, algorithm: 'token-bucket' })
        expect(res.items).toHaveLength(1)
        expect(res.items[0].name).toBe('a')
      })

      it('count 应与 findAll 的 total 一致', async () => {
        const repo = new dbModule.RateLimitRulesRepository()
        await repo.create(dto({ name: 'a', enabled: true }))
        await repo.create(dto({ name: 'b', enabled: false }))

        expect(await repo.count({ enabled: true })).toBe(1)
        expect(await repo.count()).toBe(2)
        const res = await repo.findAll({ enabled: true })
        expect(await repo.count({ enabled: true })).toBe(res.meta.total)
      })
    })
  })

  // ==========================================================================
  // BlacklistRepository
  // ==========================================================================
  describe('BlacklistRepository', () => {
    it('create → findById 字段往返', async () => {
      const repo = new dbModule.BlacklistRepository()
      const created = await repo.create({
        type: 'ip',
        value: '10.0.0.1',
        reason: '暴力破解',
      })

      expect(created.id).toBeTruthy()
      expect(created.type).toBe('ip')
      expect(created.value).toBe('10.0.0.1')
      expect(created.reason).toBe('暴力破解')

      const fetched = await repo.findById(created.id)
      expect(fetched!.value).toBe('10.0.0.1')
    })

    it('check 应按 type + value 精确匹配', async () => {
      const repo = new dbModule.BlacklistRepository()
      await repo.create({ type: 'ip', value: '1.2.3.4' })
      await repo.create({ type: 'user-id', value: '1.2.3.4' })

      expect(await repo.check('ip', '1.2.3.4')).not.toBeNull()
      expect(await repo.check('user-id', '1.2.3.4')).not.toBeNull()
      expect(await repo.check('ip', '5.6.7.8')).toBeNull()
      expect(await repo.check('email', '1.2.3.4')).toBeNull()
    })

    it('过期条目不应被 check 命中', async () => {
      const repo = new dbModule.BlacklistRepository()
      const expired = await repo.create({
        type: 'ip',
        value: '9.9.9.9',
        expiresAt: Date.now() - 60_000,
      })

      expect(await repo.check('ip', '9.9.9.9')).toBeNull()
      // 但记录本身还在（还没被清理）
      expect(await repo.findById(expired.id)).not.toBeNull()
    })

    it('未过期的条目应被 check 命中', async () => {
      const repo = new dbModule.BlacklistRepository()
      await repo.create({
        type: 'ip',
        value: '8.8.8.8',
        expiresAt: Date.now() + 60_000,
      })

      expect(await repo.check('ip', '8.8.8.8')).not.toBeNull()
    })

    it('cleanupExpired 应只删过期的', async () => {
      const repo = new dbModule.BlacklistRepository()
      await repo.create({ type: 'ip', value: '1.1.1.1', expiresAt: Date.now() - 10_000 })
      await repo.create({ type: 'ip', value: '2.2.2.2', expiresAt: Date.now() + 10_000 })
      await repo.create({ type: 'ip', value: '3.3.3.3' })

      const deleted = await repo.cleanupExpired()
      expect(deleted).toBe(1)

      const all = await repo.findAll()
      const values = all.items.map(i => i.value).sort()
      expect(values).toEqual(['2.2.2.2', '3.3.3.3'])
    })

    it('delete 应返回 true 且不再命中', async () => {
      const repo = new dbModule.BlacklistRepository()
      const created = await repo.create({ type: 'ip', value: '7.7.7.7' })

      expect(await repo.delete(created.id)).toBe(true)
      expect(await repo.check('ip', '7.7.7.7')).toBeNull()
    })
  })

  // ==========================================================================
  // WhitelistRepository
  // ==========================================================================
  describe('WhitelistRepository', () => {
    it('create → findById 字段往返', async () => {
      const repo = new dbModule.WhitelistRepository()
      const created = await repo.create({
        type: 'ip',
        value: '1.1.1.1',
        description: '内部网关',
      })

      expect(created.value).toBe('1.1.1.1')
      expect(created.description).toBe('内部网关')

      const fetched = await repo.findById(created.id)
      expect(fetched!.description).toBe('内部网关')
    })

    it('check 应按 type + value 匹配', async () => {
      const repo = new dbModule.WhitelistRepository()
      await repo.create({ type: 'api-key', value: 'key-1' })

      expect(await repo.check('api-key', 'key-1')).not.toBeNull()
      expect(await repo.check('api-key', 'key-2')).toBeNull()
      expect(await repo.check('ip', 'key-1')).toBeNull()
    })

    it('delete 应生效', async () => {
      const repo = new dbModule.WhitelistRepository()
      const created = await repo.create({ type: 'ip', value: '2.2.2.2' })

      expect(await repo.delete(created.id)).toBe(true)
      expect(await repo.check('ip', '2.2.2.2')).toBeNull()
    })
  })

  // ==========================================================================
  // RateLimitEventsRepository
  // ==========================================================================
  describe('RateLimitEventsRepository', () => {
    const event = (over: Partial<import('../types').RateLimitEvent> = {}) => ({
      identifier: '1.2.3.4',
      path: '/api/users',
      allowed: false,
      remaining: 0,
      limit: 100,
      algorithm: 'sliding-window' as const,
      timestamp: Date.now(),
      ...over,
    })

    it('create 应完整保存并回读', async () => {
      const repo = new dbModule.RateLimitEventsRepository()
      const created = await repo.create(event({ metadata: { ua: 'curl' } }))

      expect(created.id).toBeTruthy()
      expect(created.identifier).toBe('1.2.3.4')
      expect(created.allowed).toBe(false)

      const fetched = await repo.findById(created.id)
      expect(fetched!.path).toBe('/api/users')
      expect(fetched!.metadata).toEqual({ ua: 'curl' })
    })

    it('findByIdentifier 应能按标识符查出一批事件', async () => {
      const repo = new dbModule.RateLimitEventsRepository()
      await repo.create(event({ identifier: 'a' }))
      await repo.create(event({ identifier: 'a' }))
      await repo.create(event({ identifier: 'b' }))

      const found = await repo.findByIdentifier('a')
      expect(found).toHaveLength(2)
      expect(found.every(e => e.identifier === 'a')).toBe(true)
    })

    it('findByTimeRange 的边界应为闭区间', async () => {
      const repo = new dbModule.RateLimitEventsRepository()
      const base = Date.now()
      await repo.create(event({ identifier: 'old', timestamp: base - 10_000 }))
      await repo.create(event({ identifier: 'mid', timestamp: base }))
      await repo.create(event({ identifier: 'new', timestamp: base + 10_000 }))

      const found = await repo.findByTimeRange(base, base, 100)
      const ids = found.map(e => e.identifier)

      // 起点包含、终点包含
      expect(ids).toContain('mid')
      expect(ids).not.toContain('old')
      expect(ids).not.toContain('new')
    })

    it('cleanup 应删除早于给定时间戳的事件', async () => {
      const repo = new dbModule.RateLimitEventsRepository()
      const now = Date.now()
      await repo.create(event({ identifier: 'old', timestamp: now - 100_000 }))
      await repo.create(event({ identifier: 'new', timestamp: now }))

      const cleaned = await repo.cleanup(now - 50_000)
      expect(cleaned).toBe(1)

      const all = await repo.findByIdentifier('old')
      expect(all).toHaveLength(0)
      expect(await repo.findByIdentifier('new')).toHaveLength(1)
    })
  })

  // ==========================================================================
  // AttackEventsRepository
  // ==========================================================================
  describe('AttackEventsRepository', () => {
    const attack = (over: Partial<import('../types').AttackEvent> = {}) => ({
      type: 'brute-force' as const,
      identifier: '9.9.9.9',
      severity: 'high' as const,
      description: '多次失败登录',
      detectedAt: Date.now(),
      resolved: false,
      ...over,
    })

    it('create → findById 字段往返', async () => {
      const repo = new dbModule.AttackEventsRepository()
      const created = await repo.create(attack({ evidence: { count: 100 } }))

      expect(created.id).toBeTruthy()
      expect(created.type).toBe('brute-force')
      expect(created.severity).toBe('high')
      expect(created.resolved).toBe(false)

      const fetched = await repo.findById(created.id)
      expect(fetched!.evidence).toEqual({ count: 100 })
    })

    it('resolve 应标记已解决并记录处理人', async () => {
      const repo = new dbModule.AttackEventsRepository()
      const created = await repo.create(attack())

      const resolved = await repo.resolve(created.id, 'admin')

      expect(resolved).not.toBeNull()
      expect(resolved!.resolved).toBe(true)
      expect(resolved!.resolvedBy).toBe('admin')
      expect(resolved!.resolvedAt).toBeTruthy()
    })

    it('resolve 不存在的 id 应返回 null', async () => {
      const repo = new dbModule.AttackEventsRepository()
      expect(await repo.resolve('nope', 'admin')).toBeNull()
    })
  })

  // ==========================================================================
  // SecurityAlertsRepository
  // ==========================================================================
  describe('SecurityAlertsRepository', () => {
    const alert = (over: Partial<import('../types').SecurityAlert> = {}) => ({
      type: 'attack-detected',
      severity: 'critical' as const,
      title: '检测到暴力破解',
      message: '来源 9.9.9.9',
      createdAt: Date.now(),
      dismissed: false,
      ...over,
    })

    it('create → findById 字段往返', async () => {
      const repo = new dbModule.SecurityAlertsRepository()
      const created = await repo.create(alert({ metadata: { ip: '9.9.9.9' } }))

      expect(created.title).toBe('检测到暴力破解')
      expect(created.dismissed).toBe(false)

      const fetched = await repo.findById(created.id)
      expect(fetched!.metadata).toEqual({ ip: '9.9.9.9' })
    })

    it('dismiss 应标记已忽略并记录处理人', async () => {
      const repo = new dbModule.SecurityAlertsRepository()
      const created = await repo.create(alert())

      const dismissed = await repo.dismiss(created.id, 'ops')

      expect(dismissed).not.toBeNull()
      expect(dismissed!.dismissed).toBe(true)
      expect(dismissed!.dismissedBy).toBe('ops')
      expect(dismissed!.dismissedAt).toBeTruthy()
    })

    it('count 应与 findAll 的过滤结果一致', async () => {
      const repo = new dbModule.SecurityAlertsRepository()
      await repo.create(alert({ severity: 'critical' }))
      await repo.create(alert({ severity: 'low' }))

      const critical = await repo.count({ severity: 'critical' })
      expect(critical).toBe(1)
      expect(await repo.count()).toBe(2)
    })
  })

  // ==========================================================================
  // AuditLogRepository
  // ==========================================================================
  describe('AuditLogRepository', () => {
    it('create → findByUser 应能查出来', async () => {
      const repo = new dbModule.AuditLogRepository()
      const created = await repo.create({
        action: 'rule.update',
        userId: 'user-1',
        resource: 'rate_limit_rule',
        resourceId: 'rule-1',
        details: { from: 100, to: 200 },
        ipAddress: '10.0.0.5',
      })

      expect(created.id).toBeTruthy()
      expect(created.action).toBe('rule.update')

      const found = await repo.findByUser('user-1')
      expect(found).toHaveLength(1)
      expect(found[0].resourceId).toBe('rule-1')
      expect(found[0].details).toEqual({ from: 100, to: 200 })
    })

    it('findByUser 应只返回该用户的记录', async () => {
      const repo = new dbModule.AuditLogRepository()
      await repo.create({ action: 'a', userId: 'u1', resource: 'r' })
      await repo.create({ action: 'b', userId: 'u2', resource: 'r' })

      const found = await repo.findByUser('u1')
      expect(found).toHaveLength(1)
      expect(found[0].userId).toBe('u1')
    })

    it('cleanup 应删除早于给定时间戳的记录', async () => {
      const repo = new dbModule.AuditLogRepository()
      const now = Date.now()
      await repo.create({ action: 'old', userId: 'u', resource: 'r', createdAt: now - 100_000 })
      await repo.create({ action: 'new', userId: 'u', resource: 'r', createdAt: now })

      const cleaned = await repo.cleanup(now - 50_000)
      expect(cleaned).toBe(1)
      expect(await repo.findByUser('u')).toHaveLength(1)
    })
  })

  // ==========================================================================
  // 单例导出与连接管理
  // ==========================================================================
  describe('repositories 单例与连接', () => {
    it('repositories 应导出全部 7 个 Repository', () => {
      const r = dbModule.repositories
      expect(r.rateLimitRules).toBeInstanceOf(dbModule.RateLimitRulesRepository)
      expect(r.blacklist).toBeInstanceOf(dbModule.BlacklistRepository)
      expect(r.whitelist).toBeInstanceOf(dbModule.WhitelistRepository)
      expect(r.rateLimitEvents).toBeInstanceOf(dbModule.RateLimitEventsRepository)
      expect(r.attackEvents).toBeInstanceOf(dbModule.AttackEventsRepository)
      expect(r.securityAlerts).toBeInstanceOf(dbModule.SecurityAlertsRepository)
      expect(r.auditLog).toBeInstanceOf(dbModule.AuditLogRepository)
    })

    it('getDatabase 应返回同一个连接实例', () => {
      expect(dbModule.getDatabase()).toBe(dbModule.getDatabase())
    })
  })
})
