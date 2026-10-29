/**
 * @fileoverview 导出异步任务 API 测试
 * @description 验证异步导出也走真实数据库，并返回真实行数
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import { getDatabase } from '@/lib/db'
import { POST } from '../async/route'
import { createTaskDatabase, createBrokenDatabase, TaskSeedRow } from './helpers/fake-task-db'

vi.mock('@/lib/db', () => ({
  getDatabase: vi.fn(),
  getDatabaseAsync: vi.fn(),
  db: {},
}))

vi.mock('@/middleware/auth.middleware', () => ({
  authMiddleware: vi.fn(async () =>
    NextResponse.json({ userId: 'user-1' }, { status: 200 })
  ),
}))

const SEED: TaskSeedRow[] = [
  {
    id: 'task-1',
    title: '第一个任务',
    priority: 'low',
    status: 'pending',
    created_by: 'user-1',
    assigned_to: 'user-2',
  },
  {
    id: 'task-2',
    title: '第二个任务',
    priority: 'high',
    status: 'completed',
    created_by: 'user-1',
    assigned_to: null,
  },
]

describe('POST /api/export/async —— 真实数据库接入', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    const created = createTaskDatabase(SEED)
    vi.mocked(getDatabase).mockReturnValue(created.connection)
  })

  it('提交任务时读取真实数据库并返回真实行数', async () => {
    const request = new NextRequest('http://localhost/api/export/async', {
      method: 'POST',
      body: JSON.stringify({ format: 'csv', filename: 'tasks' }),
    })

    const response = await POST(request)
    expect(response.status).toBe(200)

    const body = await response.json()
    expect(body.success).toBe(true)
    expect(body.jobId).toBeTruthy()
    expect(body.rowCount).toBe(2)
    expect(body.degraded).toBe(false)
  })

  it('过滤条件在提交任务时就生效（只统计匹配行）', async () => {
    const request = new NextRequest('http://localhost/api/export/async', {
      method: 'POST',
      body: JSON.stringify({
        format: 'csv',
        filename: 'tasks',
        filters: [{ field: 'status', operator: 'eq', value: 'completed' }],
      }),
    })

    const response = await POST(request)
    const body = await response.json()
    expect(body.rowCount).toBe(1)
  })

  it('数据库异常时降级：仍返回 200 任务，但标记 degraded', async () => {
    vi.mocked(getDatabase).mockReturnValue(createBrokenDatabase())

    const request = new NextRequest('http://localhost/api/export/async', {
      method: 'POST',
      body: JSON.stringify({ format: 'csv', filename: 'tasks' }),
    })

    const response = await POST(request)
    expect(response.status).toBe(200)

    const body = await response.json()
    expect(body.success).toBe(true)
    expect(body.degraded).toBe(true)
    expect(body.rowCount).toBe(0)
  })

  it('缺少必填字段返回 400', async () => {
    const request = new NextRequest('http://localhost/api/export/async', {
      method: 'POST',
      body: JSON.stringify({ format: 'csv' }),
    })
    const response = await POST(request)
    expect(response.status).toBe(400)
  })
})
