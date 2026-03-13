// @ts-nocheck
/**
 * 任务验证 Schema
 * 使用 Zod 进行请求验证
 */

import { z } from 'zod';

// 任务类型枚举
export const TaskTypeSchema = z.enum(['development', 'design', 'research', 'marketing', 'other'], {
  errorMap: () => ({ message: '任务类型必须是 development, design, research, marketing 或 other' })
});

// 任务优先级枚举
export const TaskPrioritySchema = z.enum(['low', 'medium', 'high', 'urgent'], {
  errorMap: () => ({ message: '优先级必须是 low, medium, high 或 urgent' })
});

// 任务状态枚举
export const TaskStatusSchema = z.enum(['pending', 'assigned', 'in_progress', 'completed'], {
  errorMap: () => ({ message: '状态必须是 pending, assigned, in_progress 或 completed' })
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
}).strict().refine(
  (data) => Object.keys(data).length > 0,
  { message: '至少需要提供一个更新字段' }
);

// 添加评论 Schema
export const addCommentSchema = z.object({
  content: z.string()
    .min(1, '评论内容不能为空')
    .max(2000, '评论内容不能超过2000个字符')
    .trim(),
}).strict();

// 任务查询参数 Schema
export const taskQuerySchema = z.object({
  status: TaskStatusSchema.optional(),
  type: TaskTypeSchema.optional(),
  priority: TaskPrioritySchema.optional(),
  assignee: z.string().max(100).optional(),
  createdBy: z.enum(['user', 'ai']).optional(),
  search: z.string().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['createdAt', 'updatedAt', 'priority', 'status']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
}).strict();

// 任务ID参数 Schema
export const taskIdSchema = z.object({
  id: z.string()
    .min(1, '任务ID不能为空')
    .max(100, '任务ID格式不正确'),
});

// 批量操作 Schema
export const batchUpdateSchema = z.object({
  taskIds: z.array(z.string().min(1).max(100))
    .min(1, '至少需要提供一个任务ID')
    .max(50, '一次最多更新50个任务'),
  updates: z.object({
    status: TaskStatusSchema.optional(),
    priority: TaskPrioritySchema.optional(),
    assignee: z.string().max(100).optional().nullable(),
  }).strict(),
}).strict().refine(
  (data) => Object.keys(data.updates).length > 0,
  { message: '至少需要提供一个更新字段' }
);

// 类型导出
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type AddCommentInput = z.infer<typeof addCommentSchema>;
export type TaskQueryInput = z.infer<typeof taskQuerySchema>;
export type TaskIdInput = z.infer<typeof taskIdSchema>;
export type BatchUpdateInput = z.infer<typeof batchUpdateSchema>;
