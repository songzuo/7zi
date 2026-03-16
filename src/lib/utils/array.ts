/**
 * @fileoverview 数组处理工具函数
 * @module lib/utils/array
 * 
 * @description
 * 提供常用的数组处理函数，包括：
 * - 空数组检查
 * - 数组去重
 * - 数组分组
 */

// ============================================
// 空数组检查
// ============================================

/**
 * 检查数组是否为空
 * 
 * @description
 * 安全检查数组是否为 null、undefined 或空数组。
 * 
 * @param arr - 输入数组
 * @returns 是否为空
 * 
 * @example
 * ```typescript
 * isEmptyArray(null); // true
 * isEmptyArray([]); // true
 * isEmptyArray([1, 2]); // false
 * ```
 */
export function isEmptyArray<T>(arr: T[] | undefined | null): boolean {
  return !arr || arr.length === 0;
}

/**
 * 检查数组是否非空
 * 
 * @param arr - 输入数组
 * @returns 是否非空
 * 
 * @example
 * ```typescript
 * isNotEmptyArray([1, 2]); // true
 * isNotEmptyArray([]); // false
 * ```
 */
export function isNotEmptyArray<T>(arr: T[] | undefined | null): boolean {
  return !isEmptyArray(arr);
}

/**
 * 安全获取数组长度
 * 
 * @param arr - 输入数组
 * @returns 数组长度，null/undefined 返回 0
 */
export function safeLength<T>(arr: T[] | undefined | null): number {
  return arr?.length ?? 0;
}

// ============================================
// 数组去重
// ============================================

/**
 * 数组去重（基本类型）
 * 
 * @param arr - 输入数组
 * @returns 去重后的数组
 * 
 * @example
 * ```typescript
 * unique([1, 2, 2, 3]); // [1, 2, 3]
 * unique(['a', 'b', 'a']); // ['a', 'b']
 * ```
 */
export function unique<T extends string | number | boolean>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

/**
 * 数组去重（对象数组，按 key）
 * 
 * @param arr - 对象数组
 * @param keyFn - 获取 key 的函数
 * @returns 去重后的数组
 * 
 * @example
 * ```typescript
 * const items = [{id: 1, name: 'a'}, {id: 1, name: 'b'}];
 * uniqueBy(items, item => item.id); // [{id: 1, name: 'a'}]
 * ```
 */
export function uniqueBy<T>(arr: T[], keyFn: (item: T) => string | number): T[] {
  const seen = new Set<string | number>();
  return arr.filter(item => {
    const key = keyFn(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ============================================
// 数组分组
// ============================================

/**
 * 数组分组
 * 
 * @param arr - 输入数组
 * @param keyFn - 获取分组 key 的函数
 * @returns 分组后的对象
 * 
 * @example
 * ```typescript
 * const items = [{type: 'a', val: 1}, {type: 'b', val: 2}];
 * groupBy(items, item => item.type);
 * // { a: [{type: 'a', val: 1}], b: [{type: 'b', val: 2}] }
 * ```
 */
export function groupBy<T, K extends string | number>(
  arr: T[],
  keyFn: (item: T) => K
): Record<K, T[]> {
  return arr.reduce((acc, item) => {
    const key = keyFn(item);
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(item);
    return acc;
  }, {} as Record<K, T[]>);
}

/**
 * 数组分块
 * 
 * @param arr - 输入数组
 * @param size - 每块大小
 * @returns 分块后的二维数组
 * 
 * @example
 * ```typescript
 * chunk([1, 2, 3, 4, 5], 2); // [[1, 2], [3, 4], [5]]
 * ```
 */
export function chunk<T>(arr: T[], size: number): T[][] {
  if (size <= 0) return [arr];
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

// ============================================
// 数组排序
// ============================================

/**
 * 数组按字段排序（返回新数组）
 * 
 * @param arr - 输入数组
 * @param keyFn - 获取排序 key 的函数
 * @param order - 排序方向 ('asc' | 'desc')
 * @returns 排序后的新数组
 * 
 * @example
 * ```typescript
 * const items = [{val: 3}, {val: 1}, {val: 2}];
 * sortBy(items, item => item.val, 'asc'); // [{val: 1}, {val: 2}, {val: 3}]
 * ```
 */
export function sortBy<T>(
  arr: T[],
  keyFn: (item: T) => number | string,
  order: 'asc' | 'desc' = 'asc'
): T[] {
  const multiplier = order === 'asc' ? 1 : -1;
  return [...arr].sort((a, b) => {
    const aVal = keyFn(a);
    const bVal = keyFn(b);
    if (aVal < bVal) return -1 * multiplier;
    if (aVal > bVal) return 1 * multiplier;
    return 0;
  });
}

// ============================================
// 类型守卫
// ============================================

/**
 * 类型守卫：检查是否为非空数组
 * 
 * @description
 * TypeScript 类型守卫，用于类型缩窄。
 * 配合 if (isArray(item)) { ... } 使用。
 * 
 * @param arr - 输入值
 * @returns 是否为非空数组
 * 
 * @example
 * ```typescript
 * function processItems(arr: unknown) {
 *   if (isArray(arr)) {
 *     // TypeScript 知道 arr 是 T[]
 *     arr.forEach(item => console.log(item));
 *   }
 * }
 * ```
 */
export function isArray<T>(arr: unknown): arr is T[] {
  return Array.isArray(arr) && arr.length > 0;
}

/**
 * 类型守卫：检查是否为数组（可为空）
 * 
 * @param arr - 输入值
 * @returns 是否为数组
 */
export function isArrayLike<T>(arr: unknown): arr is T[] {
  return Array.isArray(arr);
}

// ============================================
// 默认导出
// ============================================

export default {
  // 类型守卫
  isArray,
  isArrayLike,
  
  // 空数组检查
  isEmptyArray,
  isNotEmptyArray,
  safeLength,
  
  // 数组去重
  unique,
  uniqueBy,
  
  // 数组分组
  groupBy,
  chunk,
  
  // 数组排序
  sortBy,
};
