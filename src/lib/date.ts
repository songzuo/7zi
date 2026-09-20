/**
 * @fileoverview 时间格式化工具
 * @description 统一的时间处理函数，避免在多个组件中重复定义
 */

/**
 * 获取今天的日期（使用系统时区保持一致）
 * @param daysOffset 天数偏移（0=今天，1=昨天）
 */
function getCachedDate(daysOffset: number): Date {
  // 使用 Date.now() 获取当前时间戳，配合 fake timers 工作
  const nowMs = Date.now()
  const now = new Date(nowMs)
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const targetDate = new Date(today)
  targetDate.setDate(targetDate.getDate() - daysOffset)
  return targetDate
}

/**
 * 格式化相对时间（几分钟前、几小时前等）
 * @param date - 日期字符串或 Date 对象
 * @returns 格式化后的相对时间字符串
 */
export function formatTimeAgo(date: Date | string, now?: Date): string {
  const nowDate = now || new Date()
  const then = new Date(date)
  const diffMs = nowDate.getTime() - then.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return '刚刚'
  if (diffMins < 120) return `${diffMins}分钟前` // Show minutes up to < 2 hours
  if (diffHours <= 24) return `${diffHours}小时前` // Show hours up to and including 24 hours
  if (diffDays <= 7) return `${diffDays}天前`

  return then.toLocaleDateString('zh-CN')
}

/**
 * 格式化日期为标准格式
 * @param date - 日期字符串或 Date 对象
 * @param options - 格式化选项
 */
export function formatDate(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
  const d = new Date(date)
  return d.toLocaleDateString('zh-CN', options)
}

/**
 * 格式化日期时间
 * @param date - 日期字符串或 Date 对象
 */
export function formatDateTime(date: Date | string): string {
  const d = new Date(date)
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * 检查日期是否是今天
 * @param date - 日期字符串或 Date 对象
 */
export function isToday(date: Date | string): boolean {
  const d = new Date(date)
  const today = getCachedDate(0)
  return d.toDateString() === today.toDateString()
}

/**
 * 检查日期是否是昨天
 * @param date - 日期字符串或 Date 对象
 */
export function isYesterday(date: Date | string): boolean {
  const d = new Date(date)
  const yesterday = getCachedDate(1)
  return d.toDateString() === yesterday.toDateString()
}
