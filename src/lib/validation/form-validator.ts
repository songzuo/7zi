/**
 * @fileoverview 表单验证工具模块
 * @description 提供通用的表单验证函数，支持多种验证规则和自定义错误消息
 * @module lib/validation/form-validator
 */

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 验证规则类型
 */
export type ValidationRule<T = unknown> = {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  custom?: (value: T) => boolean | string;
  message?: string;
};

/**
 * 字段验证配置
 */
export type FieldValidationConfig<T = unknown> = {
  rules: ValidationRule<T>[];
  label?: string;
};

/**
 * 验证结果
 */
export type ValidationResult = {
  valid: boolean;
  errors: Record<string, string[]>;
  touched: Record<string, boolean>;
};

/**
 * 验证选项
 */
export type ValidationOptions = {
  stopOnFirstError?: boolean;
  validateTouchedOnly?: boolean;
};

// ============================================================================
// 内置验证器
// ============================================================================

/**
 * 验证必填字段
 */
export function validateRequired(value: unknown, label: string = '此字段'): string | null {
  if (value === null || value === undefined || value === '') {
    return `${label}不能为空`;
  }
  if (Array.isArray(value) && value.length === 0) {
    return `${label}至少需要一项`;
  }
  return null;
}

/**
 * 验证字符串长度
 */
export function validateLength(
  value: string,
  minLength?: number,
  maxLength?: number,
  label: string = '此字段'
): string | null {
  if (minLength !== undefined && value.length < minLength) {
    return `${label}长度不能少于 ${minLength} 个字符`;
  }
  if (maxLength !== undefined && value.length > maxLength) {
    return `${label}长度不能超过 ${maxLength} 个字符`;
  }
  return null;
}

/**
 * 验证数字范围
 */
export function validateRange(
  value: number,
  min?: number,
  max?: number,
  label: string = '此字段'
): string | null {
  if (min !== undefined && value < min) {
    return `${label}不能小于 ${min}`;
  }
  if (max !== undefined && value > max) {
    return `${label}不能大于 ${max}`;
  }
  return null;
}

/**
 * 验证邮箱格式
 */
export function validateEmail(value: string): string | null {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(value)) {
    return '请输入有效的邮箱地址';
  }
  return null;
}

/**
 * 验证手机号码（中国大陆）
 */
export function validatePhone(value: string): string | null {
  const phoneRegex = /^1[3-9]\d{9}$/;
  if (!phoneRegex.test(value)) {
    return '请输入有效的手机号码';
  }
  return null;
}

/**
 * 验证URL格式
 */
export function validateUrl(value: string): string | null {
  try {
    new URL(value);
    return null;
  } catch {
    return '请输入有效的URL地址';
  }
}

/**
 * 验证密码强度
 */
