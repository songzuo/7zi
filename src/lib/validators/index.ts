/**
 * Validators Module
 * 验证工具模块 - 提供常用的数据验证函数
 */

// ==================== Types ====================

export interface ValidationResult {
  valid: boolean;
  message?: string;
}

export type ValidatorFn<T = string> = (value: T) => ValidationResult;

export interface EmailValidatorOptions {
  allowPlusSign?: boolean;
  allowSubdomain?: boolean;
  maxLength?: number;
}

export interface UrlValidatorOptions {
  protocols?: string[];
  requireProtocol?: boolean;
  allowLocalhost?: boolean;
  allowIp?: boolean;
}

export interface PhoneValidatorOptions {
  strict?: boolean;
  allowInternational?: boolean;
}

export interface DateValidatorOptions {
  format?: 'iso' | 'yyyy-mm-dd' | 'dd/mm/yyyy' | 'mm/dd/yyyy' | 'any';
  minDate?: Date;
  maxDate?: Date;
  allowFuture?: boolean;
  allowPast?: boolean;
}

// ==================== Helpers ====================

function success(): ValidationResult {
  return { valid: true };
}

function failure(message: string): ValidationResult {
  return { valid: false, message };
}

// ==================== Email Validator ====================

/**
 * 验证邮箱格式
 * @param email - 待验证的邮箱地址
 * @param options - 验证选项
 * @returns 验证结果
 */
export function emailValidator(
  email: string,
  options: EmailValidatorOptions = {}
): ValidationResult {
  const {
    allowPlusSign = true,
    allowSubdomain = true,
    maxLength = 254,
  } = options;

  if (!email || typeof email !== 'string') {
    return failure('邮箱地址不能为空');
  }

  if (email.length > maxLength) {
    return failure(`邮箱地址长度不能超过 ${maxLength} 个字符`);
  }

  // 基础邮箱正则
  // local-part: 字母、数字、点、下划线、减号（可选加号）
  // domain: 字母、数字、减号、点（子域名）
  const localPart = allowPlusSign
    ? '[a-zA-Z0-9._%+-]+'
    : '[a-zA-Z0-9._%-]+';
  
  const domain = allowSubdomain
    ? '[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*'
    : '[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\\.[a-zA-Z]{2,}';

  const emailRegex = new RegExp(`^${localPart}@${domain}$`);

  if (!emailRegex.test(email)) {
    return failure('邮箱格式不正确');
  }

  // 检查 local part 长度 (RFC 5321)
  const [local] = email.split('@');
  if (local.length > 64) {
    return failure('邮箱用户名部分不能超过 64 个字符');
  }

  // 检查连续的点（RFC 不允许）
  if (/\.\./.test(email.split('@')[0])) {
    return failure('邮箱用户名部分不能包含连续的点');
  }

  return success();
}

// ==================== URL Validator ====================

/**
 * 验证 URL 格式
 * @param url - 待验证的 URL
 * @param options - 验证选项
 * @returns 验证结果
 */
export function urlValidator(
  url: string,
  options: UrlValidatorOptions = {}
): ValidationResult {
  const {
    protocols = ['http', 'https'],
    requireProtocol = true,
    allowLocalhost = true,
    allowIp = true,
  } = options;

  if (!url || typeof url !== 'string') {
    return failure('URL 不能为空');
  }

  if (url.length > 2048) {
    return failure('URL 长度不能超过 2048 个字符');
  }

  try {
    let parsedUrl: URL;

    // 如果不要求协议，尝试添加 http://
    if (!requireProtocol && !url.match(/^https?:\/\//i)) {
      parsedUrl = new URL(`http://${url}`);
    } else {
      parsedUrl = new URL(url);
    }

    // 检查协议
    const protocol = parsedUrl.protocol.replace(':', '').toLowerCase();
    if (!protocols.includes(protocol)) {
      return failure(`URL 必须使用 ${protocols.join(' 或 ')} 协议`);
    }

    // 检查是否为 localhost
    if (!allowLocalhost && isLocalhost(parsedUrl.hostname)) {
      return failure('不允许使用 localhost');
    }

    // 检查是否为 IP 地址
    if (!allowIp && isIpAddress(parsedUrl.hostname)) {
      return failure('不允许使用 IP 地址');
    }

    return success();
  } catch (error) {
    return failure('URL 格式不正确');
  }
}

function isLocalhost(hostname: string): boolean {
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '::1' ||
    hostname.endsWith('.localhost')
  );
}

