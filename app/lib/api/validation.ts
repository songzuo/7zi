/**
 * API 请求验证工具
 * 支持类型检查、必填验证、格式验证
 */

import { NextRequest, NextResponse } from 'next/server';

// 验证规则类型
export type ValidatorType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'array'
  | 'object'
  | 'email'
  | 'url'
  | 'date'
  | 'uuid'
  | 'enum';

// 验证规则
export interface ValidationRule {
  type: ValidatorType | ValidatorType[];
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  enum?: (string | number)[];
  custom?: (value: unknown) => boolean | string;
  transform?: (value: unknown) => unknown;
  default?: unknown;
}

// 验证规则集
export type ValidationSchema = Record<string, ValidationRule>;

// 验证结果
export interface ValidationResult {
  success: boolean;
  data?: Record<string, unknown>;
  errors?: Record<string, string[]>;
}

// 类型验证器映射
const typeValidators: Record<string, (value: unknown) => boolean> = {
  string: (v) => typeof v === 'string',
  number: (v) => typeof v === 'number' && !isNaN(v),
  boolean: (v) => typeof v === 'boolean',
  array: (v) => Array.isArray(v),
  object: (v) => typeof v === 'object' && v !== null && !Array.isArray(v),
  email: (v) =>
    typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
  url: (v) => {
    if (typeof v !== 'string') return false;
    try {
      new URL(v);
      return true;
    } catch {
      return false;
    }
  },
  date: (v) => !isNaN(Date.parse(String(v))),
  uuid: (v) =>
    typeof v === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v),
};

/**
 * 验证单个字段
 */
function validateField(
  value: unknown,
  rule: ValidationRule,
  fieldName: string
): { valid: boolean; value: unknown; errors: string[] } {
  const errors: string[] = [];

  // 处理默认值
  if (value === undefined || value === null) {
    if (rule.default !== undefined) {
      return { valid: true, value: rule.default, errors: [] };
    }
    if (rule.required) {
      errors.push(`${fieldName} is required`);
      return { valid: false, value: undefined, errors };
    }
    return { valid: true, value: undefined, errors: [] };
  }

  // 类型验证
  const types = Array.isArray(rule.type) ? rule.type : [rule.type];
  let typeValid = false;

  for (const type of types) {
    if (typeValidators[type]?.(value)) {
      typeValid = true;
      break;
    }
  }

  if (!typeValid) {
    errors.push(`${fieldName} must be of type ${types.join(' or ')}`);
    return { valid: false, value, errors };
  }

  // 字符串验证
  if (typeof value === 'string') {
    if (rule.minLength !== undefined && value.length < rule.minLength) {
      errors.push(`${fieldName} must be at least ${rule.minLength} characters`);
    }
    if (rule.maxLength !== undefined && value.length > rule.maxLength) {
      errors.push(`${fieldName} must be at most ${rule.maxLength} characters`);
    }
    if (rule.pattern && !rule.pattern.test(value)) {
      errors.push(`${fieldName} has invalid format`);
    }
  }

  // 数字验证
  if (typeof value === 'number') {
    if (rule.min !== undefined && value < rule.min) {
      errors.push(`${fieldName} must be at least ${rule.min}`);
    }
    if (rule.max !== undefined && value > rule.max) {
      errors.push(`${fieldName} must be at most ${rule.max}`);
    }
  }

  // 枚举验证（仅在类型匹配 enum 时检查）
  if (rule.enum) {
    // 如果类型是 'enum' 或者没有类型检查，则验证枚举
    const shouldCheckEnum = types.includes('enum') || types.some(t => typeValidators[t]?.(value));
    if (shouldCheckEnum && !rule.enum.includes(value as string | number)) {
      errors.push(`${fieldName} must be one of: ${rule.enum.join(', ')}`);
    }
  }

  // 自定义验证
  if (rule.custom) {
    const customResult = rule.custom(value);
    if (customResult !== true) {
      errors.push(typeof customResult === 'string' ? customResult : `${fieldName} is invalid`);
    }
  }

  // 转换值
  let finalValue: unknown = value;
  if (rule.transform) {
    finalValue = rule.transform(value);
  }

  return { valid: errors.length === 0, value: finalValue, errors };
}

/**
 * 验证请求体
 */
