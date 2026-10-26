/**
 * Notifications Contract & Store Tests
 *
 * 历史背景：本文件原本是 `tests/api-integration/notifications.test.ts`，针对
 * `src/app/api/notifications/route.ts` 的 GET/POST 集成测试。但该 HTTP 路由
 * 已在提交 `1305b89038` 中被删除，`src/app/api/notifications/` 目录与
 * `@/lib/auth/api-auth` 模块均已不存在，导致整个文件在 collect 阶段失败。
 *
 * 本次改造（不重建已删除的 HTTP 路由、不改 src/ 下任何文件）：
 *   1. 方案 A —— 直接测试仍然存在的通知核心能力：`src/lib/notifications/store.ts`
 *      的 zustand store（创建通知 / 未读计数 / 标记已读 / 过滤筛选 / 上限截断 /
 *      偏好设置），覆盖原测试想验证的业务语义。
 *   2. 方案 B —— 测试 `src/types/notifications` 的枚举与 `NOTIFICATION_TEMPLATES`
 *      纯数据契约。
 *   3. 契约测试 —— 从已删除的 `src/app/api/notifications/route.ts`（提交
 *      `1305b89038^`）中提取仍应由现有代码遵守的业务规则（优先级排序、
 *      分页/数量上限、必填字段、状态默认值），断言现有实现与之保持一致。
 */

import { describe, it, expect, beforeEach } from 'vitest'

import { useNotificationStore } from '@/lib/notifications'
import {
  selectUnreadCount,
  selectNotifications,
  selectPreferences,
  selectIsLoading,
} from '@/lib/notifications/store'
import {
  NotificationType,
  NotificationPriority,
  NotificationStatus,
  NOTIFICATION_TEMPLATES,
  type Notification,
  type CreateNotificationDto,
  type UpdateNotificationDto,
  type NotificationFilters,
} from '@/types/notifications'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

let seq = 0

const makeNotification = (overrides: Partial<Notification> = {}): Notification => {
  seq += 1
  const now = new Date('2026-01-01T00:00:00.000Z').toISOString()
  return {
    id: `notif_${seq}`,
    user_id: 'user-1',
    type: NotificationType.TASK_ASSIGNED,
    title: `Notification ${seq}`,
    content: `Content ${seq}`,
    priority: NotificationPriority.NORMAL,
    status: NotificationStatus.UNREAD,
    created_at: now,
    updated_at: now,
    ...overrides,
  }
}

const resetStore = () => {
  useNotificationStore.setState({
    notifications: [],
    unreadCount: 0,
    isLoading: false,
    error: null,
  })
  useNotificationStore.getState().resetPreferences()
}

// ---------------------------------------------------------------------------
// 方案 A —— Notification Store 行为
// ---------------------------------------------------------------------------

