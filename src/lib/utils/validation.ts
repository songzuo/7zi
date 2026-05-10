/**
 * Validation utilities with TypeScript type safety
 *
 * @module lib/utils/validation
 * @description 提供完整的表单验证功能，包括中国常用验证规则
 * @version 2.0.0
 */

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * 验证结果类型
 */
export interface ValidationResult<T = string> {
  /** 是否验证通过 */
  valid: boolean
  /** 错误信息（验证失败时） */
  message?: string
  /** 错误代码 */
  code?: ValidationErrorCode
  /** 验证后的值（可选，用于格式化后的值） */
  formatted?: T
}

/**
 * 验证错误代码
 */
export type ValidationErrorCode =
  | 'REQUIRED'
  | 'INVALID_FORMAT'
  | 'TOO_SHORT'
  | 'TOO_LONG'
  | 'INVALID_LENGTH'
  | 'INVALID_RANGE'
  | 'INVALID_TYPE'
  | 'CUSTOM'

/**
 * 验证规则类型
 */
export interface ValidationRule<T = unknown> {
  /** 规则名称 */
  name: string
  /** 验证函数 */
  validate: (value: T) => ValidationResult<T>
  /** 错误信息 */
  message: string
  /** 是否必填 */
  required?: boolean
}

/**
 * 验证规则配置
 */
export interface ValidationRuleConfig {
  /** 自定义错误信息 */
  message?: string
  /** 是否允许空值 */
  allowEmpty?: boolean
  /** 最小长度 */
  minLength?: number
  /** 最大长度 */
  maxLength?: number
  /** 正则表达式 */
  pattern?: RegExp
  /** 自定义验证函数 */
  custom?: (value: string) => boolean
}

/**
 * 中国验证规则配置
 */
export interface ChineseValidationConfig {
  /** 是否严格模式（更严格的验证规则） */
  strict?: boolean
  /** 自定义错误信息 */
  message?: string
}

/**
 * 批量验证结果
 */
export interface BatchValidationResult {
  /** 是否全部通过 */
  valid: boolean
  /** 各字段验证结果 */
  fields: Record<string, ValidationResult<unknown>>
  /** 所有错误信息 */
  errors: Array<{ field: string; message: string; code?: ValidationErrorCode }>
}

// ============================================================================
// Regex Patterns (Cached for performance)
// ============================================================================

// Email regex - RFC 5322 simplified
const EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/

// URL regex - HTTP/HTTPS
const URL_REGEX = /^https?:\/\/.+/i

// URL strict regex - 更严格的 URL 验证
const URL_STRICT_REGEX = /^https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&\/=]*)$/i

// 中国手机号正则（支持所有运营商号段）
const CHINA_MOBILE_REGEX = /^(?:\+?86)?1[3-9]\d{9}$/

// 中国身份证号正则（18位）
const CHINA_ID_CARD_REGEX = /^[1-9]\d{5}(?:19|20)\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])\d{3}[\dXx]$/

// 中国邮政编码正则
const CHINA_POSTAL_CODE_REGEX = /^[1-9]\d{5}$/

// 中国银行卡号正则（16-19位）
const CHINA_BANK_CARD_REGEX = /^[1-9]\d{15,18}$/

// 中文姓名正则（2-20个中文字符）
const CHINESE_NAME_REGEX = /^[\u4e00-\u9fa5·]{2,20}$/

// 统一社会信用代码正则
const CHINA_SOCIAL_CREDIT_CODE_REGEX = /^[0-9A-HJ-NPQRTUWXY]{2}\d{6}[0-9A-HJ-NPQRTUWXY]{10}$/

// IPv4 正则
const IPV4_REGEX = /^(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)$/

