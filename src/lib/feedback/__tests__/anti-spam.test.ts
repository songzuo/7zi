/**
 * 反馈反垃圾的回归测试
 *
 * 重点覆盖一个真实的 P0：**限流窗口永远不失效**。
 *
 * feedbacks 表的 created_at 列，schema 默认值是 datetime('now')
 * （格式 "YYYY-MM-DD HH:MM:SS"，空格分隔），
 * 但 API 层用 new Date().toISOString() 显式写入
 * （格式 "YYYY-MM-DDTHH:MM:SS.sssZ"，T 分隔）。
 *
 * SQL 里做 `created_at > datetime('now','-1 hour')` 是**字符串比较**：
 *   "2026-10-20T09:00:00.000Z"  vs  "2026-10-30 19:00:00"
 *    ↑ 第 11 位 'T'(0x54) vs ' '(0x20)
 * 'T' 恒大于 ' ' → 任何 ISO 字符串都排在任何 SQLite 字符串之后
 * → **10 天前的记录也满足 "1 小时内"** → 限流一旦触发永不解封。
 *
 * 修法：比较前用 datetime(created_at) 归一化。
 *
 * 另有一个健壮性缺陷：COUNT 查询用 `db.queryRows(...)[0] as { count }`，
 * 空结果集时 [0] 是 undefined，读 .count 抛 TypeError；
 * 而测试假库对聚合查询返回的是**对象**而非数组 —— 真假库形状不一致。
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockQueryRows = vi.fn()
const mockQuery = vi.fn()
const mockExec = vi.fn()

/**
 * 按 SQL 形状分派 mock 返回值。
 *
 * queryRows 在本模块有两种用法，返回形状不同：
 *  - COUNT 聚合查询 → 生产代码用 extractCount() 读，兼容数组与对象
 *  - 普通 SELECT（查最近反馈）→ 必须是**数组**，代码会 for...of 遍历
 *
 * @param count COUNT 聚合的结果
 * @param rows  普通查询的行
 */
function mockRows(count: unknown, rows: unknown[] = []) {
  mockQueryRows.mockImplementation((sql: string) => {
    if (/count\s*\(/i.test(String(sql))) return count
    return rows
  })
}

// 全局 src/test/vi-mocks.ts 把 '../lib/db/index' 和 '../lib/feedback/anti-spam'
// 整个 mock 掉了（统一 stub），测试拿到的永远是桩函数，
// 根本走不到真实实现 —— 这里必须先 unmock。
vi.unmock('@/lib/db/index')
vi.unmock('@/lib/db/connection')
vi.unmock('../index')
vi.unmock('../connection')
vi.unmock('@/lib/feedback/anti-spam')
vi.unmock('../anti-spam')

// anti-spam.ts 里写的是 `from '../db/index'`（相对路径），
// 必须按**同一模块**来 mock，否则 mock 根本不会生效。
vi.mock('@/lib/db/index', () => ({
  getDatabaseAsync: async () => ({
    queryRows: mockQueryRows,
    query: mockQuery,
    exec: mockExec,
  }),
  getDatabase: async () => ({
    queryRows: mockQueryRows,
    query: mockQuery,
    exec: mockExec,
  }),
}))

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))

import { detectSpam, getSpamStatistics } from '@/lib/feedback/anti-spam'

/** 取所有执行过的 SQL 文本 */
function allSql(): string {
  return mockQueryRows.mock.calls.map(c => String(c[0])).join('\n')
}

