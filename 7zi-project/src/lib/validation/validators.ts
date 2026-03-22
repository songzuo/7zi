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
 * 验证器工厂函数 - 减少重复代码
 */
function createValidator(
  rule: (value: string) => boolean,
  messageGenerator: () => string
): ValidationRule {
  return {
    rule: (value: string) => {
      if (!value) return true; // 空值由 required 处理
      return rule(value);
    },
    message: messageGenerator(),
  };
}

/**
 * 验证器工厂（带参数的版本）
 */
function createValidatorWithParam<T>(
  rule: (value: string, param: T) => boolean,
  param: T,
  messageGenerator: (p: T) => string
): ValidationRule {
  return {
    rule: (value: string) => {
      if (!value) return true; // 空值由 required 处理
      return rule(value, param);
    },
    message: messageGenerator(param),
  };
}

/**
 * 验证器工厂（带两个参数的版本）
 */
function createValidatorWithTwoParams<T, U>(
  rule: (value: string, param1: T, param2: U) => boolean,
  param1: T,
  param2: U,
  messageGenerator: (p1: T, p2: U) => string
): ValidationRule {
  return {
    rule: (value: string) => {
      if (!value) return true; // 空值由 required 处理
      return rule(value, param1, param2);
    },
    message: messageGenerator(param1, param2),
  };
}

/**
 * 必填验证
 */
export const required = (message?: string): ValidationRule<unknown> => ({
  rule: (value: unknown) => {
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
export const email = (message?: string): ValidationRule =>
  createValidator(
    (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value),
    () => getEmailErrorMessage(message)
  );

/**
 * 最小长度验证
 */
export const minLength = (min: number, message?: string): ValidationRule =>
  createValidatorWithParam(
    (value: string, m: number) => value.length >= m,
    min,
    (m) => getMinLengthErrorMessage(m, message)
  );

/**
 * 最大长度验证
 */
export const maxLength = (max: number, message?: string): ValidationRule =>
  createValidatorWithParam(
    (value: string, m: number) => value.length <= m,
    max,
    (m) => getMaxLengthErrorMessage(m, message)
  );

/**
 * 正则表达式验证
 */
export const pattern = (regex: RegExp, message?: string): ValidationRule =>
  createValidator(
    (value: string) => regex.test(value),
    () => getPatternErrorMessage(message)
  );

/**
 * 手机号验证（中国）
 */
export const phone = (message?: string): ValidationRule =>
  createValidator(
    (value: string) => /^1[3-9]\d{9}$/.test(value),
    () => getPhoneErrorMessage(message)
  );

/**
 * URL 验证
 */
export const url = (message?: string): ValidationRule =>
  createValidator(
    (value: string) => {
      try {
        const parsed = new URL(value);
        return ['http:', 'https:', 'ftp:', 'ftps:'].includes(parsed.protocol);
      } catch {
        return false;
      }
    },
    () => getUrlErrorMessage(message)
  );

/**
 * 数字验证
 */
export const numeric = (message?: string): ValidationRule =>
  createValidator(
    (value: string) => !isNaN(Number(value)) && !isNaN(parseFloat(value)),
    () => getNumericErrorMessage(message)
  );

/**
 * 整数验证
 */
export const integer = (message?: string): ValidationRule =>
  createValidator(
    (value: string) => /^-?\d+$/.test(value),
    () => getIntegerErrorMessage(message)
  );

/**
 * 范围验证（数字）
 */
export const range = (min: number, max: number, message?: string): ValidationRule =>
  createValidatorWithTwoParams(
    (value: string, mn: number, mx: number) => {
      const num = parseFloat(value);
      return !isNaN(num) && num >= mn && num <= mx;
    },
    min,
    max,
    (mn, mx) => getRangeErrorMessage(mn, mx, message)
  );

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