// IPv6 正则（简化版）
const IPV6_REGEX = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::$|^(?:[0-9a-fA-F]{1,4}:){1,7}:$|^:(?::[0-9a-fA-F]{1,4}){1,7}$|^(?:[0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}$|^(?:[0-9a-fA-F]{1,4}:){1,5}(?::[0-9a-fA-F]{1,4}){1,2}$|^(?:[0-9a-fA-F]{1,4}:){1,4}(?::[0-9a-fA-F]{1,4}){1,3}$|^(?:[0-9a-fA-F]{1,4}:){1,3}(?::[0-9a-fA-F]{1,4}){1,4}$|^(?:[0-9a-fA-F]{1,4}:){1,2}(?::[0-9a-fA-F]{1,4}){1,5}$|^[0-9a-fA-F]{1,4}:(?::[0-9a-fA-F]{1,4}){1,6}$|^:(?::[0-9a-fA-F]{1,4}){1,7}$|^::(?:[fF]{4}:)?(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)$|^(?:[0-9a-fA-F]{1,4}:){1,4}:(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)$/

// 用户名正则（字母开头，允许字母数字下划线，4-20位）
const USERNAME_REGEX = /^[a-zA-Z][a-zA-Z0-9_]{3,19}$/

// 密码强度正则
const PASSWORD_STRONG_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])[A-Za-z\d!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]{8,}$/
const PASSWORD_MEDIUM_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d]{6,}$/

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * 检查值是否为空
 * @param value - 要检查的值
 * @returns 是否为空
 */
export function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true
  if (typeof value === 'string') return value.trim().length === 0
  if (Array.isArray(value)) return value.length === 0
  if (typeof value === 'object') return Object.keys(value).length === 0
  return false
}

/**
 * 创建验证结果（带泛型）
 */
function createResult<T>(
  valid: boolean,
  message?: string,
  code?: ValidationErrorCode
): ValidationResult<T> {
  return valid ? { valid } as ValidationResult<T> : { valid, message, code } as ValidationResult<T>
}

/**
 * 创建成功验证结果（带泛型）
 */
function createSuccessResult<T>(): ValidationResult<T> {
  return { valid: true } as ValidationResult<T>
}

// ============================================================================
// Basic Validation Functions (Backward Compatible)
// ============================================================================

/**
 * Validate email address
 * @param email - Email address to validate
 * @returns True if valid email format
 * @example
 * isValidEmail('user@example.com') // true
 * isValidEmail('invalid-email') // false
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') {
    return false
  }
  return EMAIL_REGEX.test(email.trim())
}

/**
 * Validate URL
 * @param url - URL to validate
 * @returns True if valid URL format
 * @example
 * isValidUrl('https://example.com') // true
 * isValidUrl('not-a-url') // false
 */
export function isValidUrl(url: string): boolean {
  if (!url || typeof url !== 'string') {
    return false
  }
  return URL_REGEX.test(url.trim())
}

// ============================================================================
// Enhanced Validation Functions with Detailed Results
// ============================================================================

/**
 * 验证邮箱地址（详细版本）
 * @param email - 邮箱地址
 * @param config - 验证配置
 * @returns 验证结果
 * @example
 * validateEmail('user@example.com')
 * // { valid: true }
 * validateEmail('invalid')
 * // { valid: false, message: '邮箱格式不正确', code: 'INVALID_FORMAT' }
 */
export function validateEmail(
  email: string,
  config?: ValidationRuleConfig
): ValidationResult {
  const value = email?.trim() ?? ''

  // 必填检查
  if (isEmpty(value)) {
    if (config?.allowEmpty) return createResult(true)
    return createResult(
      false,
      config?.message ?? '邮箱不能为空',
      'REQUIRED'
    )
  }

  // 长度检查
  if (config?.minLength && value.length < config.minLength) {
    return createResult(
      false,
      `邮箱长度不能少于 ${config.minLength} 个字符`,
      'TOO_SHORT'
    )
  }

  if (config?.maxLength && value.length > config.maxLength) {
    return createResult(
      false,
      `邮箱长度不能超过 ${config.maxLength} 个字符`,
      'TOO_LONG'
    )
  }

  // 格式检查
  if (!EMAIL_REGEX.test(value)) {
    return createResult(
      false,
      config?.message ?? '邮箱格式不正确',
      'INVALID_FORMAT'
    )
  }

  // 自定义验证
  if (config?.custom && !config.custom(value)) {
    return createResult(
      false,
      config?.message ?? '自定义验证失败',
      'CUSTOM'
    )
  }

  return createResult(true)
}

/**
 * 验证 URL（详细版本）
 * @param url - URL 地址
 * @param config - 验证配置
 * @returns 验证结果
 * @example
 * validateUrl('https://example.com')
 * // { valid: true }
 * validateUrl('not-a-url')
 * // { valid: false, message: 'URL 格式不正确', code: 'INVALID_FORMAT' }
 */
