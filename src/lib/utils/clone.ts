/**
 * Clone utilities - deepClone
 * 
 * @module lib/utils/clone
 */

/**
 * Deep clone an object, handling circular references (iterative implementation)
 * 
 * This implementation uses recursion with WeakMap for circular reference tracking.
 * 
 * @template T - Type of the object to clone
 * @param {T} obj - Object to clone
 * @param {WeakMap} seen - Internal use for circular reference tracking
 * @returns {T} Deep cloned object
 * @example
 * const original = { a: 1, b: { c: 2 } };
 * const cloned = deepClone(original);
 * cloned.b.c = 3; // Does not affect original
 */
export function deepClone<T>(obj: T, seen: WeakMap<object, unknown> = new WeakMap()): T {
  // Handle primitives, null, and undefined
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  // Handle Date
  if (obj instanceof Date) {
    return new Date(obj.getTime()) as T;
  }

  // Handle RegExp
  if (obj instanceof RegExp) {
    return new RegExp(obj.source, obj.flags) as T;
  }

  // Handle circular references
  if (seen.has(obj)) {
    return seen.get(obj) as T;
  }

  // Handle Array
  if (Array.isArray(obj)) {
    const cloned = [] as unknown as T;
    seen.set(obj, cloned);
    for (let i = 0; i < obj.length; i++) {
      (cloned as unknown[])[i] = deepClone(obj[i], seen);
    }
    return cloned;
  }

  // Handle Map
  if (obj instanceof Map) {
    const cloned = new Map();
    seen.set(obj, cloned);
    obj.forEach((value, key) => {
      cloned.set(deepClone(key, seen), deepClone(value, seen));
    });
    return cloned as T;
  }

  // Handle Set
  if (obj instanceof Set) {
    const cloned = new Set();
    seen.set(obj, cloned);
    obj.forEach(value => {
      cloned.add(deepClone(value, seen));
    });
    return cloned as T;
  }

  // Handle plain objects
  const cloned = {} as T;
  seen.set(obj, cloned);
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      cloned[key] = deepClone(obj[key], seen);
    }
  }
  return cloned;
}