describe('anti-spam —— 时间戳格式归一化（限流窗口）', () => {
  beforeEach(() => {
    mockQueryRows.mockReset()
    mockQuery.mockReset()
    mockExec.mockReset()
  })

  it('所有 created_at 窗口比较都必须经 datetime() 归一化', async () => {
    mockRows({ count: 0 })
    mockQuery.mockReturnValue([])

    await detectSpam('user-1', '这是一条正常的反馈内容，长度足够')

    const sql = allSql()
    // 至少有一条涉及 created_at 的窗口查询
    expect(sql).toContain('created_at')
    // 不能有裸的 created_at > datetime('now', ...)
    // 那样 ISO 格式的行永远满足条件，限流永不解除
    expect(sql).not.toMatch(/[^(]created_at\s*>\s*datetime\('now'/)
  })

  it('统计接口的窗口查询同样要归一化', async () => {
    mockRows({ count: 0 })

    await getSpamStatistics(7)

    const sql = allSql()
    expect(sql).not.toMatch(/[^(]created_at\s*>\s*datetime\('now'/)
  })

  it('归一化后语义正确：窗口内的计数会真正被统计', async () => {
    // 1 小时内已有 99 条 → 判定为限流
    mockRows({ count: 99 })
    mockQuery.mockReturnValue([])

    const result = await detectSpam('user-1', '这是一条正常的反馈内容，长度足够')

    expect(result.is_spam).toBe(true)
    expect(result.reason).toMatch(/rate limit/i)
  })
})

describe('anti-spam —— COUNT 结果读取必须健壮', () => {
  beforeEach(() => {
    mockQueryRows.mockReset()
    mockQuery.mockReset()
    mockExec.mockReset()
  })

  it('COUNT 返回空数组时不能抛 TypeError', async () => {
    mockRows([])
    mockQuery.mockReturnValue([])

    await expect(
      detectSpam('user-1', '这是一条正常的反馈内容，长度足够')
    ).resolves.toBeDefined()
  })

  it('COUNT 返回 null 时不能抛 TypeError', async () => {
    mockRows(null)
    mockQuery.mockReturnValue([])

    await expect(
      detectSpam('user-1', '这是一条正常的反馈内容，长度足够')
    ).resolves.toBeDefined()
  })

  it('兼容数组 [{count:N}] 与对象 {count:N} 两种返回形状', async () => {
    mockRows([{ count: 99 }])
    mockQuery.mockReturnValue([])
    const viaArray = await detectSpam('user-1', '这是一条正常的反馈内容，长度足够')

    mockRows({ count: 99 })
    const viaObject = await detectSpam('user-1', '这是一条正常的反馈内容，长度足够')

    // 两种形状应得到同样的判定
    expect(viaArray.is_spam).toBe(viaObject.is_spam)
    expect(viaArray.reason).toBe(viaObject.reason)
  })

  it('统计接口在空结果集下不崩', async () => {
    mockRows([])

    const stats = await getSpamStatistics(7)
    expect(stats.total_checks).toBe(0)
    expect(stats.spam_detected).toBe(0)
    expect(stats.blocked_users).toBe(0)
  })
})

describe('anti-spam —— 限流阈值行为', () => {
  beforeEach(() => {
    mockQueryRows.mockReset()
    mockQuery.mockReset()
    mockExec.mockReset()
  })

  it('1 小时内多条提交 → 被限流', async () => {
    mockRows({ count: 99 })
    mockQuery.mockReturnValue([])

    const result = await detectSpam('user-1', '这是一条正常的反馈内容，长度足够')
    expect(result.is_spam).toBe(true)
  })

  it('1 小时内没有提交 → 不因限流被拦', async () => {
    mockRows({ count: 0 })
    mockQuery.mockReturnValue([])

    const result = await detectSpam('user-1', '这是一条正常的反馈内容，长度足够')
    expect(result.reason).not.toMatch(/rate limit/i)
  })
})

describe('anti-spam —— JS 侧时间解析不能用 new Date()', () => {
  beforeEach(() => {
    mockQueryRows.mockReset()
    mockQuery.mockReset()
    mockExec.mockReset()
  })

  it('SQLite 格式的 created_at 按 UTC 解析，而不是本地时区', async () => {
    // 90 秒前提交过一次（SQLite 的 datetime('now') 格式，UTC）
    const past = new Date(Date.now() - 90_000)
      .toISOString()
      .slice(0, 19)
      .replace('T', ' ')

    // 第 1 次查 COUNT → 0（未超限）
    // 第 2 次查最近一条反馈 → 90 秒前的那条
    mockQueryRows.mockImplementation((sql: string) => {
      const s = String(sql)
      if (/count\s*\(/i.test(s)) return { count: 0 }
      if (/ORDER BY created_at DESC/i.test(s)) {
        return [{ created_at: past, description: '别的内容' }]
      }
      return []
    })
    mockQuery.mockReturnValue([])

    const result = await detectSpam('user-1', '这是一条新的反馈内容，长度足够')

    // 距上次提交 90 秒 < min_time_between_feedback(60)？
    // 90 > 60 → 不该被拦。若按本地时区解析偏 8 小时，
    // timeDiff 会变成负数/巨大值，判定结果完全不同。
    expect(result.reason).not.toMatch(/too many submissions/i)
  })

  it('真正间隔不足时仍应拦截', async () => {
    const past = new Date(Date.now() - 5_000)
      .toISOString()
      .slice(0, 19)
      .replace('T', ' ')

    mockQueryRows.mockImplementation((sql: string) => {
      const s = String(sql)
      if (/count\s*\(/i.test(s)) return { count: 0 }
      if (/ORDER BY created_at DESC/i.test(s)) {
        return [{ created_at: past, description: '别的内容' }]
      }
      return []
    })
    mockQuery.mockReturnValue([])

    const result = await detectSpam('user-1', '这是一条新的反馈内容，长度足够')
    expect(result.reason).toMatch(/too many submissions/i)
  })
})