export function validateBody(
  body: Record<string, unknown>,
  schema: ValidationSchema
): ValidationResult {
  const data: Record<string, unknown> = {};
  const errors: Record<string, string[]> = {};

  for (const [field, rule] of Object.entries(schema)) {
    const result = validateField(body[field], rule, field);
    if (!result.valid) {
      errors[field] = result.errors;
    }
    if (result.value !== undefined) {
      data[field] = result.value;
    }
  }

  return {
    success: Object.keys(errors).length === 0,
    data,
    errors: Object.keys(errors).length > 0 ? errors : undefined,
  };
}

/**
 * 验证查询参数
 */
export function validateQuery(
  searchParams: URLSearchParams,
  schema: ValidationSchema
): ValidationResult {
  const data: Record<string, unknown> = {};
  const errors: Record<string, string[]> = {};

  for (const [field, rule] of Object.entries(schema)) {
    const value = searchParams.get(field);
    
    // 处理数组类型
    let parsedValue: unknown = value;
    if (rule.type === 'array' && value) {
      parsedValue = value.split(',').filter(Boolean);
    } else if (rule.type === 'number' && value) {
      parsedValue = Number(value);
      if (isNaN(parsedValue as number)) {
        parsedValue = value;
      }
    } else if (rule.type === 'boolean' && value) {
      parsedValue = value === 'true' || value === '1';
    }

    const result = validateField(parsedValue, rule, field);
    if (!result.valid) {
      errors[field] = result.errors;
    }
    if (result.value !== undefined) {
      data[field] = result.value;
    }
  }

  return {
    success: Object.keys(errors).length === 0,
    data,
    errors: Object.keys(errors).length > 0 ? errors : undefined,
  };
}

/**
 * API 验证中间件
 */
export function withValidation(
  schema: ValidationSchema,
  source: 'body' | 'query' = 'body'
) {
  return function (
    handler: (
      request: NextRequest,
      validatedData: Record<string, unknown>
    ) => Promise<NextResponse>
  ) {
    return async function (request: NextRequest): Promise<NextResponse> {
      let result: ValidationResult;

      if (source === 'body') {
        try {
          const body = await request.json();
          result = validateBody(body, schema);
        } catch {
          return NextResponse.json(
            {
              success: false,
              error: {
                code: 'INVALID_JSON',
                message: 'Request body is not valid JSON',
              },
            },
            { status: 400 }
          );
        }
      } else {
        result = validateQuery(request.nextUrl.searchParams, schema);
      }

      if (!result.success) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Request validation failed',
              details: result.errors,
            },
          },
          { status: 400 }
        );
      }

      return handler(request, result.data!);
    };
  };
}

/**
 * 常用验证模式
 */
export const commonSchemas = {
  // 分页参数
  pagination: {
    page: {
      type: 'number',
      default: 1,
      min: 1,
      transform: (v: unknown) => Math.max(1, Number(v) || 1),
    },
    limit: {
      type: 'number',
      default: 20,
      min: 1,
      max: 100,
      transform: (v: unknown) => Math.min(100, Math.max(1, Number(v) || 20)),
    },
  },

  // 用户创建
  userCreate: {
    name: {
      type: 'string',
      required: true,
      minLength: 1,
      maxLength: 100,
    },
    email: {
      type: 'email',
      required: true,
      maxLength: 255,
    },
    avatar: {
      type: 'url',
      required: false,
    },
    bio: {
      type: 'string',
      maxLength: 500,
    },
    role: {
      type: 'enum',
      enum: ['admin', 'member', 'guest'],
      default: 'member',
    },
  },

  // 任务创建
  taskCreate: {
    title: {
      type: 'string',
      required: true,
      minLength: 1,
      maxLength: 200,
    },
    description: {
      type: 'string',
      maxLength: 5000,
    },
    priority: {
      type: 'enum',
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },
    status: {
      type: 'enum',
      enum: ['todo', 'in-progress', 'review', 'done', 'cancelled'],
      default: 'todo',
    },
    tags: {
      type: 'array',
    },
    assignee: {
      type: 'string',
    },
    dueDate: {
      type: 'date',
    },
  },

  // ID 参数
  idParam: {
    id: {
      type: 'string',
      required: true,
      minLength: 1,
    },
  },
};