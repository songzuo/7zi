import {describe, it, expect, vi} from 'vitest';
// @ts-ignore - Mock type compatibility issues
import {
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
  validators,
} from '../validators';

// Mock error message helpers
vi.mock('../helpers', () => ({
  getRequiredErrorMessage: (msg?: string) => msg || '此字段为必填项',
  getMinLengthErrorMessage: (min: number, msg?: string) => msg || `最少需要 ${min} 个字符`,
  getMaxLengthErrorMessage: (max: number, msg?: string) => msg || `最多允许 ${max} 个字符`,
  getRangeErrorMessage: (min: number, max: number, msg?: string) => msg || `数值必须在 ${min} 到 ${max} 之间`,
  getPatternErrorMessage: (msg?: string) => msg || '格式不正确',
  getEmailErrorMessage: (msg?: string) => msg || '请输入有效的邮箱地址',
  getPhoneErrorMessage: (msg?: string) => msg || '请输入有效的手机号码',
  getUrlErrorMessage: (msg?: string) => msg || '请输入有效的 URL',
  getNumericErrorMessage: (msg?: string) => msg || '请输入有效的数字',
  getIntegerErrorMessage: (msg?: string) => msg || '请输入整数',
  getConfirmPasswordErrorMessage: (msg?: string) => msg || '两次输入的密码不一致',
}));

describe('required', () => {
  it('should pass for non-empty string', () => {
    const rule = required();
    expect(rule.rule('test')).toBe(true);
    expect(rule.rule('  test  ')).toBe(true);
  });

  it('should fail for empty string', () => {
    const rule = required();
    expect(rule.rule('')).toBe(false);
    expect(rule.rule('  ')).toBe(false);
  });

  it('should pass for non-null/non-undefined values', () => {
    const rule = required();
    expect(rule.rule(0)).toBe(true);
    expect(rule.rule(false)).toBe(true);
    expect(rule.rule([])).toBe(true);
    expect(rule.rule({})).toBe(true);
  });

  it('should fail for null', () => {
    const rule = required();
    expect(rule.rule(null)).toBe(false);
  });

  it('should fail for undefined', () => {
    const rule = required();
    expect(rule.rule(undefined)).toBe(false);
  });

  it('should use custom message', () => {
    const rule = required('自定义必填消息');
    expect(rule.message).toBe('自定义必填消息');
  });

  it('should use default message', () => {
    const rule = required();
    expect(rule.message).toBe('此字段为必填项');
  });
});

describe('email', () => {
  it('should pass for valid email addresses', () => {
    const rule = email();
    expect(rule.rule('test@example.com')).toBe(true);
    expect(rule.rule('user.name+tag@domain.co.uk')).toBe(true);
    expect(rule.rule('user_name@sub.domain.com')).toBe(true);
  });

  it('should fail for invalid email addresses', () => {
    const rule = email();
    expect(rule.rule('invalid')).toBe(false);
    expect(rule.rule('test@')).toBe(false);
    expect(rule.rule('@example.com')).toBe(false);
    expect(rule.rule('test@.com')).toBe(false);
    expect(rule.rule('test @example.com')).toBe(false);
  });

  it('should pass for empty strings (handled by required)', () => {
    const rule = email();
    expect(rule.rule('')).toBe(true);
  });

  it('should use custom message', () => {
    const rule = email('自定义邮箱消息');
    expect(rule.message).toBe('自定义邮箱消息');
  });
});

describe('minLength', () => {
  it('should pass for strings with sufficient length', () => {
    const rule = minLength(5);
    expect(rule.rule('hello')).toBe(true);
    expect(rule.rule('hello world')).toBe(true);
  });

  it('should fail for strings with insufficient length', () => {
    const rule = minLength(5);
    expect(rule.rule('hi')).toBe(false);
    expect(rule.rule('hell')).toBe(false);
  });

  it('should pass for empty strings (handled by required)', () => {
    const rule = minLength(5);
    expect(rule.rule('')).toBe(true);
  });

  it('should use custom message', () => {
    const rule = minLength(10, '自定义最小长度消息');
    expect(rule.message).toBe('自定义最小长度消息');
  });

  it('should use default message', () => {
    const rule = minLength(10);
    expect(rule.message).toBe('最少需要 10 个字符');
  });
});

describe('maxLength', () => {
  it('should pass for strings within limit', () => {
    const rule = maxLength(10);
    expect(rule.rule('hello')).toBe(true);
    expect(rule.rule('hello world')).toBe(false); // 11 characters
  });

  it('should fail for strings exceeding limit', () => {
    const rule = maxLength(5);
    expect(rule.rule('hello world')).toBe(false);
    expect(rule.rule('hellow')).toBe(false); // 6 characters
  });

  it('should pass for empty strings (handled by required)', () => {
    const rule = maxLength(10);
    expect(rule.rule('')).toBe(true);
  });

  it('should use custom message', () => {
    const rule = maxLength(100, '自定义最大长度消息');
    expect(rule.message).toBe('自定义最大长度消息');
  });

  it('should use default message', () => {
    const rule = maxLength(100);
    expect(rule.message).toBe('最多允许 100 个字符');
  });
});

