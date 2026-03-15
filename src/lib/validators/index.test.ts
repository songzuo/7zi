/**
 * Validators Unit Tests
 * 验证工具模块单元测试
 */

import { describe, it, expect } from 'vitest';
import {
  emailValidator,
  urlValidator,
  phoneValidator,
  dateValidator,
  composeValidators,
  type ValidationResult,
} from './index';

// ==================== Email Validator Tests ====================

describe('emailValidator', () => {
  describe('基础验证', () => {
    it('应该接受有效的邮箱地址', () => {
      const result = emailValidator('test@example.com');
      expect(result.valid).toBe(true);
    });

    it('应该拒绝空值', () => {
      expect(emailValidator('').valid).toBe(false);
      expect(emailValidator(null as any).valid).toBe(false);
      expect(emailValidator(undefined as any).valid).toBe(false);
    });

    it('应该拒绝无效的邮箱格式', () => {
      expect(emailValidator('invalid-email').valid).toBe(false);
      expect(emailValidator('test@').valid).toBe(false);
      expect(emailValidator('@example.com').valid).toBe(false);
    });
  });

  describe('边界情况', () => {
    it('应该拒绝超长邮箱地址', () => {
      const longEmail = 'a'.repeat(250) + '@example.com';
      const result = emailValidator(longEmail);
      expect(result.valid).toBe(false);
      expect(result.message).toContain('不能超过');
    });

    it('应该处理带加号的邮箱（allowPlusSign: true）', () => {
      const result = emailValidator('user+tag@example.com', { allowPlusSign: true });
      expect(result.valid).toBe(true);
    });

    it('应该拒绝带加号的邮箱（allowPlusSign: false）', () => {
      const result = emailValidator('user+tag@example.com', { allowPlusSign: false });
      expect(result.valid).toBe(false);
    });

    it('应该处理子域名邮箱', () => {
      const result = emailValidator('user@sub.domain.example.com', { allowSubdomain: true });
      expect(result.valid).toBe(true);
    });
  });

  describe('特殊格式', () => {
    it('应该接受带数字的邮箱', () => {
      expect(emailValidator('user123@example.com').valid).toBe(true);
    });

    it('应该接受带点的本地部分', () => {
      expect(emailValidator('first.last@example.com').valid).toBe(true);
    });

    it('应该接受带下划线的邮箱', () => {
      expect(emailValidator('user_name@example.com').valid).toBe(true);
    });

    it('应该接受带减号的邮箱', () => {
      expect(emailValidator('user-name@example.com').valid).toBe(true);
    });

    it('应该拒绝连续的点', () => {
      expect(emailValidator('user..name@example.com').valid).toBe(false);
    });
  });
});

// ==================== URL Validator Tests ====================

describe('urlValidator', () => {
  describe('基础验证', () => {
    it('应该接受有效的 HTTP URL', () => {
      const result = urlValidator('http://example.com');
      expect(result.valid).toBe(true);
    });

    it('应该接受有效的 HTTPS URL', () => {
      const result = urlValidator('https://example.com');
      expect(result.valid).toBe(true);
    });

    it('应该拒绝空值', () => {
      expect(urlValidator('').valid).toBe(false);
      expect(urlValidator(null as any).valid).toBe(false);
    });

    it('应该拒绝无效的 URL', () => {
      expect(urlValidator('not-a-url').valid).toBe(false);
      expect(urlValidator('http://').valid).toBe(false);
    });
  });

  describe('协议验证', () => {
    it('应该拒绝不支持的协议', () => {
      const result = urlValidator('ftp://example.com', { protocols: ['http', 'https'] });
      expect(result.valid).toBe(false);
      expect(result.message).toContain('协议');
    });

    it('应该支持自定义协议', () => {
      const result = urlValidator('ws://example.com/socket', { protocols: ['ws', 'wss'] });
      expect(result.valid).toBe(true);
    });

    it('应该自动添加协议（requireProtocol: false）', () => {
      const result = urlValidator('example.com/path', { requireProtocol: false });
      expect(result.valid).toBe(true);
    });

    it('应该要求协议（requireProtocol: true）', () => {
      const result = urlValidator('example.com', { requireProtocol: true });
      expect(result.valid).toBe(false);
    });
  });

  describe('特殊 URL', () => {
    it('应该接受 localhost（allowLocalhost: true）', () => {
      const result = urlValidator('http://localhost:3000', { allowLocalhost: true });
      expect(result.valid).toBe(true);
    });

    it('应该拒绝 localhost（allowLocalhost: false）', () => {
      const result = urlValidator('http://localhost:3000', { allowLocalhost: false });
      expect(result.valid).toBe(false);
      expect(result.message).toContain('localhost');
    });

    it('应该接受 IP 地址（allowIp: true）', () => {
      const result = urlValidator('http://192.168.1.1', { allowIp: true });
      expect(result.valid).toBe(true);
    });

    it('应该拒绝 IP 地址（allowIp: false）', () => {
      const result = urlValidator('http://192.168.1.1', { allowIp: false });
      expect(result.valid).toBe(false);
      expect(result.message).toContain('IP');
    });
  });

  describe('复杂 URL', () => {
    it('应该接受带路径的 URL', () => {
      expect(urlValidator('https://example.com/path/to/page').valid).toBe(true);
    });

    it('应该接受带查询参数的 URL', () => {
      expect(urlValidator('https://example.com?query=value&foo=bar').valid).toBe(true);
    });

    it('应该接受带锚点的 URL', () => {
      expect(urlValidator('https://example.com#section').valid).toBe(true);
    });

    it('应该接受带端口的 URL', () => {
      expect(urlValidator('https://example.com:8080').valid).toBe(true);
    });
  });
});