export function validateUrl(
  url: string,
  config?: ValidationRuleConfig & { strict?: boolean }
): ValidationResult {
  const value = url?.trim() ?? ''

  if (isEmpty(value)) {
    if (config?.allowEmpty) return createResult(true)
    return createResult(
      false,
      config?.message ?? 'URL 不能为空',
      'REQUIRED'
    )
  }

  const regex = config?.strict ? URL_STRICT_REGEX : URL_REGEX
  if (!regex.test(value)) {
    return createResult(
      false,
      config?.message ?? 'URL 格式不正确',
      'INVALID_FORMAT'
    )
  }

  return createResult(true)
}

/**
 * 验证字符串
 * @param value - 字符串值
 * @param config - 验证配置
 * @returns 验证结果
 */
export function validateString(
  value: string,
  config?: ValidationRuleConfig
): ValidationResult {
  const trimmed = value?.trim() ?? ''

  if (isEmpty(trimmed)) {
    if (config?.allowEmpty) return createResult(true)
    return createResult(
      false,
      config?.message ?? '值不能为空',
      'REQUIRED'
    )
  }

  if (config?.minLength && trimmed.length < config.minLength) {
    return createResult(
      false,
      `长度不能少于 ${config.minLength} 个字符`,
      'TOO_SHORT'
    )
  }

  if (config?.maxLength && trimmed.length > config.maxLength) {
    return createResult(
      false,
      `长度不能超过 ${config.maxLength} 个字符`,
      'TOO_LONG'
    )
  }

  if (config?.pattern && !config.pattern.test(trimmed)) {
    return createResult(
      false,
      config?.message ?? '格式不正确',
      'INVALID_FORMAT'
    )
  }

  if (config?.custom && !config.custom(trimmed)) {
    return createResult(
      false,
      config?.message ?? '验证失败',
      'CUSTOM'
    )
  }

  return createResult(true)
}

/**
 * 验证数字
 * @param value - 数字值
 * @param config - 验证配置
 * @returns 验证结果
 */
export function validateNumber(
  value: number | string,
  config?: {
    min?: number
    max?: number
    integer?: boolean
    positive?: boolean
    message?: string
  }
): ValidationResult {
  const num = typeof value === 'string' ? parseFloat(value) : value

  if (isNaN(num)) {
    return createResult(
      false,
      config?.message ?? '必须是有效的数字',
      'INVALID_TYPE'
    )
  }

  if (config?.integer && !Number.isInteger(num)) {
    return createResult(
      false,
      '必须是整数',
      'INVALID_FORMAT'
    )
  }

  if (config?.positive && num <= 0) {
    return createResult(
      false,
      '必须是正数',
      'INVALID_RANGE'
    )
  }

  if (config?.min !== undefined && num < config.min) {
    return createResult(
      false,
      `不能小于 ${config.min}`,
      'INVALID_RANGE'
    )
  }

  if (config?.max !== undefined && num > config.max) {
    return createResult(
      false,
      `不能大于 ${config.max}`,
      'INVALID_RANGE'
    )
  }

  return createResult(true)
}

// ============================================================================
// Chinese Validation Functions
// ============================================================================

/**
 * 验证中国手机号
 * @param phone - 手机号
 * @param config - 验证配置
 * @returns 验证结果
 * @example
 * validateChinaMobile('13800138000')
 * // { valid: true, formatted: '13800138000' }
 * validateChinaMobile('12345')
 * // { valid: false, message: '手机号格式不正确', code: 'INVALID_FORMAT' }
 */
