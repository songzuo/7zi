# Redis Client Documentation

## Overview

Redis client integration for the 7zi project with production-ready features.

## Features

- **Connection Pooling**: Efficient Redis connection management
- **Automatic Reconnection**: Handles connection failures with retry logic
- **Graceful Degradation**: Falls back to in-memory operations when Redis unavailable
- **Error Handling**: Comprehensive error logging and monitoring
- **Performance Monitoring**: Built-in health checks and statistics
- **Environment Configuration**: Flexible configuration via environment variables

## Configuration

### Environment Variables

```bash
# Redis Connection
REDIS_URL=redis://:password@host:port/db

# Or individual configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_password
REDIS_DB=0

# Feature flags
ENABLE_REDIS_RATE_LIMIT=true
```

### Redis Configuration Options

- `maxRetriesPerRequest`: 3 (default)
- `retryStrategy`: Exponential backoff (max 2 seconds)
- `enableReadyCheck`: true (default)

## Usage

### Basic Usage

```typescript
import { getRedisClient, isRedisAvailable, redisCommand } from '@/lib/redis/client'

// Get client instance
const client = getRedisClient()

if (client) {
  await client.set('key', 'value')
  const value = await client.get('key')
}

// Check availability
const available = await isRedisAvailable()
if (available) {
  // Redis is ready
}
```

### With Error Handling

```typescript
import { redisCommand } from '@/lib/redis/client'

const value = await redisCommand(
  async () => {
    const client = getRedisClient()
    return await client?.get('key')
  },
  'fallback-value' // returned on error
)
```

## Integration with Rate Limiting

The Redis client is used by the rate limiting system:

```typescript
import { withRateLimit } from '@/lib/rate-limit'

export const GET = withRateLimit(async (req: NextRequest) => {
  // Rate limiting uses Redis when available
  return NextResponse.json({ data: 'Hello World' })
})
```

## Health Checks

```typescript
import { isRedisAvailable } from '@/lib/redis/client'

// In health endpoint
export async function GET() {
  const redisAvailable = await isRedisAvailable()

  return NextResponse.json({
    status: 'ok',
    redis: redisAvailable ? 'connected' : 'unavailable',
  })
}
```

## Connection Events

The client logs the following events:

- `connect`: Initial connection established
- `ready`: Client is ready to accept commands
- `error`: Connection error occurred
- `close`: Connection closed
- `reconnecting`: Reconnection in progress

## Graceful Shutdown

The client automatically handles shutdown:

```typescript
// Automatic cleanup on:
// - beforeExit
// - SIGINT
// - SIGTERM
```

Or manually:

```typescript
import { closeRedisClient } from '@/lib/redis/client'

await closeRedisClient()
```

## Fallback Behavior

When Redis is unavailable:

1. Rate limiting falls back to in-memory limiting
2. Cache operations use LRU cache
3. Application continues to function normally
4. Logs warnings for debugging

## Monitoring

Enable Redis monitoring:

```typescript
import { isRedisAvailable } from '@/lib/redis/client'

// Periodic health check
setInterval(async () => {
  const available = await isRedisAvailable()
  if (!available) {
    logger.warn('Redis unavailable')
  }
}, 60000) // Every minute
```

## Troubleshooting

### Connection Refused

- Check Redis server is running
- Verify `REDIS_URL` or individual config variables
- Check network connectivity

### Timeouts

- Increase `retryStrategy` delay
- Check Redis server load
- Verify network latency

### Memory Issues

- Configure Redis maxmemory
- Set eviction policy (e.g., `allkeys-lru`)
- Monitor memory usage

## Best Practices

1. **Always use `redisCommand`** for operations with fallback
2. **Check availability** before critical operations
3. **Handle errors gracefully** with fallback values
4. **Monitor connection health** periodically
5. **Use connection pooling** for high traffic
6. **Set appropriate TTL** for cached data

## Version History

- **v1.1.0** (2026-03-23): Initial Redis client implementation
  - Connection pooling and retry logic
  - Graceful degradation
  - Rate limiting integration

## Related Documentation

- [Rate Limiting](./API_RATE_LIMIT_IMPLEMENTATION_REPORT.md)
- [Cache Configuration](./CACHE_CONFIG.md)
- [Performance Optimization](./PERFORMANCE_OPTIMIZATION.md)