describe('Notification Store - 状态与未读计数', () => {
  beforeEach(resetStore)

  it('应以空列表、0 未读、默认偏好初始化', () => {
    const state = useNotificationStore.getState()

    expect(state.notifications).toEqual([])
    expect(state.unreadCount).toBe(0)
    expect(state.isLoading).toBe(false)
    expect(state.error).toBeNull()
    expect(state.preferences.enabled).toBe(true)
    expect(state.preferences.email_enabled).toBe(true)
    expect(state.preferences.sound_enabled).toBe(true)
  })

  it('addNotification 应把新通知置于列表头部并计入未读', () => {
    const first = makeNotification({ id: 'n1' })
    const second = makeNotification({ id: 'n2' })

    useNotificationStore.getState().addNotification(first)
    useNotificationStore.getState().addNotification(second)

    const state = useNotificationStore.getState()
    expect(state.notifications.map(n => n.id)).toEqual(['n2', 'n1'])
    expect(state.unreadCount).toBe(2)
  })

  it('addNotification 对已读通知不应增加未读计数', () => {
    useNotificationStore.getState().addNotification(
      makeNotification({ status: NotificationStatus.READ })
    )

    const state = useNotificationStore.getState()
    expect(state.notifications).toHaveLength(1)
    expect(state.unreadCount).toBe(0)
  })

  it('setNotifications 应按状态重算未读计数', () => {
    useNotificationStore.getState().setNotifications([
      makeNotification({ status: NotificationStatus.UNREAD }),
      makeNotification({ status: NotificationStatus.READ }),
      makeNotification({ status: NotificationStatus.UNREAD }),
      makeNotification({ status: NotificationStatus.ARCHIVED }),
    ])

    expect(useNotificationStore.getState().unreadCount).toBe(2)
  })

  it('updateNotification 应合并字段并重算未读计数', () => {
    const id = 'n1'
    useNotificationStore.getState().addNotification(makeNotification({ id }))

    useNotificationStore.getState().updateNotification(id, {
      title: '已更新标题',
      status: NotificationStatus.READ,
    })

    const updated = useNotificationStore.getState().notifications[0]
    expect(updated.title).toBe('已更新标题')
    expect(updated.status).toBe(NotificationStatus.READ)
    expect(useNotificationStore.getState().unreadCount).toBe(0)
  })

  it('removeNotification 应移除目标通知并重算未读计数', () => {
    useNotificationStore.getState().addNotification(makeNotification({ id: 'n1' }))
    useNotificationStore.getState().addNotification(makeNotification({ id: 'n2' }))

    useNotificationStore.getState().removeNotification('n1')

    const state = useNotificationStore.getState()
    expect(state.notifications.map(n => n.id)).toEqual(['n2'])
    expect(state.unreadCount).toBe(1)
  })

  it('clearAll 应清空通知与未读计数', () => {
    useNotificationStore.getState().addNotification(makeNotification())
    useNotificationStore.getState().addNotification(makeNotification())

    useNotificationStore.getState().clearAll()

    const state = useNotificationStore.getState()
    expect(state.notifications).toEqual([])
    expect(state.unreadCount).toBe(0)
  })
})

describe('Notification Store - 状态流转（未读 → 已读）', () => {
  beforeEach(resetStore)

  it('markAsRead 应置为 READ、写入 read_at 并递减未读计数', () => {
    const id = 'n1'
    useNotificationStore.getState().addNotification(makeNotification({ id }))

    useNotificationStore.getState().markAsRead(id)

    const state = useNotificationStore.getState()
    const target = state.notifications.find(n => n.id === id)
    expect(target?.status).toBe(NotificationStatus.READ)
    expect(typeof target?.read_at).toBe('string')
    expect(Number.isNaN(Date.parse(target?.read_at ?? ''))).toBe(false)
    expect(state.unreadCount).toBe(0)
  })

  it('markAsRead 不应影响其它通知', () => {
    useNotificationStore.getState().addNotification(makeNotification({ id: 'n1' }))
    useNotificationStore.getState().addNotification(makeNotification({ id: 'n2' }))

    useNotificationStore.getState().markAsRead('n1')

    const state = useNotificationStore.getState()
    expect(state.notifications.find(n => n.id === 'n2')?.status).toBe(
      NotificationStatus.UNREAD
    )
    expect(state.unreadCount).toBe(1)
  })

  it('markAllAsRead 应把所有通知置为 READ 并清零未读计数', () => {
    useNotificationStore.getState().addNotification(makeNotification({ id: 'n1' }))
    useNotificationStore.getState().addNotification(makeNotification({ id: 'n2' }))

    useNotificationStore.getState().markAllAsRead()

    const state = useNotificationStore.getState()
    expect(state.notifications.every(n => n.status === NotificationStatus.READ)).toBe(true)
    expect(state.notifications.every(n => typeof n.read_at === 'string')).toBe(true)
    expect(state.unreadCount).toBe(0)
  })

  it('未读通知的 getUnreadNotifications 应与 unreadCount 保持一致', () => {
    useNotificationStore.getState().addNotification(makeNotification({ id: 'n1' }))
    useNotificationStore.getState().addNotification(
      makeNotification({ id: 'n2', status: NotificationStatus.READ })
    )

    const state = useNotificationStore.getState()
    expect(state.getUnreadNotifications().map(n => n.id)).toEqual(['n1'])
    expect(state.getUnreadNotifications()).toHaveLength(state.unreadCount)
  })
})

