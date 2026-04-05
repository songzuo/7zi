/**
 * Notification Center Component - 通知中心组件
 *
 * 展示通知列表、分组、未读数量等
 *
 * @package 7zi-frontend
 * @version v1.12.2
 */

'use client'

import { useState } from 'react'
import { useNotificationCenter } from './use-notifications'
import type { NotificationType, NotificationPriority } from './notification-types'

/**
 * 通知类型图标映射
 */
const TYPE_ICONS: Record<NotificationType, string> = {
  info: 'ℹ️',
  success: '✅',
  warning: '⚠️',
  error: '❌',
  task_assigned: '📋',
  task_completed: '✨',
  task_updated: '🔄',
  message: '💬',
  system: '⚙️',
}

/**
 * 优先级颜色映射
 */
const PRIORITY_COLORS: Record<NotificationPriority, string> = {
  low: 'text-gray-500',
  medium: 'text-blue-500',
  high: 'text-orange-500',
  urgent: 'text-red-500',
}

/**
 * 通知中心组件
 */
export function NotificationCenter({ userId }: { userId?: string }) {
  const {
    notifications,
    groups,
    unreadCount,
    stats,
    preferences,
    loading,
    error,
    quietHoursActive,
    refresh,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteNotifications,
    cleanupExpired,
    savePreferences,
  } = useNotificationCenter(userId)

  const [view, setView] = useState<'list' | 'groups'>('list')
  const [filterType, setFilterType] = useState<NotificationType | 'all'>('all')
  const [filterRead, setFilterRead] = useState<boolean | 'all'>('all')

  // 过滤通知
  const filteredNotifications = notifications.filter(n => {
    if (filterType !== 'all' && n.type !== filterType) return false
    if (filterRead !== 'all' && n.read !== filterRead) return false
    return true
  })

  // 过滤分组
  const filteredGroups = groups.filter(g => {
    if (filterType !== 'all' && g.type !== filterType) return false
    return true
  })

  return (
    <div className="notification-center">
      {/* 头部 */}
      <div className="notification-header">
        <h2>通知中心</h2>
        <div className="notification-stats">
          <span className="unread-badge">
            {unreadCount} 条未读
          </span>
          {quietHoursActive && (
            <span className="quiet-hours-badge">
              🌙 免打扰中
            </span>
          )}
        </div>
      </div>

      {/* 工具栏 */}
      <div className="notification-toolbar">
        <div className="view-toggle">
          <button
            className={view === 'list' ? 'active' : ''}
            onClick={() => setView('list')}
          >
            列表视图
          </button>
          <button
            className={view === 'groups' ? 'active' : ''}
            onClick={() => setView('groups')}
          >
            分组视图
          </button>
        </div>

        <div className="filters">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as NotificationType | 'all')}
          >
            <option value="all">全部类型</option>
            <option value="info">信息</option>
            <option value="success">成功</option>
            <option value="warning">警告</option>
            <option value="error">错误</option>
            <option value="task_assigned">任务分配</option>
            <option value="task_completed">任务完成</option>
            <option value="task_updated">任务更新</option>
            <option value="message">消息</option>
            <option value="system">系统</option>
          </select>

          <select
            value={filterRead}
            onChange={(e) => setFilterRead(e.target.value as boolean | 'all')}
          >
            <option value="all">全部状态</option>
            <option value={false}>未读</option>
            <option value={true}>已读</option>
          </select>
        </div>

        <div className="actions">
          <button onClick={refresh} disabled={loading}>
            🔄 刷新
          </button>
          <button onClick={() => markAllAsRead(userId)} disabled={unreadCount === 0}>
            ✅ 全部已读
          </button>
          <button onClick={cleanupExpired}>
            🧹 清理过期
          </button>
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="notification-error">
          {error.message}
        </div>
      )}

      {/* 加载状态 */}
      {loading && (
        <div className="notification-loading">
          加载中...
        </div>
      )}

      {/* 通知列表 */}
      {view === 'list' && !loading && (
        <div className="notification-list">
          {filteredNotifications.length === 0 ? (
            <div className="empty-state">
              暂无通知
            </div>
          ) : (
            filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`notification-item ${notification.read ? 'read' : 'unread'}`}
              >
                <div className="notification-icon">
                  {TYPE_ICONS[notification.type]}
                </div>
                <div className="notification-content">
                  <div className="notification-header">
                    <h3 className="notification-title">
                      {notification.title}
                    </h3>
                    <span className={`notification-priority ${PRIORITY_COLORS[notification.priority]}`}>
                      {notification.priority}
                    </span>
                  </div>
                  <p className="notification-message">
                    {notification.message}
                  </p>
                  <div className="notification-meta">
                    <span className="notification-time">
                      {new Date(notification.createdAt).toLocaleString()}
                    </span>
                    {notification.taskId && (
                      <span className="notification-task">
                        任务: {notification.taskId}
                      </span>
                    )}
                  </div>
                </div>
                <div className="notification-actions">
                  {!notification.read && (
                    <button
                      onClick={() => markAsRead(notification.id)}
                      title="标记为已读"
                    >
                      ✅
                    </button>
                  )}
                  <button
                    onClick={() => deleteNotification(notification.id)}
                    title="删除"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* 通知分组 */}
      {view === 'groups' && !loading && (
        <div className="notification-groups">
          {filteredGroups.length === 0 ? (
            <div className="empty-state">
              暂无分组
            </div>
          ) : (
            filteredGroups.map((group) => (
              <div
                key={group.id}
                className={`notification-group ${group.count > 1 ? 'grouped' : ''}`}
              >
                <div className="group-header">
                  <div className="group-icon">
                    {TYPE_ICONS[group.type]}
                  </div>
                  <div className="group-content">
                    <h3 className="group-title">
                      {group.title}
                      {group.count > 1 && (
                        <span className="group-count">
                          ({group.count})
                        </span>
                      )}
                    </h3>
                    <p className="group-message">
                      {group.message}
                    </p>
                  </div>
                  <span className={`group-priority ${PRIORITY_COLORS[group.priority]}`}>
                    {group.priority}
                  </span>
                </div>

                {group.count > 1 && (
                  <div className="group-notifications">
                    {group.notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`group-notification-item ${notification.read ? 'read' : 'unread'}`}
                      >
                        <div className="notification-icon">
                          {TYPE_ICONS[notification.type]}
                        </div>
                        <div className="notification-content">
                          <p className="notification-message">
                            {notification.message}
                          </p>
                          <span className="notification-time">
                            {new Date(notification.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <div className="notification-actions">
                          {!notification.read && (
                            <button
                              onClick={() => markAsRead(notification.id)}
                              title="标记为已读"
                            >
                              ✅
                            </button>
                          )}
                          <button
                            onClick={() => deleteNotification(notification.id)}
                            title="删除"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* 统计信息 */}
      {stats && (
        <div className="notification-stats-panel">
          <h3>统计信息</h3>
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-label">总通知数</span>
              <span className="stat-value">{stats.total}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">未读数</span>
              <span className="stat-value">{stats.unread}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">分组数</span>
              <span className="stat-value">{stats.totalGroups}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">活跃分组</span>
              <span className="stat-value">{stats.activeGroups}</span>
            </div>
          </div>

          <div className="stats-by-type">
            <h4>按类型</h4>
            {Object.entries(stats.byType).map(([type, count]) => (
              <div key={type} className="stat-row">
                <span>{TYPE_ICONS[type as NotificationType]} {type}</span>
                <span>{count}</span>
              </div>
            ))}
          </div>

          <div className="stats-by-priority">
            <h4>按优先级</h4>
            {Object.entries(stats.byPriority).map(([priority, count]) => (
              <div key={priority} className="stat-row">
                <span className={PRIORITY_COLORS[priority as NotificationPriority]}>
                  {priority}
                </span>
                <span>{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 偏好设置 */}
      {preferences && userId && (
        <div className="notification-preferences">
          <h3>偏好设置</h3>
          <div className="preference-form">
            <label>
              <input
                type="checkbox"
                checked={preferences.emailEnabled}
                onChange={(e) =>
                  savePreferences({ emailEnabled: e.target.checked })
                }
              />
              启用邮件通知
            </label>

            <label>
              邮件阈值
              <select
                value={preferences.emailThreshold}
                onChange={(e) =>
                  savePreferences({
                    emailThreshold: e.target.value as NotificationPriority,
                  })
                }
              >
                <option value="low">低</option>
                <option value="medium">中</option>
                <option value="high">高</option>
                <option value="urgent">紧急</option>
              </select>
            </label>

            <label>
              <input
                type="checkbox"
                checked={preferences.pushEnabled}
                onChange={(e) =>
                  savePreferences({ pushEnabled: e.target.checked })
                }
              />
              启用推送通知
            </label>

            <label>
              推送阈值
              <select
                value={preferences.pushThreshold}
                onChange={(e) =>
                  savePreferences({
                    pushThreshold: e.target.value as NotificationPriority,
                  })
                }
              >
                <option value="low">低</option>
                <option value="medium">中</option>
                <option value="high">高</option>
                <option value="urgent">紧急</option>
              </select>
            </label>

            <label>
              免打扰开始时间
              <input
                type="time"
                value={preferences.quietHoursStart || ''}
                onChange={(e) =>
                  savePreferences({ quietHoursStart: e.target.value })
                }
              />
            </label>

            <label>
              免打扰结束时间
              <input
                type="time"
                value={preferences.quietHoursEnd || ''}
                onChange={(e) =>
                  savePreferences({ quietHoursEnd: e.target.value })
                }
              />
            </label>

            <label>
              时区
              <input
                type="text"
                value={preferences.timezone}
                onChange={(e) =>
                  savePreferences({ timezone: e.target.value })
                }
              />
            </label>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * 通知徽章组件（用于导航栏等）
 */
export function NotificationBadge({ userId }: { userId?: string }) {
  const { unreadCount, loading } = useUnreadCount(userId)

  return (
    <div className="notification-badge">
      <span className="badge-icon">🔔</span>
      {!loading && unreadCount > 0 && (
        <span className="badge-count">{unreadCount}</span>
      )}
    </div>
  )
}

/**
 * 通知弹窗组件
 */
export function NotificationPopup({ userId }: { userId?: string }) {
  const { notifications, unreadCount, markAsRead, deleteNotification } = useNotifications({
    userId,
    read: false,
    limit: 5,
  })

  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="notification-popup">
      <button
        className="popup-trigger"
        onClick={() => setIsOpen(!isOpen)}
      >
        🔔
        {unreadCount > 0 && (
          <span className="popup-badge">{unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div className="popup-content">
          <div className="popup-header">
            <h3>通知</h3>
            <button onClick={() => setIsOpen(false)}>✕</button>
          </div>

          <div className="popup-notifications">
            {notifications.length === 0 ? (
              <div className="empty-state">暂无新通知</div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className="popup-notification-item"
                >
                  <div className="notification-icon">
                    {TYPE_ICONS[notification.type]}
                  </div>
                  <div className="notification-content">
                    <h4>{notification.title}</h4>
                    <p>{notification.message}</p>
                    <span className="notification-time">
                      {new Date(notification.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="notification-actions">
                    <button
                      onClick={() => markAsRead(notification.id)}
                      title="标记为已读"
                    >
                      ✅
                    </button>
                    <button
                      onClick={() => deleteNotification(notification.id)}
                      title="删除"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="popup-footer">
            <button onClick={() => setIsOpen(false)}>查看全部</button>
          </div>
        </div>
      )}
    </div>
  )
}