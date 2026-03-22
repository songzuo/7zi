/**
// @ts-ignore - Mock type compatibility issues
 * @vitest-environment jsdom
 */

import {describe, it, expect, beforeEach} from 'vitest';
import { FormValidator, createFormValidator, validateValue, validateRequired, validateLength, validateRange, validateEmail, validatePhone, validateUrl, validatePassword, validateIdCard, validateDate, validationRules } from '../form-validator';

describe('FormValidator', () => {
  let validator: FormValidator<{ name: string; age: number; email: string }>;

  beforeEach(() => {
    validator = new FormValidator<{ name: string; age: number; email: string }>();
  });

  it('should create a validator instance', () => {
    expect(validator).toBeInstanceOf(FormValidator);
  });

  describe('addField', () => {
    it('should add a field with validation rules', () => {
      validator.addField('name', {
        rules: [{ required: true }],
        label: '姓名',
      });

      const errors = validator.validateField('name', '');
      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('姓名');
    });

    it('should chain addField calls', () => {
      const chained = validator
        .addField('name', { rules: [{ required: true }] })
        .addField('email', { rules: [{ pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ }] });

      expect(chained).toBeInstanceOf(FormValidator);
    });
  });

  describe('addFields', () => {
    it('should add multiple fields at once', () => {
      validator.addFields({
        name: { rules: [{ required: true }] },
        age: { rules: [{ min: 0, max: 120 }] },
      });

      expect(validator.validateField('name', '')).toHaveLength(1);
      expect(validator.validateField('age', -1)).toHaveLength(1);
    });
  });

  describe('setTouched', () => {
    it('should mark a field as touched', () => {
      validator.addField('name', { rules: [{ required: true }] });

      validator.setTouched('name', true);
      const result = validator.getResult();
      expect(result.touched.name).toBe(true);
    });

    it('should unmark a field as touched', () => {
      validator.addField('name', { rules: [{ required: true }] });

      validator.setTouched('name', true);
      validator.setTouched('name', false);

      const result = validator.getResult();
      expect(result.touched.name).toBeUndefined();
    });
  });

  describe('setAllTouched', () => {
    it('should mark all fields as touched', () => {
      validator.addFields({
        name: { rules: [{ required: true }] },
        email: { rules: [{ pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ }] },
      });

      validator.setAllTouched(true);

      const result = validator.getResult();
      expect(result.touched.name).toBe(true);
      expect(result.touched.email).toBe(true);
    });

    it('should clear all touched flags', () => {
      validator.addFields({
        name: { rules: [{ required: true }] },
        email: { rules: [{ pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ }] },
      });

      validator.setAllTouched(true);
      validator.setAllTouched(false);

      const result = validator.getResult();
      expect(Object.keys(result.touched)).toHaveLength(0);
    });
  });

  describe('validateField', () => {
    beforeEach(() => {
      validator.addField('name', {
        rules: [
          { required: true },
          { minLength: 2, maxLength: 20 },
        ],
        label: '姓名',
      });
    });

    it('should validate required field', () => {
      const errors = validator.validateField('name', '');
      expect(errors).toContainEqual('姓名不能为空');
    });

    it('should validate minLength', () => {
      const errors = validator.validateField('name', 'a');
      expect(errors.some(e => e.includes('长度不能少于'))).toBe(true);
    });

    it('should validate maxLength', () => {
      const errors = validator.validateField('name', 'a'.repeat(21));
      expect(errors.some(e => e.includes('长度不能超过'))).toBe(true);
    });

    it('should return no errors for valid input', () => {
      const errors = validator.validateField('name', 'John');
      expect(errors).toHaveLength(0);
    });

    it('should skip non-touched fields when validateTouchedOnly is true', () => {
      const errors = validator.validateField('name', '', { validateTouchedOnly: true });
      expect(errors).toHaveLength(0);
    });

    it('should validate touched fields even with validateTouchedOnly', () => {
      validator.setTouched('name', true);
      const errors = validator.validateField('name', '', { validateTouchedOnly: true });
      expect(errors).toHaveLength(1);
    });
  });

  describe('validate', () => {
    beforeEach(() => {
      validator.addFields({
        name: { rules: [{ required: true }], label: '姓名' },
        age: { rules: [{ min: 0, max: 120 }] },
        email: { rules: [{ pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ }] },
      });
    });

    it('should validate all fields', () => {
      const result = validator.validate({
        name: '',
        age: 150,
        email: 'invalid',
      });

      expect(result.valid).toBe(false);
      expect(result.errors.name).toBeDefined();
      expect(result.errors.age).toBeDefined();
      expect(result.errors.email).toBeDefined();
    });

    it('should return valid result for correct values', () => {
      const result = validator.validate({
        name: 'John',
        age: 25,
        email: 'test@example.com',
      });

      expect(result.valid).toBe(true);
      expect(Object.keys(result.errors)).toHaveLength(0);
    });
  });

  describe('getResult', () => {
    it('should return validation result', () => {
      validator.addField('name', { rules: [{ required: true }] });
      validator.validateField('name', '');

      const result = validator.getResult();
      expect(result.valid).toBe(false);
      expect(result.errors.name).toHaveLength(1);
    });

    it('should include touched fields', () => {
      validator.addField('name', { rules: [{ required: true }] });
      validator.setTouched('name', true);

      const result = validator.getResult();
      expect(result.touched.name).toBe(true);
    });
  });

  describe('getFieldError', () => {
    it('should return field errors', () => {
      validator.addField('name', {
        rules: [{ required: true }, { minLength: 2 }],
        label: '姓名',
      });
      validator.validateField('name', '');

      const errors = validator.getFieldError('name');
      expect(errors).toHaveLength(1);
      expect(errors?.[0]).toContain('姓名');
    });

    it('should return undefined for fields without errors', () => {
      validator.addField('name', { rules: [{ required: true }] });

      const errors = validator.getFieldError('name');
      expect(errors).toBeUndefined();
    });
  });

  describe('getFieldFirstError', () => {
    it('should return first error message', () => {
      validator.addField('name', {
        rules: [{ required: true }, { minLength: 2 }],
        label: '姓名',
      });
      validator.validateField('name', '');

      const error = validator.getFieldFirstError('name');
      expect(error).toContain('姓名');
    });

    it('should return undefined for valid fields', () => {
      validator.addField('name', { rules: [{ required: true }] });
      validator.validateField('name', 'John');

      const error = validator.getFieldFirstError('name');
      expect(error).toBeUndefined();
    });
  });

  describe('hasFieldError', () => {
    it('should return true when field has errors', () => {
      validator.addField('name', { rules: [{ required: true }] });
      validator.validateField('name', '');

      expect(validator.hasFieldError('name')).toBe(true);
    });

    it('should return false when field has no errors', () => {
      validator.addField('name', { rules: [{ required: true }] });
      validator.validateField('name', 'John');

      expect(validator.hasFieldError('name')).toBe(false);
    });
  });

  describe('clearErrors', () => {
    it('should clear all errors', () => {
      validator.addFields({
        name: { rules: [{ required: true }] },
        email: { rules: [{ pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ }] },
      });

      validator.validateField('name', '');
      validator.validateField('email', 'invalid');
      validator.clearErrors();

      const result = validator.getResult();
      expect(result.valid).toBe(true);
      expect(Object.keys(result.errors)).toHaveLength(0);
    });
  });

  describe('clearFieldError', () => {
    it('should clear specific field error', () => {
      validator.addFields({
        name: { rules: [{ required: true }] },
        email: { rules: [{ pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ }] },
      });

      validator.validate({
        name: '',
        email: 'invalid',
        age: 25,
      });

      validator.clearFieldError('name');

      const result = validator.getResult();
      expect(result.errors.name).toBeUndefined();
      expect(result.errors.email).toBeDefined();
    });
  });

  describe('reset', () => {
    it('should reset all state', () => {
      validator.addField('name', { rules: [{ required: true }] });
      validator.setTouched('name', true);
      validator.validateField('name', '');

      validator.reset();

      const result = validator.getResult();
      expect(result.valid).toBe(true);
      expect(Object.keys(result.errors)).toHaveLength(0);
      expect(Object.keys(result.touched)).toHaveLength(0);
    });
  });
});

