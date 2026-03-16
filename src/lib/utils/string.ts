/**
 * @fileoverview 字符串处理工具函数
 * @module lib/utils/string
 * 
 * @description
 * 提供常用的字符串处理函数，包括：
 * - 大小写转换
 * - 搜索匹配
 * - 字符串清理
 */

// ============================================
// 搜索匹配
// ============================================

/**
 * 不区分大小写的搜索匹配
 * 
 * @description
 * 检查文本是否包含搜索词（不区分大小写）。
 * 常用于列表过滤和搜索功能。
 * 
 * @param text - 待搜索的文本
 * @param searchTerm - 搜索词
 * @returns 是否匹配
 * 
 * @example
 * ```typescript
 * matchesSearchIgnoreCase('This is a Test', 'test'); // true
 * matchesSearchIgnoreCase('Hello World', 'hello'); // true
 * matchesSearchIgnoreCase('Hello World', 'WORLD'); // true
 * ```
 */
export function matchesSearchIgnoreCase(text: string, searchTerm: string): boolean {
  if (!text || !searchTerm) return false;
  return text.toLowerCase().includes(searchTerm.toLowerCase());
}

/**
 * 批量搜索匹配
 * 
 * @description
 * 检查多个字段中是否任一包含搜索词。
 * 
 * @param fields - 字段值数组
 * @param searchTerm - 搜索词
 * @returns 是否任一字段匹配
 * 
 * @example
 * ```typescript
 * matchesAnyField(['Title', 'Description'], 'test'); // true
 * matchesAnyField(['Hello', 'World'], 'test'); // false
 * ```
 */
export function matchesAnyField(fields: (string | undefined | null)[], searchTerm: string): boolean {
  if (!searchTerm) return true;
  const searchLower = searchTerm.toLowerCase();
  return fields.some(field => field && matchesSearchIgnoreCase(field, searchLower));
}

/**
 * 预处理搜索词
 * 
 * @description
 * 将搜索词转换为统一的小写格式，用于多次匹配。
 * 
 * @param searchTerm - 原始搜索词
 * @returns 小写的搜索词
 * 
 * @example
 * ```typescript
 * const searchLower = prepareSearchTerm('Test Search');
 * // 'test search'
 * ```
 */
export function prepareSearchTerm(searchTerm: string): string {
  return searchTerm?.toLowerCase() ?? '';
}

// ============================================
// 字符串清理
// ============================================

/**
 * 安全 trim 字符串
 * 
 * @description
 * 对可能为 null/undefined 的字符串进行 trim。
 * 
 * @param text - 输入文本
 * @returns trim 后的文本，或空字符串
 * 
 * @example
 * ```typescript
 * safeTrim('  hello  '); // 'hello'
 * safeTrim(null); // ''
 * safeTrim(undefined); // ''
 * ```
 */
export function safeTrim(text: string | undefined | null): string {
  return text?.trim() ?? '';
}

/**
 * 检查字符串是否为空（包括 trim 后）
 * 
 * @description
 * 检查字符串是否为 null、undefined 或仅包含空白字符。
 * 
 * @param text - 输入文本
 * @returns 是否为空
 * 
 * @example
 * ```typescript
 * isEmptyString(null); // true
 * isEmptyString('  '); // true
 * isEmptyString('hello'); // false
 * ```
 */
export function isEmptyString(text: string | undefined | null): boolean {
  return !text || text.trim().length === 0;
}

/**
 * 检查字符串是否非空
 * 
 * @param text - 输入文本
 * @returns 是否非空
 * 
 * @example
 * ```typescript
 * isNotEmptyString('hello'); // true
 * isNotEmptyString('  '); // false
 * ```
 */
export function isNotEmptyString(text: string | undefined | null): boolean {
  return !isEmptyString(text);
}

// ============================================
// 大小写转换
// ============================================

/**
 * 安全转换为小写
 * 
 * @param text - 输入文本
 * @returns 小写文本或空字符串
 */
export function safeLowerCase(text: string | undefined | null): string {
  return text?.toLowerCase() ?? '';
}

/**
 * 安全转换为大写
 * 
 * @param text - 输入文本
 * @returns 大写文本或空字符串
 */
export function safeUpperCase(text: string | undefined | null): string {
  return text?.toUpperCase() ?? '';
}

// ============================================
// 截断和格式化
// ============================================

/**
 * 截断字符串并添加省略号
 * 
 * @param text - 输入文本
 * @param maxLength - 最大长度
 * @param suffix - 后缀（默认 '...'）
 * @returns 截断后的文本
 * 
 * @example
 * ```typescript
 * truncate('Hello World', 8); // 'Hello...'
 * truncate('Hello', 10); // 'Hello'
 * ```
 */
export function truncate(text: string, maxLength: number, suffix = '...'): string {
  if (!text || text.length <= maxLength) return text ?? '';
  return text.slice(0, maxLength - suffix.length) + suffix;
}

/**
 * 首字母大写
 * 
 * @param text - 输入文本
 * @returns 首字母大写的文本
 * 
 * @example
 * ```typescript
 * capitalize('hello'); // 'Hello'
 * capitalize('HELLO'); // 'Hello'
 * ```
 */
export function capitalize(text: string): string {
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

// ============================================
// 类型守卫
// ============================================

/**
 * 类型守卫：检查是否为非空字符串
 * 
 * @description
 * TypeScript 类型守卫，用于类型缩窄。
 * 配合 if (isString(item)) { ... } 使用。
 * 
 * @param text - 输入值
 * @returns 是否为非空字符串
 * 
 * @example
 * ```typescript
 * function processText(text: unknown) {
 *   if (isString(text)) {
 *     // TypeScript 知道 text 是 string
 *     console.log(text.toUpperCase());
 *   }
 * }
 * ```
 */
export function isString(text: unknown): text is string {
  return typeof text === 'string' && text.trim().length > 0;
}

/**
 * 类型守卫：检查是否为字符串（可为空）
 * 
 * @param text - 输入值
 * @returns 是否为字符串
 */
export function isStringLike(text: unknown): text is string {
  return typeof text === 'string';
}

// ============================================
// 默认导出
// ============================================

export default {
  // 类型守卫
  isString,
  isStringLike,
  
  // 搜索匹配
  matchesSearchIgnoreCase,
  matchesAnyField,
  prepareSearchTerm,
  
  // 字符串清理
  safeTrim,
  isEmptyString,
  isNotEmptyString,
  
  // 大小写转换
  safeLowerCase,
  safeUpperCase,
  
  // 截断和格式化
  truncate,
  capitalize,
};