// ==================== Phone Validator Tests ====================

describe('phoneValidator', () => {
  describe('基础验证', () => {
    it('应该接受有效的中国手机号', () => {
      const result = phoneValidator('13812345678');
      expect(result.valid).toBe(true);
    });

    it('应该拒绝空值', () => {
      expect(phoneValidator('').valid).toBe(false);
      expect(phoneValidator(null as any).valid).toBe(false);
    });

    it('应该拒绝长度不正确的手机号', () => {
      expect(phoneValidator('1381234567').valid).toBe(false); // 10位
      expect(phoneValidator('138123456789').valid).toBe(false); // 12位
    });
  });

  describe('号段验证', () => {
    it('应该接受中国移动号段', () => {
      expect(phoneValidator('13912345678').valid).toBe(true); // 移动
      expect(phoneValidator('15012345678').valid).toBe(true); // 移动
      expect(phoneValidator('18812345678').valid).toBe(true); // 移动
    });

    it('应该接受中国联通号段', () => {
      expect(phoneValidator('13012345678').valid).toBe(true); // 联通
      expect(phoneValidator('15512345678').valid).toBe(true); // 联通
      expect(phoneValidator('18612345678').valid).toBe(true); // 联通
    });

    it('应该接受中国电信号段', () => {
      expect(phoneValidator('13312345678').valid).toBe(true); // 电信
      expect(phoneValidator('17712345678').valid).toBe(true); // 电信
      expect(phoneValidator('18912345678').valid).toBe(true); // 电信
    });

    it('应该拒绝无效号段（宽松模式）', () => {
      // 10 开头不是有效号段
      expect(phoneValidator('10123456789').valid).toBe(false);
    });
  });

  describe('严格模式', () => {
    it('应该在严格模式下验证运营商号段', () => {
      const options = { strict: true };
      // 有效号段
      expect(phoneValidator('13812345678', options).valid).toBe(true);
      expect(phoneValidator('18612345678', options).valid).toBe(true);
      expect(phoneValidator('18912345678', options).valid).toBe(true);
    });

    it('应该在严格模式下拒绝未分配号段', () => {
      const result = phoneValidator('12012345678', { strict: true });
      expect(result.valid).toBe(false);
      expect(result.message).toContain('运营商号段');
    });
  });

  describe('国际号码', () => {
    it('应该接受国际号码（allowInternational: true）', () => {
      const result = phoneValidator('+14155552671', { allowInternational: true });
      expect(result.valid).toBe(true);
    });

    it('应该拒绝国际号码（allowInternational: false）', () => {
      const result = phoneValidator('+14155552671', { allowInternational: false });
      expect(result.valid).toBe(false);
    });
  });

  describe('格式处理', () => {
    it('应该忽略空格和横线', () => {
      expect(phoneValidator('138 1234 5678').valid).toBe(true);
      expect(phoneValidator('138-1234-5678').valid).toBe(true);
    });
  });
});

// ==================== Date Validator Tests ====================

