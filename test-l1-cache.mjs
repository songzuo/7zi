import { L1Cache } from './src/lib/cache/l1-cache.js';

console.log('Testing L1 Cache...');

async function runTests() {
  console.log('✓ L1 Cache module loaded');

  // Test 1: Basic operations
  const cache = new L1Cache({
    maxSize: 100,
    defaultTTL: 5000,
    cleanupInterval: 1000,
    enableStats: true,
  });

  console.log('✓ Cache instance created');

  // Test set and get
  await cache.set('test-key', 'test-value');
  const value = await cache.get('test-key');
  if (value !== 'test-value') {
    throw new Error('Set/Get failed');
  }
  console.log('✓ Set and Get operations work');

  // Test stats
  const stats = cache.getStats();
  if (stats.hits !== 1 || stats.sets !== 1) {
    throw new Error('Stats not tracking correctly');
  }
  console.log('✓ Statistics tracking works');

  // Test TTL expiration
  await cache.set('expiring', 'value', 100);
  await new Promise(resolve => setTimeout(resolve, 150));
  const expired = await cache.get('expiring');
  if (expired !== null) {
    throw new Error('TTL expiration failed');
  }
  console.log('✓ TTL expiration works');

  // Test batch operations
  await cache.setMany([
    ['key1', 'value1'],
    ['key2', 'value2'],
    ['key3', 'value3'],
  ]);

  const results = await cache.getMany(['key1', 'key2', 'key3']);
  if (results.size !== 3) {
    throw new Error('Batch operations failed');
  }
  console.log('✓ Batch operations work');

  // Test LRU eviction
  const smallCache = new L1Cache({ maxSize: 3, defaultTTL: 10000, enableStats: true });
  await smallCache.set('key1', 'value1');
  await smallCache.set('key2', 'value2');
  await smallCache.set('key3', 'value3');
  await smallCache.set('key4', 'value4'); // Should evict key1

  const evicted = await smallCache.get('key1');
  if (evicted !== null) {
    throw new Error('LRU eviction failed');
  }
  console.log('✓ LRU eviction works');

  // Performance test
  const startTime = Date.now();
  for (let i = 0; i < 1000; i++) {
    await cache.set(`perf:${i}`, `value:${i}`);
  }
  const setTime = Date.now() - startTime;

  for (let i = 0; i < 1000; i++) {
    await cache.get(`perf:${i}`);
  }
  const getTime = Date.now() - startTime - setTime;

  console.log(`✓ Performance: 1000 sets in ${setTime}ms, 1000 gets in ${getTime}ms`);

  // Cleanup
  cache.destroy();
  smallCache.destroy();
  console.log('✓ Cache cleanup works');

  console.log('\n✅ All L1 Cache tests passed!');
}

runTests().catch(error => {
  console.error('\n❌ Test failed:', error.message);
  process.exit(1);
});
