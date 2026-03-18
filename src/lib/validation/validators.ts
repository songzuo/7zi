/**
 * 内置验证规则
 */
import type { ValidationRule } from './types';
import {
  getRequiredErrorMessage,
  getMinLengthErrorMessage,
  getMaxLengthErrorMessage,
  getRangeErrorMessage,
  getPatternErrorMessage,
  getEmailErrorMessage,
  getPhoneErrorMessage,
  getUrlErrorMessage,
  getNumericErrorMessage,
  getIntegerErrorMessage,
  getConfirmPasswordErrorMessage,
} from './helpers';

/**
 * 必填验证
 */
export const required = (message?: string): ValidationRule => ({
  rule: (value: string) => {
    if (typeof value === 'string') {
      return value.trim().length > 0;
    }
    return value !== null && value !== undefined;
  },
  message: getRequiredErrorMessage(message),
});

/**
 * 邮箱验证
 */
export const email = (message?: string): ValidationRule => ({
  rule: (value: string) => {
    if (!value) return true; // 空值由 required 处理
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    return emailRegex.test(value);
  },
  message: getEmailErrorMessage(message),
});

/**
 * 最小长度验证
 */
export const minLength = (min: number, message?: string): ValidationRule => ({
  rule: (value: string) => {
    if (!value) return true;
    return value.length >= min;
  },
  message: getMinLengthErrorMessage(min, message),
});

/**
 * 最大长度验证
 */
export const maxLength = (max: number, message?: string): ValidationRule => ({
  rule: (value: string) => {
    if (!value) return true;
    return value.length <= max;
  },
  message: getMaxLengthErrorMessage(max, message),
});

/**
 * 正则表达式验证
 */
export const pattern = (regex: RegExp, message?: string): ValidationRule => ({
  rule: (value: string) => {
    if (!value) return true;
    return regex.test(value);
  },
  message: getPatternErrorMessage(message),
});

/**
 * 手机号验证（中国）
 */
export const phone = (message?: string): ValidationRule => ({
  rule: (value: string) => {
    if (!value) return true;
    const phoneRegex = /^1[3-9]\d{9}$/;
    return phoneRegex.test(value);
  },
  message: getPhoneErrorMessage(message),
});

/**
 * URL 验证
 */
export const url = (message?: string): ValidationRule => ({
  rule: (value: string) => {
    if (!value) return true;
    try {
      const parsed = new URL(value);
      // Must have a valid protocol (http, https, ftp, ftps)
      return ['http:', 'https:', 'ftp:', 'ftps:'].includes(parsed.protocol);
    } catch {
      return false;
    }
  },
  message: getUrlErrorMessage(message),
});

/**
 * 数字验证
 */
export const numeric = (message?: string): ValidationRule => ({
  rule: (value: string) => {
    if (!value) return true;
    return !isNaN(Number(value)) && !isNaN(parseFloat(value));
  },
  message: getNumericErrorMessage(message),
});

/**
 * 整数验证
 */
export const integer = (message?: string): ValidationRule => ({
  rule: (value: string) => {
    if (!value) return true;
    return /^-?\d+$/.test(value);
  },
  message: getIntegerErrorMessage(message),
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
  message: getRangeErrorMessage(min, max, message),
});

/**
 * 确认密码验证
 */
export const confirmPassword = (
  getPassword: () => string,
  message?: string
): ValidationRule => ({
  rule: (value: string) => {
    if (!value) return true;
    return value === getPassword();
  },
  message: getConfirmPasswordErrorMessage(message),
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

// 导出辅助函数
export * from './helpers';

export default validators;