describe('pattern', () => {
  it('should pass for strings matching pattern', () => {
    const rule = pattern(/^[A-Z]+$/);
    expect(rule.rule('ABC')).toBe(true);
    expect(rule.rule('HELLO')).toBe(true);
  });

  it('should fail for strings not matching pattern', () => {
    const rule = pattern(/^[A-Z]+$/);
    expect(rule.rule('abc')).toBe(false);
    expect(rule.rule('Hello')).toBe(false);
    expect(rule.rule('ABC123')).toBe(false);
  });

  it('should pass for empty strings (handled by required)', () => {
    const rule = pattern(/^[A-Z]+$/);
    expect(rule.rule('')).toBe(true);
  });

  it('should use custom message', () => {
    const rule = pattern(/^[A-Z]+$/, '自定义格式消息');
    expect(rule.message).toBe('自定义格式消息');
  });
});

describe('phone', () => {
  it('should pass for valid Chinese phone numbers', () => {
    const rule = phone();
    expect(rule.rule('13812345678')).toBe(true);
    expect(rule.rule('15987654321')).toBe(true);
    expect(rule.rule('19912345678')).toBe(true);
    expect(rule.rule('18600000000')).toBe(true);
  });

  it('should fail for invalid phone numbers', () => {
    const rule = phone();
    expect(rule.rule('12345678901')).toBe(false); // Invalid prefix
    expect(rule.rule('1381234567')).toBe(false); // Too short
    expect(rule.rule('138123456789')).toBe(false); // Too long
    expect(rule.rule('abcdefghijk')).toBe(false); // Non-numeric
  });

  it('should pass for empty strings (handled by required)', () => {
    const rule = phone();
    expect(rule.rule('')).toBe(true);
  });

  it('should use custom message', () => {
    const rule = phone('自定义手机号消息');
    expect(rule.message).toBe('自定义手机号消息');
  });
});

describe('url', () => {
  it('should pass for valid URLs', () => {
    const rule = url();
    expect(rule.rule('https://example.com')).toBe(true);
    expect(rule.rule('http://localhost:3000')).toBe(true);
    expect(rule.rule('https://example.com/path?query=value')).toBe(true);
    expect(rule.rule('ftp://ftp.example.com')).toBe(true);
  });

  it('should fail for invalid URLs', () => {
    const rule = url();
    expect(rule.rule('not a url')).toBe(false);
    expect(rule.rule('http://')).toBe(false);
    expect(rule.rule('example.com')).toBe(false); // Missing protocol
    expect(rule.rule('javascript:alert(1)')).toBe(false); // Invalid protocol
  });

  it('should pass for empty strings (handled by required)', () => {
    const rule = url();
    expect(rule.rule('')).toBe(true);
  });

  it('should use custom message', () => {
    const rule = url('自定义URL消息');
    expect(rule.message).toBe('自定义URL消息');
  });
});

describe('numeric', () => {
  it('should pass for valid numeric strings', () => {
    const rule = numeric();
    expect(rule.rule('123')).toBe(true);
    expect(rule.rule('12.34')).toBe(true);
    expect(rule.rule('-123')).toBe(true);
    expect(rule.rule('-12.34')).toBe(true);
    expect(rule.rule('0')).toBe(true);
  });

  it('should fail for non-numeric strings', () => {
    const rule = numeric();
    expect(rule.rule('abc')).toBe(false);
    expect(rule.rule('12a')).toBe(false);
  });

  it('should pass for empty strings (handled by required)', () => {
    const rule = numeric();
    expect(rule.rule('')).toBe(true);
  });

  it('should use custom message', () => {
    const rule = numeric('自定义数字消息');
    expect(rule.message).toBe('自定义数字消息');
  });
});

describe('integer', () => {
  it('should pass for integer strings', () => {
    const rule = integer();
    expect(rule.rule('123')).toBe(true);
    expect(rule.rule('-123')).toBe(true);
    expect(rule.rule('0')).toBe(true);
  });

  it('should fail for non-integer strings', () => {
    const rule = integer();
    expect(rule.rule('12.34')).toBe(false);
    expect(rule.rule('abc')).toBe(false);
    expect(rule.rule('12a')).toBe(false);
  });

  it('should pass for empty strings (handled by required)', () => {
    const rule = integer();
    expect(rule.rule('')).toBe(true);
  });

  it('should use custom message', () => {
    const rule = integer('自定义整数消息');
    expect(rule.message).toBe('自定义整数消息');
  });
});

