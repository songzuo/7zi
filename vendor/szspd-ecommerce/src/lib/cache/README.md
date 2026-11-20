# Distributed Cache System

Enterprise-grade distributed cache with multi-level architecture, multiple eviction strategies, and Redis cluster support.

## Version

**v1.10.0**

## Features

### 1. Cache Strategies

- **LRU (Least Recently Used)** - Evicts least recently accessed entries
- **LFU (Least Frequently Used)** - Evicts least frequently accessed entries
- **FIFO (First In First Out)** - Evicts oldest entries
- **TTL (Time-To-Live)** - Evicts based on expiration time
- **Custom** - Custom eviction strategies

### 2. Multi-Level Cache Architecture

- **L1 (Local Memory)** - Fast in-memory cache with configurable size limits
- **L2 (Disk)** - Persistent disk cache (optional)
- **L3 (Distributed)** - Redis cluster support for distributed caching

### 3. Distributed Cache

- **Consistent Hashing** - Even key distribution across nodes
- **Virtual Nodes** - Better load balancing
- **Replication** - Data replication across nodes
- **Automatic Failover** - Node failure handling
- **Sync Strategies** - Async, sync, or eventual consistency

### 4. Cache Management

- **Real-time Monitoring** - Performance metrics and health checks
- **Alert System** - Configurable alert rules
- **Cache Warming** - Preload frequently accessed data
- **Batch Operations** - Efficient bulk operations
- **Tag-based Invalidation** - Group cache invalidation

### 5. API Interface

- **Basic Operations** - `get`, `set`, `delete`, `clear`, `has`
- **Batch Operations** - `batchGet`, `batchSet`
- **Statistics** - Hit rate, memory usage, access time
- **Events** - Subscribe to cache events

## Installation

```bash
# Install dependencies
npm install ioredis

# The cache system is included in the project
```

## Quick Start

### Basic Usage

```typescript
import { Cache, initializeCache } from '@/lib/cache'

// Initialize cache system
const { cache, monitor } = initializeCache()

// Set value
await Cache.set('user:123', { name: 'John', age: 30 }, 60000) // 1 minute TTL

// Get value
const user = await Cache.get<{ name: string; age: number }>('user:123')
console.log(user) // { name: 'John', age: 30 }

// Delete value
await Cache.delete('user:123')

// Get statistics
const stats = Cache.getStats()
console.log(`Hit rate: ${(stats.hitRate * 100).toFixed(2)}%`)
```

### Using Multi-Level Cache

```typescript
import { getMultiLevelCache } from '@/lib/cache'

const cache = getMultiLevelCache()

// Set with options
await cache.set('product:456', { price: 99.99 }, {
  ttl: 300000, // 5 minutes
  level: 'L1', // Store in L1
  tags: ['products', 'pricing'],
})

// Get from specific level
const product = await cache.getFromLevel('product:456', 'L1')

// Invalidate by tag
await cache.invalidateByTag('products')

// Get level-specific stats
const l1Stats = cache.getLevelStats('L1')
console.log(`L1 hit rate: ${(l1Stats.hitRate * 100).toFixed(2)}%`)
```

### Using Distributed Cache

```typescript
import { getDistributedCache } from '@/lib/cache'

const cache = getDistributedCache({
  clusterName: 'my-cluster',
  nodes: [
    { id: 'node1', address: 'redis1.example.com', port: 6379 },
    { id: 'node2', address: 'redis2.example.com', port: 6379 },
    { id: 'node3', address: 'redis3.example.com', port: 6379 },
  ],
  replication: true,
  replicationFactor: 2,
  syncStrategy: 'async',
})

// Add node dynamically
await cache.addNode({
  id: 'node4',
  address: 'redis4.example.com',
  port: 6379,
  status: 'online',
})

// Get value (automatically routed to correct node)
const value = await cache.get('key')

// Batch operations
const batchResult = await cache.batchGet(['key1', 'key2', 'key3'])

// Get distributed metrics
const metrics = cache.getDistributedMetrics()
console.log(`Cluster health: ${metrics.clusterHealth}`)
```

### Using Cache Monitor

```typescript
import { getCacheMonitor } from '@/lib/cache'

const monitor = getCacheMonitor()

// Start monitoring
monitor.startMonitoring(5000) // Check every 5 seconds

// Get health status
const healthCheck = await monitor.performHealthCheck('L1', stats)
console.log(`Health status: ${healthCheck.status}`)

// Get active alerts
const alerts = monitor.getActiveAlerts()
for (const alert of alerts) {
  console.log(`[${alert.severity}] ${alert.message}`)
}

// Subscribe to events
monitor.subscribe((event) => {
  console.log(`Cache event: ${event.type}`, event)
})

// Get summary
const summary = monitor.getSummary()
console.log(summary)
```

### Using Decorator