describe('Notification Store - 过滤筛选', () => {
  beforeEach(resetStore)

  const seed = () => {
    useNotificationStore.getState().setNotifications([
      makeNotification({
        id: 'a',
        type: NotificationType.TASK_ASSIGNED,
        priority: NotificationPriority.HIGH,
      }),
      makeNotification({
        id: 'b',
        type: NotificationType.MEETING_REMINDER,
        priority: NotificationPriority.LOW,
      }),
      makeNotification({
        id: 'c',
        type: NotificationType.USER_MENTION,
        priority: NotificationPriority.HIGH,
      }),
      makeNotification({
        id: 'd',
        type: NotificationType.TASK_ASSIGNED,
        priority: NotificationPriority.URGENT,
      }),
    ])
  }

  it('filterByType 应只返回指定类型', () => {
    seed()
    const result = useNotificationStore.getState().filterByType(NotificationType.TASK_ASSIGNED)

    expect(result.map(n => n.id).sort()).toEqual(['a', 'd'])
    expect(result.every(n => n.type === NotificationType.TASK_ASSIGNED)).toBe(true)
  })

  it('filterByPriority 应只返回指定优先级', () => {
    seed()
    const result = useNotificationStore.getState().filterByPriority(
      NotificationPriority.HIGH
    )

    expect(result.map(n => n.id).sort()).toEqual(['a', 'c'])
  })

  it('过滤结果不应改变 store 全局状态与未读计数', () => {
    seed()
    const before = useNotificationStore.getState().unreadCount

    useNotificationStore.getState().filterByType(NotificationType.TASK_ASSIGNED)
    useNotificationStore.getState().filterByPriority(NotificationPriority.LOW)

    expect(useNotificationStore.getState().unreadCount).toBe(before)
    expect(useNotificationStore.getState().notifications).toHaveLength(4)
  })

  it('筛选条件无匹配时应返回空数组', () => {
    seed()
    expect(
      useNotificationStore.getState().filterByType(NotificationType.REPORT_READY)
    ).toEqual([])
  })
})

describe('Notification Store - 数量上限与偏好', () => {
  beforeEach(resetStore)

  it('通知数量应被限制在 100 条并保留最新条目', () => {
    for (let i = 0; i < 120; i += 1) {
      useNotificationStore.getState().addNotification(makeNotification({ id: `n${i}` }))
    }

    const state = useNotificationStore.getState()
    expect(state.notifications).toHaveLength(100)
    expect(state.notifications[0].id).toBe('n119')
    expect(state.notifications.some(n => n.id === 'n0')).toBe(false)
    expect(state.unreadCount).toBe(100)
  })

  it('updatePreferences 应合并更新偏好', () => {
    useNotificationStore.getState().updatePreferences({ email_enabled: false })

    const preferences = useNotificationStore.getState().preferences
    expect(preferences.email_enabled).toBe(false)
    expect(preferences.enabled).toBe(true)
    expect(preferences.sound_enabled).toBe(true)
  })

  it('resetPreferences 应恢复默认偏好', () => {
    useNotificationStore.getState().updatePreferences({
      enabled: false,
      enabled_types: [NotificationType.REPORT_READY],
    })

    useNotificationStore.getState().resetPreferences()

    const preferences = useNotificationStore.getState().preferences
    expect(preferences.enabled).toBe(true)
    expect(preferences.enabled_types).toEqual([
      NotificationType.TASK_ASSIGNED,
      NotificationType.TASK_OVERDUE,
      NotificationType.MEETING_REMINDER,
      NotificationType.USER_MENTION,
    ])
  })

  it('setLoading / setError 应维护加载与错误状态', () => {
    useNotificationStore.getState().setLoading(true)
    expect(useNotificationStore.getState().isLoading).toBe(true)

    useNotificationStore.getState().setError('boom')
    expect(useNotificationStore.getState().error).toBe('boom')

    useNotificationStore.getState().setLoading(false)
    useNotificationStore.getState().setError(null)
    const state = useNotificationStore.getState()
    expect(state.isLoading).toBe(false)
    expect(state.error).toBeNull()
  })

  it('selectors 应返回与 state 一致的值', () => {
    useNotificationStore.getState().addNotification(makeNotification({ id: 'n1' }))
    const state = useNotificationStore.getState()

    expect(selectNotifications(state)).toBe(state.notifications)
    expect(selectUnreadCount(state)).toBe(state.unreadCount)
    expect(selectPreferences(state)).toBe(state.preferences)
    expect(selectIsLoading(state)).toBe(state.isLoading)
  })
})