describe('createFormValidator', () => {
  it('should create a validator with initial configs', () => {
    const validator = createFormValidator<{ name: string; email: string }>({
      name: { rules: [{ required: true }], label: '姓名' },
      email: { rules: [{ pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ }] },
    });

    const result = validator.validate({
      name: '',
      email: 'invalid',
    });

    expect(result.valid).toBe(false);
    expect(result.errors.name).toBeDefined();
    expect(result.errors.email).toBeDefined();
  });
});

describe('validateValue', () => {
  it('should validate a single value', () => {
    const errors = validateValue('', [{ required: true }], '姓名');
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('姓名');
  });

  it('should return no errors for valid value', () => {
    const errors = validateValue('test@test.com', [{ pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ }]);
    expect(errors).toHaveLength(0);
  });
});

describe('validateRequired', () => {
  it('should return error for empty string', () => {
    const error = validateRequired('', '姓名');
    expect(error).toBe('姓名不能为空');
  });

  it('should return error for null', () => {
    const error = validateRequired(null, '姓名');
    expect(error).toBe('姓名不能为空');
  });

  it('should return error for undefined', () => {
    const error = validateRequired(undefined, '姓名');
    expect(error).toBe('姓名不能为空');
  });

  it('should return error for empty array', () => {
    const error = validateRequired([], '列表');
    expect(error).toBe('列表至少需要一项');
  });

  it('should return null for valid values', () => {
    expect(validateRequired('test', '姓名')).toBeNull();
    expect(validateRequired(0, '数值')).toBeNull();
    expect(validateRequired(false, '布尔')).toBeNull();
    expect(validateRequired([1, 2], '列表')).toBeNull();
  });
});