describe('range', () => {
  it('should pass for values within range', () => {
    const rule = range(0, 100);
    expect(rule.rule('0')).toBe(true);
    expect(rule.rule('50')).toBe(true);
    expect(rule.rule('100')).toBe(true);
    expect(rule.rule('25.5')).toBe(true);
  });

  it('should fail for values below range', () => {
    const rule = range(0, 100);
    expect(rule.rule('-1')).toBe(false);
    expect(rule.rule('-100')).toBe(false);
  });

  it('should fail for values above range', () => {
    const rule = range(0, 100);
    expect(rule.rule('101')).toBe(false);
    expect(rule.rule('200')).toBe(false);
  });

  it('should pass for empty strings (handled by required)', () => {
    const rule = range(0, 100);
    expect(rule.rule('')).toBe(true);
  });

  it('should fail for non-numeric values', () => {
    const rule = range(0, 100);
    expect(rule.rule('abc')).toBe(false);
  });

  it('should use custom message', () => {
    const rule = range(0, 100, '自定义范围消息');
    expect(rule.message).toBe('自定义范围消息');
  });

  it('should use default message', () => {
    const rule = range(0, 100);
    expect(rule.message).toBe('数值必须在 0 到 100 之间');
  });
});

describe('confirmPassword', () => {
  it('should pass when passwords match', () => {
    const password = 'password123';
    const rule = confirmPassword(() => password);
    expect(rule.rule('password123')).toBe(true);
  });

  it('should fail when passwords do not match', () => {
    const password = 'password123';
    const rule = confirmPassword(() => password);
    expect(rule.rule('different123')).toBe(false);
  });

  it('should get password dynamically from getter', () => {
    let password = 'password123';
    const rule = confirmPassword(() => password);
    
    expect(rule.rule('password123')).toBe(true);
    
    password = 'newpassword456';
    expect(rule.rule('newpassword456')).toBe(true);
    expect(rule.rule('password123')).toBe(false);
  });

  it('should pass for empty strings (handled by required)', () => {
    const password = 'password123';
    const rule = confirmPassword(() => password);
    expect(rule.rule('')).toBe(true);
  });

  it('should use custom message', () => {
    const rule = confirmPassword(() => 'password', '自定义确认密码消息');
    expect(rule.message).toBe('自定义确认密码消息');
  });
});

describe('compose', () => {
  it('should validate with multiple rules', () => {
    const validator = compose(
      required(),
      minLength(5),
      email()
    );

    expect(validator('test@example.com')).toBeNull();
  });

  it('should return first error message when validation fails', () => {
    const validator = compose(
      required(),
      minLength(5),
      email()
    );

    expect(validator('')).toContain('必填');
  });

  it('should check all rules in order', () => {
    const validator = compose(
      required(),
      minLength(5),
      pattern(/^[a-z]+$/)
    );

    expect(validator('abc')).toContain('最少需要 5 个字符');
    expect(validator('ABCDE')).toContain('格式不正确');
    expect(validator('abcde')).toBeNull();
  });

  it('should handle empty rules array', () => {
    const validator = compose();
    expect(validator('any value')).toBeNull();
  });

  it('should handle single rule', () => {
    const validator = compose(required());
    expect(validator('')).toContain('必填');
    expect(validator('value')).toBeNull();
  });
});

describe('validators', () => {
  it('should export all validator functions', () => {
    expect(validators.required).toBe(required);
    expect(validators.email).toBe(email);
    expect(validators.minLength).toBe(minLength);
    expect(validators.maxLength).toBe(maxLength);
    expect(validators.pattern).toBe(pattern);
    expect(validators.phone).toBe(phone);
    expect(validators.url).toBe(url);
    expect(validators.numeric).toBe(numeric);
    expect(validators.integer).toBe(integer);
    expect(validators.range).toBe(range);
    expect(validators.confirmPassword).toBe(confirmPassword);
    expect(validators.compose).toBe(compose);
  });

  it('should be usable as a namespace', () => {
    const rule1 = validators.required();
    const rule2 = validators.email();
    const rule3 = validators.minLength(10);

    expect(rule1.rule('test')).toBe(true);
    expect(rule2.rule('test@example.com')).toBe(true);
    expect(rule3.rule('short')).toBe(false);
  });
});

describe('Integration Tests', () => {
  it('should validate a complex form with multiple fields', () => {
    const nameValidator = compose(required(), minLength(2), maxLength(50));
    const emailValidator = compose(required(), email());
    const passwordValidator = compose(required(), minLength(8), pattern(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/));

    expect(nameValidator('John Doe')).toBeNull();
    expect(emailValidator('john@example.com')).toBeNull();
    expect(passwordValidator('Password123')).toBeNull();

    expect(nameValidator('')).toContain('必填');
    expect(emailValidator('invalid')).toContain('邮箱');
    expect(passwordValidator('short')).toContain('最少需要 8 个字符');
  });

  it('should validate with dynamic confirm password', () => {
    let password = '';
    const getPassword = () => password;

    const passwordValidator = compose(required(), minLength(8));
    const confirmPasswordValidator = compose(confirmPassword(getPassword));

    password = 'Password123';

    expect(passwordValidator('Password123')).toBeNull();
    expect(confirmPasswordValidator('Password123')).toBeNull();
    expect(confirmPasswordValidator('Different123')).toContain('不一致');
  });

  it('should handle conditional validation', () => {
    const baseValidator = compose(email());

    // Empty value should pass (not required)
    expect(baseValidator('')).toBeNull();

    // Invalid email should fail
    expect(baseValidator('invalid-email')).toContain('邮箱');

    // Valid email should pass
    expect(baseValidator('valid@example.com')).toBeNull();
  });
});
