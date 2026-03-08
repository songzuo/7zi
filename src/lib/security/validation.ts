/**
 * 输入验证工具
 * 提供常用的验证函数和模式
 */

import { z } from 'zod';

/**
 * 常用验证模式
 */
export const patterns = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^1[3-9]\d{9}$/,
  url: /^https?:\/\/[\w\-]+(\.[\w\-]+)+[/#?]?.*$/,
  username: /^[a-zA-Z0-9_-]{3,20}$/,
  password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/,
  objectId: /^[a-f\d]{24}$/i,
  uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
};

/**
 * 验证结果
 */
export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string[]>;
}

/**
 * 字段验证器
 */
export class FieldValidator {
  private value: unknown;
  private field: string;
  private errors: string[] = [];

  constructor(value: unknown, field: string) {
    this.value = value;
    this.field = field;
  }

  required(): this {
    if (this.value === undefined || this.value === null || this.value === '') {
      this.errors.push(`${this.field} 是必填项`);
    }
    return this;
  }

  string(): this {
    if (typeof this.value !== 'string' && this.value !== undefined) {
      this.errors.push(`${this.field} 必须是字符串`);
    }
    return this;
  }

  number(): this {
    if (typeof this.value !== 'number' && this.value !== undefined) {
      this.errors.push(`${this.field} 必须是数字`);
    }
    return this;
  }

  min(min: number): this {
    if (typeof this.value === 'string' && this.value.length < min) {
      this.errors.push(`${this.field} 长度不能小于 ${min}`);
    }
    if (typeof this.value === 'number' && this.value < min) {
      this.errors.push(`${this.field} 不能小于 ${min}`);
    }
    return this;
  }

  max(max: number): this {
    if (typeof this.value === 'string' && this.value.length > max) {
      this.errors.push(`${this.field} 长度不能超过 ${max}`);
    }
    if (typeof this.value === 'number' && this.value > max) {
      this.errors.push(`${this.field} 不能超过 ${max}`);
    }
    return this;
  }

  email(): this {
    if (
      typeof this.value === 'string' &&
      !patterns.email.test(this.value)
    ) {
      this.errors.push(`${this.field} 不是有效的邮箱地址`);
    }
    return this;
  }

  url(): this {
    if (
      typeof this.value === 'string' &&
      !patterns.url.test(this.value)
    ) {
      this.errors.push(`${this.field} 不是有效的 URL`);
    }
    return this;
  }

  pattern(regex: RegExp, message?: string): this {
    if (
      typeof this.value === 'string' &&
      !regex.test(this.value)
    ) {
      this.errors.push(message || `${this.field} 格式不正确`);
    }
    return this;
  }

  enum(values: unknown[]): this {
    if (!values.includes(this.value)) {
      this.errors.push(`${this.field} 必须是 ${values.join(', ')} 之一`);
    }
    return this;
  }

  custom(validate: (value: unknown) => boolean, message: string): this {
    if (!validate(this.value)) {
      this.errors.push(message);
    }
    return this;
  }

  getErrors(): string[] {
    return this.errors;
  }

  isValid(): boolean {
    return this.errors.length === 0;
  }
}

/**
 * 创建字段验证器
 */
export function validate(value: unknown, field: string): FieldValidator {
  return new FieldValidator(value, field);
}

/**
 * 对象验证器
 */
export class ObjectValidator {
  private data: Record<string, unknown>;
  private errors: Record<string, string[]> = {};

  constructor(data: Record<string, unknown>) {
    this.data = data;
  }

  field(name: string): FieldValidator {
    const validator = new FieldValidator(this.data[name], name);
    return validator;
  }

  addError(field: string, error: string): void {
    if (!this.errors[field]) {
      this.errors[field] = [];
    }
    this.errors[field].push(error);
  }

  validate(schema: z.ZodSchema): ValidationResult {
    const result = schema.safeParse(this.data);

    if (result.success) {
      return { valid: true, errors: {} };
    }

    const errors: Record<string, string[]> = {};
    for (const issue of result.error.issues) {
      const field = issue.path.join('.');
      if (!errors[field]) {
        errors[field] = [];
      }
      errors[field].push(issue.message);
    }

    return { valid: false, errors };
  }

  getErrors(): Record<string, string[]> {
    return this.errors;
  }

  isValid(): boolean {
    return Object.keys(this.errors).length === 0;
  }
}

/**
 * 常用 Zod 模式
 */
export const schemas = {
  id: z.string().regex(patterns.objectId, '无效的 ID'),
  uuid: z.string().regex(patterns.uuid, '无效的 UUID'),
  email: z.string().email('无效的邮箱地址'),
  phone: z.string().regex(patterns.phone, '无效的手机号码'),
  url: z.string().url('无效的 URL'),
  password: z
    .string()
    .min(8, '密码至少 8 个字符')
    .regex(/[A-Z]/, '密码必须包含大写字母')
    .regex(/[a-z]/, '密码必须包含小写字母')
    .regex(/\d/, '密码必须包含数字'),
  pagination: z.object({
    page: z.coerce.number().int().min(1).default(1),
    perPage: z.coerce.number().int().min(1).max(100).default(20),
  }),
  dateRange: z.object({
    start: z.coerce.date(),
    end: z.coerce.date(),
  }),
};

export type { FieldValidator as FieldValidatorType, ObjectValidator as ObjectValidatorType };