```typescript
import { Cached } from '@/lib/cache'

class UserService {
  @Cached(60000) // Cache for 1 minute
  async getUser(id: string) {
    // Expensive database query
    return await db.users.findById(id)
  }
  
  @Cached(300000) // Cache for 5 minutes
  async getUserPosts(userId: string) {
    return await db.posts.findByUser(userId)
  }
}
```

## Configuration

### L1 Cache Configuration

```typescript
const l1Config = {
  enabled: true,
  maxSize: 10000, // Maximum entries
  maxMemoryMB: 100, // Maximum memory in MB
  defaultTTL: 5 * 60 * 1000, // 5 minutes
  strategy: 'lru', // Eviction strategy
  cloneOnGet: true, // Clone objects on get
}
```

### L2 Cache Configuration

```typescript
const l2Config = {
  enabled: false, // Disabled by default
  storagePath: './cache',
  maxDiskMB: 1024, // 1GB
  defaultTTL: 60 * 60 * 1000, // 1 hour
  compression: true,
  compressionThreshold: 1024, // 1KB
}
```

### L3 Cache Configuration

```typescript
const l3Config = {
  enabled: true,
  nodes: [
    { host: 'redis1.example.com', port: 6379 },
    { host: 'redis2.example.com', port: 6379 },
  ],
  keyPrefix: 'cache:',
  defaultTTL: 24 * 60 * 60 * 1000, // 24 hours
  connectionTimeout: 5000,
  password: 'your-password',
}
```

### Hash Ring Configuration

```typescript
const hashRingConfig = {
  virtualNodes: 150, // Virtual nodes per physical node
  hashFunction: 'murmur', // Hash function
  replicaStrategy: 'uniform', // Replica assignment
}
```

## TTL Presets

```typescript
import { TTL_PRESETS } from '@/lib/cache'

TTL_PRESETS.REALTIME   // 5 seconds
TTL_PRESETS.SHORT      // 30 seconds
TTL_PRESETS.MEDIUM     // 1 minute
TTL_PRESETS.LONG       // 5 minutes
TTL_PRESETS.HOUR      // 1 hour
TTL_PRESETS.DAY       // 24 hours
TTL_PRESETS.WEEK      // 1 week
```

## Cache Strategies

### LRU (Least Recently Used)

Best for: General-purpose caching with temporal locality

```typescript
const cache = getMultiLevelCache({
  l1: {
    strategy: 'lru',
    maxSize: 10000,
  },
})
```

### LFU (Least Frequently Used)

Best for: Caching with access frequency patterns

```typescript
const cache = getMultiLevelCache({
  l1: {
    strategy: 'lfu',
    maxSize: 10000,
  },
})
```

### FIFO (First In First Out)

Best for: Simple caching with predictable eviction

```typescript
const cache = getMultiLevelCache({
  l1: {
    strategy: 'fifo',
    maxSize: 10000,
  },
})
```

### TTL (Time-To-Live)

Best for: Time-sensitive data

```typescript
const cache = getMultiLevelCache({
  l1: {
    strategy: 'ttl',
    maxSize: 10000,
  },
})
```

## Monitoring and Alerts

### Default Alert Rules

- **High Error Rate** - Triggered when errors > 50
- **Low Hit Rate** - Triggered when hit rate < 50%
- **High Memory Usage** - Triggered when memory > 80MB
- **Slow Access Time** - Triggered when access time > 50ms

### Custom Alert Rules

```typescript
const monitor = getCacheMonitor()

monitor.addAlertRule({
  id: 'custom-rule',
  name: 'Custom Rule',
  condition: (stats) => stats.evictions > 100,
  severity: 'warning',
  message: 'High eviction rate detected',
  enabled: true,
  cooldown: 60000,
})
```

## Best Practices

### 1. Choose the Right TTL

```typescript
// Real-time data - very short TTL
await Cache.set('stock:price', price, TTL_PRESETS.REALTIME)

// User sessions - medium TTL
await Cache.set('session:123', session, TTL_PRESETS.MEDIUM)

// Static content - long TTL
await Cache.set('page:home', content, TTL_PRESETS.LONG)
```

### 2. Use Tags for Group Invalidation

```typescript
await cache.set('product:1', data, { tags: ['products'] })
await cache.set('product:2', data, { tags: ['products'] })

// Invalidate all products
await cache.invalidateByTag('products')
```

### 3. Batch Operations for Efficiency

```typescript
// Instead of multiple gets
const data1 = await cache.get('key1')
const data2 = await cache.get('key2')
const data3 = await cache.get('key3')

// Use batch get
const result = await cache.batchGet(['key1', 'key2', 'key3'])
```

### 4. Cache Warming for Performance

```typescript
await cache.warmup({
  keys: ['key1', 'key2', 'key3'],
  batchSize: 100,
  concurrency: 10,
  fetchFn: async (key) => {
    return await fetchDataFromSource(key)
  },
  onProgress: (loaded, total) => {
    console.log(`Warming: ${loaded}/${total}`)
  },
})
```

