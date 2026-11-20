/**
 * @fileoverview 导出 API 真实数据库接入测试
 * @description 用真实的 better-sqlite3 内存库驱动导出 SQL，
 *              验证：(1) 导出内容来自真实 tasks 表；(2) filters / sort 真生效；
 *              (3) 数据库异常时优雅降级不 500；(4) TASK_FIELDS 与实际列一致。
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import type { DatabaseConnection } from '@/lib/db'
import { getDatabase } from '@/lib/db'
import { GET, POST } from '../sync/route'
import { TASK_FIELDS } from '../lib/task-repository'
import {
  createTaskDatabase,
  createBrokenDatabase,
  wrapSqlite,
  TaskSeedRow,
} from './helpers/fake-task-db'

// ---------------------------------------------------------------------------
// Mock：数据库（语义化内存 fake，SQL 真的被执行）
// ---------------------------------------------------------------------------
vi.mock('@/lib/db', () => ({
  getDatabase: vi.fn(),
  getDatabaseAsync: vi.fn(),
  db: {},
}))

// ---------------------------------------------------------------------------
// Mock：认证 —— 直接放行，专注导出逻辑
// ---------------------------------------------------------------------------
vi.mock('@/middleware/auth.middleware', () => ({
  authMiddleware: vi.fn(async () =>
    NextResponse.json({ userId: 'user-1', email: 'a@b.c' }, { status: 200 })
  ),
}))

const SEED: TaskSeedRow[] = [
  {
    id: 'task-1',
    title: '第一个任务',
    description: '描述一',
    priority: 'low',
    status: 'pending',
    due_date: '2026-03-01T00:00:00.000Z',
    created_by: 'user-1',
    assigned_to: 'user-2',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-02T00:00:00.000Z',
  },
  {
    id: 'task-2',
    title: '第二个任务',
    description: '描述二',
    priority: 'high',
    status: 'completed',
    due_date: null,
    created_by: 'user-1',
    assigned_to: null,
    created_at: '2026-01-03T00:00:00.000Z',
    updated_at: '2026-01-04T00:00:00.000Z',
  },
  {
    id: 'task-3',
    title: '第三个任务',
    description: null,
    priority: 'medium',
    status: 'completed',
    due_date: '2026-02-01T00:00:00.000Z',
    created_by: 'user-2',
    assigned_to: 'user-3',
    created_at: '2026-01-05T00:00:00.000Z',
    updated_at: '2026-01-06T00:00:00.000Z',
  },
]

/**
 * 从响应体读出 CSV 文本
 */
async function readText(response: Response): Promise<string> {
  return await response.text()
}

/**
 * 解析 CSV 为行数组（简单实现：不含引号转义的场景，测试数据里没有逗号）
 */
function parseCsv(text: string): string[][] {
  return text
    .replace(/^\uFEFF/, '')
    .split('\n')
    .filter(line => line.length > 0)
    .map(line => line.split(','))
}