describe('validateLength', () => {
  it('should validate minLength', () => {
    const error = validateLength('ab', 3, undefined, '姓名');
    expect(error).toContain('长度不能少于 3 个字符');
  });

  it('should validate maxLength', () => {
    const error = validateLength('abcdef', undefined, 5, '姓名');
    expect(error).toContain('长度不能超过 5 个字符');
  });

  it('should validate both min and max length', () => {
    const error = validateLength('a', 3, 5, '姓名');
    expect(error).toContain('长度不能少于 3 个字符');
  });

  it('should return null for valid length', () => {
    expect(validateLength('abc', 3, 5, '姓名')).toBeNull();
    expect(validateLength('abcdef', undefined, 10, '姓名')).toBeNull();
    expect(validateLength('abc', undefined, 10, '姓名')).toBeNull();
  });
});

describe('validateRange', () => {
  it('should validate min value', () => {
    const error = validateRange(-1, 0, undefined, '年龄');
    expect(error).toContain('年龄不能小于 0');
  });

  it('should validate max value', () => {
    const error = validateRange(121, undefined, 120, '年龄');
    expect(error).toContain('年龄不能大于 120');
  });

  it('should validate both min and max', () => {
    const error = validateRange(150, 0, 120, '年龄');
    expect(error).toContain('年龄不能大于 120');
  });

  it('should return null for valid range', () => {
    expect(validateRange(50, 0, 120, '年龄')).toBeNull();
    expect(validateRange(0, 0, 120, '年龄')).toBeNull();
    expect(validateRange(120, 0, 120, '年龄')).toBeNull();
  });
});

describe('validateEmail', () => {
  it('should return error for invalid email', () => {
    expect(validateEmail('invalid')).toBe('请输入有效的邮箱地址');
    expect(validateEmail('test@')).toBe('请输入有效的邮箱地址');
    expect(validateEmail('@example.com')).toBe('请输入有效的邮箱地址');
  });

  it('should return null for valid email', () => {
    expect(validateEmail('test@example.com')).toBeNull();
    expect(validateEmail('user.name+tag@domain.co.uk')).toBeNull();
  });
});

describe('validatePhone', () => {
  it('should return error for invalid phone', () => {
    expect(validatePhone('123')).toBe('请输入有效的手机号码');
    expect(validatePhone('12345678901')).toBe('请输入有效的手机号码');
    expect(validatePhone('1234567890')).toBe('请输入有效的手机号码');
  });

  it('should return null for valid phone', () => {
    expect(validatePhone('13812345678')).toBeNull();
    expect(validatePhone('15987654321')).toBeNull();
    expect(validatePhone('19912345678')).toBeNull();
  });
});

describe('validateUrl', () => {
  it('should return error for invalid URL', () => {
    expect(validateUrl('not a url')).toBe('请输入有效的URL地址');
    expect(validateUrl('http://')).toBe('请输入有效的URL地址');
  });

  it('should return null for valid URL', () => {
    expect(validateUrl('https://example.com')).toBeNull();
    expect(validateUrl('http://localhost:3000')).toBeNull();
    expect(validateUrl('https://example.com/path?query=value')).toBeNull();
  });
});