### 5. Monitor Cache Performance

```typescript
const stats = Cache.getStats()

if (stats.hitRate < 0.5) {
  console.warn('Low cache hit rate - consider increasing TTL or cache size')
}

if (stats.memoryUsage > 80 * 1024 * 1024) {
  console.warn('High memory usage - consider increasing maxMemoryMB')
}
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Application Layer                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  Multi-Level Cache Manager                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   L1 Cache  │  │   L2 Cache  │  │   L3 Cache  │         │
│  │  (Memory)   │  │   (Disk)    │  │  (Redis)    │         │
│  │  LRU/LFU/   │  │  Optional   │  │  Cluster    │         │
│  │   FIFO/TTL  │  │             │  │  Replicated │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              Distributed Cache Layer                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   Node 1    │  │   Node 2    │  │   Node 3    │         │
│  │  Hash Ring  │  │  Hash Ring  │  │  Hash Ring  │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Monitoring & Metrics                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   Health    │  │   Alerts    │  │  Statistics │         │
│  │   Checks    │  │   System    │  │  Collection │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
```

## Performance Considerations

### Memory Usage

- L1 cache uses in-memory storage
- Monitor memory usage with `getStats()`
- Set appropriate `maxMemoryMB` limits
- Use compression for large objects

### Hit Rate

- Target hit rate > 80% for optimal performance
- Adjust TTL based on data volatility
- Use cache warming for frequently accessed data
- Monitor hit rate trends

### Network Latency

- L3 cache (Redis) adds network latency
- Use read-through to minimize L3 access
- Consider local caching for hot data
- Monitor network latency in distributed mode

## Troubleshooting

### Low Hit Rate

```typescript
// Check TTL settings
const stats = Cache.getStats()
console.log(`Hit rate: ${stats.hitRate}`)

// Increase TTL for frequently accessed data
await Cache.set('key', value, TTL_PRESETS.LONG)
```

### High Memory Usage

```typescript
// Check memory usage
const stats = Cache.getStats()
console.log(`Memory: ${stats.memoryUsage / 1024 / 1024} MB`)

// Increase maxMemoryMB or reduce cache size
const cache = getMultiLevelCache({
  l1: {
    maxMemoryMB: 200,
    maxSize: 20000,
  },
})
```

### Redis Connection Issues

```typescript
// Check connection status
const distributed = getDistributedCache()
const metrics = distributed.getDistributedMetrics()

console.log(`Cluster health: ${metrics.clusterHealth}`)

// Check individual nodes
for (const [nodeId, stats] of metrics.nodeStats.entries()) {
  console.log(`Node ${nodeId}: ${stats.errors} errors`)
}
```

## API Reference

### Cache

- `get<T>(key: string): Promise<T | null>`
- `set<T>(key: string, value: T, ttl?: number): Promise<void>`
- `delete(key: string): Promise<boolean>`
- `has(key: string): Promise<boolean>`
- `clear(): Promise<void>`
- `getStats(): CacheStats`
- `getOrSet<T>(key: string, fn: () => Promise<T>, ttl?: number): Promise<T>`

### MultiLevelCache

- `getFromLevel<T>(key: string, level: CacheLevel): Promise<T | null>`
- `setToLevel<T>(key: string, value: T, level: CacheLevel, options?: CacheSetOptions): Promise<boolean>`
- `invalidate(key: string): Promise<void>`
- `invalidateByTag(tag: string): Promise<void>`
- `promote(key: string): Promise<boolean>`
- `demote(key: string): Promise<boolean>`
- `getLevelStats(level: CacheLevel): LevelStats`
- `warmup(config: WarmupConfig): Promise<void>`

### DistributedCacheManager

- `addNode(node: CacheNode): Promise<void>`
- `removeNode(nodeId: string): Promise<void>`
- `getNodeForKey(key: string): CacheNode | null`
- `sync(): Promise<void>`
- `getDistributedMetrics(): DistributedCacheMetrics`
- `batchGet<T>(keys: string[]): Promise<BatchResult<T>>`
- `batchSet<T>(entries: Record<string, T>, ttl?: number): Promise<BatchResult<void>>`

### CacheMonitor

- `startMonitoring(intervalMs?: number): void`
- `stopMonitoring(): void`
- `recordStats(level: CacheLevel, stats: CacheStats): void`
- `getStatsHistory(level: CacheLevel, limit?: number): CacheStats[]`
- `performHealthCheck(level: CacheLevel, stats: CacheStats): Promise<HealthCheckResult>`
- `getActiveAlerts(): CacheAlert[]`
- `addAlertRule(rule: AlertRule): void`
- `subscribe(listener: CacheEventListener): () => void`

## License

MIT

## Contributing

Contributions are welcome! Please follow the project's coding standards and submit pull requests.

## Support

For issues and questions, please open an issue on the project repository.