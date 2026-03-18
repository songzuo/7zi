/**
 * Simple test for deepClone - no external imports
 */

// Define the deepClone function inline for testing
function deepClone<T>(obj: T, seen: WeakMap<object, unknown> = new WeakMap()): T {
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

  // Handle Map
  if (obj instanceof Map) {
    const cloned = new Map();
    seen.set(obj, cloned);
    
    const mapStack: Array<{ key: unknown; value: unknown; target: Map<unknown, unknown> }> = [];
    obj.forEach((value, key) => {
      mapStack.push({ key, value, target: cloned });
    });

    while (mapStack.length > 0) {
      const { key, value, target } = mapStack.pop()!;
      const clonedKey = cloneValue(key, seen, mapStack as unknown[]);
      const clonedValue = cloneValue(value, seen, mapStack as unknown[]);
      target.set(clonedKey, clonedValue);
    }

    return cloned as T;
  }

  // Handle Set
  if (obj instanceof Set) {
    const cloned = new Set();
    seen.set(obj, cloned);

    const setStack: Array<{ value: unknown; target: Set<unknown> }> = [];
    obj.forEach(value => {
      setStack.push({ value, target: cloned });
    });

    while (setStack.length > 0) {
      const { value, target } = setStack.pop()!;
      target.add(cloneValue(value, seen, setStack as unknown[]));
    }

    return cloned as T;
  }

  // Handle Array
  if (Array.isArray(obj)) {
    const cloned = [] as unknown as T;
    seen.set(obj, cloned);

    const arrayStack: Array<{ source: unknown[]; target: unknown[]; index: number }> = [{ source: obj, target: cloned as unknown[], index: 0 }];

    while (arrayStack.length > 0) {
      const { source, target, index } = arrayStack.pop()!;
      if (index < source.length) {
        target[index] = cloneValue(source[index], seen, arrayStack as unknown[]);
        arrayStack.push({ source, target, index: index + 1 });
      }
    }

    return cloned;
  }

  // Handle circular references
  if (seen.has(obj)) {
    return seen.get(obj) as T;
  }

  // Handle plain objects
  const cloned = {} as T;
  seen.set(obj, cloned);

  const entries = Object.entries(obj);
  const objectStack: Array<{ entries: [string, unknown][]; target: Record<string, unknown>; index: number }> = [{ entries, target: cloned as Record<string, unknown>, index: 0 }];

  while (objectStack.length > 0) {
    const { entries: currentEntries, target, index } = objectStack.pop()!;
    if (currentEntries && index < currentEntries.length) {
      const [key, value] = currentEntries[index];
      target[key] = cloneValue(value, seen, objectStack as unknown[]);
      objectStack.push({ entries: currentEntries, target, index: index + 1 });
    }
  }

  return cloned;
}

function cloneValue(value: unknown, seen: WeakMap<object, unknown>, stack: Array<unknown>): unknown {
  // Handle primitives, null, and undefined
  if (value === null || typeof value !== 'object') {
    return value;
  }

  // Handle Date
  if (value instanceof Date) {
    return new Date(value.getTime());
  }

  // Handle RegExp
  if (value instanceof RegExp) {
    return new RegExp(value.source, value.flags);
  }

  // Handle circular references
  if (seen.has(value)) {
    return seen.get(value);
  }

  // Handle Map
  if (value instanceof Map) {
    const cloned = new Map();
    seen.set(value, cloned);
    value.forEach((v, k) => {
      (stack as Array<{ key: unknown; value: unknown; target: Map<unknown, unknown> }>).push({ key: k, value: v, target: cloned });
    });
    return cloned;
  }

  // Handle Set
  if (value instanceof Set) {
    const cloned = new Set();
    seen.set(value, cloned);
    value.forEach(v => {
      (stack as Array<{ value: unknown; target: Set<unknown> }>).push({ value: v, target: cloned });
    });
    return cloned;
  }

  // Handle Array
  if (Array.isArray(value)) {
    const cloned = [] as unknown[];
    seen.set(value, cloned);
    (stack as Array<{ source: unknown[]; target: unknown[]; index: number }>).push({ source: value, target: cloned, index: 0 });
    return cloned;
  }

  // Handle plain objects
  const cloned = {} as Record<string, unknown>;
  seen.set(value, cloned);
  const entries = Object.entries(value);
  (stack as Array<{ entries: [string, unknown][]; target: Record<string, unknown>; index: number }>).push({ entries, target: cloned, index: 0 });
  return cloned;
}

// Test cases
console.log('=== Testing Deep Clone Function ===\n');

// Test 1: Array cloning
console.log('Test 1: Array Cloning');
const originalArray = [3, 4, 5];
const clonedArray = deepClone(originalArray);
console.log('Original:', originalArray);
console.log('Cloned:', clonedArray);
console.log('Same reference?', originalArray === clonedArray);
console.log();

// Test 2: Map cloning
console.log('Test 2: Map Cloning');
const originalMap = new Map([['k', 'v'], ['k2', 'v2']]);
const clonedMap = deepClone(originalMap);
console.log('Original map:', originalMap);
console.log('Cloned map:', clonedMap);
console.log('Same reference?', originalMap === clonedMap);
console.log('Same values?', clonedMap.get('k') === originalMap.get('k'));
console.log();

// Test 3: Nested object with array
console.log('Test 3: Nested Object with Array');
const originalObj = {
  b: { c: 2, d: [3, 4, 5] },
  map: new Map([['k', 'v']])
};
const clonedObj = deepClone(originalObj);
console.log('Original array:', originalObj.b.d);
console.log('Cloned array:', clonedObj.b.d);
console.log('Same array?', originalObj.b.d === clonedObj.b.d);
console.log('Same map?', originalObj.map === clonedObj.map);
console.log();

// Test 4: Deep nesting
console.log('Test 4: Deep Nesting (Stack Overflow Prevention)');
function createDeepObject(depth: number): Record<string, unknown> {
  if (depth === 0) return { value: 'leaf' };
  return { child: createDeepObject(depth - 1) };
}

const depths = [100, 500, 1000, 2000];
depths.forEach(depth => {
  const start = performance.now();
  try {
    const deepObj = createDeepObject(depth);
    const clonedDeep = deepClone(deepObj);
    const end = performance.now();
    console.log(`Depth ${depth}: ${(end - start).toFixed(4)}ms ✓`);
  } catch (error) {
    console.log(`Depth ${depth}: FAILED - ${(error as Error).message}`);
  }
});

console.log();
console.log('=== All Tests Complete ===');
