/**
 * Zod Validation Schemas
 *
 * 使用 Zod 定义的输入验证模式，防止注入攻击
 *
 * 注意：此文件中的安全清理函数（sanitizeSqlString, sanitizeNoSqlString 等）
 * 专门用于防止注入攻击，比 validation.ts 中的 sanitizeHtmlBasic 更全面。
 */

import { z } from 'zod';
import { PATTERNS } from './validation';

// ============================================================================
// Core String Validations (使用共享的正则模式)
// ============================================================================

/**
 * 通用字符串验证
 */
export const nonEmptyString = z.string().min(1, '不能为空');
export const trimmedString = z.string().trim();
export const emailString = z.string().email('邮箱格式无效');

/**
 * ID 验证
 */
export const uuidSchema = z.string().uuid('无效的 UUID 格式');
export const idSchema = z.union([uuidSchema, z.string().min(1, 'ID 不能为空')]);

/**
 * 用户名验证（使用共享模式）
 */
export const usernameSchema = z
  .string()
  .min(3, '用户名至少 3 个字符')
  .max(20, '用户名最多 20 个字符')
  .regex(PATTERNS.username, '用户名只能包含字母、数字和下划线');

/**
 * 密码验证
 */
export const passwordSchema = z
  .string()
  .min(8, '密码至少 8 个字符')
  .regex(/[a-zA-Z]/, '密码必须包含字母')
  .regex(/[0-9]/, '密码必须包含数字');

/**
 * 强密码验证（包含特殊字符）
 */
export const strongPasswordSchema = passwordSchema.regex(
  /[!@#$%^&*(),.?":{}|<>]/,
  '强密码必须包含特殊字符'
);

/**
 * 手机号验证（中国大陆，使用共享模式）
 */
export const phoneNumberSchema = z
  .string()
  .regex(PATTERNS.phoneCN, '手机号格式无效');

/**
 * URL 验证
 */
export const urlSchema = z.string().url('URL 格式无效');

/**
 * IP 地址验证（IPv4，使用共享模式）
 */
export const ipv4Schema = z
  .string()
  .regex(PATTERNS.ipv4, 'IPv4 地址格式无效');

/**
 * 分页参数验证
 */
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  offset: z.coerce.number().int().nonnegative().optional(),
});

/**
 * 排序参数验证
 */
