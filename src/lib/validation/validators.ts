/**
 * 内置验证规则
 */
import type { ValidationRule } from './types';

/**
 * 必填验证
 */
export const required = (message = '此字段为必填项'): ValidationRule => ({
  rule: (value: string) => {
    if (typeof value === 'string') {
      return value.trim().length > 0;
    }
    return value !== null && value !== undefined;
  },
  message,
});

/**
 * 邮箱验证
 */
export const email = (message = '请输入有效的邮箱地址'): ValidationRule => ({
  rule: (value: string) => {
    if (!value) return true; // 空值由 required 处理
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  },
  message,
});

/**
 * 最小长度验证
 */
export const minLength = (min: number, message?: string): ValidationRule => ({
  rule: (value: string) => {
    if (!value) return true;
    return value.length >= min;
  },
  message: message || `最少需要 ${min} 个字符`,
});

/**
 * 最大长度验证
 */
export const maxLength = (max: number, message?: string): ValidationRule => ({
  rule: (value: string) => {
    if (!value) return true;
    return value.length <= max;
  },
  message: message || `最多允许 ${max} 个字符`,
});

/**
 * 正则表达式验证
 */
export const pattern = (regex: RegExp, message = '格式不正确'): ValidationRule => ({
  rule: (value: string) => {
    if (!value) return true;
    return regex.test(value);
  },
  message,
});

/**
 * 手机号验证（中国）
 */
export const phone = (message = '请输入有效的手机号码'): ValidationRule => ({
  rule: (value: string) => {
    if (!value) return true;
    const phoneRegex = /^1[3-9]\d{9}$/;
    return phoneRegex.test(value);
  },
  message,
});

/**
 * URL 验证
 */
export const url = (message = '请输入有效的 URL'): ValidationRule => ({
  rule: (value: string) => {
    if (!value) return true;
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  },
  message,
});

/**
 * 数字验证
 */
export const numeric = (message = '请输入有效的数字'): ValidationRule => ({
  rule: (value: string) => {
    if (!value) return true;
    return !isNaN(Number(value)) && !isNaN(parseFloat(value));
  },
  message,
});

/**
 * 整数验证
 */
export const integer = (message = '请输入整数'): ValidationRule => ({
  rule: (value: string) => {
    if (!value) return true;
    return /^-?\d+$/.test(value);
  },
  message,
});

/**
 * 范围验证（数字）
 */
export const range = (min: number, max: number, message?: string): ValidationRule => ({
  rule: (value: string) => {
    if (!value) return true;
    const num = parseFloat(value);
    return !isNaN(num) && num >= min && num <= max;
  },
  message: message || `数值必须在 ${min} 到 ${max} 之间`,
});

/**
 * 确认密码验证
 */
export const confirmPassword = (
  getPassword: () => string,
  message = '两次输入的密码不一致'
): ValidationRule => ({
  rule: (value: string) => {
    if (!value) return true;
    return value === getPassword();
  },
  message,
});

/**
 * 组合多个验证规则
 */
export const compose = (...rules: ValidationRule[]) => {
  return (value: string): string | null => {
    for (const { rule, message } of rules) {
      if (!rule(value)) {
        return message;
      }
    }
    return null;
  };
};

/**
 * 验证规则集合
 */
export const validators = {
  required,
  email,
  minLength,
  maxLength,
  pattern,
  phone,
  url,
  numeric,
  integer,
  range,
  confirmPassword,
  compose,
};

export default validators;
