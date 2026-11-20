import { useState, useEffect, useCallback, useRef } from 'react'
import { WebSocketManager, EventHandler } from '@/lib/websocket-manager'

/**
 * 远程光标数据结构
 */
export interface RemoteCursor {
  userId: string
  userName: string
  userColor: string
  position: { x: number; y: number }
  selection?: {
    start: { x: number; y: number }
    end: { x: number; y: number }
  }
  lastUpdate: number
}

/**
 * 预定义光标颜色（12种高对比度颜色）
 */
const CURSOR_COLORS = [
  '#EF4444', // Red-500
  '#F59E0B', // Amber-500
  '#10B981', // Emerald-500
  '#06B6D4', // Cyan-500
  '#3B82F6', // Blue-500
  '#8B5CF6', // Violet-500
  '#EC4899', // Pink-500
  '#F97316', // Orange-500
  '#84CC16', // Lime-500
  '#14B8A6', // Teal-500
  '#6366F1', // Indigo-500
  '#A855F7', // Purple-500
] as const

/**
 * 根据用户 ID 分配颜色
 * 使用哈希算法确保同一用户始终获得相同颜色
 */
function getUserColor(userId: string): string {
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash) + userId.charCodeAt(i)
    hash = hash & hash // 转换为 32 位整数
  }
  return CURSOR_COLORS[Math.abs(hash) % CURSOR_COLORS.length]
}

/**
 * 节流函数 - 限制函数调用频率
 * @param func 要节流的函数
 * @param limit 时间间隔（毫秒）
 */
function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean
  return function (this: unknown, ...args: Parameters<T>) {
    if (!inThrottle) {
      func.apply(this, args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}

/**
 * 性能配置常量
 */
const PERFORMANCE_CONFIG = {
  CURSOR_UPDATE_THROTTLE: 16, // 16ms = ~60fps
  CURSOR_BATCH_SIZE: 10, // 每帧最多处理 10 个光标更新
  CURSOR_EXPIRE_TIME: 30000, // 30 秒后清理过期光标
  CURSOR_CLEANUP_INTERVAL: 10000, // 每 10 秒清理一次
} as const

/**
 * useRemoteCursors Hook
 *
 * 管理远程用户光标状态，包括：
 * - 监听 WebSocket 光标更新事件
 * - 批量处理光标位置更新（性能优化）
 * - 自动清理过期光标
 * - 节流本地光标位置发送
 *
 * @param wsManager WebSocketManager 实例
 * @returns 光标状态和更新方法
 */
export function useRemoteCursors(wsManager: WebSocketManager) {
  const [cursors, setCursors] = useState<Record<string, RemoteCursor>>({})
  const cursorUpdateQueueRef = useRef<Map<string, RemoteCursor>>(new Map())
  const isProcessingRef = useRef(false)

  /**
   * 批量处理光标更新队列
   * 使用 requestAnimationFrame 确保在浏览器重绘前更新
   */
  const processBatch = useCallback(() => {
    if (isProcessingRef.current || cursorUpdateQueueRef.current.size === 0) {
      return
    }

    isProcessingRef.current = true

    // 使用 requestAnimationFrame 批量更新
    requestAnimationFrame(() => {
      const updates = Array.from(cursorUpdateQueueRef.current.values())
      cursorUpdateQueueRef.current.clear()

      setCursors(prev => {
        const next = { ...prev }
        updates.forEach(cursor => {
          next[cursor.userId] = cursor
        })
        return next
      })

      isProcessingRef.current = false
    })
  }, [])

  /**
   * 定期处理批处理队列
   * 即使没有 requestAnimationFrame 触发，也定期处理队列
   */
  useEffect(() => {
    const interval = setInterval(processBatch, PERFORMANCE_CONFIG.CURSOR_UPDATE_THROTTLE)
    return () => clearInterval(interval)
  }, [processBatch])

  /**
   * 监听 WebSocket 事件
   */
  useEffect(() => {
    if (wsManager.getState() !== 'disconnected') {
      return
    }

    /**
     * 处理光标更新事件
     * 将更新添加到批处理队列，而不是直接更新状态
     */
    const handleCursorUpdate = (data: {
      userId: string
      userName: string
      position: { x: number; y: number }
      selection?: {
        start: { x: number; y: number }
        end: { x: number; y: number }
      }
    }) => {
      // 添加到批处理队列
      cursorUpdateQueueRef.current.set(data.userId, {
        userId: data.userId,
        userName: data.userName,
        userColor: getUserColor(data.userId),
        position: data.position,
        selection: data.selection,
        lastUpdate: Date.now(),
      })

      // 触发批处理
      processBatch()
    }

    /**
     * 处理用户离开事件
     * 移除该用户的光标
     */
    const handleUserLeft = (userId: string) => {
      setCursors(prev => {
        const next = { ...prev }
        delete next[userId]
        return next
      })
    }

    /**
     * 处理光标离开事件
     * 用户离开编辑区域时触发
     */
    const handleCursorLeave = (userId: string) => {
      setCursors(prev => {
        const next = { ...prev }
        delete next[userId]
        return next
      })
    }

    // 注册事件监听器
    wsManager.on('collab:cursor-update', handleCursorUpdate as EventHandler)
    wsManager.on('collab:user-left', handleUserLeft as EventHandler)
    wsManager.on('collab:cursor-leave', handleCursorLeave as EventHandler)

    return () => {
      wsManager.off('collab:cursor-update', handleCursorUpdate as EventHandler)
      wsManager.off('collab:user-left', handleUserLeft as EventHandler)
      wsManager.off('collab:cursor-leave', handleCursorLeave as EventHandler)
    }
  }, [wsManager, processBatch])

  /**
   * 清理过期光标
   * 超过指定时间未更新的光标将被移除
   */
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now()
      setCursors(prev => {
        const next = { ...prev }
        let hasChanges = false

        Object.entries(prev).forEach(([userId, cursor]) => {
          if (now - cursor.lastUpdate > PERFORMANCE_CONFIG.CURSOR_EXPIRE_TIME) {
            delete next[userId]
            hasChanges = true
          }
        })

        return hasChanges ? next : prev
      })
    }, PERFORMANCE_CONFIG.CURSOR_CLEANUP_INTERVAL)

    return () => clearInterval(interval)
  }, [])

  /**
   * 更新本地光标位置（节流）
   * 发送光标位置到服务器，节流到 60fps
   */
  const updateLocalCursor = useCallback(
    throttle((x: number, y: number, selection?: RemoteCursor['selection']) => {
      if (wsManager.getState() !== 'disconnected') {
        return
      }

      wsManager.emit('collab:update-cursor', {
        position: { x, y },
        selection,
      })
    }, PERFORMANCE_CONFIG.CURSOR_UPDATE_THROTTLE),
    [wsManager]
  )

  /**
   * 发送光标离开事件
   * 当用户离开编辑区域时调用
   */
  const leaveCursor = useCallback(() => {
    if (wsManager.getState() !== 'disconnected') {
      return
    }

    wsManager.emit('collab:cursor-leave', {})
  }, [wsManager])

  return {
    /**
     * 所有远程光标列表
     */
    cursors: Object.values(cursors),

    /**
     * 更新本地光标位置（节流到 60fps）
     */
    updateLocalCursor,

    /**
     * 发送光标离开事件
     */
    leaveCursor,

    /**
     * 获取指定用户的光标
     */
    getCursor: useCallback((userId: string) => cursors[userId], [cursors]),
  }
}