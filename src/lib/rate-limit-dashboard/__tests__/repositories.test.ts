/**
 * 限流与安全仪表板 —— Repository 补充测试
 *
 * `database.test.ts` 已经覆盖了各 Repository 的主路径；本文件补上
 * 主路径没走到的分支：分页元信息、过滤条件的组合、update 的每个字段、
 * JSON 列的健壮性、审计日志的时间语义等。
 *
 * 同样使用真实的 better-sqlite3（临时目录），不 mock 任何一层。
 */

import { describe, it, expect, beforeEach, afterAll, beforeAll } from 'vitest'
import { mkdtempSync, rmSync, existsSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

let TEST_DB_DIR = ''

let dbModule: typeof import('../database')

describe('rate-limit-dashboard Repository 补充覆盖', () => {
  beforeAll(async () => {
    TEST_DB_DIR = mkdtempSync(join(tmpdir(), 'rldash2-'))
    process.env.RATE_LIMIT_DB_DIR = TEST_DB_DIR
    process.env.RATE_LIMIT_DB_PATH = join(TEST_DB_DIR, 'test.db')

    dbModule = await import('../database')
    await dbModule.initializeDatabase()
  })

  afterAll(() => {
    dbModule.closeDatabase()
    if (existsSync(TEST_DB_DIR)) rmSync(TEST_DB_DIR, { recursive: true, force: true })
  })

  beforeEach(() => {
    const db = dbModule.getDatabase()
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
      .all() as { name: string }[]
    for (const t of tables) {
      db.exec(`DELETE FROM ${t.name}`)
    }
  })

  // ==========================================================================
  // RateLimitRulesRepository —— update 的每个字段
  // ==========================================================================
  describe('RateLimitRulesRepository update 逐字段', () => {
    const dto = (over: Partial<import('../types').CreateRateLimitRuleDTO> = {}) => ({
      name: '原始名称',
      description: '原始描述',
      pattern: '^/api/original',
      algorithm: 'sliding-window' as const,
      windowMs: 60_000,
      maxRequests: 100,
      keyType: 'ip' as const,
      ...over,
    })

    it('update name 不应动到其它字段', async () => {
      const repo = new dbModule.RateLimitRulesRepository()
      const created = await repo.create(dto())

      const updated = await repo.update(created.id, { name: '新名称' })

      expect(updated!.name).toBe('新名称')
      expect(updated!.description).toBe('原始描述')
      expect(updated!.pattern).toBe('^/api/original')
      expect(updated!.algorithm).toBe('sliding-window')
      expect(updated!.windowMs).toBe(60_000)
      expect(updated!.maxRequests).toBe(100)
      expect(updated!.keyType).toBe('ip')
    })

    it('update description / pattern 应生效且互不影响', async () => {
      const repo = new dbModule.RateLimitRulesRepository()
      const created = await repo.create(dto())

      const updated = await repo.update(created.id, {
        description: '新描述',
        pattern: '^/api/new',
      })

      expect(updated!.description).toBe('新描述')
      expect(updated!.pattern).toBe('^/api/new')
      expect(updated!.name).toBe('原始名称')
      expect(updated!.maxRequests).toBe(100)
    })

    it('update algorithm 应生效', async () => {
      const repo = new dbModule.RateLimitRulesRepository()
      const created = await repo.create(dto())

      const updated = await repo.update(created.id, { algorithm: 'token-bucket' })
      expect(updated!.algorithm).toBe('token-bucket')
      expect(updated!.pattern).toBe('^/api/original')
    })

    it('update windowMs / maxRequests 应同时生效', async () => {
      const repo = new dbModule.RateLimitRulesRepository()
      const created = await repo.create(dto())

      const updated = await repo.update(created.id, { windowMs: 500, maxRequests: 7 })
      expect(updated!.windowMs).toBe(500)
      expect(updated!.maxRequests).toBe(7)
      expect(updated!.keyType).toBe('ip')
    })

    it('update keyType 应生效', async () => {
      const repo = new dbModule.RateLimitRulesRepository()
      const created = await repo.create(dto())

      const updated = await repo.update(created.id, { keyType: 'api-key' })
      expect(updated!.keyType).toBe('api-key')
      expect(updated!.name).toBe('原始名称')
    })

    it('update priority 应生效', async () => {
      const repo = new dbModule.RateLimitRulesRepository()
      const created = await repo.create(dto())

      const updated = await repo.update(created.id, { priority: 42 })
      expect(updated!.priority).toBe(42)
      expect(updated!.maxRequests).toBe(100)
    })

    it('update enabled=false 应存成 boolean false', async () => {
      const repo = new dbModule.RateLimitRulesRepository()
      const created = await repo.create(dto({ enabled: true }))

      const updated = await repo.update(created.id, { enabled: false })
      expect(updated!.enabled).toBe(false)
      expect(typeof updated!.enabled).toBe('boolean')
    })

    it('update 传空对象应原样返回当前记录', async () => {
      const repo = new dbModule.RateLimitRulesRepository()
      const created = await repo.create(dto())

      const updated = await repo.update(created.id, {})
      expect(updated!.id).toBe(created.id)
      expect(updated!.maxRequests).toBe(100)
      expect(updated!.name).toBe('原始名称')
    })

    it('update 后 updated_at 应被刷新', async () => {
      const repo = new dbModule.RateLimitRulesRepository()
      const created = await repo.create(dto())

      await new Promise(resolve => setTimeout(resolve, 10))
      const updated = await repo.update(created.id, { maxRequests: 999 })

      expect(updated!.updatedAt).toBeGreaterThanOrEqual(created.updatedAt)
      expect(updated!.maxRequests).toBe(999)
    })

    it('create 时 priority / enabled 缺省应有合理默认值', async () => {
      const repo = new dbModule.RateLimitRulesRepository()
      const created = await repo.create(dto())

      expect(created.priority).toBe(0)
      expect(created.enabled).toBe(true)
      expect(created.createdAt).toBeGreaterThan(0)
      expect(created.updatedAt).toBeGreaterThan(0)
    })
  })

  // ==========================================================================
  // BlacklistRepository
  // ==========================================================================
  describe('BlacklistRepository 补充', () => {
    it('findAll 的 total 不应把已过期条目算进去', async () => {
      const repo = new dbModule.BlacklistRepository()
      await repo.create({ type: 'ip', value: '1.1.1.1' })
      await repo.create({ type: 'ip', value: '2.2.2.2' })
      await repo.create({ type: 'ip', value: '3.3.3.3', expiresAt: Date.now() - 1000 })

      const res = await repo.findAll()
      expect(res.items).toHaveLength(2)
      expect(res.meta.total).toBe(2)
    })

    it('create 应记录 createdBy 与 reason', async () => {
      const repo = new dbModule.BlacklistRepository()
      const created = await repo.create(
        { type: 'user-id', value: 'u-1', reason: '刷单' },
        'admin-1'
      )

      expect(created.createdBy).toBe('admin-1')
      expect(created.reason).toBe('刷单')
      expect(created.expiresAt).toBeNull()
    })

    it('delete 不存在的 id 应返回 false', async () => {
      const repo = new dbModule.BlacklistRepository()
      expect(await repo.delete('nope')).toBe(false)
    })

    it('cleanupExpired 不应删除永不过期的条目', async () => {
      const repo = new dbModule.BlacklistRepository()
      await repo.create({ type: 'ip', value: 'forever' })

      const deleted = await repo.cleanupExpired()
      expect(deleted).toBe(0)
      expect(await repo.check('ip', 'forever')).not.toBeNull()
    })

    it('同一 type+value 重复创建时 check 应命中其中一条', async () => {
      const repo = new dbModule.BlacklistRepository()
      await repo.create({ type: 'ip', value: 'dup' })
      await repo.create({ type: 'ip', value: 'dup' })

      const hit = await repo.check('ip', 'dup')
      expect(hit).not.toBeNull()
      expect(hit!.value).toBe('dup')
    })
  })

  // ==========================================================================
  // WhitelistRepository
  // ==========================================================================
  describe('WhitelistRepository 补充', () => {
    it('findAll 应按 created_at 倒序并返回分页元信息', async () => {
      const repo = new dbModule.WhitelistRepository()
      for (let i = 0; i < 3; i++) {
        await repo.create({ type: 'ip', value: `w-${i}` })
      }

      const res = await repo.findAll({ page: 1, limit: 2 })
      expect(res.items).toHaveLength(2)
      expect(res.meta.total).toBe(3)
      expect(res.meta.totalPages).toBe(2)
      expect(res.meta.hasNext).toBe(true)
      expect(res.meta.hasPrevious).toBe(false)
    })

    it('create 应记录 createdBy 与 description', async () => {
      const repo = new dbModule.WhitelistRepository()
      const created = await repo.create(
        { type: 'api-key', value: 'k-1', description: '网关' },
        'ops'
      )

      expect(created.createdBy).toBe('ops')
      expect(created.description).toBe('网关')
    })

    it('delete 不存在的 id 应返回 false', async () => {
      const repo = new dbModule.WhitelistRepository()
      expect(await repo.delete('nope')).toBe(false)
    })

    it('findById 不存在的 id 应返回 null', async () => {
      const repo = new dbModule.WhitelistRepository()
      expect(await repo.findById('nope')).toBeNull()
    })

    it('同 value 不同 type 不应互相命中', async () => {
      const repo = new dbModule.WhitelistRepository()
      await repo.create({ type: 'ip', value: 'shared' })
      await repo.create({ type: 'email', value: 'shared' })

      expect(await repo.check('ip', 'shared')).not.toBeNull()
      expect(await repo.check('email', 'shared')).not.toBeNull()
      expect(await repo.check('user-id', 'shared')).toBeNull()
    })
  })

  // ==========================================================================
  // RateLimitEventsRepository
  // ==========================================================================
  describe('RateLimitEventsRepository 补充', () => {
    const event = (over: Partial<import('../types').RateLimitEvent> = {}) => ({
      identifier: 'id-1',
      path: '/api/x',
      allowed: true,
      remaining: 9,
      limit: 10,
      algorithm: 'sliding-window' as const,
      timestamp: Date.now(),
      ...over,
    })

    it('create 应记录 ruleId', async () => {
      const repo = new dbModule.RateLimitEventsRepository()
      const created = await repo.create(event({ ruleId: 'rule-9' }))

      expect(created.ruleId).toBe('rule-9')
      const fetched = await repo.findById(created.id)
      expect(fetched!.ruleId).toBe('rule-9')
    })

    it('limit 应映射到 max_requests 列并能读回', async () => {
      const repo = new dbModule.RateLimitEventsRepository()
      const created = await repo.create(event({ limit: 42 }))

      expect(created.limit).toBe(42)
      const fetched = await repo.findById(created.id)
      expect(fetched!.limit).toBe(42)
    })

    it('findById 不存在的 id 应返回 null', async () => {
      const repo = new dbModule.RateLimitEventsRepository()
      expect(await repo.findById('nope')).toBeNull()
    })

    it('findByIdentifier 应受 limit 参数限制', async () => {
      const repo = new dbModule.RateLimitEventsRepository()
      for (let i = 0; i < 5; i++) {
        await repo.create(event({ identifier: 'many' }))
      }

      const found = await repo.findByIdentifier('many', 2)
      expect(found).toHaveLength(2)
    })

    it('无 metadata 时 metadata 应为 undefined 而不是解析失败', async () => {
      const repo = new dbModule.RateLimitEventsRepository()
      const created = await repo.create(event())

      expect(created.metadata).toBeUndefined()
      const fetched = await repo.findById(created.id)
      expect(fetched!.metadata).toBeUndefined()
    })

    it('findByTimeRange 应按 timestamp 倒序返回', async () => {
      const repo = new dbModule.RateLimitEventsRepository()
      const base = Date.now()
      await repo.create(event({ identifier: 'older', timestamp: base - 5000 }))
      await repo.create(event({ identifier: 'newer', timestamp: base }))

      const found = await repo.findByTimeRange(base - 10_000, base + 10_000, 10)
      expect(found[0].identifier).toBe('newer')
      expect(found[1].identifier).toBe('older')
    })
  })

  // ==========================================================================
  // AttackEventsRepository
  // ==========================================================================
  describe('AttackEventsRepository 补充', () => {
    const attack = (over: Partial<import('../types').AttackEvent> = {}) => ({
      type: 'brute-force' as const,
      identifier: '1.1.1.1',
      severity: 'medium' as const,
      detectedAt: Date.now(),
      resolved: false,
      ...over,
    })

    it('findAll 无过滤条件应返回全部', async () => {
      const repo = new dbModule.AttackEventsRepository()
      await repo.create(attack({ identifier: 'a' }))
      await repo.create(attack({ identifier: 'b' }))

      const res = await repo.findAll()
      expect(res.items).toHaveLength(2)
      expect(res.meta.total).toBe(2)
    })

    it('findAll 按 type 过滤', async () => {
      const repo = new dbModule.AttackEventsRepository()
      await repo.create(attack({ type: 'ddos', identifier: 'a' }))
      await repo.create(attack({ type: 'xss', identifier: 'b' }))

      const res = await repo.findAll({ type: 'ddos' })
      expect(res.items).toHaveLength(1)
      expect(res.items[0].type).toBe('ddos')
      expect(res.meta.total).toBe(1)
    })

    it('findAll 按 severity 过滤', async () => {
      const repo = new dbModule.AttackEventsRepository()
      await repo.create(attack({ severity: 'critical', identifier: 'a' }))
      await repo.create(attack({ severity: 'low', identifier: 'b' }))

      const res = await repo.findAll({ severity: 'critical' })
      expect(res.items).toHaveLength(1)
      expect(res.items[0].severity).toBe('critical')
    })

    it('findAll 按 resolved 过滤', async () => {
      const repo = new dbModule.AttackEventsRepository()
      await repo.create(attack({ identifier: 'a', resolved: true, resolvedAt: Date.now(), resolvedBy: 'x' }))
      await repo.create(attack({ identifier: 'b', resolved: false }))

      const open = await repo.findAll({ resolved: false })
      expect(open.items).toHaveLength(1)
      expect(open.items[0].identifier).toBe('b')

      const done = await repo.findAll({ resolved: true })
      expect(done.items).toHaveLength(1)
      expect(done.items[0].identifier).toBe('a')
    })

    it('findAll 按 timeRange 过滤（闭区间）', async () => {
      const repo = new dbModule.AttackEventsRepository()
      const base = Date.now()
      await repo.create(attack({ identifier: 'old', detectedAt: base - 10_000 }))
      await repo.create(attack({ identifier: 'mid', detectedAt: base }))
      await repo.create(attack({ identifier: 'new', detectedAt: base + 10_000 }))

      const res = await repo.findAll({ timeRange: { start: base, end: base } })
      expect(res.items).toHaveLength(1)
      expect(res.items[0].identifier).toBe('mid')
    })

    it('findAll 多个过滤条件应同时生效（AND 语义）', async () => {
      const repo = new dbModule.AttackEventsRepository()
      await repo.create(attack({ type: 'ddos', severity: 'critical', identifier: 'a' }))
      await repo.create(attack({ type: 'ddos', severity: 'low', identifier: 'b' }))
      await repo.create(attack({ type: 'xss', severity: 'critical', identifier: 'c' }))

      const res = await repo.findAll({ type: 'ddos', severity: 'critical' })
      expect(res.items).toHaveLength(1)
      expect(res.items[0].identifier).toBe('a')
    })

    it('findAll 应按 detected_at 倒序', async () => {
      const repo = new dbModule.AttackEventsRepository()
      const base = Date.now()
      await repo.create(attack({ identifier: 'older', detectedAt: base - 5000 }))
      await repo.create(attack({ identifier: 'newer', detectedAt: base }))

      const res = await repo.findAll()
      expect(res.items[0].identifier).toBe('newer')
    })

    it('create 应把 evidence 序列化后能读回对象', async () => {
      const repo = new dbModule.AttackEventsRepository()
      const created = await repo.create(attack({ evidence: { count: 5, kind: 'login' } }))

      const fetched = await repo.findById(created.id)
      expect(fetched!.evidence).toEqual({ count: 5, kind: 'login' })
    })

    it('无 evidence 时 evidence 应为 undefined', async () => {
      const repo = new dbModule.AttackEventsRepository()
      const created = await repo.create(attack())

      const fetched = await repo.findById(created.id)
      expect(fetched!.evidence).toBeUndefined()
    })

    it('findById 不存在的 id 应返回 null', async () => {
      const repo = new dbModule.AttackEventsRepository()
      expect(await repo.findById('nope')).toBeNull()
    })

    it('resolve 应写入时间戳且可再次 resolve 保持处理人', async () => {
      const repo = new dbModule.AttackEventsRepository()
      const created = await repo.create(attack())

      const first = await repo.resolve(created.id, 'admin-1')
      expect(first!.resolvedBy).toBe('admin-1')
      expect(first!.resolvedAt).toBeGreaterThan(0)

      const second = await repo.resolve(created.id, 'admin-2')
      expect(second!.resolvedBy).toBe('admin-2')
      expect(second!.resolved).toBe(true)
    })
  })

  // ==========================================================================
  // SecurityAlertsRepository
  // ==========================================================================
  describe('SecurityAlertsRepository 补充', () => {
    const alert = (over: Partial<import('../types').SecurityAlert> = {}) => ({
      type: 'attack-detected',
      severity: 'warning' as const,
      title: '标题',
      createdAt: Date.now(),
      dismissed: false,
      ...over,
    })

    it('findAll 按 severity 过滤并与 count 一致', async () => {
      const repo = new dbModule.SecurityAlertsRepository()
      await repo.create(alert({ severity: 'critical' }))
      await repo.create(alert({ severity: 'warning' }))
      await repo.create(alert({ severity: 'warning' }))

      const res = await repo.findAll({ severity: 'warning' })
      expect(res.items).toHaveLength(2)
      expect(res.meta.total).toBe(2)
      expect(await repo.count({ severity: 'warning' })).toBe(res.meta.total)
    })

    it('findAll 按 dismissed 过滤并与 count 一致', async () => {
      const repo = new dbModule.SecurityAlertsRepository()
      const a = await repo.create(alert({ severity: 'info' }))
      await repo.create(alert({ severity: 'info' }))
      await repo.dismiss(a.id, 'ops')

      const dismissed = await repo.findAll({ dismissed: true })
      expect(dismissed.items).toHaveLength(1)
      expect(dismissed.items[0].dismissed).toBe(true)
      expect(await repo.count({ dismissed: true })).toBe(dismissed.meta.total)

      const open = await repo.findAll({ dismissed: false })
      expect(open.items).toHaveLength(1)
      expect(await repo.count({ dismissed: false })).toBe(open.meta.total)
    })

    it('severity + dismissed 组合过滤时 count 仍与 findAll 一致', async () => {
      const repo = new dbModule.SecurityAlertsRepository()
      const a = await repo.create(alert({ severity: 'critical' }))
      await repo.create(alert({ severity: 'critical' }))
      await repo.create(alert({ severity: 'info' }))
      await repo.dismiss(a.id, 'ops')

      const res = await repo.findAll({ severity: 'critical', dismissed: true })
      expect(res.items).toHaveLength(1)
      expect(await repo.count({ severity: 'critical', dismissed: true })).toBe(res.meta.total)
    })

    it('dismiss 应记录处理人与时间戳', async () => {
      const repo = new dbModule.SecurityAlertsRepository()
      const created = await repo.create(alert())

      const dismissed = await repo.dismiss(created.id, 'ops-1')
      expect(dismissed!.dismissed).toBe(true)
      expect(dismissed!.dismissedBy).toBe('ops-1')
      expect(dismissed!.dismissedAt).toBeGreaterThan(0)
      expect(typeof dismissed!.dismissed).toBe('boolean')
    })

    it('dismiss 不存在的 id 应返回 null', async () => {
      const repo = new dbModule.SecurityAlertsRepository()
      expect(await repo.dismiss('nope', 'ops')).toBeNull()
    })

    it('create 应保留 message 与 metadata', async () => {
      const repo = new dbModule.SecurityAlertsRepository()
      const created = await repo.create(
        alert({ message: '正文', metadata: { ip: '1.1.1.1' } })
      )

      const fetched = await repo.findById(created.id)
      expect(fetched!.message).toBe('正文')
      expect(fetched!.metadata).toEqual({ ip: '1.1.1.1' })
    })

    it('findById 不存在的 id 应返回 null', async () => {
      const repo = new dbModule.SecurityAlertsRepository()
      expect(await repo.findById('nope')).toBeNull()
    })
  })

  // ==========================================================================
  // AuditLogRepository
  // ==========================================================================
  describe('AuditLogRepository 补充', () => {
    it('不传 createdAt 时应自动兜底为当前时间（INTEGER 毫秒）', async () => {
      const repo = new dbModule.AuditLogRepository()
      const before = Date.now()

      const created = await repo.create({
        action: 'rule.create',
        userId: 'u1',
        resource: 'rate_limit_rule',
      })

      expect(typeof created.createdAt).toBe('number')
      expect(created.createdAt).toBeGreaterThanOrEqual(before)
      expect(created.createdAt).toBeLessThanOrEqual(Date.now())
    })

    it('不传 createdAt 的记录能被 findByUser 查出来（P0 回归）', async () => {
      const repo = new dbModule.AuditLogRepository()
      await repo.create({ action: 'x', userId: 'u1', resource: 'r' })

      const found = await repo.findByUser('u1')
      expect(found).toHaveLength(1)
      expect(found[0].action).toBe('x')
      expect(found[0].createdAt).toBeGreaterThan(0)
    })

    it('显式传 createdAt 时应原样使用', async () => {
      const repo = new dbModule.AuditLogRepository()
      const ts = Date.now() - 5_000

      const created = await repo.create({
        action: 'x',
        userId: 'u1',
        resource: 'r',
        createdAt: ts,
      })

      expect(created.createdAt).toBe(ts)
      const found = await repo.findByUser('u1')
      expect(found[0].createdAt).toBe(ts)
    })

    it('createdAt 缺省时写入的时间戳应是 ms 量级（而非秒）', async () => {
      const repo = new dbModule.AuditLogRepository()
      const created = await repo.create({ action: 'now', userId: 'u', resource: 'r' })

      // 若退化成秒精度（strftime('%s')），这个值会比真实时间小 1000 倍
      expect(created.createdAt).toBeGreaterThan(1_600_000_000_000)
    })

    it('createdAt 缺省写入的记录不应被"当前时间"阈值清掉', async () => {
      const repo = new dbModule.AuditLogRepository()
      await repo.create({ action: 'now', userId: 'u', resource: 'r' })

      // 阈值取"写入时刻"本身 —— 严格小于才删，所以这条应留下
      const createdAt = (await repo.findByUser('u'))[0].createdAt
      const cleaned = await repo.cleanup(createdAt)
      expect(cleaned).toBe(0)
      expect(await repo.findByUser('u')).toHaveLength(1)
    })

    it('findByUser 应按 created_at 倒序并受 limit 限制', async () => {
      const repo = new dbModule.AuditLogRepository()
      const base = Date.now()
      await repo.create({ action: 'older', userId: 'u', resource: 'r', createdAt: base - 5000 })
      await repo.create({ action: 'newer', userId: 'u', resource: 'r', createdAt: base })

      const found = await repo.findByUser('u')
      expect(found[0].action).toBe('newer')
      expect(found[1].action).toBe('older')

      const limited = await repo.findByUser('u', 1)
      expect(limited).toHaveLength(1)
      expect(limited[0].action).toBe('newer')
    })

    it('findByUser 应只返回该用户的记录', async () => {
      const repo = new dbModule.AuditLogRepository()
      await repo.create({ action: 'a', userId: 'u1', resource: 'r' })
      await repo.create({ action: 'b', userId: 'u2', resource: 'r' })

      const found = await repo.findByUser('u1')
      expect(found).toHaveLength(1)
      expect(found[0].userId).toBe('u1')
    })

    it('应保留 ipAddress / userAgent / resourceId', async () => {
      const repo = new dbModule.AuditLogRepository()
      await repo.create({
        action: 'x',
        userId: 'u',
        resource: 'res',
        resourceId: 'res-1',
        ipAddress: '10.0.0.1',
        userAgent: 'curl/8',
      })

      const found = await repo.findByUser('u')
      expect(found[0].resourceId).toBe('res-1')
      expect(found[0].ipAddress).toBe('10.0.0.1')
      expect(found[0].userAgent).toBe('curl/8')
    })

    it('无 details 时 details 应为 undefined', async () => {
      const repo = new dbModule.AuditLogRepository()
      await repo.create({ action: 'x', userId: 'u', resource: 'r' })

      const found = await repo.findByUser('u')
      expect(found[0].details).toBeUndefined()
    })

    it('cleanup 只应删除早于阈值的时间戳（INTEGER ms 口径）', async () => {
      const repo = new dbModule.AuditLogRepository()
      const now = Date.now()
      await repo.create({ action: 'old', userId: 'u', resource: 'r', createdAt: now - 100_000 })
      await repo.create({ action: 'new', userId: 'u', resource: 'r', createdAt: now })

      const cleaned = await repo.cleanup(now - 50_000)
      expect(cleaned).toBe(1)
      const found = await repo.findByUser('u')
      expect(found).toHaveLength(1)
      expect(found[0].action).toBe('new')
    })
  })

  // ==========================================================================
  // 脏数据健壮性
  // ==========================================================================
  describe('脏数据健壮性', () => {
    it('details 里存了非法 JSON 时 findByUser 不应抛异常', async () => {
      const repo = new dbModule.AuditLogRepository()
      // 绕过 repository 直接塞一条坏 JSON，模拟历史脏数据
      dbModule.getDatabase()
        .prepare(
          `INSERT INTO audit_log (id, action, user_id, resource, details, created_at)
           VALUES ('bad-1', 'x', 'u1', 'r', '{not-json', ?)`
        )
        .run(Date.now())

      const found = await repo.findByUser('u1')
      expect(found).toHaveLength(1)
      expect(found[0].details).toBeUndefined()
      expect(found[0].action).toBe('x')
    })

    it('metadata 里存了非法 JSON 时安全告警不应抛异常', async () => {
      const repo = new dbModule.SecurityAlertsRepository()
      dbModule.getDatabase()
        .prepare(
          `INSERT INTO security_alerts (id, type, severity, title, metadata, created_at)
           VALUES ('bad-2', 't', 'info', 'title', '<<<not json>>>', ?)`
        )
        .run(Date.now())

      const found = await repo.findById('bad-2')
      expect(found).not.toBeNull()
      expect(found!.metadata).toBeUndefined()
      expect(found!.title).toBe('title')
    })

    it('evidence 里存了非法 JSON 时攻击事件不应抛异常', async () => {
      const repo = new dbModule.AttackEventsRepository()
      dbModule.getDatabase()
        .prepare(
          `INSERT INTO attack_events (id, type, identifier, severity, evidence, detected_at)
           VALUES ('bad-3', 'ddos', 'ip', 'low', 'nope', ?)`
        )
        .run(Date.now())

      const found = await repo.findById('bad-3')
      expect(found).not.toBeNull()
      expect(found!.evidence).toBeUndefined()
      expect(found!.severity).toBe('low')
    })

    it('metadata 里存了 JSON 数组（不是对象）时不应抛异常', async () => {
      const repo = new dbModule.SecurityAlertsRepository()
      dbModule.getDatabase()
        .prepare(
          `INSERT INTO security_alerts (id, type, severity, title, metadata, created_at)
           VALUES ('bad-4', 't', 'info', 'title', '[1,2,3]', ?)`
        )
        .run(Date.now())

      const found = await repo.findById('bad-4')
      expect(found).not.toBeNull()
      expect(found!.metadata).toBeUndefined()
    })
  })

  // ==========================================================================
  // 连接与 schema
  // ==========================================================================
  describe('schema 与连接管理', () => {
    it('schema 应建出全部 7 张业务表', () => {
      const db = dbModule.getDatabase()
      const tables = (
        db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as { name: string }[]
      ).map(t => t.name)

      for (const name of [
        'rate_limit_rules',
        'blacklist',
        'whitelist',
        'rate_limit_events',
        'attack_events',
        'security_alerts',
        'audit_log',
      ]) {
        expect(tables).toContain(name)
      }
    })

    it('initializeDatabase 重复执行不应报错（幂等）', async () => {
      await expect(dbModule.initializeDatabase()).resolves.toBeUndefined()
    })

    it('审计表的 created_at 应是 INTEGER 毫秒时间戳', () => {
      const db = dbModule.getDatabase()
      const row = db.prepare('PRAGMA table_info(audit_log)').all() as {
        name: string
        type: string
        notnull: number
      }[]
      const col = row.find(c => c.name === 'created_at')

      expect(col).toBeDefined()
      expect(col!.type).toBe('INTEGER')
      expect(col!.notnull).toBe(1)
    })

    it('closeDatabase 之后 getDatabase 应能重新建连接', () => {
      const first = dbModule.getDatabase()
      dbModule.closeDatabase()
      const second = dbModule.getDatabase()

      expect(second).not.toBe(first)
      expect(second.open).toBe(true)
    })
  })
})