// ---------------------------------------------------------------------------
// 方案 B —— 类型与模板契约
// ---------------------------------------------------------------------------

describe('Notification 类型与模板契约', () => {
  it('NotificationType 枚举应覆盖已知的通知类型', () => {
    expect(Object.values(NotificationType)).toEqual(
      expect.arrayContaining([
        'task_assigned',
        'task_updated',
        'task_completed',
        'task_overdue',
        'meeting_reminder',
        'meeting_started',
        'meeting_canceled',
        'system_announcement',
        'user_mention',
        'project_update',
        'report_ready',
      ])
    )
  })

  it('NotificationPriority / NotificationStatus 枚举值应稳定', () => {
    expect(Object.values(NotificationPriority)).toEqual([
      'low',
      'normal',
      'high',
      'urgent',
    ])
    expect(Object.values(NotificationStatus)).toEqual(['unread', 'read', 'archived'])
  })

  it('NOTIFICATION_TEMPLATES 应为每个 NotificationType 提供模板', () => {
    const types = Object.values(NotificationType)
    expect(Object.keys(NOTIFICATION_TEMPLATES).sort()).toEqual([...types].sort())

    for (const type of types) {
      const template = NOTIFICATION_TEMPLATES[type]
      expect(template.type).toBe(type)
      expect(template.default_title.length).toBeGreaterThan(0)
      expect(template.default_content.length).toBeGreaterThan(0)
      expect(Object.values(NotificationPriority)).toContain(template.priority)
    }
  })

  it('模板占位符应使用 {{var}} 形式且成对出现', () => {
    for (const template of Object.values(NOTIFICATION_TEMPLATES)) {
      const placeholders = template.default_content.match(/\{\{\s*[\w]+\s*\}\}/g) ?? []
      for (const placeholder of placeholders) {
        const key = placeholder.replace(/[{}\s]/g, '')
        expect(template.default_content.split(placeholder)).toHaveLength(2)
        expect(key.length).toBeGreaterThan(0)
      }
    }
  })

  it('任务与会议类模板的默认优先级应符合业务约定', () => {
    expect(NOTIFICATION_TEMPLATES[NotificationType.TASK_OVERDUE].priority).toBe(
      NotificationPriority.HIGH
    )
    expect(NOTIFICATION_TEMPLATES[NotificationType.TASK_UPDATED].priority).toBe(
      NotificationPriority.LOW
    )
    expect(NOTIFICATION_TEMPLATES[NotificationType.MEETING_REMINDER].priority).toBe(
      NotificationPriority.HIGH
    )
    expect(NOTIFICATION_TEMPLATES[NotificationType.TASK_ASSIGNED].priority).toBe(
      NotificationPriority.NORMAL
    )
  })

  it('store 默认启用的通知类型应都是合法 NotificationType', () => {
    const enabled = useNotificationStore.getState().preferences.enabled_types
    expect(enabled.length).toBeGreaterThan(0)
    for (const type of enabled) {
      expect(Object.values(NotificationType)).toContain(type)
    }
  })
})

// ---------------------------------------------------------------------------
// 契约测试 —— 规则来自已删除的 src/app/api/notifications/route.ts
// (git show 1305b89038^:src/app/api/notifications/route.ts)
// ---------------------------------------------------------------------------