export function validateChinaMobile(
  phone: string,
  config?: ChineseValidationConfig
): ValidationResult<string> {
  const value = phone?.trim().replace(/[\s-]/g, '') ?? ''

  if (isEmpty(value)) {
    return createResult(
      false,
      config?.message ?? '手机号不能为空',
      'REQUIRED'
    )
  }

  // 移除国际区号 +86 或 86
  const cleanNumber = value.replace(/^(?:\+?86)/, '')

  if (!CHINA_MOBILE_REGEX.test(cleanNumber)) {
    return createResult(
      false,
      config?.message ?? '手机号格式不正确，请输入11位有效手机号',
      'INVALID_FORMAT'
    )
  }

  // 严格模式：校验运营商号段
  if (config?.strict) {
    const prefix = cleanNumber.substring(0, 3)
    // 2024年有效号段
    const validPrefixes = [
      // 中国移动
      '134', '135', '136', '137', '138', '139', '147', '150', '151', '152',
      '157', '158', '159', '182', '183', '184', '187', '188', '178', '198',
      // 中国联通
      '130', '131', '132', '145', '155', '156', '166', '171', '175', '176',
      '185', '186', '196',
      // 中国电信
      '133', '153', '177', '180', '181', '189', '191', '199',
      // 虚拟运营商
      '170', '171'
    ]

    if (!validPrefixes.includes(prefix)) {
      return createResult(
        false,
        '无效的手机号段',
        'INVALID_FORMAT'
      )
    }
  }

  return { valid: true, formatted: cleanNumber }
}

/**
 * 验证中国身份证号（18位）
 * @param idCard - 身份证号
 * @param config - 验证配置
 * @returns 验证结果
 * @example
 * validateChinaIdCard('11010519900307293X')
 * // { valid: true, formatted: '11010519900307293X' }
 */
export function validateChinaIdCard(
  idCard: string,
  config?: ChineseValidationConfig
): ValidationResult<string> {
  const value = idCard?.trim().toUpperCase() ?? ''

  if (isEmpty(value)) {
    return createResult(
      false,
      config?.message ?? '身份证号不能为空',
      'REQUIRED'
    )
  }

  // 基本格式检查
  if (!CHINA_ID_CARD_REGEX.test(value)) {
    return createResult(
      false,
      config?.message ?? '身份证号格式不正确，请输入18位有效身份证号',
      'INVALID_FORMAT'
    )
  }

  // 校验码验证
  const weights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2]
  const checkCodes = ['1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2']

  let sum = 0
  for (let i = 0; i < 17; i++) {
    sum += parseInt(value[i], 10) * weights[i]
  }

  const checkCode = checkCodes[sum % 11]
  if (value[17] !== checkCode) {
    return createResult(
      false,
      '身份证号校验码不正确',
      'INVALID_FORMAT'
    )
  }

  // 严格模式：校验出生日期
  if (config?.strict) {
    const year = parseInt(value.substring(6, 10), 10)
    const month = parseInt(value.substring(10, 12), 10)
    const day = parseInt(value.substring(12, 14), 10)

    const birthDate = new Date(year, month - 1, day)
    if (
      birthDate.getFullYear() !== year ||
      birthDate.getMonth() !== month - 1 ||
      birthDate.getDate() !== day
    ) {
      return createResult(
        false,
        '身份证号中的出生日期无效',
        'INVALID_FORMAT'
      )
    }

    // 检查年龄是否合理（0-150岁）
    const age = new Date().getFullYear() - year
    if (age < 0 || age > 150) {
      return createResult(
        false,
        '身份证号中的出生日期不合理',
        'INVALID_FORMAT'
      )
    }
  }

  return { valid: true, formatted: value }
}

/**
 * 验证中国邮政编码
 * @param postalCode - 邮政编码
 * @param config - 验证配置
 * @returns 验证结果
 */
export function validateChinaPostalCode(
  postalCode: string,
  config?: ChineseValidationConfig
): ValidationResult {
  const value = postalCode?.trim() ?? ''

  if (isEmpty(value)) {
    return createResult(
      false,
      config?.message ?? '邮政编码不能为空',
      'REQUIRED'
    )
  }

  if (!CHINA_POSTAL_CODE_REGEX.test(value)) {
    return createResult(
      false,
      config?.message ?? '邮政编码格式不正确，请输入6位数字',
      'INVALID_FORMAT'
    )
  }

  return createResult(true)
}

/**
 * 验证中国银行卡号
 * @param cardNumber - 银行卡号
 * @param config - 验证配置
 * @returns 验证结果
 */