function isIpAddress(hostname: string): boolean {
  // IPv4
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  // IPv6 (简化版)
  const ipv6Regex = /^(\[)?[0-9a-fA-F:]+(\])?$/;
  
  return ipv4Regex.test(hostname) || ipv6Regex.test(hostname);
}

// ==================== Phone Validator ====================

/**
 * 验证手机号（中国格式）
 * @param phone - 待验证的手机号
 * @param options - 验证选项
 * @returns 验证结果
 */
export function phoneValidator(
  phone: string,
  options: PhoneValidatorOptions = {}
): ValidationResult {
  const { strict = false, allowInternational = false } = options;

  if (!phone || typeof phone !== 'string') {
    return failure('手机号不能为空');
  }

  // 移除空格和横线
  const cleanedPhone = phone.replace(/[\s-]/g, '');

  // 国际格式检查
  if (allowInternational && cleanedPhone.startsWith('+')) {
    // 国际号码格式：+国家码号码
    const internationalRegex = /^\+[1-9]\d{6,14}$/;
    if (!internationalRegex.test(cleanedPhone)) {
      return failure('国际号码格式不正确');
    }
    return success();
  }

  // 中国手机号正则
  // 严格模式：精确匹配运营商号段
  // 宽松模式：1开头，11位数字
  let phoneRegex: RegExp;
  
  if (strict) {
    // 中国三大运营商号段（截至2024年）
    // 中国移动：134-139, 147, 150-152, 157-159, 172, 178, 182-184, 187-189, 195, 197, 198
    // 中国联通：130-132, 145, 155-156, 166, 175-176, 185-186, 196
    // 中国电信：133, 149, 153, 173-174, 177, 180-181, 189, 190, 191, 193, 199
    phoneRegex = /^1(3[0-9]|4[579]|5[0-27-9]|66|7[2-8]|8[0-9]|9[0135-9])\d{8}$/;
  } else {
    phoneRegex = /^1[3-9]\d{9}$/;
  }

  if (!phoneRegex.test(cleanedPhone)) {
    if (strict) {
      return failure('手机号格式不正确（不匹配运营商号段）');
    }
    return failure('手机号格式不正确（应为1开头的11位数字）');
  }

  return success();
}

// ==================== Date Validator ====================

/**
 * 验证日期格式
 * @param date - 待验证的日期字符串或 Date 对象
 * @param options - 验证选项
 * @returns 验证结果
 */
export function dateValidator(
  date: string | Date,
  options: DateValidatorOptions = {}
): ValidationResult {
  const {
    format = 'any',
    minDate,
    maxDate,
    allowFuture = true,
    allowPast = true,
  } = options;

  if (!date) {
    return failure('日期不能为空');
  }

  let parsedDate: Date;

  // 解析日期
  if (date instanceof Date) {
    parsedDate = date;
  } else if (typeof date === 'string') {
    // 根据格式解析
    switch (format) {
      case 'iso':
        if (!isValidISODate(date)) {
          return failure('日期格式应为 ISO 8601 格式 (YYYY-MM-DDTHH:mm:ss.sssZ)');
        }
        parsedDate = new Date(date);
        break;

      case 'yyyy-mm-dd':
        if (!isValidYMD(date)) {
          return failure('日期格式应为 YYYY-MM-DD');
        }
        parsedDate = new Date(date);
        break;

      case 'dd/mm/yyyy':
        if (!isValidDMY(date)) {
          return failure('日期格式应为 DD/MM/YYYY');
        }
        const [day, month, year] = date.split('/').map(Number);
        parsedDate = new Date(year, month - 1, day);
        break;

      case 'mm/dd/yyyy':
        if (!isValidMDY(date)) {
          return failure('日期格式应为 MM/DD/YYYY');
        }
        const [m, d, y] = date.split('/').map(Number);
        parsedDate = new Date(y, m - 1, d);
        break;

      case 'any':
      default:
        // 尝试解析常见格式
        const parsed = parseAnyFormat(date);
        if (parsed) {
          parsedDate = new Date(parsed.year, parsed.month - 1, parsed.day);
          // 检查日期是否合理
          const daysInMonth = new Date(parsed.year, parsed.month, 0).getDate();
          if (parsed.day > daysInMonth) {
            return failure('无效的日期（日期超出月份范围）');
          }
        } else {
          // 对于无法识别的格式，尝试直接解析
          parsedDate = new Date(date);
          // 如果直接解析也失败，则返回无效
          if (isNaN(parsedDate.getTime())) {
            return failure('无效的日期');
          }
        }
        break;
    }
  } else {
    return failure('无效的日期输入');
  }

  // 检查是否为有效日期
  if (isNaN(parsedDate.getTime())) {
    return failure('无效的日期');
  }

  // 对于字符串输入，检查日期是否合理（如 Feb 29 在非闰年）
  if (typeof date === 'string' && format !== 'any') {
    // 根据格式解析年月日进行验证
    const dateValues = extractDateValues(date, format);
    if (dateValues) {
      const { year, month, day } = dateValues;
      const daysInMonth = new Date(year, month, 0).getDate();
      if (day > daysInMonth) {
        return failure('无效的日期（日期超出月份范围）');
      }
    }
  }

  // 检查时间范围
  const now = new Date();

  if (!allowFuture && parsedDate > now) {
    return failure('不允许使用未来的日期');
  }

  if (!allowPast && parsedDate < now) {
    return failure('不允许使用过去的日期');
  }

  if (minDate && parsedDate < minDate) {
    return failure(`日期不能早于 ${minDate.toLocaleDateString()}`);
  }

  if (maxDate && parsedDate > maxDate) {
    return failure(`日期不能晚于 ${maxDate.toLocaleDateString()}`);
  }

  return success();
}

