/**
 * Validation Utility Functions
 *
 * 提供通用的数据验证和格式化函数
 */

// ============================================================================
// Core Validation Patterns (统一的正则表达式模式)
// ============================================================================

const PATTERNS = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phoneCN: /^1[3-9]\d{9}$/,
  username: /^[a-zA-Z0-9_]{3,20}$/,
  uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  ipv4: /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
  hexColor: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
} as const;

// ============================================================================
// Core Validation Helpers (核心验证工具函数)
// ============================================================================

/**
 * 通用正则表达式验证
 * @param value 待验证的字符串
 * @param pattern 正则表达式或预定义的模式名称
 * @returns 是否匹配
 */
export function matchesPattern(
  value: string,
  pattern: RegExp | keyof typeof PATTERNS
): boolean {
  const regex = typeof pattern === 'string' ? PATTERNS[pattern] : pattern;
  return regex.test(value);
}

/**
 * 验证范围（数字或长度）
 * @param value 待验证的值
 * @param min 最小值
 * @param max 最大值
 * @returns 是否在范围内
 */
export function isInRange(value: number, min: number, max: number): boolean;
export function isInRange(value: string, min: number, max: number): boolean;
export function isInRange(value: number | string, min: number, max: number): boolean {
  const num = typeof value === 'string' ? value.length : value;
  return num >= min && num <= max;
}

/**
 * 检查字符串是否包含指定字符集
 * @param value 待验证的字符串
 * @param patterns 正则表达式数组
 * @param requiredCount 需要匹配的最少模式数（默认所有）
 * @returns 是否包含足够的字符集
 */
export function containsPatterns(
  value: string,
  patterns: RegExp[],
  requiredCount?: number
): boolean {
  const matchedCount = patterns.filter(p => p.test(value)).length;
  return matchedCount >= (requiredCount ?? patterns.length);
}

/**
 * 验证日期有效性
 * @param date 日期字符串或 Date 对象
 * @returns 是否为有效日期
 */
export function isValidDate(date: unknown): boolean {
  if (typeof date !== 'string' && !(date instanceof Date)) {
    return false;
  }
  const d = typeof date === 'string' ? new Date(date) : date;
  return !isNaN(d.getTime());
}

// ============================================================================
// Format-Specific Validators (基于核心工具的格式验证函数)
// ============================================================================

/**
 * 验证电子邮件地址
 */
export function isValidEmail(email: string): boolean {
  return matchesPattern(email, 'email');
}

/**
 * 验证 URL
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * 验证手机号码（中国大陆）
 */
export function isValidPhoneNumber(phone: string): boolean {
  return matchesPattern(phone, 'phoneCN');
}

/**
 * 验证密码强度
 * 至少8位，包含字母和数字
 */
export function isStrongPassword(password: string): boolean {
  return (
    isInRange(password, 8, Infinity) &&
    containsPatterns(password, [/[a-zA-Z]/, /[0-9]/])
  );
}

/**
 * 验证用户名
 * 3-20个字符，只允许字母、数字、下划线
 */
export function isValidUsername(username: string): boolean {
  return matchesPattern(username, 'username');
}

/**
 * 验证文件扩展名
 */
export function isValidFileExtension(filename: string, allowedExtensions: string[]): boolean {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  return allowedExtensions.map(e => e.toLowerCase()).includes(ext);
}

/**
 * 验证字符串长度（isInRange 的别名，语义更明确）
 */
export const isValidLength = isInRange;

/**
 * 验证是否为空或空白
 */
export function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) {
    return true;
  }
  if (typeof value === 'string' && value.trim() === '') {
    return true;
  }
  if (Array.isArray(value) && value.length === 0) {
    return true;
  }
  if (typeof value === 'object' && Object.keys(value).length === 0) {
    return true;
  }
  return false;
}

/**
 * 验证 JSON 字符串
 */
export function isValidJson(json: string): boolean {
  try {
    JSON.parse(json);
    return true;
  } catch {
    return false;
  }
}

/**
 * 验证 UUID 格式
 */
export function isValidUuid(uuid: string): boolean {
  return matchesPattern(uuid, 'uuid');
}

/**
 * 验证 IP 地址（IPv4）
 */
export function isValidIPv4(ip: string): boolean {
  return matchesPattern(ip, 'ipv4');
}

/**
 * 验证十六进制颜色代码
 */
export function isValidHexColor(color: string): boolean {
  return matchesPattern(color, 'hexColor');
}

/**
 * 验证正则表达式
 */
export function isValidRegex(pattern: string): boolean {
  try {
    new RegExp(pattern);
    return true;
  } catch {
    return false;
  }
}

/**
 * 验证对象字段
 */
export function validateObject<T extends Record<string, unknown>>(
  obj: T,
  rules: {
    [K in keyof T]?: (value: T[K]) => boolean | string;
  }
): { valid: boolean; errors: Partial<Record<keyof T, string>> } {
  const errors: Partial<Record<keyof T, string>> = {};
  let valid = true;

  for (const [key, rule] of Object.entries(rules)) {
    if (rule) {
      const result = rule(obj[key as keyof T]);
      if (result !== true) {
        valid = false;
        errors[key as keyof T] = typeof result === 'string' ? result : `${String(key)} validation failed`;
      }
    }
  }

  return { valid, errors };
}

/**
 * 清理 HTML 内容（基础版本，使用 DOM API）
 * 注意：对于更安全的 HTML 清理，建议使用 validation-schemas.ts 中的 sanitizeHtml
 */
export function sanitizeHtmlBasic(html: string): string {
  const temp = document.createElement('div');
  temp.textContent = html;
  return temp.innerHTML;
}

/**
 * 验证并截断字符串
 */
export function truncateString(value: string, maxLength: number, suffix = '...'): string {
  if (value.length <= maxLength) {
    return value;
  }
  return value.substring(0, maxLength - suffix.length) + suffix;
}

/**
 * 验证并格式化电话号码
 */
export function formatPhoneNumber(phone: string): string | null {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length !== 11) {
    return null;
  }
  return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}-${cleaned.slice(7)}`;
}

// ============================================================================
// Re-exports (重导出 patterns 供 validation-schemas.ts 使用)
// ============================================================================

/**
 * 导出所有正则模式，供其他模块复用
 */
export { PATTERNS };

/**
 * 类型导出：模式名称
 */
export type PatternName = keyof typeof PATTERNS;
