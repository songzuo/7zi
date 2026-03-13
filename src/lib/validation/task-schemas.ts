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