// Date format helpers
function isValidISODate(date: string): boolean {
  // ISO 8601: YYYY-MM-DD 或 YYYY-MM-DDTHH:mm:ss.sssZ
  const isoRegex = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?(Z|[+-]\d{2}:\d{2})?)?$/;
  return isoRegex.test(date);
}

function isValidYMD(date: string): boolean {
  const ymdRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!ymdRegex.test(date)) return false;
  
  const [year, month, day] = date.split('-').map(Number);
  return isValidDateValues(year, month, day);
}

function isValidDMY(date: string): boolean {
  const dmyRegex = /^\d{2}\/\d{2}\/\d{4}$/;
  if (!dmyRegex.test(date)) return false;
  
  const [day, month, year] = date.split('/').map(Number);
  return isValidDateValues(year, month, day);
}

function isValidMDY(date: string): boolean {
  const mdyRegex = /^\d{2}\/\d{2}\/\d{4}$/;
  if (!mdyRegex.test(date)) return false;
  
  const [month, day, year] = date.split('/').map(Number);
  return isValidDateValues(year, month, day);
}

function isValidDateValues(year: number, month: number, day: number): boolean {
  if (year < 1 || year > 9999) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  
  // 检查每月的天数
  const daysInMonth = new Date(year, month, 0).getDate();
  if (day > daysInMonth) return false;
  
  return true;
}

function extractDateValues(
  date: string,
  format: string
): { year: number; month: number; day: number } | null {
  try {
    switch (format) {
      case 'yyyy-mm-dd': {
        const [year, month, day] = date.split('-').map(Number);
        return { year, month, day };
      }
      case 'dd/mm/yyyy': {
        const [day, month, year] = date.split('/').map(Number);
        return { year, month, day };
      }
      case 'mm/dd/yyyy': {
        const [month, day, year] = date.split('/').map(Number);
        return { year, month, day };
      }
      default:
        return null;
    }
  } catch {
    return null;
  }
}

function parseAnyFormat(
  date: string
): { year: number; month: number; day: number } | null {
  // 尝试 YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const [year, month, day] = date.split('-').map(Number);
    // 验证月份和日期范围
    if (month < 1 || month > 12) return null;
    if (day < 1 || day > 31) return null;
    return { year, month, day };
  }
  // 尝试 DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(date)) {
    const [day, month, year] = date.split('/').map(Number);
    // 验证月份和日期范围
    if (month < 1 || month > 12) return null;
    if (day < 1 || day > 31) return null;
    return { year, month, day };
  }
  return null;
}

// ==================== Combined Validator ====================

/**
 * 创建组合验证器
 * @param validators - 验证函数数组
 * @returns 组合验证函数
 */
export function composeValidators<T>(
  ...validators: ValidatorFn<T>[]
): ValidatorFn<T> {
  return (value: T): ValidationResult => {
    for (const validator of validators) {
      const result = validator(value);
      if (!result.valid) {
        return result;
      }
    }
    return success();
  };
}

// ==================== Unified Export ====================

export const validators = {
  email: emailValidator,
  url: urlValidator,
  phone: phoneValidator,
  date: dateValidator,
};

export default validators;