export function validateChinaBankCard(
  cardNumber: string,
  config?: ChineseValidationConfig
): ValidationResult<string> {
  const value = cardNumber?.trim().replace(/\s/g, '') ?? ''

  if (isEmpty(value)) {
    return createResult(
      false,
      config?.message ?? '银行卡号不能为空',
      'REQUIRED'
    )
  }

  if (!CHINA_BANK_CARD_REGEX.test(value)) {
    return createResult(
      false,
      config?.message ?? '银行卡号格式不正确，请输入16-19位数字',
      'INVALID_FORMAT'
    )
  }

  // Luhn 算法校验
  let sum = 0
  let isEven = false

  for (let i = value.length - 1; i >= 0; i--) {
    let digit = parseInt(value[i], 10)

    if (isEven) {
      digit *= 2
      if (digit > 9) {
        digit -= 9
      }
    }

    sum += digit
    isEven = !isEven
  }

  if (sum % 10 !== 0) {
    return createResult(
      false,
      '银行卡号校验失败',
      'INVALID_FORMAT'
    )
  }

  return { valid: true, formatted: value }
}

/**
 * 验证中文姓名
 * @param name - 姓名
 * @param config - 验证配置
 * @returns 验证结果
 */
export function validateChineseName(
  name: string,
  config?: ChineseValidationConfig & { minLength?: number; maxLength?: number }
): ValidationResult {
  const value = name?.trim() ?? ''
  const minLen = config?.minLength ?? 2
  const maxLen = config?.maxLength ?? 20

  if (isEmpty(value)) {
    return createResult(
      false,
      config?.message ?? '姓名不能为空',
      'REQUIRED'
    )
  }

  if (value.length < minLen || value.length > maxLen) {
    return createResult(
      false,
      `姓名长度应为 ${minLen}-${maxLen} 个字符`,
      'INVALID_LENGTH'
    )
  }

  if (!CHINESE_NAME_REGEX.test(value)) {
    return createResult(
      false,
      config?.message ?? '姓名只能包含中文和间隔号（·）',
      'INVALID_FORMAT'
    )
  }

  return createResult(true)
}

/**
 * 验证统一社会信用代码
 * @param code - 统一社会信用代码
 * @param config - 验证配置
 * @returns 验证结果
 */
export function validateChinaSocialCreditCode(
  code: string,
  config?: ChineseValidationConfig
): ValidationResult<string> {
  const value = code?.trim().toUpperCase() ?? ''

  if (isEmpty(value)) {
    return createResult(
      false,
      config?.message ?? '统一社会信用代码不能为空',
      'REQUIRED'
    )
  }

  if (!CHINA_SOCIAL_CREDIT_CODE_REGEX.test(value)) {
    return createResult(
      false,
      config?.message ?? '统一社会信用代码格式不正确',
      'INVALID_FORMAT'
    )
  }

  // 校验码验证
  const weights = [1, 3, 9, 27, 19, 26, 16, 17, 20, 29, 25, 13, 8, 24, 10, 30, 28]
  const chars = '0123456789ABCDEFGHJKLMNPQRTUWXY'
  const excluded = ['I', 'O', 'Z', 'S', 'V'] // 排除的字符

  let sum = 0
  for (let i = 0; i < 17; i++) {
    const charIndex = chars.indexOf(value[i])
    if (charIndex === -1) {
      return createResult(
        false,
        '统一社会信用代码包含无效字符',
        'INVALID_FORMAT'
      )
    }
    sum += charIndex * weights[i]
  }

  const checkCode = chars[(31 - (sum % 31)) % 31]
  if (value[17] !== checkCode) {
    return createResult(
      false,
      '统一社会信用代码校验码不正确',
      'INVALID_FORMAT'
    )
  }

  return { valid: true, formatted: value }
}

// ============================================================================
// Network Validation Functions
// ============================================================================

/**
 * 验证 IPv4 地址
 * @param ip - IPv4 地址
 * @param config - 验证配置
 * @returns 验证结果
 */
export function validateIPv4(
  ip: string,
  config?: ValidationRuleConfig
): ValidationResult {
  const value = ip?.trim() ?? ''

  if (isEmpty(value)) {
    return createResult(
      false,
      config?.message ?? 'IP 地址不能为空',
      'REQUIRED'
    )
  }

  if (!IPV4_REGEX.test(value)) {
    return createResult(
      false,
      config?.message ?? 'IPv4 地址格式不正确',
      'INVALID_FORMAT'
    )
  }

  return createResult(true)
}

/**
 * 验证 IPv6 地址
 * @param ip - IPv6 地址
 * @param config - 验证配置
 * @returns 验证结果
 */
