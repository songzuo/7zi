/**
 * @fileoverview 任务仓储层单元测试
 * @description 覆盖 WHERE / ORDER BY 构建与 snake_case -> camelCase 映射
 */

import { describe, it, expect } from 'vitest'
import {
  buildWhereClause,
  buildOrderByClause,
  normalizeFieldName,
  rowToTaskEntity,
  TASK_COLUMN_MAP,
  TASK_FIELDS,
} from '../lib/task-repository'

describe('normalizeFieldName', () => {
  it('接受 camelCase 字段名', () => {
    expect(normalizeFieldName('dueDate')).toBe('dueDate')
    expect(normalizeFieldName('createdBy')).toBe('createdBy')
  })

  it('接受真实列名（snake_case）并归一化', () => {
    expect(normalizeFieldName('due_date')).toBe('dueDate')
    expect(normalizeFieldName('created_by')).toBe('createdBy')
    expect(normalizeFieldName('assigned_to')).toBe('assignedTo')
  })

  it('拒绝未知字段', () => {
    expect(normalizeFieldName('tags')).toBeNull()
    expect(normalizeFieldName('estimatedHours')).toBeNull()
    expect(normalizeFieldName('actualHours')).toBeNull()
    expect(normalizeFieldName('DROP TABLE tasks')).toBeNull()
  })
})

describe('TASK_COLUMN_MAP', () => {
  it('每个导出字段都有对应的真实列', () => {
    for (const field of TASK_FIELDS) {
      const key = field.key as string
      expect(TASK_COLUMN_MAP[key]).toBeTruthy()
    }
  })

  it('映射目标全部是 tasks 表真实列名', () => {
    const realColumns = new Set([
      'id',
      'title',
      'description',
      'priority',
      'status',
      'due_date',
      'created_by',
      'assigned_to',
      'created_at',
      'updated_at',
    ])
    for (const column of Object.values(TASK_COLUMN_MAP)) {
      expect(realColumns.has(column)).toBe(true)
    }
  })
})

describe('buildWhereClause', () => {
  it('eq 生成大小写不敏感比较（参数小写化）', () => {
    const { sql, params } = buildWhereClause([{ field: 'status', operator: 'eq', value: 'Completed' }])
    expect(sql).toBe('WHERE LOWER(status) = LOWER(?)')
    expect(params).toEqual(['completed'])
  })

  it('ne 把 NULL 行纳入命中（与 FilterParser.equals 语义一致）', () => {
    const { sql } = buildWhereClause([{ field: 'dueDate', operator: 'ne', value: 'x' }])
    expect(sql).toBe('WHERE (due_date IS NULL OR LOWER(due_date) != LOWER(?))')
  })

  it('notIn 把 NULL 行纳入命中', () => {
    const { sql } = buildWhereClause([
      { field: 'status', operator: 'notIn', value: ['pending'] },
    ])
    expect(sql).toBe('WHERE (status IS NULL OR NOT (LOWER(status) IN (?)))')
  })

  it('like 转义通配符', () => {
    const { sql, params } = buildWhereClause([{ field: 'title', operator: 'like', value: '100%' }])
    expect(sql).toContain('LIKE ?')
    expect(params).toEqual(['%100\\%%'])
  })

  it('in 生成占位符列表', () => {
    const { sql, params } = buildWhereClause([
      { field: 'priority', operator: 'in', value: ['low', 'high'] },
    ])
    expect(sql).toBe('WHERE LOWER(priority) IN (?, ?)')
    expect(params).toEqual(['low', 'high'])
  })

  it('in 的参数小写化以匹配 LOWER(col)', () => {
    const { params } = buildWhereClause([
      { field: 'priority', operator: 'in', value: ['LOW', 'High'] },
    ])
    expect(params).toEqual(['low', 'high'])
  })

  it('isNull 不带参数', () => {
    const { sql, params } = buildWhereClause([{ field: 'dueDate', operator: 'isNull', value: null }])
    expect(sql).toBe('WHERE due_date IS NULL')
    expect(params).toEqual([])
  })

  it('未知字段被忽略并记录', () => {
    const { sql, ignored } = buildWhereClause([
      { field: 'bogus', operator: 'eq', value: 'x' },
    ])
    expect(sql).toBe('')
    expect(ignored).toEqual(['bogus'])
  })

  it('空过滤返回空 WHERE', () => {
    const { sql, params } = buildWhereClause(undefined)
    expect(sql).toBe('')
    expect(params).toEqual([])
  })
})

describe('buildOrderByClause', () => {
  it('priority 使用自定义序', () => {
    const { sql } = buildOrderByClause([{ field: 'priority', order: 'asc' }])
    expect(sql).toContain("CASE priority WHEN 'low' THEN 1")
    expect(sql).toContain('ASC')
  })

  it('普通字段 NULL 排最后', () => {
    const { sql } = buildOrderByClause([{ field: 'dueDate', order: 'desc' }])
    expect(sql).toBe('ORDER BY (due_date IS NULL) ASC, due_date DESC')
  })

  it('未知排序字段被忽略', () => {
    const { sql, ignored } = buildOrderByClause([{ field: 'nope', order: 'asc' }])
    expect(sql).toBe('')
    expect(ignored).toEqual(['nope'])
  })
})

describe('rowToTaskEntity', () => {
  it('snake_case -> camelCase 正确映射', () => {
    const entity = rowToTaskEntity({
      id: 'task-9',
      title: '标题',
      description: '描述',
      priority: 'high',
      status: 'pending',
      due_date: '2026-05-01',
      created_by: 'user-1',
      assigned_to: 'user-2',
      created_at: '2026-01-01',
      updated_at: '2026-01-02',
    })

    expect(entity).toEqual({
      id: 'task-9',
      title: '标题',
      description: '描述',
      priority: 'high',
      status: 'pending',
      dueDate: '2026-05-01',
      createdBy: 'user-1',
      assignedTo: 'user-2',
      createdAt: '2026-01-01',
      updatedAt: '2026-01-02',
    })
  })

  it('NULL 列映射为 undefined（不编造假值）', () => {
    const entity = rowToTaskEntity({
      id: 'task-9',
      title: '标题',
      description: null,
      priority: 'medium',
      status: 'pending',
      due_date: null,
      created_by: 'user-1',
      assigned_to: null,
      created_at: '2026-01-01',
      updated_at: '2026-01-02',
    })

    expect(entity.description).toBeUndefined()
    expect(entity.dueDate).toBeUndefined()
    expect(entity.assignedTo).toBeUndefined()
    expect('tags' in entity).toBe(false)
  })
})