describe('validatePassword', () => {
  it('should validate default password requirements', () => {
    const error = validatePassword('short');
    expect(error).toContain('密码长度至少需要 8 个字符');
    expect(error).toContain('密码需要包含数字');
  });

  it('should validate custom minLength', () => {
    const error = validatePassword('1234567', { minLength: 8 });
    expect(error).toContain('密码长度至少需要 8 个字符');
  });

  it('should validate uppercase requirement', () => {
    const error = validatePassword('password123', { requireUppercase: true });
    expect(error).toContain('密码需要包含大写字母');
  });

  it('should validate lowercase requirement', () => {
    const error = validatePassword('PASSWORD123', { requireLowercase: true });
    expect(error).toContain('密码需要包含小写字母');
  });

  it('should validate special character requirement', () => {
    const error = validatePassword('Password123', { requireSpecialChar: true });
    expect(error).toContain('密码需要包含特殊字符');
  });

  it('should return null for valid password', () => {
    expect(validatePassword('Password123!')).toBeNull();
    expect(validatePassword('pass123', { minLength: 6, requireNumber: true })).toBeNull();
  });
});

describe('validateIdCard', () => {
  it('should return error for invalid ID card', () => {
    expect(validateIdCard('123')).toBe('请输入有效的身份证号码');
    expect(validateIdCard('123456789012')).toBe('请输入有效的身份证号码');
    expect(validateIdCard('1234567890123456')).toBe('请输入有效的身份证号码');
  });

  it('should return null for valid ID card', () => {
    expect(validateIdCard('123456789012345')).toBeNull(); // 15 digits
    expect(validateIdCard('123456789012345678')).toBeNull(); // 18 digits
    expect(validateIdCard('12345678901234567X')).toBeNull(); // 18 digits with X
  });
});

describe('validateDate', () => {
  it('should validate YYYY-MM-DD format', () => {
    const error = validateDate('2024/01/01', 'YYYY-MM-DD');
    expect(error).toContain('请输入有效的日期格式（YYYY-MM-DD）');
  });

  it('should validate YYYY-MM-DD HH:mm:ss format', () => {
    const error = validateDate('2024-01-01', 'YYYY-MM-DD HH:mm:ss');
    expect(error).toContain('请输入有效的日期格式（YYYY-MM-DD HH:mm:ss）');
  });

  it('should return null for valid date', () => {
    expect(validateDate('2024-01-01', 'YYYY-MM-DD')).toBeNull();
    expect(validateDate('2024-01-01 12:00:00', 'YYYY-MM-DD HH:mm:ss')).toBeNull();
  });
});

describe('validationRules', () => {
  it('should provide required rule', () => {
    const rule = validationRules.required('必填');
    expect(rule.required).toBe(true);
    expect(rule.message).toBe('必填');
  });

  it('should provide email rule', () => {
    const rule = validationRules.email();
    expect(rule.pattern).toBeInstanceOf(RegExp);
  });

  it('should provide phone rule', () => {
    const rule = validationRules.phone();
    expect(rule.pattern).toBeInstanceOf(RegExp);
  });

  it('should provide minLength rule', () => {
    const rule = validationRules.minLength(5, '太短');
    expect(rule.minLength).toBe(5);
    expect(rule.message).toBe('太短');
  });

  it('should provide maxLength rule', () => {
    const rule = validationRules.maxLength(100, '太长');
    expect(rule.maxLength).toBe(100);
    expect(rule.message).toBe('太长');
  });

  it('should provide min rule', () => {
    const rule = validationRules.min(0, '太小');
    expect(rule.min).toBe(0);
    expect(rule.message).toBe('太小');
  });

  it('should provide max rule', () => {
    const rule = validationRules.max(100, '太大');
    expect(rule.max).toBe(100);
    expect(rule.message).toBe('太大');
  });

  it('should provide password rule', () => {
    const rule = validationRules.password({ minLength: 6 });
    expect(rule.custom).toBeDefined();
    expect(typeof rule.custom).toBe('function');
  });

  it('should provide url rule', () => {
    const rule = validationRules.url();
    expect(rule.pattern).toBeInstanceOf(RegExp);
  });
});
