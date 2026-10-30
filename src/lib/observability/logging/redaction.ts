/**
 * Redaction - 敏感信息脱敏
 *
 * 可观测性链路（logs / spans / metric tags）落盘前必须脱敏。
 * 本仓库 2026-10 发生过 PAT 明文落盘事故，硬性要求：
 * token / 口令 / apiKey / 手机号 一律不得原样出现在日志里。
 *
 * 脱敏策略：
 * 1. **按字段名**：key 命中敏感词 → 整个值替换为 `[REDACTED]`
 * 2. **按值形态**：字符串里出现 token / PAT / JWT / 手机号 / `key=value` 赋值 → 就地替换
 *
 * @version v1.11.0
 */

/** 脱敏后的固定占位符 */
export const REDACTED = '[REDACTED]'

/** 深度保护：超过该深度的对象整体替换 */
const MAX_DEPTH = 8

/**
 * 敏感字段名（大小写不敏感，忽略 `-` / `_` / 空格 分隔）
 */
const SENSITIVE_KEY_PATTERNS: RegExp[] = [
  // token 类
  /token/i,
  /authorization/i,
  /bearer/i,
  /credential/i,
  /cookie/i,
  /session[-_ ]?id/i,
  // 口令类
  /pass(word|wd)?/i,
  /pwd/i,
  /passphrase/i,
  /口令/,
  /密码/,
  // apiKey / secret 类
  /api[-_ ]?key/i,
  /apikey/i,
  /access[-_ ]?key/i,
  /secret/i,
  /private[-_ ]?key/i,
  /client[-_ ]?secret/i,
  /密钥/,
  // 手机号类
  /phone/i,
  /mobile/i,
  /tel(ephone)?/i,
  /手机号/,
  /手机/,
  /电话/,
]

/**
 * 值形态：敏感赋值（`token=xxx` / `password: xxx`）
 * 只替换右值，保留键名，方便排障时知道「这里有个敏感字段」。
 */
const SECRET_ASSIGNMENT_PATTERNS: RegExp[] = [
  /(password|passwd|pwd|passphrase|secret|api[-_]?key|apikey|access[-_]?key|access[-_]?token|refresh[-_]?token|auth[-_]?token|id[-_]?token|token|authorization|credential|client[-_]?secret|private[-_]?key|口令|密码|密钥)\s*[:=]\s*("?)([^\s"',;}]+)\2/gi,
]

/**
 * 值形态：明确的凭证格式
 */
const SECRET_VALUE_PATTERNS: RegExp[] = [
  // GitHub PAT: ghp_ / gho_ / ghu_ / ghs_ / ghr_ / github_pat_
  /\b(?:gh[pousr]_[A-Za-z0-9]{16,}|github_pat_[A-Za-z0-9_]{20,})\b/g,
  // JWT
  /\beyJ[A-Za-z0-9_-]{4,}\.[A-Za-z0-9_-]{4,}\.[A-Za-z0-9_-]{4,}\b/g,
  // OpenAI 风格 key
  /\bsk-[A-Za-z0-9_-]{16,}\b/g,
  // Bearer 头
  /\bBearer\s+[A-Za-z0-9._~+/=-]{8,}/gi,
  // AWS Access Key ID
  /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g,
]

/**
 * 值形态：手机号
 * - 中国大陆手机号：1 开头 11 位
 * - 带国际区号 / 空格 / 横线 的通用写法
 */
const PHONE_VALUE_PATTERNS: RegExp[] = [
  /(?<![\d\-])\+?86[\s-]?1[3-9]\d{9}(?![\d\-])/g,
  /(?<![\d\-])1[3-9]\d{9}(?![\d\-])/g,
  // 带分隔符的通用写法（必须有分隔符，避免误伤普通数字 ID）
  /(?<![\d\-])\+?\d{1,3}[\s.-]\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}(?![\d\-])/g,
]

/**
 * 判断字段名是否敏感
 */
export function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEY_PATTERNS.some(pattern => pattern.test(key))
}

/**
 * 对单个字符串做值形态脱敏
 */
export function redactString(value: string): string {
  let result = value

  for (const pattern of SECRET_ASSIGNMENT_PATTERNS) {
    result = result.replace(pattern, (_match, key: string) => `${key}=${REDACTED}`)
  }

  for (const pattern of SECRET_VALUE_PATTERNS) {
    result = result.replace(pattern, REDACTED)
  }

  for (const pattern of PHONE_VALUE_PATTERNS) {
    result = result.replace(pattern, REDACTED)
  }

  return result
}

/**
 * 深度脱敏任意值（对象 / 数组 / 字符串）
 *
 * @param value 原始值
 * @param depth 当前递归深度
 */
export function redactValue(value: unknown, depth: number = 0): unknown {
  if (value === null || value === undefined) return value

  if (depth > MAX_DEPTH) return '[MAX_DEPTH_EXCEEDED]'

  if (typeof value === 'string') return redactString(value)

  if (typeof value === 'number' || typeof value === 'boolean') return value

  if (typeof value === 'bigint') return value.toString()

  if (Array.isArray(value)) {
    return value.map(item => redactValue(item, depth + 1))
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: redactString(value.message),
      stack: value.stack ? redactString(value.stack) : undefined,
    }
  }

  if (typeof value === 'object') {
    return redactObject(value as Record<string, unknown>, depth + 1)
  }

  // function / symbol 等：直接丢弃，避免把不可序列化内容塞进日志
  return undefined
}

/**
 * 深度脱敏对象：敏感 key 的值整体替换，其余值做形态脱敏
 */
export function redactObject<T extends Record<string, unknown>>(
  obj: T,
  depth: number = 0
): T {
  if (!obj || typeof obj !== 'object') return obj

  const result: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(obj)) {
    if (isSensitiveKey(key)) {
      result[key] = REDACTED
      continue
    }

    result[key] = redactValue(value, depth + 1)
  }

  return result as T
}

/**
 * 脱敏一组标签（metric tags / span attributes 通用）
 */
export function redactTags<T extends Record<string, unknown>>(tags: T | undefined): T | undefined {
  if (!tags) return undefined
  return redactObject(tags)
}