export const sortSchema = z.object({
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

/**
 * 日期范围验证
 */
export const dateRangeSchema = z.object({
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
}).refine(
  (data) => {
    if (data.startDate && data.endDate) {
      return data.startDate <= data.endDate;
    }
    return true;
  },
  {
    message: '开始日期不能晚于结束日期',
  }
);

/**
 * 用户注册验证
 */
export const registerSchema = z.object({
  username: usernameSchema,
  email: emailString,
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine(
  (data) => data.password === data.confirmPassword,
  {
    message: '两次输入的密码不一致',
    path: ['confirmPassword'],
  }
);

/**
 * 用户登录验证
 */
export const loginSchema = z.object({
  username: z.union([usernameSchema, emailString]),
  password: z.string().min(6, '密码至少 6 个字符'),
});

/**
 * 密码重置请求验证
 */
export const passwordResetRequestSchema = z.object({
  email: emailString,
});

/**
 * 密码重置验证
 */
export const passwordResetSchema = z.object({
  token: nonEmptyString,
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine(
  (data) => data.password === data.confirmPassword,
  {
    message: '两次输入的密码不一致',
    path: ['confirmPassword'],
  }
);

/**
 * 修改密码验证
 */
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(6, '当前密码至少 6 个字符'),
  newPassword: passwordSchema,
  confirmPassword: z.string(),
}).refine(
  (data) => data.newPassword === data.confirmPassword,
  {
    message: '两次输入的密码不一致',
    path: ['confirmPassword'],
  }
);

/**
 * 用户更新验证
 */
export const updateUserSchema = z.object({
  username: usernameSchema.optional(),
  email: emailString.optional(),
  avatar: urlSchema.optional(),
});

/**
 * 项目创建验证
 */
export const createProjectSchema = z.object({
  name: nonEmptyString.max(100, '项目名称最多 100 个字符'),
  description: z.string().max(500, '描述最多 500 个字符').optional(),
  status: z.enum(['active', 'archived', 'deleted']).default('active'),
});

/**
 * 项目更新验证
 */
export const updateProjectSchema = z.object({
  name: z.string().max(100).optional(),
  description: z.string().max(500).optional(),
  status: z.enum(['active', 'archived', 'deleted']).optional(),
});

/**
 * 通知创建验证
 */
export const createNotificationSchema = z.object({
  userId: uuidSchema,
  type: z.enum(['info', 'warning', 'error', 'success']),
  title: nonEmptyString.max(100),
  message: z.string().max(500),
  data: z.record(z.string(), z.unknown()).optional(),
});

/**
 * 搜索参数验证
 */
export const searchSchema = z.object({
  query: trimmedString.min(1, '搜索关键词不能为空'),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(10),
});

/**
 * 防止 SQL 注入：清理字符串中的危险字符
 */
export function sanitizeSqlString(input: string): string {
  // 移除或转义 SQL 注入相关的字符
  return input
    .replace(/['";\\]/g, '') // 移除单引号、双引号、分号、反斜杠
    .replace(/--/g, '') // 移除 SQL 注释
    .replace(/\/\*/g, '') // 移除多行注释开始
    .replace(/\*\//g, '') // 移除多行注释结束
    .trim();
}

/**
 * 防止 NoSQL 注入：清理字符串中的危险字符
 */
export function sanitizeNoSqlString(input: string): string {
  // 移除 NoSQL 注入相关的字符（如 $where, $ne, $gt 等 MongoDB 操作符）
  return input
    .replace(/\$\w+/g, '') // 移除所有 $ 开头的操作符
    .replace(/['";\\]/g, '') // 移除引号和反斜杠
    .trim();
}

/**
 * 防止 XSS：清理 HTML 内容
 */
export function sanitizeHtml(input: string): string {
  // 移除危险的 HTML 标签和属性
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // 移除 script 标签
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '') // 移除 iframe 标签
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '') // 移除 object 标签
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '') // 移除 embed 标签
    .replace(/javascript:/gi, '') // 移除 javascript: 协议
    .replace(/on\w+\s*=/gi, '') // 移除事件处理器
    .trim();
}

/**
 * 防止命令注入：清理命令字符串
 */
export function sanitizeCommandString(input: string): string {
  // 移除命令注入相关的字符
  return input
    .replace(/[;&|`$()]/g, '') // 移除 shell 特殊字符
    .replace(/\$\([^)]*\)/g, '') // 移除命令替换
    .replace(/`[^`]*`/g, '') // 移除反引号命令替换
    .replace(/\$\{[^}]*\}/g, '') // 移除花括号命令替换
    .trim();
}

/**
 * 通用清理函数：根据类型清理输入
 */
export function sanitizeInput(input: unknown, type: 'sql' | 'nosql' | 'html' | 'command' | 'general'): unknown {
  if (typeof input !== 'string') {
    return input;
  }

  switch (type) {
    case 'sql':
      return sanitizeSqlString(input);
    case 'nosql':
      return sanitizeNoSqlString(input);
    case 'html':
      return sanitizeHtml(input);
    case 'command':
      return sanitizeCommandString(input);
    case 'general':
    default:
      return input.trim();
  }
}

/**
 * 批量清理对象的所有字符串字段
 */
export function sanitizeObject<T extends Record<string, unknown>>(
  obj: T,
  type: 'sql' | 'nosql' | 'html' | 'command' | 'general' = 'general'
): T {
  const result = { ...obj };

  for (const key in result) {
    if (result[key] !== null && typeof result[key] === 'string') {
      result[key] = sanitizeInput(result[key], type) as T[Extract<keyof T, string>];
    }
  }

  return result;
}

/**
 * 验证并清理请求体
 */
export async function validateAndSanitizeBody<T extends Record<string, unknown>>(
  body: unknown,
  schema: z.ZodSchema<T>,
  sanitizeType: 'sql' | 'nosql' | 'html' | 'command' | 'general' = 'general'
): Promise<{ success: true; data: T } | { success: false; errors: z.ZodIssue[] }> {
  // 先清理输入
  const sanitizedBody = typeof body === 'object' && body !== null
    ? sanitizeObject(body as Record<string, unknown>, sanitizeType)
    : body;

  // 验证输入
  const result = schema.safeParse(sanitizedBody);

  if (result.success) {
    return { success: true, data: result.data };
  }

  return { success: false, errors: result.error.issues };
}

/**
 * 创建验证错误响应
 */
export function createValidationErrorResponse(error: z.ZodIssue[] | z.ZodError): Response {
  const issues = Array.isArray(error) ? error : error.issues;
  const errors = issues.map((err) => ({
    field: err.path.join('.'),
    message: err.message,
  }));

  return new Response(
    JSON.stringify({
      success: false,
      error: 'Validation Error',
      errors,
    }),
    {
      status: 400,
      statusText: 'Bad Request',
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
}
