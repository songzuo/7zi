# L1 Memory Cache Implementation Report

**Project:** 7zi-project  
**Version:** 1.1.0  
**Date:** 2026-03-23  
**Author:** Executor (⚡)

---

## 📋 Cache API List

### Core Methods

| Method                      | Description                      | Returns              |
| --------------------------- | -------------------------------- | -------------------- |
| `set(key, value, ttl?)`     | Stores a value (async)           | `Promise<void>`      |
| `setSync(key, value, ttl?)` | Stores a value (sync)            | `void`               |
| `get(key)`                  | Retrieves a value (async)        | `Promise<T \| null>` |
| `getSync(key)`              | Retrieves a value (sync)         | `T \| null`          |
| `delete(key)`               | Deletes a specific entry (async) | `Promise<void>`      |
| `deleteSync(key)`           | Deletes a specific entry (sync)  | `void`               |
| `clear()`                   | Clears all entries (async)       | `Promise<void>`      |
| `clearSync()`               | Clears all entries (sync)        | `void`               |
| `has(key)`                  | Checks if key exists (async)     | `Promise<boolean>`   |
| `hasSync(key)`              | Checks if key exists (sync)      | `boolean`            |

### Batch Operations

| Method             | Description                    | Returns                   |
| ------------------ | ------------------------------ | ------------------------- |
| `setMany(entries)` | Batch set [key, value, ttl?][] | `Promise<void>`           |
| `getMany(keys)`    | Batch get multiple keys        | `Promise<Map<string, T>>` |
| `deleteMany(keys)` | Batch delete multiple keys     | `Promise<void>`           |

### Utility Methods

| Method             | Description                      | Returns      |
| ------------------ | -------------------------------- | ------------ |
| `size`             | Current cache size (getter)      | `number`     |
| `getStats()`       | Get cache statistics             | `CacheStats` |
| `resetStats()`     | Reset statistics                 | `void`       |
| `cleanupExpired()` | Manually cleanup expired entries | `void`       |
| `destroy()`        | Destroy cache and stop cleanup   | `void`       |

### Factory Function

```typescript
createL1Cache<T>(options?: L1CacheOptions): L1Cache<T>
```

---

## 🔄 LRU Algorithm Explanation

### How LRU Works in This Implementation

The L1 Cache uses JavaScript's `Map` object, which maintains **insertion order**, to implement LRU eviction efficiently:

1. **Insertion Order = Access Order**: Every time an entry is accessed via `get()`, it is deleted and re-inserted at the end, moving it to the "most recently used" position.

2. **LRU Selection**: When eviction is needed (cache is full), the **first** key in the Map is the **least recently used** (oldest) entry.

3. **Eviction Process**:
   ```typescript
   private evictLRU(): void {
     if (this.store.size === 0) return;
     const lruKey = this.store.keys().next().value;
     if (lruKey) {
       this.deleteSync(lruKey);
       this.stats.evictions++;
     }
   }
   ```

### Key Features

- **O(1) Operations**: Map provides O(1) get/set/delete
- **No Additional Data Structures**: Uses native Map ordering
- **Atomic Updates**: Delete + set for LRU update is atomic-like

### Why Map Over数组/链表?

| Approach        | get  | set  | evict | Memory   |
| --------------- | ---- | ---- | ----- | -------- |
| Map (this impl) | O(1) | O(1) | O(1)  | Moderate |
| Array           | O(n) | O(1) | O(n)  | Low      |
| Linked List     | O(n) | O(1) | O(1)  | High     |

---

## ⏱️ TTL Configuration Explanation

### TTL (Time-To-Live) Behavior

1. **Default TTL**: 5 minutes (configurable per entry)
2. **Per-Entry Override**: Optional TTL parameter in `set()`
3. **Automatic Expiration**: Expired entries return `null` on `get()`
4. **Background Cleanup**: Optional periodic cleanup of expired entries

### Configuration Options

```typescript
interface L1CacheOptions {
  /** Maximum number of entries (default: 1000) */
  maxSize?: number

  /** Default TTL in milliseconds (default: 5 minutes = 300000ms) */
  defaultTTL?: number

  /** Automatic cleanup interval (default: 60 seconds) */
  cleanupInterval?: number

  /** Enable statistics tracking (default: true) */
  enableStats?: boolean
}
```

### TTL Range

- **Minimum**: 5 minutes (300,000 ms)
- **Maximum**: 30 minutes (1,800,000 ms)
- **Recommended**:
  - Sessions: 30 minutes
  - Permissions: 10 minutes
  - Config: 15 minutes

### Example Configurations

```typescript
// High-frequency session data
const sessionCache = new L1Cache<SessionData>({
  maxSize: 500,
  defaultTTL: 30 * 60 * 1000, // 30 minutes
  cleanupInterval: 5 * 60 * 1000, // Clean every 5 min
})

// Permission checks
const permissionCache = createL1Cache<Permission[]>({
  maxSize: 1000,
  defaultTTL: 10 * 60 * 1000, // 10 minutes
  cleanupInterval: 2 * 60 * 1000,
})

// App configuration
const configCache = createL1Cache<AppConfig>({
  maxSize: 100,
  defaultTTL: 15 * 60 * 1000, // 15 minutes
  cleanupInterval: 3 * 60 * 1000,
})
```

---

## ⚡ Performance Considerations

### Memory Optimization

1. **Using Map**: JavaScript's Map is more memory-efficient than objects for caching
2. **No External Dependencies**: Pure TypeScript implementation
3. **Entry Metadata**: Minimal per-entry overhead (expiresAt, lastAccess, accessCount)

### Async vs Sync API

| API           | Use Case                         | Benefit        |
| ------------- | -------------------------------- | -------------- |
| `async/await` | I/O-bound data fetching          | Non-blocking   |
| `Sync`        | Hot paths, high-frequency access | Lower overhead |

### Batch Operations

Use batch operations for better performance when dealing with multiple keys:

```typescript
// ❌ Not recommended (multiple round trips)
for (const key of keys) {
  await cache.set(key, values[key])
}

// ✅ Recommended (single batch operation)
await cache.setMany(keys.map(k => [k, values[k]]))
```

### Statistics Tracking

The cache tracks:

- `hits`: Successful cache retrievals
- `misses`: Failed retrievals (not found or expired)
- `sets`: Total entries set
- `deletes`: Total entries deleted
- `evictions`: LRU evictions triggered
- `hitRate`: hits / (hits + misses) ratio

### Cleanup Interval

- **Default**: 60 seconds
- **Purpose**: Remove expired entries that weren't accessed
- **Impact**: Minimal CPU overhead, improves memory usage
- **Disable**: Set `cleanupInterval: 0`

---

## 📁 File Structure

```
src/lib/cache/
├── index.ts           # Exports all cache utilities
├── l1-cache.ts        # L1 memory cache implementation
├── l1-cache.examples.ts # Usage examples
├── lru-cache.ts       # Original LRU cache (legacy)
└── CacheManager.ts    # Cache manager
```

---

## ✅ Acceptance Criteria Verification

| Criteria                   | Status         |
| -------------------------- | -------------- |
| L1 cache class implemented | ✅ Complete    |
| LRU eviction strategy      | ✅ Implemented |
| TTL expiration mechanism   | ✅ Working     |
| Usage examples provided    | ✅ Complete    |
| TypeScript type checking   | ✅ Passing     |

---

## 🚀 Future Enhancements (v1.2.0)

- [ ] WeakMap support for object keys
- [ ] L2 Redis integration layer
- [ ] Cache warming strategies
- [ ] Distributed cache support via Redis
- [ ] Prometheus metrics export
