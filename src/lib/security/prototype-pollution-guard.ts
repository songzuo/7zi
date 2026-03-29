/**
 * 原型污染防护
 *
 * 防止 JavaScript 原型污染攻击
 */

/**
 * 冻结 Object.prototype
 */
export function protectPrototype() {
  if (typeof Object.freeze === 'function') {
    try {
      Object.freeze(Object.prototype);
      console.log('[Security] Object.prototype has been frozen');
    } catch (error) {
      console.warn('[Security] Failed to freeze Object.prototype:', error);
    }
  }
}

/**
 * 检测和清理原型污染
 */
export function sanitizeObjectFromPrototypePollution<T extends Record<string, unknown>>(
  obj: T
): T {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  const result = { ...obj } as Record<string, unknown>;

  // 移除已知的污染键
  const maliciousKeys = [
    '__proto__',
    'constructor',
    'prototype',
    '__defineGetter__',
    '__defineSetter__',
    '__lookupGetter__',
    '__lookupSetter__',
  ];

  for (const key of maliciousKeys) {
    if (key in result) {
      console.warn(`[Security] Removed malicious key: ${key}`);
      delete result[key];
    }
  }

  // 递归清理嵌套对象
  for (const key in result) {
    const value = result[key];
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      result[key] = sanitizeObjectFromPrototypePollution(value as Record<string, unknown>);
    }
  }

  return result as T;
}

/**
 * 安全的 Object.assign 替代品
 */
export function safeAssign<T extends object>(target: T, ...sources: Partial<T>[]): T {
  const result = { ...target };

  for (const source of sources) {
    if (!source || typeof source !== 'object') {
      continue;
    }

    for (const key in source) {
      // 跳过原型链属性和危险键
      if (source.hasOwnProperty(key) && !['__proto__', 'constructor', 'prototype'].includes(key)) {
        (result as Record<string, unknown>)[key] = source[key];
      }
    }
  }

  return result;
}

/**
 * 安全的 JSON 解析
 */
export function safeParseJSON<T>(json: string): T | null {
  try {
    const parsed = JSON.parse(json);

    // 检查原型污染
    if (parsed && typeof parsed === 'object') {
      return sanitizeObjectFromPrototypePollution(parsed) as T;
    }

    return parsed as T;
  } catch (error) {
    console.error('[Security] JSON parse error:', error);
    return null;
  }
}

/**
 * 检测对象是否被污染
 */
export function isPolluted(obj: unknown): boolean {
  if (!obj || typeof obj !== 'object') {
    return false;
  }

  const maliciousKeys = ['__proto__', 'constructor', 'prototype'];

  for (const key of maliciousKeys) {
    if (key in (obj as Record<string, unknown>)) {
      return true;
    }
  }

  return false;
}

/**
 * 合并对象时保护原型
 */
export function safeMerge<T extends object>(target: T, source: Partial<T>): T {
  const result = { ...target } as Record<string, unknown>;

  if (!source || typeof source !== 'object') {
    return result as T;
  }

  for (const key in source) {
    // 只复制自有属性
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      // 跳过危险键
      if (['__proto__', 'constructor', 'prototype'].includes(key)) {
        console.warn(`[Security] Skipped malicious key during merge: ${key}`);
        continue;
      }

      const sourceValue = source[key];
      const targetValue = result[key];

      // 深度合并嵌套对象
      if (
        sourceValue &&
        typeof sourceValue === 'object' &&
        !Array.isArray(sourceValue) &&
        targetValue &&
        typeof targetValue === 'object' &&
        !Array.isArray(targetValue)
      ) {
        result[key] = safeMerge(
          targetValue as Record<string, unknown>,
          sourceValue as Record<string, unknown>
        );
      } else {
        result[key] = sourceValue;
      }
    }
  }

  return result as T;
}

// 自动启用原型保护
if (typeof window !== 'undefined') {
  protectPrototype();
}