describe('导出 API —— 真实数据库接入', () => {
  let connection: DatabaseConnection

  beforeEach(() => {
    vi.clearAllMocks()
    const created = createTaskDatabase(SEED)
    connection = created.connection
    vi.mocked(getDatabase).mockReturnValue(connection)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('GET /api/export/sync', () => {
    it('导出的行来自真实 tasks 表，而不是硬编码假数据', async () => {
      const request = new NextRequest('http://localhost/api/export/sync?format=csv&filename=tasks')
      const response = await GET(request)

      expect(response.status).toBe(200)
      const text = await readText(response)
      const rows = parseCsv(text)

      // 表头 + 3 条真实数据
      expect(rows).toHaveLength(4)
      expect(text).toContain('第一个任务')
      expect(text).toContain('task-1')
      // 假数据里的痕迹不应出现
      expect(text).not.toContain('TASK-0001')
      expect(text).not.toContain('这是任务 1 的描述')
      expect(response.headers.get('X-Export-Row-Count')).toBe('3')
    })

    it('TASK_FIELDS 与真实表列一一对应（不含 tags / estimatedHours / actualHours）', async () => {
      const keys = TASK_FIELDS.map(f => f.key as string)

      expect(keys).toEqual([
        'id',
        'title',
        'description',
        'status',
        'priority',
        'dueDate',
        'createdBy',
        'assignedTo',
        'createdAt',
        'updatedAt',
      ])

      // 真实表没有的列必须不在导出字段里
      expect(keys).not.toContain('tags')
      expect(keys).not.toContain('estimatedHours')
      expect(keys).not.toContain('actualHours')
      expect(keys).not.toContain('assignee')
    })

    it('CSV 表头使用中文标签且列数 = TASK_FIELDS 数量', async () => {
      const request = new NextRequest('http://localhost/api/export/sync?format=csv&filename=tasks')
      const response = await GET(request)
      const rows = parseCsv(await readText(response))

      expect(rows[0]).toHaveLength(TASK_FIELDS.length)
      expect(rows[0]).toContain('任务标题')
      expect(rows[0]).toContain('创建者')
      expect(rows[0]).toContain('负责人')
    })
  })

  describe('POST /api/export/sync —— 过滤真的生效', () => {
    it('filters 按 status 过滤，只导出匹配的行', async () => {
      const request = new NextRequest('http://localhost/api/export/sync', {
        method: 'POST',
        body: JSON.stringify({
          format: 'csv',
          filename: 'completed',
          filters: [{ field: 'status', operator: 'eq', value: 'completed' }],
        }),
      })

      const response = await POST(request)
      expect(response.status).toBe(200)

      const rows = parseCsv(await readText(response))
      expect(rows).toHaveLength(3) // 表头 + 2 条 completed
      expect(rows[1]).toContain('第二个任务')
      expect(rows[2]).toContain('第三个任务')
      expect(response.headers.get('X-Export-Row-Count')).toBe('2')
    })

    it('filters 支持 like / in / isNull', async () => {
      const likeRequest = new NextRequest('http://localhost/api/export/sync', {
        method: 'POST',
        body: JSON.stringify({
          format: 'csv',
          filename: 'like',
          filters: [{ field: 'title', operator: 'like', value: '第' }],
        }),
      })
      const likeRows = parseCsv(await readText(await POST(likeRequest)))
      expect(likeRows).toHaveLength(4)

      const inRequest = new NextRequest('http://localhost/api/export/sync', {
        method: 'POST',
        body: JSON.stringify({
          format: 'csv',
          filename: 'in',
          filters: [{ field: 'status', operator: 'in', value: ['pending'] }],
        }),
      })
      const inRows = parseCsv(await readText(await POST(inRequest)))
      expect(inRows).toHaveLength(2)

      const nullRequest = new NextRequest('http://localhost/api/export/sync', {
        method: 'POST',
        body: JSON.stringify({
          format: 'csv',
          filename: 'null',
          filters: [{ field: 'dueDate', operator: 'isNull', value: null }],
        }),
      })
      const nullRows = parseCsv(await readText(await POST(nullRequest)))
      expect(nullRows).toHaveLength(2)
      expect(nullRows[1]).toContain('第二个任务')
    })

    it('非法过滤字段被忽略且不报错（不 500）', async () => {
      const request = new NextRequest('http://localhost/api/export/sync', {
        method: 'POST',
        body: JSON.stringify({
          format: 'csv',
          filename: 'bad',
          filters: [{ field: 'DROP TABLE tasks', operator: 'eq', value: 'x' }],
        }),
      })

      const response = await POST(request)
      expect(response.status).toBe(200)
      expect(response.headers.get('X-Export-Ignored-Fields')).toContain('DROP TABLE tasks')

      const rows = parseCsv(await readText(response))
      expect(rows).toHaveLength(4)
    })

    it('排序真的生效：priority 自定义序（low < medium < high）', async () => {
      const request = new NextRequest('http://localhost/api/export/sync', {
        method: 'POST',
        body: JSON.stringify({
          format: 'csv',
          filename: 'sorted',
          sort: [{ field: 'priority', order: 'asc' }],
        }),
      })

      const rows = parseCsv(await readText(await POST(request)))
      expect(rows[1]).toContain('第一个任务') // low
      expect(rows[2]).toContain('第三个任务') // medium
      expect(rows[3]).toContain('第二个任务') // high
    })

    it('排序真的生效：createdAt 倒序', async () => {
      const request = new NextRequest('http://localhost/api/export/sync', {
        method: 'POST',
        body: JSON.stringify({
          format: 'csv',
          filename: 'sorted2',
          sort: [{ field: 'createdAt', order: 'desc' }],
        }),
      })

      const rows = parseCsv(await readText(await POST(request)))
      expect(rows[1]).toContain('第三个任务')
      expect(rows[3]).toContain('第一个任务')
    })

    it('分页真的生效：page / pageSize 限制导出行数', async () => {
      const request = new NextRequest('http://localhost/api/export/sync', {
        method: 'POST',
        body: JSON.stringify({
          format: 'csv',
          filename: 'paged',
          page: 1,
          pageSize: 2,
          sort: [{ field: 'createdAt', order: 'asc' }],
        }),
      })

      const rows = parseCsv(await readText(await POST(request)))
      expect(rows).toHaveLength(3) // 表头 + 2 行
      expect(rows[1]).toContain('第一个任务')
      expect(rows[2]).toContain('第二个任务')
    })
  })

  describe('优雅降级', () => {
    it('数据库查询抛错时返回 200 空导出，不 500', async () => {
      vi.mocked(getDatabase).mockReturnValue(createBrokenDatabase())

      const request = new NextRequest('http://localhost/api/export/sync?format=csv&filename=tasks')
      const response = await GET(request)

      expect(response.status).toBe(200)
      expect(response.headers.get('X-Export-Degraded')).toBe('true')
      expect(response.headers.get('X-Export-Row-Count')).toBe('0')

      const rows = parseCsv(await readText(response))
      expect(rows).toHaveLength(1) // 只有表头
    })

    it('POST 在数据库抛错时同样降级，不 500', async () => {
      vi.mocked(getDatabase).mockReturnValue(createBrokenDatabase())

      const request = new NextRequest('http://localhost/api/export/sync', {
        method: 'POST',
        body: JSON.stringify({ format: 'csv', filename: 'tasks' }),
      })
      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(response.headers.get('X-Export-Degraded')).toBe('true')
    })

    it('tasks 表不存在时自动建表并返回空结果，不 500', async () => {
      // 造一个没有 tasks 表的库
      const DatabaseCtor = (await import('better-sqlite3')).default
      const raw = new DatabaseCtor(':memory:')
      raw.exec('CREATE TABLE other (x INTEGER)')
      vi.mocked(getDatabase).mockReturnValue(wrapSqlite(raw))

      const request = new NextRequest('http://localhost/api/export/sync?format=csv&filename=tasks')
      const response = await GET(request)

      expect(response.status).toBe(200)
      expect(response.headers.get('X-Export-Row-Count')).toBe('0')
      // 表被自动建出来
      const tableExists = raw
        .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='tasks'")
        .get()
      expect(tableExists).toBeTruthy()
    })

    it('请求体非法 JSON 返回 400', async () => {
      const request = new NextRequest('http://localhost/api/export/sync', {
        method: 'POST',
        body: 'not-json',
      })
      const response = await POST(request)
      expect(response.status).toBe(400)
    })

    it('缺少必填字段返回 400', async () => {
      const request = new NextRequest('http://localhost/api/export/sync', {
        method: 'POST',
        body: JSON.stringify({ format: 'csv' }),
      })
      const response = await POST(request)
      expect(response.status).toBe(400)
    })
  })
})
