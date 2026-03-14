/**
 * 任务验证 Schema
 * 使用 Zod 进行请求验证
 */

import { z } from 'zod';

// 任务类型枚举 - Zod v4 语法
export const TaskTypeSchema = z.enum(['development', 'design', 'research', 'marketing', 'other'], {
  message: '任务类型必须是 development, design, research, marketing 或 other'
});

// 任务优先级枚举
export const TaskPrioritySchema = z.enum(['low', 'medium', 'high', 'urgent'], {
  message: '优先级必须是 low, medium, high 或 urgent'
});

// 任务状态枚举
export const TaskStatusSchema = z.enum(['pending', 'assigned', 'in_progress', 'completed'], {
  message: '状态必须是 pending, assigned, in_progress 或 completed'
});

// 基础任务字段
const baseTaskFields = {
  title: z.string()
    .min(1, '任务标题不能为空')
    .max(200, '任务标题不能超过200个字符')
    .trim(),
  description: z.string()
    .max(5000, '任务描述不能超过5000个字符')
    .optional()
    .default(''),
  type: TaskTypeSchema.optional().default('other'),
  priority: TaskPrioritySchema.optional().default('medium'),
  assignee: z.string()
    .max(100, '分配者ID不能超过100个字符')
    .optional()
    .nullable(),
};

// 创建任务 Schema
export const createTaskSchema = z.object({
  ...baseTaskFields,
  assignee: z.string()
    .max(100, '分配者ID不能超过100个字符')
    .optional()
    .nullable(),
}).strict();

// 更新任务 Schema
export const updateTaskSchema = z.object({
  title: z.string()
    .min(1, '任务标题不能为空')
    .max(200, '任务标题不能超过200个字符')
    .trim()
    .optional(),
  description: z.string()
    .max(5000, '任务描述不能超过5000个字符')
    .optional(),
  type: TaskTypeSchema.optional(),
  priority: TaskPrioritySchema.optional(),
  status: TaskStatusSchema.optional(),
  assignee: z.string()
    .max(100, '分配者ID不能超过100个字符')
    .optional()
    .nullable(),
}).strict().refine(data => Object.keys(data).length > 0, {
  message: '至少需要提供一个更新字段'
});

// 添加评论 Schema
export const addCommentSchema = z.object({
  content: z.string()
    .min(1, '评论内容不能为空')
    .max(2000, '评论内容不能超过2000个字符')
    .trim(),
}).strict();

// 任务查询 Schema
export const taskQuerySchema = z.object({
  page: z.union([z.string().transform(Number), z.number()])
    .optional()
    .default(1)
    .pipe(z.number().min(1)),
  limit: z.union([z.string().transform(Number), z.number()])
    .optional()
    .default(20)
    .pipe(z.number().min(1).max(100)),
  sortBy: z.enum(['createdAt', 'updatedAt', 'priority', 'status'])
    .optional()
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc'])
    .optional()
    .default('desc'),
  status: TaskStatusSchema.optional(),
  type: TaskTypeSchema.optional(),
  priority: TaskPrioritySchema.optional(),
  assignee: z.string()
    .max(100, '分配者ID不能超过100个字符')
    .optional(),
  createdBy: z.enum(['user', 'ai'])
    .optional(),
  search: z.string()
    .max(200, '搜索关键词不能超过200个字符')
    .optional(),
}).strict();

// 任务 ID Schema
export const taskIdSchema = z.object({
  id: z.string()
    .min(1, '任务ID不能为空')
    .max(100, '任务ID不能超过100个字符'),
}).strict();

// 批量更新 Schema
export const batchUpdateSchema = z.object({
  taskIds: z.array(z.string().min(1).max(100))
    .min(1, '任务ID列表不能为空')
    .max(50, '一次最多更新50个任务'),
  updates: z.object({
    status: TaskStatusSchema.optional(),
    priority: TaskPrioritySchema.optional(),
    assignee: z.string()
      .max(100, '分配者ID不能超过100个字符')
      .optional()
      .nullable(),
  }).strict().refine(data => Object.keys(data).length > 0, {
    message: '至少需要提供一个更新字段'
  }),
}).strict();
