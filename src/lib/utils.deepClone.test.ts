/**
 * Performance tests for deepClone function
 * Tests the iterative implementation against deep nested objects
 */

import { deepClone } from './utils';

/**
 * Create a deeply nested object with specified depth
 */
function createDeepNestedObject(depth: number, breadth: number = 3): Record<string, unknown> {
  if (depth === 0) {
    return { value: 'leaf' };
  }

  const obj: Record<string, unknown> = {};
  for (let i = 0; i < breadth; i++) {
    obj[`prop${i}`] = createDeepNestedObject(depth - 1, breadth);
  }
  return obj;
}

/**
 * Create a large flat object
 */
function createLargeFlatObject(size: number): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  for (let i = 0; i < size; i++) {
    obj[`key${i}`] = { nested: { value: i, data: `data-${i}` } };
  }
  return obj;
}

/**
 * Create an object with circular references
 */
function createCircularObject(): Record<string, unknown> {
  const obj: Record<string, unknown> = { name: 'root' };
  obj.self = obj;
  obj.child = { parent: obj };
  return obj;
}

/**
 * Benchmark a function
 */
function benchmark(name: string, fn: () => void, iterations: number = 100): void {
  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    fn();
  }
  const end = performance.now();
  const avgTime = (end - start) / iterations;
  if (process.env.NODE_ENV !== 'production') {
    console.log(`${name}: ${avgTime.toFixed(4)}ms (avg over ${iterations} iterations)`);
  }
}

/**
 * Run performance tests
 */
export function runDeepClonePerformanceTests(): void {
  if (process.env.NODE_ENV === 'production') return;

  console.log('\n=== Deep Clone Performance Tests ===\n');

  // Test 1: Deeply nested objects
  console.log('Test 1: Deeply Nested Objects');
  console.log('--------------------------------');
  const depths = [10, 50, 100, 200];
  depths.forEach(depth => {
    const obj = createDeepNestedObject(depth, 2);
    benchmark(`Depth ${depth}`, () => deepClone(obj), 10);
  });

  // Test 2: Large flat objects
  console.log('\nTest 2: Large Flat Objects');
  console.log('-------------------------');
  const sizes = [100, 500, 1000, 5000];
  sizes.forEach(size => {
    const obj = createLargeFlatObject(size);
    benchmark(`Size ${size}`, () => deepClone(obj), 10);
  });

  // Test 3: Mixed objects
  console.log('\nTest 3: Mixed Objects (nested + arrays + special types)');
  console.log('--------------------------------------------------------');
  const mixedObj = {
    string: 'hello',
    number: 42,
    boolean: true,
    null: null,
    undefined: undefined,
    date: new Date(),
    regex: /pattern/gi,
    array: [1, 2, 3, { nested: 'value' }],
    map: new Map([['key1', 'value1'], ['key2', 'value2']]),
    set: new Set([1, 2, 3]),
    nested: { deep: { deeper: { deepest: 'found' } } },
    largeArray: Array.from({ length: 100 }, (_, i) => ({ id: i, data: `item${i}` }))
  };
  benchmark('Mixed object', () => deepClone(mixedObj), 100);

  // Test 4: Circular references
  console.log('\nTest 4: Circular References');
  console.log('----------------------------');
  const circularObj = createCircularObject();
  benchmark('Circular object', () => deepClone(circularObj), 100);

  // Test 5: Stress test - very deep nesting
  console.log('\nTest 5: Stress Test - Very Deep Nesting');
  console.log('---------------------------------------');
  try {
    const veryDeepObj = createDeepNestedObject(500, 2);
    benchmark('Depth 500 (stress test)', () => deepClone(veryDeepObj), 1);
    console.log('✓ Successfully cloned very deep object (no stack overflow!)');
  } catch (_error) {
    console.error('✗ Failed to clone very deep object:', error);
  }

  // Test 6: Correctness verification
  console.log('\nTest 6: Correctness Verification');
  console.log('---------------------------------');
  const original = {
    a: 1,
    b: { c: 2, d: [3, 4, 5] },
    date: new Date('2024-01-01'),
    regex: /test/g,
    map: new Map([['k', 'v']]),
    set: new Set([1, 2, 3])
  };
  const cloned = deepClone(original);

  // Verify deep equality (except for reference types)
  const checks = [
    { name: 'Primitive values', pass: cloned.a === original.a },
    { name: 'Nested objects', pass: cloned.b.c === original.b.c },
    { name: 'Arrays', pass: JSON.stringify(cloned.b.d) === JSON.stringify(original.b.d) },
    { name: 'Date objects', pass: cloned.date.getTime() === original.date.getTime() },
    { name: 'RegExp objects', pass: cloned.regex.source === original.regex.source && cloned.regex.flags === original.regex.flags },
    { name: 'Map objects', pass: cloned.map.get('k') === original.map.get('k') },
    { name: 'Set objects', pass: Array.from(cloned.set).every(v => original.set.has(v)) },
    { name: 'Independence', pass: cloned !== original && cloned.b !== original.b }
  ];

  checks.forEach(({ name, pass }) => {
    console.log(`${pass ? '✓' : '✗'} ${name}`);
  });

  console.log('\n=== Performance Tests Complete ===\n');
}

// Run tests if executed directly
if (require.main === module) {
  runDeepClonePerformanceTests();
}