export function validatePassword(value: string, options: {
  minLength?: number;
  requireNumber?: boolean;
  requireUppercase?: boolean;
  requireLowercase?: boolean;
  requireSpecialChar?: boolean;
} = {}): string | null {
  const {
    minLength = 8,
    requireNumber = true,
    requireUppercase = false,
    requireLowercase = false,
    requireSpecialChar = false,
  } = options;

  const errors: string[] = [];

  if (value.length < minLength) {
    errors.push(`密码长度至少需要 ${minLength} 个字符`);
  }
  if (requireNumber && !/\d/.test(value)) {
    errors.push('密码需要包含数字');
  }
  if (requireUppercase && !/[A-Z]/.test(value)) {
    errors.push('密码需要包含大写字母');
  }
  if (requireLowercase && !/[a-z]/.test(value)) {
    errors.push('密码需要包含小写字母');
  }
  if (requireSpecialChar && !/[!@#$%^&*(),.?":{}|<>]/.test(value)) {
    errors.push('密码需要包含特殊字符');
  }

  return errors.length > 0 ? errors.join('；') : null;
}

/**
 * 验证身份证号（中国大陆）
 */
export function validateIdCard(value: string): string | null {
  const idCardRegex = /(^\d{15}$)|(^\d{18}$)|(^\d{17}(\d|X|x)$)/;
  if (!idCardRegex.test(value)) {
    return '请输入有效的身份证号码';
  }
  return null;
}

/**
 * 验证日期格式
 */
export function validateDate(value: string, format: 'YYYY-MM-DD' | 'YYYY-MM-DD HH:mm:ss' = 'YYYY-MM-DD'): string | null {
  const patterns = {
    'YYYY-MM-DD': /^\d{4}-\d{2}-\d{2}$/,
    'YYYY-MM-DD HH:mm:ss': /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/,
  };

  if (!patterns[format].test(value)) {
    return `请输入有效的日期格式（${format}）`;
  }

  const date = new Date(value);
  if (isNaN(date.getTime())) {
    return '请输入有效的日期';
  }

  return null;
}

// ============================================================================
// 表单验证器类
// ============================================================================

/**
 * 表单验证器
 */
export class FormValidator<T extends Record<string, unknown>> {
  private fields: Map<keyof T, FieldValidationConfig> = new Map();
  private touched: Set<keyof T> = new Set();
  private errors: Map<keyof T, string[]> = new Map();

  /**
   * 添加字段验证规则
   */
  addField<K extends keyof T>(field: K, config: FieldValidationConfig<unknown>): this {
    this.fields.set(field as keyof T, config);
    return this;
  }

  /**
   * 批量添加字段验证规则
   */
  addFields(configs: Partial<Record<keyof T, FieldValidationConfig>>): this {
    Object.entries(configs).forEach(([field, config]) => {
      if (config) {
        this.fields.set(field as keyof T, config);
      }
    });
    return this;
  }

  /**
   * 标记字段为已触摸
   */
  setTouched(field: keyof T, touched: boolean = true): void {
    if (touched) {
      this.touched.add(field);
    } else {
      this.touched.delete(field);
    }
  }

  /**
   * 标记所有字段为已触摸
   */
  setAllTouched(touched: boolean = true): void {
    if (touched) {
      this.fields.forEach((_, field) => this.touched.add(field));
    } else {
      this.touched.clear();
    }
  }

  /**
   * 验证单个字段
   */
  validateField(field: keyof T, value: unknown, options: ValidationOptions = {}): string[] {
    const config = this.fields.get(field);
    if (!config) {
      return [];
    }

    const errors: string[] = [];
    const label = config.label || String(field);

    for (const rule of config.rules) {
      // 跳过已触摸字段的验证
      if (options.validateTouchedOnly && !this.touched.has(field)) {
        continue;
      }

      // 必填验证
      if (rule.required) {
        const error = validateRequired(value, label);
        if (error) {
          errors.push(rule.message || error);
          if (options.stopOnFirstError) break;
          continue;
        }
      }

      // 如果值为空且非必填，跳过其他验证
      if (!rule.required && (value === null || value === undefined || value === '')) {
        continue;
      }

      // 最小长度验证
      if (rule.minLength !== undefined && typeof value === 'string') {
        const error = validateLength(value, rule.minLength, undefined, label);
        if (error) {
          errors.push(rule.message || error);
          if (options.stopOnFirstError) break;
        }
      }

      // 最大长度验证
      if (rule.maxLength !== undefined && typeof value === 'string') {
        const error = validateLength(value, undefined, rule.maxLength, label);
        if (error) {
          errors.push(rule.message || error);
          if (options.stopOnFirstError) break;
        }
      }

      // 最小值验证
      if (rule.min !== undefined && typeof value === 'number') {
        const error = validateRange(value, rule.min, undefined, label);
        if (error) {
          errors.push(rule.message || error);
          if (options.stopOnFirstError) break;
        }
      }

      // 最大值验证
      if (rule.max !== undefined && typeof value === 'number') {
        const error = validateRange(value, undefined, rule.max, label);
        if (error) {
          errors.push(rule.message || error);
          if (options.stopOnFirstError) break;
        }
      }

      // 正则表达式验证
      if (rule.pattern) {
        if (!rule.pattern.test(String(value))) {
          errors.push(rule.message || `${label}格式不正确`);
          if (options.stopOnFirstError) break;
        }
      }

      // 自定义验证
      if (rule.custom) {
        const result = rule.custom(value);
        if (result !== true) {
          errors.push(rule.message || (typeof result === 'string' ? result : `${label}验证失败`));
          if (options.stopOnFirstError) break;
        }
      }
    }

    // 更新错误
    if (errors.length > 0) {
      this.errors.set(field, errors);
    } else {
      this.errors.delete(field);
    }

    return errors;
  }

  /**
   * 验证整个表单
   */
  validate(values: T, options: ValidationOptions = {}): ValidationResult {
    this.errors.clear();

    this.fields.forEach((config, field) => {
      const value = values[field];
      this.validateField(field, value, options);
    });

    return this.getResult();
  }

  /**
   * 获取验证结果
   */
  getResult(): ValidationResult {
    const errors: Record<string, string[]> = {};
    const touched: Record<string, boolean> = {};

    this.errors.forEach((errorList, field) => {
      errors[String(field)] = errorList;
    });

    this.touched.forEach(field => {
      touched[String(field)] = true;
    });

    return {
      valid: this.errors.size === 0,
      errors,
      touched,
    };
  }

  /**
   * 获取字段错误
   */
  getFieldError(field: keyof T): string[] | undefined {
    return this.errors.get(field);
  }

  /**
   * 获取字段第一个错误
   */
  getFieldFirstError(field: keyof T): string | undefined {
    return this.errors.get(field)?.[0];
  }

  /**
   * 检查字段是否有错误
   */
  hasFieldError(field: keyof T): boolean {
    return this.errors.has(field);
  }

  /**
   * 清除所有错误
   */
  clearErrors(): void {
    this.errors.clear();
  }

  /**
   * 清除字段错误
   */
  clearFieldError(field: keyof T): void {
    this.errors.delete(field);
  }

  /**
   * 重置验证器
   */
  reset(): void {
    this.errors.clear();
    this.touched.clear();
  }
}

// ============================================================================
// 便捷函数
// ============================================================================

/**
 * 快速创建表单验证器
 */
export function createFormValidator<T extends Record<string, unknown>>(
  configs: Partial<Record<keyof T, FieldValidationConfig>>
): FormValidator<T> {
  return new FormValidator<T>().addFields(configs);
}

/**
 * 快速验证单个值
 */
export function validateValue<T>(
  value: T,
  rules: ValidationRule<T>[],
  label: string = '此字段'
): string[] {
  const validator = new FormValidator<{ value: T }>();
  validator.addField('value', { rules: rules as ValidationRule<unknown>[], label });
  return validator.validateField('value', value);
}

/**
 * 预定义的验证规则集合
 */
export const validationRules = {
  required: (message?: string): ValidationRule => ({
    required: true,
    message: message || '此字段不能为空',
  }),

  email: (message?: string): ValidationRule => ({
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: message || '请输入有效的邮箱地址',
  }),

  phone: (message?: string): ValidationRule => ({
    pattern: /^1[3-9]\d{9}$/,
    message: message || '请输入有效的手机号码',
  }),

  minLength: (min: number, message?: string): ValidationRule => ({
    minLength: min,
    message: message || `长度不能少于 ${min} 个字符`,
  }),

  maxLength: (max: number, message?: string): ValidationRule => ({
    maxLength: max,
    message: message || `长度不能超过 ${max} 个字符`,
  }),

  min: (min: number, message?: string): ValidationRule => ({
    min,
    message: message || `不能小于 ${min}`,
  }),

  max: (max: number, message?: string): ValidationRule => ({
    max,
    message: message || `不能大于 ${max}`,
  }),

  password: (options: Parameters<typeof validatePassword>[1] = {}, message?: string): ValidationRule => ({
    custom: (value) => {
      const result = validatePassword(String(value), options);
      if (result === null) {
        return true;
      }
      return message || result;
    },
    message: message || '密码不符合要求',
  }),

  url: (message?: string): ValidationRule => ({
    pattern: /^https?:\/\/.+/,
    message: message || '请输入有效的URL地址',
  }),
};