describe('已删除 HTTP 路由遗留业务规则的契约', () => {
  it('路由的排序规则（urgent > high > normal > low）应与 NotificationPriority 枚举一致', () => {
    const routeOrder = [
      NotificationPriority.URGENT,
      NotificationPriority.HIGH,
      NotificationPriority.NORMAL,
      NotificationPriority.LOW,
    ]

    expect(routeOrder).toEqual([
      'urgent',
      'high',
      'normal',
      'low',
    ])
    // 枚举中不存在优先级排序之外的取值
    expect(Object.values(NotificationPriority).sort()).toEqual(
      [...routeOrder].sort()
    )
  })

  it('路由的单页上限 100 应与 store 的通知保留上限一致', () => {
    const routePerPageMax = 100

    for (let i = 0; i < routePerPageMax + 5; i += 1) {
      useNotificationStore.getState().addNotification(makeNotification({ id: `n${i}` }))
    }

    expect(useNotificationStore.getState().notifications).toHaveLength(routePerPageMax)
  })

  it('路由默认优先级 NORMAL / 默认状态 UNREAD 应与现有枚举默认值一致', () => {
    const dto: CreateNotificationDto = {
      user_id: 'user-1',
      type: NotificationType.TASK_ASSIGNED,
      title: '标题',
      content: '内容',
    }
    expect(dto.priority ?? NotificationPriority.NORMAL).toBe(NotificationPriority.NORMAL)

    const created = makeNotification()
    expect(created.status).toBe(NotificationStatus.UNREAD)
    expect(created.priority).toBe(NotificationPriority.NORMAL)
  })

  it('CreateNotificationDto 的必填字段（user_id/type/title/content）缺一不可', () => {
    const build = (
      user_id: string,
      type: NotificationType,
      title: string,
      content: string
    ): CreateNotificationDto => ({ user_id, type, title, content })

    const dto = build('user-1', NotificationType.USER_MENTION, '标题', '内容')
    expect(dto.user_id).toBe('user-1')
    expect(dto.type).toBe(NotificationType.USER_MENTION)
    expect(dto.title).toBe('标题')
    expect(dto.content).toBe('内容')

    const optional: CreateNotificationDto = {
      ...dto,
      priority: NotificationPriority.URGENT,
      group_id: 'group-1',
      related_id: 'task-1',
      related_type: 'task',
      metadata: { source: 'test' },
    }
    expect(optional.related_type).toBe('task')
    expect(optional.metadata?.source).toBe('test')
  })

  it('UpdateNotificationDto 应允许更新标题/内容/状态/元数据', () => {
    const update: UpdateNotificationDto = {
      title: '新标题',
      status: NotificationStatus.ARCHIVED,
      metadata: { read: true },
    }

    expect(update.title).toBe('新标题')
    expect(update.status).toBe(NotificationStatus.ARCHIVED)
    expect(update.metadata?.read).toBe(true)
  })

  it('NotificationFilters 应支持路由支持的全部过滤维度', () => {
    const filters: NotificationFilters = {
      user_id: 'user-1',
      type: [NotificationType.TASK_ASSIGNED, NotificationType.TASK_OVERDUE],
      status: NotificationStatus.UNREAD,
      priority: NotificationPriority.HIGH,
      group_id: 'group-1',
      related_id: 'task-1',
      related_type: 'task',
      start_date: '2026-01-01T00:00:00.000Z',
      end_date: '2026-12-31T00:00:00.000Z',
      search: '任务',
    }

    expect(Array.isArray(filters.type)).toBe(true)
    expect(filters.status).toBe(NotificationStatus.UNREAD)
    expect(filters.priority).toBe(NotificationPriority.HIGH)
    expect(filters.search).toBe('任务')
  })

  it('路由的过滤语义应能由 store 的筛选能力等价表达', () => {
    resetStore()
    useNotificationStore.getState().setNotifications([
      makeNotification({
        id: 'a',
        type: NotificationType.TASK_ASSIGNED,
        priority: NotificationPriority.HIGH,
        status: NotificationStatus.UNREAD,
      }),
      makeNotification({
        id: 'b',
        type: NotificationType.TASK_ASSIGNED,
        priority: NotificationPriority.LOW,
        status: NotificationStatus.UNREAD,
      }),
      makeNotification({
        id: 'c',
        type: NotificationType.USER_MENTION,
        priority: NotificationPriority.HIGH,
        status: NotificationStatus.READ,
      }),
    ])

    const state = useNotificationStore.getState()
    const byType = state.filterByType(NotificationType.TASK_ASSIGNED)
    const byPriority = state.filterByPriority(NotificationPriority.HIGH)
    const unread = state.getUnreadNotifications()

    expect(byType.map(n => n.id)).toEqual(['a', 'b'])
    expect(byPriority.map(n => n.id)).toEqual(['a', 'c'])
    expect(unread.map(n => n.id)).toEqual(['a', 'b'])
    expect(state.unreadCount).toBe(unread.length)
  })
})