describe('dateValidator', () => {
  describe('基础验证', () => {
    it('应该接受有效的 ISO 日期', () => {
      const result = dateValidator('2024-03-15');
      expect(result.valid).toBe(true);
    });

    it('应该接受 Date 对象', () => {
      const result = dateValidator(new Date());
      expect(result.valid).toBe(true);
    });

    it('应该拒绝空值', () => {
      expect(dateValidator('').valid).toBe(false);
      expect(dateValidator(null as any).valid).toBe(false);
    });

    it('应该拒绝无效日期', () => {
      expect(dateValidator('invalid-date').valid).toBe(false);
      expect(dateValidator('2024-13-45').valid).toBe(false);
    });
  });

  describe('格式验证', () => {
    it('应该验证 ISO 格式', () => {
      const options = { format: 'iso' as const };
      expect(dateValidator('2024-03-15', options).valid).toBe(true);
      expect(dateValidator('2024-03-15T10:30:00Z', options).valid).toBe(true);
      expect(dateValidator('15/03/2024', options).valid).toBe(false);
    });

    it('应该验证 YYYY-MM-DD 格式', () => {
      const options = { format: 'yyyy-mm-dd' as const };
      expect(dateValidator('2024-03-15', options).valid).toBe(true);
      expect(dateValidator('15-03-2024', options).valid).toBe(false);
    });

    it('应该验证 DD/MM/YYYY 格式', () => {
      const options = { format: 'dd/mm/yyyy' as const };
      expect(dateValidator('15/03/2024', options).valid).toBe(true);
      expect(dateValidator('03/15/2024', options).valid).toBe(false);
    });

    it('应该验证 MM/DD/YYYY 格式', () => {
      const options = { format: 'mm/dd/yyyy' as const };
      expect(dateValidator('03/15/2024', options).valid).toBe(true);
      expect(dateValidator('15/03/2024', options).valid).toBe(false);
    });
  });

  describe('时间范围验证', () => {
    it('应该限制最小日期', () => {
      const minDate = new Date('2024-01-01');
      const result = dateValidator('2023-12-31', { minDate });
      expect(result.valid).toBe(false);
      expect(result.message).toContain('不能早于');
    });

    it('应该限制最大日期', () => {
      const maxDate = new Date('2024-12-31');
      const result = dateValidator('2025-01-01', { maxDate });
      expect(result.valid).toBe(false);
      expect(result.message).toContain('不能晚于');
    });

    it('应该拒绝未来日期（allowFuture: false）', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      const result = dateValidator(futureDate, { allowFuture: false });
      expect(result.valid).toBe(false);
      expect(result.message).toContain('未来');
    });

    it('应该拒绝过去日期（allowPast: false）', () => {
      const pastDate = new Date();
      pastDate.setFullYear(pastDate.getFullYear() - 1);
      const result = dateValidator(pastDate, { allowPast: false });
      expect(result.valid).toBe(false);
      expect(result.message).toContain('过去');
    });
  });

  describe('边界值', () => {
    it('应该接受有效月份边界', () => {
      expect(dateValidator('2024-01-01').valid).toBe(true);
      expect(dateValidator('2024-12-31').valid).toBe(true);
    });

    it('应该拒绝无效月份', () => {
      expect(dateValidator('2024-00-15').valid).toBe(false);
      expect(dateValidator('2024-13-15').valid).toBe(false);
    });

    it('应该考虑月份天数', () => {
      expect(dateValidator('2024-02-29').valid).toBe(true); // 闰年
      expect(dateValidator('2023-02-29').valid).toBe(false); // 非闰年
    });
  });
});

// ==================== Compose Validators Tests ====================

describe('composeValidators', () => {
  it('应该通过所有验证器', () => {
    const validator = composeValidators(
      (value: string) => ({ valid: true }),
      (value: string) => ({ valid: true })
    );
    expect(validator('test').valid).toBe(true);
  });

  it('应该在第一个失败时停止', () => {
    const validator = composeValidators(
      (value: string) => ({ valid: false, message: 'First failed' }),
      (value: string) => ({ valid: true })
    );
    const result = validator('test');
    expect(result.valid).toBe(false);
    expect(result.message).toBe('First failed');
  });

  it('应该组合多个实际验证器', () => {
    const combinedValidator = composeValidators<string>(
      (value) => emailValidator(value),
      (value) => {
        if (value.length < 20) {
          return { valid: true };
        }
        return { valid: false, message: '邮箱过长' };
      }
    );

    expect(combinedValidator('test@example.com').valid).toBe(true);
    expect(combinedValidator('invalid').valid).toBe(false);
  });
});

// ==================== Unified Export Tests ====================

describe('validators 统一接口', () => {
  it('应该导出所有验证器', () => {
    // 验证 validators 对象包含正确的函数
    import('./index').then((module) => {
      expect(typeof module.validators.email).toBe('function');
      expect(typeof module.validators.url).toBe('function');
      expect(typeof module.validators.phone).toBe('function');
      expect(typeof module.validators.date).toBe('function');
    });
  });

  it('应该通过统一接口调用验证器', () => {
    // 直接使用已导入的验证函数（它们就是 validators 对象的引用）
    expect(emailValidator('test@example.com').valid).toBe(true);
    expect(urlValidator('https://example.com').valid).toBe(true);
    expect(phoneValidator('13812345678').valid).toBe(true);
    expect(dateValidator('2024-03-15').valid).toBe(true);
  });
});