/**
 * @fileoverview 验证工具统一入口
 * @module lib/validation
 * 
 * @description
 * 整合所有验证相关的导出。
 */

// ============================================
// 任务验证 Schema
// ============================================

export {
  // 枚举
  TaskTypeSchema,
  TaskPrioritySchema,
  TaskStatusSchema,
  
  // Schema
  createTaskSchema,
  updateTaskSchema,
  addCommentSchema,
  taskQuerySchema,
  taskIdSchema,
  batchUpdateSchema,
} from './task-schemas';

// ============================================
// 通用 Schema 工具
// ============================================

export {
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
} from './common-schemas';

// ============================================
// 验证器
// ============================================

export {
  // 类型
  type ValidationResult,
  type ValidatorFn,
  type EmailValidatorOptions,
  type UrlValidatorOptions,
  type PhoneValidatorOptions,
  type DateValidatorOptions,
  
  // 验证函数
  emailValidator,
  urlValidator,
  phoneValidator,
  dateValidator,
  composeValidators,
  
  // 统一导出
  validators,
} from '../validators';