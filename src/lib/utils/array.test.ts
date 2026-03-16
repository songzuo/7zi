/**
 * @fileoverview 数组工具测试
 */
import { describe, it, expect } from 'vitest';
import {
  isEmptyArray,
  isNotEmptyArray,
  safeLength,
  unique,
  uniqueBy,
  groupBy,
  chunk,
  sortBy,
  isArray,
  isArrayLike,
} from './array';

describe('isEmptyArray / isNotEmptyArray', () => {
  it('should detect empty arrays', () => {
    expect(isEmptyArray([])).toBe(true);
    expect(isEmptyArray(null)).toBe(true);
    expect(isEmptyArray(undefined)).toBe(true);
    expect(isEmptyArray([1, 2])).toBe(false);
  });

  it('isNotEmptyArray should be opposite', () => {
    expect(isNotEmptyArray([1, 2])).toBe(true);
    expect(isNotEmptyArray([])).toBe(false);
  });
});

describe('isArray / isArrayLike (type guards)', () => {
  it('should narrow types correctly', () => {
    const emptyArr: unknown = [];
    const nonEmptyArr: unknown = [1, 2, 3];
    const notArray: unknown = 'not array';
    const nullVal: unknown = null;

    expect(isArray<number>(emptyArr)).toBe(false);
    expect(isArray<number>(nonEmptyArr)).toBe(true);
    expect(isArray<number>(notArray)).toBe(false);
    expect(isArray<number>(nullVal)).toBe(false);
  });

  it('isArrayLike should include empty arrays', () => {
    expect(isArrayLike<number>([])).toBe(true);
    expect(isArrayLike<number>([1, 2])).toBe(true);
    expect(isArrayLike<number>('test')).toBe(false);
    expect(isArrayLike<number>(null)).toBe(false);
  });
});

describe('safeLength', () => {
  it('should return array length', () => {
    expect(safeLength([1, 2, 3])).toBe(3);
  });

  it('should return 0 for null/undefined', () => {
    expect(safeLength(null)).toBe(0);
    expect(safeLength(undefined)).toBe(0);
  });
});

describe('unique', () => {
  it('should remove duplicates from number array', () => {
    expect(unique([1, 2, 2, 3, 3, 3])).toEqual([1, 2, 3]);
  });

  it('should remove duplicates from string array', () => {
    expect(unique(['a', 'b', 'a', 'c'])).toEqual(['a', 'b', 'c']);
  });
});

describe('uniqueBy', () => {
  it('should remove duplicates by key', () => {
    const items = [
      { id: 1, name: 'a' },
      { id: 1, name: 'b' },
      { id: 2, name: 'c' },
    ];
    const result = uniqueBy(items, item => item.id);
    expect(result).toEqual([{ id: 1, name: 'a' }, { id: 2, name: 'c' }]);
  });
});

describe('groupBy', () => {
  it('should group items by key', () => {
    const items = [
      { type: 'a', val: 1 },
      { type: 'b', val: 2 },
      { type: 'a', val: 3 },
    ];
    const result = groupBy(items, item => item.type);
    expect(result).toEqual({
      a: [{ type: 'a', val: 1 }, { type: 'a', val: 3 }],
      b: [{ type: 'b', val: 2 }],
    });
  });
});

describe('chunk', () => {
  it('should split array into chunks', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(chunk([1, 2, 3], 3)).toEqual([[1, 2, 3]]);
  });

  it('should handle size larger than array', () => {
    expect(chunk([1, 2], 5)).toEqual([[1, 2]]);
  });
});

describe('sortBy', () => {
  it('should sort ascending', () => {
    const items = [{ val: 3 }, { val: 1 }, { val: 2 }];
    const result = sortBy(items, item => item.val, 'asc');
    expect(result).toEqual([{ val: 1 }, { val: 2 }, { val: 3 }]);
  });

  it('should sort descending', () => {
    const items = [{ val: 1 }, { val: 3 }, { val: 2 }];
    const result = sortBy(items, item => item.val, 'desc');
    expect(result).toEqual([{ val: 3 }, { val: 2 }, { val: 1 }]);
  });

  it('should not mutate original array', () => {
    const items = [{ val: 3 }, { val: 1 }];
    sortBy(items, item => item.val);
    expect(items[0].val).toBe(3); // Original unchanged
  });
});