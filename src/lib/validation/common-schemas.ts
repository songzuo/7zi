/**
 * @fileoverview Zod Schema 通用工具
 * @module lib/validation/common-schemas
 * 
 * @description
 * 提供常用的 Zod Schema 定义，避免重复代码。
 * 包括：字符串验证、枚举定义、分页参数等。
 */

import { z } from 'zod';

// ============================================
// 通用字符串 Schema
// ============================================

/**
 * 非空字符串 Schema
 * 
 * @description
 * 常用的非空字符串验证，自动 trim。
 * 
 * @param maxLength - 最大长度（默认 200）
 * @param message - 自定义错误消息
 * 
 * @example
 * ```typescript
 * const schema = z.object({
 *   title: nonEmptyString(100, '标题不能为空')
 * });
 * ```
 */
export function nonEmptyString(maxLength = 200, message?: string) {
  return z.string()
    .min(1, message ?? '不能为空')
    .max(maxLength, `不能超过${maxLength}个字符`)
    .trim();
}

/**
 * 可选字符串 Schema
 * 
 * @param maxLength - 最大长度
 * @param defaultValue - 默认值
 */
export function optionalString(maxLength = 200, defaultValue = '') {
  return z.string()
    .max(maxLength)
    .optional()
    .default(defaultValue);
}

/**
 * 描述文本 Schema（较长文本）
 */
export function descriptionText(maxLength = 5000) {
  return z.string()
    .max(maxLength, `描述不能超过${maxLength}个字符`)
    .optional()
    .default('');
}

/**
 * ID 字符串 Schema
 */
export function idString(maxLength = 100) {
  return z.string()
    .min(1, 'ID不能为空')
    .max(maxLength, `ID不能超过${maxLength}个字符`);
}

// ============================================
// 分页参数 Schema
// ============================================

/**
 * 分页参数基础 Schema
 */
export const paginationSchema = z.object({
  page: z.union([z.string().transform(Number), z.number()])
    .optional()
    .default(1)
    .pipe(z.number().min(1, '页码必须大于0')),
  limit: z.union([z.string().transform(Number), z.number()])
    .optional()
    .default(20)
    .pipe(z.number().min(1).max(100, '每页最多100条')),
});

/**
 * 排序参数 Schema
 * 
 * @param fields - 允许排序的字段列表
 */
export function sortSchema(fields: string[]) {
  return z.object({
    sortBy: z.enum(fields as [string, ...string[]])
      .optional()
      .default(fields[0]),
    sortOrder: z.enum(['asc', 'desc'])
      .optional()
      .default('desc'),
  });
}

// ============================================
// 通用枚举 Schema
// ============================================

/**
 * 优先级枚举
 */
export const prioritySchema = z.enum(['low', 'medium', 'high', 'urgent'], {
  message: '优先级必须是 low, medium, high 或 urgent'
});

/**
 * 状态枚举（通用）
 */
export const statusSchema = z.enum(['pending', 'active', 'completed', 'cancelled'], {
  message: '状态必须是 pending, active, completed 或 cancelled'
});

// ============================================
// 搜索参数 Schema
// ============================================

/**
 * 搜索关键词 Schema
 */
export const searchSchema = z.string()
  .max(200, '搜索关键词不能超过200个字符')
  .optional();

// ============================================
// 日期参数 Schema
// ============================================

/**
 * ISO 日期字符串 Schema
 */
export const isoDateSchema = z.string()
  .datetime({ message: '日期格式不正确' });

/**
 * 可选日期范围 Schema
 */
export const dateRangeSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

// ============================================
// 批量操作 Schema
// ============================================

/**
 * 批量 ID 列表 Schema
 * 
 * @param maxItems - 最大数量（默认 50）
 */
export function batchIdsSchema(maxItems = 50) {
  return z.array(idString())
    .min(1, 'ID列表不能为空')
    .max(maxItems, `一次最多操作${maxItems}条记录`);
}

// ============================================
// 组合 Schema 工厂
// ============================================

/**
 * 创建查询 Schema（分页 + 排序 + 搜索）
 * 
 * @param sortFields - 允许排序的字段
 */
export function createQuerySchema(sortFields: string[]) {
  return paginationSchema
    .merge(sortSchema(sortFields))
    .extend({
      search: searchSchema,
    });
}

/**
 * 创建带状态的查询 Schema
 * 
 * @param sortFields - 允许排序的字段
 * @param statusEnum - 状态枚举
 */
export function createStatusQuerySchema(
  sortFields: string[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  statusEnum: any
) {
  return createQuerySchema(sortFields).extend({
    status: statusEnum.optional(),
  });
}

// ============================================
// 默认导出
// ============================================

export default {
  // 字符串
  nonEmptyString,
  optionalString,
  descriptionText,
  idString,
  
  // 分页
  paginationSchema,
  sortSchema,
  
  // 枚举
  prioritySchema,
  statusSchema,
  
  // 搜索
  searchSchema,
  
  // 日期
  isoDateSchema,
  dateRangeSchema,
  
  // 批量操作
  batchIdsSchema,
  
  // 工厂
  createQuerySchema,
  createStatusQuerySchema,
};