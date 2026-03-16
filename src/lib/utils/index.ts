/**
 * @fileoverview 工具函数统一入口
 * @module lib/utils
 * 
 * @description
 * 整合所有工具函数的统一导出入口。
 * 包括缓存、函数组合、日期时间、格式化等通用工具。
 */

// ============================================
// 核心工具函数
// ============================================

export {
  // 缓存
  createCache,
  
  // 函数组合
  debounce,
  throttle,
  memoize,
  
  // 格式化
  formatFileSize,
  formatTimeAgo,
  optimizeImageUrl,
  
  // 性能优化
  preloadResources,
  lazyLoadComponent,
  
  // 用户偏好检测
  prefersReducedMotion,
  prefersDarkMode,
} from '../utils';

// ============================================
// 仪表板适配器
// ============================================

export {
  // 类型导出
  type DashboardProject,
  type DashboardActivity,
  
  // 转换函数
  taskToDashboardProject,
  taskToDashboardActivity,
  getDashboardProjectsFromTasks,
  getDashboardActivitiesFromTasks,
  
  // 计算函数
  calculateOverallProgress,
} from './dashboard-task-adapter';

// ============================================
// 日期时间工具（从 datetime.ts 重新导出）
// ============================================

export {
  // 常量
  MS_PER_DAY,
  MS_PER_HOUR,
  MS_PER_MINUTE,
  
  // 解析
  parseDate,
  
  // 格式化
  formatDate,
  formatDateTime,
  formatTime,
  formatFullDateTime,
  formatShortDate,
  getFriendlyDateTime,
  
  // 判断
  isToday,
  isYesterday,
  isThisWeek,
  
  // 计算
  getDateDiff,
  
  // 当前时间
  now,
  nowMs,
  
  // 创建日期
  createDate,
} from '../datetime';

// 导出日期时间选项类型
export type { DateTimeOptions } from '../datetime';

// ============================================
// 字符串处理工具
// ============================================

export {
  // 类型守卫
  isString,
  isStringLike,
  
  // 搜索匹配
  matchesSearchIgnoreCase,
  matchesAnyField,
  prepareSearchTerm,
  
  // 字符串清理
  safeTrim,
  isEmptyString,
  isNotEmptyString,
  
  // 大小写转换
  safeLowerCase,
  safeUpperCase,
  
  // 截断和格式化
  truncate,
  capitalize,
} from './string';

// ============================================
// 数组处理工具
// ============================================

export {
  // 类型守卫
  isArray,
  isArrayLike,
  
  // 空数组检查
  isEmptyArray,
  isNotEmptyArray,
  safeLength,
  
  // 数组去重
  unique,
  uniqueBy,
  
  // 数组分组
  groupBy,
  chunk,
  
  // 数组排序
  sortBy,
} from './array';

// ============================================
// 类型重导出
// ============================================

// 重新导出常用类型，方便使用
export type { Task, TaskType, TaskPriority, TaskStatus, TaskComment, StatusChange, AITeamMember, AssignmentSuggestion } from '../types/task-types';
export { AI_MEMBER_ROLES } from '../types/task-types';