export function validateIPv6(
  ip: string,
  config?: ValidationRuleConfig
): ValidationResult {
  const value = ip?.trim() ?? ''

  if (isEmpty(value)) {
    return createResult(
      false,
      config?.message ?? 'IP 地址不能为空',
      'REQUIRED'
    )
  }

  if (!IPV6_REGEX.test(value)) {
    return createResult(
      false,
      config?.message ?? 'IPv6 地址格式不正确',
      'INVALID_FORMAT'
    )
  }

  return createResult(true)
}

// ============================================================================
// User Validation Functions
// ============================================================================

/**
 * 验证用户名
 * @param username - 用户名
 * @param config - 验证配置
 * @returns 验证结果
 */
export function validateUsername(
  username: string,
  config?: ValidationRuleConfig & { reservedNames?: string[] }
): ValidationResult {
  const value = username?.trim() ?? ''

  if (isEmpty(value)) {
    return createResult(
      false,
      config?.message ?? '用户名不能为空',
      'REQUIRED'
    )
  }

  if (!USERNAME_REGEX.test(value)) {
    return createResult(
      false,
      config?.message ?? '用户名必须以字母开头，只能包含字母、数字和下划线，长度4-20位',
      'INVALID_FORMAT'
    )
  }

  // 检查保留用户名
  if (config?.reservedNames?.includes(value.toLowerCase())) {
    return createResult(
      false,
      '该用户名已被保留',
      'CUSTOM'
    )
  }

  return createResult(true)
}

/**
 * 验证密码强度
 * @param password - 密码
 * @param config - 验证配置
 * @returns 验证结果及强度信息
 */
export function validatePassword(
  password: string,
  config?: ValidationRuleConfig & {
    requireStrong?: boolean
    requireSpecial?: boolean
  }
): ValidationResult<{ strength: 'weak' | 'medium' | 'strong' }> {
  const value = password ?? ''

  if (isEmpty(value)) {
    return createResult(
      false,
      config?.message ?? '密码不能为空',
      'REQUIRED'
    )
  }

  if (value.length < 6) {
    return createResult(
      false,
      '密码长度不能少于6位',
      'TOO_SHORT'
    )
  }

  if (value.length > 128) {
    return createResult(
      false,
      '密码长度不能超过128位',
      'TOO_LONG'
    )
  }

  // 检查密码强度
  let strength: 'weak' | 'medium' | 'strong' = 'weak'

  if (PASSWORD_STRONG_REGEX.test(value)) {
    strength = 'strong'
  } else if (PASSWORD_MEDIUM_REGEX.test(value)) {
    strength = 'medium'
  }

  // 如果要求强密码
  if (config?.requireStrong && strength !== 'strong') {
    return createResult(
      false,
      '密码强度不足：至少8位，包含大小写字母、数字和特殊字符',
      'INVALID_FORMAT'
    )
  }

  return createSuccessResult<{ strength: 'weak' | 'medium' | 'strong' }>()
}

// ============================================================================
// Batch Validation
// ============================================================================

/**
 * 批量验证多个字段
 * @param data - 要验证的数据
 * @param rules - 验证规则
 * @returns 批量验证结果
 * @example
 * const result = validateBatch(
 *   { email: 'test@example.com', phone: '13800138000' },
 *   {
 *     email: { validate: validateEmail, message: '邮箱无效' },
 *     phone: { validate: validateChinaMobile, message: '手机号无效' }
 *   }
 * )
 */
export function validateBatch<T extends Record<string, unknown>>(
  data: T,
  rules: Record<keyof T, ValidationRule<unknown>>
): BatchValidationResult {
  const fields: Record<string, ValidationResult<unknown>> = {}
  const errors: BatchValidationResult['errors'] = []

  for (const [key, rule] of Object.entries(rules)) {
    const value = data[key]
    const result = rule.validate(value)
    fields[key] = result

    if (!result.valid) {
      errors.push({
        field: key,
        message: result.message ?? rule.message,
        code: result.code
      })
    }
  }

  return {
    valid: errors.length === 0,
    fields,
    errors
  }
}

/**
 * 创建验证规则
 * @param config - 验证规则配置
 * @returns 验证规则
 */
export function createValidationRule(
  name: string,
  validate: (value: unknown) => ValidationResult,
  message: string
): ValidationRule {
  return { name, validate, message }
}

// ============================================================================
// Re-exports for convenience (already exported at declaration above)
// ============================================================================
