/**
 * Unit tests for utility functions
 */

import { describe, it, expect } from 'vitest';
import {
  generateId,
  stringToColor,
  debounce,
  throttle,
  deepClone,
  mergeVectorClocks,
  compareVectorClocks,
  positionFromLineColumn,
  lineColumnFromPosition,
  formatTimestamp,
  timeDifference,
} from '../utils/id';

describe('generateId', () => {
  it('should generate unique IDs', () => {
    const id1 = generateId();
    const id2 = generateId();
    expect(id1).not.toBe(id2);
  });

  it('should generate string IDs', () => {
    const id = generateId();
    expect(typeof id).toBe('string');
  });

  it('should contain timestamp', () => {
    const id = generateId();
    const parts = id.split('-');
    expect(parseInt(parts[0])).toBeLessThanOrEqual(Date.now());
  });
});

describe('stringToColor', () => {
  it('should return hex color', () => {
    const color = stringToColor('test');
    expect(color).toMatch(/^#[0-9A-F]{6}$/i);
  });

  it('should return same color for same string', () => {
    const color1 = stringToColor('hello');
    const color2 = stringToColor('hello');
    expect(color1).toBe(color2);
  });

  it('should return different colors for different strings', () => {
    const color1 = stringToColor('hello');
    const color2 = stringToColor('world');
    expect(color1).not.toBe(color2);
  });
});

describe('debounce', () => {
  it('should delay function execution', async () => {
    let callCount = 0;
    const fn = () => callCount++;
    const debounced = debounce(fn, 50);

    debounced();
    debounced();
    debounced();

    expect(callCount).toBe(0);

    await new Promise(resolve => setTimeout(resolve, 100));

    expect(callCount).toBe(1);
  });

  it('should pass arguments', async () => {
    let result = '';
    const fn = (arg: string) => result = arg;
    const debounced = debounce(fn, 50);

    debounced('test');

    await new Promise(resolve => setTimeout(resolve, 100));

    expect(result).toBe('test');
  });
});

describe('throttle', () => {
  it('should limit function calls', async () => {
    let callCount = 0;
    const fn = () => callCount++;
    const throttled = throttle(fn, 50);

    throttled();
    throttled();
    throttled();

    expect(callCount).toBe(1);

    await new Promise(resolve => setTimeout(resolve, 100));

    throttled();
    expect(callCount).toBe(2);
  });
});

describe('deepClone', () => {
  it('should clone object', () => {
    const obj = { a: 1, b: { c: 2 } };
    const cloned = deepClone(obj);

    expect(cloned).toEqual(obj);
    expect(cloned).not.toBe(obj);
    expect(cloned.b).not.toBe(obj.b);
  });

  it('should clone arrays', () => {
    const arr = [1, [2, 3], { a: 4 }];
    const cloned = deepClone(arr);

    expect(cloned).toEqual(arr);
    expect(cloned).not.toBe(arr);
    expect(cloned[1]).not.toBe(arr[1]);
  });
});

describe('mergeVectorClocks', () => {
  it('should merge two vector clocks', () => {
    const clock1 = new Map([['a', 1], ['b', 2]]);
    const clock2 = new Map([['b', 3], ['c', 4]]);

    const merged = mergeVectorClocks(clock1, clock2);

    expect(merged.get('a')).toBe(1);
    expect(merged.get('b')).toBe(3);
    expect(merged.get('c')).toBe(4);
  });

  it('should not modify original clocks', () => {
    const clock1 = new Map([['a', 1]]);
    const clock2 = new Map([['b', 2]]);

    mergeVectorClocks(clock1, clock2);

    expect(clock1.has('b')).toBe(false);
    expect(clock2.has('a')).toBe(false);
  });
});

describe('compareVectorClocks', () => {
  it('should return 1 when clock1 > clock2', () => {
    const clock1 = new Map([['a', 2], ['b', 1]]);
    const clock2 = new Map([['a', 1], ['b', 1]]);

    expect(compareVectorClocks(clock1, clock2)).toBe(1);
  });

  it('should return -1 when clock1 < clock2', () => {
    const clock1 = new Map([['a', 1]]);
    const clock2 = new Map([['a', 2]]);

    expect(compareVectorClocks(clock1, clock2)).toBe(-1);
  });

  it('should return 0 when equal', () => {
    const clock1 = new Map([['a', 1], ['b', 2]]);
    const clock2 = new Map([['a', 1], ['b', 2]]);

    expect(compareVectorClocks(clock1, clock2)).toBe(0);
  });

  it('should return 0 when concurrent', () => {
    const clock1 = new Map([['a', 2], ['b', 1]]);
    const clock2 = new Map([['a', 1], ['b', 2]]);

    // Concurrent clocks have both greater and lesser values
    expect(compareVectorClocks(clock1, clock2)).toBe(0);
  });
});

describe('positionFromLineColumn', () => {
  it('should calculate position from line and column', () => {
    const text = 'Hello\nWorld\nTest';

    expect(positionFromLineColumn(text, 0, 0)).toBe(0);
    expect(positionFromLineColumn(text, 0, 5)).toBe(5);
    expect(positionFromLineColumn(text, 1, 0)).toBe(6);
    expect(positionFromLineColumn(text, 1, 5)).toBe(11);
    expect(positionFromLineColumn(text, 2, 0)).toBe(12);
  });

  it('should handle out of bounds', () => {
    const text = 'Hello';

    // Position beyond text length returns text length (end of document)
    expect(positionFromLineColumn(text, 10, 10)).toBe(text.length);
  });
});

describe('lineColumnFromPosition', () => {
  it('should calculate line and column from position', () => {
    const text = 'Hello\nWorld\nTest';

    expect(lineColumnFromPosition(text, 0)).toEqual({ line: 0, column: 0 });
    expect(lineColumnFromPosition(text, 5)).toEqual({ line: 0, column: 5 });
    expect(lineColumnFromPosition(text, 6)).toEqual({ line: 1, column: 0 });
    expect(lineColumnFromPosition(text, 11)).toEqual({ line: 1, column: 5 });
    expect(lineColumnFromPosition(text, 12)).toEqual({ line: 2, column: 0 });
  });
});

describe('formatTimestamp', () => {
  it('should format timestamp as time string', () => {
    const timestamp = Date.now();
    const formatted = formatTimestamp(timestamp);

    expect(typeof formatted).toBe('string');
    expect(formatted.length).toBeGreaterThan(0);
  });
});

describe('timeDifference', () => {
  it('should return seconds ago', () => {
    const timestamp = Date.now() - 5000;
    const diff = timeDifference(timestamp);

    expect(diff).toMatch(/s ago/);
  });

  it('should return minutes ago', () => {
    const timestamp = Date.now() - 60000;
    const diff = timeDifference(timestamp);

    expect(diff).toMatch(/m ago/);
  });

  it('should return hours ago', () => {
    const timestamp = Date.now() - 3600000;
    const diff = timeDifference(timestamp);

    expect(diff).toMatch(/h ago/);
  });

  it('should return days ago', () => {
    const timestamp = Date.now() - 86400000;
    const diff = timeDifference(timestamp);

    expect(diff).toMatch(/d ago/);
  });
});