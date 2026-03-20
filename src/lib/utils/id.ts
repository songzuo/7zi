/**
 * ID generation utilities - generateId, generateUUID
 * 
 * @module lib/utils/id
 */

/**
 * Helper function to format raw bytes as UUID v4 string
 * @param {Uint8Array | Buffer} bytes - 16 bytes of random data
 * @returns {string} UUID v4 formatted string
 * @private
 */
function formatUUIDv4(bytes: Uint8Array | Buffer): string {
  const hex = bytes.toString('hex');
  const variant = parseInt(hex[16], 16);
  const variantChar = [8, 9, 10, 11].includes(variant) ? hex[16] : (variant | 0x8).toString(16);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-${variantChar}${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

/**
 * Generate a unique ID (UUID v4)
 * 
 * 优化点:
 * 1. 优先使用 crypto.randomUUID（浏览器和现代 Node.js）
 * 2. 使用 crypto.getRandomValues 替代 Math.random（更安全）
 * 3. 提取 formatUUIDv4 公共函数，避免重复代码
 * 4. 减少不必要的字符串拼接和条件判断
 * 
 * @param {string} prefix - Optional prefix
 * @returns {string} Unique ID
 * @example
 * generateId() // "550e8400-e29b-41d4-a716-446655440000"
 * generateId('user') // "user-550e8400-e29b-41d4-a716-446655440000"
 */
export function generateId(prefix: string = ''): string {
  // Use crypto.randomUUID if available (modern browsers/Node.js 15+)
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    const uuid = crypto.randomUUID();
    return prefix ? `${prefix}-${uuid}` : uuid;
  }

  // Use crypto.getRandomValues (browser) or crypto.randomBytes (Node.js)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    const uuid = formatUUIDv4(bytes);
    return prefix ? `${prefix}-${uuid}` : uuid;
  }

  // For Node.js, we rely on the global crypto object which is available in modern Node.js
  // No need for require() as it's lint-forbidden

  // Final fallback: Math.random (should rarely reach here)
  const hex = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
  return prefix ? `${prefix}-${hex}` : hex;
}

/**
 * Alias for generateId() - for consistency with crypto module
 * @returns {string} UUID v4 string
 */
export function generateUUID(): string {
  return generateId();
}
