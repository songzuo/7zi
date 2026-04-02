/**
 * WebSocket 实用函数
 */

/**
 * 生成唯一的消息 ID
 * 使用时间戳和随机字符串组合，确保唯一性
 */
export function generateMessageId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

/**
 * 创建标准 WebSocket 消息
 */
export function createWebSocketMessage<T = unknown>(
  type: string,
  payload?: T
): { type: string; id: string; timestamp: string; payload?: T } {
  return {
    type,
    id: generateMessageId(),
    timestamp: new Date().toISOString(),
    payload,
  }
}

/**
 * 检查消息是否匹配类型（类型守卫）
 */
export function isMessageType<T = unknown>(
  message: { type: string; id: string; timestamp: string; payload?: unknown },
  type: string
): message is { type: string; id: string; timestamp: string; payload: T } {
  return message.type === type
}

/**
 * 验证 WebSocket 消息格式
 */
export function isValidWebSocketMessage(data: unknown): data is {
  type: string
  id: string
  timestamp: string
  payload?: unknown
} {
  if (typeof data !== 'object' || data === null) {
    return false
  }

  const msg = data as Record<string, unknown>
  return (
    typeof msg.type === 'string' && typeof msg.id === 'string' && typeof msg.timestamp === 'string'
  )
}

/**
 * 解析 JSON 字符串为 WebSocket 消息
 */
export function parseWebSocketMessage(jsonString: string): {
  type: string
  id: string
  timestamp: string
  payload?: unknown
} | null {
  try {
    const parsed = JSON.parse(jsonString)
    if (isValidWebSocketMessage(parsed)) {
      return parsed
    }
    return null
  } catch (error) {
    return null
  }
}
