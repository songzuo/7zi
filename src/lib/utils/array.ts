/**
 * Array utilities
 *
 * @module lib/utils/array
 */

/**
 * Batch array into chunks of specified size
 * @template T - Array item type
 * @param {Array<T>} array - Array to batch
 * @param {number} size - Chunk size
 * @returns {Array<Array<T>>} Batched arrays
 * @example
 * batch([1, 2, 3, 4, 5], 2) // [[1, 2], [3, 4], [5]]
 */
export function batch<T>(array: T[], size: number): T[][] {
  const batches: T[][] = []
  for (let i = 0; i < array.length; i += size) {
    batches.push(array.slice(i, i + size))
  }
  return batches
}

/**
 * Shuffle array in place
 * @template T - Array item type
 * @param {Array<T>} array - Array to shuffle
 * @returns {Array<T>} Shuffled array
 * @example
 * shuffle([1, 2, 3, 4, 5]) // [3, 1, 5, 2, 4] (random order)
 */
export function shuffle<T>(array: T[]): T[] {
  const arr = [...array]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

/**
 * Get a random item from array
 * @template T - Array item type
 * @param {Array<T>} array - Array to pick from
 * @returns {T} Random item
 * @example
 * randomItem([1, 2, 3]) // 2 (random)
 */
export function randomItem<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)]
}

/**
 * Remove duplicates from array
 * @template T - Array item type
 * @param {Array<T>} array - Array to deduplicate
 * @returns {Array<T>} Array without duplicates
 * @example
 * unique([1, 2, 2, 3, 3, 3]) // [1, 2, 3]
 */
export function unique<T>(array: T[]): T[] {
  return Array.from(new Set(array))
}

/**
 * Group array items by a key function
 * @template T - Array item type
 * @template K - Key type
 * @param {Array<T>} array - Array to group
 * @param {Function} keyFn - Function to extract grouping key
 * @returns {Map<K, Array<T>>} Grouped items
 * @example
 * groupBy(
 *   [{ id: 1, type: 'a' }, { id: 2, type: 'b' }, { id: 3, type: 'a' }],
 *   item => item.type
 * ) // Map { 'a' => [{ id: 1 }, { id: 3 }], 'b' => [{ id: 2 }] }
 */
export function groupBy<T, K extends string | number>(
  array: T[],
  keyFn: (item: T) => K
): Map<K, T[]> {
  const groups = new Map<K, T[]>()
  for (const item of array) {
    const key = keyFn(item)
    const group = groups.get(key) || []
    group.push(item)
    groups.set(key, group)
  }
  return groups
}

/**
 * Pick specified keys from an object
 * @template T - Object type
 * @template K - Key type
 * @param {T} obj - Source object
 * @param {Array<K>} keys - Keys to pick
 * @returns {Pick<T, K>} Object with only specified keys
 * @example
 * pick({ a: 1, b: 2, c: 3 }, ['a', 'c']) // { a: 1, c: 3 }
 */
export function pick<T extends object, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
  const result = {} as Pick<T, K>
  keys.forEach(key => {
    if (key in obj) {
      result[key] = obj[key]
    }
  })
  return result
}

/**
 * Omit specified keys from an object
 * @template T - Object type
 * @template K - Key type
 * @param {T} obj - Source object
 * @param {Array<K>} keys - Keys to omit
 * @returns {Omit<T, K>} Object without specified keys
 * @example
 * omit({ a: 1, b: 2, c: 3 }, ['b']) // { a: 1, c: 3 }
 */
export function omit<T, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {
  const result = { ...obj }
  keys.forEach(key => {
    delete result[key]
  })
  return result
}
